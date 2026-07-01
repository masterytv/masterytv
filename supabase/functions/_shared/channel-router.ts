/**
 * Channel Router — Unified coaching pipeline for all channels.
 *
 * S4.5: All three channels (web, email, Telegram) normalize to the
 * CoachMessage interface before hitting this pipeline.
 *
 * Architecture: ARCHITECTURE.md §5.3
 *
 * Provides:
 * - CoachMessage interface (canonical message format)
 * - resolveConversation() — find or create conversation thread
 * - processCoachMessage() — full batch pipeline (for email + Telegram)
 * - formatForChannel() — output formatting per channel
 *
 * The web chat handler (coach/index.ts) uses its own streaming pipeline
 * but shares the same sub-functions (crisis, post-process, conversation).
 */

import { createSupabaseClient } from "./supabase.ts";
import { callClaude, calculateCost } from "./anthropic.ts";
import { assemblePrompt } from "./prompt-assembler.ts";
import {
  generateEmbedding,
  logEmbeddingCost,
} from "./embeddings.ts";
import { SEARCH_FACTS_TOOL, handleSearchFacts } from "./search-facts.ts";
import { runCrisisDetection } from "./crisis-detection.ts";
import { postProcess } from "./post-processor.ts";
import { runSafetySweep } from "./safety-sweep.ts";
import { resetStrikes } from "./nagging.ts";

const CONVERSATION_TIMEOUT_HOURS = 4;
const MAX_TOOL_CALLS = 3;

export const COACHING_DISCLAIMER = `**Important Notice:** I'm an AI coaching assistant, not a licensed professional. I provide coaching guidance on business strategy, personal development, communication, and goal-setting. I don't provide legal, tax, medical, financial, or mental health advice. For those areas, please consult a qualified professional. By continuing, you acknowledge this.`;

const DISCLAIMER_INTERVAL_DAYS = 30;

// ─── TYPES ──────────────────────────────────────────────────────────────

/**
 * Canonical message format — all channels normalize to this.
 * This is the single interface for the coaching engine.
 */
export interface CoachMessage {
  user_id: string;
  channel: "email" | "telegram" | "web";
  content: string;
  conversation_id?: string;
  metadata: {
    telegram_chat_id?: string;
    email_message_id?: string; // For threading replies
    email_subject?: string;
  };
}

/**
 * Result from the coaching pipeline.
 */
export interface CoachResult {
  response: string;
  conversationId: string;
  messageId: string | null;
  crisisDetected: boolean;
  disclaimerShown: boolean;
  metadata: {
    model: string;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    activeChallenges: Array<{
      title: string;
      framework: string;
      phase: string;
    }>;
  };
}

// ─── CONVERSATION RESOLUTION ────────────────────────────────────────────

/**
 * Finds the active conversation or creates a new one.
 * A conversation expires after 4 hours of inactivity.
 * Shared across all channels.
 */
export async function resolveConversation(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  channel: string,
  providedConversationId?: string,
  engagementId: string | null = null
): Promise<string> {
  // PC1: when the client provides a conversation_id, TRUST it. The web client
  // manages conversations explicitly (new = a fresh client-generated uuid), so
  // a brand-new conversation has no messages AND no row yet — validating it
  // here would fail and fall through to timeout-reuse, merging the message into
  // the wrong conversation. Messages are RLS-scoped per user, so trusting a
  // client uuid is safe. Timeout-reuse below only applies when NO id is given
  // (channels without conversation management, e.g. email / telegram).
  if (providedConversationId) {
    return providedConversationId;
  }

  // Most recent message IN THIS THREAD, to check for timeout / reuse.
  let lq = supabase
    .from("messages")
    .select("conversation_id, created_at")
    .eq("user_id", userId);
  lq = engagementId ? lq.eq("engagement_id", engagementId) : lq.is("engagement_id", null);
  const { data: lastMsg } = await lq
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMsg) {
    const lastTime = new Date(lastMsg.created_at).getTime();
    const now = Date.now();
    const hoursSince = (now - lastTime) / (1000 * 60 * 60);

    if (hoursSince < CONVERSATION_TIMEOUT_HOURS) {
      return lastMsg.conversation_id;
    }

    // Session ended — trigger background summarization of old conversation (S6.12)
    summarizeEndedSession(supabase, userId, lastMsg.conversation_id).catch(
      (e) =>
        console.error(
          "[channel-router] Background summarization error:",
          (e as Error).message
        )
    );
  }

  return crypto.randomUUID();
}

// ─── BATCH COACHING PIPELINE ────────────────────────────────────────────

/**
 * Full coaching pipeline in batch mode (non-streaming).
 * Used by email and Telegram channels.
 *
 * Flow:
 * 1. Crisis detection
 * 2. Conversation resolution
 * 3. Store user message
 * 4. Check disclaimer
 * 5. Assemble prompt
 * 6. Call Claude (batch, with tool_use loop)
 * 7. Store coach response
 * 8. Log cost
 * 9. Post-process (async)
 * 10. Return result
 */
export async function processCoachMessage(
  msg: CoachMessage
): Promise<CoachResult> {
  const supabase = createSupabaseClient();

  // ── 0.5 Free tier message limit (S5.9) ──
  const limitResult = await checkBatchMessageLimit(supabase, msg.user_id);
  if (limitResult.limitReached) {
    return {
      response: limitResult.upgradeMessage!,
      conversationId: msg.conversation_id ?? "",
      messageId: null,
      crisisDetected: false,
      disclaimerShown: false,
      metadata: {
        model: "",
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        activeChallenges: [],
      },
    };
  }

  // ── 0.6 Reset nagging strikes (S5.4) ──
  // User responding to ANY outreach resets the strike counter
  resetStrikes(supabase, msg.user_id, "morning_briefing").catch(() => {});
  resetStrikes(supabase, msg.user_id, "accountability_check").catch(() => {});

  // ── 1. Crisis detection ──
  const crisis = await runCrisisDetection(supabase, msg.user_id, msg.content);
  if (crisis.isCrisis && crisis.response) {
    return {
      response: crisis.response,
      conversationId: msg.conversation_id ?? "",
      messageId: null,
      crisisDetected: true,
      disclaimerShown: false,
      metadata: {
        model: "",
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        activeChallenges: [],
      },
    };
  }

  // ── 2. Resolve conversation ──
  const conversationId = await resolveConversation(
    supabase,
    msg.user_id,
    msg.channel,
    msg.conversation_id
  );

  // ── 3. Store user message ──
  const { data: userMsgRow, error: insertError } = await supabase
    .from("messages")
    .insert({
      user_id: msg.user_id,
      conversation_id: conversationId,
      channel: msg.channel,
      role: "user",
      content: msg.content,
      metadata: msg.metadata,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to store message: ${insertError.message}`);
  }

  // Embed user message (async, don't block)
  if (userMsgRow?.id) {
    embedMessageAsync(supabase, msg.user_id, msg.content, userMsgRow.id);
  }

  // ── 4. Check disclaimer ──
  let disclaimerShown = false;
  const { data: disclaimerUser } = await supabase
    .from("users")
    .select("disclaimer_last_shown_at")
    .eq("id", msg.user_id)
    .single();

  if (!disclaimerUser?.disclaimer_last_shown_at) {
    disclaimerShown = true;
  } else {
    const daysSince =
      (Date.now() -
        new Date(disclaimerUser.disclaimer_last_shown_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSince >= DISCLAIMER_INTERVAL_DAYS) {
      disclaimerShown = true;
    }
  }

  if (disclaimerShown) {
    // Update disclaimer timestamp (fire-and-forget)
    supabase
      .from("users")
      .update({ disclaimer_last_shown_at: new Date().toISOString() })
      .eq("id", msg.user_id)
      .then(() => {});
  }

  // ── 5. Assemble prompt ──
  const { system, conversationHistory, metadata } = await assemblePrompt(
    msg.user_id,
    msg.content
  );

  const claudeMessages = [
    ...conversationHistory,
    { role: "user" as const, content: msg.content },
  ];

  // ── 6. Call Claude (batch, with tool_use loop) ──
  let fullContent = "";
  let model = "";
  let inputTokens = 0;
  let outputTokens = 0;

  let currentMessages = [...claudeMessages];
  let toolCallCount = 0;

  while (toolCallCount <= MAX_TOOL_CALLS) {
    const response = await callClaude({
      system,
      messages: currentMessages,
      tools: [SEARCH_FACTS_TOOL],
      maxTokens: 1024,
    });

    model = response.model;
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    // Extract text content
    for (const block of response.content) {
      if (block.type === "text" && block.text) {
        fullContent += block.text;
      }
    }

    // Check for tool_use
    const toolUseBlock = response.content.find(
      (b) => b.type === "tool_use"
    );

    if (response.stop_reason === "tool_use" && toolUseBlock) {
      toolCallCount++;
      console.log(
        `[channel-router] Tool call #${toolCallCount}: ${toolUseBlock.name}`
      );

      let toolResult = "";
      try {
        if (toolUseBlock.name === "search_facts") {
          const input = toolUseBlock.input as { query: string };
          const result = await handleSearchFacts(input?.query ?? "");
          toolResult = JSON.stringify(result);
        } else {
          toolResult = JSON.stringify({
            error: `Unknown tool: ${toolUseBlock.name}`,
          });
        }
      } catch (e) {
        toolResult = JSON.stringify({
          error: `Tool error: ${(e as Error).message}`,
        });
      }

      // Continue with tool result
      currentMessages = [
        ...currentMessages,
        {
          role: "assistant" as const,
          content: [
            {
              type: "tool_use",
              id: toolUseBlock.id!,
              name: toolUseBlock.name!,
              input: toolUseBlock.input,
            },
          ] as unknown as string,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id!,
              content: toolResult,
            },
          ] as unknown as string,
        },
      ];

      continue;
    }

    // No tool use — done
    break;
  }

  // ── 7. Store coach response ──
  const isFallback = model.startsWith("gpt-");
  const usage = { input_tokens: inputTokens, output_tokens: outputTokens };
  const costUsd = calculateCost(usage, isFallback);

  if (isFallback) {
    console.warn(
      `[channel-router] ⚠️ Response served via GPT-4o fallback for user ${msg.user_id}`
    );
  }

  const coachMetadata = {
    model,
    stop_reason: "end_turn",
    tokens_in: inputTokens,
    tokens_out: outputTokens,
    active_challenges: metadata.activeChallenges.map((c) => ({
      title: c.title,
      framework: c.framework,
      phase: c.framework_phase,
    })),
  };

  const { data: coachMsgRow, error: coachInsertError } = await supabase
    .from("messages")
    .insert({
      user_id: msg.user_id,
      conversation_id: conversationId,
      channel: msg.channel,
      role: "coach",
      content: fullContent,
      metadata: coachMetadata,
    })
    .select("id, created_at")
    .single();

  if (coachInsertError) {
    console.error(
      "[channel-router] Failed to store coach response:",
      coachInsertError.message
    );
  }

  // ── 8. Log cost ──
  await supabase.from("cost_tracking").insert({
    user_id: msg.user_id,
    purpose: `coach-${msg.channel}`,
    model,
    tokens_in: inputTokens,
    tokens_out: outputTokens,
    cost_usd: costUsd,
  });

  // ── 9. Post-process (async) ──
  if (coachMsgRow?.id) {
    // Fire-and-forget — don't await
    postProcess(
      supabase,
      msg.user_id,
      conversationId,
      msg.content,
      fullContent,
      coachMsgRow.id
    ).catch((e) =>
      console.error("[channel-router] Post-process error:", e.message)
    );

    // Tier 2 safety sweep (async, non-blocking) — parity with the web coach.
    runSafetySweep(supabase, {
      userId: msg.user_id,
      conversationId,
      engagementId,
    }).catch((e) =>
      console.error("[channel-router] safety-sweep error:", e.message)
    );
  }

  // ── 10. Return result ──
  return {
    response: fullContent,
    conversationId,
    messageId: coachMsgRow?.id ?? null,
    crisisDetected: false,
    disclaimerShown,
    metadata: {
      model,
      tokensIn: inputTokens,
      tokensOut: outputTokens,
      costUsd,
      activeChallenges: metadata.activeChallenges.map((c) => ({
        title: c.title,
        framework: c.framework,
        phase: c.framework_phase,
      })),
    },
  };
}

// ─── HELPERS ────────────────────────────────────────────────────────────

/**
 * Embed a user message asynchronously (don't block response).
 */
function embedMessageAsync(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  content: string,
  messageId: string
): void {
  (async () => {
    try {
      const embedding = await generateEmbedding(content);
      await supabase
        .from("messages")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", messageId);
      await logEmbeddingCost(userId, "embed-user-message", [content]);
    } catch (e) {
      console.error(
        "[channel-router] Failed to embed message:",
        (e as Error).message
      );
    }
  })();
}

// ─── FREE TIER LIMIT (BATCH) ────────────────────────────────────────────

const FREE_TIER_DAILY_LIMIT = 5;

async function checkBatchMessageLimit(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<{ limitReached: boolean; upgradeMessage?: string }> {
  const { data: user } = await supabase
    .from("users")
    .select("subscription_tier, daily_message_count, daily_message_reset_at")
    .eq("id", userId)
    .single();

  if (!user || user.subscription_tier !== "free") {
    return { limitReached: false };
  }

  const today = new Date().toISOString().split("T")[0];
  let currentCount = user.daily_message_count ?? 0;

  if (user.daily_message_reset_at !== today) {
    await supabase
      .from("users")
      .update({ daily_message_count: 0, daily_message_reset_at: today })
      .eq("id", userId);
    currentCount = 0;
  }

  if (currentCount >= FREE_TIER_DAILY_LIMIT) {
    return {
      limitReached: true,
      upgradeMessage: `You've used all ${FREE_TIER_DAILY_LIMIT} free messages for today. Upgrade to Core ($99/month) for unlimited coaching — visit your Settings page to upgrade, or come back tomorrow for ${FREE_TIER_DAILY_LIMIT} more free messages.`,
    };
  }

  // Increment counter
  await supabase
    .from("users")
    .update({ daily_message_count: currentCount + 1 })
    .eq("id", userId);

  return { limitReached: false };
}

// ─── CHANNEL FORMATTERS ─────────────────────────────────────────────────

/**
 * Strip markdown formatting for plain text output.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/#{1,6}\s/g, "") // headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) =>
      m.replace(/`/g, "")
    ); // code
}

// ─── SESSION SUMMARIZATION (S6.12) ──────────────────────────────────────

const MIN_MESSAGES_FOR_SUMMARY = 6;

/**
 * Summarize an ended conversation session in the background.
 * Called when resolveConversation() detects a timeout and creates a new session.
 * Uses GPT-4o-mini for cost efficiency.
 */
async function summarizeEndedSession(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    // Check if already summarized
    const { data: existing } = await supabase
      .from("conversation_summaries")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(1);

    if (existing && existing.length > 0) {
      return; // Already summarized
    }

    // Load messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content, created_at, metadata")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (msgError || !messages || messages.length < MIN_MESSAGES_FOR_SUMMARY) {
      return; // Not enough messages to summarize
    }

    // Extract framework from metadata if present
    let frameworkUsed: string | null = null;
    for (const msg of messages) {
      const meta = msg.metadata as Record<string, unknown> | null;
      if (meta?.active_challenges) {
        const challenges = meta.active_challenges as Array<{
          framework?: string;
        }>;
        if (challenges.length > 0 && challenges[0].framework) {
          frameworkUsed = challenges[0].framework;
          break;
        }
      }
    }

    // Format transcript (truncate long messages)
    const transcript = messages
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "coach" ? "COACH" : "USER"}: ${m.content.slice(0, 500)}`
      )
      .join("\n\n");

    // Call GPT-4o-mini
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.warn("[channel-router] OPENAI_API_KEY not set, skipping summary");
      return;
    }

    const frameworkHint = frameworkUsed
      ? `\nThe coaching framework used was: ${frameworkUsed}.`
      : "";

    const prompt = `Summarize this coaching conversation into a concise session summary.${frameworkHint}

CONVERSATION:
${transcript}

Return JSON:
{
  "summary": "2-4 sentence narrative summary of what was discussed, key decisions made, and any breakthroughs or sticking points. Write from the coach's perspective.",
  "key_topics": ["topic1", "topic2", "topic3"]
}

Rules:
- Focus on: what the user is working on, what shifted, what they committed to
- key_topics: 2-5 short labels
- Keep summary under 100 words
- Return ONLY valid JSON`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a coaching session summarizer. Output only valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "[channel-router] Summary OpenAI error:",
        await response.text()
      );
      return;
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    // Store summary
    const { error: insertError } = await supabase
      .from("conversation_summaries")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        summary:
          parsed.summary || "Session occurred but summary unavailable.",
        key_topics: parsed.key_topics || [],
        framework_used: frameworkUsed,
        message_count: messages.length,
        first_message_at: messages[0].created_at,
        last_message_at: messages[messages.length - 1].created_at,
      });

    if (insertError) {
      console.error(
        "[channel-router] Summary insert error:",
        insertError.message
      );
      return;
    }

    // Log cost
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    const costUsd =
      (tokensIn / 1_000_000) * 0.15 + (tokensOut / 1_000_000) * 0.6;

    await supabase.from("cost_tracking").insert({
      user_id: userId,
      purpose: "session-summarizer",
      model: "gpt-4o-mini",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
    });

    console.log(
      `[channel-router] Summarized session ${conversationId} (${messages.length} msgs)`
    );
  } catch (error) {
    // Never let summarization failures affect the user
    console.error(
      "[channel-router] summarizeEndedSession error:",
      (error as Error).message
    );
  }
}
