/**
 * Founder notification — emails Tom on tester signals (feedback, beta unlocks)
 * so nothing sits unseen in the DB. Platform-wide since 2026-07-20 (the
 * feedback widget mounts on every brand's dashboard), so the caller must say
 * which brand the signal came from and the sender identity is brand-keyed —
 * a MoneyTraits bug report must not arrive dressed as Relatti Beta.
 *
 * Why server-only: uses the Resend API key. Relatti has its OWN Resend
 * account (RESEND_API_KEY_RELATTI, mail.relatti.com verified 2026-07-02);
 * every other brand rides the shared MasteryTV account + domain, as does
 * Relatti when its key isn't set (e.g. not yet added to a Vercel env).
 * MoneyTraits sends from the shared domain until mail.moneytraits.com is
 * verified — internal mail, so the display name carries the brand.
 * Failures are logged, never thrown: a missed notification must not break
 * the user's action.
 */
import type { BrandId } from "@/lib/platform/brand";

const FOUNDER_EMAIL = "tom@masterytv.com";

interface Sender {
  apiKey: string | undefined;
  from: string;
}

/** Exhaustive per-brand sender (BRAND.md §1.1 wordmarks) — a new brand must
 * declare its from-identity instead of inheriting another vertical's. */
function senderFor(brandId: BrandId): Sender {
  const shared = process.env.RESEND_API_KEY;
  const relattiKey = process.env.RESEND_API_KEY_RELATTI;
  const senders: Record<BrandId, Sender> = {
    masterytv: { apiKey: shared, from: "Mastery Coach <donotreply@mail.masterytv.com>" },
    relatti: relattiKey
      ? { apiKey: relattiKey, from: "Relatti Beta <donotreply@mail.relatti.com>" }
      : { apiKey: shared, from: "Relatti Beta <donotreply@mail.masterytv.com>" },
    money: { apiKey: shared, from: "MoneyTraits <donotreply@mail.masterytv.com>" },
  };
  return senders[brandId];
}

export async function notifyFounder(
  brandId: BrandId,
  subject: string,
  html: string,
): Promise<void> {
  const { apiKey, from } = senderFor(brandId);
  if (!apiKey) {
    console.error("[notify] RESEND_API_KEY not set — skipping founder email");
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [FOUNDER_EMAIL], subject, html }),
    });
  } catch (err) {
    console.error("[notify] Resend error:", err);
  }
}

/** Escape user-supplied text before embedding in notification HTML. */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
