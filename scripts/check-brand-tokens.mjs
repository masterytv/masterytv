#!/usr/bin/env node
/**
 * check-brand-tokens.mjs — the token-coverage half of the brand gate (BRAND.md §14).
 *
 * WHY: a component that correctly uses `var(--accent-primary)` still leaks if a
 * brand's `[data-brand=X]` block forgets to override it — the value falls back to
 * the DEFAULT (incumbent) brand. That's a silent leak the color gate can't see
 * (the component is clean). This gate makes brand token coverage symmetric: every
 * brand must override, in BOTH themes, the full set of identity tokens that any
 * brand overrides. A new brand can't ship a half-declared palette.
 *
 * (This is exactly the gap the Relatti-dark block had: it defined the color-primary
 * tokens but not the accent-primary / cta tokens, so those resolved indigo on
 * Relatti-dark.)
 *
 * Rule per (brand, theme):
 *   dark  : every identity token must be in `[data-brand=X]`      (no other brand-scope fallback in dark)
 *   light : every identity token must be in `[data-brand=X]` ∪ `[data-brand=X][data-theme=light]`
 * identity set = union of custom props declared in ANY `[data-brand=…]` token block.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Strip CSS comments so they don't get captured as part of a selector.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

// Parse flat `selector { …decls… }` blocks; keep only pure brand token blocks
// (`[data-brand="X"]` optionally with `[data-theme="Y"]` — no descendant/class).
const BRAND_BLOCK = /^\[data-brand="([^"]+)"\](?:\[data-theme="([^"]+)"\])?$/;
const brands = {}; // brand -> theme('dark'|'light') -> Set(prop)
for (const m of css.matchAll(/([^{}]+?)\s*\{([^{}]*)\}/gs)) {
  const sel = m[1].trim();
  const bm = sel.match(BRAND_BLOCK);
  if (!bm) continue;
  const [, brand, theme = "dark"] = bm;
  const props = [...m[2].matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((p) => p[1]);
  (brands[brand] ??= {})[theme] ??= new Set();
  props.forEach((p) => brands[brand][theme].add(p));
}

// Identity set = every prop any brand block declares.
const identity = new Set();
for (const themes of Object.values(brands))
  for (const set of Object.values(themes)) set.forEach((p) => identity.add(p));

const problems = [];
for (const [brand, themes] of Object.entries(brands)) {
  const dark = themes.dark ?? new Set();
  const light = themes.light ?? new Set();
  const missingDark = [...identity].filter((p) => !dark.has(p));
  // In light, the dark block still applies unless theme-overridden, so union.
  const lightCover = new Set([...dark, ...light]);
  const missingLight = [...identity].filter((p) => !lightCover.has(p));
  if (missingDark.length) problems.push({ brand, theme: "dark", missing: missingDark });
  if (missingLight.length) problems.push({ brand, theme: "light", missing: missingLight });
}

if (problems.length) {
  console.error(`\n✗ Brand-token gate: a brand under-declares its identity tokens.\n`);
  console.error("  Missing tokens fall back to the DEFAULT brand's value — a silent color leak.");
  console.error("  Add the token(s) to the brand's globals.css block(s):\n");
  for (const p of problems) {
    const sel = p.theme === "light" ? `[data-brand="${p.brand}"][data-theme="light"]` : `[data-brand="${p.brand}"]`;
    console.error(`  ${sel} is missing:`);
    for (const t of p.missing) console.error(`      ${t}`);
    console.error("");
  }
  process.exit(1);
}
console.log(
  `Brand-token gate passed — ${Object.keys(brands).length} brand(s) each override the full ` +
    `identity set (${identity.size} tokens) in both light and dark.`,
);
