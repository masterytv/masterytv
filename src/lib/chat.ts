/**
 * Chat API service — Client-side wrapper for the coaching Edge Function.
 * Handles authentication, request formatting, and SSE streaming.
 */

import { createClient } from "@/lib/supabase/client";
import { resolveBrandClient } from "@/hooks/useBrand";
import { byBrand } from "@/lib/platform/brand";

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
    /** Free-tier daily limit hit — render a SYSTEM notice, not a coach message. */
    limit_reached?: boolean;
    /** Messages left today (free tier). null = unlimited/unknown → no heads-up. */
    remaining_today?: number | null;
    /** Hours until the daily reset (only sent with limit_reached). */
    reset_hours?: number;
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
  options?: { debug?: boolean; context?: { type: string; section?: string; topic?: string; inviteId?: string }; engagementId?: string | null; mode?: string | null }
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
      // Vertical/program → selects the coach persona (relationship vs executive)
      // for every Relatti user, solo or dyad.
      program: resolveBrandClient().programSlug,
      conversation_id: conversationId,
      ...(options?.engagementId ? { engagement_id: options.engagementId } : {}),
      ...(options?.mode ? { mode: options.mode } : {}),
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
        // Carry the CODE, not just the sentence. A caller that has to
        // string-match an error message to tell "you are out of messages" from
        // "this vertical needs consent first" (I5.5) will get it wrong the
        // first time somebody rewords the copy.
        const err = new Error(error.message || `HTTP ${response.status}`) as Error & { code?: string };
        if (typeof error.error === "string") err.code = error.error;
        callbacks.onError(err);
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

export interface ConversationSummary {
  id: string;
  title: string | null;
  updated_at: string;
}

/**
 * Brand isolation: the PostgREST `or` filter matching conversations that
 * belong to the CURRENT brand's vertical. Relatti = program 'relationship';
 * MasteryTV = 'general' plus NULL (rows predating the program stamp are all
 * executive — the backfill set them 'general', NULL is belt-and-braces);
 * Money = 'money'. A user with accounts on more than one brand must never see
 * another vertical's conversations (founder invariant, 2026-07-15).
 *
 * byBrand is exhaustive over BrandId, so a new vertical compile-fails here
 * instead of silently inheriting the executive filter. That silent inheritance
 * is exactly what the old `=== "relatti" ? … : …` ternary did to money: money
 * conversations (program='money') fell into the `general,is.null` bucket and
 * vanished from money's own thread list.
 */
function brandProgramFilter(): string {
  return byBrand(
    {
      relatti: "program.eq.relationship",
      masterytv: "program.eq.general,program.is.null",
      money: "program.eq.money",
      // The integration vertical stores conversations under program='integration'.
      heard: "program.eq.integration",
    },
    resolveBrandClient().id,
  );
}

/**
 * List the user's conversations in the active thread (PC1), most-recent first.
 * Scoped per thread — the relationship dyad (engagement_id = engagementId) or
 * the general thread (NULL) — AND per brand. RLS scopes to the current user.
 */
export async function listConversations(
  engagementId?: string | null
): Promise<ConversationSummary[]> {
  const supabase = createClient();
  let q = supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("channel", "web")
    .eq("archived", false)
    .or(brandProgramFilter());
  q = engagementId ? q.eq("engagement_id", engagementId) : q.is("engagement_id", null);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(50);
  if (error) {
    console.error("[listConversations]", error.message);
    return [];
  }
  return (data ?? []) as ConversationSummary[];
}

/**
 * Loads conversation history for the current user.
 *
 * `wrongBrand: true` means the requested conversation exists but belongs to
 * the OTHER brand's vertical (e.g. a masterytv.com executive conversation id
 * opened on relatti.com) — the caller must not render it; drop the id and
 * land on this brand's own thread instead.
 */
export async function loadConversationHistory(
  conversationId?: string,
  engagementId?: string | null
): Promise<{ messages: ChatMessage[]; conversationId: string | null; wrongBrand?: boolean }> {
  const supabase = createClient();

  // If no conversation_id, find the most recent one IN THIS THREAD (PA5) and
  // THIS BRAND: the relationship dyad (engagement_id = engagementId) or
  // general (NULL), never the other vertical's conversations.
  if (!conversationId) {
    let q = supabase
      .from("conversations")
      .select("id")
      .eq("channel", "web")
      .or(brandProgramFilter());
    q = engagementId ? q.eq("engagement_id", engagementId) : q.is("engagement_id", null);
    const { data: lastConv } = await q
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastConv) {
      return { messages: [], conversationId: null };
    }
    conversationId = lastConv.id;
  } else {
    // Direct ?c= load — verify the conversation belongs to THIS brand. A row
    // from the other vertical must not render here (brand-isolation
    // invariant). No row at all = a fresh draft id, which is fine.
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, program")
      .eq("id", conversationId)
      .maybeSingle();
    if (conv) {
      // The conversation belongs to THIS brand iff its program matches the
      // brand's program — masterytv also owns the pre-stamp NULL rows (legacy
      // executive). The old binary isRelatti/isRelationship test let money load
      // an EXECUTIVE conversation (program='general') via ?c= (general !==
      // relatti was false on money, so it read as "owned"); program-matching
      // closes that, and is exhaustive-safe for future verticals.
      const brand = resolveBrandClient();
      const ownsConv =
        conv.program === brand.programSlug ||
        (brand.programSlug === "general" && !conv.program);
      if (!ownsConv) {
        return { messages: [], conversationId: null, wrongBrand: true };
      }
    }
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
