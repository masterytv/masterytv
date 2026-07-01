#!/usr/bin/env node
/**
 * Partner-isolation regression guard (E15.3 · PRIVACY_TERMS_LIABILITY_PLAN §6.2).
 *
 * The coach edge function reads with the SERVICE ROLE key, which BYPASSES RLS — so on
 * the coach path partner isolation is enforced ENTIRELY by each query filtering on the
 * requesting user's user_id. Dropping that predicate, or scoping only by the SHARED
 * engagement_id / conversation_id, would leak one partner's private coaching content
 * into the other's prompt (catastrophic per §3.3 — he called her "psychopathic"; she
 * disclosed a miscarriage). This locks the invariant so it can't silently regress.
 *
 * Static by design → offline + CI-safe (no prod mutation). The live two-user / RLS
 * proof is recorded in directives/SAFETY_ESCALATION_PROTOCOL.md (E15.3 verification).
 *
 * Run:  node scripts/coach-lab/isolation-check.mjs   (exits non-zero on any leak risk)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(REPO, p), "utf8");

// Per-user PRIVATE coaching content. A SELECT of any of these on the service-role
// client (the prompt-assembly path) MUST be user_id-scoped.
const CONTENT_TABLES = ["messages", "memory_facts", "conversation_summaries"];

const failures = [];
let checks = 0;

/**
 * From the '.' of a `.from("table")`, walk the method chain (`.m(...).m(...)`),
 * balancing parens and skipping string literals, and return the chain text. Robust
 * to whether the statement ends in `;` or `,` (queries live in a Promise.all array).
 */
function extractChain(src, startDot) {
  let i = startDot;
  const n = src.length;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;      // whitespace before next .method
    if (src[i] !== ".") break;                    // chain ended
    i++;                                          // past '.'
    while (i < n && /[A-Za-z0-9_$]/.test(src[i])) i++; // method name
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "(") break;                     // a property, not a call → end
    let depth = 0;
    for (; i < n; i++) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {   // skip string literal
        const q = c; i++;
        while (i < n && src[i] !== q) { if (src[i] === "\\") i++; i++; }
      } else if (c === "(") depth++;
      else if (c === ")") { depth--; if (depth === 0) { i++; break; } }
    }
  }
  return src.slice(startDot, i);
}

// ── 1. prompt-assembler.ts — every content-table SELECT is user_id-scoped ──
function checkFile(file) {
  const src = read(file);
  for (const table of CONTENT_TABLES) {
    const re = new RegExp(`\\.from\\(\\s*["'\`]${table}["'\`]\\s*\\)`, "g");
    let m;
    while ((m = re.exec(src)) !== null) {
      const chain = extractChain(src, m.index);
      if (!/\.select\s*\(/.test(chain)) continue;          // writes are not a read-leak
      if (/\.(insert|update|delete|upsert)\s*\(/.test(chain)) continue;
      checks++;
      if (!/\buser_id\b/.test(chain)) {
        failures.push(
          `${file}: SELECT from "${table}" is NOT user_id-scoped:\n      ${chain.replace(/\s+/g, " ").slice(0, 180)}`,
        );
      }
    }
  }
}
checkFile("supabase/functions/_shared/prompt-assembler.ts");

// ── 2. embeddings.ts — semantic memory/message RPCs pass the per-user filter ──
{
  const src = read("supabase/functions/_shared/embeddings.ts");
  for (const rpc of ["match_memory_facts", "match_messages"]) {
    const m = src.match(new RegExp(`\\.rpc\\(\\s*["'\`]${rpc}["'\`][\\s\\S]{0,400}?\\)\\s*;`));
    if (!m) continue;
    checks++;
    if (!/match_user_id/.test(m[0])) {
      failures.push(
        `embeddings.ts: RPC "${rpc}" does not pass match_user_id:\n      ${m[0].replace(/\s+/g, " ").slice(0, 180)}`,
      );
    }
  }
}

console.log(`\nPartner-isolation guard: ${checks - failures.length}/${checks} coaching-content reads user-scoped\n`);
if (failures.length) {
  console.log("FAILURES — partner data could leak across a dyad:");
  for (const f of failures) console.log("  ✗ " + f);
  console.log("");
  process.exit(1);
}
console.log("All coaching-content reads in the prompt path are user-scoped.\n");
