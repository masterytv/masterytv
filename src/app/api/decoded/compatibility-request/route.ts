import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ShareLevel = 'type_compatibility' | 'full';
const VALID_LEVELS: ShareLevel[] = ['type_compatibility', 'full'];

/**
 * POST /api/decoded/compatibility-request
 *
 * Either party can initiate a compatibility sharing request.
 * This is Step 1 of the two-step flow:
 *   1. Party A requests (stores preference in upgrade_requested_*)
 *   2. Party B accepts (handled by invite-consent, computes mutual minimum)
 *
 * Body: { inviteId: string, level: 'type_compatibility' | 'full' }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteId, level } = await req.json();

    if (!inviteId || !VALID_LEVELS.includes(level)) {
      return NextResponse.json(
        { error: 'Missing inviteId or invalid level' },
        { status: 400 },
      );
    }

    // Verify user is either the inviter or recipient
    const { data: invite } = await supabase
      .from('decoded_invites')
      .select('id, inviter_id, recipient_id, status')
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

    // Allow requests on completed (initial) and consented/connected (re-request/upgrade)
    if (!['completed', 'consented', 'connected'].includes(invite.status)) {
      return NextResponse.json(
        { error: 'Both parties must have completed the assessment first' },
        { status: 400 },
      );
    }

    // Store the request — first party to act sets the preference. decoded_invites
    // is service-role-write-only (consent hardening 2026-07-19); the caller is
    // verified as a party above.
    const admin = createAdminClient();
    const { error } = await admin
      .from('decoded_invites')
      .update({
        upgrade_requested_level: level,
        upgrade_requested_by: user.id,
      })
      .eq('id', inviteId);

    if (error) {
      console.error('[compatibility-request] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to save request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[compatibility-request] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
