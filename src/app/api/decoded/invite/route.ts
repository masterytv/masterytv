import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncEngagementForInvite } from '@/lib/decoded/sync-engagement';
import { resolveBrand, isBrandId, type BrandId } from '@/lib/platform/brand';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Per-brand invite email config. Each brand sends from its OWN Resend account
 * (keyEnv); falls back to the shared MasteryTV account + fallbackFrom if the
 * brand's account can't send (e.g. its domain isn't verified yet) — mirrors the
 * send-email auth hook. Email colors are inline hex (clients can't use CSS
 * tokens — scoped exception to the no-hardcoded-hex rule).
 */
interface InviteBrand {
  keyEnv: string;
  from: string;
  fallbackFrom: string;
  badge: string;
  color: string;
  soft: string;
  subject: (sender: string) => string;
  intro: (sender: string) => string;
  bullets: string[];
  cta: string;
  timeNote: string;
  footer: string;
}

const INVITE_BRANDS: Record<BrandId, InviteBrand> = {
  masterytv: {
    keyEnv: 'RESEND_API_KEY',
    from: 'Decoded by MasteryTV <donotreply@mail.masterytv.com>',
    fallbackFrom: 'Decoded by MasteryTV <donotreply@mail.masterytv.com>',
    badge: 'D',
    color: '#6063EE',
    soft: '#EEF0FF',
    subject: (s) => `${s} invited you to take a personality assessment`,
    intro: (s) => `${s} took the <strong>Decoded</strong> personality assessment and wants to compare results with you.`,
    bullets: [
      'Your Big Five personality profile',
      'Career interests &amp; work motivation',
      'Attachment style &amp; emotional patterns',
      'Life satisfaction &amp; flourishing score',
    ],
    cta: 'Take the Assessment',
    timeNote: 'It takes about 15 minutes. Your results are completely private — you decide if and when to share them.',
    footer: 'Decoded by MasteryTV · Personality science for personal growth',
  },
  relatti: {
    keyEnv: 'RESEND_API_KEY_RELATTI',
    from: 'Relatti <donotreply@mail.relatti.com>',
    fallbackFrom: 'Relatti <donotreply@mail.masterytv.com>',
    badge: 'R',
    color: '#E11D48',
    soft: '#FFF1F4',
    subject: (s) => `${s} invited you to understand your relationship together`,
    intro: (s) => `${s} took the <strong>Relatti</strong> relationship quiz and invited you to take yours — so your coach can understand you both.`,
    bullets: [
      'What kind of partner you are — your archetype',
      'Your attachment style — how you bond and seek closeness',
      'How you each handle closeness and conflict',
      'Where you click, and where you clash',
    ],
    cta: 'Take the quiz',
    timeNote: 'It takes about 10 minutes. Your results are private — you choose what to share with each other.',
    footer: 'Relatti · A coach that knows both of you',
  },
};

function buildInviteHtml(brand: InviteBrand, senderName: string, inviteUrl: string): string {
  const bullets = brand.bullets.map((b) => `<li>${b}</li>`).join('');
  return `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: ${brand.soft}; border-radius: 12px; width: 48px; height: 48px; line-height: 48px;">
          <span style="font-size: 22px; color: ${brand.color}; font-weight: 700;">${brand.badge}</span>
        </div>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; text-align: center;">
        You've been invited
      </h1>
      <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center; margin-bottom: 24px;">
        ${brand.intro(senderName)}
      </p>
      <div style="background: ${brand.soft}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #555; margin: 0 0 4px 0; font-weight: 600;">What you'll discover:</p>
        <ul style="font-size: 14px; color: #666; line-height: 1.8; margin: 8px 0 0 0; padding-left: 20px;">
          ${bullets}
        </ul>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${inviteUrl}" style="display: inline-block; background: ${brand.color}; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
          ${brand.cta} →
        </a>
      </div>
      <p style="font-size: 13px; color: #999; text-align: center; line-height: 1.5;">
        ${brand.timeNote}
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;" />
      <p style="font-size: 12px; color: #bbb; text-align: center;">
        ${brand.footer}
      </p>
    </div>
  `;
}

/**
 * POST /api/decoded/invite
 * Send a brand-aware assessment invite email via Resend (the inviter's brand).
 * Requires authenticated user.
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

    // Resolve the inviter's brand (preview cookie > host) and use its domain for
    // the link so a Relatti invite points at relatti.com, not masterytv.com.
    const cookieBrand = req.cookies.get('brand')?.value;
    const brandId: BrandId = isBrandId(cookieBrand)
      ? cookieBrand
      : resolveBrand(req.headers.get('host')).id;
    const brand = INVITE_BRANDS[brandId];
    const appUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://masterytv.com';

    const ownKey = process.env[brand.keyEnv];
    const sharedKey = process.env.RESEND_API_KEY;
    if (!ownKey && !sharedKey) {
      console.error('[invite] No Resend API key configured');
      return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 });
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

    const inviteUrl = inviteRow?.id
      ? `${appUrl}/invite/${inviteRow.id}`
      : `${appUrl}/login`;

    // Step 3: Send the invite email via the brand's Resend account, falling back
    // to the shared account if its own account can't send (domain not verified).
    const subject = brand.subject(senderName);
    const html = buildInviteHtml(brand, senderName, inviteUrl);

    async function sendVia(apiKey: string, from: string) {
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: [recipientEmail], subject, html }),
      });
    }

    let response: Response;
    if (ownKey) {
      response = await sendVia(ownKey, brand.from);
      if (!response.ok && sharedKey) {
        console.warn(`[invite] ${brandId} own account failed (${response.status}); falling back to shared`);
        response = await sendVia(sharedKey, brand.fallbackFrom);
      }
    } else {
      response = await sendVia(sharedKey as string, brand.fallbackFrom);
    }

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
