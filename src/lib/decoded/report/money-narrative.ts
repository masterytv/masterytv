/**
 * MoneyTraits™ report narrative — the LLM-written long-form layer stored at
 * `assessment_reports.sections.money_narrative` by the money-generate-report
 * edge function (which is the writer AND the structural validator; its
 * validateNarrative() is the enforcement twin of this shape — keep in lockstep).
 *
 * The deterministic bundle (`sections.money_map`) stays the only numeric truth;
 * this narrative is prose ABOUT it, personalized with the user's profile and
 * their own item answers. A report may legitimately have no narrative yet
 * (still generating, generation failed, or a pre-2026-07-20 report) — every
 * consumer must render the deterministic layer standalone in that case.
 */

export interface MoneyNarrative {
  version: number;
  generated_at?: string;
  model?: string;
  /** The mirror: a specific behavioral read, before any concept is named. */
  cold_open: string;
  archetype: { headline: string; body: string[] };
  edge: {
    headline: string;
    body: string[];
    strengths: Array<{ label: string; line: string }>;
  };
  challenge: { headline: string; body: string[]; tells: string[] };
  quiet_map: { headline: string; body: string[] };
  fear: { headline: string; body: string[] };
  in_the_wild: {
    headline: string;
    scenes: Array<{ setting: string; moment: string }>;
  };
  dialed_right: {
    headline: string;
    body: string[];
    shifts: Array<{ from: string; to: string }>;
  };
  coach_handoff: { body: string[]; first_questions: string[] };
  pull_quote: string;
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function stringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every(nonEmptyString);
}

/**
 * Runtime guard for the stored blob. Deliberately strict: a half-formed or
 * error-marked narrative ({ error: … }) fails here, and the report renders its
 * deterministic layer while the edge function's already_complete guard lets the
 * next page view regenerate. Loud absence beats a broken page.
 */
export function isMoneyNarrative(v: unknown): v is MoneyNarrative {
  if (!v || typeof v !== "object" || "error" in (v as Record<string, unknown>)) return false;
  const n = v as Record<string, ReturnType<typeof JSON.parse>>;
  return (
    typeof n.version === "number" &&
    nonEmptyString(n.cold_open) &&
    nonEmptyString(n.pull_quote) &&
    nonEmptyString(n.archetype?.headline) && stringArray(n.archetype?.body) &&
    nonEmptyString(n.edge?.headline) && stringArray(n.edge?.body) &&
    Array.isArray(n.edge?.strengths) && n.edge.strengths.length > 0 &&
    n.edge.strengths.every((s: unknown) => {
      const x = s as { label?: unknown; line?: unknown };
      return nonEmptyString(x?.label) && nonEmptyString(x?.line);
    }) &&
    nonEmptyString(n.challenge?.headline) && stringArray(n.challenge?.body) && stringArray(n.challenge?.tells) &&
    nonEmptyString(n.quiet_map?.headline) && stringArray(n.quiet_map?.body) &&
    nonEmptyString(n.fear?.headline) && stringArray(n.fear?.body) &&
    nonEmptyString(n.in_the_wild?.headline) &&
    Array.isArray(n.in_the_wild?.scenes) && n.in_the_wild.scenes.length > 0 &&
    n.in_the_wild.scenes.every((s: unknown) => {
      const x = s as { setting?: unknown; moment?: unknown };
      return nonEmptyString(x?.setting) && nonEmptyString(x?.moment);
    }) &&
    nonEmptyString(n.dialed_right?.headline) && stringArray(n.dialed_right?.body) &&
    Array.isArray(n.dialed_right?.shifts) && n.dialed_right.shifts.length > 0 &&
    n.dialed_right.shifts.every((s: unknown) => {
      const x = s as { from?: unknown; to?: unknown };
      return nonEmptyString(x?.from) && nonEmptyString(x?.to);
    }) &&
    stringArray(n.coach_handoff?.body) && stringArray(n.coach_handoff?.first_questions)
  );
}
