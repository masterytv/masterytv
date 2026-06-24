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

// ─── CRISIS KEYWORD PATTERNS ───────────────────────────────────────────

const CRISIS_PATTERNS = {
  high: [
    /\bsuicid(e|al)\b/i,
    /\bkill\s+(my|him|her|them)?self\b/i,
    /\bwant\s+to\s+die\b/i,
    /\bend\s+(my|it\s+all|this)\s*(life)?\b/i,
    /\bhurt\s+my\s?self\b/i,
    /\bself[- ]harm/i,
    /\bno\s+reason\s+to\s+live\b/i,
    /\bplan\s+to\s+(kill|end|hurt)/i,
  ],
  moderate: [
    /\bdon'?t\s+want\s+to\s+(be\s+here|exist|go\s+on|continue)\b/i,
    /\bwish\s+I\s+(was|were)\s+dead\b/i,
    /\bgive\s+up\s+on\s+(life|everything)\b/i,
    /\bnothing\s+(matters|left|to\s+live\s+for)\b/i,
    /\bharm\s+(myself|others|someone)\b/i,
    /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  ],
  // E7 — intimate-partner abuse / coercive control. Coarse filter; the LLM
  // confirms intimate-partner context (a strict boss / figurative use is not abuse).
  abuse: [
    /\b(afraid|scared|terrified|frightened)\s+of\s+(my|him|her|them|hi[ms]|my\s+(partner|husband|wife|boyfriend|girlfriend|spouse|ex))\b/i,
    /\b(hits?|hit|beats?|beat|punch|slaps?|chok(e|ed|es|ing)|strangl|shoves?|grab(s|bed)?)\s+me\b/i,
    /\b(threaten(s|ed)?|threat)\b.{0,40}\b(me|kill|hurt|leave|kids|children)\b/i,
    /\bwon'?t\s+(let|allow)\s+me\b/i,
    /\b(not\s+allowed|forbids?\s+me|forbidden)\s+to\b/i,
    /\bcontrols?\s+(my|who\s+I|where\s+I|what\s+I|the\s+money|all\s+the\s+money|everything|my\s+phone)\b/i,
    /\b(isolat(e|ed|es|ing)\s+me|cut\s+me\s+off\s+from)\b/i,
    /\b(monitors?|tracks?|checks?)\s+(my|me|my\s+phone|where\s+I)\b/i,
    /\btakes?\s+my\s+(phone|money|keys|passport|car)\b/i,
    /\b(coerc|forced?\s+me|made\s+me)\b.{0,30}\b(sex|do|stay|sign)\b/i,
    /\bif\s+I\s+(leave|try\s+to\s+leave|tell|call)\b.{0,40}\b(he|she|they|kill|hurt|take)\b/i,
  ],
};

export type CrisisCategory = "self_harm" | "abuse" | "none";

export interface CrisisResult {
  isCrisis: boolean;
  severity: "high" | "moderate" | "none";
  category: CrisisCategory;
  matchedKeywords: string[];
}

/**
 * Layer 1: Fast keyword scan (<1ms). Runs on every message.
 * Checks self-harm (high → moderate) then abuse / coercive control.
 */
export function detectCrisisKeywords(message: string): CrisisResult {
  // Self-harm — high severity first
  const high: string[] = [];
  for (const pattern of CRISIS_PATTERNS.high) {
    const match = message.match(pattern);
    if (match) high.push(match[0]);
  }
  if (high.length > 0) {
    return { isCrisis: true, severity: "high", category: "self_harm", matchedKeywords: high };
  }

  // Self-harm — moderate
  const moderate: string[] = [];
  for (const pattern of CRISIS_PATTERNS.moderate) {
    const match = message.match(pattern);
    if (match) moderate.push(match[0]);
  }
  if (moderate.length > 0) {
    return { isCrisis: true, severity: "moderate", category: "self_harm", matchedKeywords: moderate };
  }

  // Abuse / coercive control — always high; LLM confirms intimate-partner context.
  const abuse: string[] = [];
  for (const pattern of CRISIS_PATTERNS.abuse) {
    const match = message.match(pattern);
    if (match) abuse.push(match[0]);
  }
  if (abuse.length > 0) {
    return { isCrisis: true, severity: "high", category: "abuse", matchedKeywords: abuse };
  }

  return { isCrisis: false, severity: "none", category: "none", matchedKeywords: [] };
}

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
export async function logCrisisFlag(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  severity: "high" | "moderate",
  matchedKeywords: string[],
  llmConfirmed: boolean,
  message: string,
  category: CrisisCategory = "self_harm"
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
      keywords.category
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
    keywords.category
  );
  console.log(
    `[crisis] False positive cleared by LLM: "${keywords.matchedKeywords.join(", ")}"`
  );

  return { isCrisis: false };
}
