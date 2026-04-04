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
};

export interface CrisisResult {
  isCrisis: boolean;
  severity: "high" | "moderate" | "none";
  matchedKeywords: string[];
}

/**
 * Layer 1: Fast keyword scan (<1ms). Runs on every message.
 * Returns severity: high (immediate danger), moderate (concerning), none.
 */
export function detectCrisisKeywords(message: string): CrisisResult {
  const matchedKeywords: string[] = [];

  // Check high-severity patterns first
  for (const pattern of CRISIS_PATTERNS.high) {
    const match = message.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
    }
  }

  if (matchedKeywords.length > 0) {
    return { isCrisis: true, severity: "high", matchedKeywords };
  }

  // Check moderate patterns
  for (const pattern of CRISIS_PATTERNS.moderate) {
    const match = message.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
    }
  }

  if (matchedKeywords.length > 0) {
    return { isCrisis: true, severity: "moderate", matchedKeywords };
  }

  return { isCrisis: false, severity: "none", matchedKeywords: [] };
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
  message: string
): Promise<void> {
  try {
    await supabase.from("crisis_flags").insert({
      user_id: userId,
      severity,
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

  // High severity → immediate response. Moderate → LLM context check.
  let confirmedCrisis = true;
  if (keywords.severity === "moderate") {
    confirmedCrisis = await confirmCrisisWithLLM(
      message,
      keywords.matchedKeywords
    );
  }

  if (confirmedCrisis) {
    // Log confirmed crisis
    await logCrisisFlag(
      supabase,
      userId,
      keywords.severity,
      keywords.matchedKeywords,
      true,
      message
    );

    return {
      isCrisis: true,
      response: buildCrisisResponse(keywords.severity),
      severity: keywords.severity,
    };
  }

  // False positive — log for keyword refinement
  await logCrisisFlag(
    supabase,
    userId,
    keywords.severity,
    keywords.matchedKeywords,
    false,
    message
  );
  console.log(
    `[crisis] False positive cleared by LLM: "${keywords.matchedKeywords.join(", ")}"`
  );

  return { isCrisis: false };
}
