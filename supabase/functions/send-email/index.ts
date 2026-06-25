/**
 * Send Email Hook — brand-aware auth emails for every domain.
 *
 * POST /functions/v1/send-email   (Supabase Auth "Send Email" hook)
 * Auth: standardwebhooks signature (SEND_EMAIL_HOOK_SECRET). No JWT — GoTrue
 *       calls this directly, so deploy with --no-verify-jwt.
 *
 * One Supabase project serves many brands (masterytv, relatti, …). Supabase's
 * built-in mailer can only send ONE template with ONE Site URL, so a Relatti
 * password reset arrived MasteryTV-branded and pointed at masterytv.com. This
 * hook takes over sending: it resolves the brand from the redirect_to domain,
 * renders a brand-aware email, builds a link that lands on the RIGHT brand
 * domain (carrying token_hash + type so /auth/callback verifies + routes), and
 * sends via Resend.
 *
 * Email confirmation is currently disabled, so `recovery` (password reset) is
 * the live path; signup / magiclink / email_change / invite are handled too so
 * the hook is future-proof.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const FUNCTION_NAME = "send-email";

/** Send an email via Resend with the given account API key (per-brand). */
async function sendResendEmail(apiKey: string, params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: params.from, to: [params.to], subject: params.subject, html: params.html, text: params.text }),
  });

  if (!res.ok) {
    throw new Error(`Resend API error (${res.status}): ${await res.text()}`);
  }
}

// Per-brand email config. Each brand has its OWN Resend account (separate key +
// verified sending domain). `apiKeyEnv` names the brand's key; `from` is used
// once that account is live. Until then we fall back to the shared MasteryTV
// account + `fallbackFrom` (same brand display name, MasteryTV-verified domain),
// so a brand's emails keep working before its Resend account is wired up.
//
// Brand colors are inline hex — email clients can't use CSS tokens (scoped
// exception to the no-hardcoded-hex rule).
interface EmailBrand {
  name: string;
  apiKeyEnv: string;     // env var holding this brand's Resend API key
  from: string;          // sender once the brand's own Resend account is used
  fallbackFrom: string;  // sender when falling back to the shared account
  color: string;
  soft: string;
}

const BRANDS: Record<string, EmailBrand> = {
  masterytv: {
    name: "MasteryTV",
    apiKeyEnv: "RESEND_API_KEY",
    from: "MasteryTV <donotreply@mail.masterytv.com>",
    fallbackFrom: "MasteryTV <donotreply@mail.masterytv.com>",
    color: "#6063EE",
    soft: "#EEF0FF",
  },
  relatti: {
    name: "Relatti",
    apiKeyEnv: "RESEND_API_KEY_RELATTI",
    from: "Relatti <donotreply@mail.relatti.com>",
    fallbackFrom: "Relatti <donotreply@mail.masterytv.com>",
    color: "#E11D48",
    soft: "#FFF1F4",
  },
};

/**
 * Resolve which Resend account + from-address to use for a brand. Prefers the
 * brand's own account (apiKeyEnv set); falls back to the shared MasteryTV
 * account so emails still send before a brand's Resend account is configured.
 */
function resolveSender(brand: EmailBrand): { apiKey: string; from: string } {
  const ownKey = Deno.env.get(brand.apiKeyEnv);
  if (ownKey) return { apiKey: ownKey, from: brand.from };
  const shared = Deno.env.get("RESEND_API_KEY");
  if (!shared) throw new Error("No Resend API key configured");
  return { apiKey: shared, from: brand.fallbackFrom };
}

function brandForHost(host: string): EmailBrand {
  return host.toLowerCase().includes("relatti") ? BRANDS.relatti : BRANDS.masterytv;
}

/**
 * Resolve the brand for an email. Prefers an explicit ?brand= in redirect_to
 * (so localhost/staging preview works), else infers from the host (production).
 */
function brandForRequest(redirectTo: string): EmailBrand {
  try {
    const url = new URL(redirectTo);
    const param = url.searchParams.get("brand");
    if (param && BRANDS[param]) return BRANDS[param];
    return brandForHost(url.hostname);
  } catch {
    return BRANDS.masterytv;
  }
}

interface HookPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

interface ActionCopy {
  subject: string;
  heading: string;
  body: string;
  cta: string;
}

function actionCopy(type: string, brandName: string): ActionCopy {
  switch (type) {
    case "recovery":
      return {
        subject: `Reset your ${brandName} password`,
        heading: "Reset your password",
        body: "Click below to choose a new password. This link expires in one hour.",
        cta: "Reset password",
      };
    case "magiclink":
      return {
        subject: `Your ${brandName} sign-in link`,
        heading: "Sign in",
        body: "Click below to sign in. This link expires in one hour.",
        cta: "Sign in",
      };
    case "signup":
    case "confirmation":
      return {
        subject: `Confirm your email`,
        heading: "Confirm your email",
        body: "Click below to confirm your email and get started.",
        cta: "Confirm email",
      };
    case "email_change":
      return {
        subject: `Confirm your new email`,
        heading: "Confirm your new email",
        body: "Click below to confirm your new email address.",
        cta: "Confirm email",
      };
    case "invite":
      return {
        subject: `You're invited to ${brandName}`,
        heading: "You're invited",
        body: "Click below to accept your invitation and get started.",
        cta: "Accept invite",
      };
    default:
      return { subject: brandName, heading: "Continue", body: "Click below to continue.", cta: "Continue" };
  }
}

/**
 * Build the action link. The brand's /auth/callback (from redirect_to) carries
 * token_hash + type so verifyOtp runs on the right domain and routes correctly
 * (recovery → /auth/reset-password). Lands on the brand domain, not Site URL.
 */
function buildLink(emailData: HookPayload["email_data"]): string {
  const base = emailData.redirect_to || `${emailData.site_url}/auth/callback`;
  const url = new URL(base);
  if (url.pathname === "/" || url.pathname === "") url.pathname = "/auth/callback";
  url.searchParams.set("token_hash", emailData.token_hash);
  url.searchParams.set("type", emailData.email_action_type);
  return url.toString();
}

function buildHtml(brand: EmailBrand, copy: ActionCopy, link: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:12px;background:${brand.soft};color:${brand.color};font-weight:700;font-size:18px;">${brand.name.charAt(0)}</div>
          <div style="margin-top:10px;font-size:15px;font-weight:600;color:#1a1a2e;">${brand.name}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;text-align:center;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#1a1a2e;">${copy.heading}</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#555555;">${copy.body}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center;">
          <a href="${link}" style="display:inline-block;background:${brand.color};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px;">${copy.cta}</a>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999999;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#aaaaaa;">© ${new Date().getFullYear()} ${brand.name}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!secret) {
    console.error(`[${FUNCTION_NAME}] SEND_EMAIL_HOOK_SECRET not set`);
    return new Response(JSON.stringify({ error: { message: "Hook not configured" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  // ── Verify the standardwebhooks signature (Supabase signs with the secret) ──
  let data: HookPayload;
  try {
    const wh = new Webhook(secret.replace(/^v1,whsec_/, "").replace(/^whsec_/, ""));
    data = wh.verify(payload, headers) as HookPayload;
  } catch (err) {
    console.warn(`[${FUNCTION_NAME}] Invalid signature:`, (err as Error).message);
    return new Response(JSON.stringify({ error: { message: "Invalid signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { user, email_data } = data;

    const brand = brandForRequest(email_data.redirect_to || email_data.site_url);
    const { apiKey, from } = resolveSender(brand);
    const copy = actionCopy(email_data.email_action_type, brand.name);
    const link = buildLink(email_data);
    const html = buildHtml(brand, copy, link);
    const text = `${copy.heading}\n\n${copy.body}\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.`;

    await sendResendEmail(apiKey, { to: user.email, subject: copy.subject, html, text, from });

    console.log(`[${FUNCTION_NAME}] sent ${email_data.email_action_type} for ${brand.name} (from ${from})`);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // A non-200 makes Supabase surface the auth failure rather than silently
    // succeeding without an email being delivered.
    console.error(`[${FUNCTION_NAME}] send failed:`, (err as Error).message);
    return new Response(JSON.stringify({ error: { message: (err as Error).message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
