/**
 * Cron Process Scheduled — Delivers pending scheduled messages.
 *
 * S5.3: Generic scheduled message processor.
 * Reads pending items from scheduled_messages and dispatches by type.
 * Handles accountability check-ins, weekly coaching sessions, progress reviews.
 *
 * Idempotency:
 * - Claims messages with status 'pending' → 'generating' (prevents double-processing)
 * - On success: 'generating' → 'sent'
 * - On failure: 'generating' → 'pending', retry_count++
 * - retry_count >= 3 → 'failed' (dead letter)
 *
 * Architecture: ARCHITECTURE.md §5.6
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import {
  deliverProactiveMessage,
  storeOutboundMessage,
} from "../_shared/channel-delivery.ts";
import { checkNaggingState, recordStrike } from "../_shared/nagging.ts";
import { isBrandId } from "../_shared/brands.ts";
import { logError } from "../_shared/errors.ts";

const FUNCTION_NAME = "cron-process-scheduled";
const MAX_RETRIES = 3;
const BATCH_SIZE = 20;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createSupabaseClient();

  try {
    // ── 1. Claim pending messages (idempotent grab) ──
    // UPDATE ... SET status = 'generating' WHERE status = 'pending'
    // Only grab messages whose scheduled_for is in the past
    const { data: pending, error: claimError } = await supabase
      .from("scheduled_messages")
      .update({ status: "generating" })
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("retry_count", MAX_RETRIES)
      .select("*")
      .order("scheduled_for", { ascending: true })
      .limit(BATCH_SIZE);

    if (claimError) {
      console.error(`[${FUNCTION_NAME}] Claim error:`, claimError.message);
      return new Response(
        JSON.stringify({ error: claimError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending messages" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[${FUNCTION_NAME}] Processing ${pending.length} messages`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const msg of pending) {
      try {
        // ── 2. Load user for delivery ──
        const { data: user } = await supabase
          .from("users")
          .select("id, email, name, preferred_channel, telegram_chat_id")
          .eq("id", msg.user_id)
          .single();

        if (!user) {
          console.warn(`[${FUNCTION_NAME}] User not found: ${msg.user_id}`);
          await markFailed(supabase, msg.id, "User not found");
          failed++;
          continue;
        }

        // ── 3. Check nagging state ──
        const topic = msg.type || "general";
        const nagging = await checkNaggingState(supabase, msg.user_id, topic);

        if (!nagging.canSend) {
          console.log(
            `[${FUNCTION_NAME}] Skipping ${msg.id}: nagging paused for topic "${topic}"`
          );
          await supabase
            .from("scheduled_messages")
            .update({ status: "skipped" })
            .eq("id", msg.id);
          skipped++;
          continue;
        }

        // ── 4. Determine content and subject ──
        const content = msg.context?.content as string || generateFallbackContent(msg.type, user.name);
        const subject = msg.context?.subject as string || getSubjectForType(msg.type);

        // ── 5. Deliver ──
        const conversationId = (msg.context?.conversation_id as string) || crypto.randomUUID();
        const brand = isBrandId(msg.context?.brand) ? msg.context.brand : "masterytv";
        const conversationUrl = (msg.context?.conversation_url as string | null) ?? undefined;
        const result = await deliverProactiveMessage(
          supabase,
          user,
          content,
          subject,
          conversationId,
          { brand, conversationUrl }
        );

        if (result.success) {
          // Store outbound message for coaching context. The `program` stamp
          // (present on rows created since 2026-07-20) lets an email reply
          // that threads into this conversation resolve the right Coach Pack
          // (resolve-program step 1). Only stamp when the creator resolved it
          // — a guessed "general" would outrank the spine on reply routing.
          await storeOutboundMessage(
            supabase,
            msg.user_id,
            result.channel,
            content,
            conversationId,
            {
              type: msg.type,
              scheduled_message_id: msg.id,
              ...(typeof msg.context?.program === "string"
                ? { program: msg.context.program }
                : {}),
            }
          );

          // Mark as sent
          await supabase
            .from("scheduled_messages")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", msg.id);

          // Record nagging strike
          await recordStrike(supabase, msg.user_id, topic);

          sent++;
        } else {
          await markRetry(supabase, msg.id, msg.retry_count, result.error);
          failed++;
        }
      } catch (error) {
        const err = error as Error;
        console.error(
          `[${FUNCTION_NAME}] Error processing ${msg.id}:`,
          err.message
        );
        await markRetry(supabase, msg.id, msg.retry_count, err.message);
        await logError(FUNCTION_NAME, err, msg.user_id, {
          scheduled_message_id: msg.id,
          type: msg.type,
          retry_count: msg.retry_count + 1,
        });
        failed++;
      }
    }

    console.log(
      `[${FUNCTION_NAME}] Done: ${sent} sent, ${failed} failed, ${skipped} skipped`
    );

    return new Response(
      JSON.stringify({ processed: sent, failed, skipped }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error;
    console.error(`[${FUNCTION_NAME}] Fatal error:`, err.message);
    await logError(FUNCTION_NAME, err, undefined, { fatal: true });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── HELPERS ────────────────────────────────────────────────────────────

async function markRetry(
  supabase: ReturnType<typeof createSupabaseClient>,
  messageId: string,
  currentRetryCount: number,
  error?: string
): Promise<void> {
  const newRetryCount = currentRetryCount + 1;
  const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "pending";

  await supabase
    .from("scheduled_messages")
    .update({
      status: newStatus,
      retry_count: newRetryCount,
      error: error || null,
    })
    .eq("id", messageId);
}

async function markFailed(
  supabase: ReturnType<typeof createSupabaseClient>,
  messageId: string,
  error: string
): Promise<void> {
  await supabase
    .from("scheduled_messages")
    .update({
      status: "failed",
      error,
    })
    .eq("id", messageId);
}

function getSubjectForType(type: string): string {
  const subjects: Record<string, string> = {
    accountability_check: "Quick Check-in",
    weekly_coaching_session: "Your Weekly Coaching Session",
    progress_review: "Your Monthly Progress Review",
    morning_briefing: "Morning Briefing",
  };
  return subjects[type] ?? "Mastery Coach";
}

function generateFallbackContent(type: string, userName: string): string {
  const fallbacks: Record<string, string> = {
    accountability_check: `Hey ${userName}, just checking in on the commitments we discussed. How are things going?`,
    weekly_coaching_session: `${userName}, I've been thinking about our recent conversations. Ready for this week's coaching session?`,
    progress_review: `${userName}, it's time for your monthly review! Let's look at how far you've come.`,
  };
  return fallbacks[type] ?? `Hey ${userName}, your coach is checking in. How are things going?`;
}
