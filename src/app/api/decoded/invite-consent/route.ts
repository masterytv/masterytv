import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ShareLevel = 'none' | 'compatibility' | 'type_compatibility' | 'full';

const VALID_LEVELS: ShareLevel[] = ['none', 'type_compatibility', 'full'];

/**
 * Level hierarchy for computing the mutual minimum.
 * Higher number = more sharing. The agreed level is min(A, B).
 */
const LEVEL_RANK: Record<string, number> = {
  none: 0,
  compatibility: 1,
  type_compatibility: 1,
  full: 2,
};

function minLevel(a: string, b: string): ShareLevel {
  const rankA = LEVEL_RANK[a] ?? 0;
  const rankB = LEVEL_RANK[b] ?? 0;
  const minRank = Math.min(rankA, rankB);
  if (minRank >= 2) return 'full';
  if (minRank >= 1) return 'type_compatibility';
  return 'none';
}

/**
 * POST /api/decoded/invite-consent
 *
 * Step 2 of the compatibility flow — the second party accepts the request.
 * Computes the mutual minimum sharing level and connects both parties.
 *
 * Also handles revoking (unsharing) by passing shareLevel = 'none'.
 *
 * Body: { inviteId: string, shareLevel: 'type_compatibility' | 'full' | 'none' }
 *
 * Legacy support: also accepts { inviteId, shareWithHuman, shareWithCoach }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { inviteId } = body;

    // Support both new simplified format and legacy format
    const shareLevel: ShareLevel = body.shareLevel
      || body.shareWithHuman
      || 'none';

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
    }

    if (!VALID_LEVELS.includes(shareLevel)) {
      return NextResponse.json({ error: 'Invalid share level' }, { status: 400 });
    }

    // Verify this invite belongs to the current user (as either party)
    const { data: invite } = await supabase
      .from('decoded_invites')
      .select('id, inviter_id, recipient_id, status, recipient_report_id, upgrade_requested_level, upgrade_requested_by')
      .eq('id', inviteId)
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const isInviter = invite.inviter_id === user.id;
    const isRecipient = invite.recipient_id === user.id;

    if (!isInviter && !isRecipient) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Handle revoking (unsharing)
    const isRevoking = shareLevel === 'none';

    if (isRevoking) {
      const { error } = await supabase
        .from('decoded_invites')
        .update({
          share_with_human: 'none',
          share_with_coach: 'none',
          status: 'completed',
          consented_at: null,
          revoked_at: new Date().toISOString(),
          upgrade_requested_level: null,
          upgrade_requested_by: null,
        })
        .eq('id', inviteId);

      if (error) {
        console.error('[invite-consent] Revoke error:', error.message);
        return NextResponse.json({ error: 'Failed to revoke' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'revoked' });
    }

    // Compute the effective level: mutual minimum of both parties' preferences
    const requesterLevel = invite.upgrade_requested_level || shareLevel;
    const effectiveLevel = minLevel(requesterLevel, shareLevel);

    // Update to consented with mutual minimum — clear upgrade request fields
    const { error } = await supabase
      .from('decoded_invites')
      .update({
        share_with_human: effectiveLevel,
        share_with_coach: effectiveLevel,
        status: 'consented',
        consented_at: new Date().toISOString(),
        revoked_at: null,
        upgrade_requested_level: null,
        upgrade_requested_by: null,
      })
      .eq('id', inviteId);

    if (error) {
      console.error('[invite-consent] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 });
    }

    // Unlock S5 for the accepting party
    await supabase.from('share_unlocks').insert({
      user_id: user.id,
      method: 'invite_consent',
      section_unlocked: 'S5',
    });

    // Set recipient_report_id if needed
    if (!invite.recipient_report_id && isRecipient) {
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

    // Compatibility report is generated on-demand when either user visits
    // the compatibility page — the Edge Function (decoded-compatibility-report)
    // handles generation. No fire-and-forget needed here.

    return NextResponse.json({
      success: true,
      status: 'consented',
      effectiveLevel,
    });
  } catch (error) {
    console.error('[invite-consent] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
