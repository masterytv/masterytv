/**
 * Consent state machine for the negotiated PARTNER-visibility axis
 * (`decoded_invites.share_with_human`).
 *
 * This is the PURE decision core extracted from `app/api/relatti/partner-sharing`
 * so the transition rules can be exhaustively unit-tested (they encode privacy
 * promises we have already regressed once). The route stays responsible for I/O:
 * auth, fetching the invite, applying the returned `patch`, and re-syncing the
 * spine when `syncAfter` is set. Given the same inputs this function is a total,
 * side-effect-free mapping to either an HTTP error or a DB patch + response.
 *
 * The four actions (see PRD / 2026-07-01 two-axis split):
 *   • request — RAISE the level. Stores a pending request; the *partner* must
 *     accept before it applies (raising is bilateral by design).
 *   • accept  — apply the partner's pending request. You cannot accept your own.
 *   • decline — clear a pending request without applying it.
 *   • lower   — REDUCE the level (incl. 'none' = Private). Immediate + unilateral.
 *     Going Private stamps `revoked_at` so `relatti_sync_invite` won't re-default
 *     it upward (the "Private guard" — a deliberate Private must survive re-sync).
 *
 * NOTE on `share_with_coach`: it is written here only as a VESTIGIAL mirror of
 * `share_with_human` (kept equal for legacy surfaces). It is NOT the coach axis —
 * the real per-person coach axis is `participant.coach_share_level`, set unilaterally
 * via a different route and never touched here. Do not "fix" the mirror away without
 * reconciling the legacy readers first.
 */

// Rank of each stored level. `compatibility` and `type_compatibility` are the
// same rung (the column has carried both spellings historically).
export const CONSENT_RANK: Record<string, number> = {
  none: 0,
  compatibility: 1,
  type_compatibility: 1,
  full: 2,
};

// The levels a client is allowed to request/target.
export const CONSENT_LEVELS = ["none", "type_compatibility", "full"] as const;
export type ConsentLevel = (typeof CONSENT_LEVELS)[number];

export type ConsentAction = "request" | "accept" | "decline" | "lower";

export interface ConsentInput {
  /** The requested action. Anything unrecognized → 400 "Unknown action". */
  action: string;
  /** Target level for request/lower. Ignored for accept/decline. */
  level: string | null;
  /** Current stored `share_with_human` (treat null/empty as "none"). */
  current: string | null;
  /** Pending request stored on the invite (`upgrade_requested_level`). */
  requestedLevel: string | null;
  /** Who made the pending request (`upgrade_requested_by`). */
  requestedBy: string | null;
  /** The authenticated caller's user id. */
  userId: string;
  /** ISO timestamp to stamp into the patch (injected for determinism). */
  now: string;
}

export type ConsentResult =
  | { ok: false; httpStatus: number; error: string }
  | {
      ok: true;
      /** Columns to UPDATE on the invite row. */
      patch: Record<string, unknown>;
      /** JSON body to return on a successful write. */
      response: { success: true; status: string; level?: string };
      /** Message to return if the DB write fails (parity with the old route). */
      failureMessage: string;
      /** Whether to re-run `syncEngagementForInvite` after the write. */
      syncAfter: boolean;
    };

function isLevel(v: string | null): v is ConsentLevel {
  return v != null && (CONSENT_LEVELS as readonly string[]).includes(v);
}

/**
 * Pure reducer for the partner-sharing consent axis. Does NOT perform auth or
 * verify the caller is a party to the invite — the route does that before calling.
 */
export function reduceConsent(input: ConsentInput): ConsentResult {
  const { action, level, requestedLevel, requestedBy, userId, now } = input;
  const current = input.current || "none";

  switch (action) {
    case "request": {
      // A request must strictly RAISE the level, and target a valid level.
      if (!isLevel(level) || CONSENT_RANK[level] <= CONSENT_RANK[current]) {
        return { ok: false, httpStatus: 400, error: "A request must raise the level" };
      }
      return {
        ok: true,
        patch: { upgrade_requested_level: level, upgrade_requested_by: userId },
        response: { success: true, status: "requested", level },
        failureMessage: "Failed to save request",
        syncAfter: false,
      };
    }

    case "accept": {
      // There must be a pending request, and you cannot accept your own.
      if (!requestedLevel || requestedBy === userId) {
        return { ok: false, httpStatus: 400, error: "Nothing to accept" };
      }
      return {
        ok: true,
        patch: {
          share_with_human: requestedLevel,
          share_with_coach: requestedLevel, // vestigial mirror — see file header
          status: "consented",
          consented_at: now,
          revoked_at: null,
          upgrade_requested_level: null,
          upgrade_requested_by: null,
        },
        response: { success: true, status: "accepted", level: requestedLevel },
        failureMessage: "Failed to accept",
        syncAfter: true,
      };
    }

    case "decline": {
      return {
        ok: true,
        patch: { upgrade_requested_level: null, upgrade_requested_by: null },
        response: { success: true, status: "declined" },
        failureMessage: "Failed to decline",
        syncAfter: false,
      };
    }

    case "lower": {
      // Lowering must strictly REDUCE the level, and target a valid level.
      if (!isLevel(level) || CONSENT_RANK[level] >= CONSENT_RANK[current]) {
        return { ok: false, httpStatus: 400, error: "Lowering must reduce the level" };
      }
      const goingPrivate = level === "none";
      return {
        ok: true,
        patch: {
          share_with_human: level,
          share_with_coach: level, // vestigial mirror — see file header
          status: goingPrivate ? "completed" : "consented",
          consented_at: goingPrivate ? null : now,
          // Private guard: stamp revoked_at so relatti_sync_invite won't re-default up.
          revoked_at: goingPrivate ? now : null,
          upgrade_requested_level: null,
          upgrade_requested_by: null,
        },
        response: { success: true, status: "lowered", level },
        failureMessage: "Failed to update",
        syncAfter: true,
      };
    }

    default:
      return { ok: false, httpStatus: 400, error: "Unknown action" };
  }
}
