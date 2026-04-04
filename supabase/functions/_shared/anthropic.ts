/**
 * Anthropic Claude API client for Edge Functions.
 * Primary LLM for real-time coaching (Claude Sonnet).
 * Why direct API: no agent frameworks per ARCHITECTURE.md §1.2 — full control over prompt assembly.
 *
 * Supports both batch and streaming modes:
 * - callClaude() — batch, returns full response (used for post-processing)
 * - callClaudeStreaming() — SSE stream, returns ReadableStream (used for real-time chat)
 *
 * S6.13: LLM Fallback — if Claude unavailable, falls back to GPT-4o with quality logging.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

// Fallback: GPT-4o via OpenAI
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const FALLBACK_MODEL = "gpt-4o";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicResponse {
  id: string;
  content: Array<{
    type: "text" | "tool_use";
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  _fallback?: boolean; // S6.13: true if this response came from GPT-4o fallback
}

/**
 * Sends a coaching prompt to Claude and returns the full response (batch mode).
 * Use for: post-processing, tool calls, non-real-time use cases.
 *
 * S6.13: If Claude fails (timeout, 5xx, overloaded), falls back to GPT-4o.
 */
export async function callClaude(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  try {
    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
      system: opts.system,
      messages: opts.messages,
    };

    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const status = response.status;

      // Only fallback on server errors / overload, not auth or bad request
      if (status >= 500 || status === 429) {
        console.warn(
          `[anthropic] Claude error (${status}), falling back to GPT-4o: ${errorBody.slice(0, 200)}`
        );
        return await callGPT4oFallback(opts);
      }

      throw new Error(`Anthropic API error (${status}): ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    const err = error as Error;

    // Fallback on network/timeout errors
    if (
      err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      err.message.includes("fetch failed") ||
      err.message.includes("network")
    ) {
      console.warn(
        `[anthropic] Claude unreachable (${err.name}), falling back to GPT-4o`
      );
      return await callGPT4oFallback(opts);
    }

    throw error;
  }
}

/**
 * Streams a coaching response from Claude via SSE.
 * Returns the raw Response from Anthropic with streaming body.
 * Use for: real-time chat where tokens should appear as they're generated.
 *
 * S6.13: If Claude fails, falls back to GPT-4o streaming.
 */
export async function callClaudeStreaming(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  try {
    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
      system: opts.system,
      messages: opts.messages,
      stream: true,
    };

    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const status = response.status;

      if (status >= 500 || status === 429) {
        console.warn(
          `[anthropic] Claude streaming error (${status}), falling back to GPT-4o`
        );
        return await callGPT4oStreamingFallback(opts);
      }

      throw new Error(`Anthropic API error (${status}): ${errorBody}`);
    }

    return response;
  } catch (error) {
    const err = error as Error;

    if (
      err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      err.message.includes("fetch failed") ||
      err.message.includes("network")
    ) {
      console.warn(
        `[anthropic] Claude streaming unreachable (${err.name}), falling back to GPT-4o`
      );
      return await callGPT4oStreamingFallback(opts);
    }

    throw error;
  }
}

/**
 * Extracts text content from an Anthropic response.
 * Handles multi-block responses (text + tool_use).
 */
export function extractText(response: AnthropicResponse): string {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
}

/**
 * Calculates approximate cost for a Claude call.
 * Claude Sonnet: $3/MTok input, $15/MTok output
 * GPT-4o: $2.50/MTok input, $10/MTok output
 */
export function calculateCost(
  usage: AnthropicResponse["usage"],
  isFallback = false
): number {
  if (isFallback) {
    const inputCost = (usage.input_tokens / 1_000_000) * 2.5;
    const outputCost = (usage.output_tokens / 1_000_000) * 10;
    return inputCost + outputCost;
  }
  const inputCost = (usage.input_tokens / 1_000_000) * 3;
  const outputCost = (usage.output_tokens / 1_000_000) * 15;
  return inputCost + outputCost;
}

// ─── GPT-4o FALLBACK (S6.13) ───────────────────────────────────────────

/**
 * Batch fallback: translates Anthropic-format call to OpenAI format,
 * then wraps the response back into AnthropicResponse shape.
 */
async function callGPT4oFallback(opts: {
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<AnthropicResponse> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not set (fallback failed)");

  // Translate Anthropic messages → OpenAI messages
  const openaiMessages = [
    { role: "system" as const, content: opts.system },
    ...opts.messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages: openaiMessages,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GPT-4o fallback also failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  const choice = data.choices[0];

  console.warn(
    `[anthropic] GPT-4o fallback succeeded. Tokens: ${data.usage?.prompt_tokens ?? 0}in / ${data.usage?.completion_tokens ?? 0}out`
  );

  // Wrap into AnthropicResponse shape so callers don't need to change
  return {
    id: data.id || "fallback-" + crypto.randomUUID(),
    content: [
      {
        type: "text",
        text: choice.message.content,
      },
    ],
    model: FALLBACK_MODEL,
    stop_reason: choice.finish_reason === "stop" ? "end_turn" : choice.finish_reason,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
    _fallback: true,
  };
}

/**
 * Streaming fallback: translates to OpenAI streaming and returns the raw response.
 * The caller (coach/index.ts) parses SSE — we need to reformat OpenAI SSE into
 * Anthropic SSE format, OR return a non-streaming response wrapped as a single event.
 *
 * For simplicity: we do a non-streaming GPT-4o call and return it as a
 * single-chunk SSE stream that the parser can handle.
 */
async function callGPT4oStreamingFallback(opts: {
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<Response> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not set (fallback failed)");

  const openaiMessages = [
    { role: "system" as const, content: opts.system },
    ...opts.messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages: openaiMessages,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
      stream: false, // Non-streaming — we'll fake the SSE events
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GPT-4o streaming fallback also failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  console.warn(
    `[anthropic] GPT-4o streaming fallback succeeded. Tokens: ${inputTokens}in / ${outputTokens}out`
  );

  // Create Anthropic-compatible SSE events so the coach streaming parser
  // can consume them without changes
  const events = [
    `event: message_start\ndata: ${JSON.stringify({
      type: "message_start",
      message: {
        id: "fallback-" + crypto.randomUUID(),
        type: "message",
        role: "assistant",
        content: [],
        model: FALLBACK_MODEL,
        usage: { input_tokens: inputTokens, output_tokens: 0 },
      },
    })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: text },
    })}\n\n`,
    `event: content_block_stop\ndata: ${JSON.stringify({
      type: "content_block_stop",
      index: 0,
    })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: outputTokens },
    })}\n\n`,
    `event: message_stop\ndata: ${JSON.stringify({
      type: "message_stop",
    })}\n\n`,
  ];

  const body = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(event));
      }
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
