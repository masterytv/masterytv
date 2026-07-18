import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import AssessmentEngine from "@/app/decoded/assess/AssessmentEngine";
import { getBrand } from "@/lib/platform/brand.server";
import { byBrand } from "@/lib/platform/brand";
import { getBattery } from "@/lib/decoded/instruments/batteries";
import { claimPendingInvites, isUserInvitee } from "@/lib/decoded/claim-invites";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return brandPageMetadata(brand.id, {
    title: byBrand({ relatti: "Your Assessment — Relatti", masterytv: "Decoded — Assessment", money: "Money Maps — Assessment" }, brand.id),
    description:
      brand.id === "relatti"
        ? "Complete your Relatti relationship assessment."
        : "Complete your Decoded personality assessment.",
    noindex: true,
  });
}

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
    redirect("/login");
  }

  // Invitees are sent straight here after sign-up. Claim any pending invite for
  // their email so the dyad links now (idempotent, email-based) — they don't
  // need to detour through the dashboard for the partner link to form.
  if (user.email) {
    await claimPendingInvites(supabase, user.id, user.email).catch(() => []);
  }

  // Invitees (the invited partner in a dyad) skip the "invite someone" screen —
  // they were the one invited. Resolved after the claim so a fresh invitee is
  // already linked.
  const invitee = await isUserInvitee(supabase, user.id, user.email).catch(() => false);

  // Every assessment read below is scoped to the ACTIVE BRAND'S PROGRAM — a user
  // holds at most one assessment per program, not one overall. Resolved here (it
  // used to sit further down, next to getBattery) because the resume + redirect
  // checks are meaningless without it. (PC2.1c — ASSESSMENT_PROGRAM_SCOPING.md.)
  const brand = await getBrand();
  const program = brand.programSlug;

  // Check for IN-PROGRESS assessment first — user may be resuming.
  // Program-scoped: without it, a Relatti user with an abandoned MasteryTV
  // assessment resumes the WRONG BATTERY — existingAssessmentId points at the
  // general assessment while `battery` below is the relationship set, so answers
  // land against a mismatched instrument list.
  const { data: existingAssessment } = await supabase
    .from("assessments")
    .select("id, current_instrument, current_item_index, current_layer")
    .eq("user_id", user.id)
    .eq("program", program)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Check for COMPLETED assessment
  // Skip redirect if retaking OR if there's an in-progress assessment to resume.
  // Program-scoped: this check had no program filter, so ANY completed
  // assessment bounced the user to /dashboard. That is why tom@masterytv.com
  // could never take the Relatti assessment despite relatti.com serving the
  // right battery — he was redirected before ever reaching it.
  if (!isRetake && !existingAssessment) {
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

  // Program-aware battery: Relatti (relationship) gets the short relationship
  // set; MasteryTV (general) the full Core + adaptive add-ons. Resolved from the
  // active brand's program (by host in prod, ?brand= override on staging) —
  // `program` is resolved above, where the scoped reads need it.
  const { instruments, enableAddons, estimatedMinutes, relationshipMode } =
    getBattery(program);

  return (
    <AssessmentEngine
      userId={user.id}
      existingAssessmentId={existingAssessment?.id ?? null}
      savedProgress={savedProgress}
      resumeInstrument={existingAssessment?.current_instrument ?? null}
      resumeItemIndex={existingAssessment?.current_item_index ?? 0}
      battery={instruments}
      program={program}
      enableAddons={enableAddons}
      estimatedMinutes={estimatedMinutes}
      relationshipMode={relationshipMode}
      isInvitee={invitee}
    />
  );
}
