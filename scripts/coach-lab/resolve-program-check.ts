/**
 * PC4.4 — resolve-program spine checks (run with Deno; wired into `npm run gate`).
 *
 * Runs the REAL `resolveProgram()` from supabase/functions/_shared against a
 * fake in-process PostgREST (same pattern as prompt-snapshot.ts, extended
 * with Content-Range support so `{ count: "exact", head: true }` queries
 * work) and asserts the PC4.4 precedence ladder:
 *
 *   named engagement (membership-verified)
 *     > participant membership > client hint > signup_brand > invites > null
 *
 * The cases encode the two failure modes PC4.4 exists to prevent:
 * - a stripped/forged "general" hint handing a dyad member the executive
 *   persona + business guardrails (spine must outrank the hint), and
 * - a junk client string leaking through as the resolved program.
 * Plus the founder shape that must NOT regress: an invite SENDER with no
 * participant row keeps the executive coach when the client says "general".
 *
 *   deno run --allow-net --allow-env --allow-read \
 *     scripts/coach-lab/resolve-program-check.ts
 */

type Row = Record<string, unknown>;

let activeTables: Record<string, Row[]> = {};

function contentRange(n: number): string {
  return n === 0 ? "*/0" : `0-${n - 1}/${n}`;
}

const server = Deno.serve(
  { hostname: "127.0.0.1", port: 0, onListen: () => {} },
  (req) => {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    const table = match?.[1] ?? "";
    const rows = activeTables[table] ?? [];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Range": contentRange(rows.length),
    };

    if (req.method === "HEAD") {
      return new Response(null, { headers });
    }

    const wantsObject = (req.headers.get("accept") ?? "").includes(
      "vnd.pgrst.object",
    );
    if (wantsObject) {
      if (rows.length === 1) {
        return new Response(JSON.stringify(rows[0]), { headers });
      }
      return new Response(
        JSON.stringify({
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: `The result contains ${rows.length} rows`,
          hint: null,
        }),
        { status: 406, headers },
      );
    }
    return new Response(JSON.stringify(rows), { headers });
  },
);

Deno.env.set("SUPABASE_URL", `http://127.0.0.1:${server.addr.port}`);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-role-key");
Deno.env.set("SUPABASE_ANON_KEY", "fixture-anon-key");

const { resolveProgram } = await import(
  "../../supabase/functions/_shared/resolve-program.ts"
);
const { createSupabaseClient } = await import(
  "../../supabase/functions/_shared/supabase.ts"
);
const supabase = createSupabaseClient();

const USER = "11111111-1111-4111-8111-111111111101";
const ENGAGEMENT = "22222222-2222-4222-8222-222222222202";

const DYAD_MEMBERSHIP: Row = {
  id: "33333333-3333-4333-8333-333333333303",
  engagement: { kind: "relationship_dyad", program: { slug: "relationship" } },
};

interface Case {
  name: string;
  clientProgram: string | null;
  engagementId: string | null;
  tables: Record<string, Row[]>;
  expect: { ok: false } | { ok: true; program: string | null };
  /**
   * I4.5 — whether INTEGRATION_ENGINE_USERS carries this user for the case. The
   * integration hint is the only one gated on a server-side flag rather than on
   * data, so the flag is part of the fixture.
   */
  flagged?: boolean;
}

const CASES: Case[] = [
  {
    name: "named engagement, member → its program slug",
    clientProgram: null,
    engagementId: ENGAGEMENT,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "relationship" },
  },
  {
    name: "named engagement, NON-member → 403 (ok:false)",
    clientProgram: "relationship",
    engagementId: ENGAGEMENT,
    tables: { participant: [] },
    expect: { ok: false },
  },
  {
    name: "dyad member + forged 'general' hint → spine outranks the hint",
    clientProgram: "general",
    engagementId: null,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "relationship" },
  },
  {
    name: "dyad member + stripped hint → relationship",
    clientProgram: null,
    engagementId: null,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "relationship" },
  },
  {
    name: "invite SENDER, no participant row, 'general' hint → executive kept (founder shape)",
    clientProgram: "general",
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: null }],
      decoded_invites: [{ id: "inv-1", inviter_id: USER }],
    },
    expect: { ok: true, program: "general" },
  },
  {
    name: "solo Relatti signup (signup_brand), no hint → relationship",
    clientProgram: null,
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: "relatti" }],
      decoded_invites: [],
    },
    expect: { ok: true, program: "relationship" },
  },
  // ── T3: money resolution (KNOWN_PROGRAM_HINTS 'money' + signup_brand 'money') ──
  {
    name: "solo money signup (signup_brand), no hint → money",
    clientProgram: null,
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: "money" }],
      decoded_invites: [],
    },
    expect: { ok: true, program: "money" },
  },
  {
    name: "money client hint, spine silent → money",
    clientProgram: "money",
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: null }],
      decoded_invites: [],
    },
    expect: { ok: true, program: "money" },
  },
  {
    // The anti-forgery invariant for the new hint: a spine-known dyad member
    // forging program:'money' still gets the relationship pack — the hint never
    // outranks membership (mirrors the forged-'general' case above).
    name: "dyad member + forged 'money' hint → spine outranks the hint",
    clientProgram: "money",
    engagementId: null,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "relationship" },
  },
  {
    // The dual-brand FIX (money launch): the SAME spine-known dyad member, but
    // now genuinely assessed in money (a real assessment_reports row, program
    // 'money') — the un-forgeable proof the forgery case above lacks. Their
    // 'money' hint from moneymaps.masterytv.com is now honored, so money turns
    // are coached by moneyPack and land in the money thread list. Identical
    // member + hint to the case above; the ONLY difference is the real report,
    // which is exactly what separates a legitimate dual-brand user from a forger.
    name: "dual-brand dyad member + 'money' hint + a real money report → money",
    clientProgram: "money",
    engagementId: null,
    tables: {
      participant: [DYAD_MEMBERSHIP],
      assessment_reports: [{ user_id: USER, program: "money" }],
    },
    expect: { ok: true, program: "money" },
  },
  {
    name: "masterytv signup_brand outranks a stale invite row → executive",
    clientProgram: null,
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: "masterytv" }],
      decoded_invites: [{ id: "inv-1", recipient_id: USER }],
    },
    expect: { ok: true, program: null },
  },
  {
    name: "pre-stamp invitee, no other signals → relationship (legacy heuristic)",
    clientProgram: null,
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: null }],
      decoded_invites: [{ id: "inv-1", recipient_id: USER }],
    },
    expect: { ok: true, program: "relationship" },
  },
  // ── I4.5: integration resolution (the hint is FLAG-gated, not data-gated) ──
  {
    // The whole route in, while the vertical is dark and has no brand slug for
    // signup_brand to carry.
    name: "flagged account + 'integration' hint, spine silent → integration",
    clientProgram: "integration",
    engagementId: null,
    flagged: true,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: null }],
      decoded_invites: [],
    },
    expect: { ok: true, program: "integration" },
  },
  {
    // The dark-vertical invariant. An unflagged client naming the program gets
    // the ordinary default, never an unlaunched coach.
    name: "UNflagged account + 'integration' hint → null (the vertical stays dark)",
    clientProgram: "integration",
    engagementId: null,
    flagged: false,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: null }],
      decoded_invites: [],
    },
    expect: { ok: true, program: null },
  },
  {
    // The founder's own shape, and the reason this branch exists at all: he is a
    // Relatti dyad member, so without the step-2 exception every integration turn
    // of his would resolve to the relationship pack. Money hit this exact trap on
    // 2026-07-18; there the proof was a real report, here it is the flag.
    name: "flagged dyad member + 'integration' hint → integration (dual-brand)",
    clientProgram: "integration",
    engagementId: null,
    flagged: true,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "integration" },
  },
  {
    // Same member, same hint, no flag: membership wins, as it does for any
    // unproven cross-program hint.
    name: "UNflagged dyad member + 'integration' hint → relationship",
    clientProgram: "integration",
    engagementId: null,
    flagged: false,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "relationship" },
  },
  {
    // The flag grants the integration hint and nothing else. It must not become a
    // general-purpose bypass of the anti-forgery ladder.
    name: "flagged dyad member + forged 'money' hint → relationship (flag grants only its own hint)",
    clientProgram: "money",
    engagementId: null,
    flagged: true,
    tables: { participant: [DYAD_MEMBERSHIP] },
    expect: { ok: true, program: "relationship" },
  },
  {
    name: "junk client string, no spine signals → null, never the raw string",
    clientProgram: "'; drop table users; --",
    engagementId: null,
    tables: {
      participant: [],
      users: [{ id: USER, signup_brand: null }],
      decoded_invites: [],
    },
    expect: { ok: true, program: null },
  },
];

let failures = 0;
for (const c of CASES) {
  activeTables = c.tables;
  // The integration hint is gated on a server-side flag, so the flag is fixture
  // state like any table. Set per case (never globally) so a stray `on` cannot
  // make the dark-vertical cases pass for the wrong reason.
  Deno.env.set("INTEGRATION_ENGINE", "off");
  Deno.env.set("INTEGRATION_ENGINE_USERS", c.flagged ? USER : "");
  const result = await resolveProgram(
    supabase,
    USER,
    c.clientProgram,
    c.engagementId,
  );
  const pass = JSON.stringify(result) === JSON.stringify(c.expect);
  if (pass) {
    console.log(`✓ ${c.name}`);
  } else {
    failures++;
    console.error(
      `✗ ${c.name}\n    expected ${JSON.stringify(c.expect)}, got ${
        JSON.stringify(result)
      }`,
    );
  }
}

await server.shutdown();

if (failures > 0) {
  console.error(`\nresolve-program gate FAILED — ${failures} case(s).`);
  Deno.exit(1);
}
console.log(
  `\nresolve-program gate passed — ${CASES.length}/${CASES.length} precedence cases hold.`,
);
