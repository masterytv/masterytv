#!/usr/bin/env node
/**
 * check-brand-ternaries.mjs — the TERNARY half of the tenancy gate
 * (TENANCY_AUDIT.md T3). Analogs: check-brand-colors.mjs (§14),
 * check-brand-metadata.mjs (§15).
 *
 * WHY: brand-keyed code fails LOUDLY (Record<BrandId,…> breaks the typecheck
 * when a brand is added); ternaries on brand/program literals fail SILENTLY —
 * `x === "relatti" ? a : b` hands every FUTURE brand the else-branch (Mastery
 * copy, the Decoded share modal, the wrong privacy policy) with zero compiler
 * errors. This gate fails the build on any such ternary in shared code. Use
 * `byBrand({...}, id)` (src/lib/platform/brand.ts), `brandForProgram()` /
 * `EDGE_BRANDS` (supabase/functions/_shared/brands.ts), or a
 * `Record<ProgramId,…>` map instead.
 *
 * HOW: the id ban-set is DERIVED from the BrandId + ProgramId unions in
 * src/lib/platform/brand.ts, so adding a brand or program automatically
 * extends the gate. Two patterns are banned outside the allowlist:
 *   1. `=== "id" ?` / `!== "id" ?`  — a ternary CONDITION on a brand/program
 *   2. `? "id" :` / `: "id"` pairs — a ternary YIELDING a brand/program id
 *      (catches template-literal scripts the typechecker cannot see)
 * Comments are stripped first (a docstring describing the pattern is fine).
 * Plain comparisons without a ternary (guards like `x === "relatti" ||`,
 * `.eq("program", "relationship")` filters) are NOT banned — selecting DATA
 * by program is scoping; selecting BEHAVIOR by ternary is the bug.
 *
 * ALLOWLIST: files where the ternary is reviewed, deliberate debt.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = process.cwd();
const BRAND_TS = "src/lib/platform/brand.ts";

// Reviewed allowlist. Entries ending in "/" match a whole subtree.
const ALLOW = [
  // The inline <head> script is a TEMPLATE LITERAL — no type can reach it, and
  // it is deliberately static (FOUC-free brand/theme/favicon before hydration).
  // KNOWN DEBT: a new brand must extend this script by hand — it's the
  // VERTICAL_PLAYBOOK §5 layout item. The gate exists so no NEW file joins it.
  "src/app/layout.tsx",
];

function isAllowed(rel) {
  const p = rel.split(sep).join("/");
  return ALLOW.some((a) => (a.endsWith("/") ? p.startsWith(a) : p === a));
}

// ── Derive the id ban-set from the unions in brand.ts ──
const brandSrc = readFileSync(join(ROOT, BRAND_TS), "utf8");
const ids = new Set();
for (const unionName of ["BrandId", "ProgramId"]) {
  const m = brandSrc.match(new RegExp(`export type ${unionName} =([^;]+);`));
  if (!m) {
    console.error(`check-brand-ternaries: could not find 'export type ${unionName}' in ${BRAND_TS}`);
    process.exit(1);
  }
  for (const lit of m[1].matchAll(/"([a-z_-]+)"/g)) ids.add(lit[1]);
}
if (ids.size < 4) {
  console.error(`check-brand-ternaries: derived only ${ids.size} ids — expected at least 4 (brands + programs).`);
  process.exit(1);
}
const ID = [...ids].join("|");

// 1. brand/program literal as a ternary condition:  === "relatti" ?
const COND = new RegExp(`[=!]==?\\s*["'](?:${ID})["']\\s*\\?`);
// 2. ternary yielding a brand/program literal:  ? "relatti" : ... or ... : "masterytv"
//    Require BOTH arms to look ternary-ish to avoid English-word false hits.
const YIELD = new RegExp(`\\?\\s*["'](?:${ID})["']\\s*:`);

function stripComments(code) {
  // Block comments (incl. JSX {/* */}) then line comments. Avoid eating
  // protocol strings ("https://...") by requiring // not preceded by ':'.
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield full;
  }
}

const violations = [];
for (const base of ["src", join("supabase", "functions")]) {
  for (const file of walk(join(ROOT, base))) {
    const rel = file.slice(ROOT.length + 1);
    if (isAllowed(rel)) continue;
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (COND.test(line) || YIELD.test(line)) {
        violations.push(`${rel}:${i + 1}  ${line.trim().slice(0, 120)}`);
      }
    });
  }
}

if (violations.length) {
  console.error(`Brand-ternary gate FAILED — ${violations.length} ternary(ies) on brand/program literals:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `\nA ternary on a brand/program id silently hands every future brand the else-branch.` +
    `\nUse byBrand({...}, id) / Record<ProgramId,…> (src) or brandForProgram() / EDGE_BRANDS (edge).` +
    `\nIf this ternary is genuinely reviewed two-brand debt, add the file to ALLOW in scripts/check-brand-ternaries.mjs with a justification.`,
  );
  process.exit(1);
}

console.log(`Brand-ternary gate passed — no behavior ternaries on ${ids.size} derived brand/program ids outside the allowlist.`);
