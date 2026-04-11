/**
 * Coaching Edge Function — Web chat streaming endpoint.
 *
 * POST /functions/v1/coach
 * Body: { message: string, channel?: "web"|"email"|"telegram", conversation_id?: string }
 * Auth: JWT required (user must be authenticated)
 *
 * This is the WEB-SPECIFIC handler that supports SSE streaming.
 * Email and Telegram channels use their own Edge Functions which
 * call the shared processCoachMessage() from channel-router.ts.
 *
 * Architecture: SPRINT.md S2.1 + S2.4, S4.5 (refactored)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse } from "../_shared/errors.ts";
import { callClaudeStreaming, calculateCost } from "../_shared/anthropic.ts";
import { assemblePrompt } from "../_shared/prompt-assembler.ts";
import { generateEmbedding, logEmbeddingCost } from "../_shared/embeddings.ts";
import { SEARCH_FACTS_TOOL, handleSearchFacts } from "../_shared/search-facts.ts";
import {
  resolveConversation,
  COACHING_DISCLAIMER,
} from "../_shared/channel-router.ts";
import { runCrisisDetection } from "../_shared/crisis-detection.ts";
import { postProcess } from "../_shared/post-processor.ts";
import type { DebugSummary, PipelineTimeline } from "../_shared/debug-types.ts";

const FUNCTION_NAME = "coach";
const DISCLAIMER_INTERVAL_DAYS = 30;

// ─── SSE HELPERS ────────────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    // ── 2.3 Debug mode — admin-only, verified server-side ──
    let debugMode = false;
    if (body.debug === true) {
      const { data: adminCheck } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();
      debugMode = adminCheck?.is_admin === true;
      if (!debugMode) {
        console.warn(`[${FUNCTION_NAME}] Non-admin user ${userId} attempted debug mode — ignored`);
      }
    }

    // Pipeline timing (only tracked when debug mode is on)
    const pipelineStart = debugMode ? performance.now() : 0;

    // ── 2.5 Free tier message limit check (S5.9) ──
    const supabase = createSupabaseClient();
    const { limitReached, upgradeResponse } = await checkMessageLimit(supabase, userId, corsHeaders);
    if (limitReached && upgradeResponse) {
      return upgradeResponse;
    }

    // ── 2.6 Crisis Detection (shared module) ──
    const crisisStart = debugMode ? performance.now() : 0;
    const crisis = await runCrisisDetection(supabase, userId, message);
    const crisisMs = debugMode ? performance.now() - crisisStart : 0;

    if (crisis.isCrisis && crisis.response) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseEvent("token", { text: crisis.response })));
          controller.enqueue(encoder.encode(sseEvent("done", { crisis_detected: true })));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── 3. Resolve conversation (shared module) ──
    const convStart = debugMode ? performance.now() : 0;
    const conversationId = await resolveConversation(
      supabase,
      userId,
      channel,
      body.conversation_id
    );
    const convMs = debugMode ? performance.now() - convStart : 0;

    // ── 4. Store user message ──
    const { data: userMsg, error: insertError } = await supabase
      .from("messages")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        channel,
        role: "user",
        content: message,
        metadata: {},
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to store message: ${insertError.message}`);
    }

    // Embed user message asynchronously
    if (userMsg?.id) {
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            const embedding = await generateEmbedding(message);
            await supabase
              .from("messages")
              .update({ embedding: JSON.stringify(embedding) })
              .eq("id", userMsg.id);
            await logEmbeddingCost(userId!, "embed-user-message", [message]);
          } catch (e) {
            console.error("[coach] Failed to embed user message:", (e as Error).message);
          }
        })()
      );
    }

    // ── 4.5 Disclaimer check ──
    const { data: disclaimerUser } = await supabase
      .from("users")
      .select("disclaimer_last_shown_at")
      .eq("id", userId)
      .single();

    let disclaimerNeeded = false;
    if (!disclaimerUser?.disclaimer_last_shown_at) {
      disclaimerNeeded = true;
    } else {
      const daysSince = (Date.now() - new Date(disclaimerUser.disclaimer_last_shown_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= DISCLAIMER_INTERVAL_DAYS) {
        disclaimerNeeded = true;
      }
    }

    // ── 5. Assemble prompt (11-layer architecture) ──
    const promptStart = debugMode ? performance.now() : 0;
    const { system, conversationHistory, metadata, debugTrace } = await assemblePrompt(userId, message, debugMode);
    const promptMs = debugMode ? performance.now() - promptStart : 0;

    const claudeMessages = [
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    // ── 6. Stream Claude response to client ──
    const claudeStart = debugMode ? performance.now() : 0;
    const anthropicResponse = await callClaudeStreaming({
      system,
      messages: claudeMessages,
      tools: [SEARCH_FACTS_TOOL],
      maxTokens: 1024,
    });

    if (!anthropicResponse.body) {
      throw new Error("Anthropic returned no response body");
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const streamUserId = userId;
    const streamProcessing = (async () => {
      let fullContent = "";
      let model = "";
      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason = "";
      const toolCallsDebug: Array<{ name: string; query: string; result_confidence: string; cached: boolean; duration_ms: number }> = [];

      try {
        await writer.write(
          encoder.encode(sseEvent("conversation", { conversation_id: conversationId }))
        );

        if (disclaimerNeeded) {
          await writer.write(
            encoder.encode(sseEvent("disclaimer", { text: COACHING_DISCLAIMER }))
          );
          EdgeRuntime.waitUntil(
            supabase.from("users").update({ disclaimer_last_shown_at: new Date().toISOString() }).eq("id", streamUserId)
          );
        }

        // Stream processing with tool_use support
        let currentResponse = anthropicResponse;
        let toolUseMessages = [...claudeMessages];
        let toolCallCount = 0;
        const MAX_TOOL_CALLS = 3;

        while (toolCallCount <= MAX_TOOL_CALLS) {
          const reader = currentResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let pendingToolUse: { id: string; name: string; input: string } | null = null;
          let toolInputBuffer = "";
          let currentBlockType = "";
          let currentToolId = "";
          let currentToolName = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const event = JSON.parse(data);

                switch (event.type) {
                  case "message_start":
                    model = event.message?.model ?? "";
                    inputTokens += event.message?.usage?.input_tokens ?? 0;
                    break;

                  case "content_block_start":
                    if (event.content_block?.type === "tool_use") {
                      currentBlockType = "tool_use";
                      currentToolId = event.content_block.id ?? "";
                      currentToolName = event.content_block.name ?? "";
                      toolInputBuffer = "";
                    } else {
                      currentBlockType = "text";
                    }
                    break;

                  case "content_block_delta":
                    if (event.delta?.type === "text_delta" && event.delta.text) {
                      fullContent += event.delta.text;
                      await writer.write(
                        encoder.encode(sseEvent("delta", { text: event.delta.text }))
                      );
                    } else if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
                      toolInputBuffer += event.delta.partial_json;
                    }
                    break;

                  case "content_block_stop":
                    if (currentBlockType === "tool_use" && currentToolId) {
                      pendingToolUse = {
                        id: currentToolId,
                        name: currentToolName,
                        input: toolInputBuffer,
                      };
                    }
                    currentBlockType = "";
                    break;

                  case "message_delta":
                    stopReason = event.delta?.stop_reason ?? "";
                    outputTokens += event.usage?.output_tokens ?? 0;
                    break;
                }
              } catch {
                // Skip unparseable events
              }
            }
          }

          // Handle tool calls
          if (stopReason === "tool_use" && pendingToolUse) {
            toolCallCount++;
            console.log(`[coach] Tool call #${toolCallCount}: ${pendingToolUse.name}`);

            let toolResult = "";
            try {
              const toolCallStart = debugMode ? performance.now() : 0;
              const toolInput = JSON.parse(pendingToolUse.input || "{}");
              if (pendingToolUse.name === "search_facts") {
                const result = await handleSearchFacts(toolInput.query ?? "");
                toolResult = JSON.stringify(result);
                if (debugMode) {
                  toolCallsDebug.push({
                    name: pendingToolUse.name,
                    query: toolInput.query ?? "",
                    result_confidence: result.confidence ?? "unknown",
                    cached: result.cached ?? false,
                    duration_ms: Math.round(performance.now() - toolCallStart),
                  });
                }
              } else {
                toolResult = JSON.stringify({ error: `Unknown tool: ${pendingToolUse.name}` });
              }
            } catch (e) {
              toolResult = JSON.stringify({ error: `Tool error: ${(e as Error).message}` });
            }

            toolUseMessages = [
              ...toolUseMessages,
              {
                role: "assistant" as const,
                content: [
                  { type: "tool_use", id: pendingToolUse.id, name: pendingToolUse.name, input: JSON.parse(pendingToolUse.input || "{}") },
                ] as unknown as string,
              },
              {
                role: "user" as const,
                content: [
                  { type: "tool_result", tool_use_id: pendingToolUse.id, content: toolResult },
                ] as unknown as string,
              },
            ];

            currentResponse = await callClaudeStreaming({
              system,
              messages: toolUseMessages,
              tools: [SEARCH_FACTS_TOOL],
              maxTokens: 1024,
            });

            stopReason = "";
            pendingToolUse = null;
            continue;
          }

          break;
        }

        // ── 7. Stream complete — store, log, post-process ──
        const claudeMs = debugMode ? performance.now() - claudeStart : 0;
        const isFallback = model.startsWith("gpt-");
        const usage = { input_tokens: inputTokens, output_tokens: outputTokens };
        const costUsd = calculateCost(usage, isFallback);

        const coachMetadata: Record<string, unknown> = {
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

        // Store debug trace in message metadata (only for admin debug mode)
        if (debugMode && debugTrace) {
          const totalMs = Math.round(performance.now() - pipelineStart);
          const pipelineTimeline: PipelineTimeline = {
            crisis_detection_ms: Math.round(crisisMs),
            crisis_result: {
              passed: !crisis.isCrisis,
              severity: (crisis as { severity?: string }).severity as "high" | "moderate" | "none" ?? "none",
              keywords_matched: [],
            },
            conversation_resolution_ms: Math.round(convMs),
            conversation_id: conversationId,
            is_new_conversation: !body.conversation_id,
            prompt_assembly_ms: Math.round(promptMs),
            claude_streaming_ms: Math.round(claudeMs),
            model_used: model,
            is_fallback: isFallback,
            tokens_in: inputTokens,
            tokens_out: outputTokens,
            cost_usd: costUsd,
            tool_calls: toolCallsDebug,
            total_ms: totalMs,
          };

          // Fetch current coach profile for the debug summary
          const { data: currentProfile } = await supabase
            .from("coach_profiles")
            .select("directness, framing, warmth, autonomy, pacing, evidence_style, accountability, challenge_level, trust_level, confidence, source")
            .eq("user_id", streamUserId)
            .single();

          const debugSummary: DebugSummary = {
            prompt_trace: debugTrace,
            pipeline: pipelineTimeline,
            post_process: null, // Populated later by post-processor (async)
            coach_profile: currentProfile ?? null,
          };

          coachMetadata.debug_trace = debugSummary;
        }

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

        await supabase.from("cost_tracking").insert({
          user_id: streamUserId,
          purpose: FUNCTION_NAME,
          model,
          tokens_in: inputTokens,
          tokens_out: outputTokens,
          cost_usd: costUsd,
        });

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

        // Send debug summary as separate SSE event (admin only)
        if (debugMode && coachMetadata.debug_trace) {
          await writer.write(
            encoder.encode(sseEvent("debug_summary", coachMetadata.debug_trace))
          );
        }

        // Trigger async post-processing (shared module)
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
          // Writer may be closed
        }
      } finally {
        try {
          await writer.close();
        } catch {
          // Already closed
        }
      }
    })();

    EdgeRuntime.waitUntil(streamProcessing);

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

// ─── FREE TIER LIMIT CHECK (S5.9) ──────────────────────────────────────

const FREE_TIER_DAILY_LIMIT = 5;

async function checkMessageLimit(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  headers: Record<string, string>
): Promise<{ limitReached: boolean; upgradeResponse?: Response }> {
  const { data: user } = await supabase
    .from("users")
    .select("subscription_tier, daily_message_count, daily_message_reset_at")
    .eq("id", userId)
    .single();

  if (!user || user.subscription_tier !== "free") {
    return { limitReached: false };
  }

  // Reset counter if new day
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
    // Return an SSE upgrade prompt
    const remaining = 0;
    const upgradeMessage = `You've used all ${FREE_TIER_DAILY_LIMIT} free messages for today. 🔒\n\nUpgrade to **Core** ($99/month) for unlimited coaching:\n- Unlimited conversations across all channels\n- Morning briefings & accountability check-ins\n- Weekly coaching sessions\n- Real-time factual grounding\n\nVisit your **Settings** page to upgrade, or come back tomorrow for ${FREE_TIER_DAILY_LIMIT} more free messages.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(sseEvent("token", { text: upgradeMessage }))
        );
        controller.enqueue(
          encoder.encode(
            sseEvent("done", {
              limit_reached: true,
              remaining_today: remaining,
              upgrade_url: "/coachapp/dashboard/settings",
            })
          )
        );
        controller.close();
      },
    });

    return {
      limitReached: true,
      upgradeResponse: new Response(stream, {
        headers: {
          ...headers,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }),
    };
  }

  // Increment counter (fire-and-forget)
  supabase
    .from("users")
    .update({ daily_message_count: currentCount + 1 })
    .eq("id", userId)
    .then(() => {});

  return { limitReached: false };
}

