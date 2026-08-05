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

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "supabase/functions"];
const SELF = "scripts/check-copy-tells.mjs"; // contains the patterns as samples
const TEXT_EXT = /\.(tsx?|m?js|cjs)$/i;
const STRICT = process.argv.includes("--strict") || process.env.COPY_TELLS_STRICT === "1";

// Apostrophes: source copy uses the CURLY ’ (U+2019) as often as the straight
// one — the live Relatti H1 was "aren’t"/"They’re" — so every contraction here
// matches both. A straight-quote-only pattern silently misses half the corpus.
const AP = "['’]";
const NEG = `(?:(?:is|are|was|were)\\s+not|is${AP}?n${AP}?t|isn${AP}t|aren${AP}t|wasn${AP}t|weren${AP}t)`;
// The restatement half: a subject pronoun + copula. Requiring this is what
// keeps ordinary negations ("this isn't financial advice") out of the results.
// `that`/`this` are deliberately NOT in the list. They usually refer back to a
// whole preceding clause as commentary rather than restating the negated
// subject, which produced the one real false positive this pattern had:
// "…and aren't easily swayed. That's a leadership asset." is an evaluation,
// not a pivot. `we`/`you` stay — "We aren't a vendor. We're a partner." is the
// genuine article.
const RESTATE = `(?:it|they|we|you|he|she)(?:${AP}s|${AP}re| is| are| was| were)`;

const TELLS = [
  {
    re: new RegExp(
      `\\bnot (?:just|only|merely|simply)\\b[^.?!]{0,80}[,;.]\\s*${RESTATE}\\b`,
      "i",
    ),
    label: '"not just X, it\'s Y" pivot',
  },
  {
    // Was `isn't|is not` + a REQUIRED article, straight apostrophe only, which
    // missed the whole aren't/wasn't/weren't family and any predicate without
    // an article. That is how "The best relationships aren’t lucky. They’re
    // understood." — the live Relatti H1 — sat on the homepage uncaught.
    // Separator class includes the em/en dash on purpose: the pivot's most
    // common live form pairs BOTH tells ("isn't a label — it's a lens").
    re: new RegExp(`\\b${NEG}\\b[^.?!]{0,60}[.,;:—–]\\s*${RESTATE}\\b`, "i"),
    label: '"isn\'t/aren\'t X. It\'s/They\'re Y" pivot',
  },
  {
    re: new RegExp(
      `\\b(?:is|are|was|were)\\s+not\\s+(?:a|an|the)\\b[^.?!]{0,50},\\s*(?:but|it${AP}s)\\b`,
      "i",
    ),
    label: '"is not a X, but Y" pivot',
  },
  {
    re: /\bNot (?:a|an|the) \w+[.!]\s+(?:A|An|The) \w+/,
    label: '"Not a X. A Y." pivot',
  },
  {
    // Repeated negation as a definition ("Not couples therapy. Not a
    // journaling app.") — the article-free sibling of the pattern above, still
    // live on /samefight.
    re: /\bNot\s+\w[^.?!]{0,40}[.!]\s+Not\s+\w/,
    label: '"Not X. Not Y." repeated negation',
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
    // The 2026-08-05 blind spot: the aren't/wasn't family, CURLY apostrophes,
    // and a predicate with no article. All three appeared at once in the live
    // Relatti H1, which is why it survived the first version of this gate.
    "The best relationships aren’t lucky. They’re understood.",
    "The best relationships aren't lucky. They're understood.",
    "These aren't features. They're commitments.",
    "It wasn’t a bug. It was a design choice.",
    "Not couples therapy. Not a journaling app.",
    "We aren't a vendor. We're a partner.",
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
    // Loosening the pattern (no article, more copulas) must not start eating
    // plain negations that happen to be followed by a sentence about the
    // same subject.
    "We aren’t able to process that right now. Please try again.",
    "Your answers aren’t shared with your partner. Ever.",
    "These aren't required. Skip any question you want.",
    // Real line from first-message.ts that the loosened pattern wrongly caught:
    // "That's" evaluates the whole preceding clause, it does not restate the
    // negated subject.
    "You have strong convictions and aren't easily swayed. That's a leadership asset.",
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
/** The contents of every quoted string on a line, joined — the copy without the code. */
function quoted(line) {
  return (line.match(/"[^"]*"|`[^`]*`/g) || []).map((s) => s.slice(1, -1)).join(" ");
}

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
  // Skip roots that aren't present rather than crashing: the gate should still
  // run in a partial checkout or when pointed at a subtree.
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = relative(".", file).replaceAll("\\", "/");
    if (rel === SELF) continue;
    if (!TEXT_EXT.test(rel)) continue;
    scanned++;
    const lines = readFileSync(file, "utf8").split("\n");
    // Each line is checked alone, and ONLY if neither it nor the next line
    // matches alone is the joined pair checked. A pivot is routinely split
    // across two adjacent fields — the live Relatti H1 was
    // `headlineTop: "…aren’t lucky."` / `headlineAccent: "They’re understood."`
    // on consecutive lines — so a strictly per-line scan cannot see the shape
    // at all, no matter how good the pattern is. The window is 2, not N: the
    // gap classes forbid sentence punctuation, so a wider join would start
    // stitching unrelated statements into false positives. The
    // neither-matches-alone guard is what stops one pivot being reported twice
    // (once on its own line, once via the preceding line's pair).
    lines.forEach((line, i) => {
      const single = TELLS.find((t) => t.re.test(line));
      if (single) {
        violations.push(`${rel}:${i + 1} — ${single.label}\n    ${line.trim().slice(0, 160)}`);
        return;
      }
      const next = lines[i + 1];
      if (next === undefined || TELLS.some((t) => t.re.test(next))) return;
      // Two joins, because the halves can be separated by either whitespace
      // (wrapped JSX text) or code (`", headlineAccent: "`). The literal join
      // strips the syntax between adjacent string fields so the copy reads as
      // one sentence, which is how a visitor reads it on the page.
      const raw = `${line.trim()} ${next.trim()}`;
      const literal = `${quoted(line)} ${quoted(next)}`.trim();
      const joined = [raw, literal].find((c) => TELLS.some((t) => t.re.test(c)));
      const pairHit = joined && TELLS.find((t) => t.re.test(joined));
      if (pairHit) {
        violations.push(
          `${rel}:${i + 1} — ${pairHit.label}, split across lines ${i + 1}-${i + 2}\n    ${joined.slice(0, 160)}`,
        );
      }
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
