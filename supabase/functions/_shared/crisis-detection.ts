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
    });
  } catch (e) {
    console.error(
      "[crisis] Failed to log crisis flag:",
      (e as Error).message
    );
  }
}

/**
 * Full crisis detection pipeline.
 * Combines Layer 1 (keyword) + Layer 2 (LLM context check).
 * Returns { isCrisis, response } if crisis detected, or { isCrisis: false } if safe.
 */
export async function runCrisisDetection(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  message: string
): Promise<{
  isCrisis: boolean;
  response?: string;
  severity?: "high" | "moderate";
}> {
  const keywords = detectCrisisKeywords(message);

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
  } else if (keywords.severity === "moderate") {
    confirmed = await confirmCrisisWithLLM(message, keywords.matchedKeywords);
  }

  if (confirmed) {
    await logCrisisFlag(
      supabase,
      userId,
      severity,
      keywords.matchedKeywords,
      true,
      message,
      keywords.category,
      { source: "keyword", subjectScope: "self" }
    );

    return {
      isCrisis: true,
      response:
        keywords.category === "abuse"
          ? buildAbuseResponse()
          : buildCrisisResponse(severity),
      severity,
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
    { source: "keyword", subjectScope: "self" }
  );
  console.log(
    `[crisis] False positive cleared by LLM: "${keywords.matchedKeywords.join(", ")}"`
  );

  return { isCrisis: false };
}
