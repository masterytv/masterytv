/**
 * The live corpus probe — I1.2 verification, and the founder's bench for I1.5.
 *
 * NOT in `npm run gate`: it needs the Project Profound service key and hits
 * OpenAI. Run it by hand.
 *
 *   npm run corpus:probe -- path/to/account.txt
 *   npm run corpus:probe                         # uses the built-in sample account
 *
 * It answers three questions, in the order they can kill the sprint:
 *
 *  1. **Are we even in the corpus's vector space?** `nde_chatbot_chunks.embedding`
 *     is `vector(1536)`, which is also `text-embedding-ada-002`'s width — so a
 *     dimension check proves nothing. If the corpus was embedded with a
 *     different model, every similarity number is noise that looks like signal,
 *     the matches read as generic, and I1.5's testers say "this isn't me" for a
 *     reason that has nothing to do with the product thesis. The probe settles
 *     it: it embeds a chunk's OWN text and requires that chunk to come back as
 *     its own nearest neighbour at near-1.0 similarity.
 *  2. **Is it fast enough?** I1.2 says 5–10 excerpts in under 3s.
 *  3. **What does a real account actually get back?** Prints the excerpts, the
 *     similarity spread and the per-domain directions, so the founder can read
 *     what a tester would be shown before showing it to one.
 *
 * Credentials come from `.env.local` (OPENAI_API_KEY) and
 * `supabase/functions/.env` (PROFOUND_URL, PROFOUND_SERVICE_KEY). Both are
 * gitignored. Nothing is written anywhere.
 */

import {
  corpusClient,
  embedForCorpus,
  findSimilarAccounts,
} from "../../supabase/functions/_shared/corpus.ts";

const SELF_MATCH_THRESHOLD = 0.95;
const LATENCY_BUDGET_MS = 3000;

/**
 * A synthetic account, written for this probe. It is a plausible composite of
 * the phenomenological features the corpus indexes, and it exists ONLY so the
 * pipe can be exercised without handling anyone's real account. It is not a
 * substitute for I1.5 — that gate needs real experiencers and real reactions,
 * and no amount of green output here answers it.
 */
const SAMPLE_ACCOUNT = `
I was in surgery and I came out of my body. I was up near the ceiling looking
down and I could see everything, the tops of their heads, the instruments. I
wasn't frightened, which I still find strange. Then there was a boundary, not a
wall exactly, more like a line I understood I mustn't cross, and I knew without
being told that if I crossed it I wasn't going back. Everything I needed to know
arrived at once, not in words. And when I woke up I didn't want to be here. I
still don't say that out loud, because of how it sounds. My wife thinks I came
back different and she isn't wrong.
`.trim();

function section(title: string): void {
  console.log(`\n─── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
}

let failures = 0;
function check(name: string, pass: boolean, detail: string): void {
  console.log(`${pass ? "✓" : "✗"} ${name} — ${detail}`);
  if (!pass) failures++;
}

// ─── 1. embedding-space alignment ─────────────────────────────────────────

section("1. Embedding space");

const supabase = corpusClient();
const { data: sample, error: sampleError } = await supabase
  .from("nde_chatbot_chunks")
  .select("id,content,metadata")
  .gte("id", 1329909)
  .limit(1)
  .single();

if (sampleError || !sample) {
  console.error(`✗ could not read a chunk from the corpus: ${sampleError?.message}`);
  console.error("  Check PROFOUND_URL / PROFOUND_SERVICE_KEY in supabase/functions/.env.");
  Deno.exit(1);
}

const selfVector = await embedForCorpus(sample.content as string);
const { data: selfHits, error: selfError } = await supabase
  .rpc("nde_chatbot_match", { query_embedding: selfVector, match_count: 1, filter: {} })
  .select("id,similarity");

if (selfError) {
  console.error(`✗ nde_chatbot_match failed: ${selfError.message}`);
  Deno.exit(1);
}

const top = ((selfHits ?? []) as unknown as { id: number; similarity: number }[])[0];
check(
  "a chunk is its own nearest neighbour",
  top?.id === sample.id,
  top?.id === sample.id ? `chunk ${sample.id} matched itself` : `expected ${sample.id}, got ${top?.id}`,
);
check(
  "self-similarity is ~1.0 (same embedding model as the corpus)",
  (top?.similarity ?? 0) >= SELF_MATCH_THRESHOLD,
  `${(top?.similarity ?? 0).toFixed(4)} — below ${SELF_MATCH_THRESHOLD} means the corpus was ` +
    "embedded with a DIFFERENT model and CORPUS_EMBEDDING_MODEL in corpus.ts is wrong",
);

if (failures) {
  console.error("\nStop here. Every number below would be meaningless.");
  Deno.exit(1);
}

// ─── 2 + 3. a real retrieval ──────────────────────────────────────────────

const path = Deno.args[0];
const account = path ? (await Deno.readTextFile(path)).trim() : SAMPLE_ACCOUNT;

section("2. Retrieval");
console.log(`account: ${path ?? "built-in sample"} (${account.length} chars)\n`);

const started = performance.now();
const result = await findSimilarAccounts(account, { limit: 9, withTransformation: true });
const wall = Math.round(performance.now() - started);

check(
  `returns 5–10 accounts`,
  result.accounts.length >= 5 && result.accounts.length <= 10,
  `${result.accounts.length} accounts (${result.matched_count} distinct across the claim windows)`,
);
check(
  `under ${LATENCY_BUDGET_MS}ms end to end`,
  wall < LATENCY_BUDGET_MS,
  `${wall}ms wall clock, ${result.took_ms}ms inside the bridge (embedding + match + analysis)`,
);

/**
 * The first probe's finding, as a check: a five-feature account came back as
 * nine surgery stories. The reveal has to answer more than one of the things
 * the person actually said, or §5.4's copy — "not the general shape of it, the
 * specific thing" — is a promise the mechanic cannot keep.
 */
const claimsHit = new Set(result.accounts.map((a) => a.matched_claim));
check(
  "the matched set answers more than one of the person's claims",
  claimsHit.size >= 3 || claimsHit.size >= result.claims.length,
  `${claimsHit.size} of ${result.claims.length} claims are represented in the reveal`,
);

// Not every account can be widened — a stretch of transcript with no
// punctuation has no boundary to find, and those keep their raw chunk. The
// check is that the transcript path is alive at all; the count is the quality
// signal, and §4 marks the raw ones so the founder reads what a tester reads.
const widened = result.accounts.filter((a) => a.excerpt_scope === "sentences").length;
check(
  "excerpts are re-bounded from the transcript, not served as raw chunks",
  widened > 0,
  `${widened}/${result.accounts.length} sentence-bounded` +
    `${widened < result.accounts.length ? " — the rest had no reachable boundary" : ""}`,
);

console.log(
  `  english only: ${result.excluded_non_english} non-English account(s) dropped before ranking` +
    " (Portuguese + French channels, machine-translated subtitles)",
);

const sims = result.accounts.map((a) => a.similarity);
if (sims.length) {
  console.log(
    `  similarity: best ${Math.max(...sims).toFixed(3)}, worst ${Math.min(...sims).toFixed(3)}` +
      ` — tune MIN_SIMILARITY in corpus.ts off this spread`,
  );
}

section("3. How the account was split");

for (const claim of result.claims) {
  const tally = result.claim_matches[claim.index];
  const whole = claim.start === 0 && claim.end === account.length;
  const label = whole ? "[whole account]" : `[claim ${claim.index}]`;
  console.log(
    `\n${label} ${tally.distinct_accounts} accounts` +
      `${tally.best_similarity === null ? "" : `, best ${tally.best_similarity.toFixed(3)}`}`,
  );
  console.log(`    "${claim.text.replace(/\s+/g, " ").trim()}"`);
}

section("4. What a tester would see");

// Grouped by the claim that retrieved it, because that is the question the
// reveal has to answer: did it find the specific thing, or the setting again?
for (const claim of result.claims) {
  const matches = result.accounts.filter((a) => a.matched_claim === claim.index);
  if (!matches.length) continue;
  console.log(`\n── matched on: "${claim.text.replace(/\s+/g, " ").trim().slice(0, 90)}"`);
  for (const a of matches) {
    const raw = a.excerpt_scope === "chunk" ? "  ⚠️ raw chunk — may start mid-word" : "";
    console.log(`\n  ${a.source.video_title ?? a.source.video_id}  (${a.similarity.toFixed(3)})${raw}`);
    console.log(`  ${a.source.video_url ?? "(no url)"}`);
    console.log(`  "${a.excerpt.text}"`);
  }
}

section("5. Founder's eyes only — NOT sent to a tester's coach at all");

// Founder decision, August 11: analyst prose (`corpus_analysis`) reaches
// tom@masterytv.com and nobody else. `projectForCoach` omits it for every other
// viewer, so the model cannot relay what it was never given. It read as
// formulaic in bulk — "X seems to have integrated their experiences into their
// life" — which is the machine-made impression The Company exists to defeat.
// Here it is retrieval signal and a founder's read, nothing else.
for (const a of result.accounts) {
  const notes = a.transformation?.integration_notes;
  if (notes) console.log(`\n  [${a.source.video_id}] ${notes.text}`);
}

if (result.domain_directions.length) {
  console.log(
    `\nWhat happened next, across ${result.accounts_with_transformation} of ` +
      `${result.accounts.length} accounts:`,
  );
  for (const d of result.domain_directions) {
    const parts = [
      d.up && `${d.up} up`,
      d.down && `${d.down} down`,
      d.mixed && `${d.mixed} mixed`,
      d.shifted && `${d.shifted} shifted`,
    ].filter(Boolean);
    console.log(`  ${d.name.padEnd(34)} ${parts.join(", ") || "—"}`);
  }
}

console.log(
  failures
    ? `\n✗ corpus probe FAILED — ${failures} check(s).`
    : "\n✓ corpus probe passed. This proves the pipe, not the thesis — I1.5 is still a decision.",
);
Deno.exit(failures ? 1 : 0);
