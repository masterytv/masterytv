import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/decoded/invite-upgrade
 * Request or approve an upgrade to the mutual sharing level.
 *
 * Actions:
 * - request: Store upgrade_requested_level + upgrade_requested_by
 * - approve: Upgrade share_with_human to the requested level and clear request
 * - deny: Clear the upgrade request without changing the level
 *
 * Why service role: The recipient may request an upgrade, but they only have
 * RLS UPDATE access to consent columns — not to upgrade_requested_* columns.
 * Similarly, the inviter approving needs to update share_with_human which the
 * inviter's RLS policy may not cover for recipient-initiated changes.
 */

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteId, action, level } = await req.json();

    if (!inviteId || !action) {
      return NextResponse.json({ error: 'Missing inviteId or action' }, { status: 400 });
    }

    // Use admin client for all operations — RLS doesn't grant cross-party
    // column access for upgrade fields.
    const admin = getAdmin();

    // Load the invite to verify membership
    const { data: invite, error: inviteError } = await admin
      .from('decoded_invites')
      .select('inviter_id, recipient_id, share_with_human, status, upgrade_requested_level, upgrade_requested_by')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      console.error('[invite-upgrade] Invite lookup error:', inviteError?.message);
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Must be part of this invite
    if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Must be in a connected state
    if (invite.status !== 'consented' && invite.status !== 'connected') {
      return NextResponse.json({ error: 'Invite is not connected' }, { status: 400 });
    }

    if (action === 'request') {
      if (!level) {
        return NextResponse.json({ error: 'Missing level' }, { status: 400 });
      }

      const { error: updateError } = await admin
        .from('decoded_invites')
        .update({
          upgrade_requested_level: level,
          upgrade_requested_by: user.id,
        })
        .eq('id', inviteId);

      if (updateError) {
        console.error('[invite-upgrade] Request update error:', updateError.message);
        return NextResponse.json({ error: 'Failed to save upgrade request' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      if (!invite.upgrade_requested_level) {
        return NextResponse.json({ error: 'No pending upgrade request' }, { status: 400 });
      }

      // Ensure the approver is NOT the one who requested
      if (invite.upgrade_requested_by === user.id) {
        return NextResponse.json({ error: 'Cannot approve your own request' }, { status: 400 });
      }

      const { error: updateError } = await admin
        .from('decoded_invites')
        .update({
          share_with_human: invite.upgrade_requested_level,
          upgrade_requested_level: null,
          upgrade_requested_by: null,
          // Clear cached reports so they regenerate with the new access level
          compatibility_report: null,
          compatibility_report_inviter: null,
          compatibility_report_recipient: null,
        })
        .eq('id', inviteId);

      if (updateError) {
        console.error('[invite-upgrade] Approve update error:', updateError.message);
        return NextResponse.json({ error: 'Failed to approve upgrade' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'deny') {
      const { error: updateError } = await admin
        .from('decoded_invites')
        .update({
          upgrade_requested_level: null,
          upgrade_requested_by: null,
        })
        .eq('id', inviteId);

      if (updateError) {
        console.error('[invite-upgrade] Deny update error:', updateError.message);
        return NextResponse.json({ error: 'Failed to deny upgrade' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[invite-upgrade] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
