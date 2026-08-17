/**
 * I1.3 — the provenance contract, proven. Run with Deno; wired into `npm run gate`.
 *
 * The rule this defends is the reason the vertical is defensible at all:
 * **the corpus tool returns attributed excerpts, and never synthesis.** It
 * reports what other people said; it never generalises across accounts into a
 * claim, and it never hands back a sentence this product wrote.
 *
 * A prompt instruction cannot hold that line — the model that would break it is
 * the same model that would agree it shouldn't. So the contract lives in the
 * return shape, and this file is the proof that the shape actually holds:
 *
 *   1. the account is split into the person's OWN claims, provably (offsets
 *      that still slice back to their text), and retrieval is merged so no
 *      single claim owns the result;
 *   2. an excerpt may be re-bounded to whole sentences but never rewritten —
 *      the window is a slice of the same transcript and always a superset of
 *      the chunk that matched;
 *   3. the real assembly (`buildResult`) over fixture rows produces correctly
 *      tagged, byte-identical excerpts, collapsed one-per-account;
 *   4. every way we could think of to sneak authored text past the assertion
 *      throws — invention, paraphrase, a TRIMMED quote, a TIDIED quote, a
 *      forged provenance tag, a stripped attribution;
 *   5. the returned payload is frozen, so a caller downstream cannot edit a
 *      quote after the fact.
 *
 * No credentials and no network: `buildResult`, `splitIntoClaims`,
 * `mergeClaimMatches` and `expandToSentence` are all pure, which is the whole
 * reason they were split out of `findSimilarAccounts`.
 *
 *   deno run --allow-net --allow-env --allow-read \
 *     scripts/coach-lab/corpus-provenance-check.ts
 */

import {
  type AccountClaim,
  type AnalysisRow,
  assertClaimsAreUserText,
  filterEnglishOnly,
  isFounder,
  projectForCoach,
  assertDistinctFromEngine,
  assertNoAuthoredText,
  buildResult,
  type ChunkRow,
  collapseToAccounts,
  expandToSentence,
  type FindSimilarAccountsResult,
  mergeClaimMatches,
  renderCorpusReveal,
  splitIntoClaims,
} from "../../supabase/functions/_shared/corpus.ts";
import { auditDraft, quoteFidelity } from "../../supabase/functions/_shared/output-auditor.ts";

// ─── harness ──────────────────────────────────────────────────────────────

let failures = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.error(`✗ ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

function throws(name: string, run: () => unknown, expect: string): void {
  try {
    run();
    failures++;
    console.error(`✗ ${name}\n    it was ACCEPTED`);
  } catch (e) {
    const message = (e as Error).message;
    ok(name, message.includes(expect), `wrong error: ${message}`);
  }
}

// ─── fixtures — shaped like the live corpus, verified against it 2026-08-11 ───

/**
 * Three distinct features, deliberately: the operating theatre, the boundary,
 * and not wanting to come back. Before the split, the first of those took every
 * slot in the live probe.
 */
const ACCOUNT = [
  "I was above the table looking down at myself and I could see the top of the surgeon's head.",
  "There was a line, or a border, and I understood without anyone saying it that if I crossed it I would not be going back.",
  "I did not want to come back, and I have never said that out loud.",
].join("\n");

/**
 * Transcripts are `nde_vids.subtitles_punctuated`. Chunks are fixed-length cuts
 * OUT of them, so the fixtures are built by slicing — which is exactly how the
 * live ones start and end mid-word.
 */
const TRANSCRIPT_AAA =
  "The interviewer asked him what he remembered first. " +
  "I was above the table looking down at myself and I could see the top of the surgeon's head, " +
  "and the strange part is I wasn't frightened at all. " +
  "I remember thinking that I should be frightened and I simply wasn't. " +
  "Then the machines started going and the room filled up with people.";
const TRANSCRIPT_BBB =
  "She had been talking for about an hour by then. " +
  "There was a line, or a border, and I understood without anyone saying it that if I crossed it " +
  "I would not be going back. Nobody told me. I just knew it the way you know your own name. " +
  "My sister has never believed a word of it.";

/** Mid-word at both ends — the shape the contract forbids us to tidy. */
const CHUNK_A = TRANSCRIPT_AAA.slice(64, 240);
const CHUNK_B = TRANSCRIPT_BBB.slice(30, 205);
const CHUNK_D = "I did not want to come back and I could not tell anybody that for eleven years";

const QUOTE_B = "I didn't want to come back. That is the part I still can't say out loud.";
const EVIDENCE_B =
  "The experiencer describes a marked reduction in fear of death alongside " +
  "persistent difficulty discussing the experience with family.";
const NOTES_B =
  "The experiencer describes an ongoing process of integrating the experience " +
  "into daily life over several years, with periods of withdrawal.";

function chunk(id: number, videoId: string, content: string, similarity: number): ChunkRow {
  return {
    id,
    content,
    metadata: { video_id: videoId },
    similarity,
    video_title: `Account ${videoId}`,
    video_url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

const ANALYSES = new Map<string, AnalysisRow>([[
  "BBB",
  {
    video_id: "BBB",
    transformation_score: 28,
    transformation_classification: "Significant Transformation",
    transformation_breakdown: {
      domain_analysis: {
        AD: {
          name: "Attitude Toward Death",
          score: 4,
          direction: "down",
          key_quote: QUOTE_B,
          evidence_summary: EVIDENCE_B,
        },
        RS: { name: "Relationships & Social Dynamics", score: 2, direction: "mixed" },
      },
      qualitative_profile: { integration_notes: NOTES_B },
    },
  },
]]);

const TRANSCRIPTS = new Map<string, string>([
  ["AAA", TRANSCRIPT_AAA],
  ["BBB", TRANSCRIPT_BBB],
  // DDD deliberately absent — the raw chunk must still ship.
]);

// ─── 1. the account is split into the person's own claims ─────────────────

const claims = splitIntoClaims(ACCOUNT);
assertClaimsAreUserText(claims, ACCOUNT);

ok(
  "a multi-feature account becomes several claims",
  claims.length >= 3,
  `got ${claims.length}: ${JSON.stringify(claims.map((c) => c.text.slice(0, 30)))}`,
);
ok(
  "claim 0 is the whole account — the split can never retrieve worse than before",
  claims[0].start === 0 && claims[0].end === ACCOUNT.length,
);
ok(
  "every claim slices back out of the account, so none of it can be authored",
  claims.every((c) => ACCOUNT.slice(c.start, c.end) === c.text),
);
ok(
  "the claims cover the account end to end — no sentence is dropped",
  claims[1].start === 0 &&
    claims[claims.length - 1].end === ACCOUNT.length &&
    claims.slice(1).every((c, i, all) =>
      i === 0 || !ACCOUNT.slice(all[i - 1].end, c.start).trim()
    ),
);
ok(
  "the boundary and the not-wanting-to-return are separate claims",
  claims.some((c, i) => i > 0 && c.text.includes("a border") && !c.text.includes("did not want")),
);
throws(
  "rejects a claim that is not the person's own text",
  () =>
    assertClaimsAreUserText(
      [{ index: 1, start: 0, end: 10, text: "Their account describes an OBE." } as AccountClaim],
      ACCOUNT,
    ),
  "person's own words",
);

// A single sentence stays a single claim — and gets no redundant whole-account
// duplicate, because it already is the whole account.
ok(
  "a one-sentence account is one claim, not two identical ones",
  splitIntoClaims("I saw my grandmother in the corner of the room.").length === 1,
);

// ─── 2. the merge — no single claim owns the result ───────────────────────

const PER_CLAIM: ChunkRow[][] = [
  // claim 0, the whole account: the setting match, which used to take everything
  [
    chunk(1, "AAA", CHUNK_A, 0.73),
    chunk(2, "AAA", "and then the light, but that came later on in the whole thing", 0.66),
    chunk(3, "SSS", "I was in surgery too and I floated up over the table", 0.72),
    chunk(4, "TTT", "the operating theatre, the whole team, I could see all of it", 0.71),
    // Below MIN_SIMILARITY — a topical match, not a phenomenological one.
    chunk(5, "CCC", "I have always been interested in this subject generally", 0.11),
  ],
  // claim 1, the surgery sentence
  [chunk(6, "SSS", "I was in surgery too and I floated up over the table", 0.70)],
  // claim 2, the boundary
  [chunk(7, "BBB", CHUNK_B, 0.64)],
  // claim 3, not wanting to come back
  [chunk(8, "DDD", CHUNK_D, 0.61)],
];

const picked = mergeClaimMatches(claims, PER_CLAIM, 9);
const order = picked.accounts.map((a) => a.videoId);

ok(
  "the boundary and the not-wanting-to-return reach the result at all",
  order.includes("BBB") && order.includes("DDD"),
  `order was ${JSON.stringify(order)}`,
);
ok(
  "they are not buried underneath the setting matches",
  order.indexOf("BBB") <= 2 && order.indexOf("DDD") <= 3,
  `order was ${JSON.stringify(order)} — round-robin should interleave by claim`,
);
ok(
  "an account matched by two claims appears once",
  order.filter((v) => v === "SSS").length === 1,
);
ok(
  "each account records which of the person's claims retrieved it",
  picked.accounts.every((a) => a.claimIndex >= 0 && a.claimIndex < claims.length) &&
    picked.accounts.find((a) => a.videoId === "BBB")?.claimIndex === 2,
);
ok(
  "the sub-threshold topical match is dropped",
  !order.includes("CCC"),
);
ok(
  "matched_count counts distinct accounts across every claim's window",
  picked.distinct === 5,
  `got ${picked.distinct}`,
);
ok(
  "per-claim counts are reported so a surface can name the specific thing",
  picked.claimMatches[2].distinct_accounts === 1 &&
    picked.claimMatches[2].best_similarity === 0.64,
);
ok(
  "collapsing keeps each account's BEST chunk, not its first-by-id",
  collapseToAccounts(PER_CLAIM[0])[0][1].content === CHUNK_A,
);

// ─── 3. re-bounding an excerpt, never rewriting it ────────────────────────

const widened = expandToSentence(TRANSCRIPT_AAA, CHUNK_A);

ok("a mid-word chunk widens to whole sentences", widened !== null);
ok(
  "the widened excerpt is a slice of the transcript",
  !!widened && TRANSCRIPT_AAA.includes(widened),
);
ok(
  "the widened excerpt CONTAINS the chunk — widening never drops matched words",
  !!widened && widened.includes(CHUNK_A),
);
ok(
  "it starts on a sentence, not mid-word",
  widened?.startsWith("I was above the table") === true,
  `got ${JSON.stringify(widened?.slice(0, 40))}`,
);
ok(
  "it ends on a terminator",
  /[.!?…]["'”’)\]]*$/.test(widened ?? ""),
  `got ${JSON.stringify(widened?.slice(-40))}`,
);
const BOUNDED =
  "I understood without being told that if I crossed that line there would be no coming back. " +
  "Nobody said a word to me about it.";
ok(
  "a chunk already on sentence bounds, and long enough, is left where it is",
  expandToSentence(`She paused for a while. ${BOUNDED} Then the interview moved on.`, BOUNDED) ===
    BOUNDED,
);

// The live probe served "You weren't frightened, though?" as one of nine — a
// verbatim sentence, and still the interviewer rather than a person's account.
const FRAGMENT = "You weren't frightened, though?";
const grown = expandToSentence(
  `${FRAGMENT} No, and that is the part I have never been able to explain to anybody who asks. ` +
    "It still makes no sense to me.",
  FRAGMENT,
);
ok(
  "a four-word excerpt grows until it sounds like speech, forwards first",
  !!grown && grown.length >= 120 && grown.startsWith(FRAGMENT),
  `got ${JSON.stringify(grown)}`,
);
ok(
  "a chunk that is not in the transcript widens to nothing rather than to guesswork",
  expandToSentence(TRANSCRIPT_AAA, "text that is not in this transcript at all") === null,
);
ok(
  "an un-punctuated transcript yields no window, and the raw chunk is kept",
  expandToSentence(`${"word ".repeat(300)}anchor${" word".repeat(300)}`, "anchor") === null,
);

// ─── 4. the real assembly ─────────────────────────────────────────────────

const assembled = buildResult({
  picked,
  analyses: ANALYSES,
  transcripts: TRANSCRIPTS,
  startedAtMs: Date.now(),
});

/** Everything the fixture corpus "returned", including the widened windows. */
const FROM_CORPUS = new Set<string>([
  ...assembled.accounts.map((a) => a.excerpt.text),
  QUOTE_B,
  EVIDENCE_B,
  NOTES_B,
]);

const aaa = assembled.accounts.find((a) => a.source.video_id === "AAA")!;
const ddd = assembled.accounts.find((a) => a.source.video_id === "DDD")!;
const bbb = assembled.accounts.find((a) => a.source.video_id === "BBB")!;

ok(
  "the excerpt shipped is the sentence-bounded window, marked as such",
  aaa.excerpt.text === widened && aaa.excerpt_scope === "sentences",
);
ok(
  "an account with no transcript still ships, as the raw chunk",
  ddd.excerpt.text === CHUNK_D && ddd.excerpt_scope === "chunk",
);
ok(
  "every excerpt is tagged verbatim and carries its source",
  assembled.accounts.every(
    (a) =>
      a.excerpt.provenance === "verbatim_excerpt" &&
      !!a.excerpt.source.video_id &&
      !!a.excerpt.source.video_url,
  ),
);
ok(
  "the payload carries the person's claims and which one each account matched",
  assembled.claims.length === claims.length && bbb.matched_claim === 2,
);

// I1.4 — the second move.
ok("reports per-domain direction for the matched set", bbb.transformation?.domains.length === 2);
ok(
  "an experiencer's key_quote is verbatim; an analyst's note is not",
  bbb.transformation?.domains[0].key_quote?.provenance === "verbatim_excerpt" &&
    bbb.transformation?.domains[0].evidence?.provenance === "corpus_analysis",
);
ok(
  "integration_notes are quotable and tagged as analysis, never as speech",
  bbb.transformation?.integration_notes?.text === NOTES_B &&
    bbb.transformation?.integration_notes?.provenance === "corpus_analysis",
);
ok(
  "a domain with no quote yields null rather than an empty quote",
  bbb.transformation?.domains[1].key_quote === null,
);
ok(
  "direction counts are computed, not left to the model",
  assembled.domain_directions.find((d) => d.code === "AD")?.down === 1 &&
    assembled.domain_directions.find((d) => d.code === "RS")?.mixed === 1 &&
    assembled.accounts_with_transformation === 1,
);

// ─── 5. English only, and analyst prose is founder-only ───────────────────

const PT_CHANNEL = "AFINAL, O QUE SOMOS NÓS? / AFTER ALL, WHAT ARE WE?";
const CHANNELS = new Map<string, string>([
  ["AAA", "Life After Life NDE"],
  ["BBB", "IANDS"],
  ["DDD", "Heaven Awaits"],
  ["SSS", PT_CHANNEL],
  ["TTT", " confessions emi-nde "], // whitespace and casing must not matter
  ["CCC", "Beyond The Light"],
]);

const english = filterEnglishOnly(PER_CLAIM, CHANNELS);
const keptIds = new Set(english.perClaim.flat().map((r) => r.metadata?.video_id));

ok(
  "drops the Portuguese and French channels' accounts",
  !keptIds.has("SSS") && !keptIds.has("TTT"),
  `kept ${JSON.stringify([...keptIds])}`,
);
ok("keeps every English account", keptIds.has("AAA") && keptIds.has("BBB") && keptIds.has("DDD"));
ok("counts what it dropped rather than dropping it silently", english.excluded === 2);
ok(
  "an account whose channel cannot be named is not vouched for",
  !new Set(
    filterEnglishOnly([[chunk(9, "ZZZ", "an account with no channel row", 0.8)]], CHANNELS)
      .perClaim.flat().map((r) => r.metadata?.video_id),
  ).has("ZZZ"),
);
ok(
  "a failed channel lookup degrades the filter instead of emptying the reveal",
  filterEnglishOnly(PER_CLAIM, new Map()).perClaim.flat().length === PER_CLAIM.flat().length,
);

const testerView = JSON.stringify(projectForCoach(assembled, { email: "tester@example.com" }));
const founderView = JSON.stringify(projectForCoach(assembled, { email: " TOM@MasteryTV.com " }));

ok(
  "a tester's coach is never handed Project Profound's analyst prose",
  !testerView.includes("integration_notes") && !testerView.includes(NOTES_B) &&
    !testerView.includes(EVIDENCE_B),
);
ok(
  "the founder's own view keeps it — case and whitespace tolerant",
  founderView.includes(NOTES_B),
);
ok(
  "an anonymous caller is a tester, not the founder",
  !JSON.stringify(projectForCoach(assembled)).includes(NOTES_B) && !isFounder(null) &&
    !isFounder("tom@masterytv.com.attacker.example"),
);
ok(
  "both views still carry the experiencer's own key_quote",
  testerView.includes(QUOTE_B) && founderView.includes(QUOTE_B),
);

// ─── 6. authored text cannot get through ──────────────────────────────────

/** The assertion must THROW — a violation that can be handled is not a contract. */
function rejects(name: string, mutate: (r: FindSimilarAccountsResult) => unknown): void {
  const payload = mutate(structuredClone(assembled) as FindSimilarAccountsResult);
  try {
    assertNoAuthoredText(payload as FindSimilarAccountsResult, FROM_CORPUS);
    failures++;
    console.error(`✗ ${name}\n    it was ACCEPTED — authored text can reach the user`);
  } catch (e) {
    const message = (e as Error).message;
    ok(name, message.includes("Provenance violation"), `wrong error: ${message}`);
  }
}

rejects("rejects an invented summary in place of an excerpt", (r) => {
  (r.accounts[0].excerpt as { text: string }).text =
    "Several people described leaving their bodies and feeling calm about it.";
  return r;
});

rejects("rejects a paraphrase of a real excerpt", (r) => {
  (r.accounts[0].excerpt as { text: string }).text =
    "I floated above the table and saw the surgeon, and I wasn't scared.";
  return r;
});

rejects("rejects a TRIMMED quote — a shortened quote is a different quote", (r) => {
  (r.accounts[0].excerpt as { text: string }).text = aaa.excerpt.text.slice(0, 60);
  return r;
});

rejects("rejects a TIDIED quote — re-bounding is selection, not editing", (r) => {
  // The exact failure the sentence-widening could have shipped: same words,
  // cleaned up by hand. It is not the string the transcript holds.
  (r.accounts[0].excerpt as { text: string }).text = aaa.excerpt.text.replace(/\s+/g, " ").trim() +
    " (cleaned up)";
  return r;
});

rejects("rejects an excerpt with an ellipsis stitched in", (r) => {
  const t = aaa.excerpt.text;
  (r.accounts[0].excerpt as { text: string }).text = `${t.slice(0, 40)}…${t.slice(-40)}`;
  return r;
});

rejects("rejects a forged provenance tag", (r) => {
  (r.accounts[0].excerpt as { provenance: string }).provenance = "model_summary";
  return r;
});

rejects("rejects an excerpt stripped of its attribution", (r) => {
  (r.accounts[0].excerpt as { source: unknown }).source = {
    video_id: "",
    video_title: null,
    video_url: null,
  };
  return r;
});

rejects("rejects authored prose smuggled into integration_notes", (r) => {
  const t = r.accounts.find((a) => a.source.video_id === "BBB")!.transformation!;
  (t.integration_notes as { text: string }).text =
    "Most people in this group found peace within a couple of years.";
  return r;
});

rejects("rejects an authored key_quote — the highest-value forgery", (r) => {
  const t = r.accounts.find((a) => a.source.video_id === "BBB")!.transformation!;
  (t.domains[0].key_quote as { text: string }).text = "I finally understood why it happened to me.";
  return r;
});

throws(
  "refuses to retrieve for a claim the person did not make",
  () => mergeClaimMatches(claims, [...PER_CLAIM, []], 9),
  "every claim is retrieved for",
);

// ─── 7. the payload cannot be edited after the fact ───────────────────────

const before = assembled.accounts[0].excerpt.text;
let frozen = false;
try {
  (assembled.accounts[0].excerpt as { text: string }).text = "rewritten downstream";
} catch {
  frozen = true;
}
ok(
  "the returned payload is frozen against downstream rewriting",
  frozen && assembled.accounts[0].excerpt.text === before,
);

// ─── 8. the corpus key is never the engine's ──────────────────────────────

Deno.env.set("SUPABASE_URL", "https://lwmadssysqcwbsoiaokc.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "engine-service-key");

function refuses(name: string, url: string, key: string): void {
  try {
    assertDistinctFromEngine(url, key);
    failures++;
    console.error(`✗ ${name}\n    it was ACCEPTED`);
  } catch {
    console.log(`✓ ${name}`);
  }
}

// ─── 6. the deterministic rendering (I6.2) ────────────────────────────────
//
// The done criterion is one sentence: *the renderer cannot display
// model-authored text.* So these cases are mostly attempts to make it.
//
// It exists because the model could not be made to render this turn faithfully.
// Told character for character in two places, it bridges two parts of one
// transcript with an ellipsis; `quoteFidelity` blocks the draft, the
// regeneration splices too, and on 3 of 3 battery runs and live on 2026-08-12
// the person got the fixed line on the exact turn they asked whether anybody
// else had been through this.

console.log("\n─── the deterministic reveal (I6.2) ───\n");

const projected = projectForCoach(assembled, { email: "tom@masterytv.com" });
const reveal = renderCorpusReveal(projected)!;

const shown = assembled.accounts.slice(0, 3);
const attributionLines = reveal.split("\n").filter((l) => l.startsWith("["));

ok("a real payload renders", typeof reveal === "string" && reveal.length > 0);
ok(
  "every excerpt reaches the person, byte-identical",
  shown.every((a) => reveal.includes(a.excerpt.text)),
);
ok(
  "each one carries its link",
  shown.every((a) => reveal.includes(a.excerpt.source.video_url!)),
);
ok(
  "the count is the payload's, never a recount",
  reveal.includes(`${assembled.matched_count} accounts`),
  reveal.split("\n")[0],
);
ok("the no-proof line is there (I6.4)", reveal.includes("not making it up"));
// The excerpts are somebody else's speech and may contain anything, and a
// YouTube link carries `?v=`. What must ask nothing is the copy this file
// wrote, so that is what is measured: the reveal minus the quotes and links.
const ourWords = reveal.replace(/"[\s\S]*?"/g, "").replace(/\[[^\]]*\]\([^)]*\)/g, "");
ok("it asks nothing — this is the turn not to", !ourWords.includes("?"), ourWords);
ok(
  "attribution is a link to the RECORDING — never 'X said', since these transcripts carry no speaker labels",
  attributionLines.length === shown.length &&
    attributionLines.every((l) => /^\[the recording\]\(https:\/\/\S+( '.*')?\)$/.test(l)),
  attributionLines.join(" | "),
);
// Founder call, 2026-08-12, made after reading a real one. These are YouTube
// headlines — "Woman DIES! What happens next is the MOST PROFOUND Near Death
// Experience EVER!" — and they were landing directly under somebody's account
// of the worst hour of their life. The title is not hidden: it rides the hover,
// and the link still goes exactly where it says it does.
ok(
  "the source's own title rides the HOVER rather than the label",
  shown.every((a) => reveal.includes(`'${a.source.video_title}')`)),
  attributionLines.join(" | "),
);

// …and the half that matters. Every one of these is a way authored text could
// reach the person if the tag were treated as decoration.
const poison = (over: Record<string, unknown>) =>
  renderCorpusReveal({
    matched_count: 9,
    accounts: [
      {
        excerpt: {
          text: "a sentence this product wrote",
          provenance: "verbatim_excerpt",
          source: { video_id: "X", video_title: "T", video_url: "https://www.youtube.com/watch?v=X" },
          ...over,
        },
      },
    ],
  });

ok(
  "an excerpt tagged as ANALYSIS is not quotable — analyst prose is nobody's speech",
  poison({ provenance: "corpus_analysis" }) === null,
);
ok(
  "an UNTAGGED excerpt renders nothing, which is what model-authored text looks like",
  poison({ provenance: undefined }) === null,
);
ok(
  "a forged tag renders nothing",
  poison({ provenance: "verbatim" }) === null,
);
ok(
  "an empty payload renders nothing, so the caller keeps the fixed line",
  renderCorpusReveal({ matched_count: 40, accounts: [] }) === null &&
    renderCorpusReveal(null) === null && renderCorpusReveal("nonsense") === null,
);
ok(
  "a javascript: URL is never linked",
  !renderCorpusReveal({
    matched_count: 2,
    accounts: [{
      excerpt: {
        text: "the corpus text is still shown, only the address is dropped",
        provenance: "verbatim_excerpt",
        source: { video_id: "X", video_title: "T", video_url: "javascript:alert(1)" },
      },
    }],
  })!.includes("javascript:"),
);
// 17.6% of this corpus's titles carry an apostrophe, and two of the three links
// in the first live reveal did ("Yvonne's Story"), so the hover has to survive
// one. A square bracket is the case that cannot: it is what stops the client's
// greedy title body from swallowing the gap between two links.
ok(
  "a title carrying its own apostrophe KEEPS the hover",
  renderCorpusReveal({
    matched_count: 2,
    accounts: [{
      excerpt: {
        text: "an excerpt long enough to be quoted back to somebody",
        provenance: "verbatim_excerpt",
        source: {
          video_id: "X",
          video_title: "Allergy Shot - Near Death Experience - Yvonne's Story",
          video_url: "https://www.youtube.com/watch?v=X",
        },
      },
    }],
  })!.includes("'Allergy Shot - Near Death Experience - Yvonne's Story')"),
);
ok(
  "a title carrying a SQUARE BRACKET drops the HOVER rather than breaking the link",
  renderCorpusReveal({
    matched_count: 2,
    accounts: [{
      excerpt: {
        text: "an excerpt long enough to be quoted back to somebody",
        provenance: "verbatim_excerpt",
        source: {
          video_id: "X",
          video_title: "NDE [Full Interview]",
          video_url: "https://www.youtube.com/watch?v=X",
        },
      },
    }],
  })!.includes("[the recording](https://www.youtube.com/watch?v=X)"),
);
ok(
  "never more than three accounts, whatever the payload says",
  (renderCorpusReveal({
    matched_count: 99,
    accounts: Array.from({ length: 9 }, (_, i) => ({
      excerpt: {
        text: `excerpt number ${i}, long enough to be quoted back to somebody`,
        provenance: "verbatim_excerpt",
        source: { video_id: `V${i}`, video_title: `T${i}`, video_url: `https://youtu.be/V${i}` },
      },
    })),
  })!.match(/https:\/\//g) ?? []).length === 3,
);

// 🔑 THE ONE THAT KEEPS IT SENDABLE. This text goes out unreviewed, so it must
// pass the same auditor the model's drafts face — a fallback that fails the
// audit is a defect with a longer fuse. Audited here rather than at runtime on
// purpose: it is deterministic, so proving it once is worth more than a check
// that could false-block the last line of defence.
const auditCtx = {
  userText: "I came out of my body during surgery and I have not told anybody.",
  corpusExcerpts: assembled.accounts.map((a) => a.excerpt.text),
  corpusAttribution: assembled.accounts.flatMap((a) =>
    [a.source.video_title, a.source.video_url].filter(Boolean) as string[]
  ),
};
const audited = auditDraft(reveal, auditCtx);
ok(
  "the rendered reveal passes the output auditor it is a fallback for",
  audited.verdict === "pass",
  `blocked by [${audited.violations.filter((v) => v.action === "block").map((v) => v.moveClass).join(",")}] ` +
    `new=[${audited.newProperNouns.join(",")}] index=${audited.mirroringIndex}`,
);
ok(
  "…and its quotations are, by construction, faithful",
  quoteFidelity(reveal, auditCtx.corpusExcerpts).unfaithful.length === 0,
);

refuses(
  "refuses the engine's own service key",
  "https://vnycavclrndjwmpaugju.supabase.co",
  "engine-service-key",
);
refuses(
  "refuses a PROFOUND_URL pointing at the engine project",
  "https://lwmadssysqcwbsoiaokc.supabase.co",
  "corpus-service-key",
);
try {
  assertDistinctFromEngine("https://vnycavclrndjwmpaugju.supabase.co", "corpus-service-key");
  console.log("✓ accepts genuinely separate corpus credentials");
} catch (e) {
  failures++;
  console.error(`✗ accepts genuinely separate corpus credentials\n    ${(e as Error).message}`);
}

// ─── verdict ──────────────────────────────────────────────────────────────

if (failures > 0) {
  console.error(`\ncorpus provenance gate FAILED — ${failures} case(s). No synthesis, ever (I1.3).`);
  Deno.exit(1);
}
console.log("\ncorpus provenance gate passed — excerpts only, attributed, frozen, and unforgeable.");
