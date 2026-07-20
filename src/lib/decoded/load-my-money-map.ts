/**
 * Load the signed-in user's MoneyTraits™ bundle for the inline reveal card
 * (MONEY_TRAITS_INSTRUMENT.md §5 — the Rung-0 artifact at the top of the money
 * reveal chat). Client-side: the reveal NARRATION is built server-side at Layer
 * 4.5, but the CARD is a DOM artifact, so the browser needs the stored bundle.
 *
 * Reads the bundle the money WRITE path persisted (assessment_reports
 * .sections.money_map — T2 read contract); NEVER re-scores.
 *
 * Two deliberate shapes:
 *  - PROGRAM-SCOPED read. assessment_reports carries `program`; a `user_id`-only
 *    read of it crosses verticals for a dual-brand user (and fails check:tenancy).
 *    The `.eq("program", programSlug)` scope is what makes this the current
 *    vertical's report, not another's.
 *  - DATA-DRIVEN, not brand-gated. We select only the JSON path
 *    `sections->money_map`, so a report that has no money_map (every general /
 *    relationship report — those carry LLM sections) yields null and no card,
 *    with no `program === "money"` guard anywhere. The JSON-path select also
 *    keeps the payload tiny for those verticals (never pulls their S1–S8 blob).
 */

import { createClient } from "@/lib/supabase/client";
import type { StoredMoneyMap } from "@/lib/decoded/scoring/money-maps";

export async function loadMyMoneyMap(
  userId: string,
  programSlug: string,
): Promise<StoredMoneyMap | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessment_reports")
    .select("money_map:sections->money_map, created_at")
    .eq("user_id", userId)
    .eq("program", programSlug) // tenancy scope — never a user_id-only read
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  // The JSON path yields the bundle object directly, or null when this program's
  // latest report carries no money_map (the general/relationship case).
  return (data.money_map as StoredMoneyMap | null) ?? null;
}
