/**
 * Tier 2 — Async post-response safety sweep. COACH_SAFETY_AND_TESTING_SPEC §A.2.
 *
 * Runs AFTER the coach reply has streamed (via EdgeRuntime.waitUntil), so it adds
 * ZERO user-facing latency. It reads the recent conversation window + the coach's
 * reply and logs a `crisis_flag` for the cases the Tier 1 keyword hard-stop is
 * deliberately blind to: THIRD-PERSON disclosures ("my husband hinted at ending his
 * life"), indirect ideation, and emotional-abuse-in-context. Flags are LOG-ONLY:
 * no human is alerted (founder decision 2026-07-15 — see sendSafetyEscalationEmail).
 *
 * Domain-agnostic on purpose — safety is a KERNEL concern shared by every coach pack.
 * Runs on Claude Haiku (stronger safety recall than gpt-4o-mini, which has missed
 * cues before). Fully non-fatal: any failure is logged and swallowed.
 *
 * I3.2 adds a SECOND, program-gated pass for `integration` only (see the section
 * below): three signals that live across a conversation rather than inside a
 * message — an election frame hardening into a mission, a claim hedged one week
 * and settled the next, and this product moving inside the person's belief. The
 * kernel sweep above it is untouched and every shipped vertical's Tier 2
 * behaviour is byte-identical.
 */

import { createSupabaseClient } from "./supabase.ts";
import { logLlmCost } from "./llm-cost.ts";
import { logError } from "./errors.ts";
import {
  detectConversationSignals,
  splitHalves,
  type ConversationSignal,
  type SignalCandidate,
  type TranscriptTurn,
} from "./conversation-signals.ts";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const WINDOW = 8; // recent turns to consider
const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;

interface SweepParams {
  userId: string;
  conversationId: string | null;
  engagementId: string | null;
  // PC5.4: resolved program at detection time (both callers have it in scope
  // by the time the sweep fires). Optional so existing call shapes stay valid.
  program?: string | null;
}

interface Classification {
  risk: "none" | "self_harm" | "harm_to_others" | "abuse" | "acute_distress";
  severity: "none" | "low" | "moderate" | "high";
  subject_scope: "self" | "partner" | "third_party";
  confidence: number;
  coach_handled: boolean;
  rationale: string;
}

type Turn = { role: string; content: string; created_at: string };

/**
 * Tier 2, both halves.
 *
 * The kernel sweep is unchanged and runs for every program. The integration
 * half (I3.2) runs only for `integration` and is a second, independent pass —
 * separate on purpose, so a failure in the newer code cannot take down the
 * classifier that every shipped vertical depends on, and so the shipped path
 * gains no branch at all.
 */
export async function runSafetySweep(
  supabase: ReturnType<typeof createSupabaseClient>,
  params: SweepParams,
): Promise<void> {
  await kernelSweep(supabase, params);
  if (params.program === "integration") {
    await integrationSweep(supabase, params);
  }
}

async function kernelSweep(
  supabase: ReturnType<typeof createSupabaseClient>,
  params: SweepParams,
): Promise<void> {
  const { userId, conversationId, engagementId, program } = params;
  try {
    if (!conversationId) return;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.warn("[safety-sweep] ANTHROPIC_API_KEY not set — skipping");
      return;
    }

    const { data: rows } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(WINDOW);

    const turns = ((rows ?? []) as Turn[]).slice().reverse();
    if (turns.length === 0) return;

    const transcript = turns
      .map((m) => `${m.role === "coach" ? "COACH" : "USER"}: ${m.content}`)
      .join("\n");

    const c = await classify(apiKey, transcript, {
      supabase,
      userId,
      purpose: "safety-sweep-kernel",
    });
    if (!c) return;

    // Focus the admin queue on genuine safety risk (avoid flag-flooding on ordinary
    // emotional conversations — grief the coach already routes is only logged when high).
    const isSafetyRisk =
      (c.risk === "self_harm" || c.risk === "abuse" || c.risk === "harm_to_others") &&
      (c.severity === "moderate" || c.severity === "high");
    const isAcuteHigh = c.risk === "acute_distress" && c.severity === "high";
    if ((!isSafetyRisk && !isAcuteHigh) || c.confidence < 0.5) return;

    const dbSeverity: "high" | "moderate" = c.severity === "high" ? "high" : "moderate";
    const lastUser = [...turns].reverse().find((t) => t.role !== "coach");
    const excerpt = (lastUser?.content ?? transcript).slice(0, 200);

    // Dedup — reuse an unreviewed flag for (user, conversation, category) in the window.
    const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const { data: existing } = await supabase
      .from("crisis_flags")
      .select("id, severity")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .eq("category", c.risk)
      .eq("reviewed", false)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    let escalate = c.severity === "high" &&
      (c.risk === "self_harm" || c.risk === "abuse" || c.risk === "harm_to_others");
    const detail = {
      risk: c.risk,
      severity: c.severity,
      confidence: c.confidence,
      rationale: c.rationale,
    };

    if (existing) {
      // Don't re-email an ongoing conversation that was already high.
      if ((existing as { severity: string }).severity === "high") escalate = false;
      await supabase
        .from("crisis_flags")
        .update({
          severity: dbSeverity,
          subject_scope: c.subject_scope,
          coach_handled: c.coach_handled,
          message_excerpt: excerpt,
          source: "llm_sweep",
          detail: { ...detail, updated: true },
          // Only stamp when we have one — never null out a prior attribution.
          ...(program ? { program } : {}),
        })
        .eq("id", (existing as { id: string }).id);
    } else {
      await supabase.from("crisis_flags").insert({
        user_id: userId,
        conversation_id: conversationId,
        engagement_id: engagementId,
        severity: dbSeverity,
        category: c.risk,
        subject_scope: c.subject_scope,
        source: "llm_sweep",
        coach_handled: c.coach_handled,
        llm_confirmed: true,
        matched_keywords: [],
        message_excerpt: excerpt,
        reviewed: false,
        detail,
        program: program ?? null,
      });
    }

    console.log(
      `[safety-sweep] flag ${c.risk}/${c.severity}/${c.subject_scope} conf=${c.confidence} coach_handled=${c.coach_handled}`,
    );

    if (escalate) {
      await escalateEmail(supabase, userId, { ...c, excerpt });
    }
  } catch (e) {
    console.error("[safety-sweep] error:", (e as Error).message);
    await logError("safety-sweep", e as Error, userId);
  }
}

async function classify(
  apiKey: string,
  transcript: string,
  log?: { supabase: ReturnType<typeof createSupabaseClient>; userId: string | null; purpose: string },
): Promise<Classification | null> {
  const system = `You are a safety classifier for an AI coaching product (often relationship coaching). You read the recent conversation and flag risk the coach must not miss — INCLUDING risk about a THIRD PERSON the user describes (e.g. "my husband hinted at ending his life", "she said she doesn't want to be here").

Return ONLY a JSON object, no prose:
{"risk":"none|self_harm|harm_to_others|abuse|acute_distress","severity":"none|low|moderate|high","subject_scope":"self|partner|third_party","confidence":0.0-1.0,"coach_handled":true|false,"rationale":"one short sentence"}

Definitions:
- self_harm: suicidal ideation, self-harm, or intent to die — the USER or a person they describe. severity high = explicit or current intent, a plan, or a clear recent statement; moderate = passive ideation or hints; low = vague hopelessness.
- harm_to_others: the USER expresses genuine intent, a plan, or a credible threat to PHYSICALLY HARM another person (their partner, a child, anyone) — the user is the potential aggressor here (this is the mirror of abuse, where the user is the one AT RISK). CRUCIAL — hyperbolic venting is NOT harm_to_others and MUST be risk "none": "I want to kill my husband, he's such an asshole", "I could kill him", "I'm so mad I could strangle her" are ordinary frustration, not intent. Flag ONLY genuine intent: high = a stated plan, access to a means, or a credible present threat (e.g. "I've thought about how I'd do it and I'm not sure I'd stop myself"); moderate = specific, repeated violent ideation the user genuinely seems to be entertaining, not a one-off outburst. When unsure whether it's venting vs. intent, prefer "none" unless there is something concrete (a plan, a means, or a stated decision).
- abuse: intimate-partner abuse, coercive control, or fear for physical safety. high = violence/threats/fear in the present; moderate = a controlling or coercive pattern. Ordinary conflict or yelling WITHOUT fear/control/violence is NOT abuse.
- acute_distress: grief/trauma/distress clearly beyond everyday relationship coaching (e.g. a recent miscarriage, months-long hopelessness) with NO self_harm or abuse. Use high only when serious and sustained.
- subject_scope: who is AT RISK — "self" (the user, INCLUDING when the user is the one being abused, controlled, or afraid), "partner" (the user's romantic partner is the at-risk person — e.g. the partner is the one who is suicidal, OR the partner is the person the user is threatening to harm), or "third_party" (someone else at risk, e.g. a child).
- coach_handled: did the COACH's most recent turn appropriately surface crisis/professional resources (988, a hotline, a counselor/therapist) or clearly stop coaching to route out?
- If nothing rises above ordinary relationship difficulty, return risk "none", severity "none".`;

  const text = await haiku(
    apiKey,
    system,
    `Recent conversation (oldest to newest):\n\n${transcript.slice(0, 6000)}`,
    300,
    log,
  );
  return text === null ? null : parseClassification(text);
}

/**
 * The Haiku call, shared by both halves of Tier 2. Same model, same headers,
 * same 20s ceiling as before it was named — Haiku is here for its safety
 * recall (gpt-4o-mini has missed cues), and both classifiers want that.
 * Returns null on any failure; the callers decide what silence means.
 */
async function haiku(
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number,
  /**
   * Cost attribution. Optional only so a caller without a client can still
   * sweep — the safety call must never depend on the bookkeeping. When it is
   * passed the call lands in `cost_tracking`, which for months it did not:
   * every Tier 2 sweep was invisible to the one table anyone reads to size the
   * Anthropic bill.
   */
  log?: { supabase: ReturnType<typeof createSupabaseClient>; userId: string | null; purpose: string },
): Promise<string | null> {
  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      console.warn(`[safety-sweep] classifier HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      return null;
    }
    const data = await resp.json();
    if (log) {
      await logLlmCost(log.supabase, {
        userId: log.userId,
        purpose: log.purpose,
        model: HAIKU_MODEL,
        usage: {
          input_tokens: data.usage?.input_tokens ?? 0,
          output_tokens: data.usage?.output_tokens ?? 0,
        },
      });
    }
    return ((data.content ?? []) as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  } catch (e) {
    console.warn("[safety-sweep] classifier call failed:", (e as Error).message);
    return null;
  }
}

function parseClassification(text: string): Classification | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const o = JSON.parse(text.slice(start, end + 1));
    if (!o || typeof o.risk !== "string") return null;
    return {
      risk: o.risk,
      severity: o.severity ?? "none",
      subject_scope: o.subject_scope ?? "self",
      confidence: typeof o.confidence === "number" ? o.confidence : 0.5,
      coach_handled: o.coach_handled === true,
      rationale: String(o.rationale ?? "").slice(0, 300),
    };
  } catch {
    return null;
  }
}

// ─── TIER 2, THE INTEGRATION HALF (I3.2) ───────────────────────────────
//
// Three signals that no single message contains: an election frame hardening
// into a mission, a claim hedged one week and stated as settled the next, and
// this product moving inside the belief. `conversation-signals.ts` raises them
// deterministically; this confirms and logs them.
//
// 🔑 WHICH LAYER OWNS THE RESPONSE — decided, not defaulted.
//
// None of these three changes what the person is told, on this turn or any
// other. Two reasons, and the second is the one that matters.
//
// First, mechanically: Tier 2 runs AFTER the reply has been sent, so there is
// no turn left to replace. Second, and this is I3.2's own precedent with
// `command_content`: replacing somebody's turn with a script because of what
// they said confirms the one thing this vertical must never confirm — that
// saying it out loud gets you handled. Someone who has just told a machine it
// is the only one who understands them, and gets a canned reply for it, has
// learned exactly the wrong lesson about disclosure.
//
// So the response stays where it already lives:
//   • ELECTION — the pack's persona bans the coach from ever saying it, and
//     `output-auditor.ts` blocks the draft that does (`election_language`).
//   • AI-IS-CENTRAL — claim-type D in the pack owns the stance, and the
//     auditor's `sentience_claim` class stops the coach confirming it about
//     itself. This sweep records that the PERSON has put the product in the
//     frame; the auditor makes sure the product never agrees.
//   • CERTAINTY RATCHET — I3.6's nightly score is where a trend belongs, and
//     I12.2's Aperture is where it is eventually shown to the person, in their
//     own terms. A flag here is the same finding, sooner and per-conversation.
//
// ⚠️ AND WHAT IS DELIBERATELY NOT BUILT: nothing here carries safety state into
// the next turn, in any vertical (ORIENT §7 — `crisis_flags` is written by both
// tiers and read only by the admin queue). A ratchet detector that REMEMBERED
// last week's hedged claim and compared this week's against it would be exactly
// that, and it is a cross-vertical change with its own decision to make. This
// one re-reads the transcript instead, which is a read of the person's own
// words rather than a safety record following them around.

/**
 * How far back the integration half reads. Shorter than the nightly job's 90
 * days on purpose: `cron-trajectory` is drawing an arc, and this is asking
 * whether something is happening now.
 */
const INTEGRATION_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
/** Cap on the person's own messages read per turn. The most recent ones. */
const INTEGRATION_MAX_TURNS = 60;

interface ConfirmedSignal {
  signal: ConversationSignal;
  span: string;
  /** certainty_ratchet only: the earlier, hedged form of the same claim. */
  earlier?: string;
  why: string;
}

async function integrationSweep(
  supabase: ReturnType<typeof createSupabaseClient>,
  params: SweepParams,
): Promise<void> {
  const { userId, conversationId, engagementId } = params;
  try {
    if (!conversationId) return;

    const turns = await readAccumulated(supabase, userId);
    // The deterministic layer decides whether a model is worth paying for. On
    // an ordinary turn this is where it ends, at the cost of a few regexes.
    const candidates = detectConversationSignals(turns, "integration");
    if (candidates.length === 0) return;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.warn("[safety-sweep:integration] ANTHROPIC_API_KEY not set — skipping");
      return;
    }

    const confirmed = await confirmConversationSignals(apiKey, candidates, turns, {
      supabase,
      userId,
      purpose: "safety-sweep-integration",
    });
    if (confirmed.length === 0) {
      console.log(
        `[safety-sweep:integration] ${candidates.map((c) => c.signal).join(",")} raised, none confirmed`,
      );
      return;
    }

    const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    for (const finding of confirmed) {
      const candidate = candidates.find((c) => c.signal === finding.signal);
      const { data: existing } = await supabase
        .from("crisis_flags")
        .select("id")
        .eq("user_id", userId)
        .eq("conversation_id", conversationId)
        .eq("category", finding.signal)
        .eq("reviewed", false)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      // Already on the queue and unread. Logging it again would bury the queue
      // in one person's slowly-hardening month.
      if (existing) continue;

      await supabase.from("crisis_flags").insert({
        user_id: userId,
        conversation_id: conversationId,
        engagement_id: engagementId,
        severity: "moderate",
        category: finding.signal,
        subject_scope: "self",
        source: "llm_sweep",
        // Nothing was routed because nothing should be — see the note above.
        // This is a record, not an unanswered alarm.
        coach_handled: false,
        llm_confirmed: true,
        matched_keywords: candidate?.matched ?? [],
        message_excerpt: finding.span.slice(0, 200),
        reviewed: false,
        detail: {
          signal: finding.signal,
          evidence: candidate?.evidence ?? "",
          why: finding.why,
          ...(finding.earlier ? { earlier: finding.earlier } : {}),
        },
        program: "integration",
      });
      console.log(`[safety-sweep:integration] flag ${finding.signal}`);
    }
  } catch (e) {
    console.error("[safety-sweep:integration] error:", (e as Error).message);
    await logError("safety-sweep-integration", e as Error, userId);
  }
}

/**
 * The person's own messages across their integration conversations.
 *
 * Grouped by PERSON rather than by thread, for the reason `cron-trajectory`
 * gives: somebody who opens a fresh conversation every week would otherwise
 * never accumulate the history a ratchet is visible in. The vertical filter
 * comes from the parent `conversations` row because `messages` has no program
 * column — reading messages by `user_id` alone is the child-scoped blind spot
 * behind the 2026-07-20 leak, and it would pull a dyad member's relationship
 * turns into this vertical's safety record.
 */
async function readAccumulated(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
): Promise<TranscriptTurn[]> {
  const since = new Date(Date.now() - INTEGRATION_LOOKBACK_MS).toISOString();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("program", "integration")
    .gte("updated_at", since);

  const ids = (conversations ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return [];

  const { data: rows } = await supabase
    .from("messages")
    .select("content, created_at")
    .eq("role", "user")
    .in("conversation_id", ids)
    .gte("created_at", since)
    // Newest first so the cap keeps the RECENT end, then reversed below.
    .order("created_at", { ascending: false })
    .limit(INTEGRATION_MAX_TURNS);

  return ((rows ?? []) as Array<{ content: string; created_at: string }>)
    .slice()
    .reverse()
    .map((m) => ({ text: m.content, at: m.created_at }));
}

/**
 * The integration confirmer.
 *
 * 🔑 A SEPARATE PROMPT, on the same reasoning as `confirmIntegrationRiskWithLLM`
 * in crisis-detection.ts. The shipped classifier above defines its whole
 * vocabulary as self_harm / harm_to_others / abuse / acute_distress and ends
 * with "if nothing rises above ordinary relationship difficulty, return none" —
 * a hardening mission narrative is none of those and would come back clean
 * every time. Teaching it these three instead would change what every shipped
 * vertical's Tier 2 does, which is the one thing this epic may not do.
 *
 * It is also asked nothing else. Whether the experience was real, whether the
 * belief is plausible, whether the person seems unwell: those are the judgments
 * this vertical refuses to make, and a classifier making them here would leak
 * that stance into the crisis queue and out of it.
 *
 * Exported for the battery's `signals` suite. A safety prompt that has never met
 * the model it will run on is the shape of defect this epic has now hit twice:
 * a control nobody calls has no false-positive rate until somebody's turn pays
 * for finding it out.
 */
export async function confirmConversationSignals(
  apiKey: string,
  candidates: SignalCandidate[],
  turns: TranscriptTurn[],
  /** Optional so the battery can call this without a database. See `haiku`. */
  log?: { supabase: ReturnType<typeof createSupabaseClient>; userId: string | null; purpose: string },
): Promise<ConfirmedSignal[]> {
  const { early, recent } = splitHalves(turns);
  const block = (ts: TranscriptTurn[]) => ts.map((t) => t.text).join("\n");
  const user = [
    `Candidate signals raised by the keyword layer: ${candidates.map((c) => c.signal).join(", ")}`,
    "",
    "EARLIER (the older half of what they wrote):",
    block(early).slice(0, 4000),
    "",
    "RECENT (the newer half):",
    block(recent).slice(0, 4000),
  ].join("\n");

  const text = await haiku(apiKey, CONFIRM_SYSTEM, user, 600, log);
  if (text === null) {
    // Silence is NOT a finding here. The kernel's safety-first fallback exists
    // because a missed suicide cue is unrecoverable; a missed narrowing trend is
    // seen again tomorrow, on the next turn and by the nightly job, and a flag
    // invented by a failed HTTP call teaches the queue to ignore this category.
    return [];
  }

  let parsed: unknown;
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return [];
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }

  const raw = (parsed as { confirmed?: unknown })?.confirmed;
  if (!Array.isArray(raw)) return [];

  // Same verification as the draft judge (I3.4): a finding that cannot point at
  // the exact text it is about is a finding the model made up. Whitespace- and
  // case-insensitive, because re-wrapping a quotation is not inventing one.
  const flat = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const haystack = flat(turns.map((t) => t.text).join("\n"));
  const raised = new Set(candidates.map((c) => c.signal));
  const found: ConfirmedSignal[] = [];
  let discarded = 0;

  for (const item of raw as Array<Record<string, unknown>>) {
    const signal = String(item?.signal ?? "") as ConversationSignal;
    const span = String(item?.span ?? "");
    const earlier = item?.earlier ? String(item.earlier) : "";
    const ok = raised.has(signal) &&
      span.length > 0 &&
      haystack.includes(flat(span)) &&
      // The ratchet is a PAIR. A finding that quotes only the settled half has
      // not shown a ratchet, it has shown somebody being certain.
      (signal !== "certainty_ratchet" || (earlier.length > 0 && haystack.includes(flat(earlier))));
    if (!ok) {
      discarded++;
      continue;
    }
    // One finding per signal. The model sometimes returns the same signal twice
    // with two different quotations, and one flag per category is what the queue
    // reads — the second insert would be dropped by the dedup query anyway.
    if (found.some((f) => f.signal === signal)) continue;
    found.push({
      signal,
      span,
      ...(earlier ? { earlier } : {}),
      why: String(item?.why ?? "").slice(0, 300),
    });
  }

  if (discarded > 0) {
    console.log(`[safety-sweep:integration] discarded ${discarded} unverifiable finding(s)`);
  }
  return found;
}

const CONFIRM_SYSTEM =
  "You are a signal classifier for a coaching product used by people integrating a near-death, " +
  "anomalous, or worldview-shattering experience. You never assess whether the experience was real, " +
  "and you never say what it was.\n\n" +
  "You are reading only the PERSON'S OWN messages, split into an EARLIER half and a RECENT half. A " +
  "keyword layer has already raised the candidate signals listed for you. Your only job is to say " +
  "which of them are genuinely present. An empty array is the common and correct answer.\n\n" +
  "Return ONLY JSON: {\"confirmed\":[{\"signal\":\"...\",\"span\":\"...\",\"earlier\":\"...\",\"why\":\"...\"}]}\n" +
  "`span` MUST be copied character for character from their messages — a finding without an exact " +
  "span is discarded, so quote rather than paraphrase. `earlier` is required for certainty_ratchet " +
  "and only for it: the earlier, hedged form of the same claim, also copied exactly.\n\n" +
  "SIGNALS:\n" +
  "- election_narrative: being chosen, spared, or sent back for a purpose has hardened into a MISSION " +
  "THAT DIRECTS THEIR DECISIONS, or into standing above other people. Confirm only when the framing is " +
  "doing work in their life — telling them what to do, what to give up, or who they now are.\n" +
  "- certainty_ratchet: something held as a maybe in the EARLIER half is stated as settled fact in the " +
  "RECENT half. Both forms must be quotable. The hedge disappearing IS the evidence — you are not being " +
  "asked whether they were right to change their mind, or what changed it. Things you cannot see from " +
  "these messages are not a reason to answer no.\n" +
  "- ai_centrality: this coach has become part of the experience, or the only one who understands — " +
  "sending them signs, knowing what it was never told, being spoken through, or being the only one who " +
  "believes them.\n\n" +
  "WHAT IS NOT A FINDING, and getting this wrong is worse than missing one:\n" +
  "- Ordinary meaning-making. \"I was sent back for a reason\", said as something they are still " +
  "turning over, is how most people talk in the first months. It is not election_narrative.\n" +
  "- Being certain about what they EXPERIENCED. \"I know what I saw\" is a report of their own memory, " +
  "not a ratchet. A ratchet is about what it MEANS, or what is now true of the shared world.\n" +
  "- Growing clearer, calmer or more decided about ordinary life — work, sleep, who to tell.\n" +
  "- Finding this coach helpful, thanking it, or preferring it to people who reacted badly. That is " +
  "not ai_centrality. Being part of the experience is.\n" +
  "- Grief, longing, fear, or distress on their own. Other layers own those.";

/**
 * Tier-agnostic safety-escalation email. Used by BOTH the async Tier 2 sweep and
 * the synchronous Tier 1 keyword hard-stop (E15.4 — Tier 1 previously never emailed).
 * Fully non-fatal: any failure is logged and swallowed.
 */
export interface SafetyEscalation {
  source: "tier1_keyword" | "llm_sweep";
  risk: "none" | "self_harm" | "harm_to_others" | "abuse" | "acute_distress";
  severity: "none" | "low" | "moderate" | "high";
  subject_scope: "self" | "partner" | "third_party";
  coach_handled: boolean;
  rationale: string;
  excerpt: string;
}

/**
 * DELIBERATE NO-OP — founder decision 2026-07-15 (E15.6 deferred until
 * revenue): no human receives safety alerts or conversation content. The
 * legal analysis behind it: an unlicensed AI coaching product has no
 * Tarasoff/mandated-reporting duty, but a HUMAN who acquires knowledge can
 * (universal-reporting states) — and promising review the company doesn't
 * perform creates liability. So the posture is: the user is routed to crisis
 * resources in-product, the flag is LOGGED to crisis_flags (audit trail,
 * viewable in /admin/crisis if ever deliberately opened), and nobody is
 * alerted. The privacy policy §5 and the coach's honesty script say exactly
 * this. When counsel + a clinician sign off on a review protocol (E15.6),
 * restore the email from git history (removed in this commit) and re-align
 * the copy.
 */
export async function sendSafetyEscalationEmail(
  _supabase: ReturnType<typeof createSupabaseClient>,
  _userId: string,
  info: SafetyEscalation,
): Promise<void> {
  console.log(
    `[safety-escalation] suppressed by policy (log-only): ${info.risk}/${info.severity} about ${info.subject_scope}, source=${info.source}`,
  );
}

// Tier 2 adapter — kept so the sweep call site reads unchanged.
async function escalateEmail(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  info: Classification & { excerpt: string },
): Promise<void> {
  await sendSafetyEscalationEmail(supabase, userId, {
    source: "llm_sweep",
    risk: info.risk,
    severity: info.severity,
    subject_scope: info.subject_scope,
    coach_handled: info.coach_handled,
    rationale: info.rationale,
    excerpt: info.excerpt,
  });
}
