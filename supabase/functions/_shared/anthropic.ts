/**
 * Anthropic Claude API client for Edge Functions.
 * Primary LLM for real-time coaching (Claude Sonnet).
 * Why direct API: no agent frameworks per ARCHITECTURE.md §1.2 — full control over prompt assembly.
 *
 * Supports both batch and streaming modes:
 * - callClaude() — batch, returns full response (used for post-processing)
 * - callClaudeStreaming() — SSE stream, returns ReadableStream (used for real-time chat)
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

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
}

/**
 * Sends a coaching prompt to Claude and returns the full response (batch mode).
 * Use for: post-processing, tool calls, non-real-time use cases.
 */
export async function callClaude(opts: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  maxTokens?: number;
}): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

/**
 * Streams a coaching response from Claude via SSE.
 * Returns the raw Response from Anthropic with streaming body.
 * Use for: real-time chat where tokens should appear as they're generated.
 */
export async function callClaudeStreaming(opts: {
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const body = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    system: opts.system,
    messages: opts.messages,
    stream: true,
  };

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  return response;
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
 */
export function calculateCost(usage: AnthropicResponse["usage"]): number {
  const inputCost = (usage.input_tokens / 1_000_000) * 3;
  const outputCost = (usage.output_tokens / 1_000_000) * 15;
  return inputCost + outputCost;
}
