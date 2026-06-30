/**
 * Founder notification — emails Tom on tester signals (feedback, beta unlocks)
 * so nothing sits unseen in the DB during the Relatti beta.
 *
 * Why server-only: uses the shared RESEND_API_KEY. Sends from the verified
 * mail.masterytv.com domain (mail.relatti.com isn't verified yet — see the
 * launch-blocker decisions). Failures are logged, never thrown: a missed
 * notification must not break the user's action.
 */

const FOUNDER_EMAIL = "tom@masterytv.com";
const FROM = "Relatti Beta <donotreply@mail.masterytv.com>";

export async function notifyFounder(subject: string, html: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
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
      body: JSON.stringify({ from: FROM, to: [FOUNDER_EMAIL], subject, html }),
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
