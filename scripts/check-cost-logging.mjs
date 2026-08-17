#!/usr/bin/env node
/**
 * check:cost-logging — every module that reaches an LLM must account for it.
 *
 * 🔥 Why. On 2026-08-17 `cost_tracking` was read to size a month of Anthropic
 * spend and returned ~$2. The real figure on the same key was $23.90. Nothing
 * in the table was wrong; it was just missing the callers that never wrote to
 * it, so the number looked authoritative and was off by 10x. The fix was three
 * log calls. This gate is what stops the fourth one from happening quietly.
 *
 * A file passes if ANY of these holds:
 *   1. it writes a row itself            — `cost_tracking` / `logLlmCost(`
 *   2. it passes a cost context          — `cost:` on the call
 *   3. it is on ROLLUP_ALLOWLIST below   — its usage is billed by its caller
 *
 * Run: node scripts/check-cost-logging.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "supabase/functions";

/**
 * Files whose LLM usage is deliberately billed somewhere else. Each entry needs
 * a reason, and the reason needs to name where the tokens actually land — an
 * allowlist without that is just a mute button.
 */
const ROLLUP_ALLOWLIST = {
  "_shared/draft-audit.ts":
    "returns extraUsage; coach/index.ts adds it to the coach row before logging",
  "_shared/anthropic.ts":
    "the client itself — it logs on behalf of callers via CostContext",
  "_shared/channel-router.ts":
    "writes its own cost_tracking rows for both the gpt and claude branches",
};

/**
 * Something in here means the file talks to an LLM.
 *
 * Matches the client names as bare identifiers rather than as `name(` calls:
 * draft-audit.ts spends real money through `(opts.callFn ?? callClaude)({...})`
 * and `const call = judgeFn ?? callClaudeJson`, neither of which ever puts a
 * paren directly after the name. Requiring the call shape made this checker
 * blind to exactly the indirection a costly module is most likely to use.
 */
const CALLS_LLM = /\b(callClaude|callClaudeJson|callClaudeStreaming)\b|api\.anthropic\.com|api\.openai\.com/;
/** Something in here means the file accounts for it. */
const ACCOUNTS = /cost_tracking|logLlmCost\s*\(|\bcost:\s*\{|\bcost,\s*$|logEmbeddingCost/m;

/**
 * Strips comments before matching, so only CODE can satisfy this gate.
 *
 * Caught during its own negative test: a file that had lost its `cost` context
 * still passed, because a comment explaining the fix said the words
 * "cost_tracking". A checker a docstring can satisfy proves nothing — the
 * regexes below have to look at what the module does, not what it says.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const offenders = [];
const stale = new Set(Object.keys(ROLLUP_ALLOWLIST));

for (const file of walk(ROOT)) {
  const rel = file.slice(ROOT.length + 1);
  const src = stripComments(readFileSync(file, "utf8"));
  if (!CALLS_LLM.test(src)) continue;
  if (ROLLUP_ALLOWLIST[rel]) {
    stale.delete(rel);
    continue;
  }
  if (!ACCOUNTS.test(src)) offenders.push(rel);
}

if (offenders.length > 0) {
  console.error(`✗ ${offenders.length} module(s) call an LLM without accounting for the spend:\n`);
  for (const f of offenders) console.error(`  ${ROOT}/${f}`);
  console.error(
    "\nFix by ONE of:\n" +
      "  - pass a cost context:  callClaude({ ..., cost: { supabase, userId, purpose } })\n" +
      "  - log it yourself:      logLlmCost(supabase, { purpose, model, usage })\n" +
      "  - if a caller already bills these tokens, add the file to ROLLUP_ALLOWLIST\n" +
      "    in this script WITH the reason and where the tokens land.\n",
  );
  process.exit(1);
}

// An allowlist entry for a file that no longer calls an LLM is a stale excuse.
if (stale.size > 0) {
  console.error(`✗ ROLLUP_ALLOWLIST has ${stale.size} stale entr(y/ies) — these no longer call an LLM:\n`);
  for (const f of stale) console.error(`  ${f}`);
  console.error("\nRemove them so the allowlist keeps meaning something.\n");
  process.exit(1);
}

console.log("✓ cost-logging: every LLM caller accounts for its spend.");
