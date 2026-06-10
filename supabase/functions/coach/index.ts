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
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse } from "../_shared/errors.ts";
import { callClaudeStreaming, calculateCost } from "../_shared/anthropic.ts";
import { assemblePrompt } from "../_shared/prompt-assembler.ts";
import { generateEmbedding, logEmbeddingCost } from "../_shared/embeddings.ts";
import { SEARCH_FACTS_TOOL, handleSearchFacts } from "../_shared/search-facts.ts";
import { LOOKUP_ASSESSMENT_TOOL, handleLookupAssessment } from "../_shared/lookup-assessment.ts";
import { LOOKUP_RELATIONSHIP_TOOL, handleLookupRelationship } from "../_shared/lookup-relationship.ts";
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

  // Compute CORS headers from the actual request origin (supports localhost + production)
  const corsHeaders = getCorsHeaders(req);

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
    // Sprint 0.4: Deep link context from report CTAs
    const context = body.context as { type?: string; section?: string; topic?: string; inviteId?: string } | undefined;

    if (!message) {
      return errorResponse("BAD_REQUEST", "Message is required", 400, corsHeaders);
    }

    if (message.length > 5000) {
      return errorResponse("BAD_REQUEST", "Message too long (max 5000 chars)", 400, corsHeaders);
    }

    // ── 2.3 Debug mode — admin-only, verified server-side ──
    const supabase = createSupabaseClient();
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
    // Sprint 0.4: Deep link messages from report CTAs get bonus allowance
    const { limitReached, upgradeResponse } = await checkMessageLimit(supabase, userId, corsHeaders, context);
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
        metadata: context?.type ? { context_type: context.type, section: context.section, invite_id: context.inviteId } : {},
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

    // Sprint 0.4: Inject deep link context instruction
    // When a user arrives from a report CTA, the coach should focus on
    // that specific assessment finding rather than a generic response.
    let contextualSystem = system;
    if (context?.type === 'report_deep_link' && context.section) {
      const contextInstruction = `\n\nCONTEXT INSTRUCTION: The user just came from their Decoded assessment report, specifically the "${context.section}" section${context.topic ? ` about "${context.topic}"` : ''}. They want to discuss this specific finding. Lead with what you know about this area from their assessment data (Layer 4.5). Be specific and personal — reference their actual scores and patterns. Do NOT start with generic questions; demonstrate that you already know them.`;
      contextualSystem = system + contextInstruction;
    }

    // Sprint 0.5: Inject compatibility context when user arrives from a compatibility report
    // Loads the invite's compatibility report + the other person's assessment data
    if (context?.type === 'compatibility' && context.inviteId) {
      try {
        const { data: invite } = await supabase
          .from('decoded_invites')
          .select('inviter_id, recipient_id, inviter_name, recipient_email, compatibility_report_inviter, compatibility_report_recipient, inviter_report_id, recipient_report_id, share_with_human')
          .eq('id', context.inviteId)
          .single();

        if (invite && (invite.inviter_id === userId || invite.recipient_id === userId)) {
          const isInviter = invite.inviter_id === userId;
          const otherName = isInviter
            ? (invite.recipient_email?.split('@')[0] || 'the other person')
            : (invite.inviter_name || 'the other person');

          // Load the user's per-user compatibility report
          const userCompatReport = isInviter
            ? invite.compatibility_report_inviter
            : invite.compatibility_report_recipient;

          // Load the other person's assessment report (if full sharing is enabled)
          let otherReportSummary = '';
          if (invite.share_with_human === 'full') {
            const otherReportId = isInviter ? invite.recipient_report_id : invite.inviter_report_id;
            if (otherReportId) {
              const { data: otherReport } = await supabase
                .from('assessment_reports')
                .select('sections, archetype_base, archetype_sublabel')
                .eq('id', otherReportId)
                .single();
              if (otherReport) {
                otherReportSummary = `\n\n${otherName.toUpperCase()}'S DECODED PROFILE:\nArchetype: ${otherReport.archetype_base ?? 'Unknown'}${otherReport.archetype_sublabel ? ` — ${otherReport.archetype_sublabel}` : ''}\nProfile Summary: ${JSON.stringify(otherReport.sections?.S1?.content_markdown ?? otherReport.sections?.S1 ?? 'No data')}`;
              }
            }
          }

          const compatData = userCompatReport
            ? `\n\nCOMPATIBILITY REPORT DATA (${otherName}):\n${JSON.stringify(userCompatReport, null, 2)}`
            : '';

          const compatInstruction = `\n\nCONTEXT INSTRUCTION: The user just came from their compatibility report with ${otherName}. They want to discuss their relationship dynamics. You have their compatibility analysis below — use it to give specific, personal relationship coaching. Reference actual compatibility dimensions, friction points, and advice from the report. Do NOT start with generic questions; demonstrate that you already know about this relationship.${compatData}${otherReportSummary}`;
          contextualSystem = contextualSystem + compatInstruction;
        }
      } catch (e) {
        console.error('[coach] Failed to load compatibility context:', (e as Error).message);
        // Fall through without context — don't block the conversation
      }
    }

    const claudeMessages = [
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    // ── 6. Stream Claude response to client ──
    const claudeStart = debugMode ? performance.now() : 0;
    const anthropicResponse = await callClaudeStreaming({
      system: contextualSystem,
      messages: claudeMessages,
      tools: [SEARCH_FACTS_TOOL, LOOKUP_ASSESSMENT_TOOL, LOOKUP_RELATIONSHIP_TOOL],
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

                  // GPT-4o primary: final usage correction (input tokens arrive last)
                  case "_usage":
                    if (event.input_tokens) inputTokens = event.input_tokens as number;
                    if (event.output_tokens) outputTokens = event.output_tokens as number;
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
              } else if (pendingToolUse.name === "lookup_assessment") {
                const result = await handleLookupAssessment(streamUserId, toolInput);
                toolResult = JSON.stringify(result);
                if (debugMode) {
                  toolCallsDebug.push({
                    name: pendingToolUse.name,
                    query: `${toolInput.category}${toolInput.instrument_id ? `:${toolInput.instrument_id}` : ''}${toolInput.section_key ? `:${toolInput.section_key}` : ''}`,
                    result_confidence: result.found ? "high" : "low",
                    cached: false,
                    duration_ms: Math.round(performance.now() - toolCallStart),
                  });
                }
              } else if (pendingToolUse.name === "lookup_relationship") {
                const result = await handleLookupRelationship(streamUserId, toolInput);
                toolResult = JSON.stringify(result);
                if (debugMode) {
                  toolCallsDebug.push({
                    name: pendingToolUse.name,
                    query: toolInput.person_name ?? "",
                    result_confidence: result.found ? "high" : "low",
                    cached: false,
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

            // Send keepalive comment to prevent client-side connection timeout
            // SSE spec: lines starting with ":" are comments, ignored by EventSource
            await writer.write(
              encoder.encode(": keepalive\n\n")
            );

            currentResponse = await callClaudeStreaming({
              system: contextualSystem,
              messages: toolUseMessages,
              tools: [SEARCH_FACTS_TOOL, LOOKUP_ASSESSMENT_TOOL, LOOKUP_RELATIONSHIP_TOOL],
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
  headers: Record<string, string>,
  context?: { type?: string; section?: string; topic?: string; inviteId?: string },
): Promise<{ limitReached: boolean; upgradeResponse?: Response }> {
  const { data: user } = await supabase
    .from("users")
    .select("subscription_tier, daily_message_count, daily_message_reset_at, is_admin")
    .eq("id", userId)
    .single();

  // Admin users bypass all message limits
  if (!user || user.is_admin === true || user.subscription_tier !== "free") {
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

  // Sprint 0.4: Deep link messages from the report are bonus (don't count against limit)
  // First 3 context-linked messages per day are free.
  const isDeepLinkMessage = context?.type === 'report_deep_link';
  if (isDeepLinkMessage) {
    const BONUS_LIMIT = 3;
    // Check how many deep-link messages were sent today
    const todayStart = `${today}T00:00:00.000Z`;
    const { count: deepLinkCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart)
      .contains("metadata", { context_type: "report_deep_link" });

    if ((deepLinkCount ?? 0) < BONUS_LIMIT) {
      console.log(`[coach] Deep link bonus message (${(deepLinkCount ?? 0) + 1}/${BONUS_LIMIT})`);
      // Don't increment the daily counter — this is a bonus message
      return { limitReached: false };
    }
    // If bonus limit exceeded, fall through to normal limit check
  }

  if (currentCount >= FREE_TIER_DAILY_LIMIT) {
    // Calculate tomorrow's reset time (same time tomorrow in user's local perception)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    // Format as a human-readable time (UTC midnight = their daily reset)
    const resetHours = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));

    const upgradeMessage = `You've reached your daily coaching limit (${FREE_TIER_DAILY_LIMIT} messages per day). Your limit resets in about ${resetHours} hour${resetHours !== 1 ? 's' : ''}.\n\nIf you'd like unlimited coaching conversations, you can upgrade anytime from your [Settings](/dashboard/settings) page.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(sseEvent("delta", { text: upgradeMessage }))
        );
        controller.enqueue(
          encoder.encode(
            sseEvent("done", {
              message_id: null,
              model: "system",
              tokens: { input_tokens: 0, output_tokens: 0 },
              cost_usd: 0,
              active_challenges: [],
              limit_reached: true,
              remaining_today: 0,
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

