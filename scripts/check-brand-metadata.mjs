#!/usr/bin/env node
/**
 * Brand-metadata gate (BRAND.md §15) — two rules, both mechanical:
 *
 * RULE 1 (file-level): any src/app page.tsx / layout.tsx that exports
 * `metadata` or `generateMetadata` must build it through
 * src/lib/platform/brand-metadata.ts, or be ALLOWLISTed.
 *
 * RULE 2 (route-level): every page.tsx ROUTE must have brand-aware metadata
 * somewhere in its layout chain BELOW the root layout — the page itself or an
 * ancestor layout.tsx. A page with no metadata export anywhere (typical for
 * "use client" pages, which CANNOT export metadata) silently inherits the
 * root layout's Mastery Coach title/og/icons on every brand. That is exactly
 * how relatti.com/dashboard/chat shipped with a "Mastery Coach" tab title
 * (found live by the founder, 2026-07-15) — the v1 of this gate only checked
 * files that DID export metadata, so a missing export passed silently.
 * Fix for a client page: add a metadata-only layout.tsx to its segment
 * (see src/app/dashboard/chat/layout.tsx for the pattern).
 *
 * Why: Next merges metadata per TOP-LEVEL key, so anything not overridden
 * falls back to the root layout's Mastery Coach openGraph + favicon set
 * wholesale — and link-preview crawlers (iMessage/Slack/WhatsApp) never run
 * the client-side brand script that swaps icons in the browser. With
 * white-label tenants, the same bug would leak OUR brand onto a customer's
 * domain — so this is enforced mechanically, not by convention.
 *
 * The ALLOWLIST is the reviewable escape hatch: surfaces served ONLY on the
 * default MasteryTV brand, where inheriting the root defaults is correct.
 * Adding a path here is a conscious, code-reviewed claim that the surface can
 * never be served on another brand's domain. An allowlisted layout.tsx covers
 * its whole subtree for RULE 2 (e.g. operator-only /admin). When a tenant
 * starts serving one of these routes, it must move to the helper and come OFF
 * this list.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const APP_DIR = "src/app";
const ROOT_LAYOUT = "src/app/layout.tsx";

const ALLOWLIST = new Set([
  // The one place the default-brand (MasteryTV) fallback metadata is DEFINED.
  ROOT_LAYOUT,
  // MasteryTV/Decoded-only marketing + product surfaces (masterytv.com only).
  "src/app/page.tsx",
  "src/app/types/page.tsx",
  "src/app/legacy/page.tsx",
  "src/app/decoded/landing/page.tsx",
  "src/app/decoded/landing-noir/page.tsx",
  "src/app/decoded/landing-noir-2/page.tsx",
  "src/app/decoded/assess/page.tsx",
  "src/app/report/[id]/page.tsx",
  // Legacy Letters (retired MasteryTV-only product) — layout covers the subtree.
  "src/app/legacy/layout.tsx",
  // Redirect-only page: it forwards to /login before a <head> ever renders.
  "src/app/decoded/page.tsx",
  // Operator-only admin (never a customer-facing preview surface).
  // The layout entries cover their whole subtrees for the route-level rule.
  "src/app/admin/layout.tsx",
  "src/app/admin/beta/page.tsx",
  "src/app/decoded/admin/backfill-v2/page.tsx",
]);

// Matches every way a page can export metadata, including
// `export const generateMetadata = …` (factory style).
const METADATA_EXPORT =
  /export\s+(const\s+(metadata|generateMetadata)\b|async\s+function\s+generateMetadata\b|function\s+generateMetadata\b)/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === "page.tsx" || entry.name === "layout.tsx") out.push(p);
  }
  return out;
}

const rel = (p) => relative(".", p).replaceAll("\\", "/");
const usesHelper = (path) => readFileSync(path, "utf8").includes("brand-metadata");

/** File satisfies the gate: brand-aware metadata, or an allowlisted surface. */
function covers(path) {
  return ALLOWLIST.has(rel(path)) || usesHelper(path);
}

/** Ancestor layout.tsx files from the page's segment up to (excluding) root. */
function ancestorLayouts(pagePath) {
  const layouts = [];
  let dir = dirname(pagePath);
  while (rel(dir) !== APP_DIR) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout) && rel(layout) !== ROOT_LAYOUT) layouts.push(layout);
    dir = dirname(dir);
  }
  return layouts;
}

const bareExports = [];
const uncoveredRoutes = [];
const stale = [];
let checked = 0;

const files = walk(APP_DIR);

// RULE 1 — metadata exports must go through the helper.
for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (!METADATA_EXPORT.test(src)) continue;
  checked++;
  if (!usesHelper(file) && !ALLOWLIST.has(rel(file))) bareExports.push(rel(file));
  if (usesHelper(file) && ALLOWLIST.has(rel(file))) stale.push(rel(file)); // entry no longer needed
}

// RULE 2 — every route must resolve brand-aware metadata below the root.
for (const file of files) {
  if (!file.endsWith("page.tsx")) continue;
  if (covers(file)) continue;
  if (ancestorLayouts(file).some(covers)) continue;
  uncoveredRoutes.push(rel(file));
}

for (const entry of ALLOWLIST) {
  if (!existsSync(entry)) stale.push(`${entry} (file no longer exists)`);
}

if (bareExports.length > 0 || uncoveredRoutes.length > 0) {
  console.error("✗ Brand-metadata gate FAILED (BRAND.md §15):\n");
  if (bareExports.length > 0) {
    console.error("  Metadata exports that bypass the helper:");
    for (const f of bareExports) console.error(`   ${f}`);
  }
  if (uncoveredRoutes.length > 0) {
    console.error("  Routes with NO brand-aware metadata below the root layout");
    console.error("  (they inherit the Mastery Coach title/og/icons on EVERY brand):");
    for (const f of uncoveredRoutes) console.error(`   ${f}`);
  }
  console.error(`
A route that doesn't resolve its own brand metadata inherits the root layout's
Mastery Coach og:title + favicons; link-preview crawlers never run the
client-side brand script. On a white-label domain this leaks the wrong brand.

Fix: relatti-/tenant-only static page  → relattiPageMetadata({ ... })
     page served by multiple brands    → generateMetadata() + brandPageMetadata(brand.id, { ... })
     "use client" page (can't export)  → metadata-only layout.tsx in its segment
                                          (pattern: src/app/dashboard/chat/layout.tsx)
     provably MasteryTV-only surface   → add to ALLOWLIST in scripts/check-brand-metadata.mjs (code-reviewed)
`);
  process.exit(1);
}

if (stale.length > 0) {
  console.error("✗ Brand-metadata gate: stale ALLOWLIST entries (remove them):");
  for (const s of stale) console.error(`   ${s}`);
  process.exit(1);
}

const routeCount = files.filter((f) => f.endsWith("page.tsx")).length;
console.log(
  `Brand-metadata gate passed — ${checked} metadata exports use the helper, ${routeCount} routes covered below root.`
);
