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
import { generateEmbedding, generateEmbeddings, logEmbeddingCost } from "../_shared/embeddings.ts";

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

// ─── FRAMEWORK ASSIGNMENT (S2.3) ────────────────────────────────────────

/**
 * Category-to-framework mapping for initial assignment.
 * Maps challenge categories to the most appropriate framework.
 */
const CATEGORY_FRAMEWORK_MAP: Record<string, string> = {
  business_growth: "GROW",
  leadership: "Situational Leadership",
  productivity: "Robbins RPM",
  career: "GROW",
  personal_development: "OSKAR",
  relationships: "Motivational Interviewing",
  health: "GROW",
  financial: "EOS/Traction",
};

/**
 * Assigns a coaching framework to a new challenge based on:
 * 1. User's trust level (determines which tiers are available)
 * 2. Challenge category → default framework mapping
 * 3. User's framework affinity (preferred frameworks from past usage)
 */
async function assignFramework(
  supabase: ReturnType<typeof createSupabaseClient>,
  challengeCategory: string,
  trustLevel: number,
  frameworkAffinity: unknown
): Promise<{ name: string; firstPhase: string }> {
  // Determine max tier based on trust level
  const maxTier = trustLevel <= 2 ? 1 : trustLevel <= 3 ? 2 : 3;

  // Get the suggested framework for this category
  const suggestedName = CATEGORY_FRAMEWORK_MAP[challengeCategory] || "GROW";

  // Load the suggested framework from DB to check tier eligibility
  const { data: suggested } = await supabase
    .from("framework_config")
    .select("name, tier, phases, is_active")
    .eq("name", suggestedName)
    .eq("is_active", true)
    .single();

  // If suggested framework is eligible, use it
  if (suggested && suggested.tier <= maxTier) {
    return {
      name: suggested.name,
      firstPhase: suggested.phases?.[0] ?? "Start",
    };
  }

  // Check if user has a preferred framework from past usage (framework affinity)
  if (frameworkAffinity && typeof frameworkAffinity === "object") {
    const affinityMap = frameworkAffinity as Record<string, number>;
    const sortedAffinity = Object.entries(affinityMap)
      .sort(([, a], [, b]) => b - a);

    for (const [name] of sortedAffinity) {
      const { data: fw } = await supabase
        .from("framework_config")
        .select("name, tier, phases, is_active")
        .eq("name", name)
        .eq("is_active", true)
        .single();

      if (fw && fw.tier <= maxTier) {
        return { name: fw.name, firstPhase: fw.phases?.[0] ?? "Start" };
      }
    }
  }

  // Safe default: GROW (Tier 1, always available)
  const { data: grow } = await supabase
    .from("framework_config")
    .select("name, phases")
    .eq("name", "GROW")
    .single();

  return {
    name: "GROW",
    firstPhase: grow?.phases?.[0] ?? "Goal",
  };
}

// ─── CRISIS DETECTION (S3.7) ────────────────────────────────────────────

/**
 * Crisis keyword patterns — runs BEFORE sending to LLM.
 * Two tiers: high-severity (immediate danger) and moderate (concerning).
 */
const CRISIS_PATTERNS = {
  high: [
    /\bsuicid(e|al)\b/i,
    /\bkill\s+(my|him|her|them)?self\b/i,
    /\bwant\s+to\s+die\b/i,
    /\bend\s+(my|it\s+all|this)\s*(life)?\b/i,
    /\bhurt\s+my\s?self\b/i,
    /\bself[- ]harm/i,
    /\bno\s+reason\s+to\s+live\b/i,
    /\bplan\s+to\s+(kill|end|hurt)/i,
  ],
  moderate: [
    /\bdon'?t\s+want\s+to\s+(be\s+here|exist|go\s+on|continue)\b/i,
    /\bwish\s+I\s+(was|were)\s+dead\b/i,
    /\bgive\s+up\s+on\s+(life|everything)\b/i,
    /\bnothing\s+(matters|left|to\s+live\s+for)\b/i,
    /\bharm\s+(myself|others|someone)\b/i,
    /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  ],
};

interface CrisisResult {
  isCrisis: boolean;
  severity: "high" | "moderate" | "none";
  matchedKeywords: string[];
}

function detectCrisis(message: string): CrisisResult {
  const matchedKeywords: string[] = [];

  // Check high-severity patterns first
  for (const pattern of CRISIS_PATTERNS.high) {
    const match = message.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
    }
  }

  if (matchedKeywords.length > 0) {
    return { isCrisis: true, severity: "high", matchedKeywords };
  }

  // Check moderate patterns
  for (const pattern of CRISIS_PATTERNS.moderate) {
    const match = message.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
    }
  }

  if (matchedKeywords.length > 0) {
    return { isCrisis: true, severity: "moderate", matchedKeywords };
  }

  return { isCrisis: false, severity: "none", matchedKeywords: [] };
}

function buildCrisisResponse(severity: "high" | "moderate" | "none"): string {
  if (severity === "high") {
    return `I hear you, and I'm really glad you shared this with me. What you're feeling matters, and you deserve support from someone who specializes in this.

**I'm an AI coach, and this is beyond what I can help with.** Please reach out to someone who can:

🆘 **988 Suicide & Crisis Lifeline** — Call or text **988** (available 24/7)
💬 **Crisis Text Line** — Text **HOME** to **741741**
🌍 **International Association for Suicide Prevention** — https://www.iasp.info/resources/Crisis_Centres/

You don't have to go through this alone. These are free, confidential services with trained professionals who genuinely want to help.

If you're in immediate danger, please call **911** or your local emergency number.

I'll be here whenever you're ready to come back and talk about other things. No pressure, no timeline. 💛`;
  }

  return `I want to pause and check in on you. Some of what you said sounds like you might be going through something really difficult.

**If you're in crisis or having thoughts of self-harm, please reach out to a trained professional:**

📞 **988 Suicide & Crisis Lifeline** — Call or text **988** (24/7)
💬 **Crisis Text Line** — Text **HOME** to **741741**

As an AI coaching tool, I'm not equipped to provide mental health support, but I care about your wellbeing. If you're just having a tough day and want to talk through a challenge, I'm absolutely here for that.

What would be most helpful right now?`;
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

    // ── 2.5 Crisis Detection (S3.7) — runs BEFORE LLM ──
    const crisisResult = detectCrisis(message);
    if (crisisResult.isCrisis) {
      // Return crisis response immediately — don't send to LLM
      const crisisResponse = buildCrisisResponse(crisisResult.severity);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseEvent("token", { text: crisisResponse })));
          controller.enqueue(encoder.encode(sseEvent("done", { crisis_detected: true })));
          controller.close();
        },
      });

      // Log crisis event to admin
      const crisisSupabase = createSupabaseClient();
      EdgeRuntime.waitUntil(
        crisisSupabase.from("error_log").insert({
          function_name: "crisis-detection",
          error_message: `Crisis keywords detected: ${crisisResult.matchedKeywords.join(", ")}`,
          user_id: userId,
        })
      );

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
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

    // Embed user message asynchronously (don't block response)
    if (userMsg?.id) {
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            const embedding = await generateEmbedding(message);
            await supabase
              .from("messages")
              .update({ embedding: JSON.stringify(embedding) })
              .eq("id", userMsg.id);
            await logEmbeddingCost(userId, "embed-user-message", [message]);
          } catch (e) {
            console.error("[coach] Failed to embed user message:", (e as Error).message);
          }
        })()
      );
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
    { "category": "business|personal|preference|goal|challenge|win|pattern|org_sop", "subject": "brief label", "content": "the fact", "importance": 0.1-1.0 }
  ],
  "commitments": [
    { "type": "goal|action_item|habit", "description": "what the user committed to", "due_date": "YYYY-MM-DD or null" }
  ],
  "challenge_detected": {
    "is_new": true/false,
    "title": "brief label for the challenge or goal (e.g., 'Getting first customers', 'Hiring CTO')",
    "description": "one-sentence description of what the user is working on",
    "category": "business_growth|leadership|productivity|career|personal_development|relationships|health|financial"
  },
  "sentiment": "positive|neutral|negative|mixed",
  "topics": ["topic1", "topic2"]
}

Rules:
- Only extract facts the USER stated about themselves, their business, or their situation.
- Only extract commitments the USER explicitly agreed to or stated they would do.
- Don't extract coaching questions or the coach's observations as facts.
- Importance: 0.1-0.3 = minor detail, 0.4-0.6 = useful context, 0.7-0.9 = core to coaching, 1.0 = critical.
- challenge_detected.is_new: set to true ONLY if the user described a new challenge, problem, or goal that isn't just a follow-up to an existing conversation thread. Look for phrases like "I need to", "I'm struggling with", "My goal is", "The problem is".
- If no new challenge is detected, set is_new to false and leave other fields null.
- If nothing to extract, return empty arrays and is_new: false.

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

    // Store facts + generate embeddings
    if (extracted.facts?.length > 0) {
      const factTexts = extracted.facts.map(
        (f: { subject: string; content: string }) => `${f.subject}: ${f.content}`
      );

      // Generate embeddings for all facts in one batch call
      let factEmbeddings: number[][] = [];
      try {
        factEmbeddings = await generateEmbeddings(factTexts);
        await logEmbeddingCost(userId, "embed-facts", factTexts);
      } catch (e) {
        console.warn("[post-process] Failed to embed facts:", (e as Error).message);
      }

      const factsToInsert = extracted.facts.map(
        (f: { category: string; subject: string; content: string; importance: number }, i: number) => ({
          user_id: userId,
          category: f.category,
          subject: f.subject,
          content: f.content,
          importance: f.importance,
          source_message_id: coachMessageId,
          is_confirmed: false,
          embedding: factEmbeddings[i] ? JSON.stringify(factEmbeddings[i]) : null,
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

    // ── Challenge Detection + Framework Assignment (S2.3) ──
    if (extracted.challenge_detected?.is_new && extracted.challenge_detected?.title) {
      const challenge = extracted.challenge_detected;

      // Load user's coaching profile for framework assignment
      const { data: coachProfile } = await supabase
        .from("coach_profiles")
        .select("trust_level, framework_affinity")
        .eq("user_id", userId)
        .single();

      const trustLevel = coachProfile?.trust_level ?? 1;

      // Framework assignment logic:
      // - Trust 1-2 (orientation): GROW only (safest, most structured)
      // - Trust 3 (working): Tier 1 frameworks
      // - Trust 4+ (depth): Tier 1-2 frameworks
      const framework = await assignFramework(
        supabase,
        challenge.category,
        trustLevel,
        coachProfile?.framework_affinity
      );

      // Check if a similar challenge already exists (avoid duplicates)
      const { data: existingChallenges } = await supabase
        .from("coaching_challenges")
        .select("id, title")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(10);

      const isDuplicate = (existingChallenges ?? []).some(
        (c: { title: string }) =>
          c.title.toLowerCase().includes(challenge.title.toLowerCase().slice(0, 20)) ||
          challenge.title.toLowerCase().includes(c.title.toLowerCase().slice(0, 20))
      );

      if (!isDuplicate) {
        const { data: newChallenge } = await supabase
          .from("coaching_challenges")
          .insert({
            user_id: userId,
            title: challenge.title,
            description: challenge.description || null,
            framework: framework.name,
            framework_phase: framework.firstPhase,
            status: "active",
          })
          .select("id")
          .single();

        // Log framework usage
        if (newChallenge) {
          await supabase.from("framework_usage").insert({
            user_id: userId,
            framework: framework.name,
            message_id: coachMessageId,
            engagement_signal: null,
            action_taken: false,
          });
        }

        console.log(
          `[post-process] New challenge: "${challenge.title}" → ${framework.name} (${framework.firstPhase}) for user ${userId}`
        );
      }
    }

    console.log(
      `[post-process] Extracted ${extracted.facts?.length ?? 0} facts, ${extracted.commitments?.length ?? 0} commitments for user ${userId}`
    );
  } catch (error) {
    // Post-processing failure should never block the user
    console.error("[post-process] Error:", (error as Error).message);
    await logError("post-processor", error as Error, userId);
  }
}
