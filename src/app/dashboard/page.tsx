import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DashboardHome from "./DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard — Mastery",
  description: "Your personal mastery dashboard. Assessment, report, and AI coaching in one place.",
  robots: { index: false, follow: false },
};

/**
 * /dashboard — Unified home page.
 * Determines user's assessment state and passes it to the client component.
 * 
 * States:
 *   1. No assessment → show "Start Assessment" CTA
 *   2. In-progress → show "Continue Assessment" with progress info
 *   3. Completed → show Report, Coach, Share, Retake cards
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  // Check for COMPLETED assessment (exclude superseded retakes)
  const { data: completedAssessment } = await supabase
    .from("assessments")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .neq("current_layer", "superseded")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Check for IN-PROGRESS assessment
  const { data: inProgressAssessment } = await supabase
    .from("assessments")
    .select("id, current_instrument, current_item_index")
    .eq("user_id", user.id)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get progress count if in-progress
  let answeredCount = 0;
  const totalQuestions = 113; // Core layer question count
  if (inProgressAssessment) {
    const { data: progress } = await supabase
      .from("assessment_progress")
      .select("responses")
      .eq("assessment_id", inProgressAssessment.id)
      .single();

    if (progress?.responses) {
      const responses = progress.responses as Record<string, Record<string, number>>;
      answeredCount = Object.values(responses).reduce(
        (sum, instrument) => sum + Object.keys(instrument).length,
        0
      );
    }
  }

  // Check for existing report
  let reportId: string | null = null;
  if (completedAssessment) {
    const { data: report } = await supabase
      .from("assessment_reports")
      .select("id")
      .eq("assessment_id", completedAssessment.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    reportId = report?.id ?? null;
  }

  // Check onboarding completion
  const { data: onboardingState } = await supabase
    .from("onboarding_state")
    .select("current_step")
    .eq("user_id", user.id)
    .single();
  const onboardingComplete = onboardingState?.current_step === "complete";

  // Determine state
  type AssessmentState = "none" | "in-progress" | "completed";
  let state: AssessmentState = "none";
  if (completedAssessment) {
    state = "completed";
  } else if (inProgressAssessment) {
    state = "in-progress";
  }

  return (
    <DashboardHome
      userName={user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there"}
      state={state}
      answeredCount={answeredCount}
      totalQuestions={totalQuestions}
      reportId={reportId}
      assessmentId={completedAssessment?.id ?? inProgressAssessment?.id ?? null}
      onboardingComplete={onboardingComplete}
    />
  );
}
