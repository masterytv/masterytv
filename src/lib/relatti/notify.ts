/**
 * Founder notification — emails Tom on tester signals (feedback, beta unlocks)
 * so nothing sits unseen in the DB during the Relatti beta.
 *
 * Why server-only: uses the Resend API key. Prefers Relatti's own account
 * (RESEND_API_KEY_RELATTI, mail.relatti.com verified 2026-07-02); falls back to
 * the shared MasteryTV account + domain if that env var isn't set (e.g. not yet
 * added to Vercel). Failures are logged, never thrown: a missed notification
 * must not break the user's action.
 */

const FOUNDER_EMAIL = "tom@masterytv.com";
const RELATTI_FROM = "Relatti Beta <donotreply@mail.relatti.com>";
const FALLBACK_FROM = "Relatti Beta <donotreply@mail.masterytv.com>";

export async function notifyFounder(subject: string, html: string): Promise<void> {
  const relattiKey = process.env.RESEND_API_KEY_RELATTI;
  const resendKey = relattiKey || process.env.RESEND_API_KEY;
  const from = relattiKey ? RELATTI_FROM : FALLBACK_FROM;
  if (!resendKey) {
    console.error("[notify] RESEND_API_KEY not set — skipping founder email");
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
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
