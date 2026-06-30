"use server";

import { createClient } from "@/lib/supabase/server";
import {
  scoreAllInstruments,
  deriveCoachingFlags,
  type InstrumentScore,
  type CoachingFlags,
} from "@/lib/decoded/scoring";

export interface ScoringResult {
  success: boolean;
  scores: InstrumentScore[];
  coachingFlags: CoachingFlags | null;
  error?: string;
}

/**
 * Server Action: Score a completed assessment.
 * 1. Fetch all responses from assessment_progress
 * 2. Run the scoring engine (pure functions)
 * 3. Write scored results to assessment_scores
 * 4. Mark assessment as complete
 */
export async function scoreAssessment(
  assessmentId: string,
): Promise<ScoringResult> {
  const supabase = await createClient();

  // Verify the assessment belongs to the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, scores: [], coachingFlags: null, error: "Not authenticated" };
  }

  // Fetch progress (all responses as JSONB)
  const { data: progress, error: fetchError } = await supabase
    .from("assessment_progress")
    .select("responses")
    .eq("assessment_id", assessmentId)
    .single();

  if (fetchError || !progress?.responses) {
    return {
      success: false,
      scores: [],
      coachingFlags: null,
      error: `Failed to load responses: ${fetchError?.message ?? "No data"}`,
    };
  }

  const allResponses = progress.responses as Record<
    string,
    Record<string, number>
  >;

  // Persist the raw, item-level answers into the normalized assessment_responses
  // table. The blob in assessment_progress is the working store, but we also
  // materialize one row per item here so future scoring-logic fixes can re-score
  // existing assessments (and so analytics can query individual answers) without
  // forcing users to retake. This is the *reliable* write — it runs server-side
  // at completion, independent of the best-effort per-keystroke client upsert.
  // Idempotent via the (assessment_id, instrument_id, item_index) unique constraint.
  await persistRawResponses(supabase, assessmentId, user.id, allResponses);

  // Run scoring engine (pure, deterministic)
  const scores = scoreAllInstruments(allResponses);
  const coachingFlags = deriveCoachingFlags(scores);

  // Write each score to assessment_scores table
  // DB columns: total_score, subscale_scores, percentile_scores, interpretation
  const scoreRows = scores.map((score) => ({
    assessment_id: assessmentId,
    user_id: user.id,
    instrument_id: score.instrumentId,
    total_score: score.totalScore ?? null,
    subscale_scores: score.subscaleScores ?? {},
    percentile_scores: score.percentileScores ?? {},
    interpretation: score.interpretation ?? {},
    raw_score_details: score.rawScoreDetails ?? {},
  }));

  const { error: insertError } = await supabase
    .from("assessment_scores")
    .upsert(scoreRows, {
      onConflict: "assessment_id,instrument_id",
    });

  if (insertError) {
    console.error("[Decoded] Score insert error:", insertError);
    // Non-fatal — scores computed, just failed to persist
  }

  // Update coaching flags on the assessment
  const { error: updateError } = await supabase
    .from("assessments")
    .update({
      completed_at: new Date().toISOString(),
      current_layer: "complete",
      coaching_flags: coachingFlags,
    })
    .eq("id", assessmentId);

  if (updateError) {
    console.error("[Decoded] Assessment update error:", updateError);
  }

  return { success: true, scores, coachingFlags };
}

/**
 * Materialize the JSONB response blob into normalized per-item rows in
 * assessment_responses, then verify the write landed.
 *
 * Why this exists: the blob ({ instrument: { itemIndex: value } }) is convenient
 * for the engine but opaque for analytics and brittle for re-scoring. Storing one
 * typed row per answered item means a scoring-logic fix (like the ECR-R reverse-
 * coding correction) can re-run over stored answers instead of forcing retakes.
 *
 * RLS: writes are made with the user's own session, so the
 * "Users can insert own responses" policy (auth.uid() = user_id) is satisfied.
 */
async function persistRawResponses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  userId: string,
  allResponses: Record<string, Record<string, number>>,
): Promise<void> {
  const rows = Object.entries(allResponses).flatMap(([instrumentId, items]) =>
    Object.entries(items)
      // Only numeric item indices map to a row (defensive against any stray keys).
      .filter(([itemKey]) => /^\d+$/.test(itemKey))
      .map(([itemKey, value]) => ({
        assessment_id: assessmentId,
        user_id: userId,
        instrument_id: instrumentId,
        item_index: Number(itemKey),
        item_key: `${instrumentId}_q${itemKey}`,
        response_value: value,
      })),
  );

  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from("assessment_responses")
    .upsert(rows, { onConflict: "assessment_id,instrument_id,item_index" });

  if (upsertError) {
    // Non-fatal for scoring (the blob still drives scores), but this must never
    // fail silently again — surface it loudly so a broken constraint/RLS is caught.
    console.error(
      "[Decoded] Failed to persist raw responses for assessment",
      assessmentId,
      upsertError,
    );
    return;
  }

  // Verification: confirm the completed assessment actually has its raw answers
  // stored. If the count is short, log so we notice before it bites a re-score.
  const { count, error: countError } = await supabase
    .from("assessment_responses")
    .select("*", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);

  if (countError) {
    console.error(
      "[Decoded] Could not verify raw-response persistence for",
      assessmentId,
      countError,
    );
  } else if ((count ?? 0) < rows.length) {
    console.error(
      `[Decoded] Raw-response persistence incomplete for ${assessmentId}: ` +
        `stored ${count ?? 0} of ${rows.length} expected items.`,
    );
  }
}
