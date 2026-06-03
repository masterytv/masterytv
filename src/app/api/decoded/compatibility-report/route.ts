import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/decoded/compatibility-report?inviteId=...
 *
 * Read-only cache layer — retrieves a previously generated compatibility report.
 * Generation has moved to the Supabase Edge Function (decoded-compatibility-report)
 * for architectural consistency with decoded-generate-report.
 *
 * The client component (GenerateReport.tsx) calls the Edge Function directly.
 * This route exists only for programmatic access to cached reports.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const inviteId = req.nextUrl.searchParams.get('inviteId');
  if (!inviteId) {
    return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
  }

  const { data: invite } = await supabase
    .from('decoded_invites')
    .select('compatibility_report, compatibility_report_inviter, compatibility_report_recipient, inviter_id, recipient_id, inviter_name, recipient_email, status')
    .eq('id', inviteId)
    .single();

  if (!invite || (invite.inviter_id !== user.id && invite.recipient_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isInviter = invite.inviter_id === user.id;

  // Per-user report with fallback to shared
  const report = isInviter
    ? (invite.compatibility_report_inviter ?? invite.compatibility_report)
    : (invite.compatibility_report_recipient ?? invite.compatibility_report);

  return NextResponse.json({
    report,
    status: invite.status,
    inviterName: invite.inviter_name,
    recipientEmail: invite.recipient_email,
  });
}

/**
 * POST /api/decoded/compatibility-report
 *
 * DEPRECATED — Generation has moved to the Supabase Edge Function.
 * This stub returns a redirect message so any old callers know to update.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'DEPRECATED',
      message: 'Compatibility report generation has moved to the Supabase Edge Function (decoded-compatibility-report). Use the Edge Function directly.',
    },
    { status: 410 }, // 410 Gone
  );
}
