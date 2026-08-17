import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { claimPendingInvites, claimInviteById } from "@/lib/decoded/claim-invites";
import { getActiveDyad, getDyadConsent } from "@/lib/relatti/dashboard-dyad";
import { getRelationships } from "@/lib/relatti/relationships";
import { syncMyReportToSpine } from "@/lib/relatti/sync-my-report";
import { getTodaysRitual } from "@/lib/relatti/ritual";
import { resolveBetaAccess } from "@/lib/relatti/beta-survey";
import { getBrand } from "@/lib/platform/brand.server";
import { isBrandId, BRANDS, byBrand } from "@/lib/platform/brand";
import { originFromHeaders } from "@/lib/platform/origin";
import DashboardHome from "./DashboardHome";
import RelattiDashboard from "./RelattiDashboard";
import MoneyDashboard from "./MoneyDashboard";
import { getOrCreateBroadcastInviteUrl } from "@/lib/relatti/broadcast-invite";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return brandPageMetadata(brand.id, {
    title: byBrand(
      { relatti: "Dashboard — Relatti", masterytv: "Dashboard — Mastery", money: "Dashboard — MoneyTraits", heard: "Dashboard — HEARD" },
      brand.id,
    ),
    description: byBrand(
      {
        relatti: "Your relationship dashboard. Assessment, blueprint, and coaching in one place.",
        masterytv: "Your personal mastery dashboard. Assessment, report, and coaching in one place.",
        money: "Your money dashboard. Your trait profile, decisions, and coaching in one place.",
        heard: "Your account.",
      },
      brand.id,
    ),
    noindex: true,
  });
}

/**
 * /dashboard — Unified home page.
 * Determines user's assessment state and passes it to the client component.
 * 
 * States:
 *   1. No assessment → show "Start Assessment" CTA
 *   2. In-progress → show "Continue Assessment" with progress info
 *   3. Completed → show Report, Coach, Share, Retake cards
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; invite?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  // Resolved ONCE, here, because everything below depends on it: which surface
  // renders, AND which program's assessment/report this dashboard is about.
  // ?brand= override (preview on any host) wins on the first request; otherwise
  // cookie/host via getBrand(). Hoisted from further down in PC2.1d — the
  // assessment reads sit above where this used to live, and picking a report
  // without knowing the brand is what put MasteryTV report ids on Relatti dyads.
  const params = await searchParams;
  const brandId = isBrandId(params.brand) ? params.brand : (await getBrand()).id;

  // Invite/share links must use the domain the user is actually on (relatti.com
  // for a Relatti user), NOT the static NEXT_PUBLIC_APP_URL (= masterytv.com).
  const appUrl = originFromHeaders(await headers());

  // Auto-claim any pending invites for this user's email
  // and notify inviters when their recipient has completed the assessment
  if (user.email) {
    const claimedIds = await claimPendingInvites(supabase, user.id, user.email);

    // Fire-and-forget notifications for newly claimed invites
    if (claimedIds.length > 0) {
      for (const inviteId of claimedIds) {
        fetch(`${appUrl}/api/decoded/invite-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId }),
        }).catch((err) => console.error('[dashboard] notify error:', err));
      }
    }

    // Copy/paste (broadcast) invite links have no recipient email to match on, so
    // claimPendingInvites can't link them. The invite id rides through sign-up +
    // the assessment in the `pending_invite` cookie (set on the invite landing),
    // with a ?invite= param as a fallback. Claim it by id so the dyad forms.
    const { invite: inviteParam } = await searchParams;
    const pendingInvite = inviteParam || (await cookies()).get("pending_invite")?.value;
    if (pendingInvite) {
      await claimInviteById(user.id, user.email, pendingInvite);
    }
  }

  // The dashboard shows THIS BRAND'S assessment, not "the user's latest across
  // brands". Before PC2.1 a dual-brand user's most recently completed program
  // won both dashboards — and `reportId` below (derived from this row) is what
  // syncMyReportToSpine stamps onto the dyad, so an unscoped pick here would put
  // a MasteryTV report id on a Relatti dyad.
  // (PC2.1d — directives/ASSESSMENT_PROGRAM_SCOPING.md.)
  const program = BRANDS[brandId].programSlug;

  // Check for COMPLETED assessment (exclude superseded retakes)
  const { data: completedAssessment } = await supabase
    .from("assessments")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .eq("program", program)
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
    .eq("program", program)
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
    .neq("recipient_email", "broadcast")
    .order("created_at", { ascending: false });

  // Stable "broadcast" invite for copy-link sharing (persistent /invite/[id]
  // URL that works for clipboard copies where a recipient isn't known upfront).
  const inviteUrl = await getOrCreateBroadcastInviteUrl(user, appUrl, reportId, program);

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

  // PB2: resolve the user's active relationship dyad (null for solo users).
  const dyad = await getActiveDyad(supabase, user.id);

  const userName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  // PB2: pick the surface by active brand (`brandId` resolved at the top —
  // the program-scoped assessment reads above need it).
  if (brandId === "relatti") {
    // Keep the dyad spine current so each partner's status is visible to the
    // other (the recipient_report_id backfill gap), then resolve all of the
    // user's relationships for the dashboard cards.
    await syncMyReportToSpine(user.id, reportId);
    const assessmentStatus =
      state === "completed" ? "completed" : state === "in-progress" ? "in_progress" : "not_started";
    const relationships = await getRelationships(supabase, user.id, assessmentStatus);

    // Consent control + ritual hang off the primary (most active) relationship.
    const primaryEngagementId = relationships[0]?.engagementId ?? dyad?.engagementId ?? null;
    const consent = primaryEngagementId ? await getDyadConsent(supabase, primaryEngagementId, user.id) : null;

    // Day-14 beta check-in nudge: due when the before-survey is ≥14 days old
    // and the after-survey hasn't been done (reads the user's own rows via RLS).
    const { data: surveyRows } = await supabase
      .from("beta_surveys")
      .select("phase, created_at")
      .eq("user_id", user.id);
    const beforeSurvey = surveyRows?.find((r) => r.phase === "before");
    const checkinDue =
      !!beforeSurvey &&
      !surveyRows?.some((r) => r.phase === "after") &&
      Date.now() - new Date(beforeSurvey.created_at).getTime() >= 14 * 86400000;

    // Beta access resolution: auto-redeem the /beta pre-registration cookie
    // (post-assessment, so the CSI baseline exists) and auto-enroll partners
    // of existing testers. See resolveBetaAccess for the full contract.
    const betaState = await resolveBetaAccess(
      { id: user.id, email: user.email },
      {
        assessmentCompleted: state === "completed",
        offerCookie: (await cookies()).get("beta_offer")?.value,
        hasBeforeSurvey: !!beforeSurvey,
      }
    );
    // Daily connection ritual (§5.9) — only meaningful once they have a profile.
    const ritual =
      state === "completed" ? await getTodaysRitual(supabase, user.id, dyad) : null;
    return (
      <RelattiDashboard
        userName={userName}
        state={state}
        reportId={reportId}
        dyad={dyad}
        relationships={relationships}
        inviteUrl={inviteUrl}
        consent={consent}
        ritual={ritual}
        checkinDue={checkinDue}
        betaJustUnlocked={betaState.justUnlocked}
        betaNeedsCheckin={betaState.needsBeforeCheckin}
        betaRedeemError={betaState.redeemError}
      />
    );
  }

  // Money's bespoke surface (Decision Room + Money OS) is a leaf; this placeholder
  // keeps money's dashboard OFF the executive DashboardHome until it ships (the
  // A-2 wrong-surface leak — a plain `if (brandId === "relatti")` above silently
  // sent every non-relatti brand, money included, to the executive home).
  if (brandId === "money") {
    return (
      <MoneyDashboard
        userName={userName}
        hasAssessment={state === "completed"}
        userId={user.id}
        programSlug={program}
      />
    );
  }

  // HEARD has no dashboard, and that is the design rather than a stub.
  // INTEGRATION_EXPERIENCE §0 inverts the engine's assess → report → coach into
  // tell → be met → be placed → then measure, so the conversation IS the
  // product: the program's module set is bare CORE, its battery is empty until
  // I7.1, and its report kind is the one that refuses to render. A landing
  // surface here would have to summarize somebody's account back at them in
  // cards, which is the "experience as the protagonist" failure the whole
  // vertical is designed against. Send them to the conversation instead.
  if (brandId === "heard") {
    redirect("/dashboard/chat");
  }

  return (
    <DashboardHome
      dyad={dyad}
      userName={userName}
      state={state}
      answeredCount={answeredCount}
      totalQuestions={totalQuestions}
      reportId={reportId}
      assessmentId={completedAssessment?.id ?? inProgressAssessment?.id ?? null}
      onboardingComplete={onboardingStarted}
      hasInProgressRetake={!!completedAssessment && !!inProgressAssessment}
      sentInvites={sentInvites ?? []}
      receivedInvites={receivedWithNames}
      inviteUrl={inviteUrl}
    />
  );
}
