/**
 * Anti-Nagging Protocol — Per-topic strike tracking for proactive outreach.
 *
 * S5.4: Prevents the coach from being annoying.
 * 3-strike escalation → auto-pause per topic.
 *
 * Architecture: ARCHITECTURE.md §5.6
 *
 * Strike logic:
 * - Strike 0: Initial proactive message (references specific context)
 * - Strike 1: 24h no response → softer follow-up, different angle
 * - Strike 2: 48h no response → explicit pause offer
 * - Strike 3: Topic paused — "I'll stop checking in. Say 'revisit X' when ready."
 *
 * Special topic "__all__" pauses ALL proactive outreach for a user.
 */

import { createSupabaseClient } from "./supabase.ts";

export type NaggingTone = "initial" | "softer" | "final_pause";

export interface NaggingState {
  canSend: boolean;
  strikeCount: number;
  isPaused: boolean;
  tone: NaggingTone;
}

// ─── CHECK STATE ────────────────────────────────────────────────────────

/**
 * Check if we can send a proactive message for this topic.
 * Returns the current state and the appropriate tone to use.
 */
export async function checkNaggingState(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  topic: string
): Promise<NaggingState> {
  // Check for global pause first
  const { data: globalPause } = await supabase
    .from("nagging_tracker")
    .select("is_paused")
    .eq("user_id", userId)
    .eq("topic", "__all__")
    .maybeSingle();

  if (globalPause?.is_paused) {
    return { canSend: false, strikeCount: 0, isPaused: true, tone: "initial" };
  }

  // Check topic-specific state
  const { data: tracker } = await supabase
    .from("nagging_tracker")
    .select("strike_count, is_paused, last_strike_at")
    .eq("user_id", userId)
    .eq("topic", topic)
    .maybeSingle();

  if (!tracker) {
    // No record yet — first time reaching out on this topic
    return { canSend: true, strikeCount: 0, isPaused: false, tone: "initial" };
  }

  if (tracker.is_paused) {
    return {
      canSend: false,
      strikeCount: tracker.strike_count,
      isPaused: true,
      tone: "initial",
    };
  }

  if (tracker.strike_count >= 3) {
    return {
      canSend: false,
      strikeCount: tracker.strike_count,
      isPaused: true,
      tone: "final_pause",
    };
  }

  // Determine tone based on strike count
  const tone: NaggingTone =
    tracker.strike_count === 0
      ? "initial"
      : tracker.strike_count === 1
        ? "softer"
        : "final_pause";

  return {
    canSend: true,
    strikeCount: tracker.strike_count,
    isPaused: false,
    tone,
  };
}

// ─── RECORD STRIKE ──────────────────────────────────────────────────────

/**
 * Record that we sent a proactive message and the user hasn't responded.
 * Increments the strike counter. After 3 strikes, auto-pauses the topic.
 */
export async function recordStrike(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  topic: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("nagging_tracker")
    .select("id, strike_count")
    .eq("user_id", userId)
    .eq("topic", topic)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existing) {
    await supabase.from("nagging_tracker").insert({
      user_id: userId,
      topic,
      strike_count: 1,
      is_paused: false,
      last_strike_at: now,
    });
  } else {
    const newCount = existing.strike_count + 1;
    await supabase
      .from("nagging_tracker")
      .update({
        strike_count: newCount,
        is_paused: newCount >= 3,
        last_strike_at: now,
      })
      .eq("id", existing.id);
  }
}

// ─── RESET STRIKES ──────────────────────────────────────────────────────

/**
 * Reset strikes when a user responds to outreach on this topic.
 * Called from channel-router when any user message is received.
 */
export async function resetStrikes(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  topic: string
): Promise<void> {
  await supabase
    .from("nagging_tracker")
    .update({
      strike_count: 0,
      is_paused: false,
      last_strike_at: null,
    })
    .eq("user_id", userId)
    .eq("topic", topic);
}

// ─── PAUSE / RESUME ─────────────────────────────────────────────────────

/**
 * Pause all proactive outreach for a user.
 * Triggered by user saying "pause", "stop", etc.
 */
export async function pauseAll(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<void> {
  // Upsert the global pause flag
  await supabase
    .from("nagging_tracker")
    .upsert(
      {
        user_id: userId,
        topic: "__all__",
        is_paused: true,
        last_strike_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic" }
    );
}

/**
 * Pause a specific topic.
 */
export async function pauseTopic(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  topic: string
): Promise<void> {
  await supabase
    .from("nagging_tracker")
    .upsert(
      {
        user_id: userId,
        topic,
        is_paused: true,
        strike_count: 3,
        last_strike_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic" }
    );
}

/**
 * Resume a specific topic (user says "let's revisit X").
 */
export async function resumeTopic(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  topic: string
): Promise<void> {
  await supabase
    .from("nagging_tracker")
    .update({
      strike_count: 0,
      is_paused: false,
      last_strike_at: null,
    })
    .eq("user_id", userId)
    .eq("topic", topic);
}

/**
 * Resume all proactive outreach (clear global pause).
 */
export async function resumeAll(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<void> {
  await supabase
    .from("nagging_tracker")
    .update({
      strike_count: 0,
      is_paused: false,
      last_strike_at: null,
    })
    .eq("user_id", userId)
    .eq("topic", "__all__");
}
