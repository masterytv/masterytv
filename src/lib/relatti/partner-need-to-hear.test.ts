import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Consent regression guard for the S5 reciprocal block
 * (PRIVACY_TERMS_LIABILITY_PLAN §6.2 — partner isolation must never regress).
 *
 * getPartnerNeedToHear reads with the SERVICE ROLE, which bypasses RLS: the only
 * thing standing between one partner's profile content and the other is the
 * filter set in this module. These tests pin BOTH halves of the invariant:
 *   1. the query is gated (share_with_human='full', consented/connected, not revoked)
 *   2. every malformed/absent/mismatched case fails CLOSED (null → empty state)
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

/** Chainable stub: records every filter, resolves terminals from tableData. */
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
  builder.maybeSingle = () =>
    Promise.resolve({ data: tableData[table] ?? null, error: null });
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => makeBuilder(table) }),
}));

const { getPartnerNeedToHear } = await import("./partner-need-to-hear");

const VIEWER = "user-viewer";
const PARTNER = "user-partner";
const PARTNER_REPORT = "report-partner";

/** A well-formed S5 section, as the v2 generator writes it (JSON in content_markdown). */
function s5(phrases: Array<{ phrase: string; why: string }>) {
  return {
    S5: {
      content_markdown: JSON.stringify({
        tldr: "…",
        what_you_need_to_hear: phrases,
      }),
    },
  };
}

const PHRASES = [
  { phrase: "I'm not going anywhere.", why: "Reassurance lands for The Devoted." },
  { phrase: "Take the time you need.", why: "Space signals safety." },
];

/** The default happy-path fixture: consented dyad, viewer is the inviter. */
function happyPath() {
  tableData = {
    decoded_invites: {
      inviter_id: VIEWER,
      recipient_id: PARTNER,
      inviter_report_id: "report-viewer",
      recipient_report_id: PARTNER_REPORT,
    },
    assessment_reports: { sections: s5(PHRASES), user_id: PARTNER },
    decoded_profiles: { display_name: "Priya" },
  };
}

/** The invite lookup's recorded filters, keyed by method for readable asserts. */
function inviteFilters() {
  const entry = recorded.find((r) => r.table === "decoded_invites");
  return entry?.filters ?? [];
}

beforeEach(() => {
  recorded = [];
  tableData = {};
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
});

describe("getPartnerNeedToHear — the consent gate", () => {
  it("only ever queries invites at share_with_human='full'", async () => {
    happyPath();
    await getPartnerNeedToHear(VIEWER);

    const eqs = inviteFilters().filter((f) => f.method === "eq");
    expect(eqs).toContainEqual({ method: "eq", args: ["share_with_human", "full"] });
  });

  it("restricts to consented/connected invites that were never revoked", async () => {
    happyPath();
    await getPartnerNeedToHear(VIEWER);

    const filters = inviteFilters();
    expect(filters).toContainEqual({
      method: "in",
      args: ["status", ["consented", "connected"]],
    });
    expect(filters).toContainEqual({ method: "is", args: ["revoked_at", null] });
  });

  it("scopes the lookup to dyads the viewer is actually part of", async () => {
    happyPath();
    await getPartnerNeedToHear(VIEWER);

    const or = inviteFilters().find((f) => f.method === "or");
    expect(or?.args[0]).toContain(`inviter_id.eq.${VIEWER}`);
    expect(or?.args[0]).toContain(`recipient_id.eq.${VIEWER}`);
  });

  it("never reads a private coaching table", async () => {
    happyPath();
    await getPartnerNeedToHear(VIEWER);

    const tables = recorded.map((r) => r.table);
    for (const forbidden of ["messages", "memory_facts", "conversation_summaries"]) {
      expect(tables).not.toContain(forbidden);
    }
  });
});

describe("getPartnerNeedToHear — resolution", () => {
  it("returns the partner's own phrases and name", async () => {
    happyPath();
    const result = await getPartnerNeedToHear(VIEWER);

    expect(result).toEqual({ partnerName: "Priya", phrases: PHRASES });
  });

  it("reads the INVITER's report when the viewer is the recipient", async () => {
    tableData = {
      decoded_invites: {
        inviter_id: PARTNER,
        recipient_id: VIEWER,
        inviter_report_id: PARTNER_REPORT,
        recipient_report_id: "report-viewer",
      },
      assessment_reports: { sections: s5(PHRASES), user_id: PARTNER },
      decoded_profiles: { display_name: "Priya" },
    };

    await getPartnerNeedToHear(VIEWER);

    // The report fetched must be the partner's, never the viewer's own.
    const reportEq = recorded
      .find((r) => r.table === "assessment_reports")
      ?.filters.find((f) => f.method === "eq");
    expect(reportEq?.args).toEqual(["id", PARTNER_REPORT]);
  });

  it("still resolves when the partner has no display name", async () => {
    happyPath();
    tableData.decoded_profiles = null;

    const result = await getPartnerNeedToHear(VIEWER);
    expect(result).toEqual({ partnerName: null, phrases: PHRASES });
  });
});

describe("getPartnerNeedToHear — fails closed", () => {
  it("returns null when no consented dyad exists", async () => {
    tableData = { decoded_invites: null };
    expect(await getPartnerNeedToHear(VIEWER)).toBeNull();
  });

  it("returns null when the partner hasn't finished their profile", async () => {
    happyPath();
    tableData.decoded_invites = {
      inviter_id: VIEWER,
      recipient_id: PARTNER,
      inviter_report_id: "report-viewer",
      recipient_report_id: null,
    };
    expect(await getPartnerNeedToHear(VIEWER)).toBeNull();
  });

  it("returns null when the report pointer doesn't belong to the partner", async () => {
    // A backfill bug must degrade to an empty block, never a cross-user leak.
    happyPath();
    tableData.assessment_reports = {
      sections: s5(PHRASES),
      user_id: "someone-else-entirely",
    };
    expect(await getPartnerNeedToHear(VIEWER)).toBeNull();
  });

  it("returns null on malformed S5 JSON", async () => {
    happyPath();
    tableData.assessment_reports = {
      sections: { S5: { content_markdown: "not json {{{" } },
      user_id: PARTNER,
    };
    expect(await getPartnerNeedToHear(VIEWER)).toBeNull();
  });

  it("returns null when S5 carries no need-to-hear list", async () => {
    happyPath();
    tableData.assessment_reports = {
      sections: { S5: { content_markdown: JSON.stringify({ tldr: "…" }) } },
      user_id: PARTNER,
    };
    expect(await getPartnerNeedToHear(VIEWER)).toBeNull();
  });

  it("drops malformed entries and keeps well-formed ones", async () => {
    happyPath();
    tableData.assessment_reports = {
      sections: s5([
        { phrase: "I'm here.", why: "Reassurance." },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { phrase: "   ", why: "blank phrase" } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { why: "no phrase at all" } as any,
      ]),
      user_id: PARTNER,
    };

    const result = await getPartnerNeedToHear(VIEWER);
    expect(result?.phrases).toEqual([{ phrase: "I'm here.", why: "Reassurance." }]);
  });

  it("returns null (not a throw) when service-role env is missing", async () => {
    happyPath();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await getPartnerNeedToHear(VIEWER)).toBeNull();
  });
});
