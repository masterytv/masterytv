#!/usr/bin/env node
/**
 * check-brand-colors.mjs — the color half of the brand-consistency gate
 * (BRAND.md §14). Analog to check-brand-metadata.mjs (§15).
 *
 * WHY: this app serves many brands from one codebase; a component that hardcodes
 * a brand-identity color (e.g. `#6063ee`, `rgba(96,99,238,0.1)`, `text-[#a3a6ff]`)
 * ships THAT brand's color on every OTHER brand's domain — exactly the leak class
 * we cleaned up in the July 2026 Relatti sweep. Semantic tokens
 * (`var(--color-primary)`, `bg-primary-container/10`) resolve per brand+theme, so
 * they can't leak. This gate fails the build the moment a brand-identity color is
 * hardcoded in a shared surface.
 *
 * HOW: the ban-set is DERIVED from globals.css's brand-identity token VALUES, so
 * adding a brand (its `[data-brand=career]` block) automatically extends what's
 * banned in components — no list to maintain here.
 *
 * ALLOWLIST: files where a literal brand hex is unavoidable or can't leak —
 * token definitions, email HTML (clients can't read CSS vars), the OG image
 * palette (edge runtime, no CSS), and provably single-brand surfaces (Decoded /
 * MasteryTV-only marketing, admin, coachapp) that never render on another domain.
 * `var(--token, #fallback)` is always allowed (the token wins; the hex is dead
 * defense).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const GLOBALS = "src/app/globals.css";

// Brand-identity custom properties — the ones that MUST vary per brand.
const IDENTITY_PROP =
  /^--(color-primary(-container|-deep|-darker|-dim)?|color-info|accent-primary(-bg|-bg-hover|-ring)?|cta-(from|to)|primary-tint-\d+|primary-glow(-soft|-ring)?|relatti-mark-[a-z]+|chat-accent-[a-z]+)$/;

// Reviewed allowlist. Entries ending in "/" match a whole subtree.
const ALLOW = [
  GLOBALS,                                        // the token definitions (source of truth)
  "src/app/dashboard/chat/chat.css",              // defines the --chat-accent brand token layer
  "src/lib/decoded/invite-email.ts",              // email HTML — mail clients can't read CSS vars
  "src/app/api/og/route.tsx",                     // OG image palette — edge ImageResponse, no CSS
  // ── Provably single-brand surfaces (only ever render on masterytv.com / decoded) ──
  "src/app/decoded/",                             // Decoded marketing + admin
  "src/app/admin/",                               // internal platform admin
  "src/app/coachapp/",                            // MasteryTV coach app
  "src/app/onboarding/",                          // MasteryTV coach onboarding (Relatti uses /assess)
  "src/app/types/",                               // Decoded archetype directory
  "src/app/landing.css",                          // MasteryTV marketing landing
  "src/app/dashboard/DashboardHome.tsx",          // MasteryTV dashboard (Relatti = RelattiDashboard)
  "src/app/dashboard/dashboard.css",              // MasteryTV dashboard-module styles
  "src/app/(legal)/_content/MasteryTerms.tsx",    // MasteryTV legal (Relatti has its own)
  "src/app/(legal)/_content/MasteryPrivacy.tsx",
  "src/components/decoded/ShareModal.tsx",        // Decoded viral share — retired on Relatti
  "src/components/decoded/share-modal.css",
  "src/components/decoded/InviteConsentBanner.tsx", // rendered only inside DashboardHome
];

function isAllowed(rel) {
  const p = rel.split(sep).join("/");
  return ALLOW.some((a) => (a.endsWith("/") ? p.startsWith(a) : p === a));
}

function hexToTriple(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
}

// 1) Derive the ban-set from globals.css brand-identity token values.
const bannedHex = new Set(); // "#6063ee"
const bannedTriple = new Set(); // "96,99,238"
for (const line of readFileSync(join(ROOT, GLOBALS), "utf8").split("\n")) {
  const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);/i);
  if (!m || !IDENTITY_PROP.test(m[1])) continue;
  for (const hx of m[2].matchAll(/#[0-9a-f]{6}\b/gi)) {
    bannedHex.add(hx[0].toLowerCase());
    bannedTriple.add(hexToTriple(hx[0]));
  }
  for (const rg of m[2].matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    bannedTriple.add(`${+rg[1]},${+rg[2]},${+rg[3]}`);
  }
}

// 2) Scan src for those literals (var() fallbacks stripped; allowlist skipped).
const violations = [];
(function scan(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "node_modules" && !name.startsWith(".")) scan(full);
      continue;
    }
    if (!/\.(tsx?|css)$/.test(name)) continue;
    const rel = relative(ROOT, full);
    if (isAllowed(rel)) continue;
    readFileSync(full, "utf8")
      .split("\n")
      .forEach((line, i) => {
        const s = line.replace(/var\(\s*--[a-z0-9-]+\s*,[^)]*\)/gi, ""); // drop legit fallbacks
        for (const hx of s.matchAll(/#[0-9a-f]{6}\b/gi))
          if (bannedHex.has(hx[0].toLowerCase()))
            violations.push({ rel, line: i + 1, hit: hx[0], text: line.trim() });
        for (const rg of s.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi))
          if (bannedTriple.has(`${+rg[1]},${+rg[2]},${+rg[3]}`))
            violations.push({ rel, line: i + 1, hit: `${rg[0]}…)`, text: line.trim() });
      });
  }
})(join(ROOT, "src"));

// 3) Report.
if (violations.length) {
  console.error(`\n✗ Brand-color gate: ${violations.length} hardcoded brand-identity color(s).\n`);
  console.error("  These ship one brand's color on another brand's domain. Use a semantic token:");
  console.error("    CSS/inline  →  var(--color-primary) / var(--color-primary-container)");
  console.error("    tint        →  color-mix(in oklch, var(--color-primary-container) N%, transparent)");
  console.error("    Tailwind    →  text-primary / bg-primary-container/10 / from-primary to-primary-container\n");
  for (const v of violations) console.error(`  ${v.rel}:${v.line}  ${v.hit}\n      ${v.text}`);
  console.error("\n  Genuinely unavoidable (email HTML, OG image, a token definition, a provably");
  console.error("  single-brand surface)? Add it to the reviewed ALLOWLIST in this script.\n");
  process.exit(1);
}
console.log(
  `Brand-color gate passed — no hardcoded brand-identity colors in shared surfaces ` +
    `(${bannedHex.size} hex + ${bannedTriple.size} rgb triples derived from globals.css).`,
);
