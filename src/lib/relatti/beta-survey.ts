import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyFounder, escapeHtml } from "@/lib/relatti/notify";

/**
 * Beta before/after check-ins — shared server-side helpers.
 *
 * The deal: free unlimited beta access ⇄ a 2-minute check-in at unlock and one
 * at day 14. The BEFORE satisfaction baseline is NOT re-asked — the tester
 * already answered CSI-4 (Couples Satisfaction Index, validated, 0–21) inside
 * the assessment; we snapshot that into beta_surveys.csi_total at unlock time
 * so a later retake can't move the baseline. The AFTER check-in re-administers
 * CSI-4 verbatim; the delta powers the marketing stat.
 *
 * Privacy contract (mirrored in the form copy + /privacy): coaching content is
 * never read for this; answers are used anonymously in aggregate; a quote is
 * published only with quote_permission, attributed per quote_attribution.
 *
 * All writes here run with the SERVICE ROLE (RLS has select-self only), so
 * consent flags can't be forged client-side. Callers must pass an admin client.
 */

export interface BeforeSurvey {
  relationshipLength: string; // lt1 | y1_3 | y3_7 | y7_15 | gt15
  hopefulness: number; // 1 (skeptical) – 5 (very hopeful)
  topChange: string; // "the #1 thing you hope changes"
}

export const RELATIONSHIP_LENGTHS = ["lt1", "y1_3", "y3_7", "y7_15", "gt15"] as const;

/** Human labels for notification emails / admin surfaces. */
export const RELATIONSHIP_LENGTH_LABELS: Record<string, string> = {
  lt1: "under a year",
  y1_3: "1–3 years",
  y3_7: "3–7 years",
  y7_15: "7–15 years",
  gt15: "15+ years",
};

export const IMPROVED_LABELS: Record<string, string> = {
  much_better: "a lot better",
  somewhat_better: "somewhat better",
  same: "about the same",
  somewhat_worse: "somewhat worse",
  much_worse: "a lot worse",
};

export function parseBeforeSurvey(body: unknown): BeforeSurvey | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const relationshipLength = String(b.relationshipLength ?? "");
  const hopefulness = Number(b.hopefulness);
  const topChange = String(b.topChange ?? "").trim().slice(0, 2000);
  if (!(RELATIONSHIP_LENGTHS as readonly string[]).includes(relationshipLength)) return null;
  if (!Number.isInteger(hopefulness) || hopefulness < 1 || hopefulness > 5) return null;
  if (!topChange) return null;
  return { relationshipLength, hopefulness, topChange };
}

/**
 * The tester's CSI-4 baseline: total_score from their latest completed,
 * non-superseded assessment. Null when they haven't assessed yet (rare — the
 * beta page is normally reached from the coach limit, i.e. post-assessment);
 * the admin delta stats simply skip null baselines.
 */
export async function getBaselineCsi(
  admin: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data: assessment } = await admin
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .neq("current_layer", "superseded")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assessment) return null;

  const { data: score } = await admin
    .from("assessment_scores")
    .select("total_score")
    .eq("assessment_id", assessment.id)
    .eq("instrument_id", "csi4")
    .maybeSingle();
  const total = score?.total_score;
  return total == null ? null : Number(total);
}

/**
 * Idempotently record the BEFORE check-in (unique user+phase — a second submit
 * returns 'already' and changes nothing, protecting the baseline). Returns the
 * snapshotted baseline too, so notification emails can show it.
 */
export async function insertBeforeSurvey(
  admin: SupabaseClient,
  userId: string,
  survey: BeforeSurvey
): Promise<{ status: "ok" | "already" | "error"; baseline: number | null }> {
  const baseline = await getBaselineCsi(admin, userId);
  const { error } = await admin.from("beta_surveys").insert({
    user_id: userId,
    phase: "before",
    responses: {
      relationshipLength: survey.relationshipLength,
      hopefulness: survey.hopefulness,
      topChange: survey.topChange,
    },
    csi_total: baseline,
  });
  if (!error) return { status: "ok", baseline };
  if (error.code === "23505") return { status: "already", baseline }; // unique_violation
  console.error("[beta-survey] before insert failed:", error.message);
  return { status: "error", baseline };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full beta-offer redemption: code + before check-in → beta_access.
// Shared by the unlock page API and the dashboard auto-redeem (the /beta
// pre-registration cookie), so both paths behave identically.
// ─────────────────────────────────────────────────────────────────────────────

export interface RedeemOutcome {
  /** ok | already → success; the rest are user-facing failures. */
  status: "ok" | "already" | "invalid" | "expired" | "exhausted" | "error";
  error?: string;
}

const REDEEM_ERRORS: Record<string, string> = {
  invalid: "That code isn't valid. Double-check it and try again.",
  expired: "That code is no longer active.",
  exhausted: "That code has already been fully claimed. Ask us for a fresh one.",
};

/**
 * Redeem an invite code and record the BEFORE check-in for `user`. On a fresh
 * grant, stores the optional note as feedback and sends the founder a
 * self-explanatory notification. Never throws.
 */
export async function redeemBetaOffer(
  admin: SupabaseClient,
  user: { id: string; email?: string | null },
  code: string,
  survey: BeforeSurvey,
  opts: { note?: string; source?: string } = {}
): Promise<RedeemOutcome> {
  const { data: status, error } = await admin.rpc("redeem_beta_code", {
    p_code: code,
    p_user_id: user.id,
  });
  if (error) {
    console.error("[beta-redeem] redeem_beta_code failed:", error.message);
    return { status: "error", error: "Could not verify your code. Please try again." };
  }
  const s = String(status);
  if (s !== "ok" && s !== "already") {
    return {
      status: (s in REDEEM_ERRORS ? s : "error") as RedeemOutcome["status"],
      error: REDEEM_ERRORS[s] ?? "Could not redeem that code.",
    };
  }

  // Record the before check-in for fresh grants AND 'already' users (existing
  // testers backfilling through the same flow). Idempotent via unique(user, phase).
  const { baseline } = await insertBeforeSurvey(admin, user.id, survey);

  if (s === "ok") {
    if (opts.note) {
      await admin.from("feedback").insert({
        user_id: user.id,
        category: "beta_signup",
        message: opts.note,
        page_url: opts.source ?? "/dashboard/beta",
      });
    }

    // Which code they used + how much of its cap is left (for the notification).
    const { data: codeRow } = await admin
      .from("users")
      .select("beta_code_id, beta_invite_codes:beta_code_id (code, label, uses, max_uses)")
      .eq("id", user.id)
      .maybeSingle();
    const codeInfo = (codeRow?.beta_invite_codes ?? null) as
      | { code: string; label: string | null; uses: number; max_uses: number }
      | null;

    const email = user.email ?? "unknown";
    const lengthLabel = RELATIONSHIP_LENGTH_LABELS[survey.relationshipLength] ?? survey.relationshipLength;
    await notifyFounder(
      `Beta: new tester unlocked — ${email}`,
      `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#1a1a2e">
        <p style="margin:0 0 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Relatti beta · internal notification · no action needed</p>
        <p style="margin:0 0 16px"><strong>${escapeHtml(email)}</strong> redeemed an invite code and completed the <em>before</em> check-in (1 of 2) — they now have free unlimited coaching for the beta. Their 2-week check-in schedules itself: a dashboard banner plus up to 3 email nudges starting on day 14. Nothing for you to do.</p>
        <div style="background:#f6f7f9;border-radius:10px;padding:14px 16px;margin:0 0 16px">
          <p style="margin:0 0 6px"><strong>Where they're starting:</strong></p>
          <p style="margin:0 0 4px">Together ${escapeHtml(lengthLabel)} · hopefulness <strong>${survey.hopefulness}/5</strong> · satisfaction baseline ${baseline == null ? "not captured (no completed assessment yet)" : `<strong>${baseline}/21</strong> (CSI-4; 13.5 is the distress cutoff)`}</p>
          <p style="margin:0">Wants to change: &ldquo;${escapeHtml(survey.topChange)}&rdquo;</p>
        </div>
        ${
          codeInfo
            ? `<p style="margin:0 0 12px;font-size:13px;color:#555">Code used: <strong>${escapeHtml(codeInfo.code)}</strong>${codeInfo.label ? ` (${escapeHtml(codeInfo.label)})` : ""} — ${codeInfo.uses}/${codeInfo.max_uses} slots taken${opts.source === "/beta" ? " · came in through the /beta offer page" : ""}.</p>`
            : ""
        }
        <p style="margin:0;font-size:12px;color:#888">Funnel + check-in stats aggregate in the <a href="https://relatti.com/admin/beta">beta cockpit</a>.</p>
      </div>`
    );
  }

  return { status: s as RedeemOutcome["status"] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard beta-state resolution (runs on every Relatti dashboard load):
//   1. auto-redeem the /beta pre-registration cookie once the assessment is
//      done (so the CSI baseline exists), and
//   2. auto-enroll the partner of an existing beta tester (no code slot —
//      the couple is one unit; they owe their own before check-in instead).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

export interface BetaState {
  betaAccess: boolean;
  /** True exactly once — this load performed the /beta cookie auto-redeem. */
  justUnlocked: boolean;
  /** Has access but no before check-in yet (partner auto-enroll path). */
  needsBeforeCheckin: boolean;
  /** The pre-registered code failed at redemption (invalid/expired/full). */
  redeemError: string | null;
}

export async function resolveBetaAccess(
  user: { id: string; email?: string | null },
  opts: {
    assessmentCompleted: boolean;
    /** Raw `beta_offer` cookie value (URL-encoded JSON), if present. */
    offerCookie: string | undefined;
    hasBeforeSurvey: boolean;
  }
): Promise<BetaState> {
  const none: BetaState = {
    betaAccess: false,
    justUnlocked: false,
    needsBeforeCheckin: false,
    redeemError: null,
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return none;
  const admin = createServiceRoleClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: u } = await admin
      .from("users")
      .select("beta_access")
      .eq("id", user.id)
      .maybeSingle();
    if (u?.beta_access) {
      return { ...none, betaAccess: true, needsBeforeCheckin: !opts.hasBeforeSurvey };
    }

    // 1) The /beta pre-registration cookie — redeem once the assessment exists
    //    (the CSI baseline snapshots correctly). Idempotent: success flips
    //    beta_access, so this branch never runs again; the stale cookie expires.
    if (opts.offerCookie && opts.assessmentCompleted) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(decodeURIComponent(opts.offerCookie));
      } catch {
        return none; // malformed cookie — fall back to the manual unlock page
      }
      const p = (parsed ?? {}) as Record<string, unknown>;
      const code = String(p.code ?? "").trim();
      const survey = parseBeforeSurvey(p);
      if (code && survey) {
        const result = await redeemBetaOffer(admin, user, code, survey, { source: "/beta" });
        if (result.status === "ok" || result.status === "already") {
          return { betaAccess: true, justUnlocked: result.status === "ok", needsBeforeCheckin: false, redeemError: null };
        }
        // Dead/full code discovered post-signup: surface it honestly on the
        // dashboard instead of silently leaving them capped.
        return { ...none, redeemError: result.error ?? "Your invite code couldn't be applied." };
      }
    }

    // 2) Partner auto-enroll: connected to someone who has beta access →
    //    they're covered too (no code slot consumed; they owe their own
    //    before check-in, prompted by the dashboard banner).
    const { data: invites } = await admin
      .from("decoded_invites")
      .select("inviter_id, recipient_id")
      .or(`inviter_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .not("recipient_id", "is", null);
    const partnerIds = [
      ...new Set(
        (invites ?? [])
          .flatMap((i) => [i.inviter_id as string, i.recipient_id as string])
          .filter((id) => id && id !== user.id)
      ),
    ];
    if (partnerIds.length) {
      const { data: partners } = await admin
        .from("users")
        .select("id, email, beta_access")
        .in("id", partnerIds);
      const sponsor = (partners ?? []).find((p) => p.beta_access);
      if (sponsor) {
        const { error } = await admin
          .from("users")
          .update({ beta_access: true, beta_access_granted_at: new Date().toISOString() })
          .eq("id", user.id);
        if (!error) {
          await notifyFounder(
            `Beta: partner auto-enrolled — ${user.email ?? "unknown"}`,
            `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#1a1a2e">
              <p style="margin:0 0 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Relatti beta · internal notification · no action needed</p>
              <p style="margin:0 0 12px"><strong>${escapeHtml(user.email ?? "unknown")}</strong> is the partner of beta tester <strong>${escapeHtml((sponsor.email as string) ?? "unknown")}</strong>, so they were auto-enrolled in the beta (couples count as one unit — no invite-code slot was consumed).</p>
              <p style="margin:0;font-size:13px;color:#555">Their dashboard will ask for their own 2-minute before check-in, and their day-14 follow-up schedules from that. Stats aggregate in the <a href="https://relatti.com/admin/beta">beta cockpit</a>.</p>
            </div>`
          );
          return { betaAccess: true, justUnlocked: false, needsBeforeCheckin: !opts.hasBeforeSurvey, redeemError: null };
        }
      }
    }

    return none;
  } catch (err) {
    console.error("[beta-resolve] error:", err);
    return none;
  }
}
