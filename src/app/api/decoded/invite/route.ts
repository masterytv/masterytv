import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncEngagementForInvite } from '@/lib/decoded/sync-engagement';
import { normalizeInviteEmail, isValidInviteEmail, buildClaimPatch } from '@/lib/decoded/invite-claim';
import { BRANDS, resolveBrand, isBrandId, type BrandId } from '@/lib/platform/brand';
import { originFromHeaders } from '@/lib/platform/origin';
import { sendBrandInviteEmail, type InviteEmailVariant } from '@/lib/decoded/invite-email';

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

    // decoded_invites is service-role-write-only (consent hardening 2026-07-19).
    // Every write below sets inviter_id = user.id, so the authenticated caller can
    // only ever create/refresh their OWN invite row.
    const admin = createAdminClient();

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

    // PC2.1h: an invite belongs to the program of the brand it was created on
    // (INVITE_PROGRAM_DESIGN.md §5) — the only invite operation that reads the
    // request's brand. Everything acting on an EXISTING invite reads the
    // program off the invite row.
    const program = BRANDS[brandId].programSlug;

    // Step 1: the inviter's latest report OF THIS PROGRAM (for the landing OG
    // card / spine) — a dual-brand user's other-program report must never ride
    // on this invite (invariant 3).
    const { data: reportData } = await supabase
      .from('assessment_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('program', program)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Step 2: upsert the invite row to get a stable landing-page URL.
    const { data: inviteRow } = await admin.from('decoded_invites').upsert({
      inviter_id: user.id,
      recipient_email: recipientEmail,
      inviter_report_id: reportData?.id ?? null,
      inviter_name: senderName,
      inviter_email: user.email ?? '',
      status: 'pending',
      program,
    }, { onConflict: 'inviter_id,recipient_email,program' })
      .select('id')
      .single();

    // Step 2b: consent gate (founder, 2026-07-15). If the recipient ALREADY has
    // an account, this is not an onboarding invite — it's a CONNECT REQUEST to
    // an existing member, and it must NOT auto-connect (the old behavior linked
    // two independent signups without the recipient ever agreeing). Record the
    // inviter's request on the invite (the invite-consent accept path reads it),
    // claim the row for the recipient so it appears on their Compatibility page,
    // and pick the context-aware email variant.
    let emailVariant: InviteEmailVariant = 'assessment';
    let inviteUrl = inviteRow?.id ? `${appUrl}/invite/${inviteRow.id}` : `${appUrl}/login`;

    if (inviteRow?.id) {
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('email', recipientEmail)
        .maybeSingle();

      if (existing) {
        // Their report of THIS invite's program — a recipient with only an
        // other-program report is treated as "no report yet" (they still need
        // to take this program's battery).
        const { data: theirReport } = await admin
          .from('assessment_reports')
          .select('id')
          .eq('user_id', existing.id)
          .eq('program', program)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        await admin
          .from('decoded_invites')
          .update({
            ...buildClaimPatch(existing.id, theirReport?.id ?? null, new Date().toISOString()),
            upgrade_requested_level: 'full',
            upgrade_requested_by: user.id,
            revoked_at: null,
          })
          .eq('id', inviteRow.id);

        if (theirReport) {
          emailVariant = 'connect_request';
          inviteUrl = `${appUrl}/dashboard/compatibility`;
        } else {
          emailVariant = 'connect_no_report';
          inviteUrl = `${appUrl}/assess`;
        }
      }
    }

    // E3 dual-write: mirror the invite into the engagement spine (non-fatal).
    await syncEngagementForInvite(inviteRow?.id);

    // Step 3: send the branded, context-aware email.
    const sent = await sendBrandInviteEmail(brandId, senderName, recipientEmail, inviteUrl, emailVariant);
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
