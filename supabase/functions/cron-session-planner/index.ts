/**
 * Cron Session Planner (MESO) — Weekly coaching strategy generator.
 *
 * S5.5a: The "meta-thinker" — an async LLM job that runs weekly
 * (Sunday evening) to plan the coaching direction for each user.
 * This is what makes the coach proactive rather than just reactive.
 *
 * Architecture: ARCHITECTURE.md §5.2a, COACHING_BRAIN.md §4
 *
 * For each active user:
 * 1. REVIEW — Load conversations, entities, commitments from past 7 days
 * 2. ASSESS — What progressed? What stalled? New patterns?
 * 3. PLAN — Identify "next frontier," generate 2-3 coaching questions
 * 4. GENERATE — Weekly coaching session message
 * 5. STORE — Write coaching_agenda + scheduled_messages rows
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { calculateCost } from "../_shared/anthropic.ts";
import { resolveProgram } from "../_shared/resolve-program.ts";
import { brandForProgram } from "../_shared/brands.ts";

const FUNCTION_NAME = "cron-session-planner";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createSupabaseClient();

  try {
    // Get all active users (not churned, with at least 1 message this week)
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Find users who had conversations this week
    const { data: activeUserIds } = await supabase
      .from("messages")
      .select("user_id")
      .eq("role", "user")
      .gte("created_at", sevenDaysAgo);

    if (!activeUserIds || activeUserIds.length === 0) {
      console.log(`[${FUNCTION_NAME}] No active users this week`);
      return new Response(
        JSON.stringify({ processed: 0, message: "No active users" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Deduplicate user IDs
    const activeIds = [
      ...new Set(activeUserIds.map((r) => r.user_id)),
    ] as string[];

    // Proactive opt-in switch (founder decision 2026-07-14): weekly sessions
    // follow the same opt-in as morning briefings — users with
    // morning_briefing_time NULL are excluded. (Sessions are brand-aware as of
    // 2026-07-20 — the sender/chrome follow the user's vertical — so this gate
    // is now purely the opt-in. Session CONTENT is still authored by the
    // vertical-blind planner prompt below; pack-voiced sessions are T4.)
    const { data: optedIn } = await supabase
      .from("users")
      .select("id")
      .in("id", activeIds)
      .not("morning_briefing_time", "is", null);

    const uniqueUserIds = (optedIn ?? []).map((u) => u.id) as string[];

    console.log(
      `[${FUNCTION_NAME}] Planning sessions for ${uniqueUserIds.length} of ${activeIds.length} active users (proactive opt-in gate)`
    );

    let processed = 0;

    for (const userId of uniqueUserIds) {
      try {
        await planWeeklySession(supabase, userId, sevenDaysAgo);
        processed++;
      } catch (error) {
        console.error(
          `[${FUNCTION_NAME}] Error for user ${userId}:`,
          (error as Error).message
        );
      }
    }

    console.log(`[${FUNCTION_NAME}] Done: ${processed} sessions planned`);

    return new Response(
      JSON.stringify({ processed }),
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

// ─── WEEKLY SESSION PLANNING ────────────────────────────────────────────

async function planWeeklySession(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  sevenDaysAgo: string
): Promise<void> {
  // ── 0. Resolve the user's vertical FIRST — the same spine resolution the
  // coach itself uses (participant membership → signup_brand → invite → null).
  // Used BOTH to scope the commitments read below (a weekly session must not
  // quote another vertical's commitments — commitments are program-scoped as
  // of 2026-07-20) AND to stamp the scheduled message for branded delivery
  // (the 2026-07-20 mis-brand incident).
  const resolved = await resolveProgram(supabase, userId, null, null);
  const program = (resolved.ok ? resolved.program : null) ?? "general";
  const brand = brandForProgram(program).id;

  // ── 1. REVIEW: Load weekly context ──
  const [user, challenges, commitments, entities, recentMessages, lastAgenda] =
    await Promise.all([
      supabase.from("users").select("name, timezone").eq("id", userId).single(),
      supabase
        .from("coaching_challenges")
        .select("title, framework, framework_phase, status, description")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("commitments")
        .select("description, type, status, due_date")
        .eq("user_id", userId)
        .eq("program", program)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("user_entities")
        .select("entity_type, name, status, attributes, last_mentioned_at")
        .eq("user_id", userId)
        .gte("last_mentioned_at", sevenDaysAgo)
        .order("last_mentioned_at", { ascending: false })
        .limit(20),
      supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("coaching_agenda")
        .select("priority_topic, coaching_questions, arc_phase, week_summary")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const userName = user.data?.name ?? "User";

  // Categorize entities
  const wins = (entities.data ?? []).filter(
    (e) => e.entity_type === "win"
  );
  const stalledGoals = (entities.data ?? []).filter(
    (e) => e.entity_type === "goal" && e.status === "active"
  );
  const patterns = (entities.data ?? []).filter(
    (e) => e.entity_type === "pattern"
  );
  const people = (entities.data ?? []).filter(
    (e) => e.entity_type === "person" && e.status === "active"
  );

  // Build conversation summary for the week
  const conversationSummary = (recentMessages.data ?? [])
    .reverse()
    .map((m) => `[${m.role}]: ${m.content.slice(0, 200)}`)
    .join("\n");

  // ── 2 & 3. ASSESS + PLAN via LLM ──
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.warn(`[${FUNCTION_NAME}] OPENAI_API_KEY not set, skipping`);
    return;
  }

  const plannerPrompt = `You are a coaching strategist planning next week's direction for ${userName}.

## LAST WEEK'S AGENDA
${lastAgenda.data
    ? `Topic: ${lastAgenda.data.priority_topic ?? "None set"}
Questions: ${(lastAgenda.data.coaching_questions ?? []).join("; ")}
Arc Phase: ${lastAgenda.data.arc_phase ?? "orientation"}
Summary: ${lastAgenda.data.week_summary ?? "No summary"}`
    : "First week — no prior agenda."}

## ACTIVE CHALLENGES
${(challenges.data ?? [])
    .map((c) => `- "${c.title}" (${c.framework}, phase: ${c.framework_phase})`)
    .join("\n") || "None tracked."}

## COMMITMENTS
${(commitments.data ?? [])
    .map((c) => `- ${c.description} [${c.status}]${c.due_date ? ` due: ${c.due_date}` : ""}`)
    .join("\n") || "None active."}

## ENTITIES THIS WEEK
Wins: ${wins.map((w) => w.name).join(", ") || "None"}
Stalled goals: ${stalledGoals.map((g) => g.name).join(", ") || "None"}
Patterns: ${patterns.map((p) => `${p.name} (${(p.attributes as Record<string, unknown>)?.frequency ?? "?"} occurrences)`).join(", ") || "None"}
Key people: ${people.map((p) => p.name).join(", ") || "None mentioned"}

## RECENT CONVERSATIONS (SUMMARY)
${conversationSummary.slice(0, 2000) || "No conversations this week."}

## YOUR TASK
Analyze the week and produce a coaching plan. Return JSON:

{
  "priority_topic": "The single most impactful topic to coach on next week",
  "coaching_questions": ["Question 1", "Question 2", "Question 3"],
  "unresolved_entities": ["entity names that need attention"],
  "patterns_detected": ["behavioral patterns worth addressing"],
  "wins_to_celebrate": ["things to acknowledge"],
  "stalled_goals": ["goals that need a push"],
  "week_summary": "2-3 sentence summary of last week's coaching journey",
  "confidence": 0.5,
  "session_message": "The actual coaching session message to send. 3-5 paragraphs. Coach-led, question-first. Reference specific entities, commitments, and patterns. Connect past insights to current opportunities. DO NOT give a status update — instead, lead with the most provocative or insightful coaching question."
}

IMPORTANT RULES:
- The session_message should feel like the coach has been *thinking* about the user between sessions
- Lead with a powerful question, not a summary
- Reference specific names, dates, and commitments — not generic advice
- If there are wins, celebrate them first (briefly) before pushing forward
- If a pattern has 3+ occurrences, consider confronting it (gently)
- Confidence: 0.0 (guessing) to 1.0 (high conviction on the plan)`;

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: plannerPrompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await response.json();
  const plan = JSON.parse(data.choices[0].message.content);

  // ── 4. STORE: coaching_agenda ──
  const weekStart = getNextMonday();

  await supabase.from("coaching_agenda").insert({
    user_id: userId,
    week_start: weekStart,
    arc_phase: lastAgenda.data?.arc_phase ?? "orientation",
    priority_topic: plan.priority_topic,
    suggested_framework: (challenges.data ?? [])[0]?.framework ?? null,
    coaching_questions: plan.coaching_questions,
    unresolved_entities: plan.unresolved_entities,
    patterns_detected: plan.patterns_detected,
    wins_to_celebrate: plan.wins_to_celebrate,
    stalled_goals: plan.stalled_goals,
    week_summary: plan.week_summary,
    confidence: plan.confidence ?? 0.5,
  });

  // ── 5. STORE: scheduled_messages (weekly coaching session) ──
  // Schedule for Monday morning in user's timezone
  const userTimezone = user.data?.timezone ?? "America/New_York";
  const mondayMorning = new Date(`${weekStart}T09:00:00`);
  // Simple timezone offset (good enough for scheduling)
  const scheduledFor = mondayMorning.toISOString();

  // Brand/program resolved at the top of this function (step 0 — it also
  // scopes the commitments read). Stamped into context so
  // cron-process-scheduled delivers with the right sender + email chrome, and
  // stamps `program` on the outbound message so an email reply threads into
  // the right Coach Pack (the 2026-07-20 mis-brand incident).
  await supabase.from("scheduled_messages").insert({
    user_id: userId,
    type: "weekly_coaching_session",
    scheduled_for: scheduledFor,
    context: {
      content: plan.session_message,
      subject: "Your Weekly Coaching Session",
      priority_topic: plan.priority_topic,
      brand,
      program,
    },
    status: "pending",
  });

  // Log cost
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;
  const costUsd = calculateCost({
    input_tokens: tokensIn,
    output_tokens: tokensOut,
  });

  await supabase.from("cost_tracking").insert({
    user_id: userId,
    purpose: FUNCTION_NAME,
    model: "gpt-4o",
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
  });

  console.log(
    `[${FUNCTION_NAME}] Planned session for ${userId}: "${plan.priority_topic}" (confidence: ${plan.confidence})`
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}
