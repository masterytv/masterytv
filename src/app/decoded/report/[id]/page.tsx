import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import ReportViewer from './ReportViewer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Decoded Report | Mastery',
  description: 'Your personalized personality report powered by 13 validated instruments.',
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shared?: string }>;
}

/**
 * Verify that a user has shared access to another user's report.
 * Returns the report data if access is granted, null otherwise.
 * 
 * Access is granted when:
 * - A decoded_invite exists between the viewer and the report owner
 * - The invite has share_with_human === 'full'
 * - The invite is in 'consented' or 'connected' status
 */
async function verifySharedAccess(viewerId: string, reportId: string) {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the report to get the owner ID
  const { data: report } = await admin
    .from('assessment_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (!report) return null;

  const ownerId = report.user_id;

  // Check if there's a valid invite with full sharing between these two users
  const { data: invite } = await admin
    .from('decoded_invites')
    .select('id, share_with_human, status')
    .or(`and(inviter_id.eq.${viewerId},recipient_id.eq.${ownerId}),and(inviter_id.eq.${ownerId},recipient_id.eq.${viewerId})`)
    .in('status', ['consented', 'connected'])
    .eq('share_with_human', 'full')
    .limit(1)
    .single();

  if (!invite) return null;

  // Also load scores (using admin — bypasses RLS for shared access)
  const { data: scores } = await admin
    .from('assessment_scores')
    .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
    .eq('assessment_id', report.assessment_id);

  return { report, scores: scores ?? [] };
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { shared } = await searchParams;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/decoded/auth');
  }

  // Standard path: user viewing their own report (RLS enforces ownership)
  const { data: ownReport } = await supabase
    .from('assessment_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (ownReport) {
    // User owns this report — standard rendering
    const { data: scores } = await supabase
      .from('assessment_scores')
      .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
      .eq('assessment_id', ownReport.assessment_id);

    return (
      <ReportViewer
        report={ownReport}
        scores={scores ?? []}
      />
    );
  }

  // Shared path: user viewing someone else's report via compatibility sharing
  if (shared === 'true') {
    const result = await verifySharedAccess(user.id, id);
    if (result) {
      return (
        <ReportViewer
          report={result.report}
          scores={result.scores}
        />
      );
    }
  }

  // No access
  notFound();
}
