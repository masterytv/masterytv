import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Consent regression guard for the dyad's need-to-hear phrases
 * (PRIVACY_TERMS_LIABILITY_PLAN §6.2 — partner isolation must never regress).
 *
 * getDyadNeedToHear reads with the SERVICE ROLE, which bypasses RLS: the only
 * thing standing between one partner's profile content and the other is the
 * filter set in this module. These tests pin BOTH halves of the invariant:
 *   1. the query is gated (share_with_human='full', consented/connected, not revoked)
 *   2. every malformed/absent/mismatched case fails CLOSED (no phrases surface)
 *
 * The Supabase client is mocked as a chain recorder, so we can assert the exact
 * filters applied — a loosened gate fails here rather than in production.
 */

interface Recorded {
  table: string;
  filters: Array<{ method: string; args: unknown[] }>;
}

let recorded: Recorded[] = [];
let tableData: Record<string, unknown> = {};

/**
 * Chainable stub: records every filter, resolves terminals from tableData.
 * `assessment_reports` is keyed by the requested id so the two loadPhrases calls
 * (viewer's report and partner's) can return different rows.
 */
function makeBuilder(table: string) {
  const entry: Recorded = { table, filters: [] };
  recorded.push(entry);

  const builder: Record<string, unknown> = {};
  const chain = (method: string) => (...args: unknown[]) => {
    entry.filters.push({ method, args });
    return builder;
  };
  for (const m of ["select", "or", "eq", "in", "is", "not", "neq", "limit"]) {
    builder[m] = chain(m);
  }
  builder.maybeSingle = () => {
    if (table === "assessment_reports") {
      const idEq = entry.filters.find((f) => f.method === "eq" && f.args[0] === "id");
      const byId = (tableData.assessment_reports ?? {}) as Record<string, unknown>;
      return Promise.resolve({ data: byId[idEq?.args[1] as string] ?? null, error: null });
    }
    return Promise.resolve({ data: tableData[table] ?? null, error: null });
  };
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => makeBuilder(table) }),
}));

const { getDyadNeedToHear } = await import("./partner-need-to-hear");

const VIEWER = "user-viewer";
const PARTNER = "user-partner";
const INVITE = "invite-1";
const MY_REPORT = "report-viewer";
const PARTNER_REPORT = "report-partner";

/** A well-formed S5 section, as the v2 generator writes it (JSON in content_markdown). */
function s5(phrases: Array<{ phrase: string; why: string }>) {
  return {
    S5: {
      content_markdown: JSON.stringify({ tldr: "…", what_you_need_to_hear: phrases }),
    },
  };
}

const MY_PHRASES = [{ phrase: "I'm not going anywhere.", why: "Reassurance lands." }];
const THEIR_PHRASES = [{ phrase: "Take the time you need.", why: "Space signals safety." }];

/** The default happy-path fixture: consented dyad, viewer is the inviter. */
function happyPath() {
  tableData = {
    decoded_invites: {
      id: INVITE,
      inviter_id: VIEWER,
      recipient_id: PARTNER,
      inviter_report_id: MY_REPORT,
      recipient_report_id: PARTNER_REPORT,
    },
    assessment_reports: {
      [MY_REPORT]: { sections: s5(MY_PHRASES), user_id: VIEWER },
      [PARTNER_REPORT]: { sections: s5(THEIR_PHRASES), user_id: PARTNER },
    },
    users: { name: "Priya" },
  };
}

/** The invite lookup's recorded filters, keyed by method for readable asserts. */
function inviteFilters() {
  return recorded.find((r) => r.table === "decoded_invites")?.filters ?? [];
}

beforeEach(() => {
  recorded = [];
  tableData = {};
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
});

describe("getDyadNeedToHear — the consent gate", () => {
  it("only ever queries invites at share_with_human='full'", async () => {
    happyPath();
    await getDyadNeedToHear(VIEWER);

    expect(inviteFilters()).toContainEqual({
      method: "eq",
      args: ["share_with_human", "full"],
    });
  });

  it("restricts to consented/connected invites that were never revoked", async () => {
    happyPath();
    await getDyadNeedToHear(VIEWER);

    const filters = inviteFilters();
    expect(filters).toContainEqual({
      method: "in",
      args: ["status", ["consented", "connected"]],
    });
    expect(filters).toContainEqual({ method: "is", args: ["revoked_at", null] });
  });

  it("scopes the lookup to dyads the viewer is actually part of", async () => {
    happyPath();
    await getDyadNeedToHear(VIEWER);

    const or = inviteFilters().find((f) => f.method === "or");
    expect(or?.args[0]).toContain(`inviter_id.eq.${VIEWER}`);
    expect(or?.args[0]).toContain(`recipient_id.eq.${VIEWER}`);
  });

  it("scopes to the requested invite when one is given (the compat report)", async () => {
    happyPath();
    await getDyadNeedToHear(VIEWER, { inviteId: INVITE });

    expect(inviteFilters()).toContainEqual({ method: "eq", args: ["id", INVITE] });
  });

  it("never reads a private coaching table", async () => {
    happyPath();
    await getDyadNeedToHear(VIEWER);

    const tables = recorded.map((r) => r.table);
    for (const forbidden of ["messages", "memory_facts", "conversation_summaries"]) {
      expect(tables).not.toContain(forbidden);
    }
  });
});

describe("getDyadNeedToHear — resolution", () => {
  it("returns both sides, the partner's name, and the invite id", async () => {
    happyPath();
    const result = await getDyadNeedToHear(VIEWER);

    expect(result).toEqual({
      inviteId: INVITE,
      partnerName: "Priya",
      partnerReady: true,
      mine: MY_PHRASES,
      theirs: THEIR_PHRASES,
    });
  });

  it("does not cross the two sides over when the viewer is the recipient", async () => {
    tableData = {
      decoded_invites: {
        id: INVITE,
        inviter_id: PARTNER,
        recipient_id: VIEWER,
        inviter_report_id: PARTNER_REPORT,
        recipient_report_id: MY_REPORT,
      },
      assessment_reports: {
        [MY_REPORT]: { sections: s5(MY_PHRASES), user_id: VIEWER },
        [PARTNER_REPORT]: { sections: s5(THEIR_PHRASES), user_id: PARTNER },
      },
      users: { name: "Priya" },
    };

    const result = await getDyadNeedToHear(VIEWER);
    expect(result?.mine).toEqual(MY_PHRASES);
    expect(result?.theirs).toEqual(THEIR_PHRASES);
  });

  it("still resolves when the partner has no display name", async () => {
    happyPath();
    tableData.users = null;

    const result = await getDyadNeedToHear(VIEWER);
    expect(result?.partnerName).toBeNull();
    expect(result?.theirs).toEqual(THEIR_PHRASES);
  });
});

describe("getDyadNeedToHear — fails closed", () => {
  it("returns null when no consented dyad exists", async () => {
    tableData = { decoded_invites: null };
    expect(await getDyadNeedToHear(VIEWER)).toBeNull();
  });

  it("reports partnerReady=false when the partner hasn't finished", async () => {
    happyPath();
    (tableData.decoded_invites as Record<string, unknown>).recipient_report_id = null;

    const result = await getDyadNeedToHear(VIEWER);
    expect(result?.partnerReady).toBe(false);
    expect(result?.theirs).toEqual([]);
    // The viewer's own half still resolves — the solo pointer needs it.
    expect(result?.mine).toEqual(MY_PHRASES);
  });

  it("yields no partner phrases when the report pointer isn't theirs", async () => {
    // A backfill bug must degrade to an empty block, never a cross-user leak.
    happyPath();
    (tableData.assessment_reports as Record<string, unknown>)[PARTNER_REPORT] = {
      sections: s5(THEIR_PHRASES),
      user_id: "someone-else-entirely",
    };

    const result = await getDyadNeedToHear(VIEWER);
    expect(result?.theirs).toEqual([]);
    expect(result?.partnerReady).toBe(false);
  });

  it("yields no phrases on malformed S5 JSON", async () => {
    happyPath();
    (tableData.assessment_reports as Record<string, unknown>)[PARTNER_REPORT] = {
      sections: { S5: { content_markdown: "not json {{{" } },
      user_id: PARTNER,
    };
    expect((await getDyadNeedToHear(VIEWER))?.theirs).toEqual([]);
  });

  it("yields no phrases when S5 carries no need-to-hear list", async () => {
    happyPath();
    (tableData.assessment_reports as Record<string, unknown>)[PARTNER_REPORT] = {
      sections: { S5: { content_markdown: JSON.stringify({ tldr: "…" }) } },
      user_id: PARTNER,
    };
    expect((await getDyadNeedToHear(VIEWER))?.theirs).toEqual([]);
  });

  it("drops malformed entries and keeps well-formed ones", async () => {
    happyPath();
    (tableData.assessment_reports as Record<string, unknown>)[PARTNER_REPORT] = {
      sections: s5([
        { phrase: "I'm here.", why: "Reassurance." },
        { phrase: "   ", why: "blank phrase" },
        { why: "no phrase at all" } as unknown as { phrase: string; why: string },
      ]),
      user_id: PARTNER,
    };

    const result = await getDyadNeedToHear(VIEWER);
    expect(result?.theirs).toEqual([{ phrase: "I'm here.", why: "Reassurance." }]);
  });

  it("returns null (not a throw) when service-role env is missing", async () => {
    happyPath();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await getDyadNeedToHear(VIEWER)).toBeNull();
  });
});
