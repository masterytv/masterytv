/**
 * check:brand-terms — banned brand terms may not re-enter the codebase.
 *
 * WHY: the money vertical shipped weeks of surfaces + LLM prompts under the
 * interim name "Money Maps" before discovering it is a THIRD PARTY'S REGISTERED
 * TRADEMARK (founder decision 2026-07-20 → renamed "MoneyTraits"; full record in
 * directives/MONEY_TRAITS_RENAME.md). Re-introducing the old name — in UI copy,
 * a prompt, an email template, a golden — is legal exposure, not just stale
 * branding. Docs can't stop an autocomplete or a copy-paste; this gate can
 * (BRAND.md §1.1 — the §14/§15 pattern: convention becomes a build failure).
 *
 * WHAT IT CATCHES (see BANNED below):
 *   - any spaced form, any case:  "Money Maps", "Money Map", "money maps",
 *     "MONEY MAP PROFILE", "Money  Maps"
 *   - the standalone camel brand word: "MoneyMaps"
 *
 * WHAT IT DELIBERATELY DOES NOT CATCH (locked storage/code identifiers —
 * MONEY_TRAITS_RENAME.md §1.2 — these are invisible to users and must never be
 * renamed): instrument id `money_maps`, JSONB keys `sections.money_map` /
 * `money_narrative`, TS names MoneyMap/StoredMoneyMap/scoreMoneyMaps/
 * MoneyMapsScore/MoneyMapsRadar, file names money-maps.ts / money-map-*.ts,
 * the transition host moneymaps.masterytv.com, and MONEY_MAPS/MONEY_MAP_*
 * constants. None of them contain the banned spaced/camel forms.
 *
 * ALLOWED LINES: the three ban-explainer comments (brand.ts, the instrument
 * file, MoneyMapCard, edge brands.ts) quote the banned name to explain the ban.
 * A line is exempt when it also contains one of ALLOW_MARKERS — markers that
 * only appear in those explainers. Smuggling copy past the gate with a marker
 * would be deliberate, and this gate exists to stop accidents.
 *
 * Run: node scripts/check-banned-brand-terms.mjs [--self-test]
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "supabase/functions", "scripts"];
const SELF = "scripts/check-banned-brand-terms.mjs"; // contains the terms as patterns/samples
const TEXT_EXT = /\.(tsx?|m?js|cjs|css|md|txt|json|svg|html|sql|golden\.txt)$/i;

const BANNED = [
  { re: /money +maps?\b/i, label: 'spaced form ("Money Maps" / "Money Map", any case)' },
  { re: /\bMoneyMaps\b/, label: 'standalone camel word ("MoneyMaps")' },
];

const ALLOW_MARKERS = ["registered mark", "supersedes the interim", "never the old"];

// ─── self-test: prove the patterns catch what they must and spare what they must ───
if (process.argv.includes("--self-test")) {
  const mustCatch = [
    "Money Maps", "money maps", "Money Map", "MONEY MAP PROFILE",
    "Take Money  Maps", "MoneyMaps", 'compare Money Maps with you',
  ];
  const mustSpare = [
    "money_maps", "sections.money_map", "money-maps.ts", "money-map-profile.ts",
    "MoneyMapCard", "scoreMoneyMaps(x)", "MoneyMapsScore", "MoneyMapsRadar",
    "moneymaps.masterytv.com", "MONEY_MAPS", "MONEY_MAP_ITEM_INDICES",
    "MoneyTraits", "money mapping exercise", "type MoneyMap = 'GUARD'",
  ];
  const caught = (s) => BANNED.some((b) => b.re.test(s));
  const missed = mustCatch.filter((s) => !caught(s));
  const overcaught = mustSpare.filter((s) => caught(s));
  if (missed.length || overcaught.length) {
    if (missed.length) console.error(`✗ self-test: NOT caught: ${missed.join(" · ")}`);
    if (overcaught.length) console.error(`✗ self-test: false positives: ${overcaught.join(" · ")}`);
    process.exit(1);
  }
  console.log(`Brand-term self-test passed — ${mustCatch.length} banned samples caught, ${mustSpare.length} locked identifiers spared.`);
  process.exit(0);
}

// ─── the scan ───
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const violations = [];
let scanned = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(".", file).replaceAll("\\", "/");
    if (rel === SELF) continue;
    if (!TEXT_EXT.test(rel) && !/goldens\//.test(rel)) continue;
    scanned++;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const hit = BANNED.find((b) => b.re.test(line));
      if (!hit) return;
      if (ALLOW_MARKERS.some((m) => line.includes(m))) return;
      violations.push(`${rel}:${i + 1} — ${hit.label}\n    ${line.trim().slice(0, 160)}`);
    });
  }
}

if (violations.length) {
  console.error(`✗ Banned brand term found (${violations.length} line${violations.length === 1 ? "" : "s"}):\n`);
  for (const v of violations) console.error(`  ${v}\n`);
  console.error(
    `"Money Maps"/"MoneyMaps" is a THIRD PARTY'S REGISTERED MARK — the money vertical is "MoneyTraits" (one word).\n` +
      `Use: MoneyTraits · the four traits (GUARD/DRIVE/MIRROR/SHADOW) · "your trait profile" · "the Challenge" · "the Fear".\n` +
      `Locked storage identifiers (money_maps, sections.money_map, MoneyMap types, money-maps.ts files) are exempt and must\n` +
      `never surface in copy. Full rules: BRAND.md §1.1 + directives/MONEY_TRAITS_RENAME.md.`,
  );
  process.exit(1);
}

console.log(`Brand-term gate passed — ${scanned} files scanned, no banned brand terms (BRAND.md §1.1).`);
