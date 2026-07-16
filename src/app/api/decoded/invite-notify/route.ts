import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { originFromHeaders } from '@/lib/platform/origin';
import { brandForProgram, type BrandId } from '@/lib/platform/brand';
import { sendBrandInviteNotifyEmail } from '@/lib/decoded/invite-email';

/**
 * POST /api/decoded/invite-notify
 *
 * Sends an email notification to the inviter when their recipient completes
 * their assessment. Idempotent — checks notified_at to prevent duplicates.
 *
 * Body: { inviteId: string }
 *
 * Brand-aware: the email matches the INVITER's brand (Relatti → rose "Relatti"
 * note from mail.relatti.com; MasteryTV → indigo "Decoded" note). Resolution +
 * theming live in src/lib/decoded/invite-email.ts (shared with the invite send).
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

    // Use admin client to read cross-user data
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Load the invite with idempotency check
    const { data: invite, error: inviteError } = await admin
      .from('decoded_invites')
      .select('id, inviter_id, inviter_email, inviter_name, recipient_id, recipient_email, status, notified_at, program')
      .eq('id', inviteId)
      .single();

    if (!invite || inviteError) {
      console.error('[invite-notify] Invite not found:', inviteId);
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Guard: only notify if the invite is completed and not already notified
    if (invite.notified_at) {
      return NextResponse.json({ success: true, skipped: 'already_notified' });
    }

    if (invite.status !== 'completed') {
      return NextResponse.json({ success: true, skipped: 'not_completed' });
    }

    // Guard: verify the caller is the recipient
    if (invite.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get recipient's archetype from their report OF THIS INVITE'S PROGRAM —
    // a dual-brand recipient's other-program archetype must not leak into this
    // notification (PC2.1h).
    let recipientArchetype = '';
    let recipientSublabel = '';
    if (invite.recipient_id) {
      const { data: report } = await admin
        .from('assessment_reports')
        .select('archetype_base, archetype_sublabel')
        .eq('user_id', invite.recipient_id)
        .eq('program', invite.program)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (report?.archetype_base) {
        recipientArchetype = report.archetype_base;
        recipientSublabel = report.archetype_sublabel ?? '';
      }
    }

    // Get recipient display name
    const recipientName = user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || invite.recipient_email?.split('@')[0]
      || 'Your friend';

    const appUrl = originFromHeaders(req.headers);
    const compatibilityUrl = `${appUrl}/dashboard/compatibility`;

    // Resolve the brand from the INVITE's own program (PC2.1h) — more specific
    // than the inviter's signup_brand (a dual-brand user's relationship invite
    // must notify in Relatti voice regardless of where they first signed up).
    const brandId: BrandId = brandForProgram(invite.program).id;

    // The personality-archetype line only fits the Decoded framing; Relatti
    // leads with the relationship, not the archetype name.
    const archetypeLine =
      brandId === 'masterytv' && recipientArchetype
        ? `They got <strong>The ${recipientArchetype}</strong>${recipientSublabel ? ` — ${recipientSublabel}` : ''}.`
        : '';

    const sent = await sendBrandInviteNotifyEmail(brandId, {
      recipientName,
      inviterName: invite.inviter_name || 'there',
      inviterEmail: invite.inviter_email,
      archetypeLine,
      ctaUrl: compatibilityUrl,
    });
    if (!sent.ok) {
      // Don't block on email failure — mark as attempted anyway.
      console.error('[invite-notify] send failed:', sent.error);
    }

    // Mark as notified (idempotency)
    await admin
      .from('decoded_invites')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', inviteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[invite-notify] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
