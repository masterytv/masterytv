import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CompatibilityReportViewer from './CompatibilityReportViewer';
import GenerateReport from './GenerateReport';

export const metadata: Metadata = {
  title: 'Compatibility Report — Decoded by MasteryTV',
  description: 'See how two personalities interact — what clicks, where you clash, and your superpower together.',
  robots: { index: false, follow: false },
};

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
      inviter_report_id, recipient_report_id
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

  return (
    <CompatibilityReportViewer
      report={report}
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
    />
  );
}
