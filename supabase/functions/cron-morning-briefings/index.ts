/**
 * Cron Morning Briefings — Generates and delivers daily coaching briefings.
 *
 * S5.2: Proactive morning touchpoint — tactical, commitment-focused, warm.
 * Triggered by pg_cron every 30 minutes. Each run handles users whose
 * briefing time falls in the current 30-min UTC window.
 *
 * Architecture: ARCHITECTURE.md §5.6
 *
 * Flow:
 * 1. Query users whose morning_briefing_time is NOW (timezone-adjusted)
 * 2. For each user: require an existing coaching relationship (≥1 user
 *    message ever — users.morning_briefing_time defaults to 08:00 at signup,
 *    so without this gate every assessment-only signup gets briefed),
 *    then check nagging state and engagement rate
 * 3. Load active commitments, recent wins, stalled goals
 * 4. Generate briefing via Claude (short, actionable, ~200 tokens)
 * 5. Deliver via preferred channel, branded per the user's program
 * 6. Store outbound message (program-stamped) for coaching context
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { callClaude, calculateCost } from "../_shared/anthropic.ts";
import {
  deliverProactiveMessage,
  storeOutboundMessage,
} from "../_shared/channel-delivery.ts";
import { checkNaggingState, recordStrike } from "../_shared/nagging.ts";
import { resolvePack, type CoachPack } from "../_shared/packs/index.ts";
import type { BriefingContext } from "../_shared/packs/types.ts";
import { resolveDyadContext } from "../_shared/dyad-context.ts";

const FUNCTION_NAME = "cron-morning-briefings";

Deno.serve(async (req: Request) => {
  // Only accept POST from cron (service role auth)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createSupabaseClient();

  try {
    // ── 1. Find users whose briefing time is in the current 30-min window ──
    // We run every 30 minutes in UTC. For each user, convert their
    // morning_briefing_time from their timezone to UTC and check if it
    // falls in the current window.
    const { data: users, error: queryError } = await supabase.rpc(
      "get_users_for_morning_briefing"
    );

    // Fallback: if the RPC doesn't exist yet, do a simpler query
    let eligibleUsers = users;
    if (queryError) {
      console.log(
        `[${FUNCTION_NAME}] RPC not available, using fallback query`
      );
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMinute = now.getUTCMinutes();

      // Simple approach: get all users and filter in-app
      // This works for <1000 users; for scale, use the RPC
      const { data: allUsers } = await supabase
        .from("users")
        .select(
          "id, email, name, preferred_channel, telegram_chat_id, timezone, morning_briefing_time, subscription_tier"
        )
        .neq("subscription_tier", "churned");

      eligibleUsers = (allUsers ?? []).filter((u) => {
        if (!u.morning_briefing_time) return false;

        // Parse the user's briefing time (HH:MM:SS)
        const [hours, minutes] = u.morning_briefing_time.split(":").map(Number);

        // Convert user's local time to a reference date in their timezone
        // Then check if the current UTC time matches
        try {
          const now = new Date();
          // Create a date in the user's timezone at their briefing time
          const userNow = new Date(
            now.toLocaleString("en-US", { timeZone: u.timezone || "America/New_York" })
          );
          const userHour = userNow.getHours();
          const userMinute = userNow.getMinutes();

          // Check if we're within the 30-min window of their briefing time
          const briefingMinutes = hours * 60 + minutes;
          const currentMinutes = userHour * 60 + userMinute;
          const diff = currentMinutes - briefingMinutes;

          return diff >= 0 && diff < 30;
        } catch {
          return false;
        }
      });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log(`[${FUNCTION_NAME}] No users need briefings right now`);
      return new Response(
        JSON.stringify({ processed: 0, message: "No users in window" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[${FUNCTION_NAME}] Processing ${eligibleUsers.length} users`
    );

    let processed = 0;
    let skipped = 0;

    for (const user of eligibleUsers) {
      try {
        // ── 2a. Require a coaching relationship ──
        // Proactive touchpoints continue a conversation the user started.
        // Someone who has never messaged the coach (assessment-only beta
        // signups) gets nothing proactive — no briefing, no meta check-in.
        const { count: userMsgCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("role", "user");
        if (!userMsgCount) {
          skipped++;
          continue;
        }

        // ── 2b. Resolve program → pack + brand ──
        // The pack authors WHAT a proactive touchpoint says (subject, prompt,
        // meta check-in) and whether this vertical sends briefings at all;
        // this cron stays vertical-blind.
        const program = await resolveBriefingProgram(supabase, user.id);
        const brand = program === "relationship" ? "relatti" : "masterytv";
        const pack = resolvePack(program);
        if (!pack.briefing.enabled) {
          skipped++;
          continue;
        }

        // ── 2c. Check nagging state ──
        const nagging = await checkNaggingState(
          supabase,
          user.id,
          "morning_briefing"
        );
        if (!nagging.canSend) {
          console.log(
            `[${FUNCTION_NAME}] Skipping ${user.id}: nagging paused`
          );
          skipped++;
          continue;
        }

        // ── 2.5 Check engagement decay ──
        const engagementOk = await checkEngagement(supabase, user.id);
        if (!engagementOk.shouldSend) {
          if (engagementOk.sendMetaCheckin) {
            // Send meta check-in instead of briefing (pack-voiced)
            await deliverProactiveMessage(
              supabase,
              user,
              pack.briefing.metaCheckin,
              "Quick Check-in",
              undefined,
              { brand }
            );
          }
          skipped++;
          continue;
        }

        // ── 3. Load context for briefing generation ──
        const context = await loadBriefingContext(supabase, user.id, pack);

        // ── 4. Generate briefing via Claude ──
        const briefing = await generateBriefing(user, context, pack);

        // ── 5. Deliver via preferred channel ──
        const conversationId = crypto.randomUUID();
        const result = await deliverProactiveMessage(
          supabase,
          user,
          briefing.content,
          briefing.subject,
          conversationId,
          { brand }
        );

        if (result.success) {
          // Store outbound message for coaching context. The program stamp
          // lets a reply that threads into this conversation resolve the
          // right Coach Pack (resolve-program step 1) — executive stamps
          // "general" (matching the web coach's hint) so the stamp is a
          // positive signal, not an ambiguous null.
          await storeOutboundMessage(
            supabase,
            user.id,
            result.channel,
            briefing.content,
            conversationId,
            {
              type: "morning_briefing",
              subject: briefing.subject,
              program: program ?? "general",
            }
          );

          // Record strike (tracks unanswered proactive messages)
          await recordStrike(supabase, user.id, "morning_briefing");

          processed++;
        } else {
          console.error(
            `[${FUNCTION_NAME}] Failed to deliver to ${user.id}: ${result.error}`
          );
        }

        // Log cost
        await supabase.from("cost_tracking").insert({
          user_id: user.id,
          purpose: FUNCTION_NAME,
          model: briefing.model,
          tokens_in: briefing.tokensIn,
          tokens_out: briefing.tokensOut,
          cost_usd: briefing.costUsd,
          // PC5.5: per-brand cost attribution at write time ("general" =
          // the MasteryTV column, mirroring the web coach's executive stamp).
          metadata: { program: program ?? "general" },
        });
      } catch (error) {
        console.error(
          `[${FUNCTION_NAME}] Error processing user ${user.id}:`,
          (error as Error).message
        );
      }
    }

    console.log(
      `[${FUNCTION_NAME}] Done: ${processed} sent, ${skipped} skipped`
    );

    return new Response(
      JSON.stringify({ processed, skipped }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Fatal error:`, (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── PROGRAM RESOLUTION ─────────────────────────────────────────────────

/**
 * Which program (vertical) a user's proactive briefing belongs to.
 *
 * Briefings have no conversation context, so this resolves at the USER
 * level. Precedence:
 * 1. users.signup_brand — stamped at auth (PC5.2), authoritative once set.
 * 2. The latest program-stamped coach message — the user's live coaching
 *    relationship (web coach + channel-router stamp metadata.program).
 * 3. participant membership — a spine row means the relationship product.
 * 4. null — the executive default.
 *
 * Deliberately NOT the shared resolve-program heuristic: its decoded_invites
 * check classifies anyone who ever SENT a Relatti invite as a relationship
 * user, which mis-brands the founder's own executive briefing.
 */
async function resolveBriefingProgram(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<string | null> {
  const { data: u } = await supabase
    .from("users")
    .select("signup_brand")
    .eq("id", userId)
    .maybeSingle();
  if (u?.signup_brand === "relatti") return "relationship";
  if (u?.signup_brand === "masterytv") return null;

  const { data: stamped } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("role", "coach")
    .not("metadata->>program", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const stampedProgram = (stamped?.metadata as Record<string, unknown> | null)
    ?.program;
  if (typeof stampedProgram === "string" && stampedProgram) {
    return stampedProgram.toLowerCase();
  }

  const { count: participantCount } = await supabase
    .from("participant")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((participantCount ?? 0) > 0) return "relationship";

  return null;
}

// ─── BRIEFING CONTEXT ─────────────────────────────────────────────────
// Shape lives in packs/types.ts (BriefingContext) — the pack composes from it.

async function loadBriefingContext(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  pack: CoachPack
): Promise<BriefingContext> {
  // Active commitments (due soon or active)
  const { data: commitments } = await supabase
    .from("commitments")
    .select("description, due_date, type")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5);

  // Recent wins (past 7 days) — tracked win entities plus commitments the
  // user completed (a checked-off commitment IS a win; without this the
  // briefing claims "no recent wins" the morning after one lands)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: wins } = await supabase
    .from("user_entities")
    .select("name, attributes")
    .eq("user_id", userId)
    .eq("entity_type", "win")
    .gte("created_at", sevenDaysAgo)
    .limit(3);

  const { data: completedCommitments } = await supabase
    .from("commitments")
    .select("description, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", sevenDaysAgo)
    .order("completed_at", { ascending: false })
    .limit(3);

  const winEntries = [
    ...(wins ?? []),
    ...(completedCommitments ?? []).map((c) => ({
      name: `Completed: ${c.description}`,
      attributes: {} as Record<string, unknown>,
    })),
  ].slice(0, 5);

  // Stalled goals (not mentioned in 3+ days)
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: stalledGoals } = await supabase
    .from("user_entities")
    .select("name, attributes")
    .eq("user_id", userId)
    .eq("entity_type", "goal")
    .eq("status", "active")
    .lt("last_mentioned_at", threeDaysAgo)
    .limit(3);

  // Coaching agenda (current week)
  const { data: agenda } = await supabase
    .from("coaching_agenda")
    .select("priority_topic, coaching_questions")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // User name
  const { data: user } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  // Partner name (relationship only) — canonical spine resolution; null when
  // no dyad exists. Non-fatal: a briefing without the name still reads fine.
  let partnerName: string | null = null;
  if (pack.key === "relationship") {
    try {
      const dyad = await resolveDyadContext(userId);
      partnerName = dyad?.partnerName ?? null;
    } catch {
      /* keep null */
    }
  }

  return {
    activeCommitments: commitments ?? [],
    recentWins: winEntries,
    stalledGoals: stalledGoals ?? [],
    coachingAgenda: agenda,
    userName: user?.name ?? "there",
    partnerName,
  };
}

// ─── BRIEFING GENERATION ────────────────────────────────────────────────

interface GeneratedBriefing {
  content: string;
  subject: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

async function generateBriefing(
  user: { name: string; timezone: string },
  context: BriefingContext,
  pack: CoachPack
): Promise<GeneratedBriefing> {
  // Determine time of day for greeting
  const userNow = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: user.timezone || "America/New_York",
    })
  );
  const hour = userNow.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateLine = userNow.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const todayShort = userNow.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const response = await callClaude({
    system: pack.briefing.system,
    messages: [
      { role: "user", content: pack.briefing.buildPrompt(context, greeting, dateLine) },
    ],
    maxTokens: 300,
  });

  const content =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") || pack.briefing.fallback(context, greeting);

  const usage = response.usage;
  const costUsd = calculateCost(usage);

  return {
    content,
    subject: pack.briefing.subject(context, greeting, todayShort),
    model: response.model,
    tokensIn: usage.input_tokens,
    tokensOut: usage.output_tokens,
    costUsd,
  };
}

// ─── ENGAGEMENT CHECK ───────────────────────────────────────────────────

async function checkEngagement(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<{ shouldSend: boolean; sendMetaCheckin: boolean }> {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Count outbound proactive messages in past 7 days
  const { count: sentCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "coach")
    .contains("metadata", { proactive: true })
    .gte("created_at", sevenDaysAgo);

  // Count user responses in past 7 days
  const { count: responseCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", sevenDaysAgo);

  const sent = sentCount ?? 0;
  const responses = responseCount ?? 0;

  if (sent === 0) return { shouldSend: true, sendMetaCheckin: false };

  const responseRate = responses / sent;

  if (responseRate < 0.25) {
    return { shouldSend: false, sendMetaCheckin: true };
  }
  if (responseRate < 0.5) {
    // Skip every other briefing (coin flip based on day)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return { shouldSend: dayOfYear % 2 === 0, sendMetaCheckin: false };
  }

  return { shouldSend: true, sendMetaCheckin: false };
}
