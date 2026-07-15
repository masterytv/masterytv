import { type BrandId } from "@/lib/platform/brand";

/**
 * Brand-aware invite email — shared by the initial send (/api/decoded/invite)
 * and the "remind" action (/api/relatti/manage-invite) so both produce the exact
 * same branded message. Each brand sends from its OWN Resend account (keyEnv),
 * falling back to the shared MasteryTV account + fallbackFrom if its own account
 * can't send (e.g. its domain isn't verified yet). Email colors are inline hex —
 * clients can't use CSS tokens, a scoped exception to the no-hardcoded-hex rule.
 */
/**
 * Which email a recipient gets is context-aware (2026-07-15, founder):
 * - "assessment"        — no account yet: the classic take-the-quiz invite.
 * - "connect_request"   — existing account WITH a report: nothing to take;
 *                         they're asked permission to connect (Accept/Decline
 *                         lives on their Compatibility page).
 * - "connect_no_report" — existing account, assessment unfinished: finish it,
 *                         then the connect request awaits.
 */
export type InviteEmailVariant = "assessment" | "connect_request" | "connect_no_report";

interface VariantCopy {
  subject: (sender: string) => string;
  intro: (sender: string) => string;
  cta: string;
  timeNote: string;
}

export interface InviteBrand {
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
  connectRequest: VariantCopy;
  connectNoReport: VariantCopy;
}

export const INVITE_BRANDS: Record<BrandId, InviteBrand> = {
  masterytv: {
    keyEnv: "RESEND_API_KEY",
    from: "Decoded by MasteryTV <donotreply@mail.masterytv.com>",
    fallbackFrom: "Decoded by MasteryTV <donotreply@mail.masterytv.com>",
    badge: "D",
    color: "#6063EE",
    soft: "#EEF0FF",
    subject: (s) => `${s} invited you to take a personality assessment`,
    intro: (s) => `${s} took the <strong>Decoded</strong> personality assessment and wants to compare results with you.`,
    bullets: [
      "Your Big Five personality profile",
      "Career interests &amp; work motivation",
      "Attachment style &amp; emotional patterns",
      "Life satisfaction &amp; flourishing score",
    ],
    cta: "Take the Assessment",
    timeNote: "It takes about 15 minutes. Your results are completely private — you decide if and when to share them.",
    footer: "Decoded by MasteryTV · Personality science for personal growth",
    connectRequest: {
      subject: (s) => `${s} wants to compare results with you`,
      intro: (s) => `${s} wants to connect on <strong>Decoded</strong> — share assessments and see a compatibility report together. You already have your results, so it's your call.`,
      cta: "Review their request",
      timeNote: "Nothing is shared until you accept. You can review or decline the request on your Compatibility page.",
    },
    connectNoReport: {
      subject: (s) => `${s} wants to compare results with you`,
      intro: (s) => `${s} wants to connect on <strong>Decoded</strong> and compare results with you. You've already joined — finish your assessment to see how you match up.`,
      cta: "Finish your assessment",
      timeNote: "Nothing is shared until you accept their request after finishing.",
    },
  },
  relatti: {
    keyEnv: "RESEND_API_KEY_RELATTI",
    from: "Relatti <donotreply@mail.relatti.com>",
    fallbackFrom: "Relatti <donotreply@mail.masterytv.com>",
    badge: "R",
    color: "#E11D48",
    soft: "#FFF1F4",
    subject: (s) => `${s} invited you to understand your relationship together`,
    intro: (s) => `${s} took the <strong>Relatti</strong> relationship quiz and invited you to take yours — so your coach can understand you both.`,
    bullets: [
      "What kind of partner you are — your archetype",
      "Your attachment style — how you bond and seek closeness",
      "How you each handle closeness and conflict",
      "Where you click, and where you clash",
    ],
    cta: "Take the quiz",
    timeNote: "It takes about 10 minutes. Your results are private — you choose what to share with each other.",
    footer: "Relatti · A coach that knows both of you",
    connectRequest: {
      subject: (s) => `${s} wants to connect with you on Relatti`,
      intro: (s) => `${s} wants to connect on <strong>Relatti</strong> — share your assessments and see your compatibility report together, so your coach can understand you both.`,
      cta: "Review their request",
      timeNote: "Nothing is shared until you accept. Review or decline the request on your Compatibility page.",
    },
    connectNoReport: {
      subject: (s) => `${s} wants to connect with you on Relatti`,
      intro: (s) => `${s} wants to connect on <strong>Relatti</strong>. You've already joined — finish your relationship quiz, then accept their request to see your compatibility together.`,
      cta: "Finish your quiz",
      timeNote: "Nothing is shared until you accept their request after finishing.",
    },
  },
};

function variantCopy(brand: InviteBrand, variant: InviteEmailVariant): VariantCopy {
  if (variant === "connect_request") return brand.connectRequest;
  if (variant === "connect_no_report") return brand.connectNoReport;
  return { subject: brand.subject, intro: brand.intro, cta: brand.cta, timeNote: brand.timeNote };
}

export function buildInviteHtml(
  brand: InviteBrand,
  senderName: string,
  inviteUrl: string,
  variant: InviteEmailVariant = "assessment",
): string {
  const copy = variantCopy(brand, variant);
  const bullets = brand.bullets.map((b) => `<li>${b}</li>`).join("");
  return `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: ${brand.soft}; border-radius: 12px; width: 48px; height: 48px; line-height: 48px;">
          <span style="font-size: 22px; color: ${brand.color}; font-weight: 700;">${brand.badge}</span>
        </div>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; text-align: center;">
        ${variant === "assessment" ? "You've been invited" : "A connection request"}
      </h1>
      <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center; margin-bottom: 24px;">
        ${copy.intro(senderName)}
      </p>
      <div style="background: ${brand.soft}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #555; margin: 0 0 4px 0; font-weight: 600;">What you'll discover:</p>
        <ul style="font-size: 14px; color: #666; line-height: 1.8; margin: 8px 0 0 0; padding-left: 20px;">
          ${bullets}
        </ul>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${inviteUrl}" style="display: inline-block; background: ${brand.color}; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
          ${copy.cta} →
        </a>
      </div>
      <p style="font-size: 13px; color: #999; text-align: center; line-height: 1.5;">
        ${copy.timeNote}
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;" />
      <p style="font-size: 12px; color: #bbb; text-align: center;">
        ${brand.footer}
      </p>
    </div>
  `;
}

/**
 * Send the branded invite email via the brand's Resend account, falling back to
 * the shared account if its own can't send. Returns { ok } (+ an error string on
 * failure). Never throws.
 */
export async function sendBrandInviteEmail(
  brandId: BrandId,
  senderName: string,
  recipientEmail: string,
  inviteUrl: string,
  variant: InviteEmailVariant = "assessment",
): Promise<{ ok: boolean; error?: string }> {
  const brand = INVITE_BRANDS[brandId];
  const ownKey = process.env[brand.keyEnv];
  const sharedKey = process.env.RESEND_API_KEY;
  if (!ownKey && !sharedKey) {
    return { ok: false, error: "Email service not configured." };
  }

  const subject = variantCopy(brand, variant).subject(senderName);
  const html = buildInviteHtml(brand, senderName, inviteUrl, variant);

  async function sendVia(apiKey: string, from: string): Promise<Response> {
    return fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [recipientEmail], subject, html }),
    });
  }

  let response: Response;
  if (ownKey) {
    response = await sendVia(ownKey, brand.from);
    if (!response.ok && sharedKey) {
      console.warn(`[invite-email] ${brandId} own account failed (${response.status}); falling back to shared`);
      response = await sendVia(sharedKey, brand.fallbackFrom);
    }
  } else {
    response = await sendVia(sharedKey as string, brand.fallbackFrom);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[invite-email] Resend error:", errorText);
    return { ok: false, error: `Email service error: ${errorText}` };
  }
  return { ok: true };
}
