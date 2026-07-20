/**
 * Money Decision Room — the decision log (MONEY_EXPERIENCE.md §8, the V1 spine).
 *
 * Client-side CRUD over `money_decisions`: the user brings a live money decision,
 * the coach applies their whole trait profile to it in a thread, and the user
 * leaves a WRITTEN DECISION RECORD here. This is the Money OS's (§9) first durable
 * artifact.
 *
 * Two deliberate shapes:
 *  - PROGRAM-SCOPED reads. money_decisions carries `program`; every read filters
 *    `.eq("program", programSlug)` alongside user_id so a dual-brand user's
 *    decisions never cross verticals (check-tenancy PROGRAM_SCOPED). Writes stamp
 *    `program` so the row is self-describing.
 *  - GRACEFUL when the table is ABSENT. The staged migration
 *    (20260718000000_money_decisions.sql) applies only on a founder "go", and
 *    money is dark/undeployed — so every call swallows errors (relation missing,
 *    RLS, offline) and returns []/null. The Decision Room then shows its empty
 *    state instead of crashing. Mirrors load-my-money-map.ts's posture.
 *
 * Writes are client-side under the user's JWT; RLS (own-row CRUD) is the
 * enforcement, so there is no service-role route.
 */

import { createClient } from "@/lib/supabase/client";

export type MoneyDecisionStatus = "open" | "decided" | "parked";

export interface MoneyDecision {
  id: string;
  title: string;
  status: MoneyDecisionStatus;
  resolution: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

const SELECT_COLS =
  "id, title, status, resolution, conversation_id, created_at, updated_at, decided_at";

/**
 * The signed-in user's decisions in this program, newest activity first.
 * Program-scoped (never a user_id-only read). [] on any error — including the
 * pre-apply window where the table doesn't exist yet.
 */
export async function listMyDecisions(
  userId: string,
  programSlug: string,
): Promise<MoneyDecision[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("money_decisions")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .eq("program", programSlug) // tenancy scope — never a user_id-only read
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data as MoneyDecision[];
}

/**
 * Start a decision: persist the named decision (status 'open') with a
 * client-generated conversation id, so the Decision Room can deep-link straight
 * to the exact coach thread. Returns the new row, or null on error.
 */
export async function createDecision(
  userId: string,
  programSlug: string,
  title: string,
  conversationId: string,
): Promise<MoneyDecision | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("money_decisions")
    .insert({
      user_id: userId,
      program: programSlug, // stamp tenancy on the row
      title: title.trim().slice(0, 300),
      conversation_id: conversationId,
      status: "open",
    })
    .select(SELECT_COLS)
    .single();

  if (error || !data) {
    console.error("[money-decisions] create failed:", error?.message);
    return null;
  }
  return data as MoneyDecision;
}

/**
 * Write the decision record: mark a decision decided and store what they decided
 * and why (§8). RLS scopes the update to the owner; the id filter is the parent
 * scope. Returns true on success.
 */
export async function markDecided(id: string, resolution: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("money_decisions")
    .update({
      status: "decided",
      resolution: resolution.trim(),
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[money-decisions] markDecided failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Reopen a decided/parked decision (clears the record, back to 'open'). Kept
 * distinct from delete: a decision's history is the Money OS's pattern memory.
 */
export async function reopenDecision(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("money_decisions")
    .update({ status: "open", decided_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[money-decisions] reopen failed:", error.message);
    return false;
  }
  return true;
}
