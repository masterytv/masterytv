import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CompatibilityReportViewer from './CompatibilityReportViewer';

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

  // If no report yet, show generating state
  if (!invite.compatibility_report) {
    return (
      <div className="compat-container">
        <div className="compat-loading">
          <div className="compat-loading__spinner" />
          <p className="compat-loading__text">
            Your compatibility report is being generated...
          </p>
          <p className="compat-loading__text" style={{ opacity: 0.5 }}>
            This usually takes 15–30 seconds. Refresh to check.
          </p>
        </div>
      </div>
    );
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
