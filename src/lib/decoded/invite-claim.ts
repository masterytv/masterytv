/**
 * Pure helpers for the invite → claim handshake — the single source of truth for
 * (a) the email KEY both sides must agree on, and (b) the status an invite takes
 * when a recipient claims it. Extracted so they can be unit-tested and, crucially,
 * SHARED by invite creation and invite claiming so the two can never drift.
 *
 * Why this matters: an invite row is created keyed on the recipient's email, and a
 * claim looks the row up by that same email. If creation and claim normalize the
 * email differently (case, surrounding whitespace), the claim matches 0 rows and
 * the invitee is silently left unlinked (recipient_id null) → the dyad never forms
 * and the invitee is stuck on "invite your partner". That's the 2026-07-01
 * asymmetric-connection bug class. Keep BOTH sides on normalizeInviteEmail().
 */

// RFC-lite shape check — good enough to reject typos, not a full validator.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The canonical form of an invite recipient email — the match key. Trim first
 * (paste/leading-space guards), then lowercase (email local+domain are matched
 * case-insensitively here). Idempotent.
 */
export function normalizeInviteEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Does this input look like a valid email once normalized? */
export function isValidInviteEmail(raw: string | null | undefined): boolean {
  const email = normalizeInviteEmail(raw);
  return email.length > 0 && EMAIL_REGEX.test(email);
}

export interface ClaimPatch {
  recipient_id: string;
  recipient_report_id: string | null;
  status: "pending" | "completed";
  completed_at?: string;
}

/**
 * Columns to write when `userId` claims an invite addressed to them.
 *
 * An invite is "completed" the instant BOTH parties have a report — so if the
 * claimer already has one, complete it now; otherwise leave it "pending" until
 * they finish their assessment (sync-my-report promotes it later). completed_at
 * is stamped ONLY when completing, never on a pending claim.
 */
export function buildClaimPatch(userId: string, reportId: string | null, now: string): ClaimPatch {
  if (reportId) {
    return {
      recipient_id: userId,
      recipient_report_id: reportId,
      status: "completed",
      completed_at: now,
    };
  }
  return {
    recipient_id: userId,
    recipient_report_id: null,
    status: "pending",
  };
}
