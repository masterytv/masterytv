import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { originFromHeaders } from '@/lib/platform/origin';

/**
 * POST /api/decoded/invite-notify
 *
 * Sends an email notification to the inviter when their recipient
 * completes the Decoded assessment. Idempotent — checks notified_at
 * to prevent duplicate emails.
 *
 * Body: { inviteId: string }
 *
 * Email rules (GEMINI.md):
 * - From: Decoded by MasteryTV <donotreply@mail.masterytv.com>
 * - Domain: @mail.masterytv.com only (verified with Resend)
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
      .select('id, inviter_id, inviter_email, inviter_name, recipient_id, recipient_email, status, notified_at')
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

    // Get recipient's archetype from their report
    let recipientArchetype = '';
    let recipientSublabel = '';
    if (invite.recipient_id) {
      const { data: report } = await admin
        .from('assessment_reports')
        .select('archetype_base, archetype_sublabel')
        .eq('user_id', invite.recipient_id)
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

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('[invite-notify] RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Build the notification email
    const archetypeLine = recipientArchetype
      ? `They got <strong>The ${recipientArchetype}</strong>${recipientSublabel ? ` — ${recipientSublabel}` : ''}.`
      : '';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Decoded by MasteryTV <donotreply@mail.masterytv.com>',
        to: [invite.inviter_email],
        subject: `${recipientName} just completed their Decoded assessment!`,
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; background: #ffffff;">
            
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #a3a6ff, #6063ee); border-radius: 12px; padding: 12px;">
                <span style="font-size: 24px; color: white; font-weight: 700;">D</span>
              </div>
            </div>

            <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; text-align: center;">
              ${recipientName} is decoded!
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center; margin-bottom: 24px;">
              Great news, ${invite.inviter_name || 'there'}. ${recipientName} just completed their Decoded personality assessment.
              ${archetypeLine}
            </p>

            <div style="background: #f8f9ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e8eaff;">
              <p style="font-size: 14px; color: #555; margin: 0 0 4px 0; font-weight: 600;">What's next:</p>
              <ul style="font-size: 14px; color: #666; line-height: 1.8; margin: 8px 0 0 0; padding-left: 20px;">
                <li>Request to share results with each other</li>
                <li>Unlock your AI-generated Compatibility Report</li>
                <li>Discover your relationship dynamics across 5 dimensions</li>
              </ul>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${compatibilityUrl}" style="display: inline-block; background: linear-gradient(135deg, #a3a6ff, #6063ee); color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
                View Compatibility Hub →
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;" />
            
            <p style="font-size: 12px; color: #bbb; text-align: center;">
              Decoded by MasteryTV · Personality science for personal growth
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[invite-notify] Resend error:', errorText);
      // Don't block on email failure — mark as attempted anyway
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
