import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AssessmentEngine from "@/app/decoded/assess/AssessmentEngine";

export const metadata: Metadata = {
  title: "Decoded — Assessment",
  description: "Complete your Decoded personality assessment.",
  robots: { index: false, follow: false },
};

/**
 * /assess — Distraction-free assessment page (no sidebar, no nav).
 * 
 * Renders the assessment engine in fullscreen mode.
 * On completion, redirects to /dashboard.
 * 
 * Three states:
 *   1. Completed assessment → redirect to /dashboard (already done)
 *   2. In-progress → resume from saved position
 *   3. No assessment → start fresh
 */
export default async function AssessPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  const params = await searchParams;
  const isRetake = params.retake === '1';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  // Check for IN-PROGRESS assessment first — user may be resuming
  const { data: existingAssessment } = await supabase
    .from("assessments")
    .select("id, current_instrument, current_item_index, current_layer")
    .eq("user_id", user.id)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Check for COMPLETED assessment
  // Skip redirect if retaking OR if there's an in-progress assessment to resume
  if (!isRetake && !existingAssessment) {
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
      redirect("/dashboard");
    }
  }

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

  return (
    <AssessmentEngine
      userId={user.id}
      existingAssessmentId={existingAssessment?.id ?? null}
      savedProgress={savedProgress}
      resumeInstrument={existingAssessment?.current_instrument ?? null}
      resumeItemIndex={existingAssessment?.current_item_index ?? 0}
    />
  );
}
