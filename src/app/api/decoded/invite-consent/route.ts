import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ShareLevel = 'none' | 'compatibility' | 'type_compatibility' | 'full';

const VALID_LEVELS: ShareLevel[] = ['none', 'compatibility', 'type_compatibility', 'full'];

/**
 * POST /api/decoded/invite-consent
 * Recipient sets their sharing preferences for an invite.
 * This is the consent gate — nothing is shared until the recipient explicitly allows it.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteId, shareWithHuman, shareWithCoach } = await req.json();

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
    }

    if (!VALID_LEVELS.includes(shareWithHuman) || !VALID_LEVELS.includes(shareWithCoach)) {
      return NextResponse.json({ error: 'Invalid share level' }, { status: 400 });
    }

    // Verify this invite belongs to the current user (as recipient)
    const { data: invite } = await supabase
      .from('decoded_invites')
      .select('id, recipient_id, status, recipient_report_id')
      .eq('id', inviteId)
      .single();

    if (!invite || invite.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Update sharing preferences + consent
    const isRevoking = shareWithHuman === 'none' && shareWithCoach === 'none';

    const { error } = await supabase
      .from('decoded_invites')
      .update({
        share_with_human: shareWithHuman,
        share_with_coach: shareWithCoach,
        status: isRevoking ? 'completed' : 'consented',
        consented_at: isRevoking ? null : new Date().toISOString(),
        revoked_at: isRevoking ? new Date().toISOString() : null,
      })
      .eq('id', inviteId);

    if (error) {
      console.error('[invite-consent] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 });
    }

    // If consenting (not revoking), unlock S5 for recipient + trigger report
    if (!isRevoking) {
      await supabase.from('share_unlocks').insert({
        user_id: user.id,
        method: 'invite_consent',
        section_unlocked: 'S5',
      });
      // Ignore insert errors (duplicate is fine — they may have already unlocked)

      // Set recipient_report_id if not already set
      if (!invite.recipient_report_id) {
        const { data: recipientReport } = await supabase
          .from('assessment_reports')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recipientReport) {
          await supabase
            .from('decoded_invites')
            .update({ recipient_report_id: recipientReport.id })
            .eq('id', inviteId);
        }
      }

      // Fire-and-forget: generate compatibility report
      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://masterytv.com';
      fetch(`${origin}/api/decoded/compatibility-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.get('cookie') || '',
        },
        body: JSON.stringify({ inviteId }),
      }).catch((err) => {
        console.error('[invite-consent] Compatibility report trigger error:', err);
      });
    }

    return NextResponse.json({ 
      success: true, 
      status: isRevoking ? 'revoked' : 'consented',
    });
  } catch (error) {
    console.error('[invite-consent] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
