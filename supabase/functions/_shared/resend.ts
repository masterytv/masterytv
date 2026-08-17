/**
 * Resend Email Client — Outbound coaching emails.
 *
 * S4.1: Shared utilities for sending branded coaching emails via Resend API.
 * Uses direct fetch (no SDK) to avoid Deno compatibility issues.
 *
 * Architecture: ARCHITECTURE.md §5.6
 */

import type { BrandId } from "./brands.ts";

const RESEND_API_URL = "https://api.resend.com";

/**
 * Per-brand coaching sender identity: which Resend account and which
 * from-address a brand's coach speaks from.
 *
 * `preferredFrom` is the brand's own domain — Relatti's own Resend account
 * (mail.relatti.com, verified 2026-07-02); MoneyTraits' future own domain
 * (mail.moneytraits.com, NOT yet verified as of 2026-07-20 — no Resend DKIM
 * in DNS). `sharedFrom` is the same coach voice on the always-verified shared
 * MasteryTV domain.
 *
 * Send strategy (mirrors send-email/index.ts): try the preferred identity,
 * and on a send failure fall back once to the shared identity — a brand whose
 * domain isn't verified yet still delivers under its own coach name, and
 * upgrades to its own domain automatically the moment DNS verifies (no
 * redeploy, no env flip).
 */
interface CoachIdentity {
  /** Env var naming the brand's own Resend API key (absent = shared account). */
  keyEnv?: string;
  /** The brand's own-domain sender. */
  preferredFrom: string;
  /** Same coach voice on the shared MasteryTV-verified domain. */
  sharedFrom: string;
}

const COACH_IDENTITY: Record<BrandId, CoachIdentity> = {
  masterytv: {
    preferredFrom: "Mastery Coach <coach@mail.masterytv.com>",
    sharedFrom: "Mastery Coach <coach@mail.masterytv.com>",
  },
  relatti: {
    keyEnv: "RESEND_API_KEY_RELATTI",
    preferredFrom: "Relatti Coach <coach@mail.relatti.com>",
    sharedFrom: "Relatti Coach <coach@mail.masterytv.com>",
  },
  money: {
    // Founder decision 2026-07-20: money sends from the shared MasteryTV
    // domain for now — no money domain is verified in Resend, so a preferred
    // own-domain attempt would just 403 + retry on every send. When
    // mail.moneytraits.com IS verified, set preferredFrom to
    // "MoneyTraits Coach <coach@mail.moneytraits.com>" (and keyEnv if it gets
    // its own account); nothing else needs to change.
    preferredFrom: "MoneyTraits Coach <coach@mail.masterytv.com>",
    sharedFrom: "MoneyTraits Coach <coach@mail.masterytv.com>",
  },
  heard: {
    // Founder decision 2026-08-13: HEARD sends from the shared MasteryTV
    // domain until mail.youheard.org is verified in Resend. Then set
    // preferredFrom to "HEARD <coach@mail.youheard.org>" and nothing else
    // changes.
    //
    // No "Coach" in the display name, unlike every other brand here. On a lock
    // screen the sender is the disclosure, and "HEARD Coach" invites the
    // question this person is least able to answer in front of other people.
    preferredFrom: "HEARD <coach@mail.masterytv.com>",
    sharedFrom: "HEARD <coach@mail.masterytv.com>",
  },
};

// ─── SEND EMAIL ─────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Pin an exact sender — skips the identity registry AND the fallback. */
  from?: string;
  /** Vertical whose coach identity (account + from) to send as. */
  brand?: BrandId;
}

interface SendEmailResult {
  id: string;
}

async function postResendEmail(
  apiKey: string,
  from: string,
  params: SendEmailParams
): Promise<SendEmailResult> {
  const body: Record<string, unknown> = {
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  };

  if (params.text) body.text = params.text;
  if (params.replyTo) body.reply_to = params.replyTo;
  if (params.headers) body.headers = params.headers;

  const response = await fetch(`${RESEND_API_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error (${response.status}): ${err}`);
  }

  return await response.json();
}

/**
 * Send an email via Resend API as the brand's coach identity.
 * Returns the Resend email ID for tracking.
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const brand: BrandId = params.brand ?? "masterytv";
  const identity = COACH_IDENTITY[brand];
  const sharedKey = Deno.env.get("RESEND_API_KEY");
  const ownKey = identity.keyEnv ? Deno.env.get(identity.keyEnv) : undefined;
  const primaryKey = ownKey ?? sharedKey;
  if (!primaryKey) throw new Error("RESEND_API_KEY not set");

  const preferredFrom = params.from ?? identity.preferredFrom;
  try {
    const result = await postResendEmail(primaryKey, preferredFrom, params);
    console.log(`[resend] sent as ${brand} "${preferredFrom}" (${result.id})`);
    return result;
  } catch (err) {
    // One shared-identity retry — covers a not-yet-verified brand domain and
    // a brand-account outage. Never when the caller pinned `from`, and never
    // when it would just repeat the identical key + from attempt.
    const differs =
      preferredFrom !== identity.sharedFrom || primaryKey !== sharedKey;
    if (params.from || !sharedKey || !differs) throw err;
    console.warn(
      `[resend] ${brand} preferred sender failed (${(err as Error).message}); retrying as "${identity.sharedFrom}"`
    );
    const result = await postResendEmail(sharedKey, identity.sharedFrom, params);
    console.log(
      `[resend] sent as ${brand} "${identity.sharedFrom}" (${result.id})`
    );
    return result;
  }
}

// ─── RETRIEVE RECEIVED EMAIL ────────────────────────────────────────────

interface ReceivedEmail {
  id: string;
  /**
   * The RFC 2822 Message-ID (`<...@host>`) — NOT `id`, which is Resend's UUID.
   * This is the only value mail clients will thread on; optional because a
   * malformed inbound message can arrive without one.
   */
  message_id?: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  created_at: string;
}

/**
 * Retrieve the full content of a received email by ID.
 * Resend webhooks only send metadata — this fetches the body.
 */
export async function getReceivedEmail(
  emailId: string
): Promise<ReceivedEmail> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const response = await fetch(
    `${RESEND_API_URL}/emails/receiving/${emailId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `Resend API error fetching received email (${response.status}): ${err}`
    );
  }

  return await response.json();
}

// ─── EMAIL THREADING ────────────────────────────────────────────────────

/**
 * Build email headers for conversation threading.
 * Uses standard In-Reply-To + References headers so replies chain correctly
 * in Gmail, Outlook, Apple Mail, etc.
 */
export function buildThreadHeaders(
  conversationId: string,
  previousMessageId?: string
): Record<string, string> {
  // Generate a stable Message-ID based on conversation
  const messageId = `<coach-${conversationId}-${Date.now()}@mail.masterytv.com>`;
  const headers: Record<string, string> = {
    "Message-ID": messageId,
  };

  // Only a real RFC 2822 msg-id threads. Anything else (notably Resend's
  // `email_id` UUID, which this was called with until 2026-07-24) is dropped
  // rather than emitted — a malformed In-Reply-To is worse than none, since
  // some clients treat the whole header set as suspect.
  if (previousMessageId && /^<[^\s<>@]+@[^\s<>@]+>$/.test(previousMessageId)) {
    headers["In-Reply-To"] = previousMessageId;
    headers["References"] = previousMessageId;
  }

  return headers;
}

// ─── STRIP EMAIL NOISE ──────────────────────────────────────────────────

/**
 * Strip email reply noise from inbound messages:
 * - Quoted text ("On Jan 1, 2026, user wrote:")
 * - Email signatures (lines starting with "-- " or "—")
 * - Forwarded content
 * - Excessive whitespace
 *
 * Goal: extract ONLY the user's new reply, discarding everything else.
 */
export function stripEmailNoise(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    // Stop at quoted reply markers
    if (/^>/.test(line)) break;
    if (/^On .+ wrote:$/i.test(line.trim())) break;
    if (/^-{3,}/.test(line.trim())) break;

    // Stop at signature markers
    if (/^-- ?$/.test(line.trim())) break;
    if (/^—$/.test(line.trim())) break;
    if (/^Sent from my (iPhone|iPad|Galaxy|Android)/i.test(line.trim())) break;
    if (/^Get Outlook for/i.test(line.trim())) break;

    // Stop at forwarded content
    if (/^-+ ?Forwarded message/i.test(line.trim())) break;
    if (/^Begin forwarded message/i.test(line.trim())) break;

    cleaned.push(line);
  }

  return cleaned
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
    .trim();
}

// ─── HTML EMAIL TEMPLATE ────────────────────────────────────────────────

/**
 * Per-brand coaching-email chrome. Origins double as the deep-link base.
 * Record<BrandId,…> keeps this exhaustive — a new brand without chrome is a
 * compile error, not a TypeError mid-send (money was missing until 2026-07-20;
 * a money-branded send would have crashed on `brand.name`).
 */
const EMAIL_BRANDS: Record<
  BrandId,
  {
    name: string;
    origin: string;
    gradient: string;
    darkGradient: string;
    accent: string;
    link: string;
    footerLine: string;
  }
> = {
  masterytv: {
    name: "Mastery Coach",
    origin: "https://masterytv.com",
    gradient: "linear-gradient(135deg, #667eea, #764ba2)",
    darkGradient: "linear-gradient(135deg, #1a1a3e, #2d1b69)",
    accent: "#764ba2",
    link: "#667eea",
    footerLine:
      "Mastery Coach by MasteryTV · You're receiving this because you enabled email coaching.",
  },
  relatti: {
    name: "Relatti",
    origin: "https://relatti.com",
    gradient: "linear-gradient(135deg, #f43f5e, #be123c)",
    darkGradient: "linear-gradient(135deg, #3f1120, #4c0519)",
    accent: "#be123c",
    link: "#e11d48",
    footerLine:
      "Relatti · You're receiving this because you enabled email coaching.",
  },
  // Emerald palette from the money favicon tile (public/money/icon.svg).
  money: {
    name: "MoneyTraits",
    origin: "https://moneytraits.com",
    gradient: "linear-gradient(135deg, #059669, #047857)",
    darkGradient: "linear-gradient(135deg, #022c22, #064e3b)",
    accent: "#047857",
    link: "#059669",
    footerLine:
      "MoneyTraits by MasteryTV · You're receiving this because you enabled email coaching.",
  },
  // Slate palette from the HEARD favicon tile (public/heard/icon.svg).
  //
  // ⚠️ The footer line says less than the other three on purpose. Every other
  // vertical names itself and its parent in the footer, which is ordinary
  // brand hygiene; here the email may be read over somebody's shoulder, so the
  // chrome carries the wordmark, the opt-out reason and nothing that describes
  // what the service is for (INTEGRATION_EXPERIENCE §1.1, the 🔴 proactive row).
  heard: {
    name: "HEARD",
    origin: "https://youheard.org",
    gradient: "linear-gradient(135deg, #2b6991, #14415c)",
    darkGradient: "linear-gradient(135deg, #061520, #1b5274)",
    accent: "#1b5274",
    link: "#2b6991",
    footerLine: "HEARD · You asked for these. Reply STOP and they end.",
  },
};

export interface CoachingEmailOptions {
  /** Which vertical's chrome to render (default masterytv). */
  brand?: keyof typeof EMAIL_BRANDS;
  /** Deep link to the conversation this message belongs to. */
  conversationUrl?: string;
}

/**
 * Build a premium HTML email template for a coaching response.
 * Mobile-responsive, dark-mode aware, branded per vertical.
 */
export function buildCoachingEmailHtml(
  coachResponse: string,
  userName: string,
  conversationId: string,
  options: CoachingEmailOptions = {}
): string {
  const brand = EMAIL_BRANDS[options.brand ?? "masterytv"];
  // Convert markdown-like formatting to HTML
  const htmlBody = coachResponse
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
    .replace(/^- (.+)$/gm, "<li>$1</li>") // List items
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`) // Wrap in <ul>
    .replace(/\n\n/g, "</p><p>") // Paragraphs
    .replace(/\n/g, "<br>") // Line breaks
    .replace(/🆘|💬|🌍|📞|💛|🎯|✅|🔥|💡|🚀/g, (emoji) => `<span style="font-size:1.2em">${emoji}</span>`); // Enlarge emoji

  const conversationCta = options.conversationUrl
    ? `<div class="conversation-cta">
        <a href="${options.conversationUrl}">See the conversation this refers to →</a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${brand.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :root { color-scheme: light dark; }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #f8f9fa;
      color: #1a1a2e;
      -webkit-text-size-adjust: 100%;
    }

    @media (prefers-color-scheme: dark) {
      body { background-color: #0d0d1a; color: #e8e8f0; }
      .email-container { background-color: #16162a !important; }
      .header-bar { background: ${brand.darkGradient} !important; }
      .footer { color: #666 !important; }
    }

    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .email-container {
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .header-bar {
      background: ${brand.gradient};
      padding: 24px 32px;
      text-align: center;
    }

    .header-bar h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.5px;
    }

    .body-content {
      padding: 32px;
      line-height: 1.7;
      font-size: 15px;
    }

    .body-content p { margin: 0 0 16px 0; }
    .body-content ul { padding-left: 20px; margin: 0 0 16px 0; }
    .body-content li { margin-bottom: 8px; }
    .body-content strong { color: ${brand.accent}; }

    .conversation-cta {
      text-align: center;
      padding: 0 32px 8px;
    }

    .conversation-cta a {
      font-size: 13px;
      font-weight: 500;
      color: ${brand.link};
      text-decoration: none;
    }

    .reply-cta {
      text-align: center;
      padding: 16px 32px 32px;
    }

    .reply-cta p {
      font-size: 13px;
      color: #888;
      margin: 0;
    }

    .footer {
      text-align: center;
      padding: 16px 32px;
      font-size: 11px;
      color: #aaa;
      border-top: 1px solid #eee;
    }

    .footer a { color: ${brand.link}; text-decoration: none; }

    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px; }
      .body-content { padding: 20px; font-size: 14px; }
      .header-bar { padding: 16px 20px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header-bar">
        <h1>${brand.name}</h1>
      </div>
      <div class="body-content">
        <p>${htmlBody}</p>
      </div>
      ${conversationCta}
      <div class="reply-cta">
        <p>💬 Just reply to this email to continue the conversation</p>
      </div>
      <div class="footer">
        <p>
          <a href="${brand.origin}/dashboard">Open Dashboard</a> ·
          <a href="${brand.origin}/dashboard/settings">Settings</a>
        </p>
        <p style="margin-top: 8px;">
          ${brand.footerLine}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
