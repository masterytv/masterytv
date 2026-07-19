/**
 * Cron Conversation Summarizer — S6.12
 *
 * Generates session summaries for stale conversations to provide
 * medium-term memory in the prompt assembler.
 *
 * Architecture: ARCHITECTURE.md §5.2 — "4-Tier Memory System", Medium-term tier
 *
 * Trigger: pg_cron every 30 minutes, or manual POST.
 *
 * Flow:
 * 1. Find conversations with 6+ messages where last message is >2h old
 *    and no summary exists yet
 * 2. For each: load messages, generate a summary via GPT-4o-mini
 * 3. Store in `conversation_summaries` with key_topics, framework_used
 * 4. Log cost to `cost_tracking`
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

const FUNCTION_NAME = "cron-conversation-summarizer";
const MIN_MESSAGES = 6;
const INACTIVITY_HOURS = 2;
const MAX_CONVERSATIONS_PER_RUN = 20;

// GPT-4o-mini pricing (per 1M tokens)
const GPT4O_MINI_INPUT_PER_M = 0.15;
const GPT4O_MINI_OUTPUT_PER_M = 0.6;

interface ConversationToSummarize {
  conversation_id: string;
  user_id: string;
  message_count: number;
  first_message_at: string;
  last_message_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createSupabaseClient();

  try {
    const cutoff = new Date(
      Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000
    ).toISOString();

    // ── 1. Find conversations needing summarization ──
    // Query: conversations with 6+ messages, last message >2h ago, no summary yet
    const { data: candidates, error: queryError } = await supabase.rpc(
      "find_unsummarized_conversations",
      {
        min_messages: MIN_MESSAGES,
        cutoff_time: cutoff,
        max_results: MAX_CONVERSATIONS_PER_RUN,
      }
    );

    // If the RPC doesn't exist yet, fall back to a raw query approach
    let conversations: ConversationToSummarize[] = [];

    if (queryError || !candidates) {
      console.log(
        `[${FUNCTION_NAME}] RPC not available, using direct query`
      );

      // Direct query fallback: find conversation_ids with enough messages
      // that haven't been summarized yet
      const { data: rawConvos, error: rawError } = await supabase
        .from("messages")
        .select("conversation_id, user_id, created_at")
        .lt("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(500);

      if (rawError || !rawConvos) {
        console.error(`[${FUNCTION_NAME}] Query error:`, rawError?.message);
        return new Response(
          JSON.stringify({ error: rawError?.message ?? "Query failed" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Group by conversation_id
      const convMap = new Map<
        string,
        {
          user_id: string;
          messages: string[];
          first: string;
          last: string;
        }
      >();

      for (const msg of rawConvos) {
        const existing = convMap.get(msg.conversation_id);
        if (existing) {
          existing.messages.push(msg.created_at);
          if (msg.created_at < existing.first) existing.first = msg.created_at;
          if (msg.created_at > existing.last) existing.last = msg.created_at;
        } else {
          convMap.set(msg.conversation_id, {
            user_id: msg.user_id,
            messages: [msg.created_at],
            first: msg.created_at,
            last: msg.created_at,
          });
        }
      }

      // Filter: 6+ messages, last message >2h old
      const candidateIds: string[] = [];
      for (const [convId, data] of convMap) {
        if (
          data.messages.length >= MIN_MESSAGES &&
          new Date(data.last) < new Date(cutoff)
        ) {
          candidateIds.push(convId);
          conversations.push({
            conversation_id: convId,
            user_id: data.user_id,
            message_count: data.messages.length,
            first_message_at: data.first,
            last_message_at: data.last,
          });
        }
      }

      if (candidateIds.length === 0) {
        console.log(`[${FUNCTION_NAME}] No conversations to summarize`);
        return new Response(
          JSON.stringify({ summarized: 0, message: "No stale conversations" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Exclude already-summarized conversations
      const { data: existing } = await supabase
        .from("conversation_summaries")
        .select("conversation_id")
        .in("conversation_id", candidateIds);

      const existingSet = new Set(
        (existing ?? []).map(
          (e: { conversation_id: string }) => e.conversation_id
        )
      );
      conversations = conversations
        .filter((c) => !existingSet.has(c.conversation_id))
        .slice(0, MAX_CONVERSATIONS_PER_RUN);
    } else {
      conversations = candidates as ConversationToSummarize[];
    }

    if (conversations.length === 0) {
      console.log(`[${FUNCTION_NAME}] No unsummarized conversations found`);
      return new Response(
        JSON.stringify({ summarized: 0, message: "All caught up" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[${FUNCTION_NAME}] Found ${conversations.length} conversations to summarize`
    );

    // ── 2. Summarize each conversation ──
    let summarized = 0;
    let errors = 0;

    for (const conv of conversations) {
      try {
        // Load messages for this conversation
        const { data: messages, error: msgError } = await supabase
          .from("messages")
          .select("role, content, created_at, metadata")
          .eq("conversation_id", conv.conversation_id)
          .eq("user_id", conv.user_id)
          .order("created_at", { ascending: true })
          .limit(50); // Cap to avoid huge prompts

        if (msgError || !messages || messages.length < MIN_MESSAGES) {
          console.warn(
            `[${FUNCTION_NAME}] Skipping ${conv.conversation_id}: ${msgError?.message ?? "too few messages"}`
          );
          continue;
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

        // Format conversation for the summarizer
        const transcript = messages
          .map(
            (m: { role: string; content: string }) =>
              `${m.role === "coach" ? "COACH" : "USER"}: ${m.content.slice(0, 500)}`
          )
          .join("\n\n");

        // Generate summary via GPT-4o-mini
        const result = await generateSummary(transcript, frameworkUsed);

        if (!result) {
          errors++;
          continue;
        }

        // ── 3. Store summary ──
        const { error: insertError } = await supabase
          .from("conversation_summaries")
          .insert({
            user_id: conv.user_id,
            conversation_id: conv.conversation_id,
            summary: result.summary,
            key_topics: result.key_topics,
            framework_used: frameworkUsed,
            message_count: messages.length,
            first_message_at: messages[0].created_at,
            last_message_at: messages[messages.length - 1].created_at,
          });

        if (insertError) {
          console.error(
            `[${FUNCTION_NAME}] Insert error for ${conv.conversation_id}:`,
            insertError.message
          );
          errors++;
          continue;
        }

        // ── 4. Log cost ──
        await supabase.from("cost_tracking").insert({
          user_id: conv.user_id,
          purpose: FUNCTION_NAME,
          model: "gpt-4o-mini",
          tokens_in: result.tokensIn,
          tokens_out: result.tokensOut,
          cost_usd: result.costUsd,
        });

        summarized++;
        console.log(
          `[${FUNCTION_NAME}] Summarized ${conv.conversation_id} (${messages.length} msgs) → "${result.summary.slice(0, 80)}..."`
        );
      } catch (error) {
        console.error(
          `[${FUNCTION_NAME}] Error summarizing ${conv.conversation_id}:`,
          (error as Error).message
        );
        errors++;
      }
    }

    console.log(
      `[${FUNCTION_NAME}] Done: ${summarized} summarized, ${errors} errors`
    );

    return new Response(
      JSON.stringify({ summarized, errors, total: conversations.length }),
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

// ─── SUMMARY GENERATION ────────────────────────────────────────────────

interface SummaryResult {
  summary: string;
  key_topics: string[];
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

async function generateSummary(
  transcript: string,
  frameworkUsed: string | null
): Promise<SummaryResult | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.error(`[${FUNCTION_NAME}] OPENAI_API_KEY not set`);
    return null;
  }

  const frameworkHint = frameworkUsed
    ? `\nThe coaching framework used was: ${frameworkUsed}.`
    : "";

  const prompt = `Summarize this coaching conversation into a concise session summary.${frameworkHint}

CONVERSATION:
${transcript}

Return JSON:
{
  "summary": "2-4 sentence narrative summary of what was discussed, key decisions made, and any breakthroughs or sticking points. Write from the coach's perspective (e.g., 'We explored...' or 'The user identified...')",
  "key_topics": ["topic1", "topic2", "topic3"]
}

Rules:
- Summary should capture the essence of the session, not list every topic
- Focus on: what the user is working on, what shifted, what they committed to
- key_topics: 2-5 short labels (e.g., "hiring strategy", "delegation", "Q2 goals")
- Keep summary under 100 words
- Return ONLY valid JSON`;

  try {
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
        `[${FUNCTION_NAME}] OpenAI error:`,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    const costUsd =
      (tokensIn / 1_000_000) * GPT4O_MINI_INPUT_PER_M +
      (tokensOut / 1_000_000) * GPT4O_MINI_OUTPUT_PER_M;

    return {
      summary: parsed.summary || "Session occurred but summary unavailable.",
      key_topics: parsed.key_topics || [],
      tokensIn,
      tokensOut,
      costUsd,
    };
  } catch (error) {
    console.error(
      `[${FUNCTION_NAME}] Summary generation failed:`,
      (error as Error).message
    );
    return null;
  }
}
