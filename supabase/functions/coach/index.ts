/**
 * Coaching Edge Function — The primary conversational endpoint.
 * 
 * POST /functions/v1/coach
 * Body: { message: string, channel?: "web"|"email"|"telegram", conversation_id?: string }
 * Auth: JWT required (user must be authenticated)
 * 
 * Flow:
 * 1. Authenticate user from JWT
 * 2. Resolve or create conversation_id (new after 4h inactivity)
 * 3. Store user message
 * 4. Assemble 11-layer prompt
 * 5. Stream Claude response to client via SSE
 * 6. On stream complete: store coach response, log cost, trigger post-processing
 * 7. Send final metadata event
 * 
 * Architecture: SPRINT.md S2.1 + S2.4
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse } from "../_shared/errors.ts";
import { callClaudeStreaming, calculateCost } from "../_shared/anthropic.ts";
import { assemblePrompt } from "../_shared/prompt-assembler.ts";

const FUNCTION_NAME = "coach";
const CONVERSATION_TIMEOUT_HOURS = 4;

// ─── CONVERSATION RESOLUTION ───────────────────────────────────────────

/**
 * Finds the active conversation or creates a new one.
 * A conversation expires after 4 hours of inactivity.
 */
async function resolveConversation(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  channel: string,
  providedConversationId?: string
): Promise<string> {
  // If client provided a conversation_id, validate it
  if (providedConversationId) {
    const { data } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("user_id", userId)
      .eq("conversation_id", providedConversationId)
      .limit(1);

    if (data && data.length > 0) return providedConversationId;
  }

  // Find the most recent message to check for timeout
  const { data: lastMsg } = await supabase
    .from("messages")
    .select("conversation_id, created_at")
    .eq("user_id", userId)
    .eq("channel", channel)
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
  }

  // New conversation — use UUID
  return crypto.randomUUID();
}

// ─── SSE HELPERS ────────────────────────────────────────────────────────

/** Format a Server-Sent Event */
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only POST
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  let userId: string | undefined;

  try {
    // ── 1. Authenticate ──
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    // ── 2. Parse request ──
    const body = await req.json();
    const message = body.message?.trim();
    const channel = body.channel || "web";

    if (!message) {
      return errorResponse("BAD_REQUEST", "Message is required", 400, corsHeaders);
    }

    if (message.length > 5000) {
      return errorResponse("BAD_REQUEST", "Message too long (max 5000 chars)", 400, corsHeaders);
    }

    // ── 3. Resolve conversation ──
    const supabase = createSupabaseClient();
    const conversationId = await resolveConversation(
      supabase,
      userId,
      channel,
      body.conversation_id
    );

    // ── 4. Store user message ──
    const { error: insertError } = await supabase.from("messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      channel,
      role: "user",
      content: message,
      metadata: {},
    });

    if (insertError) {
      throw new Error(`Failed to store message: ${insertError.message}`);
    }

    // ── 5. Assemble prompt (11-layer architecture) ──
    const { system, conversationHistory, metadata } = await assemblePrompt(
      userId,
      message
    );

    // Build messages array: history + current message
    const claudeMessages = [
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    // ── 6. Stream Claude response to client ──
    const anthropicResponse = await callClaudeStreaming({
      system,
      messages: claudeMessages,
      maxTokens: 1024,
    });

    if (!anthropicResponse.body) {
      throw new Error("Anthropic returned no response body");
    }

    // Create a TransformStream to process Anthropic SSE → client SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process the Anthropic stream in the background
    const streamUserId = userId;
    const streamProcessing = (async () => {
      let fullContent = "";
      let model = "";
      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason = "";

      try {
        // Send the conversation_id immediately so the client knows which conversation this is
        await writer.write(
          encoder.encode(sseEvent("conversation", { conversation_id: conversationId }))
        );

        const reader = anthropicResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events from Anthropic
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case "message_start":
                  model = event.message?.model ?? "";
                  inputTokens = event.message?.usage?.input_tokens ?? 0;
                  break;

                case "content_block_delta":
                  if (event.delta?.type === "text_delta" && event.delta.text) {
                    fullContent += event.delta.text;
                    // Forward the text chunk to the client
                    await writer.write(
                      encoder.encode(sseEvent("delta", { text: event.delta.text }))
                    );
                  }
                  break;

                case "message_delta":
                  stopReason = event.delta?.stop_reason ?? "";
                  outputTokens = event.usage?.output_tokens ?? 0;
                  break;
              }
            } catch {
              // Skip unparseable events
            }
          }
        }

        // ── 7. Stream complete — store, log, post-process ──
        const usage = { input_tokens: inputTokens, output_tokens: outputTokens };
        const costUsd = calculateCost(usage);

        const coachMetadata = {
          model,
          stop_reason: stopReason,
          tokens_in: inputTokens,
          tokens_out: outputTokens,
          active_challenges: metadata.activeChallenges.map((c) => ({
            title: c.title,
            framework: c.framework,
            phase: c.framework_phase,
          })),
        };

        // Store coach message
        const { data: coachMsg, error: coachInsertError } = await supabase
          .from("messages")
          .insert({
            user_id: streamUserId,
            conversation_id: conversationId,
            channel,
            role: "coach",
            content: fullContent,
            metadata: coachMetadata,
          })
          .select("id, created_at")
          .single();

        if (coachInsertError) {
          console.error(`[${FUNCTION_NAME}] Failed to store coach response:`, coachInsertError.message);
        }

        // Log cost
        await supabase.from("cost_tracking").insert({
          user_id: streamUserId,
          purpose: FUNCTION_NAME,
          model,
          tokens_in: inputTokens,
          tokens_out: outputTokens,
          cost_usd: costUsd,
        });

        // Send final metadata event so the client knows the message ID + usage
        await writer.write(
          encoder.encode(
            sseEvent("done", {
              message_id: coachMsg?.id ?? null,
              model,
              tokens: usage,
              cost_usd: costUsd,
              active_challenges: coachMetadata.active_challenges,
            })
          )
        );

        // Trigger async post-processing
        if (coachMsg?.id) {
          EdgeRuntime.waitUntil(
            postProcess(supabase, streamUserId, conversationId, message, fullContent, coachMsg.id)
          );
        }
      } catch (streamError) {
        console.error(`[${FUNCTION_NAME}] Stream processing error:`, (streamError as Error).message);
        try {
          await writer.write(
            encoder.encode(sseEvent("error", { message: "Stream processing failed" }))
          );
        } catch {
          // Writer may be closed, ignore
        }
      } finally {
        try {
          await writer.close();
        } catch {
          // Already closed
        }
      }
    })();

    // Don't await — the stream processing runs concurrently
    EdgeRuntime.waitUntil(streamProcessing);

    // Return the streaming response immediately
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    await logError(FUNCTION_NAME, error as Error, userId);
    console.error(`[${FUNCTION_NAME}]`, (error as Error).message);
    return errorResponse(
      "INTERNAL_ERROR",
      "Something went wrong. Please try again.",
      500,
      corsHeaders
    );
  }
});

// ─── POST-PROCESSING (S2.5 — async, fire-and-forget) ───────────────────

/**
 * Extracts facts and commitments from the conversation exchange.
 * Uses GPT-4o-mini for cost efficiency (async, not blocking response).
 */
async function postProcess(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  conversationId: string,
  userMessage: string,
  coachResponse: string,
  coachMessageId: string
): Promise<void> {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.warn("[post-process] OPENAI_API_KEY not set, skipping extraction");
      return;
    }

    const extractionPrompt = `Analyze this coaching conversation exchange and extract structured data.

USER MESSAGE: ${userMessage}

COACH RESPONSE: ${coachResponse}

Extract the following as JSON:
{
  "facts": [
    { "category": "business|personal|preference|goal|fear|pattern|relationship", "subject": "brief label", "content": "the fact", "importance": 1-10 }
  ],
  "commitments": [
    { "type": "goal|action_item|habit", "description": "what the user committed to", "due_date": "YYYY-MM-DD or null" }
  ],
  "sentiment": "positive|neutral|negative|mixed",
  "topics": ["topic1", "topic2"]
}

Rules:
- Only extract facts the USER stated about themselves, their business, or their situation.
- Only extract commitments the USER explicitly agreed to or stated they would do.
- Don't extract coaching questions or the coach's observations as facts.
- Importance: 1-3 = minor detail, 4-6 = useful context, 7-9 = core to coaching, 10 = critical.
- If nothing to extract, return empty arrays.

Return ONLY valid JSON, no other text.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[post-process] OpenAI error:", await response.text());
      return;
    }

    const data = await response.json();
    const extracted = JSON.parse(data.choices[0].message.content);

    // Store facts
    if (extracted.facts?.length > 0) {
      const factsToInsert = extracted.facts.map(
        (f: { category: string; subject: string; content: string; importance: number }) => ({
          user_id: userId,
          category: f.category,
          subject: f.subject,
          content: f.content,
          importance: f.importance,
          source_message_id: coachMessageId,
          is_confirmed: false,
        })
      );
      await supabase.from("memory_facts").insert(factsToInsert);
    }

    // Store commitments
    if (extracted.commitments?.length > 0) {
      const commitmentsToInsert = extracted.commitments.map(
        (c: { type: string; description: string; due_date: string | null }) => ({
          user_id: userId,
          type: c.type,
          description: c.description,
          due_date: c.due_date || null,
          status: "active",
          source_message_id: coachMessageId,
        })
      );
      await supabase.from("commitments").insert(commitmentsToInsert);
    }

    // Update message metadata with sentiment + topics
    if (extracted.sentiment || extracted.topics) {
      await supabase
        .from("messages")
        .update({
          metadata: {
            sentiment: extracted.sentiment,
            topics: extracted.topics,
          },
        })
        .eq("id", coachMessageId);
    }

    // Log post-processor cost
    const ppTokensIn = data.usage?.prompt_tokens ?? 0;
    const ppTokensOut = data.usage?.completion_tokens ?? 0;
    const ppCost = (ppTokensIn / 1_000_000) * 0.15 + (ppTokensOut / 1_000_000) * 0.6;

    await supabase.from("cost_tracking").insert({
      user_id: userId,
      purpose: "post-processor",
      model: "gpt-4o-mini",
      tokens_in: ppTokensIn,
      tokens_out: ppTokensOut,
      cost_usd: ppCost,
    });

    console.log(
      `[post-process] Extracted ${extracted.facts?.length ?? 0} facts, ${extracted.commitments?.length ?? 0} commitments for user ${userId}`
    );
  } catch (error) {
    // Post-processing failure should never block the user
    console.error("[post-process] Error:", (error as Error).message);
    await logError("post-processor", error as Error, userId);
  }
}
