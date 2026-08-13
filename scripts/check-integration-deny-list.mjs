/**
 * check:deny-list — the `integration` vertical may not use clinical vocabulary.
 *
 * WHY: INTEGRATION_SPRINT.md §2 / I11.1, from INTEGRATION_DISCOVERY.md §5.1
 * control #1. One landing-page headline can trigger four regulatory regimes
 * before a single user signs up:
 *   - Illinois WOPR Act §20(a) — "therapy or psychotherapy services" must be
 *     conducted by a licensed INDIVIDUAL. §10 defines those services by their
 *     PURPOSE: to "improve an individual's mental health". That construction is
 *     the statutory definition itself, so it is banned in every word order.
 *   - California AB 489 — using a licensed title ("therapist", "counselor",
 *     "psychologist", "psychiatrist") is a violation PER TERM, per use.
 *   - Rhode Island (June 2026) — a category ban on AI for emotional support.
 *   - FTC / state UDAP — "treat", "diagnose", "patient", "clinical" are
 *     healthcare claims, and a healthcare claim needs healthcare substantiation.
 *
 * The controls doc calls this "a regex, it costs an afternoon, and it is the
 * single highest-leverage control here." This is that regex.
 *
 * ─── SCOPE: the `integration` vertical only ───────────────────────────────
 *
 * These words are legitimate — often legally REQUIRED — in the verticals that
 * already shipped. Relatti's disclaimer says "not therapy"; crisis-detection
 * matches the word "therapist" to route someone to one; the relationship pack
 * cites EFT's clinical literature. A repo-wide ban would need an allow-list of
 * ~300 lines across 71 files, which is a gate nobody reads.
 *
 * So the gate scopes to integration-owned text, two ways:
 *
 *   1. PATH SCOPE — any file whose path carries the slug as a segment or a
 *      basename prefix (`.../integration/...`, `integration-pack.ts`,
 *      `IntegrationTerms.tsx` is NOT matched — casing is the slug's, lowercase).
 *      The whole file is scanned.
 *
 *   2. BLOCK SCOPE — everywhere else, only lines inside a brace/bracket block
 *      opened by a line carrying the slug in one of its two code forms:
 *      a bare quoted literal `"integration"` or an object key `integration:`.
 *      This is what reaches per-program copy living in shared files —
 *      `BRANDS.integration`, `byBrand({ integration: "…" })`, `PACKS`
 *      entries, `brand-metadata.ts`, the Resend email chrome.
 *
 *      Deliberately NOT a bare `\bintegration\b`: the word already appears in
 *      this repo as ordinary English ("Shadow & integration work", "Integration
 *      Instructions", the arc-phase value) and would open scope on unrelated
 *      code.
 *
 * Brace counting is a heuristic — it does not parse strings or comments. It
 * fails toward OVER-scoping, which only ever means more strictness, and the
 * pragma below is the release valve.
 *
 * ─── THE PRAGMA ──────────────────────────────────────────────────────────
 *
 * Some of these words are mandatory in this vertical, not merely tolerated.
 * I5.5's consent screen must say the product is "not therapy, counseling or
 * medical care". I9.3's triage page must list the signs that mean "see a
 * clinician this week". Refusing those would be worse than the violation.
 *
 * So: put `deny-list-ok: <reason>` on the line or the line above it. The
 * reason is required and must be a real sentence fragment — the point is that
 * every exception is a decision somebody wrote down, reviewable with one grep.
 *
 * Run: node scripts/check-integration-deny-list.mjs [--warn] [--self-test]
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "supabase/functions"];
const SELF = "scripts/check-integration-deny-list.mjs"; // holds every term as a sample
const TEXT_EXT = /\.(tsx?|m?js|cjs)$/i;
const WARN_ONLY = process.argv.includes("--warn");

/**
 * Extra tokens that also mean "this text belongs to the integration vertical".
 *
 * 🔥 Verified empirically for I11.1 (August 11, 2026): the two scopes below
 * catch marketing copy, system prompts, email templates and metadata — and MISS
 * the one file that matters most. §2 locks `integration` as an INTERNAL slug and
 * clears the public wordmark separately, so the vertical's landing pages will
 * live under a directory named for the brand and will contain no "integration"
 * literal anywhere. A planted `We treat the aftermath` in
 * `src/app/<brandname>/page.tsx` passed the build; the identical line under
 * `src/app/integration/` failed it.
 *
 * **Add the brand slug here the moment the name is chosen** — before any copy
 * is written, not after. §6.1 carries the checklist item.
 *
 * ✅ FILLED August 13, 2026: the public name is HEARD (youheard.org), brand id
 * `heard`. The internal slug stays `integration`.
 *
 * ⚠️ Naming discipline this buys, and it has a sharp edge: the path scope
 * matches a whole SEGMENT (`heard/`, `heard.tsx`, `heard-door.tsx`), so a
 * PascalCase `HeardLanding.tsx` sitting in a shared folder is NOT scanned.
 * Put HEARD's own files under a `heard/` directory. `_content/heard/` is the
 * first one.
 */
const ALSO_OWNED = ["heard"];

/** Every token that opens scope. Ordinary English "integration" is not one of them. */
function ownedPatterns(tokens) {
  const alt = tokens.join("|");
  return {
    /** The two code forms: a bare quoted literal, or an object key. */
    code: new RegExp(`(["'\`](?:${alt})["'\`]|\\b(?:${alt})\\s*:)`),
    /** A directory segment, or a `<token>-` / `<token>.` basename. */
    path: new RegExp(`(^|/)(?:${alt})([/.-]|$)`),
  };
}

const { code: SLUG_IN_CODE, path: SLUG_IN_PATH } = ownedPatterns(["integration", ...ALSO_OWNED]);

/** `deny-list-ok: <reason>` — reason required, ≥ 4 chars, so the escape hatch stays a decision. */
const PRAGMA = /deny-list-ok:\s*\S.{3,}/;

// ─── the banned vocabulary ────────────────────────────────────────────────
// Each entry names the regime it exists for, because a bare word list rots:
// the next person needs to know whether a term is negotiable.
const BANNED = [
  {
    re: /\b(psycho)?therap(y|ies|ist|ists|eutic|eutics)\b/i,
    label: "therapy / therapist",
    why: "IL WOPR §20(a) licensure; CA AB 489 title (per-use violation)",
  },
  {
    re: /\bcounsel(l)?(or|ors|ing|ling)\b/i,
    label: "counselor / counseling",
    why: "IL WOPR §20(a) licensure; CA AB 489 title",
  },
  {
    re: /\b(psychologist|psychiatrist)s?\b/i,
    label: "psychologist / psychiatrist",
    why: "CA AB 489 prohibited title (per-use violation)",
  },
  {
    // "treat this as authoritative" is ordinary engineering English and will be
    // all over the pack's prompt text. The medical sense is what is banned, so
    // the idiomatic `treat X as/like Y` frame is carved out rather than
    // pragma'd fifty times — a gate that must be silenced to work is not a gate.
    re: /\btreat(s|ed|ing|ment|ments)?\b(?![^.?!]{0,40}\b(as|like)\b)/i,
    label: "treat / treatment",
    why: "healthcare claim — needs healthcare substantiation (FTC / state UDAP)",
  },
  {
    re: /\bdiagnos\w*/i,
    label: "diagnose / diagnosis",
    why: "healthcare claim; implies licensed scope of practice",
  },
  { re: /\bpatients?\b/i, label: "patient", why: "implies a clinical care relationship" },
  {
    re: /\bclinical(ly)?\b|\bclinicians?\b/i,
    label: "clinical / clinician",
    why: "implies licensed care; permitted only in a referral, with a pragma",
  },
  {
    // "heal(ing) AS A SERVICE CLAIM" — §2's own wording. A bare mention is not
    // the target ("never promise healing" must stay sayable in a prompt); the
    // banned shape is the product offering to do it.
    re: /\b(we|our|us|this|it|the (coach|app|program|product|site))\b[^.?!]{0,40}\bheal(s|ing|ed)?\b/i,
    label: "healing as a service claim",
    why: "implies treatment of a condition",
  },
  {
    re: /\bheal(s|ing)?\s+(you|your|them|their)\b/i,
    label: "healing as a service claim",
    why: "implies treatment of a condition",
  },
  {
    re: /\bmental[-\s]?health\s+(support|services?|care|treatment)\b/i,
    label: '"mental health support"',
    why: "RI category ban on AI for emotional support; IL WOPR scope",
  },
  { re: /\bemotional\s+support\b/i, label: '"emotional support"', why: "RI category ban" },
  {
    // THE Illinois statutory definition, in any word order. WOPR §10 defines
    // the regulated service by this purpose, so the construction itself is the
    // trigger — not the adjective, not the noun, the pairing.
    re: /\b(improv\w*|better\w*|boost\w*|enhanc\w*|strengthen\w*|restor\w*|fix\w*|optimiz\w*|support\w*)\b[^.?!]{0,30}\bmental[-\s]?health\b/i,
    label: '"improve your mental health" (IL statutory definition)',
    why: "IL WOPR §10 defines the licensed service BY THIS PURPOSE — no compliance path for an AI",
  },
  {
    re: /\bmental[-\s]?health\b[^.?!]{0,30}\b(improv\w*|boost\w*|enhanc\w*|restor\w*|optimiz\w*)\b/i,
    label: '"mental health improvement" (IL statutory definition, reversed)',
    why: "IL WOPR §10 — word order is not a defense",
  },
];

// ─── self-test ────────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) {
  const mustCatch = [
    "Talk to a therapist who understands.",
    "This is psychotherapy for experiencers.",
    "Our counselors are here for you.",
    "counselling that meets you where you are",
    "Speak with a psychologist about it.",
    "We treat the aftermath of anomalous experience.",
    "A course of treatment lasting six weeks.",
    "We can diagnose what is happening to you.",
    "a diagnosis you can finally trust",
    "Over 400 patients have come through this door.",
    "clinically validated for spiritual emergency",
    "Our clinicians review every conversation.",
    // heal as a service claim
    "We help you heal from what happened.",
    "This program will heal the part of you that broke.",
    "It heals your relationship to the experience.",
    // the category bans
    "24/7 mental health support, on your schedule.",
    "AI emotional support for people nobody believes.",
    // the Illinois definition, every way we could think to write it
    "improve your mental health",
    "Improving mental health, one conversation at a time.",
    "built to better your mental health",
    "a product that supports your mental health",
    "boost mental health in eight weeks",
    "mental health improvement, without the waitlist",
    "designed to enhance the mental health of experiencers",
  ];
  const mustSpare = [
    // The pack and its prompts must be able to say these.
    "Treat the account as authoritative — the user is the only witness.",
    "treat every coined proper noun as a quoted string",
    "This is treated like a report, never like ground truth.",
    "Never promise healing, and never imply an endpoint.",
    "The corpus is for company, never for proof.",
    "You are not qualified to say what it was.",
    // Ordinary code.
    "const isIntegration = program === 'integration';",
  ];
  const caught = (s) => BANNED.some((b) => b.re.test(s));
  const missed = mustCatch.filter((s) => !caught(s));
  const overcaught = mustSpare.filter((s) => caught(s));

  // Scope must be provable too — a term is only a violation where it applies.
  const scopeFixture = [
    'export const BRANDS = {',
    '  relatti: { blurb: "Not therapy. A coach for the two of you." },',
    '  integration: {',
    '    blurb: "We treat the aftermath.",',
    '  },',
    '};',
  ];
  const flags = scopedLines(scopeFixture);
  const scopeOk = !flags[1] && flags[2] && flags[3];

  const pragmaOk =
    PRAGMA.test("// deny-list-ok: I9.3 triage page must name the referral") &&
    !PRAGMA.test("// deny-list-ok:") &&
    !PRAGMA.test("// deny-list-ok: x");

  // The extension point must work before anyone's launch depends on it: the
  // public brand name is not the slug, and its landing pages are the highest-risk
  // copy in the vertical (I11.1, verified by planting a violation in both).
  const extended = ownedPatterns(["integration", "aftermath"]);
  const extensionOk =
    extended.path.test("src/app/aftermath/page.tsx") &&
    extended.code.test('BRANDS = { aftermath: { blurb: "…" } }') &&
    !extended.path.test("src/app/thecompany/page.tsx") &&
    !SLUG_IN_PATH.test("src/app/aftermath/page.tsx");

  const problems = [];
  if (missed.length) problems.push(`NOT caught: ${missed.join(" · ")}`);
  if (overcaught.length) problems.push(`false positives: ${overcaught.join(" · ")}`);
  if (!scopeOk) problems.push(`block scope wrong: ${JSON.stringify(flags)}`);
  if (!pragmaOk) problems.push("pragma requires a reason, and it does not");
  if (!extensionOk) problems.push("ALSO_OWNED does not extend scope — the brand's pages would go unscanned");
  if (problems.length) {
    for (const p of problems) console.error(`✗ self-test: ${p}`);
    process.exit(1);
  }
  console.log(
    `Deny-list self-test passed — ${mustCatch.length} banned constructions caught, ` +
      `${mustSpare.length} legitimate lines spared, block scope, pragma and brand-scope extension verified.`,
  );
  process.exit(0);
}

// ─── scope resolution ─────────────────────────────────────────────────────

/**
 * Which lines of a shared file are integration-scoped.
 *
 * A line carrying the slug in code form opens scope; scope closes when the
 * brace/bracket depth returns to where it was before that line. The line that
 * opens and the line that closes are both in scope.
 */
function scopedLines(lines) {
  const flags = new Array(lines.length).fill(false);
  const openedAt = []; // depths at which an integration block opened
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mentions = SLUG_IN_CODE.test(line);
    flags[i] = openedAt.length > 0 || mentions;

    const opens = (line.match(/[{[(]/g) ?? []).length;
    const closes = (line.match(/[}\])]/g) ?? []).length;
    const next = depth + opens - closes;
    if (mentions && next > depth) openedAt.push(depth);
    depth = next;
    while (openedAt.length && depth <= openedAt[openedAt.length - 1]) openedAt.pop();
  }
  return flags;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    yield* statSync(p).isDirectory() ? walk(p) : [p];
  }
}

// ─── the scan ─────────────────────────────────────────────────────────────

const violations = [];
let filesScanned = 0;
let linesInScope = 0;
let pragmaExemptions = 0;

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = relative(".", file).replaceAll("\\", "/");
    if (rel === SELF || !TEXT_EXT.test(rel)) continue;

    const lines = readFileSync(file, "utf8").split("\n");
    const wholeFile = SLUG_IN_PATH.test(rel);
    const flags = wholeFile ? lines.map(() => true) : scopedLines(lines);
    if (!flags.some(Boolean)) continue;

    filesScanned++;
    lines.forEach((line, i) => {
      if (!flags[i]) return;
      linesInScope++;
      // Every matching term, not the first: one line routinely carries two
      // ("our clinicians treat the aftermath"), and reporting one at a time
      // turns a single fix into three round-trips through the gate.
      const hits = BANNED.filter((b) => b.re.test(line));
      if (!hits.length) return;
      if (PRAGMA.test(line) || (i > 0 && PRAGMA.test(lines[i - 1]))) {
        pragmaExemptions++;
        return;
      }
      const detail = hits.map((h) => `      ${h.label} — ${h.why}`).join("\n");
      violations.push(`${rel}:${i + 1}\n${detail}\n      ${line.trim().slice(0, 160)}`);
    });
  }
}

const scopeNote =
  `${filesScanned} file${filesScanned === 1 ? "" : "s"} with integration-scoped text ` +
  `(${linesInScope} line${linesInScope === 1 ? "" : "s"}` +
  `${pragmaExemptions ? `, ${pragmaExemptions} pragma exemption${pragmaExemptions === 1 ? "" : "s"}` : ""})`;

if (violations.length) {
  const say = WARN_ONLY ? console.warn : console.error;
  say(`${WARN_ONLY ? "⚠" : "✗"} Clinical vocabulary in integration copy (${violations.length}):\n`);
  for (const v of violations) say(`  ${v}\n`);
  say(
    `These words are what the regulators read, and several are per-use violations.\n` +
      `Rewrite in the vertical's own vocabulary — the product witnesses, places and maps;\n` +
      `it does not assess, treat or care for anyone. INTEGRATION_SPRINT.md §2 / I11.1.\n\n` +
      `If the word is genuinely required (the consent screen must say "not therapy";\n` +
      `the triage page must say "see a clinician this week"), annotate the line:\n` +
      `    // deny-list-ok: I9.3 triage page names the referral endpoint\n` +
      (WARN_ONLY ? `\nWarn-only — drop --warn to make this blocking.` : ""),
  );
  if (!WARN_ONLY) process.exit(1);
} else {
  console.log(`Integration deny-list gate passed — ${scopeNote}, no clinical vocabulary.`);
}
