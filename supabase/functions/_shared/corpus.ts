/**
 * The Project Profound corpus bridge — I1.1–I1.4, INTEGRATION_SPRINT.md §3.
 *
 * This is the Jung woodcut mechanic (DISCOVERY §3.3): a person describes what
 * happened to them, and the product hands back other people's accounts of the
 * same thing, in those people's own words. It is the one capability nobody
 * else can clone, and it is the whole commercial case against a free chatbot
 * that agrees with the user.
 *
 * ─── THE PROVENANCE CONTRACT (I1.3) ──────────────────────────────────────
 *
 * **Excerpts only. No synthesis, ever.** The tool reports what other people
 * said; it never generalizes across accounts into a claim. That rule cannot
 * live in prose — a prompt instruction is a suggestion, and the model that
 * would violate it is the same model that would agree it shouldn't.
 *
 * So it lives in the return shape:
 *
 *   - Free text appears ONLY inside an `AttributedText`, which carries a
 *     `provenance` tag and the source it came from. There is no field of type
 *     `string` for prose anywhere else in the payload.
 *   - `provenance` has exactly two inhabitants, and neither of them is us:
 *       · `verbatim_excerpt`  — words spoken on the recording, byte-identical
 *                               to corpus transcript text or to a `key_quote`
 *                               in the transformation profile. ⚠️ Transcripts
 *                               are interviews: an excerpt can contain the
 *                               HOST's questions as well as the experiencer's
 *                               answers, and the corpus has no speaker labels.
 *                               So a renderer may attribute an excerpt to the
 *                               account it came from, never to a named person
 *                               as something they personally said.
 *       · `corpus_analysis`   — Project Profound's ANALYST prose about an
 *                               account (`integration_notes`,
 *                               `evidence_summary`). Not the experiencer's
 *                               words, and never to be rendered as a quote.
 *     There is deliberately no third value. Text the coach wrote has nowhere
 *     to go.
 *   - `assertNoAuthoredText()` proves it at runtime: every `AttributedText.text`
 *     in a result must be identical to a string this request actually received
 *     from the corpus database. Rewriting, trimming, summarizing or inventing
 *     all fail the same way. `findSimilarAccounts` runs it on its own output
 *     before returning, so the assertion is not something a caller can forget.
 *
 * Everything else in the payload is a number, an id, an enum, or a fixed
 * constant authored in this file. Counts are computed, not narrated.
 *
 * ─── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────
 *
 * No evidence-collection. No verification. No "log your sightings". On von
 * Lucadou's model attention and attempted verification prolong the phenomena,
 * and clinically they entrench the person in the investigative frame instead
 * of the meaning frame (DISCOVERY §3.3, EXPERIENCE §5.4). The corpus is for
 * company. It is never for proof, and the surface must say so.
 *
 * ─── CREDENTIALS ─────────────────────────────────────────────────────────
 *
 * Project Profound is a SEPARATE Supabase project in a SEPARATE organization
 * (`vnycavclrndjwmpaugju`) from the engine (`lwmadssysqcwbsoiaokc`).
 * `nde_chatbot_chunks` carries a single `USING (false)` policy, so only the
 * service key reads it — and a service key carries full write access to
 * somebody else's database. Hence:
 *   - `PROFOUND_URL` + `PROFOUND_SERVICE_KEY`, edge secrets, server-side only.
 *     Never `NEXT_PUBLIC_`, never in a browser bundle.
 *   - `assertDistinctFromEngine()` refuses to start if the engine's own
 *     credentials have been pasted in by mistake.
 *   - I1.6 replaces all of this with a narrow SECURITY DEFINER RPC on the
 *     corpus project and drops to the publishable key. Do that before any
 *     public link.
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ─── CONSTANTS ────────────────────────────────────────────────────────────

/**
 * The corpus's OWN embedding model — a property of `nde_chatbot_chunks`, not
 * of this app. The engine happens to use the same one today, but the shared
 * `generateEmbedding()` is deliberately NOT reused here: if the engine ever
 * changes its model, this must not follow it. Query vectors and stored vectors
 * have to come out of the same space or the similarity numbers are noise that
 * looks like signal.
 *
 * `nde_chatbot_chunks.embedding` is `vector(1536)`. Verified against the live
 * schema 2026-08-11; `scripts/coach-lab/corpus-probe.ts` re-verifies by
 * embedding a known chunk and asserting it is its own nearest neighbour.
 */
const CORPUS_EMBEDDING_MODEL = "text-embedding-3-small";
const CORPUS_EMBEDDING_DIMENSIONS = 1536;

/**
 * Chunks are ~450 characters, so one video contributes many of them and a
 * naive top-N is often three people wearing nine hats. We over-fetch, then
 * collapse to one excerpt per account. 3× per claim is enough that every claim
 * can still contribute a distinct speaker after collapsing — measured, not
 * guessed: the live corpus returns ~1.1 chunks per account in a window this
 * size, so the collapse barely reduces the pool.
 */
const PER_CLAIM_OVERFETCH = 3;

/**
 * ─── WHY THE ACCOUNT IS SPLIT (the first probe's finding, 2026-08-11) ──────
 *
 * One embedding over a whole account averages its features into their most
 * common denominator, and in this corpus that is the operating theatre. The
 * first live probe proved it: a five-feature account (out-of-body during
 * surgery · a boundary not to cross · knowing that arrived all at once · not
 * wanting to come back · a spouse who says he came back different) returned
 * nine matches in a 0.701–0.732 band, nearly all of them surgery + out-of-body.
 * One hit "I didn't want to come back". None hit the boundary.
 *
 * That is the failure EXPERIENCE §5.4 exists to prevent — *"Not the general
 * shape of it. The specific thing."* The copy there names three distinct
 * features, so the mechanic has to retrieve per feature: split the account into
 * claims, retrieve for each, and merge round-robin so no single claim can take
 * every slot.
 *
 * Segmentation is deterministic (sentences, packed to a target size). It is
 * deliberately NOT a model call: a model deciding which parts of somebody's
 * account are "the claims" is an interpretation of their experience, made
 * upstream of the one surface that must not interpret anything.
 */
/**
 * Roughly one sentence. Deliberately small: at 200 the gate's own fixture put
 * *"a line I understood I mustn't cross"* and *"I did not want to come back"*
 * into a single claim, which is the averaging this split exists to undo.
 */
const TARGET_CLAIM_CHARS = 120;
const MIN_CLAIM_CHARS = 24;
const MAX_CLAIMS = 8;

/**
 * How far a chunk may grow to reach a sentence boundary, per side.
 *
 * Chunks are fixed-length cuts, so they routinely start and end mid-word
 * (*"e kept talking until…"*). The contract forbids tidying a quote, so the fix
 * is to select a better-bounded string from the same transcript — never to edit
 * this one. Past this cap we keep the raw chunk rather than hand back a
 * paragraph: an un-punctuated transcript has no boundary to find.
 */
const MAX_EXPANSION_CHARS = 400;

/**
 * Keep growing past one sentence until the excerpt is at least this long.
 *
 * The probe returned *"You weren't frightened, though?"* as one of nine — a
 * complete sentence, verbatim, and useless: it is the interviewer, and a
 * four-word excerpt in a nine-excerpt reveal reads as a machine cutting text
 * rather than as a person talking.
 */
const MIN_EXCERPT_CHARS = 120;

/**
 * Below this, the match is topical rather than phenomenological, and a bad
 * match is worse than no match — this population has been fobbed off with
 * generic reassurance by everyone else already. Tune during I1.5 against the
 * real similarity distribution, which `corpus-probe.ts` prints.
 */
const MIN_SIMILARITY = 0.35;

/** Bounds on what a caller may ask for. EXPERIENCE §5.4 shows nine. */
const MAX_ACCOUNTS = 10;
const DEFAULT_ACCOUNTS = 9;

/**
 * Handed to the model with every result. This is OUR text, fixed at build
 * time — the one place in the payload that is neither corpus text nor a
 * number — and it exists because a rule delivered next to the data survives
 * where a rule buried in a system prompt does not.
 */
const USAGE_RULE =
  "Quote these excerpts or do not use them. Do not summarise across accounts, " +
  "do not say what any of it means, and do not claim the match says anything " +
  "about what caused their experience — it says only that they are not an " +
  "outlier. Every count you need is already given to you as a number; do not " +
  "count or estimate anything yourself. Each excerpt keeps its attribution. " +
  "Each one also carries matched_claim, the part of their own account it was " +
  "found for — name that part in their words if you name anything, and never " +
  "invent a resemblance the retrieval did not find. " +
  "Text marked corpus_analysis is an analyst's note about an account, not the " +
  "person's own words — never present it as a quote.";

// ─── THE PROVENANCE CONTRACT ──────────────────────────────────────────────

/**
 * Where a piece of text came from. Two values, neither of them this product.
 * Adding a third is how this vertical stops being defensible.
 */
export type CorpusProvenance = "verbatim_excerpt" | "corpus_analysis";

export interface CorpusSource {
  readonly video_id: string;
  readonly video_title: string | null;
  readonly video_url: string | null;
}

/** The only shape in which free text may leave this module. */
export interface AttributedText {
  readonly text: string;
  readonly provenance: CorpusProvenance;
  readonly source: CorpusSource;
}

/**
 * One distinct thing the person said happened — the unit of retrieval.
 *
 * `text` is the caller's own input, handed straight back — the one string in
 * the payload that is neither corpus text nor a constant authored here. It sits
 * outside the provenance enum because it is provable rather than tagged: the
 * offsets are carried, `text === description.slice(start, end)`, and
 * `assertClaimsAreUserText` checks it. A model that wrote into this field would
 * make the offsets stop lining up.
 */
export interface AccountClaim {
  readonly index: number;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/**
 * What one claim found. Numbers only, on the same reasoning as
 * `DomainDirectionTally` — this is what lets a surface say how many accounts
 * describe *the boundary* rather than how many describe the general shape.
 */
export interface ClaimMatchTally {
  readonly claim_index: number;
  /** Distinct accounts above threshold in this claim's window. A floor. */
  readonly distinct_accounts: number;
  readonly best_similarity: number | null;
}

export interface TransformationDomain {
  /** Corpus domain code — AD, AL, CC, PD, PE, RO, RS, SA, SI, VP. */
  readonly code: string;
  readonly name: string;
  /** up | down | mixed | shifted, as the corpus recorded it. Not re-derived. */
  readonly direction: string;
  readonly score: number | null;
  readonly key_quote: AttributedText | null;
  readonly evidence: AttributedText | null;
}

/** I1.4 — the second move: "what happened next", per domain. */
export interface TransformationProfile {
  readonly classification: string | null;
  readonly score: number | null;
  readonly domains: readonly TransformationDomain[];
  readonly integration_notes: AttributedText | null;
}

export interface MatchedAccount {
  readonly source: CorpusSource;
  readonly similarity: number;
  readonly excerpt: AttributedText;
  /**
   * Which of the person's claims this account was retrieved for — an index into
   * `claims`, so the reveal can name the specific thing that matched in their
   * own words instead of asserting a general resemblance (EXPERIENCE §5.4).
   */
  readonly matched_claim: number;
  /**
   * `sentences` — the excerpt was widened to whole sentences from the account's
   * transcript. `chunk` — the raw retrieval chunk, which may begin or end
   * mid-word. Both are byte-identical corpus text; this says which string was
   * chosen, never that one was edited.
   */
  readonly excerpt_scope: "chunk" | "sentences";
  /** Null when the account has no transformation analysis on file. */
  readonly transformation: TransformationProfile | null;
}

/**
 * Direction tallies across the returned accounts, per domain — "what usually
 * happens next", counted in code.
 *
 * Computed rather than left to the model on the same reasoning as the dyad
 * layer (ORIENT §7): a model asked to count across nine long excerpts will get
 * it wrong, and a wrong number stated confidently is banned move class #13,
 * certainty escalation. Numbers are not authored text.
 */
export interface DomainDirectionTally {
  readonly code: string;
  readonly name: string;
  readonly up: number;
  readonly down: number;
  readonly mixed: number;
  readonly shifted: number;
  readonly other: number;
}

export interface FindSimilarAccountsResult {
  /**
   * Distinct accounts above MIN_SIMILARITY across every claim's window —
   * accounts matching *at least one* of the things this person described.
   * A FLOOR, not a census: the corpus holds far more than any one query
   * reaches. Never round it up and never present it as a total.
   */
  readonly matched_count: number;
  /** The person's account, split into the units it was retrieved by. */
  readonly claims: readonly AccountClaim[];
  /** Per-claim counts, so a surface can say what matched the specific thing. */
  readonly claim_matches: readonly ClaimMatchTally[];
  readonly accounts: readonly MatchedAccount[];
  /** Empty unless transformation profiles were requested and found. */
  readonly domain_directions: readonly DomainDirectionTally[];
  /** How many of `accounts` carry a transformation profile — the denominator. */
  readonly accounts_with_transformation: number;
  readonly usage_rule: string;
  readonly took_ms: number;
}

// ─── CREDENTIALS ──────────────────────────────────────────────────────────

interface CorpusCredentials {
  url: string;
  key: string;
}

function readCredentials(): CorpusCredentials {
  const url = Deno.env.get("PROFOUND_URL");
  const key = Deno.env.get("PROFOUND_SERVICE_KEY");
  if (!url || !key) {
    throw new Error(
      "Corpus bridge is not configured — set PROFOUND_URL and PROFOUND_SERVICE_KEY " +
        "as edge secrets on the engine project (INTEGRATION_SPRINT.md §2).",
    );
  }
  assertDistinctFromEngine(url, key);
  return { url, key };
}

/**
 * Refuse to run on the engine's own credentials.
 *
 * The failure this prevents is quiet: paste the wrong key and every query
 * returns nothing (the engine has no `nde_chatbot_chunks`), which reads as
 * "the corpus found no matches" rather than as a misconfiguration — and the
 * kill gate gets answered by a bug.
 */
export function assertDistinctFromEngine(url: string, key: string): void {
  const engineKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (engineKey && key === engineKey) {
    throw new Error(
      "PROFOUND_SERVICE_KEY is the ENGINE's service key. The corpus is a separate " +
        "project in a separate org; its key is never the engine's.",
    );
  }
  const engineUrl = Deno.env.get("SUPABASE_URL");
  if (engineUrl && hostOf(url) === hostOf(engineUrl)) {
    throw new Error(
      `PROFOUND_URL points at the engine project (${hostOf(url)}). Expected the ` +
        "Project Profound project.",
    );
  }
}

function hostOf(u: string): string {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}

let cached: SupabaseClient | null = null;

/** The corpus client. Separate project, separate key, no session persistence. */
export function corpusClient(): SupabaseClient {
  if (cached) return cached;
  const { url, key } = readCredentials();
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Test seam — drops the memoized client so a test can change the env. */
export function resetCorpusClient(): void {
  cached = null;
}

// ─── SPLITTING THE ACCOUNT (I1.2) ─────────────────────────────────────────

/**
 * Sentence terminator followed by whitespace, or a blank line.
 *
 * A single line break is NOT a boundary: pasted accounts are routinely hard
 * wrapped, and treating every newline as a break split *"more like a line I
 * understood I mustn't cross, and I knew without"* into its own claim — a
 * fragment that retrieves nothing, because it is not a thing anybody said.
 */
const CLAIM_BOUNDARY = /[.!?…]["'”’)\]]*\s+|\n\s*\n\s*/g;
/** The same terminator, as an end-of-window marker. */
const SENTENCE_END = /[.!?…]["'”’)\]]*(?=\s|$)/;

/**
 * Split an account into the claims it will be retrieved by.
 *
 * Sentences, packed to roughly `TARGET_CLAIM_CHARS`, capped at `MAX_CLAIMS` by
 * packing harder rather than by dropping anything — every word of the account
 * stays inside exactly one claim.
 *
 * When there is more than one claim, the WHOLE account is prepended as claim 0.
 * That costs one embedding and guarantees this can never retrieve worse than
 * the un-split version did: the holistic match is still there, it just cannot
 * take all nine slots any more.
 */
export function splitIntoClaims(description: string): AccountClaim[] {
  const spans = sentenceSpans(description);
  if (!spans.length) return [];

  let target = TARGET_CLAIM_CHARS;
  let packed = packSpans(spans, target);
  // Terminates: once the target reaches the whole length, packing yields one.
  while (packed.length > MAX_CLAIMS) {
    target *= 2;
    packed = packSpans(spans, target);
  }

  const ranges = packed.length > 1 ? [[0, description.length] as [number, number], ...packed] : packed;
  return ranges.map(([start, end], index) =>
    Object.freeze({ index, start, end, text: description.slice(start, end) })
  );
}

/** Sentence ranges, leading whitespace excluded so a claim starts on a word. */
function sentenceSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  let cursor = 0;
  for (const match of text.matchAll(CLAIM_BOUNDARY)) {
    const end = match.index + match[0].length;
    const start = skipSpace(text, cursor);
    if (end > start) spans.push([start, end]);
    cursor = end;
  }
  const tailStart = skipSpace(text, cursor);
  if (tailStart < text.length) spans.push([tailStart, text.length]);
  return spans;
}

function skipSpace(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

/** Greedy pack: extend the current claim while it is short, else start one. */
function packSpans(spans: [number, number][], target: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [start, end] of spans) {
    const current = out[out.length - 1];
    if (!current) {
      out.push([start, end]);
      continue;
    }
    const currentLength = current[1] - current[0];
    if (currentLength < MIN_CLAIM_CHARS || currentLength + (end - start) <= target) {
      current[1] = end;
    } else {
      out.push([start, end]);
    }
  }
  // A trailing fragment ("I still don't.") belongs to the claim before it.
  const last = out[out.length - 1];
  if (out.length > 1 && last[1] - last[0] < MIN_CLAIM_CHARS) {
    out[out.length - 2][1] = last[1];
    out.pop();
  }
  return out;
}

/**
 * Prove the claims are the caller's own words, not anything we wrote.
 *
 * Cheap, and it is the whole reason `AccountClaim` may carry a string at all:
 * offsets that still slice back to the same text cannot have been authored.
 */
export function assertClaimsAreUserText(
  claims: readonly AccountClaim[],
  description: string,
): void {
  for (const claim of claims) {
    if (description.slice(claim.start, claim.end) !== claim.text) {
      throw new Error(
        `Claim ${claim.index} is not a span of the account it came from. Claims are the ` +
          "person's own words, quoted back by offset — nothing else may be put here.",
      );
    }
  }
}

// ─── CHOOSING A BETTER-BOUNDED STRING (I1.2) ──────────────────────────────

/**
 * Grow a chunk outward, within the same transcript, until it starts and ends on
 * sentence boundaries. Returns null when there is no boundary within reach, in
 * which case the caller keeps the raw chunk.
 *
 * This is selection, not editing. The window is a contiguous slice of the
 * transcript and it always CONTAINS the whole chunk — the excerpt only ever
 * grows, so no word the retrieval actually matched on can be dropped. Both
 * properties are asserted below rather than assumed, because this is the one
 * function in the module that produces a string the corpus did not hand us
 * ready-made.
 *
 * Verified against the live corpus 2026-08-11: 300/300 sampled chunks appear
 * byte-identically inside `nde_vids.subtitles_punctuated` (and only 29/300
 * inside `subtitles_cleaned` — the chunker ran on the punctuated text).
 */
export function expandToSentence(transcript: string, chunk: string): string | null {
  const at = transcript.indexOf(chunk);
  if (at < 0) return null;

  let start = sentenceStartBefore(transcript, at);
  let end = sentenceEndAfter(transcript, at + chunk.length);
  if (start === null || end === null) return null;

  // Grow a sentence at a time — forwards first, so the excerpt keeps reading
  // from where the match was — until it is long enough to sound like speech.
  while (end - start < MIN_EXCERPT_CHARS) {
    const forward = end < transcript.length ? sentenceEndAfter(transcript, end + 1) : null;
    if (forward !== null && forward > end) {
      end = forward;
      continue;
    }
    const backward = start > 0 ? sentenceStartBefore(transcript, start - 1) : null;
    if (backward !== null && backward < start) {
      start = backward;
      continue;
    }
    break; // Nothing left to grow into; a short excerpt beats an invented one.
  }

  const window = transcript.slice(start, end);
  if (!window.includes(chunk) || !transcript.includes(window)) {
    throw new Error(
      "Sentence expansion produced text that is not a superset slice of the transcript. " +
        "An excerpt may be re-bounded, never rewritten.",
    );
  }
  return window;
}

function sentenceStartBefore(text: string, at: number): number | null {
  const floor = Math.max(0, at - MAX_EXPANSION_CHARS);
  const before = text.slice(floor, at);
  const boundaries = [...before.matchAll(CLAIM_BOUNDARY)];
  const last = boundaries[boundaries.length - 1];
  if (last) return floor + last.index + last[0].length;
  return floor === 0 ? 0 : null;
}

function sentenceEndAfter(text: string, at: number): number | null {
  // From `at - 1`, so a chunk that already ends on a full stop stops there
  // instead of swallowing the sentence after it.
  const from = Math.max(0, at - 1);
  const ceiling = Math.min(text.length, at + MAX_EXPANSION_CHARS);
  const ahead = text.slice(from, ceiling);
  const match = SENTENCE_END.exec(ahead);
  if (match) return from + match.index + match[0].length;
  return ceiling === text.length ? text.length : null;
}

// ─── EMBEDDING ────────────────────────────────────────────────────────────

/**
 * Embed the user's account in the CORPUS's vector space.
 *
 * Separate from `_shared/embeddings.ts` on purpose — see CORPUS_EMBEDDING_MODEL.
 */
export async function embedForCorpus(text: string): Promise<number[]> {
  return (await embedManyForCorpus([text]))[0];
}

/**
 * Every claim in one request. The API takes an array, so splitting the account
 * costs one round trip regardless of how many claims come out of it.
 */
export async function embedManyForCorpus(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: CORPUS_EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 32000)),
      dimensions: CORPUS_EMBEDDING_DIMENSIONS,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI Embeddings API error: ${response.status} — ${await response.text()}`);
  }
  const data = await response.json();
  // The API does not promise input order back; `index` does.
  const vectors: number[][] = [];
  for (const row of data.data as { index: number; embedding: number[] }[]) {
    vectors[row.index] = row.embedding;
  }
  return vectors;
}

// ─── RETRIEVAL ────────────────────────────────────────────────────────────

export interface ChunkRow {
  id: number;
  content: string;
  metadata: { video_id?: string } | null;
  similarity: number;
  video_title: string | null;
  video_url: string | null;
}

export interface AnalysisRow {
  video_id: string;
  transformation_score: number | null;
  transformation_classification: string | null;
  transformation_breakdown: {
    domain_analysis?: Record<
      string,
      { name?: string; score?: number; direction?: string; key_quote?: string; evidence_summary?: string }
    >;
    qualitative_profile?: { integration_notes?: string };
  } | null;
}

export interface FindSimilarAccountsOptions {
  /** How many accounts to return. Clamped to [1, MAX_ACCOUNTS]. */
  limit?: number;
  /** Include the I1.4 transformation profile. Costs one extra query. */
  withTransformation?: boolean;
}

/** One account, and the claim of the person's own that retrieved it. */
export interface PickedAccount {
  readonly videoId: string;
  readonly row: ChunkRow;
  readonly claimIndex: number;
}

export interface PickedSet {
  readonly claims: readonly AccountClaim[];
  readonly accounts: readonly PickedAccount[];
  /** Distinct accounts across every claim's window. */
  readonly distinct: number;
  readonly claimMatches: readonly ClaimMatchTally[];
}

/**
 * I1.2 + I1.4 — the tool.
 *
 * Splits the account into claims, embeds them in one request, retrieves for
 * each claim in parallel, merges round-robin so no single claim owns the
 * result, widens each excerpt to sentence boundaries, and (optionally) attaches
 * each account's per-domain transformation directions and integration notes.
 */
export async function findSimilarAccounts(
  description: string,
  options: FindSimilarAccountsOptions = {},
): Promise<FindSimilarAccountsResult> {
  const started = Date.now();
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_ACCOUNTS, MAX_ACCOUNTS));
  const supabase = corpusClient();

  const claims = splitIntoClaims(description);
  assertClaimsAreUserText(claims, description);
  if (!claims.length) throw new Error("Cannot retrieve for an empty account.");

  const embeddings = await embedManyForCorpus(claims.map((c) => c.text));
  const perClaim = await Promise.all(
    claims.map((_, i) => matchChunks(supabase, embeddings[i], limit * PER_CLAIM_OVERFETCH)),
  );

  const picked = mergeClaimMatches(claims, perClaim, limit);
  const videoIds = picked.accounts.map((a) => a.videoId);
  const [analyses, transcripts] = await Promise.all([
    options.withTransformation
      ? loadTransformations(supabase, videoIds)
      : Promise.resolve(new Map<string, AnalysisRow>()),
    loadTranscripts(supabase, videoIds),
  ]);

  return buildResult({ picked, analyses, transcripts, startedAtMs: started });
}

async function matchChunks(
  supabase: SupabaseClient,
  embedding: number[],
  matchCount: number,
): Promise<ChunkRow[]> {
  // `.select(...)` is not cosmetic: the RPC returns the 1536-float `embedding`
  // column per row, and without this we would pull megabytes over the wire to
  // throw them away.
  const { data, error } = await supabase
    .rpc("nde_chatbot_match", {
      query_embedding: embedding,
      match_count: matchCount,
      filter: {},
    })
    .select("id,content,metadata,similarity,video_title,video_url");

  if (error) throw new Error(`Corpus match failed: ${error.message}`);
  // The corpus project has no generated types here, so the RPC's row shape is
  // asserted rather than inferred. ChunkRow mirrors `nde_chatbot_match`'s
  // declared RETURNS TABLE minus the `embedding` column dropped by `.select`.
  return (data ?? []) as unknown as ChunkRow[];
}

/**
 * One excerpt per account, best chunk wins.
 *
 * Chunks arrive sorted by vector distance, so the first sighting of a video IS
 * its best chunk. Without this a "nine accounts" reveal is routinely three
 * people quoted three times each — and the count is the entire claim The
 * Company makes (EXPERIENCE §5.4).
 */
export function collapseToAccounts(chunks: ChunkRow[]): [string, ChunkRow][] {
  const byAccount = new Map<string, ChunkRow>();
  for (const row of chunks) {
    const videoId = row.metadata?.video_id;
    if (!videoId || row.similarity < MIN_SIMILARITY) continue;
    if (!byAccount.has(videoId)) byAccount.set(videoId, row);
  }
  return [...byAccount.entries()];
}

/**
 * Round-robin across the claims: each claim gives up its best account not
 * already taken, then the next claim, and so on until the limit.
 *
 * Ranking the union by similarity instead would rebuild the exact failure this
 * split exists to fix — the setting matches score highest as a block, so they
 * would take every slot again and the boundary nobody else can name would come
 * ninth. Interleaving is also the order the reveal reads in.
 */
export function mergeClaimMatches(
  claims: readonly AccountClaim[],
  perClaim: readonly ChunkRow[][],
  limit: number,
): PickedSet {
  // `matched_claim` is an index into `claims`, so a mismatch here would hand a
  // surface an excerpt attributed to a claim the person never made.
  if (perClaim.length !== claims.length) {
    throw new Error(
      `Retrieved ${perClaim.length} result sets for ${claims.length} claims — every claim is ` +
        "retrieved for, and every result belongs to exactly one claim.",
    );
  }
  const ranked = perClaim.map((chunks) => collapseToAccounts(chunks));
  const distinct = new Set(ranked.flat().map(([videoId]) => videoId));

  const claimMatches: ClaimMatchTally[] = ranked.map((accounts, claim_index) =>
    Object.freeze({
      claim_index,
      distinct_accounts: accounts.length,
      best_similarity: accounts.length ? accounts[0][1].similarity : null,
    })
  );

  const accounts: PickedAccount[] = [];
  const taken = new Set<string>();
  const cursors = ranked.map(() => 0);

  while (accounts.length < limit) {
    let progressed = false;
    for (let i = 0; i < ranked.length && accounts.length < limit; i++) {
      while (cursors[i] < ranked[i].length && taken.has(ranked[i][cursors[i]][0])) cursors[i]++;
      if (cursors[i] >= ranked[i].length) continue;
      const [videoId, row] = ranked[i][cursors[i]++];
      taken.add(videoId);
      accounts.push(Object.freeze({ videoId, row, claimIndex: i }));
      progressed = true;
    }
    if (!progressed) break;
  }

  return Object.freeze({
    claims,
    accounts: Object.freeze(accounts),
    distinct: distinct.size,
    claimMatches: Object.freeze(claimMatches),
  });
}

/**
 * Assemble the result and prove it. Pure — no network, no clock beyond the
 * caller's start mark — so `scripts/coach-lab/corpus-provenance-check.ts` can
 * drive the real assembly with fixture rows and no credentials.
 */
export function buildResult(input: {
  picked: PickedSet;
  analyses: Map<string, AnalysisRow>;
  /** videoId → `subtitles_punctuated`. Missing entries keep the raw chunk. */
  transcripts: Map<string, string>;
  startedAtMs: number;
}): FindSimilarAccountsResult {
  const { picked, analyses, transcripts, startedAtMs } = input;

  // Every string the corpus handed us. `assertNoAuthoredText` checks the
  // finished payload against this set, which is what makes "no synthesis" an
  // assertion rather than an intention.
  const fromCorpus = new Set<string>();

  const accounts: MatchedAccount[] = picked.accounts.map(({ videoId, row, claimIndex }) => {
    const source: CorpusSource = Object.freeze({
      video_id: videoId,
      video_title: row.video_title,
      video_url: row.video_url,
    });
    const analysis = analyses.get(videoId);
    if (analysis) rememberAnalysis(fromCorpus, analysis);

    // Prefer the sentence-bounded window over the fixed-length cut. Both come
    // out of the corpus; only the one we actually use is remembered, so the
    // assertion set never grows a string this payload did not need.
    const transcript = transcripts.get(videoId);
    const widened = transcript ? expandToSentence(transcript, row.content) : null;
    const text = widened ?? row.content;
    remember(fromCorpus, text);

    const excerpt = seal(text, "verbatim_excerpt", source);
    if (!excerpt) throw new Error(`Corpus returned an empty excerpt for ${videoId}.`);
    return Object.freeze({
      source,
      similarity: row.similarity,
      excerpt,
      matched_claim: claimIndex,
      excerpt_scope: widened ? "sentences" as const : "chunk" as const,
      transformation: analysis ? buildTransformation(analysis, source) : null,
    });
  });

  const result: FindSimilarAccountsResult = Object.freeze({
    matched_count: picked.distinct,
    claims: Object.freeze(picked.claims.map((c) => Object.freeze({ ...c }))),
    claim_matches: Object.freeze([...picked.claimMatches]),
    accounts: Object.freeze(accounts),
    domain_directions: tallyDirections(accounts),
    accounts_with_transformation: accounts.filter((a) => a.transformation).length,
    usage_rule: USAGE_RULE,
    took_ms: Date.now() - startedAtMs,
  });

  // The contract enforces itself here, not at the call site.
  assertNoAuthoredText(result, fromCorpus);
  return result;
}

/** Per-domain direction counts across the matched set. Numbers only. */
function tallyDirections(accounts: MatchedAccount[]): readonly DomainDirectionTally[] {
  const byCode = new Map<string, { name: string; counts: Record<string, number> }>();
  for (const account of accounts) {
    for (const domain of account.transformation?.domains ?? []) {
      const entry = byCode.get(domain.code) ??
        { name: domain.name, counts: { up: 0, down: 0, mixed: 0, shifted: 0, other: 0 } };
      const key = ["up", "down", "mixed", "shifted"].includes(domain.direction)
        ? domain.direction
        : "other";
      entry.counts[key]++;
      byCode.set(domain.code, entry);
    }
  }
  return Object.freeze(
    [...byCode.entries()].map(([code, e]) =>
      Object.freeze({ code, name: e.name, ...e.counts } as DomainDirectionTally)
    ),
  );
}

async function loadTransformations(
  supabase: SupabaseClient,
  videoIds: string[],
): Promise<Map<string, AnalysisRow>> {
  if (!videoIds.length) return new Map();
  const { data, error } = await supabase
    .from("nde_analysis")
    .select("video_id,transformation_score,transformation_classification,transformation_breakdown")
    .in("video_id", videoIds)
    .overrideTypes<AnalysisRow[]>();
  if (error) {
    // The excerpts are the payload; "what happened next" is the second move.
    // Losing it degrades the answer, it does not invalidate it.
    console.error("[corpus] transformation load failed:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.video_id, row]));
}

/**
 * The transcripts the excerpts get re-bounded against.
 *
 * One query for the accounts we are actually returning — ~28k characters each,
 * which is why this never runs over the whole retrieval window. A failure here
 * costs quote shape, not the answer, so it degrades to the raw chunks exactly
 * as the transformation load degrades to no second move.
 */
async function loadTranscripts(
  supabase: SupabaseClient,
  videoIds: string[],
): Promise<Map<string, string>> {
  if (!videoIds.length) return new Map();
  const { data, error } = await supabase
    .from("nde_vids")
    .select("videoId,subtitles_punctuated")
    .in("videoId", videoIds)
    .overrideTypes<{ videoId: string; subtitles_punctuated: string | null }[]>();
  if (error) {
    console.error("[corpus] transcript load failed:", error.message);
    return new Map();
  }
  const byId = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.subtitles_punctuated) byId.set(row.videoId, row.subtitles_punctuated);
  }
  return byId;
}

function buildTransformation(row: AnalysisRow, source: CorpusSource): TransformationProfile {
  const domainAnalysis = row.transformation_breakdown?.domain_analysis ?? {};
  const domains: TransformationDomain[] = Object.entries(domainAnalysis).map(([code, d]) =>
    Object.freeze({
      code,
      name: d?.name ?? code,
      direction: d?.direction ?? "unknown",
      score: typeof d?.score === "number" ? d.score : null,
      // The experiencer's own words.
      key_quote: seal(d?.key_quote, "verbatim_excerpt", source),
      // Project Profound's analyst writing ABOUT the account. Tagged so it can
      // never be rendered as something the person said.
      evidence: seal(d?.evidence_summary, "corpus_analysis", source),
    }),
  );
  return Object.freeze({
    classification: row.transformation_classification,
    score: row.transformation_score,
    domains: Object.freeze(domains),
    integration_notes: seal(
      row.transformation_breakdown?.qualitative_profile?.integration_notes,
      "corpus_analysis",
      source,
    ),
  });
}

/**
 * The only constructor for free text in this module. Returns null for absent
 * or blank input, so a missing corpus field becomes an absent field rather
 * than an empty quote. It copies the text; it never edits it — no trimming,
 * no truncation, no ellipsis. A shortened quote is a different quote, and
 * `assertNoAuthoredText` would reject it anyway.
 */
function seal(
  text: string | null | undefined,
  provenance: CorpusProvenance,
  source: CorpusSource,
): AttributedText | null {
  if (typeof text !== "string" || !text.trim()) return null;
  return Object.freeze({ text, provenance, source });
}

function remember(set: Set<string>, ...values: (string | null | undefined)[]): void {
  for (const v of values) if (typeof v === "string" && v.trim()) set.add(v);
}

function rememberAnalysis(set: Set<string>, row: AnalysisRow): void {
  remember(set, row.transformation_breakdown?.qualitative_profile?.integration_notes);
  for (const d of Object.values(row.transformation_breakdown?.domain_analysis ?? {})) {
    remember(set, d?.key_quote, d?.evidence_summary);
  }
}

// ─── THE TOOL ─────────────────────────────────────────────────────────────

/**
 * `find_similar_accounts` — I1.2, and I4.4's tool contract in advance.
 *
 * `description` is required because there is nothing to embed without it, but
 * the description text is emphatic that it comes from the conversation the
 * model already has. The failure this guards against shipped twice on earlier
 * verticals: a tool parameter the model cannot fill from context turns into
 * the model interrogating the user for it, and here that means asking someone
 * to re-tell the worst or strangest hour of their life to satisfy a schema.
 */
export const FIND_SIMILAR_ACCOUNTS_TOOL = {
  name: "find_similar_accounts",
  description:
    "Find real accounts from other people whose experience matches what this person has " +
    "described, and return their own words. Use it once the person has told you what " +
    "happened, when showing them they are not the only one would land better than anything " +
    "you could say. Returns attributed excerpts and, optionally, what changed for those " +
    "people afterwards. It reports what others said; it never establishes what anything was " +
    "or what caused it.",
  input_schema: {
    type: "object" as const,
    properties: {
      description: {
        type: "string",
        description:
          "The person's account, in THEIR OWN WORDS, copied from this conversation. Never " +
          "ask them to repeat, summarise or re-tell their experience to fill this in — you " +
          "already have what they said, so use that.",
      },
      limit: {
        type: "number",
        description: "How many accounts to return. Optional; 5 by default, 10 at most.",
      },
      include_what_happened_next: {
        type: "boolean",
        description:
          "Optional. Also return what changed for these people across ten life domains in " +
          "the years afterwards, with direction counts. Ask for it when the person is asking " +
          "what happens now, not when they are still telling you what happened.",
      },
    },
    required: ["description"],
  },
};

/** Fewer than the reveal surface shows — this result rides inside a chat turn. */
const TOOL_DEFAULT_ACCOUNTS = 5;

/**
 * Coach-facing handler.
 *
 * Projects a leaner view than the full result: per-domain `evidence` (analyst
 * prose) is dropped, because it roughly doubles the payload and says little
 * the `key_quote` does not. It is still on `MatchedAccount` for The Company
 * surface (I6.3) to use. Projection drops fields; it never edits text, so the
 * provenance contract is untouched.
 */
export async function handleFindSimilarAccounts(input: {
  description?: string;
  limit?: number;
  include_what_happened_next?: boolean;
}): Promise<Record<string, unknown>> {
  const description = (input.description ?? "").trim();
  if (!description) {
    return {
      error:
        "No account text was passed. Use the person's own words from this conversation — " +
        "do not ask them to tell it again.",
    };
  }

  const result = await findSimilarAccounts(description, {
    limit: input.limit ?? TOOL_DEFAULT_ACCOUNTS,
    withTransformation: input.include_what_happened_next === true,
  });

  return {
    matched_count: result.matched_count,
    accounts_with_transformation: result.accounts_with_transformation,
    domain_directions: result.domain_directions,
    usage_rule: result.usage_rule,
    // The person's own words, sliced from what the caller passed in — offsets
    // dropped here because the model has the conversation, not a cursor.
    claims: result.claims.map((c) => ({ index: c.index, text: c.text })),
    claim_matches: result.claim_matches,
    accounts: result.accounts.map((a) => ({
      source: a.source,
      similarity: Number(a.similarity.toFixed(3)),
      matched_claim: a.matched_claim,
      excerpt: a.excerpt,
      transformation: a.transformation
        ? {
          classification: a.transformation.classification,
          integration_notes: a.transformation.integration_notes,
          domains: a.transformation.domains.map((d) => ({
            code: d.code,
            name: d.name,
            direction: d.direction,
            key_quote: d.key_quote,
          })),
        }
        : null,
    })),
  };
}

// ─── THE ASSERTION (I1.3) ─────────────────────────────────────────────────

const PROVENANCES: readonly CorpusProvenance[] = ["verbatim_excerpt", "corpus_analysis"];

/**
 * Prove the result contains no text this product wrote.
 *
 * Walks every `AttributedText` in the payload and requires that its `text` be
 * byte-identical to a string the corpus returned during this request. A
 * summary, a paraphrase, a trimmed quote and an invention all fail identically,
 * because all four are strings the corpus never sent.
 *
 * Throws rather than returning a boolean: a result that fails this must not be
 * repairable into one that ships.
 */
export function assertNoAuthoredText(
  result: FindSimilarAccountsResult,
  fromCorpus: ReadonlySet<string>,
): void {
  const check = (value: AttributedText | null, where: string) => {
    if (value === null) return;
    if (typeof value.text !== "string" || !value.text) {
      throw new Error(`Provenance violation at ${where}: text is missing.`);
    }
    if (!PROVENANCES.includes(value.provenance)) {
      throw new Error(
        `Provenance violation at ${where}: "${value.provenance}" is not a corpus provenance. ` +
          "Model-authored text has no valid tag, by design.",
      );
    }
    if (!value.source?.video_id) {
      throw new Error(`Provenance violation at ${where}: excerpt carries no source.`);
    }
    if (!fromCorpus.has(value.text)) {
      throw new Error(
        `Provenance violation at ${where}: text is not byte-identical to anything the corpus ` +
          `returned. No synthesis, no paraphrase, no trimming — quote it or drop it. ` +
          `Offending text: ${JSON.stringify(value.text.slice(0, 80))}`,
      );
    }
  };

  result.accounts.forEach((account, i) => {
    check(account.excerpt, `accounts[${i}].excerpt`);
    const t = account.transformation;
    if (!t) return;
    check(t.integration_notes, `accounts[${i}].transformation.integration_notes`);
    t.domains.forEach((d, j) => {
      check(d.key_quote, `accounts[${i}].transformation.domains[${j}].key_quote`);
      check(d.evidence, `accounts[${i}].transformation.domains[${j}].evidence`);
    });
  });
}
