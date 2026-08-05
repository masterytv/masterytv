/**
 * check:copy-tells — the "not X, it's Y" negation pivot may not enter user-facing copy.
 *
 * WHY: the negation pivot ("It's not a label, it's a lens" / "Not a chatbot. A
 * coach.") is the single most recognizable signature of LLM-written prose. One
 * per page reads as a rhetorical device; three reads as a machine. The founder
 * flagged it 2026-08-05 after the MoneyTraits homepage rewrite, where the
 * pre-rewrite copy leaned on the construction ~15 times on one page.
 *
 * A prohibition in a doc can't stop it: avoiding a sentence SHAPE is exactly the
 * kind of rule that fails at generation time, for a human writer on autopilot as
 * much as for a model. So it gets the §14/§15 treatment — convention becomes a
 * check (BRAND.md §14.6).
 *
 * WARN-ONLY BY DEFAULT. This gate reports and exits 0 so it can ride along in
 * `npm run gate` while we learn its real noise level on live edits. Flip it to
 * blocking by running with --strict (or setting COPY_TELLS_STRICT=1) once we
 * trust it; the whole change is that one flag in package.json.
 *
 * WHAT IT CATCHES (see TELLS below) — the PIVOT, meaning a negation immediately
 * restated as a positive about the same subject:
 *   - "not just a test, it's a mirror"      (not just/only/merely + restatement)
 *   - "isn't a label. It's a lens"          (isn't X . It's Y)
 *   - "is not a sentence, but a start"      (is not a X, but Y)
 *   - "Not a chatbot. A coach."             (Not a X. A Y.)
 *
 * WHAT IT DELIBERATELY DOES NOT CATCH:
 *   - ordinary negations, which are fine and often legally required:
 *     "This isn't financial advice", "We never link to your bank",
 *     "not therapy, and not financial, investment, or tax advice"
 *   - em dashes and AI vocabulary. Both are real tells (see the humanizer skill
 *     and BRAND.md §14.6) but neither can be separated from legitimate code,
 *     comments, and identifiers by regex without drowning the signal in false
 *     positives. They stay a review concern, not a gate.
 *
 * Scanned as raw text INCLUDING comments: measured on this repo the patterns
 * produce zero comment false positives, so comment-stripping would be
 * complexity for nothing. A comment genuinely written in the pivot shape will
 * be flagged; rewording it costs nothing.
 *
 * Run: node scripts/check-copy-tells.mjs [--strict] [--self-test]
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "supabase/functions"];
const SELF = "scripts/check-copy-tells.mjs"; // contains the patterns as samples
const TEXT_EXT = /\.(tsx?|m?js|cjs)$/i;
const STRICT = process.argv.includes("--strict") || process.env.COPY_TELLS_STRICT === "1";

const TELLS = [
  {
    re: /\bnot (?:just|only|merely|simply)\b[^.?!]{0,80}[,;.]\s*(?:it|that|this|they|we|you)(?:'s|'re| is| are| was)\b/i,
    label: '"not just X, it\'s Y" pivot',
  },
  {
    // Separator class includes the em/en dash on purpose: the pivot's most
    // common live form pairs BOTH tells ("isn't a label — it's a lens").
    re: /\b(?:isn't|is not)\s+(?:a|an|the|about)\b[^.?!]{0,60}[.,;:—–]\s*(?:it|It)(?:'s| is)\b/i,
    label: '"isn\'t X. It\'s Y" pivot',
  },
  {
    re: /\b(?:is|are)\s+not\s+(?:a|an|the)\b[^.?!]{0,50},\s*(?:but|it's)\b/i,
    label: '"is not a X, but Y" pivot',
  },
  {
    re: /\bNot (?:a|an|the) \w+[.!]\s+(?:A|An|The) \w+/,
    label: '"Not a X. A Y." pivot',
  },
];

// ─── self-test: prove the patterns catch the pivot and spare plain negations ───
if (process.argv.includes("--self-test")) {
  const mustCatch = [
    "It's not just a test, it's a mirror.",
    "This isn't a label — it's a lens.",
    "A trait is not a sentence, but a starting position.",
    "Not a chatbot. A coach that knows your name.",
    "not only a report, it is a plan",
    "This is not the end. It's the beginning.",
  ];
  const mustSpare = [
    "This isn't financial advice.",
    "MoneyTraits is coaching and education on the psychology of money. It is not therapy, and not financial, investment, or tax advice.",
    "We never link to or touch your bank account.",
    "It won't manage your money.",
    "No budgets. No net-worth tracking.",
    "if (!isReady) return null;",
    "const isNotFound = status === 404;",
    "It is not available on the free plan.",
    "The trait is not fixed forever.",
  ];
  const caught = (s) => TELLS.some((t) => t.re.test(s));
  const missed = mustCatch.filter((s) => !caught(s));
  const overcaught = mustSpare.filter((s) => caught(s));
  if (missed.length || overcaught.length) {
    if (missed.length) console.error(`✗ self-test: NOT caught: ${missed.join(" · ")}`);
    if (overcaught.length) console.error(`✗ self-test: false positives: ${overcaught.join(" · ")}`);
    process.exit(1);
  }
  console.log(
    `Copy-tell self-test passed — ${mustCatch.length} pivots caught, ${mustSpare.length} plain negations spared.`,
  );
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
    if (!TEXT_EXT.test(rel)) continue;
    scanned++;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const hit = TELLS.find((t) => t.re.test(line));
      if (!hit) return;
      violations.push(`${rel}:${i + 1} — ${hit.label}\n    ${line.trim().slice(0, 160)}`);
    });
  }
}

if (violations.length) {
  const say = STRICT ? console.error : console.warn;
  say(
    `${STRICT ? "✗" : "⚠"} Negation pivot in copy (${violations.length} line${violations.length === 1 ? "" : "s"}):\n`,
  );
  for (const v of violations) say(`  ${v}\n`);
  say(
    `The "not X, it's Y" construction is the #1 LLM writing tell. Fix by cutting the negative half and\n` +
      `asserting the positive on its own: "isn't a label, it's a lens" → "a lens for how you approach problems".\n` +
      `Plain negations ("this isn't financial advice") are fine and are not flagged. BRAND.md §14.6.` +
      (STRICT ? "" : `\n\nWarn-only for now — run with --strict to make this blocking.`),
  );
  if (STRICT) process.exit(1);
} else {
  console.log(`Copy-tell gate passed — ${scanned} files scanned, no negation pivots (BRAND.md §14.6).`);
}
