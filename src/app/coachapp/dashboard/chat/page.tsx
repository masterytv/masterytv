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

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import ChatWindow from "@/components/chat/chat-window";
import { sendMessageStream, loadConversationHistory, type ChatMessage, type DebugSummary } from "@/lib/chat";
import { useUser } from "@/hooks/useUser";

// Lazy-load debug panel — only shipped to admin users who activate debug mode
const DebugPanel = dynamic(() => import("@/components/debug/debug-panel"), {
  ssr: false,
  loading: () => null,
});

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const abortRef = useRef<(() => void) | null>(null);
  // Ref to accumulate streamed text — avoids React Strict Mode double-invoke of state updaters
  const streamedTextRef = useRef<string>("");

  // ── Debug mode state (admin only) ──
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState<DebugSummary | null>(null);
  const [traceHistory, setTraceHistory] = useState<DebugSummary[]>([]);

  const isAdmin = user?.is_admin === true;

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { messages: history, conversationId: convId } =
          await loadConversationHistory();
        setMessages(history);
        setConversationId(convId);
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setIsInitialLoad(false);
      }
    }
    loadHistory();
  }, []);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);

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
          { debug: debugMode && isAdmin }
        );

        abortRef.current = abort;
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
    [conversationId, debugMode, isAdmin]
  );

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
      {/* Admin debug toggle */}
      {isAdmin && (
        <button
          className={`debug-toggle ${debugMode ? "debug-toggle--active" : ""}`}
          onClick={() => setDebugMode(!debugMode)}
          title={debugMode ? "Disable debug mode" : "Enable debug mode"}
        >
          <span className="debug-toggle__dot" />
          {debugMode ? "Debug ON" : "Debug"}
        </button>
      )}

      {showDebugPanel ? (
        /* Split layout: chat + debug panel */
        <div className="debug-split-layout">
          <div className="debug-split-layout__chat">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              streamingContent={streamingContent}
              onSendMessage={handleSendMessage}
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
        />
      )}
    </div>
  );
}
