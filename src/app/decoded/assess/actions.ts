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
