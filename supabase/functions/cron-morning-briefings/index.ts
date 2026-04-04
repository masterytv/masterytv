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
 * 2. For each user: check nagging state, check engagement rate
 * 3. Load active commitments, recent wins, stalled goals
 * 4. Generate briefing via Claude (short, actionable, ~200 tokens)
 * 5. Deliver via preferred channel
 * 6. Store outbound message for coaching context
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { callClaude, calculateCost } from "../_shared/anthropic.ts";
import {
  deliverProactiveMessage,
  storeOutboundMessage,
} from "../_shared/channel-delivery.ts";
import { checkNaggingState, recordStrike } from "../_shared/nagging.ts";

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
        // ── 2. Check nagging state ──
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
            // Send meta check-in instead of briefing
            await deliverProactiveMessage(
              supabase,
              user,
              "I've noticed I haven't heard much from you lately. No pressure at all — I just want to make sure my check-ins are helpful, not overwhelming. Should I adjust how often I reach out? 💬",
              "Quick Check-in"
            );
          }
          skipped++;
          continue;
        }

        // ── 3. Load context for briefing generation ──
        const context = await loadBriefingContext(supabase, user.id);

        // ── 4. Generate briefing via Claude ──
        const briefing = await generateBriefing(user, context);

        // ── 5. Deliver via preferred channel ──
        const conversationId = crypto.randomUUID();
        const result = await deliverProactiveMessage(
          supabase,
          user,
          briefing.content,
          briefing.subject,
          conversationId
        );

        if (result.success) {
          // Store outbound message for coaching context
          await storeOutboundMessage(
            supabase,
            user.id,
            result.channel,
            briefing.content,
            conversationId,
            { type: "morning_briefing", subject: briefing.subject }
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

// ─── BRIEFING CONTEXT ─────────────────────────────────────────────────

interface BriefingContext {
  activeCommitments: Array<{
    description: string;
    due_date: string | null;
    type: string;
  }>;
  recentWins: Array<{ name: string; attributes: Record<string, unknown> }>;
  stalledGoals: Array<{ name: string; attributes: Record<string, unknown> }>;
  coachingAgenda: {
    priority_topic: string | null;
    coaching_questions: string[] | null;
  } | null;
  userName: string;
}

async function loadBriefingContext(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<BriefingContext> {
  // Active commitments (due soon or active)
  const { data: commitments } = await supabase
    .from("commitments")
    .select("description, due_date, type")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5);

  // Recent wins (past 7 days)
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

  return {
    activeCommitments: commitments ?? [],
    recentWins: wins ?? [],
    stalledGoals: stalledGoals ?? [],
    coachingAgenda: agenda,
    userName: user?.name ?? "there",
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
  context: BriefingContext
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

  const commitmentsList = context.activeCommitments
    .map((c) => {
      const due = c.due_date ? ` (due: ${c.due_date})` : "";
      return `- ${c.description}${due}`;
    })
    .join("\n");

  const winsList = context.recentWins
    .map((w) => `- ${w.name}`)
    .join("\n");

  const stalledList = context.stalledGoals
    .map((g) => `- ${g.name}`)
    .join("\n");

  const agendaTopic = context.coachingAgenda?.priority_topic
    ? `\nCOACHING PRIORITY: ${context.coachingAgenda.priority_topic}`
    : "";

  const prompt = `Generate a brief, warm morning coaching briefing for ${context.userName}.

CONTEXT:
${greeting}, it's ${userNow.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

ACTIVE COMMITMENTS:
${commitmentsList || "No active commitments tracked."}

RECENT WINS (past 7 days):
${winsList || "None tracked yet."}

STALLED GOALS (not mentioned in 3+ days):
${stalledList || "None detected."}
${agendaTopic}

INSTRUCTIONS:
- Start with a time-appropriate greeting using their name
- If there are wins, celebrate briefly (1 sentence max)
- Surface the most important commitment or stalled goal
- End with ONE specific, actionable question that moves them forward
- Keep it to 3-5 sentences max. Be warm but concise.
- Don't use bullet points — write conversational prose
- Use emoji sparingly (1-2 max)
- If there are no commitments or wins, focus on an encouraging open-ended question

OUTPUT FORMAT: Just the briefing text, no labels or headers.`;

  const response = await callClaude({
    system:
      "You are a coaching assistant generating brief daily check-in messages. Be warm, specific, and actionable.",
    messages: [{ role: "user", content: prompt }],
    maxTokens: 300,
  });

  const content =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") || `${greeting}, ${context.userName}! Ready to make today count? What's your #1 priority?`;

  const usage = response.usage;
  const costUsd = calculateCost(usage);

  // Generate email subject line
  const today = userNow.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const subject = context.activeCommitments.length > 0
    ? `Your ${today} Coaching Brief`
    : `${greeting}, ${context.userName}`;

  return {
    content,
    subject,
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
