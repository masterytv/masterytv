import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { claimPendingInvites } from "@/lib/decoded/claim-invites";
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

  // Auto-claim any pending invites for this user's email
  // and notify inviters when their recipient has completed the assessment
  if (user.email) {
    const claimedIds = await claimPendingInvites(supabase, user.id, user.email);

    // Fire-and-forget notifications for newly claimed invites
    if (claimedIds.length > 0) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://masterytv.com';
      for (const inviteId of claimedIds) {
        fetch(`${origin}/api/decoded/invite-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId }),
        }).catch((err) => console.error('[dashboard] notify error:', err));
      }
    }
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

  // Check for existing report for the latest completed assessment
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

  // Check onboarding state — show redo if user has started onboarding
  const { data: onboardingState } = await supabase
    .from("onboarding_state")
    .select("current_step")
    .eq("user_id", user.id)
    .maybeSingle();
  const onboardingStarted = onboardingState !== null;

  // Determine state
  type AssessmentState = "none" | "in-progress" | "completed";
  let state: AssessmentState = "none";
  if (completedAssessment) {
    state = "completed";
  } else if (inProgressAssessment) {
    state = "in-progress";
  }

  // Load invites sent BY this user (for invite tracker)
  const { data: sentInvites } = await supabase
    .from("decoded_invites")
    .select("id, recipient_email, status, created_at, completed_at, consented_at")
    .eq("inviter_id", user.id)
    .order("created_at", { ascending: false });

  // Load invites sent TO this user that need consent (for consent banner)
  const { data: receivedInvites } = await supabase
    .from("decoded_invites")
    .select("id, inviter_id, inviter_name, inviter_email, status, share_with_human, share_with_coach")
    .eq("recipient_id", user.id)
    .in("status", ["completed", "consented"]);

  // Map to component format
  const receivedWithNames = (receivedInvites ?? []).map((inv) => ({
    ...inv,
    inviterName: inv.inviter_name || "Someone",
    inviterEmail: inv.inviter_email || "",
  }));

  return (
    <DashboardHome
      userName={user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there"}
      state={state}
      answeredCount={answeredCount}
      totalQuestions={totalQuestions}
      reportId={reportId}
      assessmentId={completedAssessment?.id ?? inProgressAssessment?.id ?? null}
      onboardingComplete={onboardingStarted}
      hasInProgressRetake={!!completedAssessment && !!inProgressAssessment}
      sentInvites={sentInvites ?? []}
      receivedInvites={receivedWithNames}
    />
  );
}
