/**
 * Cron Arc Strategist (MACRO) — Monthly coaching arc assessment.
 *
 * S5.5b: Detects which phase of the coaching arc the user is in,
 * generates progress reviews, and adjusts the coaching strategy.
 *
 * Architecture: ARCHITECTURE.md §5.2b, COACHING_BRAIN.md §5
 *
 * Coaching Arc Phases:
 * - Orientation (weeks 1-2): Supportive + Structured, Tier 1 only
 * - Working (weeks 3-8): Challenging + Adaptive, Tiers 1-2
 * - Depth (weeks 8+, trust ≥ 3): Provocative + Deep, Tiers 1-3
 * - Integration (ongoing): Partner mode, all tiers
 *
 * Progress Review includes:
 * - Quantitative: commitments completed, engagement trends
 * - Qualitative: patterns addressed, breakthroughs
 * - Entities resolved: fears confronted, goals achieved
 * - Next direction: recommended coaching focus for next month
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { calculateCost } from "../_shared/anthropic.ts";
import { resolveProgram } from "../_shared/resolve-program.ts";
import { brandForProgram } from "../_shared/brands.ts";

const FUNCTION_NAME = "cron-arc-strategist";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createSupabaseClient();

  try {
    // Get all users who have been active in the past 30 days
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: activeUserIds } = await supabase
      .from("messages")
      .select("user_id")
      .eq("role", "user")
      .gte("created_at", thirtyDaysAgo);

    if (!activeUserIds || activeUserIds.length === 0) {
      console.log(`[${FUNCTION_NAME}] No active users this month`);
      return new Response(
        JSON.stringify({ processed: 0, message: "No active users" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const uniqueUserIds = [
      ...new Set(activeUserIds.map((r) => r.user_id)),
    ] as string[];

    console.log(
      `[${FUNCTION_NAME}] Processing ${uniqueUserIds.length} users`
    );

    let processed = 0;

    for (const userId of uniqueUserIds) {
      try {
        await assessArcAndGenerateReview(supabase, userId, thirtyDaysAgo);
        processed++;
      } catch (error) {
        console.error(
          `[${FUNCTION_NAME}] Error for user ${userId}:`,
          (error as Error).message
        );
      }
    }

    console.log(`[${FUNCTION_NAME}] Done: ${processed} reviews generated`);

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

// ─── ARC ASSESSMENT + PROGRESS REVIEW ───────────────────────────────────

async function assessArcAndGenerateReview(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  thirtyDaysAgo: string
): Promise<void> {
  // ── 1. Get user context ──
  const [user, coachProfile, challenges, commitments, entities, agendas] =
    await Promise.all([
      supabase
        .from("users")
        .select("name, timezone, created_at")
        .eq("id", userId)
        .single(),
      // The arc strategist is executive machinery (challenges/commitments) —
      // it reads the GENERAL profile explicitly (PC2.2).
      supabase
        .from("coach_profiles")
        .select("trust_level, framework_affinity")
        .eq("user_id", userId)
        .eq("program", "general")
        .maybeSingle(),
      supabase
        .from("coaching_challenges")
        .select("title, framework, framework_phase, status, created_at")
        .eq("user_id", userId),
      supabase
        .from("commitments")
        .select("description, status, type")
        .eq("user_id", userId)
        // Executive machinery — reads the GENERAL program explicitly, same as
        // the coach_profiles read above (commitments program-scoped 2026-07-20).
        .eq("program", "general")
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("user_entities")
        .select("entity_type, name, status, attributes, created_at")
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false }),
      supabase
        .from("coaching_agenda")
        .select("arc_phase, priority_topic, week_summary, confidence")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

  const userName = user.data?.name ?? "User";
  const trustLevel = coachProfile.data?.trust_level ?? 1;
  const weeksActive = user.data?.created_at
    ? Math.floor(
        (Date.now() - new Date(user.data.created_at).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    : 0;

  // ── 2. Determine arc phase ──
  const currentArcPhase = determineArcPhase(
    weeksActive,
    trustLevel,
    coachProfile.data?.framework_affinity,
    challenges.data ?? []
  );

  // ── 3. Calculate quantitative metrics ──
  const allCommitments = commitments.data ?? [];
  const completedCommitments = allCommitments.filter(
    (c) => c.status === "completed"
  );
  const completionRate =
    allCommitments.length > 0
      ? Math.round(
          (completedCommitments.length / allCommitments.length) * 100
        )
      : 0;

  const allEntities = entities.data ?? [];
  const wins = allEntities.filter((e) => e.entity_type === "win");
  const goalsResolved = allEntities.filter(
    (e) => e.entity_type === "goal" && e.status === "resolved"
  );
  const fearsAddressed = allEntities.filter(
    (e) => e.entity_type === "fear" && e.status === "addressed"
  );
  const patternsDetected = allEntities.filter(
    (e) => e.entity_type === "pattern"
  );

  // ── 4. Generate progress review via LLM ──
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.warn(`[${FUNCTION_NAME}] OPENAI_API_KEY not set, skipping`);
    return;
  }

  const reviewPrompt = `You are a coaching strategist generating a monthly progress review for ${userName}.

## USER PROFILE
Weeks active: ${weeksActive}
Trust level: ${trustLevel}/5
Current arc phase: ${currentArcPhase}
Frameworks used: ${JSON.stringify(coachProfile.data?.framework_affinity ?? {})}

## MONTHLY METRICS
Commitments made: ${allCommitments.length}
Commitments completed: ${completedCommitments.length} (${completionRate}%)
Wins this month: ${wins.map((w) => w.name).join(", ") || "None tracked"}
Goals resolved: ${goalsResolved.map((g) => g.name).join(", ") || "None"}
Fears addressed: ${fearsAddressed.map((f) => f.name).join(", ") || "None"}
Patterns detected: ${patternsDetected.map((p) => p.name).join(", ") || "None"}

## ACTIVE CHALLENGES
${(challenges.data ?? [])
    .filter((c) => c.status === "active")
    .map((c) => `- "${c.title}" (${c.framework}, ${c.framework_phase})`)
    .join("\n") || "None active."}

## WEEKLY SUMMARIES (last 4 weeks)
${(agendas.data ?? [])
    .map(
      (a, i) =>
        `Week ${i + 1}: ${a.week_summary ?? "No summary"} [Topic: ${a.priority_topic ?? "none"}]`
    )
    .join("\n") || "No agenda history."}

## YOUR TASK
Generate a warm, specific monthly progress review. Return JSON:

{
  "review_message": "The actual progress review message to send. 4-6 paragraphs. Celebrate growth, name specific achievements, acknowledge challenges, suggest direction for next month. Must feel personal and insightful, not generic.",
  "arc_phase_recommendation": "orientation|working|depth|integration",
  "next_month_focus": "Recommended primary coaching focus for next month",
  "growth_areas": ["specific areas where user showed growth"],
  "challenge_areas": ["areas that still need work"],
  "coaching_style_adjustment": "Any recommended adjustment to coaching approach"
}

TONE: Warm, celebratory, but honest. Like a trusted coach reflecting on a journey together.`;

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
        messages: [{ role: "user", content: reviewPrompt }],
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
  const review = JSON.parse(data.choices[0].message.content);

  // ── 5. Update arc phase in coaching_agenda ──
  const newArcPhase = review.arc_phase_recommendation || currentArcPhase;

  // Update the most recent coaching_agenda with the new arc phase
  if (agendas.data && agendas.data.length > 0) {
    await supabase
      .from("coaching_agenda")
      .update({ arc_phase: newArcPhase })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  // ── 6. Schedule progress review delivery ──
  // Brand the review for the user's vertical (same stamp as the weekly
  // session planner) so cron-process-scheduled sends it as the right coach.
  const resolved = await resolveProgram(supabase, userId, null, null);
  const program = (resolved.ok ? resolved.program : null) ?? "general";
  const brand = brandForProgram(program).id;

  await supabase.from("scheduled_messages").insert({
    user_id: userId,
    type: "progress_review",
    scheduled_for: new Date().toISOString(), // Send ASAP
    context: {
      content: review.review_message,
      subject: "Your Monthly Progress Review 📊",
      arc_phase: newArcPhase,
      next_month_focus: review.next_month_focus,
      brand,
      program,
    },
    status: "pending",
  });

  // ── 7. Log cost ──
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
    `[${FUNCTION_NAME}] Review for ${userId}: arc=${newArcPhase}, focus="${review.next_month_focus}"`
  );
}

// ─── ARC PHASE DETERMINATION ────────────────────────────────────────────

interface ChallengeRecord {
  title: string;
  framework: string;
  framework_phase: string;
  status: string;
}

function determineArcPhase(
  weeksActive: number,
  trustLevel: number,
  frameworkAffinity: unknown,
  challenges: ChallengeRecord[]
): string {
  // Integration: user has internalized frameworks
  // (low framework_usage but high completion, OR 12+ weeks + trust ≥ 4)
  if (weeksActive >= 12 && trustLevel >= 4) {
    return "integration";
  }

  // Depth: 8+ weeks, trust ≥ 3, Tier 2+ frameworks used
  const hasAdvancedFramework = challenges.some((c) => {
    const advancedFrameworks = [
      "Situational Leadership",
      "Motivational Interviewing",
      "Immunity to Change",
      "Internal Family Systems",
    ];
    return advancedFrameworks.includes(c.framework);
  });

  if (weeksActive >= 8 && trustLevel >= 3 && hasAdvancedFramework) {
    return "depth";
  }

  // Working: 2+ weeks, trust ≥ 2, 5+ conversations
  if (weeksActive >= 2 && trustLevel >= 2) {
    return "working";
  }

  // Default: Orientation
  return "orientation";
}
