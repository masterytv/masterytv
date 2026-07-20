import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/decoded/deny-upgrade
 *
 * Deny an upgrade request without changing the existing sharing level.
 * Clears upgrade_requested_level and upgrade_requested_by.
 *
 * Body: { inviteId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteId } = await req.json();

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
    }

    // Verify user is part of this invite
    const { data: invite } = await supabase
      .from('decoded_invites')
      .select('id, inviter_id, recipient_id')
      .eq('id', inviteId)
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Clear the upgrade request — sharing level stays the same. decoded_invites
    // is service-role-write-only (consent hardening 2026-07-19); the caller is
    // verified as a party above.
    const admin = createAdminClient();
    const { error } = await admin
      .from('decoded_invites')
      .update({
        upgrade_requested_level: null,
        upgrade_requested_by: null,
      })
      .eq('id', inviteId);

    if (error) {
      console.error('[deny-upgrade] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to deny' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[deny-upgrade] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
