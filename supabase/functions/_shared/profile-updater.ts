/**
 * Profile Updater — Behavioral signal → coach profile delta logic.
 *
 * Analyzes behavioral signals extracted by the post-processor and applies
 * conservative adjustments to the user's coach_profiles dimensions over time.
 *
 * Design principles:
 * - Minimum 5 messages before any updates (avoid overreacting to first impressions)
 * - Small deltas per signal (0.02-0.05) — convergence over 20+ interactions
 * - All values clamped to [0.0, 1.0]
 * - Snapshots profile history after each update for the evolution chart
 *
 * Architecture: implementation_plan.md — Component 3
 */

import { createSupabaseClient } from "./supabase.ts";
import type { ProfileSignals, ProfileUpdateResult } from "./debug-types.ts";

// Minimum messages before we start updating the profile
const MIN_MESSAGES_FOR_UPDATE = 5;

// Delta magnitudes — intentionally small for gradual adaptation
const DELTA = {
  SMALL: 0.02,
  MEDIUM: 0.03,
  LARGE: 0.05,
};

/**
 * Compute and apply coach profile updates based on behavioral signals.
 *
 * @param userId - The user whose profile to update
 * @param signals - Behavioral signals extracted by the post-processor
 * @param messageCount - Total message count for this user (for threshold gating)
 * @returns Result of the update attempt (applied or not, with deltas)
 */
export async function updateCoachProfile(
  userId: string,
  signals: ProfileSignals,
  messageCount: number
): Promise<ProfileUpdateResult> {
  // Gate: don't update until we have enough data to be meaningful
  if (messageCount < MIN_MESSAGES_FOR_UPDATE) {
    return {
      applied: false,
      reason: "below_threshold",
      message_count: messageCount,
      deltas: {},
      confidence_before: 0,
      confidence_after: 0,
    };
  }

  // Check if there are any actionable signals
  const hasSignals =
    signals.directness_preference !== null ||
    signals.response_to_challenge !== null ||
    signals.action_orientation !== null ||
    signals.engagement_level !== "medium" ||
    signals.emotional_state !== "neutral" ||
    signals.preferred_depth !== "moderate";

  if (!hasSignals) {
    return {
      applied: false,
      reason: "no_signals",
      message_count: messageCount,
      deltas: {},
      confidence_before: 0,
      confidence_after: 0,
    };
  }

  const supabase = createSupabaseClient();

  // Load current profile
  const { data: profile, error: loadError } = await supabase
    .from("coach_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (loadError || !profile) {
    console.error("[profile-updater] Failed to load profile:", loadError?.message);
    return {
      applied: false,
      reason: `load_error: ${loadError?.message ?? "no profile found"}`,
      message_count: messageCount,
      deltas: {},
      confidence_before: 0,
      confidence_after: 0,
    };
  }

  // ── Compute deltas from signals ──
  const deltas: Record<string, { before: number; after: number; delta: number }> = {};

  function applyDelta(dimension: string, delta: number) {
    const before = Number(profile[dimension] ?? 0.5);
    const after = Math.max(0, Math.min(1, before + delta));
    if (Math.abs(after - before) > 0.001) {
      deltas[dimension] = { before, after, delta: after - before };
    }
  }

  // Signal: directness_preference
  if (signals.directness_preference === "direct") {
    applyDelta("directness", DELTA.MEDIUM);
  } else if (signals.directness_preference === "diplomatic") {
    applyDelta("directness", -DELTA.MEDIUM);
  }

  // Signal: response_to_challenge
  if (signals.response_to_challenge === "welcomed") {
    applyDelta("challenge_level", DELTA.LARGE);
  } else if (signals.response_to_challenge === "resisted") {
    applyDelta("challenge_level", -DELTA.LARGE);
    // If they resist challenge, also increase warmth slightly
    applyDelta("warmth", DELTA.SMALL);
  } else if (signals.response_to_challenge === "deflected") {
    applyDelta("challenge_level", -DELTA.SMALL);
  }

  // Signal: emotional_state
  if (signals.emotional_state === "vulnerable") {
    // When vulnerable, lean into warmth and lower challenge
    applyDelta("warmth", DELTA.MEDIUM);
    applyDelta("challenge_level", -DELTA.SMALL);
  } else if (signals.emotional_state === "positive") {
    // Positive engagement — can push a bit more
    applyDelta("pacing", DELTA.SMALL);
  } else if (signals.emotional_state === "stressed") {
    // Stressed — give more space
    applyDelta("pacing", -DELTA.SMALL);
  }

  // Signal: engagement_level
  if (signals.engagement_level === "high") {
    applyDelta("pacing", DELTA.SMALL);
  } else if (signals.engagement_level === "low") {
    applyDelta("pacing", -DELTA.MEDIUM);
  }

  // Signal: action_orientation
  if (signals.action_orientation === "wants_action") {
    // More prescriptive (lower autonomy), higher accountability
    applyDelta("autonomy", -DELTA.SMALL);
    applyDelta("accountability", DELTA.MEDIUM);
  } else if (signals.action_orientation === "wants_reflection") {
    // More socratic (higher autonomy), lower accountability push
    applyDelta("autonomy", DELTA.MEDIUM);
    applyDelta("accountability", -DELTA.SMALL);
  }

  // Signal: preferred_depth
  if (signals.preferred_depth === "deep") {
    applyDelta("evidence_style", DELTA.SMALL); // Deeper = more narrative/stories
  } else if (signals.preferred_depth === "surface") {
    applyDelta("evidence_style", -DELTA.SMALL); // Surface = more data-driven
  }

  // If no meaningful deltas computed, skip the update
  if (Object.keys(deltas).length === 0) {
    return {
      applied: false,
      reason: "no_meaningful_deltas",
      message_count: messageCount,
      deltas: {},
      confidence_before: Number(profile.confidence ?? 0.3),
      confidence_after: Number(profile.confidence ?? 0.3),
    };
  }

  // ── Apply updates ──
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const [dim, { after }] of Object.entries(deltas)) {
    updates[dim] = after;
  }

  // Update confidence: grows with message count, caps at 0.95
  const confidenceBefore = Number(profile.confidence ?? 0.3);
  const confidenceAfter = Math.min(0.95, 0.3 + messageCount * 0.01);
  updates.confidence = confidenceAfter;

  // Update source to indicate behavioral adaptation
  const currentSource = profile.source ?? "default";
  if (currentSource === "default") {
    updates.source = "behavioral";
  } else if (currentSource === "self_reported") {
    updates.source = "blended";
  }
  // If already 'behavioral' or 'blended', keep it

  const { error: updateError } = await supabase
    .from("coach_profiles")
    .update(updates)
    .eq("user_id", userId);

  if (updateError) {
    console.error("[profile-updater] Failed to update profile:", updateError.message);
    return {
      applied: false,
      reason: `update_error: ${updateError.message}`,
      message_count: messageCount,
      deltas,
      confidence_before: confidenceBefore,
      confidence_after: confidenceBefore,
    };
  }

  // ── Snapshot to profile history ──
  try {
    const snapshot: Record<string, unknown> = {
      user_id: userId,
      message_count: messageCount,
      directness: deltas.directness?.after ?? profile.directness,
      framing: deltas.framing?.after ?? profile.framing,
      warmth: deltas.warmth?.after ?? profile.warmth,
      autonomy: deltas.autonomy?.after ?? profile.autonomy,
      pacing: deltas.pacing?.after ?? profile.pacing,
      evidence_style: deltas.evidence_style?.after ?? profile.evidence_style,
      accountability: deltas.accountability?.after ?? profile.accountability,
      challenge_level: deltas.challenge_level?.after ?? profile.challenge_level,
      trust_level: profile.trust_level,
      confidence: confidenceAfter,
      source: updates.source ?? currentSource,
      signals_applied: signals,
      dimensions_changed: Object.keys(deltas),
    };

    await supabase.from("coach_profile_history").insert(snapshot);
  } catch (e) {
    // History snapshot failure shouldn't block the update
    console.warn("[profile-updater] Failed to snapshot history:", (e as Error).message);
  }

  console.log(
    `[profile-updater] Updated ${Object.keys(deltas).length} dimensions for user ${userId}:`,
    Object.entries(deltas)
      .map(([k, v]) => `${k}: ${v.before.toFixed(3)} → ${v.after.toFixed(3)}`)
      .join(", ")
  );

  return {
    applied: true,
    reason: "updated",
    message_count: messageCount,
    deltas,
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
  };
}
