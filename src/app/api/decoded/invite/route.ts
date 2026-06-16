import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncEngagementForInvite } from '@/lib/decoded/sync-engagement';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/decoded/invite
 * Send a Decoded assessment invite email via Resend.
 * Requires authenticated user.
 *
 * Flow:
 * 1. Upsert invite row to get a stable ID
 * 2. Build invite URL using that ID → /decoded/invite/[id]
 * 3. Send the email with the personalized landing page link
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      console.error('[invite] Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const recipientEmail = body.email?.trim().toLowerCase();
    const relationship = body.relationship || 'someone';

    if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const senderName = user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || user.email?.split('@')[0]
      || 'Someone';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masterytv.com';

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('[invite] RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured.' },
        { status: 500 }
      );
    }

    // Step 1: Get the inviter's latest report
    const { data: reportData } = await supabase
      .from('assessment_reports')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Step 2: Upsert invite row to get a stable ID for the landing page URL
    const { data: inviteRow } = await supabase.from('decoded_invites').upsert({
      inviter_id: user.id,
      recipient_email: recipientEmail,
      inviter_report_id: reportData?.id ?? null,
      inviter_name: senderName,
      inviter_email: user.email ?? '',
      status: 'pending',
    }, { onConflict: 'inviter_id,recipient_email' })
      .select('id')
      .single();

    // E3 dual-write: mirror the invite into the engagement spine (non-fatal).
    await syncEngagementForInvite(inviteRow?.id);

    // Build the personalized invite landing page URL
    const inviteUrl = inviteRow?.id
      ? `${appUrl}/decoded/invite/${inviteRow.id}`
      : `${appUrl}/decoded`;

    // Step 3: Send the invite email
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Decoded by MasteryTV <donotreply@mail.masterytv.com>',
        to: [recipientEmail],
        subject: `${senderName} invited you to take a personality assessment`,
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; background: #ffffff;">
            
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #a3a6ff, #6063ee); border-radius: 12px; padding: 12px;">
                <span style="font-size: 24px; color: white; font-weight: 700;">D</span>
              </div>
            </div>

            <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; text-align: center;">
              You've been invited
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center; margin-bottom: 24px;">
              ${senderName} took the <strong>Decoded</strong> personality assessment and wants to compare results with you.
            </p>

            <div style="background: #f8f9ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e8eaff;">
              <p style="font-size: 14px; color: #555; margin: 0 0 4px 0; font-weight: 600;">What you'll discover:</p>
              <ul style="font-size: 14px; color: #666; line-height: 1.8; margin: 8px 0 0 0; padding-left: 20px;">
                <li>Your Big Five personality profile</li>
                <li>Career interests &amp; work motivation</li>
                <li>Attachment style &amp; emotional patterns</li>
                <li>Life satisfaction &amp; flourishing score</li>
              </ul>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #a3a6ff, #6063ee); color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
                Take the Assessment →
              </a>
            </div>

            <p style="font-size: 13px; color: #999; text-align: center; line-height: 1.5;">
              It takes about 15 minutes. Your results are completely private — you decide if and when to share them.
            </p>

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
      console.error('[invite] Resend error:', errorText);
      return NextResponse.json(
        { error: `Email service error: ${errorText}` },
        { status: 500 }
      );
    }

    // S0.5.3i: Record share for section unlock tracking
    await supabase.from('share_unlocks').insert({
      user_id: user.id,
      method: 'email_invite',
      section_unlocked: 'S5',
      invite_id: inviteRow?.id ?? null,
    });

    // S0.5.3k: Log viral funnel event
    await supabase.from('viral_events').insert({
      user_id: user.id,
      invite_id: inviteRow?.id ?? null,
      event_type: 'invite_sent',
      metadata: { method: 'email', recipient_email: recipientEmail },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[invite] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
