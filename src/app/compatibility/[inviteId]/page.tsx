import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { brandPageMetadata } from '@/lib/platform/brand-metadata';
import CompatibilityReportViewer from './CompatibilityReportViewer';
import GenerateReport from './GenerateReport';
import { getBrand } from '@/lib/platform/brand.server';
import { getDyadNeedToHear } from '@/lib/relatti/partner-need-to-hear';

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const isRelatti = brand.id === 'relatti';
  return brandPageMetadata(brand.id, {
    title: isRelatti ? 'Your Connection — Relatti' : 'Compatibility Report — Decoded by MasteryTV',
    description: isRelatti
      ? 'A deep look at the two of you — what clicks, where it gets hard, and how to love each other well.'
      : 'See how two personalities interact — what clicks, where you clash, and your superpower together.',
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ inviteId: string }>;
}

/**
 * /compatibility/[inviteId]
 * Server component that loads the per-user compatibility report and verifies access.
 * Each user sees their own voice-personalized version.
 * If no per-user report exists, falls back to shared, then triggers generation.
 */
export default async function CompatibilityReportPage({ params }: PageProps) {
  const { inviteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/decoded');
  }

  // Load invite with per-user reports, shared fallback, and sharing levels
  const { data: invite, error } = await supabase
    .from('decoded_invites')
    .select(`
      inviter_id, recipient_id, inviter_name, recipient_email,
      compatibility_report, compatibility_report_inviter, compatibility_report_recipient,
      status, share_with_human, share_with_coach,
      upgrade_requested_level, upgrade_requested_by,
      inviter_report_id, recipient_report_id, compatibility_generated_at
    `)
    .eq('id', inviteId)
    .single();

  if (error || !invite) {
    notFound();
  }

  // Verify user is part of this invite
  if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
    notFound();
  }

  const isInviter = invite.inviter_id === user.id;

  // Select the correct per-user report, falling back to shared
  const report = isInviter
    ? (invite.compatibility_report_inviter ?? invite.compatibility_report)
    : (invite.compatibility_report_recipient ?? invite.compatibility_report);

  // If no report yet, auto-trigger generation client-side
  if (!report) {
    return <GenerateReport inviteId={inviteId} />;
  }

  const inviterName = invite.inviter_name || 'Person A';
  const recipientName = invite.recipient_email?.split('@')[0] || 'Person B';

  // When share_with_human === 'full', provide the other person's Decoded report link
  // so the viewer can show a "View their Full Report" CTA
  let otherReportId: string | null = null;
  if (invite.share_with_human === 'full') {
    otherReportId = isInviter
      ? invite.recipient_report_id
      : invite.inviter_report_id;
  }

  // ── Staleness: did either partner retake (producing a newer report) since
  // this compatibility report was written? Compare each linked report's
  // generated_at to compatibility_generated_at. Read via the service role
  // because RLS hides the partner's assessment_reports row. The *_report_id
  // pointers are kept current by syncMyReportToSpine on dashboard load.
  let viewerRetook = false;
  let partnerRetook = false;
  const compatGenAt = invite.compatibility_generated_at
    ? new Date(invite.compatibility_generated_at).getTime()
    : null;
  if (compatGenAt) {
    const reportIds = [invite.inviter_report_id, invite.recipient_report_id].filter(Boolean) as string[];
    if (reportIds.length) {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: reps } = await admin
        .from('assessment_reports')
        .select('id, generated_at, created_at')
        .in('id', reportIds);
      const genOf = (rid: string | null): number | null => {
        const r = reps?.find((x) => x.id === rid);
        const t = r?.generated_at ?? r?.created_at;
        return t ? new Date(t).getTime() : null;
      };
      const inviterGen = genOf(invite.inviter_report_id);
      const recipientGen = genOf(invite.recipient_report_id);
      const viewerGen = isInviter ? inviterGen : recipientGen;
      const partnerGen = isInviter ? recipientGen : inviterGen;
      viewerRetook = viewerGen !== null && viewerGen > compatGenAt;
      partnerRetook = partnerGen !== null && partnerGen > compatGenAt;
    }
  }

  // "What each of you needs to hear" — the dyad pair. This report is the right
  // home for it: it exists only once BOTH partners have finished (founder,
  // 2026-07-16), so unlike the solo profile it can never be an empty promise.
  // Computed in CODE, not by the model: two independent LLM renders of the same
  // pair would contradict each other (the dyad-interpretive rule). Consent-gated
  // at share_with_human='full' inside the helper.
  const needToHear = await getDyadNeedToHear(user.id, { inviteId });

  return (
    <CompatibilityReportViewer
      report={report}
      needToHear={needToHear}
      inviterName={inviterName}
      recipientName={recipientName}
      shareWithHuman={invite.share_with_human || 'none'}
      isInviter={isInviter}
      inviteId={inviteId}
      otherPersonName={isInviter ? recipientName : inviterName}
      upgradeRequestedLevel={invite.upgrade_requested_level || null}
      upgradeRequestedBy={invite.upgrade_requested_by || null}
      userId={user.id}
      otherReportId={otherReportId}
      isStale={viewerRetook || partnerRetook}
      viewerRetook={viewerRetook}
      partnerRetook={partnerRetook}
    />
  );
}
