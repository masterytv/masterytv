import type { SupabaseClient } from "@supabase/supabase-js";

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
