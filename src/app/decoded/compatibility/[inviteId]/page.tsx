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
 * /decoded/compatibility/[inviteId]
 * Server component that loads the compatibility report and verifies access.
 * If report doesn't exist yet, renders GenerateReport which auto-triggers generation.
 */
export default async function CompatibilityReportPage({ params }: PageProps) {
  const { inviteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/decoded');
  }

  // Load invite with compatibility report
  const { data: invite, error } = await supabase
    .from('decoded_invites')
    .select('inviter_id, recipient_id, inviter_name, recipient_email, compatibility_report, status')
    .eq('id', inviteId)
    .single();

  if (error || !invite) {
    notFound();
  }

  // Verify user is part of this invite
  if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
    notFound();
  }

  // If no report yet, auto-trigger generation client-side
  if (!invite.compatibility_report) {
    return <GenerateReport inviteId={inviteId} />;
  }

  const inviterName = invite.inviter_name || 'Person A';
  const recipientName = invite.recipient_email?.split('@')[0] || 'Person B';

  return (
    <CompatibilityReportViewer
      report={invite.compatibility_report}
      inviterName={inviterName}
      recipientName={recipientName}
    />
  );
}
