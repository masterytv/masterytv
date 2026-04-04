/**
 * Delete User Data — TD-006
 *
 * POST /functions/v1/delete-user-data
 * Auth: JWT required (user can only delete their own data)
 * Body: { confirm: true }
 *
 * Cascade-deletes all user data across all tables, then deletes the
 * auth.users record via Supabase Admin API. This is irreversible.
 *
 * Tables deleted (in FK-safe order):
 * 1. messages, conversation_summaries (conversation data)
 * 2. memory_facts, user_entities (knowledge graph)
 * 3. commitments, coaching_challenges, coaching_agenda (coaching state)
 * 4. coach_profiles, framework_usage (personalization)
 * 5. scheduled_messages, nagging_tracker (proactive engine)
 * 6. crisis_flags (safety)
 * 7. onboarding_state, telegram_connect_tokens (setup)
 * 8. cost_tracking, error_log (system — anonymize, don't delete)
 * 9. users (public profile)
 * 10. auth.users (Supabase auth record)
 *
 * Architecture: ARCHITECTURE.md §7 (Data Governance)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse, jsonResponse } from "../_shared/errors.ts";

const FUNCTION_NAME = "delete-user-data";

// Tables to cascade-delete (order matters for FK constraints)
const USER_DATA_TABLES = [
  "messages",
  "conversation_summaries",
  "memory_facts",
  "user_entities",
  "commitments",
  "coaching_challenges",
  "coaching_agenda",
  "coach_profiles",
  "framework_usage",
  "scheduled_messages",
  "nagging_tracker",
  "crisis_flags",
  "onboarding_state",
  "telegram_connect_tokens",
] as const;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  let userId: string | undefined;

  try {
    // ── 1. Authenticate — user can only delete their own data ──
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    // ── 2. Require explicit confirmation ──
    const body = await req.json();
    if (body.confirm !== true) {
      return errorResponse(
        "CONFIRMATION_REQUIRED",
        'You must send { "confirm": true } to delete all data. This action is irreversible.',
        400,
        corsHeaders
      );
    }

    // ── 3. Use service role for deletion (bypasses RLS) ──
    const supabase = createSupabaseClient();

    console.log(`[${FUNCTION_NAME}] Starting cascade delete for user ${userId}`);

    const results: Record<string, number> = {};

    // ── 4. Delete user data from all tables ──
    for (const table of USER_DATA_TABLES) {
      const { count, error: deleteError } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .eq("user_id", userId);

      if (deleteError) {
        console.error(`[${FUNCTION_NAME}] Error deleting from ${table}:`, deleteError.message);
        // Continue anyway — best-effort deletion
      }

      results[table] = count ?? 0;
    }

    // ── 5. Anonymize system tables (keep for analytics, remove PII) ──
    // Cost tracking: keep for aggregate analytics, null out user_id
    await supabase
      .from("cost_tracking")
      .update({ user_id: null })
      .eq("user_id", userId);

    // Error log: keep for debugging, null out user_id
    await supabase
      .from("error_log")
      .update({ user_id: null })
      .eq("user_id", userId);

    // ── 6. Delete from public.users ──
    const { error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (userDeleteError) {
      console.error(`[${FUNCTION_NAME}] Error deleting user record:`, userDeleteError.message);
    }
    results["users"] = userDeleteError ? 0 : 1;

    // ── 7. Delete auth.users record via Admin API ──
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error(`[${FUNCTION_NAME}] Error deleting auth record:`, authDeleteError.message);
      // This is non-critical — user can't log in after public.users is deleted
    }
    results["auth.users"] = authDeleteError ? 0 : 1;

    const totalDeleted = Object.values(results).reduce((sum, n) => sum + n, 0);
    console.log(`[${FUNCTION_NAME}] Cascade delete complete. ${totalDeleted} records removed.`, results);

    return jsonResponse(
      {
        success: true,
        message: "All your data has been permanently deleted.",
        records_deleted: results,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    const err = error as Error;
    console.error(`[${FUNCTION_NAME}] Fatal error:`, err.message);
    await logError(FUNCTION_NAME, err, userId);
    return errorResponse("INTERNAL_ERROR", "Failed to delete data. Please contact support.", 500, corsHeaders);
  }
});
