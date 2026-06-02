import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/decoded/invite-upgrade
 * Request or approve an upgrade to the mutual sharing level.
 *
 * Actions:
 * - request: Store upgrade_requested_level + upgrade_requested_by
 * - approve: Upgrade share_with_human to the requested level and clear request
 * - deny: Clear the upgrade request without changing the level
 */
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

    // Load the invite to verify membership
    const { data: invite, error: inviteError } = await supabase
      .from('decoded_invites')
      .select('inviter_id, recipient_id, share_with_human, status')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
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
      // Store the upgrade request — either party can request
      if (!level) {
        return NextResponse.json({ error: 'Missing level' }, { status: 400 });
      }

      // Use service role to bypass RLS for the update
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      await admin
        .from('decoded_invites')
        .update({
          upgrade_requested_level: level,
          upgrade_requested_by: user.id,
        })
        .eq('id', inviteId);

      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      // The OTHER user approves — upgrade the sharing level
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      // Load full invite to get the requested level
      const { data: fullInvite } = await admin
        .from('decoded_invites')
        .select('upgrade_requested_level, upgrade_requested_by')
        .eq('id', inviteId)
        .single();

      if (!fullInvite?.upgrade_requested_level) {
        return NextResponse.json({ error: 'No pending upgrade request' }, { status: 400 });
      }

      // Ensure the approver is NOT the one who requested
      if (fullInvite.upgrade_requested_by === user.id) {
        return NextResponse.json({ error: 'Cannot approve your own request' }, { status: 400 });
      }

      await admin
        .from('decoded_invites')
        .update({
          share_with_human: fullInvite.upgrade_requested_level,
          upgrade_requested_level: null,
          upgrade_requested_by: null,
        })
        .eq('id', inviteId);

      return NextResponse.json({ success: true });
    }

    if (action === 'deny') {
      // Clear the upgrade request
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      await admin
        .from('decoded_invites')
        .update({
          upgrade_requested_level: null,
          upgrade_requested_by: null,
        })
        .eq('id', inviteId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[invite-upgrade] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
