import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncEngagementForInvite } from '@/lib/decoded/sync-engagement';
import { normalizeInviteEmail, isValidInviteEmail } from '@/lib/decoded/invite-claim';
import { resolveBrand, isBrandId, type BrandId } from '@/lib/platform/brand';
import { originFromHeaders } from '@/lib/platform/origin';
import { sendBrandInviteEmail } from '@/lib/decoded/invite-email';

/**
 * POST /api/decoded/invite
 * Send a brand-aware assessment invite email via Resend (the inviter's brand).
 * The email itself is built by @/lib/decoded/invite-email (shared with the
 * "remind" action). Requires an authenticated user.
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
    const recipientEmail = normalizeInviteEmail(body.email);

    if (!isValidInviteEmail(recipientEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const senderName = user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || user.email?.split('@')[0]
      || 'Someone';

    // Resolve the inviter's brand (preview cookie > host) so a Relatti invite is
    // Relatti-branded and its link points at relatti.com.
    const cookieBrand = req.cookies.get('brand')?.value;
    const brandId: BrandId = isBrandId(cookieBrand)
      ? cookieBrand
      : resolveBrand(req.headers.get('host')).id;
    const appUrl = originFromHeaders(req.headers);

    // Step 1: the inviter's latest report (for the landing OG card / spine).
    const { data: reportData } = await supabase
      .from('assessment_reports')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Step 2: upsert the invite row to get a stable landing-page URL.
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

    const inviteUrl = inviteRow?.id
      ? `${appUrl}/invite/${inviteRow.id}`
      : `${appUrl}/login`;

    // Step 3: send the branded invite email.
    const sent = await sendBrandInviteEmail(brandId, senderName, recipientEmail, inviteUrl);
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error ?? 'Email service error.' }, { status: 500 });
    }

    // S0.5.3i / S0.5.3k: share-unlock + viral funnel telemetry.
    await supabase.from('share_unlocks').insert({
      user_id: user.id,
      method: 'email_invite',
      section_unlocked: 'S5',
      invite_id: inviteRow?.id ?? null,
    });
    await supabase.from('viral_events').insert({
      user_id: user.id,
      invite_id: inviteRow?.id ?? null,
      event_type: 'invite_sent',
      metadata: { method: 'email', recipient_email: recipientEmail, brand: brandId },
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
