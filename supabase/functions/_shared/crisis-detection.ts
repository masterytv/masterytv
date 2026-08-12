/**
 * Crisis Detection — Hybrid keyword + LLM safety system.
 *
 * Extracted from coach/index.ts for cross-channel use (S4.5).
 * All channels (web, email, Telegram) share the same safety layer.
 *
 * Architecture: ARCHITECTURE.md §5.9, SPRINT.md S3.7
 */

import { callClaude } from "./anthropic.ts";
import { createSupabaseClient } from "./supabase.ts";
import {
  detectCrisisKeywords,
  type CrisisCategory,
  type CrisisResult,
} from "./crisis-patterns.ts";

// Tier 1 keyword logic now lives in the pure, dependency-free crisis-patterns.ts
// (so it's importable by the Node safety battery too). Re-export so existing
// import sites (coach/index.ts, channel-router.ts) keep working unchanged.
export { detectCrisisKeywords };
export type { CrisisCategory, CrisisResult };

/**
 * Layer 2: LLM context check. Only runs when Layer 1 flags moderate severity.
 * Reduces false positives: "I'm killing it today" vs "I want to kill myself".
 * Fallback: if LLM unavailable, keyword match alone triggers safety response.
 */
export async function confirmCrisisWithLLM(
  message: string,
  matchedKeywords: string[]
): Promise<boolean> {
  try {
    const response = await callClaude({
      system:
        "You are a crisis assessment classifier. Your ONLY job is to determine if a message indicates genuine suicidal ideation, self-harm intent, or intent to harm others. Respond with ONLY 'CRISIS' or 'NOT_CRISIS'. No explanation.",
      messages: [
        {
          role: "user",
          content: `Message: "${message.slice(0, 500)}"

Keywords flagged: ${matchedKeywords.join(", ")}

Is this a genuine expression of suicidal ideation, self-harm, or intent to harm others? Or is this figurative/casual language (e.g., "killing it", "dying to try", "dead tired")?`,
        },
      ],
      maxTokens: 10,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim()
      .toUpperCase();

    return text.includes("CRISIS");
  } catch (e) {
    // Fallback: if LLM unavailable, treat keyword match as confirmed (safety-first)
    console.warn(
      "[crisis-l2] LLM check failed, defaulting to crisis:",
      (e as Error).message
    );
    return true;
  }
}

/** The categories only the `integration` program can produce (I3.2). */
const INTEGRATION_CATEGORIES = new Set<CrisisCategory>([
  "desire_to_return",
  "command_content",
  "medication_stopping",
]);

/**
 * Layer 2 for the integration categories.
 *
 * The whole difficulty of this population in one function. Somebody who nearly
 * died will say "I didn't want to come back" about a Tuesday in 2019, and
 * somebody who wants to be dead this week will say exactly the same words, in
 * the same calm voice, because for them it has settled into a preference rather
 * than a crisis. Hopelessness, the signal every general classifier is tuned on,
 * is absent from both. So the only question worth asking is about TENSE and
 * PRESENT INTENT, and the prompt asks nothing else.
 *
 * Deliberately NOT asked: whether the experience was real, whether the belief
 * is plausible, or whether the person seems unwell. Those are the judgments
 * this vertical refuses to make, and a classifier that made them here would
 * leak that stance into the highest-stakes turn in the product.
 *
 * Safety-first fallback matches the rest of the file: an LLM failure flags.
 */
export async function confirmIntegrationRiskWithLLM(
  message: string,
  matchedKeywords: string[],
  category: CrisisCategory,
): Promise<boolean> {
  const question: Record<string, string> = {
    desire_to_return:
      "Is this person expressing a PRESENT wish to be dead, to not be alive here, or to return to a place they reached when they nearly died? " +
      "Answer NOT_RISK if they are recounting how they felt at the time of a past event, or describing a belief about an afterlife without any present wish to get there sooner. " +
      "A calm, settled, articulate tone is NOT evidence against risk in this population — judge the tense and the wish, not the distress.",
    command_content:
      "Is this person reporting that something they experienced INSTRUCTED them to take an action in the world — and are they describing following it, or intending to? " +
      "Answer NOT_RISK if they are recounting the content of an experience without any action attached to it.",
    medication_stopping:
      "Is this person describing stopping, reducing, or refusing psychiatric medication OUTSIDE of medical supervision, or planning to? " +
      "Answer NOT_RISK if a prescriber directed the change, or if they are describing something a doctor supervised.",
  };

  try {
    const response = await callClaude({
      system:
        "You are a risk classifier for a coaching product used by people integrating a near-death, anomalous, or worldview-shattering experience. " +
        "You never assess whether the experience was real. Respond with ONLY 'RISK' or 'NOT_RISK'. No explanation.",
      messages: [
        {
          role: "user",
          content: `Message: "${message.slice(0, 500)}"

Phrases flagged: ${matchedKeywords.join(", ")}

${question[category] ?? question.desire_to_return}`,
        },
      ],
      maxTokens: 10,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim()
      .toUpperCase();

    // Match RISK only when NOT_RISK is absent — "NOT_RISK" contains "RISK".
    return text.includes("RISK") && !text.includes("NOT_RISK");
  } catch (e) {
    console.warn(
      "[crisis-l2-integration] LLM check failed, defaulting to flagged:",
      (e as Error).message,
    );
    return true;
  }
}

/**
 * Abuse confirmation (Layer 2 for the abuse category). Filters false positives:
 * a strict boss, figurative language, or control unrelated to an intimate
 * partner is NOT abuse. Safety-first fallback to flagged if the LLM is down.
 */
export async function confirmAbuseWithLLM(
  message: string,
  matchedKeywords: string[]
): Promise<boolean> {
  try {
    const response = await callClaude({
      system:
        "You are a safety classifier for intimate-partner abuse. Determine if the message discloses intimate-partner abuse, coercive control, or fear for one's safety in a relationship — physical violence, threats, intimidation, or control over money/movement/contact/communication (isolation, monitoring). Respond with ONLY 'ABUSE' or 'NOT_ABUSE'. Figurative/casual language, or control by a non-partner (e.g. a strict boss or parent of an adult), is NOT_ABUSE.",
      messages: [
        {
          role: "user",
          content: `Message: "${message.slice(0, 500)}"

Keywords flagged: ${matchedKeywords.join(", ")}

Does this disclose intimate-partner abuse or coercive control?`,
        },
      ],
      maxTokens: 10,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim()
      .toUpperCase();

    return text.includes("ABUSE") && !text.includes("NOT");
  } catch (e) {
    console.warn(
      "[abuse-l2] LLM check failed, defaulting to flag:",
      (e as Error).message
    );
    return true; // safety-first
  }
}

/**
 * Build the DV / abuse response — routes to specialist resources and makes
 * clear the coach will NOT coach or mediate an unsafe/controlling relationship.
 */
export function buildAbuseResponse(): string {
  return `Thank you for trusting me with this. What you're describing — feeling unsafe, controlled, or afraid in your relationship — matters, and you deserve support from people trained specifically for it.

**I'm an AI coach, and this is beyond what I can help with. I won't try to coach or mediate a relationship where you feel unsafe — that's not something to "work on," and your safety comes first.**

Please reach out to people who can help, free and confidential, 24/7:

📞 **National Domestic Violence Hotline** — call **1-800-799-7233**, or text **START** to **88788**
💬 **Online chat & international resources** — https://www.thehotline.org

If you're in immediate danger, please call **911** or your local emergency number.

None of this is your fault, and you don't have to figure it out alone. I'm here for other things whenever you're ready. 💛`;
}

/**
 * Medication hard stop (I3.5).
 *
 * Its own response because the 988 script is the wrong answer to "I came off my
 * lithium" — it treats a medication decision as a suicidal one and, worse, it
 * teaches the person that mentioning medication ends the conversation.
 *
 * §3/I3.5 is explicit that medication gets a hard stop **with no further
 * exploration**: name the stakes, decline to advise, route to a person who can.
 * So this says the one true thing and stops. It does not ask why, does not
 * offer to think it through, and does not comment on whether they need it —
 * the coach has no standing to hold an opinion about that, and an AI agreeing
 * that somebody does not need their medication is the single worst output this
 * product could produce.
 *
 * Register per INTEGRATION_EXPERIENCE: warm, plain, unhurried. No cheerfulness.
 */
export function buildMedicationResponse(): string {
  return `I want to stop and be straight with you about this one, because it matters more than anything else we could talk about today.

**I'm an AI, and I have no business having an opinion about your medication.** Not what you take, not what you stop, not what an experience seemed to tell you about it. Stopping or changing psychiatric medication can go badly in ways that are hard to reverse, and it is genuinely dangerous to do it without the person who prescribed it.

Please talk to your prescriber before you change anything, or if you have already changed it, tell them what you have done. You do not have to explain the experience to them to do that.

I'm here for the rest of it whenever you want to carry on.`;
}

/**
 * Build the crisis response message.
 * Same response regardless of channel — formatted as markdown.
 */
export function buildCrisisResponse(
  severity: "high" | "moderate" | "none"
): string {
  if (severity === "high") {
    return `I hear you, and I'm really glad you shared this with me. What you're feeling matters, and you deserve support from someone who specializes in this.

**I'm an AI coach, and this is beyond what I can help with.** Please reach out to someone who can:

🆘 **988 Suicide & Crisis Lifeline** — Call or text **988** (available 24/7)
💬 **Crisis Text Line** — Text **HOME** to **741741**
🌍 **International Association for Suicide Prevention** — https://www.iasp.info/resources/Crisis_Centres/

You don't have to go through this alone. These are free, confidential services with trained professionals who genuinely want to help.

If you're in immediate danger, please call **911** or your local emergency number.

I'll be here whenever you're ready to come back and talk about other things. No pressure, no timeline. 💛`;
  }

  return `I want to pause and check in on you. Some of what you said sounds like you might be going through something really difficult.

**If you're in crisis or having thoughts of self-harm, please reach out to a trained professional:**

📞 **988 Suicide & Crisis Lifeline** — Call or text **988** (24/7)
💬 **Crisis Text Line** — Text **HOME** to **741741**

As an AI coaching tool, I'm not equipped to provide mental health support, but I care about your wellbeing. If you're just having a tough day and want to talk through a challenge, I'm absolutely here for that.

What would be most helpful right now?`;
}

/**
 * Log crisis event to crisis_flags table for admin review.
 */
export interface CrisisFlagContext {
  conversationId?: string | null;
  engagementId?: string | null;
  subjectScope?: "self" | "partner" | "third_party";
  source?: "keyword" | "llm_sweep";
  coachHandled?: boolean;
  detail?: Record<string, unknown> | null;
  // PC5.4: resolved program at detection time. null is expected on the
  // channel-router path — Tier 1 runs before program resolution by design.
  program?: string | null;
}

export async function logCrisisFlag(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  severity: "high" | "moderate",
  matchedKeywords: string[],
  llmConfirmed: boolean,
  message: string,
  category: CrisisCategory = "self_harm",
  ctx: CrisisFlagContext = {}
): Promise<void> {
  try {
    await supabase.from("crisis_flags").insert({
      user_id: userId,
      severity,
      category,
      matched_keywords: matchedKeywords,
      llm_confirmed: llmConfirmed,
      message_excerpt: message.slice(0, 200),
      reviewed: false,
      conversation_id: ctx.conversationId ?? null,
      engagement_id: ctx.engagementId ?? null,
      subject_scope: ctx.subjectScope ?? "self",
      source: ctx.source ?? "keyword",
      coach_handled: ctx.coachHandled ?? false,
      detail: ctx.detail ?? null,
      program: ctx.program ?? null,
    });
  } catch (e) {
    console.error(
      "[crisis] Failed to log crisis flag:",
      (e as Error).message
    );
  }
}

// Tier 1 escalation dedup window — mirrors safety-sweep's DEDUP_WINDOW_MS so the two
// tiers suppress each other's duplicate founder alerts for the same (user,conv,category).
const ESCALATION_DEDUP_MS = 12 * 60 * 60 * 1000;

/**
 * Has a high-severity, unreviewed crisis_flag for this (user, conversation, category)
 * already been logged within the dedup window? If so, we've already alerted — don't
 * re-email. Queried BEFORE inserting the current flag so it only sees PRIOR flags.
 * On query failure we return false (escalate anyway — a double alert beats a missed one).
 */
async function hasRecentHighFlag(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  conversationId: string | null,
  category: CrisisCategory
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - ESCALATION_DEDUP_MS).toISOString();
    let q = supabase
      .from("crisis_flags")
      .select("id")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("severity", "high")
      .eq("reviewed", false)
      .gte("created_at", since);
    q = conversationId
      ? q.eq("conversation_id", conversationId)
      : q.is("conversation_id", null);
    const { data } = await q.limit(1).maybeSingle();
    return !!data;
  } catch (e) {
    console.warn("[crisis] escalation dedup check failed, will escalate:", (e as Error).message);
    return false;
  }
}

/**
 * Full crisis detection pipeline.
 * Combines Layer 1 (keyword) + Layer 2 (LLM context check).
 * Returns { isCrisis, response, escalate } if crisis detected, or { isCrisis: false }.
 * `escalate` is true when a NEW high-severity event should trigger the founder alert
 * email (E15.4); the caller dispatches it (web via waitUntil, other channels awaited).
 */
export async function runCrisisDetection(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  message: string,
  ctx: {
    conversationId?: string | null;
    engagementId?: string | null;
    program?: string | null;
  } = {}
): Promise<{
  isCrisis: boolean;
  response?: string;
  severity?: "high" | "moderate";
  category?: CrisisCategory;
  matchedKeywords?: string[];
  escalate?: boolean;
}> {
  // PC5.4's resolved program now reaches Tier 1 too (I3.2/I3.3). `integration`
  // adds its own pattern groups and carves terror-alone out of the abuse
  // hard-stop; every other program's result is byte-identical to before.
  const keywords = detectCrisisKeywords(message, ctx.program);

  if (!keywords.isCrisis) {
    return { isCrisis: false };
  }

  // Severity is always high|moderate when isCrisis (abuse is high).
  const severity: "high" | "moderate" =
    keywords.severity === "moderate" ? "moderate" : "high";

  // Abuse + moderate self-harm get an LLM context check (false-positive prone).
  // High-severity self-harm responds immediately.
  let confirmed = true;
  if (keywords.category === "abuse") {
    confirmed = await confirmAbuseWithLLM(message, keywords.matchedKeywords);
  } else if (INTEGRATION_CATEGORIES.has(keywords.category)) {
    // NOT confirmCrisisWithLLM. That classifier is tuned to separate genuine
    // ideation from figurative speech ("killing it", "dead tired"), and it would
    // clear every one of these as a description of something that already
    // happened — which is exactly the miss I3.2 exists to fix.
    confirmed = await confirmIntegrationRiskWithLLM(
      message,
      keywords.matchedKeywords,
      keywords.category,
    );
  } else if (keywords.severity === "moderate") {
    confirmed = await confirmCrisisWithLLM(message, keywords.matchedKeywords);
  }

  const conversationId = ctx.conversationId ?? null;

  if (confirmed) {
    // E15.4 — high-severity Tier 1 events escalate to the founder alert email
    // (self-harm high, or abuse which is always high). Moderate self-harm is flagged
    // but not emailed, matching Tier 2. Deduped so a burst doesn't flood the inbox.
    let escalate = severity === "high";
    if (escalate) {
      escalate = !(await hasRecentHighFlag(supabase, userId, conversationId, keywords.category));
    }

    await logCrisisFlag(
      supabase,
      userId,
      severity,
      keywords.matchedKeywords,
      true,
      message,
      keywords.category,
      {
        source: "keyword",
        subjectScope: "self",
        // command_content is logged but NOT canned-answered — see below.
        coachHandled: keywords.category !== "command_content",
        conversationId,
        engagementId: ctx.engagementId ?? null,
        program: ctx.program ?? null,
      }
    );

    // I3.2 — command content is DETECTED, not intercepted.
    //
    // Someone reporting that the experience told them to do something needs the
    // coach, not a canned reply: §3/I4.2's claim-type C is engaged fully and
    // checked for reversibility, and I3.5's tripwire owns the irreversible
    // subset. Replacing the turn with a crisis script here would confirm the
    // one thing this vertical must never confirm — that saying it out loud gets
    // you handled. The flag is written above, so the crisis queue still sees it.
    if (keywords.category === "command_content") {
      return { isCrisis: false };
    }

    return {
      isCrisis: true,
      response:
        keywords.category === "medication_stopping"
          ? buildMedicationResponse()
          : keywords.category === "abuse"
          ? buildAbuseResponse()
          : buildCrisisResponse(severity),
      severity,
      category: keywords.category,
      matchedKeywords: keywords.matchedKeywords,
      escalate,
    };
  }

  // False positive — log for keyword refinement
  await logCrisisFlag(
    supabase,
    userId,
    severity,
    keywords.matchedKeywords,
    false,
    message,
    keywords.category,
    {
      source: "keyword",
      subjectScope: "self",
      conversationId,
      engagementId: ctx.engagementId ?? null,
      program: ctx.program ?? null,
    }
  );
  console.log(
    `[crisis] False positive cleared by LLM: "${keywords.matchedKeywords.join(", ")}"`
  );

  return { isCrisis: false };
}
