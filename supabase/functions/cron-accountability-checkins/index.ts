/**
 * Cron Accountability Check-ins — Generates coaching check-ins for nearing/overdue commitments.
 *
 * S5.3: Proactive accountability engine. Scans commitments with approaching
 * or missed due dates, generates personalized check-in messages, and queues
 * them via scheduled_messages for delivery by cron-process-scheduled.
 *
 * Triggered by pg_cron every 2 hours (enough frequency to catch daily deadlines).
 *
 * Architecture: ARCHITECTURE.md §5.6
 *
 * Flow:
 * 1. Query commitments with due_date within 24h OR overdue by <48h
 * 2. For each: check nagging state, skip if paused
 * 3. Generate personalized check-in message via Claude
 * 4. Insert into scheduled_messages (type: accountability_check)
 * 5. cron-process-scheduled handles actual delivery
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { callClaude, calculateCost } from "../_shared/anthropic.ts";
import { checkNaggingState } from "../_shared/nagging.ts";
import { EDGE_BRANDS, brandForProgram, type BrandId } from "../_shared/brands.ts";

const FUNCTION_NAME = "cron-accountability-checkins";

interface CommitmentWithUser {
  id: string;
  user_id: string;
  description: string;
  context_note: string | null;
  source_message_id: string | null;
  due_date: string;
  type: string;
  status: string;
  user_name: string;
  user_timezone: string;
  subscription_tier: string;
}

/** Where a commitment came from — brand + conversation, for context + linking. */
interface CommitmentSource {
  brand: BrandId;
  conversationId: string | null;
  conversationTitle: string | null;
  /** Last few turns of the source conversation, chronological, truncated. */
  snippet: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createSupabaseClient();

  try {
    // ── 1. Find commitments nearing or past due ──
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const { data: commitments, error: queryError } = await supabase
      .from("commitments")
      .select(`
        id,
        user_id,
        description,
        context_note,
        source_message_id,
        due_date,
        type,
        status,
        users!inner (
          name,
          timezone,
          subscription_tier
        )
      `)
      .eq("status", "active")
      .not("due_date", "is", null)
      .gte("due_date", past48h.toISOString())
      .lte("due_date", in24h.toISOString());

    if (queryError) {
      console.error(`[${FUNCTION_NAME}] Query error:`, queryError.message);
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!commitments || commitments.length === 0) {
      console.log(`[${FUNCTION_NAME}] No commitments needing check-ins`);
      return new Response(
        JSON.stringify({ processed: 0, message: "No commitments in window" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 2. Deduplicate — don't send multiple check-ins for same user ──
    // Group commitments by user, take the most urgent one
    const byUser = new Map<string, CommitmentWithUser[]>();
    for (const c of commitments) {
      const user = (c as unknown as { users: { name: string; timezone: string; subscription_tier: string } }).users;
      const mapped: CommitmentWithUser = {
        id: c.id,
        user_id: c.user_id,
        description: c.description,
        context_note: c.context_note ?? null,
        source_message_id: c.source_message_id ?? null,
        due_date: c.due_date,
        type: c.type,
        status: c.status,
        user_name: user.name,
        user_timezone: user.timezone,
        subscription_tier: user.subscription_tier,
      };

      const existing = byUser.get(c.user_id) || [];
      existing.push(mapped);
      byUser.set(c.user_id, existing);
    }

    console.log(`[${FUNCTION_NAME}] ${byUser.size} users with due commitments`);

    let queued = 0;
    let skipped = 0;

    for (const [userId, userCommitments] of byUser) {
      try {
        // Skip churned users
        if (userCommitments[0].subscription_tier === "churned") {
          skipped++;
          continue;
        }

        // ── 3. Check nagging state ──
        const nagging = await checkNaggingState(
          supabase,
          userId,
          "accountability_check"
        );
        if (!nagging.canSend) {
          console.log(`[${FUNCTION_NAME}] Skipping ${userId}: nagging paused`);
          skipped++;
          continue;
        }

        // ── 4. Check for recent check-in (avoid duplicates within 12h) ──
        const twelvHoursAgo = new Date(
          Date.now() - 12 * 60 * 60 * 1000
        ).toISOString();
        const { count: recentCount } = await supabase
          .from("scheduled_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "accountability_check")
          .in("status", ["pending", "generating", "sent"])
          .gte("created_at", twelvHoursAgo);

        if ((recentCount ?? 0) > 0) {
          console.log(
            `[${FUNCTION_NAME}] Skipping ${userId}: recent check-in exists`
          );
          skipped++;
          continue;
        }

        // ── 4.5 Resolve where the commitment came from (brand + conversation) ──
        // Context makes the check-in specific ("the test for your brother")
        // instead of a vague echo of the extracted description, the brand picks
        // the right email chrome/domain, and the conversation id lets the email
        // deep-link back AND threads the check-in into the original conversation.
        const source = await resolveCommitmentSource(supabase, userCommitments);

        // ── 5. Generate check-in message ──
        const checkin = await generateCheckinMessage(
          userCommitments[0].user_name,
          userCommitments,
          nagging.tone,
          source
        );

        // ── 6. Queue in scheduled_messages ──
        // Reuse the SOURCE conversation so the check-in (and any email reply)
        // lands in the thread the commitment came from.
        const conversationId = source.conversationId ?? crypto.randomUUID();
        const origin = EDGE_BRANDS[source.brand ?? "masterytv"].origin;
        const { error: insertError } = await supabase
          .from("scheduled_messages")
          .insert({
            user_id: userId,
            type: "accountability_check",
            status: "pending",
            scheduled_for: new Date().toISOString(), // Deliver ASAP
            context: {
              content: checkin.content,
              subject: checkin.subject,
              conversation_id: conversationId,
              brand: source.brand,
              conversation_url: source.conversationId
                ? `${origin}/dashboard/chat?c=${source.conversationId}`
                : null,
              commitment_ids: userCommitments.map((c) => c.id),
            },
            retry_count: 0,
          });

        if (insertError) {
          console.error(
            `[${FUNCTION_NAME}] Failed to queue for ${userId}:`,
            insertError.message
          );
          continue;
        }

        // Track cost
        await supabase.from("cost_tracking").insert({
          user_id: userId,
          purpose: FUNCTION_NAME,
          model: checkin.model,
          tokens_in: checkin.tokensIn,
          tokens_out: checkin.tokensOut,
          cost_usd: checkin.costUsd,
        });

        queued++;
      } catch (error) {
        console.error(
          `[${FUNCTION_NAME}] Error for user ${userId}:`,
          (error as Error).message
        );
      }
    }

    console.log(
      `[${FUNCTION_NAME}] Done: ${queued} queued, ${skipped} skipped`
    );

    return new Response(
      JSON.stringify({ queued, skipped }),
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

// ─── SOURCE RESOLUTION ───────────────────────────────────────────────────

/**
 * Resolve the conversation a user's commitments came from, plus the vertical
 * (brand) that conversation belongs to.
 *
 * Brand resolution, most→least authoritative:
 * 1. The source coach message's `metadata.program` (stamped by coach/index.ts
 *    since 2026-07-14 — the coach's own resolveProgram verdict).
 * 2. The message/conversation's engagement → kind `relationship_dyad`.
 * 3. Default: executive (masterytv).
 */
async function resolveCommitmentSource(
  supabase: ReturnType<typeof createSupabaseClient>,
  commitments: CommitmentWithUser[]
): Promise<CommitmentSource> {
  const result: CommitmentSource = {
    brand: "masterytv",
    conversationId: null,
    conversationTitle: null,
    snippet: "",
  };

  const sourceMessageId = commitments.find((c) => c.source_message_id)?.source_message_id;
  if (!sourceMessageId) return result;

  try {
    const { data: msg } = await supabase
      .from("messages")
      .select("conversation_id, engagement_id, metadata")
      .eq("id", sourceMessageId)
      .maybeSingle();
    if (!msg) return result;

    result.conversationId = msg.conversation_id ?? null;

    // 1. Program stamp on the source message
    const stampedProgram = (msg.metadata as Record<string, unknown> | null)?.program;
    let engagementId: string | null = msg.engagement_id ?? null;

    if (result.conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("title, engagement_id")
        .eq("id", result.conversationId)
        .maybeSingle();
      result.conversationTitle = conv?.title ?? null;
      engagementId = engagementId ?? conv?.engagement_id ?? null;

      // Last few turns, chronological, for check-in specificity.
      const { data: recent } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", result.conversationId)
        .order("created_at", { ascending: false })
        .limit(6);
      result.snippet = (recent ?? [])
        .slice()
        .reverse()
        .map((m) => `${m.role === "coach" ? "Coach" : "User"}: ${String(m.content).slice(0, 220)}`)
        .join("\n");
    }

    if (typeof stampedProgram === "string" && stampedProgram) {
      result.brand = brandForProgram(stampedProgram).id;
      return result;
    }

    // 2. Engagement kind fallback (pre-stamp messages)
    if (engagementId) {
      const { data: eng } = await supabase
        .from("engagement")
        .select("kind")
        .eq("id", engagementId)
        .maybeSingle();
      if (eng?.kind === "relationship_dyad") result.brand = "relatti";
    }
  } catch (e) {
    console.error(`[${FUNCTION_NAME}] Source resolution failed:`, (e as Error).message);
  }

  return result;
}

// ─── CHECK-IN GENERATION ─────────────────────────────────────────────────

interface GeneratedCheckin {
  content: string;
  subject: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

async function generateCheckinMessage(
  userName: string,
  commitments: CommitmentWithUser[],
  tone: "initial" | "softer" | "final_pause",
  source?: CommitmentSource
): Promise<GeneratedCheckin> {
  const now = new Date();

  // Classify commitments as approaching or overdue
  const approaching = commitments.filter(
    (c) => new Date(c.due_date) > now
  );
  const overdue = commitments.filter(
    (c) => new Date(c.due_date) <= now
  );

  const commitmentList = commitments
    .map((c) => {
      const due = new Date(c.due_date);
      const diffHours = Math.round(
        (due.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      const status =
        diffHours < 0
          ? `overdue by ${Math.abs(diffHours)}h`
          : `due in ${diffHours}h`;
      const note = c.context_note ? ` — context: ${c.context_note}` : "";
      return `- ${c.description} (${status})${note}`;
    })
    .join("\n");

  // The conversation the commitment came from — so the check-in can name
  // specifics ("the Relatti test for your brother") instead of parroting the
  // extracted description, which often reads as vague out of context.
  const sourceBlock = source?.snippet
    ? `\nWHERE THIS CAME FROM (${source.conversationTitle ? `conversation: "${source.conversationTitle}"` : "recent conversation"}):\n${source.snippet}\n`
    : "";

  // Adjust tone based on nagging state
  const toneInstructions = {
    initial:
      "Be direct and encouraging. Reference the specific commitment. Ask how it's going.",
    softer:
      "Be gentler — this is the second unreplied check-in. Acknowledge they might be busy. Offer to adjust the timeline.",
    final_pause:
      "Very light touch. This is the final check before pausing. Say something like 'I'll ease off on reminders — just let me know when you want to revisit this.'",
  };

  const prompt = `Generate a brief accountability check-in for ${userName}.

COMMITMENTS:
${commitmentList}
${sourceBlock}
CONTEXT:
- ${approaching.length} commitment(s) approaching deadline
- ${overdue.length} commitment(s) overdue

TONE: ${toneInstructions[tone]}

INSTRUCTIONS:
- Keep it to 2-4 sentences
- BE SPECIFIC: use the conversation above to name what the commitment is actually about (the people, the thing, the plan) — the user reads this cold, hours or days later, so "the test you needed to send" is too vague if you know it's "sending your brother the Relatti test"
- Reference the most important/urgent commitment
- If overdue: don't guilt-trip, ask what happened and offer to adjust
- If approaching: create helpful urgency, ask about progress
- End with a specific question
- Write conversational prose, not lists
- Max 1 emoji

OUTPUT: Just the check-in text.`;

  const response = await callClaude({
    system:
      "You are a coaching assistant generating brief accountability check-ins. Be warm, specific, and non-judgmental.",
    messages: [{ role: "user", content: prompt }],
    maxTokens: 200,
  });

  const content =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") ||
    `Hey ${userName}, just checking in on your commitments. How's everything going?`;

  const usage = response.usage;
  const costUsd = calculateCost(usage);

  // Subject line for email delivery
  const subject =
    overdue.length > 0
      ? "Quick Check-in — How's It Going?"
      : "Heads Up — Deadline Approaching";

  return {
    content,
    subject,
    model: response.model,
    tokensIn: usage.input_tokens,
    tokensOut: usage.output_tokens,
    costUsd,
  };
}
