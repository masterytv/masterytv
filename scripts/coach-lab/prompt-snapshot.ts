/**
 * PC4.1 — Prompt snapshot goldens (run with Deno; wired into `npm run gate`).
 *
 * Runs the REAL `assemblePrompt()` from supabase/functions/_shared against a
 * fake in-process PostgREST server that serves the fixed fixtures in
 * prompt-fixtures.ts, then compares the assembled system prompt + conversation
 * history byte-for-byte against goldens/<scenario>.golden.txt.
 *
 * This is the safety net for PC4.2 (Coach Pack extraction): the refactor must
 * keep every vertical's prompt stack byte-identical. One byte of drift fails
 * the gate.
 *
 *   deno run --allow-net --allow-env --allow-read --allow-write \
 *     scripts/coach-lab/prompt-snapshot.ts            # compare (gate mode)
 *   … prompt-snapshot.ts --update                     # rewrite goldens
 *
 * Design notes:
 * - Zero changes to production code: the assembler builds its own supabase
 *   client from SUPABASE_URL, so we point that at 127.0.0.1 and speak just
 *   enough PostgREST (array vs .single() object responses, PGRST116 on empty
 *   maybeSingle) to satisfy supabase-js.
 * - OPENAI_API_KEY is deleted so semantic memory retrieval deterministically
 *   no-ops (generateEmbedding throws immediately; the assembler swallows it).
 * - Any query against a table the active scenario has no fixture for is a
 *   FAILURE, not a silent [] — a fixture gap means the golden would lock in a
 *   prompt the production path doesn't produce.
 */

import { SCENARIOS, type TableFixture } from "./prompt-fixtures.ts";

const GOLDEN_DIR = new URL("./goldens/", import.meta.url);
const UPDATE = Deno.args.includes("--update");

// ─── Fake PostgREST ──────────────────────────────────────────────────────

let activeTables: Record<string, TableFixture> = {};
let fixtureGaps: string[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const server = Deno.serve(
  { hostname: "127.0.0.1", port: 0, onListen: () => {} },
  (req) => {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    if (!match) return json([]); // health checks etc.
    const table = match[1];

    const fixture = activeTables[table];
    if (fixture === undefined) {
      fixtureGaps.push(`${table}?${url.searchParams.toString()}`);
      return json([]);
    }
    const rows = typeof fixture === "function" ? fixture(url.searchParams) : fixture;

    const wantsObject = (req.headers.get("accept") ?? "").includes("vnd.pgrst.object");
    if (wantsObject) {
      if (rows.length === 1) return json(rows[0]);
      // PostgREST's response for .single()/.maybeSingle() with 0 (or >1) rows;
      // supabase-js maybeSingle() maps PGRST116 to data:null.
      return json(
        {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: `The result contains ${rows.length} rows`,
          hint: null,
        },
        406,
      );
    }
    return json(rows);
  },
);

// ─── Environment (must be set before the assembler runs) ────────────────

Deno.env.set("SUPABASE_URL", `http://127.0.0.1:${server.addr.port}`);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-role-key");
Deno.env.set("SUPABASE_ANON_KEY", "fixture-anon-key");
Deno.env.set("RELATTI_DYAD_ENGINE", "on"); // production state — dyad layer resolves via the spine
Deno.env.delete("OPENAI_API_KEY"); // semantic memory retrieval no-ops deterministically
Deno.env.delete("ANTHROPIC_API_KEY");

const { assemblePrompt } = await import("../../supabase/functions/_shared/prompt-assembler.ts");

// ─── Helpers ─────────────────────────────────────────────────────────────

function silenceConsole(): () => void {
  const orig = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  console.log = console.info = console.warn = console.error = () => {};
  return () => {
    console.log = orig.log;
    console.info = orig.info;
    console.warn = orig.warn;
    console.error = orig.error;
  };
}

function render(out: {
  system: string;
  conversationHistory: { role: string; content: string }[];
}): string {
  const history = out.conversationHistory
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n");
  return `=== SYSTEM PROMPT ===\n${out.system}\n\n=== CONVERSATION HISTORY (${out.conversationHistory.length}) ===\n${history}\n`;
}

function reportDiff(name: string, expected: string, actual: string): void {
  const exp = expected.split("\n");
  const act = actual.split("\n");
  let i = 0;
  while (i < exp.length && i < act.length && exp[i] === act[i]) i++;
  console.error(`\n✗ [${name}] prompt drift — first difference at line ${i + 1} (expected ${exp.length} lines, got ${act.length}):`);
  console.error(`  golden: ${JSON.stringify(exp[i] ?? "<end of file>")}`);
  console.error(`  actual: ${JSON.stringify(act[i] ?? "<end of file>")}`);
  console.error(`  If this change is INTENTIONAL, regenerate with: npm run snapshot:prompts -- --update`);
}

// ─── Runner ──────────────────────────────────────────────────────────────

let failed = false;

if (UPDATE) {
  await Deno.mkdir(GOLDEN_DIR, { recursive: true });
}

for (const scenario of SCENARIOS) {
  activeTables = scenario.tables;
  fixtureGaps = [];

  const restore = silenceConsole();
  let text: string;
  try {
    const out = await assemblePrompt(
      scenario.userId,
      scenario.userMessage,
      false,
      scenario.engagementId,
      scenario.mode,
      scenario.program,
      scenario.conversationId,
    );
    text = render(out);
  } catch (e) {
    restore();
    console.error(`✗ [${scenario.name}] assemblePrompt threw: ${(e as Error).message}`);
    failed = true;
    continue;
  } finally {
    restore();
  }

  if (fixtureGaps.length > 0) {
    console.error(`✗ [${scenario.name}] fixture gap — the assembler queried tables with no fixture:`);
    for (const gap of [...new Set(fixtureGaps)]) console.error(`    ${gap}`);
    failed = true;
  }

  // Coverage guards: a golden full of accidentally-empty layers protects nothing.
  for (const must of scenario.mustInclude) {
    if (!text.includes(must)) {
      console.error(`✗ [${scenario.name}] coverage: expected substring missing: ${JSON.stringify(must)}`);
      failed = true;
    }
  }
  for (const mustNot of scenario.mustExclude) {
    if (text.includes(mustNot)) {
      console.error(`✗ [${scenario.name}] cross-vertical bleed: forbidden substring present: ${JSON.stringify(mustNot)}`);
      failed = true;
    }
  }

  const goldenPath = new URL(`${scenario.name}.golden.txt`, GOLDEN_DIR);
  if (UPDATE) {
    await Deno.writeTextFile(goldenPath, text);
    console.log(`✓ [${scenario.name}] golden written (${text.length} chars)`);
  } else {
    let expected: string;
    try {
      expected = await Deno.readTextFile(goldenPath);
    } catch {
      console.error(`✗ [${scenario.name}] golden missing at ${goldenPath.pathname} — run with --update to create it.`);
      failed = true;
      continue;
    }
    if (expected !== text) {
      reportDiff(scenario.name, expected, text);
      failed = true;
    } else {
      console.log(`✓ [${scenario.name}] byte-identical (${text.length} chars)`);
    }
  }
}

await server.shutdown();

if (failed) {
  console.error("\nPrompt snapshot gate FAILED.");
  Deno.exit(1);
}
console.log(`\nPrompt snapshot gate passed — ${SCENARIOS.length}/${SCENARIOS.length} scenarios byte-identical.`);
