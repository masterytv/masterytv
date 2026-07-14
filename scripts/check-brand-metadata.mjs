#!/usr/bin/env node
/**
 * Brand-metadata gate (BRAND.md §15) — every page that exports metadata must
 * build it through src/lib/platform/brand-metadata.ts.
 *
 * Why: Next merges metadata per TOP-LEVEL key, so a page exporting a bare
 * `{ title }` inherits the root layout's Mastery Coach openGraph + favicon
 * set wholesale — and link-preview crawlers (iMessage/Slack/WhatsApp) never
 * run the client-side brand script that swaps icons in the browser. Shipped
 * live 2026-07-14: relatti.com links previewed with the MasteryTV icon and
 * title. With white-label tenants, the same bug would leak OUR brand onto a
 * customer's domain — so this is enforced mechanically, not by convention.
 *
 * Rule: any src/app page.tsx / layout.tsx that exports `metadata` or
 * `generateMetadata` must either import from brand-metadata or be listed in
 * ALLOWLIST below. The allowlist is the reviewable escape hatch: it exists
 * for surfaces served ONLY on the default MasteryTV brand, where inheriting
 * the root defaults is correct. Adding a new path here is a conscious,
 * code-reviewed claim that the page can never be served on another brand's
 * domain. When a vertical/white-label tenant starts serving one of these
 * routes, it must move to the helper and come OFF this list.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const APP_DIR = "src/app";

const ALLOWLIST = new Set([
  // The one place the default-brand (MasteryTV) fallback metadata is DEFINED.
  "src/app/layout.tsx",
  // MasteryTV/Decoded-only marketing + product surfaces (masterytv.com only).
  "src/app/page.tsx",
  "src/app/types/page.tsx",
  "src/app/legacy/page.tsx",
  "src/app/decoded/landing/page.tsx",
  "src/app/decoded/landing-noir/page.tsx",
  "src/app/decoded/landing-noir-2/page.tsx",
  "src/app/decoded/assess/page.tsx",
  "src/app/report/[id]/page.tsx",
  // Operator-only admin (never a customer-facing preview surface).
  "src/app/admin/layout.tsx",
  "src/app/admin/beta/page.tsx",
]);

const METADATA_EXPORT =
  /export\s+(const\s+metadata\b|async\s+function\s+generateMetadata\b|function\s+generateMetadata\b)/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === "page.tsx" || entry.name === "layout.tsx") out.push(p);
  }
  return out;
}

const failures = [];
const stale = [];
let checked = 0;

for (const file of walk(APP_DIR)) {
  const rel = relative(".", file).replaceAll("\\", "/");
  const src = readFileSync(file, "utf8");
  if (!METADATA_EXPORT.test(src)) continue; // no metadata export → inherits deliberately
  checked++;

  const usesHelper = src.includes("brand-metadata");
  const allowlisted = ALLOWLIST.has(rel);

  if (!usesHelper && !allowlisted) failures.push(rel);
  if (usesHelper && allowlisted) stale.push(rel); // allowlist entry no longer needed
}

for (const rel of ALLOWLIST) {
  try {
    readFileSync(rel);
  } catch {
    stale.push(`${rel} (file no longer exists)`);
  }
}

if (failures.length > 0) {
  console.error("✗ Brand-metadata gate FAILED (BRAND.md §15):\n");
  for (const f of failures) console.error(`   ${f}`);
  console.error(`
These pages export metadata without src/lib/platform/brand-metadata.ts.
A bare metadata export inherits the root layout's Mastery Coach og:title +
favicons, and link-preview crawlers never run the client-side brand script —
on a white-label domain this leaks the wrong brand entirely.

Fix: relatti-/tenant-only static page  → relattiPageMetadata({ ... })
     page served by multiple brands    → generateMetadata() + brandPageMetadata(brand.id, { ... })
     provably MasteryTV-only surface   → add to ALLOWLIST in scripts/check-brand-metadata.mjs (code-reviewed)
`);
  process.exit(1);
}

if (stale.length > 0) {
  console.error("✗ Brand-metadata gate: stale ALLOWLIST entries (remove them):");
  for (const s of stale) console.error(`   ${s}`);
  process.exit(1);
}

console.log(`Brand-metadata gate passed — ${checked} metadata-exporting pages checked, 0 bare exports.`);
