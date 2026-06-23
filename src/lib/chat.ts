/**
 * Chat API service — Client-side wrapper for the coaching Edge Function.
 * Handles authentication, request formatting, and SSE streaming.
 */

import { createClient } from "@/lib/supabase/client";

// Debug trace types — manually synced from supabase/functions/_shared/debug-types.ts
// We re-define the top-level type here to avoid importing Deno-specific modules
export interface DebugSummary {
  prompt_trace: Record<string, unknown>;
  pipeline: Record<string, unknown>;
  post_process: Record<string, unknown> | null;
  coach_profile: Record<string, unknown> | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export interface ChatMessage {
  id: string;
  role: "user" | "coach" | "system";
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface StreamCallbacks {
  /** Called when the conversation_id is received (first event) */
  onConversationId: (conversationId: string) => void;
  /** Called for each text chunk as it arrives */
  onDelta: (text: string) => void;
  /** Called when streaming is complete with final metadata */
  onDone: (metadata: {
    message_id: string | null;
    model: string;
    tokens: { input_tokens: number; output_tokens: number };
    cost_usd: number;
    active_challenges: Array<{ title: string; framework: string; phase: string }>;
  }) => void;
  /** Called when the debug summary is received (admin debug mode only) */
  onDebugTrace?: (trace: DebugSummary) => void;
  /** Called on error */
  onError: (error: Error) => void;
}

/**
 * Sends a message to the coaching engine and streams the response via SSE.
 * Returns a cleanup function to abort the stream if needed.
 */
export async function sendMessageStream(
  message: string,
  conversationId: string | undefined,
  callbacks: StreamCallbacks,
  options?: { debug?: boolean; context?: { type: string; section?: string; topic?: string; inviteId?: string } }
): Promise<() => void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    callbacks.onError(new Error("Not authenticated"));
    return () => {};
  }

  const abortController = new AbortController();

  // Fire the request (don't await — we process the stream below)
  const fetchPromise = fetch(`${SUPABASE_URL}/functions/v1/coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({
      message,
      channel: "web",
      conversation_id: conversationId,
      ...(options?.debug ? { debug: true } : {}),
      ...(options?.context ? { context: options.context } : {}),
    }),
    signal: abortController.signal,
  });

  // Process the stream asynchronously
  (async () => {
    try {
      const response = await fetchPromise;

      // If the response is JSON (error), handle it
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        callbacks.onError(new Error(error.message || `HTTP ${response.status}`));
        return;
      }

      if (!response.ok) {
        callbacks.onError(new Error(`HTTP ${response.status}`));
        return;
      }

      if (!response.body) {
        callbacks.onError(new Error("No response body"));
        return;
      }

      // Read the SSE stream — with proper cleanup
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // currentEvent MUST persist across reads: an SSE `event:`/`data:` pair can
      // be split between two network chunks. Resetting it per-chunk dropped the
      // event type (notably a missed `done`), leaving the UI stuck in loading
      // (input disabled). doneCalled drives the safety net below.
      let currentEvent = "";
      let doneCalled = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                switch (currentEvent) {
                  case "conversation":
                    callbacks.onConversationId(parsed.conversation_id);
                    break;
                  case "delta":
                    callbacks.onDelta(parsed.text);
                    break;
                  case "done":
                    doneCalled = true;
                    callbacks.onDone(parsed);
                    break;
                  case "debug_summary":
                    callbacks.onDebugTrace?.(parsed as DebugSummary);
                    break;
                  case "error":
                    callbacks.onError(new Error(parsed.message || "Stream error"));
                    break;
                }
              } catch {
                // Skip unparseable events
              }
              currentEvent = "";
            }
          }
        }

        // Safety net: the stream closed without a `done` event. Finalize anyway
        // so isLoading resets and the input never stays permanently disabled.
        if (!doneCalled) {
          callbacks.onDone({} as Parameters<typeof callbacks.onDone>[0]);
        }
      } finally {
        // Release the reader lock to free the underlying TCP connection
        reader.releaseLock();
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      callbacks.onError(error as Error);
    }
  })();

  // Return abort function for cleanup
  return () => abortController.abort();
}

/**
 * Loads conversation history for the current user.
 */
export async function loadConversationHistory(
  conversationId?: string
): Promise<{ messages: ChatMessage[]; conversationId: string | null }> {
  const supabase = createClient();

  // If no conversation_id, find the most recent one
  if (!conversationId) {
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("channel", "web")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastMsg) {
      return { messages: [], conversationId: null };
    }
    conversationId = lastMsg.conversation_id;
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return { messages: [], conversationId: null };
  }

  return {
    messages: (messages ?? []) as ChatMessage[],
    conversationId: conversationId ?? null,
  };
}
