import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AssessmentEngine from "./AssessmentEngine";
import CompletedAssessment from "./CompletedAssessment";
import { getBrand } from "@/lib/platform/brand.server";
import { getBattery } from "@/lib/decoded/instruments/batteries";

export const metadata: Metadata = {
  title: "Decoded — Assessment",
  description: "Complete your Decoded personality assessment.",
  robots: { index: false, follow: false },
};

/**
 * /decoded/assess — Protected assessment page.
 * Three states:
 *   1. Completed assessment exists → show results
 *   2. In-progress assessment → resume from saved position
 *   3. No assessment → start fresh
 */
export default async function AssessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  // 1. Check for COMPLETED assessment first (exclude superseded retakes)
  const { data: completedAssessment } = await supabase
    .from("assessments")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .neq("current_layer", "superseded")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (completedAssessment) {
    // Load scores for completed assessment
    const { data: scores } = await supabase
      .from("assessment_scores")
      .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
      .eq("assessment_id", completedAssessment.id);

    return (
      <CompletedAssessment
        assessmentId={completedAssessment.id}
        scores={scores ?? []}
      />
    );
  }

  // 2. Check for IN-PROGRESS assessment
  const { data: existingAssessment } = await supabase
    .from("assessments")
    .select("id, current_instrument, current_item_index, current_layer")
    .eq("user_id", user.id)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Load progress if resuming
  let savedProgress: Record<string, Record<string, number>> | null = null;
  if (existingAssessment) {
    const { data: progress } = await supabase
      .from("assessment_progress")
      .select("responses, current_instrument, current_item_index")
      .eq("assessment_id", existingAssessment.id)
      .single();

    if (progress?.responses) {
      savedProgress = progress.responses as Record<string, Record<string, number>>;
    }
  }

  // 3. Render engine (either resuming or fresh) with the program-aware battery
  const brand = await getBrand();
  const { instruments, enableAddons, estimatedMinutes, relationshipMode } =
    getBattery(brand.programSlug);

  return (
    <AssessmentEngine
      userId={user.id}
      existingAssessmentId={existingAssessment?.id ?? null}
      savedProgress={savedProgress}
      resumeInstrument={existingAssessment?.current_instrument ?? null}
      resumeItemIndex={existingAssessment?.current_item_index ?? 0}
      battery={instruments}
      enableAddons={enableAddons}
      estimatedMinutes={estimatedMinutes}
      relationshipMode={relationshipMode}
    />
  );
}
