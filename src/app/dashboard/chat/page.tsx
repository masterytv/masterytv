"use client";

/**
 * Chat Page — The primary coaching interface.
 * 
 * Loads conversation history on mount, sends messages to the coaching
 * Edge Function, and displays streaming responses in real-time.
 * 
 * Admin users see a debug toggle that enables a split-panel view
 * with the Coach Debugger (implementation_plan.md — Component 2).
 * 
 * Architecture: SPRINT.md S2.8
 */

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import ChatWindow from "@/components/chat/chat-window";
import CoachVoiceSelector from "@/components/chat/CoachVoiceSelector";
import {
  sendMessageStream,
  loadConversationHistory,
  listConversations,
  type ChatMessage,
  type DebugSummary,
} from "@/lib/chat";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import type { CoachVoiceId } from "@/lib/coach/voice-config";
import { getActiveDyad, type DashboardDyad } from "@/lib/relatti/dashboard-dyad";
import { resolveBrandClient } from "@/hooks/useBrand";
import { Heart } from "lucide-react";

// Lazy-load debug panel — only shipped to admin users who activate debug mode
const DebugPanel = dynamic(() => import("@/components/debug/debug-panel"), {
  ssr: false,
  loading: () => null,
});

function ChatPageInner() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const abortRef = useRef<(() => void) | null>(null);
  // Ref to accumulate streamed text — avoids React Strict Mode double-invoke of state updaters
  const streamedTextRef = useRef<string>("");
  // Sprint 0.4: Deep link context from report CTAs
  const deepLinkContext = useRef<{ type: string; section?: string; topic?: string; inviteId?: string } | null>(null);

  // ── Debug mode state (admin only) ──
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState<DebugSummary | null>(null);
  const [traceHistory, setTraceHistory] = useState<DebugSummary[]>([]);

  // ── Voice style state ──
  const [activeVoiceId, setActiveVoiceId] = useState<CoachVoiceId | null>(null);

  // ── Dyad + thread scope (PB2.2 + PA5) ──
  // The active thread is the dyad's engagement on the Relatti brand, else the
  // general thread (null). Resolved before loading history so Relatti and
  // MasteryTV keep separate conversations. engagementId === undefined = still
  // resolving (don't load history yet).
  const [dyad, setDyad] = useState<DashboardDyad | null>(null);
  const [engagementId, setEngagementId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      let d: DashboardDyad | null = null;
      try {
        d = await getActiveDyad(supabase, user.id);
      } catch {
        /* non-fatal */
      }
      if (cancelled) return;
      setDyad(d);
      const isRelatti = resolveBrandClient().id === "relatti";
      setEngagementId(isRelatti && d ? d.engagementId : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isAdmin = user?.is_admin === true;

  // Load the conversation selected by ?c= once engagementId resolves (PC1).
  // ?c=<id> loads that conversation; ?c=new starts a fresh draft (and gets a
  // real id in the URL); no ?c lands on the most-recent (or a fresh draft).
  // The conversation LIST lives in the sidebar (CoachConversations).
  const requestedC = searchParams.get("c");
  useEffect(() => {
    if (engagementId === undefined) return; // wait for thread resolution
    let cancelled = false;
    (async () => {
      try {
        if (requestedC === "new") {
          // Give the draft a real id in the URL so it persists on first send.
          router.replace(`/dashboard/chat?c=${crypto.randomUUID()}`, { scroll: false });
          return; // effect re-runs with the new ?c
        }

        let activeId: string;
        let history: ChatMessage[] = [];
        if (requestedC) {
          activeId = requestedC;
          history = (await loadConversationHistory(requestedC, engagementId)).messages;
        } else {
          const list = await listConversations(engagementId);
          if (list.length > 0) {
            activeId = list[0].id;
            history = (await loadConversationHistory(activeId, engagementId)).messages;
          } else {
            activeId = crypto.randomUUID();
          }
        }
        if (cancelled) return;
        setConversationId(activeId);
        setMessages(history);
      } catch (error) {
        console.error("Failed to load conversation:", error);
      } finally {
        if (!cancelled) setIsInitialLoad(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId, requestedC, router]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);

  // Sprint 0.4: Read deep link context from URL and auto-send first message
  const deepLinkProcessed = useRef(false);
  useEffect(() => {
    if (deepLinkProcessed.current || isInitialLoad) return;

    const contextType = searchParams.get('context');
    const section = searchParams.get('section');
    const topic = searchParams.get('topic');
    const inviteId = searchParams.get('inviteId');

    if (contextType === 'report_deep_link' && section) {
      deepLinkProcessed.current = true;
      deepLinkContext.current = { type: contextType, section, topic: topic ?? undefined };

      // Build a natural opening message from the deep link context
      const openingMessage = topic
        ? `I was just reading my Decoded report — the ${section} section about ${topic}. Can we dig into this?`
        : `I was just reading my Decoded report — the ${section} section. I'd love to explore this with you.`;

      // Auto-send after a brief delay to let UI settle
      setTimeout(() => handleSendMessage(openingMessage), 300);

      // Clean URL to prevent re-triggering on refresh
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === 'compatibility' && inviteId) {
      deepLinkProcessed.current = true;
      const otherName = topic ? topic.replace('my relationship with ', '') : 'them';
      deepLinkContext.current = { type: contextType, topic: topic ?? undefined, inviteId };

      // Build an opening message that references the specific relationship
      const openingMessage = `I was just reading my compatibility report with ${otherName}. I have a question about our relationship.`;

      setTimeout(() => handleSendMessage(openingMessage), 300);
      router.replace('/dashboard/chat', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, searchParams]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      // Optimistic update: show user message immediately
      const tempId = `temp-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: tempId,
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent("");
      streamedTextRef.current = "";

      try {
        const abort = await sendMessageStream(
          message,
          conversationId ?? undefined,
          {
            onConversationId: (convId) => {
              if (!conversationId) {
                setConversationId(convId);
              }
            },
            onDelta: (text) => {
              // Accumulate in ref (source of truth) + state (for rendering)
              streamedTextRef.current += text;
              setStreamingContent(streamedTextRef.current);
            },
            onDone: (metadata) => {
              // Read accumulated content from ref (not from state updater)
              const finalContent = streamedTextRef.current;
              
              const coachMessage: ChatMessage = {
                id: metadata.message_id ?? `coach-${Date.now()}`,
                role: "coach",
                content: finalContent,
                created_at: new Date().toISOString(),
                metadata: metadata as unknown as Record<string, unknown>,
              };
              
              setMessages((prev) => [...prev, coachMessage]);
              setStreamingContent("");
              streamedTextRef.current = "";
              setIsLoading(false);
              // PC1: tell the sidebar list to refresh — a new conversation may
              // have been created + auto-titled server-side.
              window.dispatchEvent(new Event("coach:conversations-changed"));
            },
            onDebugTrace: (trace) => {
              // Capture debug trace from the pipeline (admin debug mode only)
              setDebugData(trace);
              setTraceHistory((prev) => [...prev, trace]);
            },
            onError: (error) => {
              console.error("Stream error:", error);
              setStreamingContent("");
              streamedTextRef.current = "";
              setIsLoading(false);

              const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: "system",
                content: `Something went wrong. Please try again. (${error.message})`,
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, errorMessage]);
            },
          },
          // Pass debug flag only when admin has debug mode active
          // Sprint 0.4: Pass deep link context on first message
          {
            debug: debugMode && isAdmin,
            engagementId: engagementId ?? null,
            ...(deepLinkContext.current ? { context: deepLinkContext.current } : {}),
          }
        );

        abortRef.current = abort;
        // Sprint 0.4: Clear deep link context after first use
        if (deepLinkContext.current) {
          deepLinkContext.current = null;
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setStreamingContent("");
        streamedTextRef.current = "";
        setIsLoading(false);

        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "system",
          content: `Something went wrong. Please try again. (${(error as Error).message})`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [conversationId, debugMode, isAdmin, engagementId]
  );

  // ── Load active voice on mount ──
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    supabase
      .from("coach_profiles")
      .select("voice_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.voice_id) {
          setActiveVoiceId(data.voice_id as CoachVoiceId);
        }
      });
  }, [user?.id]);

  if (isInitialLoad) {
    return (
      <div className="chat-loading">
        <div className="chat-loading-spinner" />
        <p>Loading your coaching session...</p>
      </div>
    );
  }


  const showDebugPanel = isAdmin && debugMode;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {/* Chat header bar — dyad indicator + voice (conversations live in the sidebar) */}
      <div className="chat-header-bar">
        {dyad && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)",
              color: "var(--color-primary)",
            }}
            title={`Coaching you and ${dyad.partnerName} as a couple`}
          >
            <Heart className="h-3.5 w-3.5" />
            Couples coach · with {dyad.partnerName}
          </span>
        )}
        <CoachVoiceSelector
          activeVoiceId={activeVoiceId}
          onVoiceChanged={(voiceId) => setActiveVoiceId(voiceId)}
        />
      </div>

      {showDebugPanel ? (
        /* Split layout: chat + debug panel */
        <div className="debug-split-layout">
          <div className="debug-split-layout__chat">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              streamingContent={streamingContent}
              onSendMessage={handleSendMessage}
              userId={user?.id}
            />
          </div>
          <DebugPanel debugData={debugData} traceHistory={traceHistory} />
        </div>
      ) : (
        /* Normal full-width chat */
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          streamingContent={streamingContent}
          onSendMessage={handleSendMessage}
          userId={user?.id}
        />
      )}
    </div>
  );
}

/** Wrap in Suspense because useSearchParams requires it in Next.js 15 */
export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="chat-loading">
        <div className="chat-loading-spinner" />
        <p>Loading your coaching session...</p>
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
