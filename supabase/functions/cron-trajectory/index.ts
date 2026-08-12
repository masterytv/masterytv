/**
 * cron-trajectory — INTEGRATION_SPRINT.md §3 / I3.6.
 *
 * Nightly per-user narrowing score over the ACCUMULATED transcript.
 *
 * Every other safety control in this vertical reads one message. This one
 * exists because the failure it looks for is invisible in any single message
 * and obvious across two months of them: a person can say something entirely
 * reasonable every turn and still be narrowing — more certain each week, more
 * of their vocabulary invented, less of their life discussed, less of it
 * decided by them. No sentence in that sequence trips a keyword.
 *
 * ⚠️ Scores the PERSON'S OWN messages only (`role = 'user'`). Including the
 * coach's half would measure the product's behaviour and file it as the user's
 * state, which is both wrong and self-flattering.
 *
 * Writes to `trajectory_scores` (append-only — I12.2's Aperture needs history
 * to say "a month ago… this month…"; one row per user would make the sentence
 * the widget exists for impossible to compute).
 *
 * ─── STATUS ──────────────────────────────────────────────────────────────
 * Built and committed, NOT deployed and NOT scheduled. There are no
 * `integration` users yet, so a nightly run would sweep an empty set. Before it
 * runs: deploy, then add the pg_cron job with the `x-cron-secret` header.
 * `verify_jwt` must MIRROR whatever the live flag says for the other crons —
 * read it, never infer it (the webhook-fns-no-verify-jwt rule).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { scoreTrajectory, type TranscriptTurn } from "../_shared/trajectory.ts";

const FUNCTION_NAME = "cron-trajectory";
/** Only this vertical has a trajectory worth scoring, and only it has the controls. */
const PROGRAM = "integration";
/** Enough history for a delta to mean anything (the scorer enforces its own floor too). */
const MIN_MESSAGES = 8;
const LOOKBACK_DAYS = 90;
const MAX_USERS_PER_RUN = 200;

Deno.serve(async (req: Request) => {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseClient();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  try {
    // Conversations carry `program`, messages do not — so the vertical filter
    // has to come from the parent. Reading messages by user_id alone would pull
    // every vertical's turns into one score (the child-scoped blind spot the
    // tenancy gate documents, and the exact shape of the 2026-07-20 leak).
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, user_id, workspace_id")
      .eq("program", PROGRAM)
      .gte("updated_at", since);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) {
      console.log(`[${FUNCTION_NAME}] no ${PROGRAM} conversations in the window`);
      return Response.json({ scored: 0, skipped: 0 });
    }

    // Group by person: the score is per user across their whole transcript, not
    // per thread. Somebody who opens a fresh conversation every week would
    // otherwise never accumulate enough history to be scored at all.
    const byUser = new Map<string, { workspaceId: string; conversationIds: string[] }>();
    for (const c of conversations) {
      const entry = byUser.get(c.user_id) ?? { workspaceId: c.workspace_id, conversationIds: [] };
      entry.conversationIds.push(c.id);
      byUser.set(c.user_id, entry);
    }

    let scored = 0;
    let skipped = 0;

    for (const [userId, { workspaceId, conversationIds }] of [...byUser].slice(0, MAX_USERS_PER_RUN)) {
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("role", "user")
        .in("conversation_id", conversationIds)
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.warn(`[${FUNCTION_NAME}] messages read failed for ${userId}:`, msgError.message);
        continue;
      }
      if (!messages || messages.length < MIN_MESSAGES) {
        skipped++;
        continue;
      }

      const turns: TranscriptTurn[] = messages.map((m) => ({
        text: String(m.content ?? ""),
        at: String(m.created_at),
      }));
      const result = scoreTrajectory(turns);
      if (!result.sufficient) {
        skipped++;
        continue;
      }

      const { error: writeError } = await supabase.from("trajectory_scores").insert({
        user_id: userId,
        workspace_id: workspaceId,
        program: PROGRAM,
        score: result.score,
        components: result.components,
        turns_early: result.turns.early,
        turns_recent: result.turns.recent,
      });
      if (writeError) {
        console.warn(`[${FUNCTION_NAME}] write failed for ${userId}:`, writeError.message);
        continue;
      }
      scored++;
    }

    // Counts only. A log line carrying somebody's narrowing score next to their
    // id is the same disclosure the 92d221d rule keeps out of internal email.
    console.log(`[${FUNCTION_NAME}] scored ${scored}, skipped ${skipped} (too little history)`);
    return Response.json({ scored, skipped });
  } catch (e) {
    console.error(`[${FUNCTION_NAME}] failed:`, (e as Error).message);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
});
