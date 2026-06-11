/**
 * LLM client for Edge Functions.
 * Primary: GPT-4o-mini ($0.15/$0.60 per MTok — 20x cheaper than Sonnet).
 * Fallback: Claude Sonnet (reliability / complex tool calls).
 *
 * Public API is unchanged so all callers (coach, channel-router, crons, etc.)
 * keep working without modification:
 *   callClaude()          — batch call, returns AnthropicResponse shape
 *   callClaudeStreaming() — streaming call, returns Anthropic-format SSE
 *   extractText()
 *   calculateCost()
 *
 * Internally, GPT-4o-mini is called first. On any error (network, quota, 5xx),
 * Claude Sonnet is used as the fallback. Tool definitions are translated
 * between Anthropic and OpenAI formats transparently.
 */

// ─── MODELS ──────────────────────────────────────────────────────────────

const GPT4O_MODEL = "gpt-4o-mini";
const CLAUDE_MODEL = "claude-sonnet-4-6";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const DEFAULT_MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30_000;

// ─── PUBLIC TYPES (unchanged — callers depend on these) ──────────────────

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
  usage: { input_tokens: number; output_tokens: number };
  _fallback?: boolean;
}

// ─── FORMAT TRANSLATORS ───────────────────────────────────────────────────

function toOpenAITools(tools: AnthropicTool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

function toOpenAIMessages(system: string, messages: AnthropicMessage[]) {
  return [
    { role: "system" as const, content: system },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ];
}

function openAIBatchToAnthropic(data: Record<string, unknown>): AnthropicResponse {
  const choice = (data.choices as Array<Record<string, unknown>>)[0];
  const msg = choice.message as Record<string, unknown>;
  const usage = data.usage as Record<string, number> | undefined;

  const content: AnthropicResponse["content"] = [];

  if (msg.content) {
    content.push({ type: "text", text: msg.content as string });
  }

  // Map OpenAI tool_calls → Anthropic tool_use blocks
  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls as Array<Record<string, unknown>>) {
      const fn = tc.function as Record<string, unknown>;
      let parsedInput: Record<string, unknown> = {};
      try { parsedInput = JSON.parse(fn.arguments as string); } catch { /* keep empty */ }
      content.push({
        type: "tool_use",
        id: tc.id as string,
        name: fn.name as string,
        input: parsedInput,
      });
    }
  }

  const finishReason = choice.finish_reason as string;
  const stopReason =
    finishReason === "tool_calls" ? "tool_use" :
    finishReason === "stop" ? "end_turn" :
    finishReason ?? "end_turn";

  return {
    id: data.id as string || "gpt4o-" + crypto.randomUUID(),
    content,
    model: GPT4O_MODEL,
    stop_reason: stopReason,
    usage: {
      input_tokens: usage?.prompt_tokens ?? 0,
      output_tokens: usage?.completion_tokens ?? 0,
    },
  };
}

// ─── BATCH: GPT-4o PRIMARY ────────────────────────────────────────────────

/**
 * Sends a prompt and returns a full response (batch mode).
 * GPT-4o first; falls back to Claude on any failure.
 */
export async function callClaude(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<AnthropicResponse> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.warn("[llm] OPENAI_API_KEY not set — using Claude directly");
    return await callClaudeDirectly(opts);
  }

  const body: Record<string, unknown> = {
    model: GPT4O_MODEL,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: toOpenAIMessages(opts.system, opts.messages),
  };
  if (opts.tools?.length) body.tools = toOpenAITools(opts.tools);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`[llm] GPT-4o batch error (${response.status}), falling back to Claude: ${err.slice(0, 200)}`);
      return await callClaudeDirectly(opts);
    }

    return openAIBatchToAnthropic(await response.json());
  } catch (error) {
    const err = error as Error;
    if (err.name === "TimeoutError" || err.name === "AbortError" || err.message.includes("fetch failed")) {
      console.warn(`[llm] GPT-4o unreachable (${err.name}), falling back to Claude`);
      return await callClaudeDirectly(opts);
    }
    throw error;
  }
}

// ─── STREAMING: GPT-4o PRIMARY ────────────────────────────────────────────

/**
 * Streams a response via GPT-4o and returns a Response with Anthropic-format SSE.
 * The SSE format matches Anthropic's exactly so coach/index.ts requires no changes.
 * Falls back to Claude streaming on GPT-4o failure.
 */
export async function callClaudeStreaming(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<Response> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.warn("[llm] OPENAI_API_KEY not set — using Claude streaming directly");
    return await callClaudeStreamingDirectly(opts);
  }

  const body: Record<string, unknown> = {
    model: GPT4O_MODEL,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: toOpenAIMessages(opts.system, opts.messages),
    stream: true,
    stream_options: { include_usage: true },
  };
  if (opts.tools?.length) {
    body.tools = toOpenAITools(opts.tools);
    body.tool_choice = "auto";
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`[llm] GPT-4o streaming error (${response.status}), falling back to Claude: ${err.slice(0, 200)}`);
      return await callClaudeStreamingDirectly(opts);
    }

    return transformOpenAIStreamToAnthropicSSE(response);
  } catch (error) {
    const err = error as Error;
    if (err.name === "TimeoutError" || err.name === "AbortError" || err.message.includes("fetch failed")) {
      console.warn(`[llm] GPT-4o streaming unreachable (${err.name}), falling back to Claude`);
      return await callClaudeStreamingDirectly(opts);
    }
    throw error;
  }
}

// ─── STREAM TRANSFORMER: OpenAI SSE → Anthropic SSE ─────────────────────
//
// OpenAI streaming uses delta.content for text and delta.tool_calls[] for
// tool calls. We translate on the fly to Anthropic's event schema so the
// coach/index.ts stream parser doesn't need to change.

function transformOpenAIStreamToAnthropicSSE(openAIResponse: Response): Response {
  const enc = new TextEncoder();

  function sse(event: string, data: unknown): Uint8Array {
    return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // Process asynchronously — response streams back to the client in parallel
  (async () => {
    try {
      // Emit message_start immediately so the client knows which model was used
      await writer.write(sse("message_start", {
        type: "message_start",
        message: {
          id: "gpt4o-" + crypto.randomUUID(),
          type: "message",
          role: "assistant",
          content: [],
          model: GPT4O_MODEL,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      }));

      const reader = openAIResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Track state across chunks
      let textBlockOpen = false;
      // tool_calls accumulate across chunks; keyed by index
      const toolCallsById: Map<number, { id: string; name: string; arguments: string }> = new Map();
      let openToolBlockIndex: number | null = null; // Anthropic block index for current tool
      let anthropicBlockIndex = 0;
      let outputTokens = 0;
      let inputTokens = 0;
      let stopReason = "end_turn";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          let chunk: Record<string, unknown>;
          try { chunk = JSON.parse(raw); } catch { continue; }

          // Usage comes in the final chunk when stream_options.include_usage = true
          const usage = chunk.usage as Record<string, number> | undefined;
          if (usage) {
            inputTokens = usage.prompt_tokens ?? 0;
            outputTokens = usage.completion_tokens ?? 0;
          }

          const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
          if (!choices?.length) continue;

          const choice = choices[0];
          const delta = choice.delta as Record<string, unknown> | undefined;
          const finishReason = choice.finish_reason as string | null;

          if (delta?.content) {
            const text = delta.content as string;

            if (!textBlockOpen) {
              await writer.write(sse("content_block_start", {
                type: "content_block_start",
                index: anthropicBlockIndex,
                content_block: { type: "text", text: "" },
              }));
              textBlockOpen = true;
            }

            await writer.write(sse("content_block_delta", {
              type: "content_block_delta",
              index: anthropicBlockIndex,
              delta: { type: "text_delta", text },
            }));
          }

          // Accumulate tool call deltas
          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta!.tool_calls as Array<Record<string, unknown>>) {
              const tcIndex = tc.index as number;
              const fn = tc.function as Record<string, unknown> | undefined;

              if (!toolCallsById.has(tcIndex)) {
                // First delta for this tool — close text block if open
                if (textBlockOpen) {
                  await writer.write(sse("content_block_stop", {
                    type: "content_block_stop", index: anthropicBlockIndex,
                  }));
                  textBlockOpen = false;
                  anthropicBlockIndex++;
                }

                const toolName = (fn?.name as string) ?? "";
                const toolId = (tc.id as string) ?? ("tool_" + tcIndex);
                toolCallsById.set(tcIndex, { id: toolId, name: toolName, arguments: "" });
                openToolBlockIndex = anthropicBlockIndex;

                await writer.write(sse("content_block_start", {
                  type: "content_block_start",
                  index: anthropicBlockIndex,
                  content_block: { type: "tool_use", id: toolId, name: toolName, input: {} },
                }));
              }

              if (fn?.arguments) {
                const tool = toolCallsById.get(tcIndex)!;
                tool.arguments += fn.arguments as string;

                await writer.write(sse("content_block_delta", {
                  type: "content_block_delta",
                  index: openToolBlockIndex ?? anthropicBlockIndex,
                  delta: { type: "input_json_delta", partial_json: fn.arguments as string },
                }));
              }
            }
          }

          if (finishReason) {
            stopReason = finishReason === "tool_calls" ? "tool_use" : "end_turn";
          }
        }
      }

      // Close whatever block is open
      if (textBlockOpen || openToolBlockIndex !== null) {
        await writer.write(sse("content_block_stop", {
          type: "content_block_stop", index: anthropicBlockIndex,
        }));
      }

      await writer.write(sse("message_delta", {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: outputTokens },
      }));

      await writer.write(sse("message_stop", { type: "message_stop" }));

      // Emit usage as a final hidden event (for cost tracking in coach/index.ts)
      await writer.write(sse("_usage", { input_tokens: inputTokens, output_tokens: outputTokens }));

    } catch (err) {
      console.error("[llm] Stream transform error:", (err as Error).message);
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ─── CLAUDE FALLBACK ──────────────────────────────────────────────────────

async function callClaudeDirectly(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is set");

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: opts.system,
    messages: opts.messages,
  };
  if (opts.tools?.length) body.tools = opts.tools;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude fallback also failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  data._fallback = true;
  return data as AnthropicResponse;
}

async function callClaudeStreamingDirectly(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is set");

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: opts.system,
    messages: opts.messages,
    stream: true,
  };
  if (opts.tools?.length) body.tools = opts.tools;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude streaming fallback also failed (${response.status}): ${err}`);
  }

  return response; // Already Anthropic SSE format — pass through directly
}

// ─── UTILITIES ────────────────────────────────────────────────────────────

/** Extracts concatenated text from an AnthropicResponse (handles multi-block). */
export function extractText(response: AnthropicResponse): string {
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

/**
 * Calculates approximate cost for a call.
 * GPT-4o-mini: $0.15/MTok input, $0.60/MTok output
 * Claude Sonnet (fallback): $3/MTok input, $15/MTok output
 */
export function calculateCost(
  usage: AnthropicResponse["usage"],
  isFallback = false
): number {
  if (isFallback) {
    // Claude Sonnet rates
    return (usage.input_tokens / 1_000_000) * 3 + (usage.output_tokens / 1_000_000) * 15;
  }
  // GPT-4o-mini rates
  return (usage.input_tokens / 1_000_000) * 0.15 + (usage.output_tokens / 1_000_000) * 0.60;
}
