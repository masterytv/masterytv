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
import ConsentGate from "@/components/integration/ConsentGate";
import KeepThis from "@/components/heard/KeepThis";
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
import { takeHeldAccount, HELD_ACCOUNT_CONTEXT } from "@/lib/heard/pending-account";
import type { CoachVoiceId } from "@/lib/coach/voice-config";
import { getActiveDyad, type DashboardDyad } from "@/lib/relatti/dashboard-dyad";
import { resolveBrandClient } from "@/hooks/useBrand";
import { byBrand } from "@/lib/platform/brand";
import { useBrandModules } from "@/hooks/useBrandModules";
import { Heart, Waves } from "lucide-react";
import MoneyMapCard from "@/components/money/MoneyMapCard";
import { loadMyMoneyMap } from "@/lib/decoded/load-my-money-map";
import type { StoredMoneyMap } from "@/lib/decoded/scoring/money-maps";

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
  // Free-tier limit UX (rendered as app chrome, never as the coach): the inline
  // system notice when the limit is hit, and the messages-left count for the
  // low-balance heads-up (null = unlimited/unknown → no heads-up).
  const [limitInfo, setLimitInfo] = useState<{ resetHours: number } | null>(null);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
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
  // The six voices are executive coach personas — module-gated off on Relatti
  // (one deliberate counselling stance, no user-tunable voice).
  const enabledModules = useBrandModules();
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
      // The dyad (couples) concept is relationship-only — money and executive are
      // solo. Gating the load to Relatti keeps the "Couples coach · with …" badge
      // off the money/executive chat header (and skips a wasted query).
      const isRelatti = resolveBrandClient().id === "relatti";
      let d: DashboardDyad | null = null;
      if (isRelatti) {
        try {
          d = await getActiveDyad(supabase, user.id);
        } catch {
          /* non-fatal */
        }
      }
      if (cancelled) return;
      setDyad(d);
      setEngagementId(isRelatti && d ? d.engagementId : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Rung-0 trait card (MONEY_TRAITS_INSTRUMENT.md §5) ──
  // Data-driven, NOT brand-gated: load the current program's stored bundle and
  // let the DATA decide. Only a report carrying sections.money_map (money's)
  // yields a card — general/relationship reports carry LLM sections, so they get
  // null and no card, with no `program === "money"` guard. loadMyMoneyMap is
  // program-scoped, so a money user's card can never surface on another vertical.
  const [moneyMap, setMoneyMap] = useState<StoredMoneyMap | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadMyMoneyMap(user.id, resolveBrandClient().programSlug)
      .then((m) => {
        if (!cancelled) setMoneyMap(m);
      })
      .catch(() => {
        /* non-fatal — the card just doesn't render */
      });
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
  const mode = searchParams.get("mode"); // E9: 'deescalate' = fight de-escalator
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
          const loaded = await loadConversationHistory(requestedC, engagementId);
          if (loaded.wrongBrand) {
            // Brand isolation: this conversation belongs to the other
            // vertical — drop the id and land on this brand's own thread.
            if (!cancelled) router.replace("/dashboard/chat", { scroll: false });
            return;
          }
          activeId = requestedC;
          history = loaded.messages;
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
        // Clear the ephemeral free-tier limit UI when switching/loading a thread.
        setLimitInfo(null);
        setRemainingToday(null);
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

      // Build a natural opening message from the deep link context. Brand-aware:
      // Relatti users read a "relationship profile," not a "Decoded report."
      const profileLabel = byBrand(
        { relatti: "relationship profile", masterytv: "report", money: "MoneyTraits profile", heard: "notes" },
        resolveBrandClient().id,
      );
      const openingMessage = topic
        ? `I was just reading my ${profileLabel} — the ${section} section about ${topic}. Can we dig into this?`
        : `I was just reading my ${profileLabel} — the ${section} section. I'd love to explore this with you.`;

      // Auto-send after a brief delay to let UI settle
      setTimeout(() => handleSendMessage(openingMessage), 300);

      // Clean URL to prevent re-triggering on refresh
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === 'ritual' && topic) {
      // Daily connection ritual hand-off (§5.9): seed a conversation about the
      // shared question, carrying the actual answers so the coach can respond to
      // the content and reason from both partners' profiles.
      deepLinkProcessed.current = true;
      deepLinkContext.current = { type: contextType, topic };

      const mine = searchParams.get('mine');
      const theirs = searchParams.get('theirs');
      const partner = searchParams.get('partner') || 'my partner';

      let openingMessage: string;
      if (theirs) {
        // Dyad reveal — both answered. Open-ended on purpose: invite the coach to
        // reflect and ask, not to pre-order an analysis + tip-list (E14 stance).
        openingMessage =
          `Our connection question was: "${topic}" I answered: "${mine}". ${partner} answered: "${theirs}". ` +
          `What do you make of that?`;
      } else if (mine) {
        // Solo reflection — open, reflective; let the coach lead with curiosity.
        openingMessage =
          `Our connection question was: "${topic}" I answered: "${mine}". ` +
          `What stands out to you about that?`;
      } else {
        openingMessage = `Our connection question was: "${topic}" I'd like to talk about it.`;
      }

      setTimeout(() => handleSendMessage(openingMessage), 300);
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === 'compatibility' && inviteId) {
      deepLinkProcessed.current = true;
      const otherName = topic ? topic.replace('my relationship with ', '') : 'them';
      deepLinkContext.current = { type: contextType, topic: topic ?? undefined, inviteId };

      // Build an opening message that references the specific relationship
      const openingMessage = `I was just reading my compatibility report with ${otherName}. I have a question about our relationship.`;

      setTimeout(() => handleSendMessage(openingMessage), 300);
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === 'money_reveal') {
      // Money post-completion (completion-destination.ts). The coach's FIRST
      // message is the REVEAL off the trait profile — Layer 4.5 is already loaded in
      // the coach's context server-side, so a plain first user turn triggers it
      // (MONEY_TRAITS_INSTRUMENT.md §6). The seed reads as the user asking for the
      // read — the "one tap" of Rung 0 → Rung 1. Only fire on a FRESH thread so a
      // returning user is never re-revealed (the persona also self-guards on
      // "conversation just beginning").
      deepLinkProcessed.current = true;
      if (messages.length === 0) {
        setTimeout(() => handleSendMessage("I just finished MoneyTraits. What do you see?"), 300);
      }
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === 'money_report_question') {
      // Money report → coach handoff (the report's three first_questions chips).
      // The user explicitly tapped a question they want to ask, so send it as
      // their opening turn — even into an existing thread (unlike money_reveal,
      // which only seeds a fresh one). Params are stripped immediately, so a
      // refresh never re-sends it.
      deepLinkProcessed.current = true;
      const q = searchParams.get('q')?.slice(0, 300);
      if (q?.trim()) {
        setTimeout(() => handleSendMessage(q.trim()), 300);
      }
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === HELD_ACCOUNT_CONTEXT) {
      // I5.1 — the pre-account box handed us an account (EXPERIENCE §5.2).
      //
      // It arrives via sessionStorage rather than a param because it can be
      // four thousand words. `takeHeldAccount` reads and CLEARS, so a refresh
      // cannot re-send somebody's account as a second turn.
      //
      // 🔑 No `deepLinkContext` is set on purpose. The witness turn is DERIVED
      // (no coach turn in this conversation AND stage 1, per I5.2), not
      // triggered by a context flag, so handing the coach a context type here
      // would add a second, forgeable way to reach the most constrained turn
      // in the product.
      //
      // ⚠️ NOT guarded on `messages.length === 0`, unlike the money deep links
      // above, and the difference matters. youheard.org/ serves this box to
      // everyone, signed in or not, so a returning person with a live thread
      // can absolutely walk back through it — and a fresh-thread guard would
      // read their words out of storage and silently drop them. Losing what
      // somebody just wrote here is the worst failure this surface has. It
      // lands in whatever thread is open instead, where the derived stage is
      // already correct: they have been met, so they get an ordinary turn
      // rather than a second introduction.
      deepLinkProcessed.current = true;
      const heldAccount = takeHeldAccount();
      if (heldAccount) {
        setTimeout(() => handleSendMessage(heldAccount), 300);
      }
      router.replace('/dashboard/chat', { scroll: false });
    } else if (contextType === 'money_decision' && topic) {
      // Money Decision Room (MONEY_EXPERIENCE.md §8, the money V1 spine). The user
      // named a live decision in the Decision Room and we deep-linked into its
      // thread (the conversation id was pre-generated there and stored on the
      // money_decisions row, so it rides through ?c= — the coach creates the
      // conversation under that id and the log links straight back). Seed the
      // opening turn carrying the decision title as context so the coach applies
      // the whole trait profile to THIS decision (the coach fn injects the
      // Decision Room instruction off context.topic). Fresh-thread only, so
      // re-opening the thread later (Continue → ?c=, no context) never re-seeds.
      deepLinkProcessed.current = true;
      deepLinkContext.current = { type: contextType, topic };
      if (messages.length === 0) {
        setTimeout(() => handleSendMessage(`I want to think through a decision: ${topic}`), 300);
      }
      // Strip the context/topic params but KEEP the thread addressable on refresh.
      router.replace(`/dashboard/chat${conversationId ? `?c=${conversationId}` : ''}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, searchParams]);

  // I5.5 — set when the coach refuses turn 2 for want of a consent record.
  // `heldMessage` is what they were trying to say when it happened.
  const [consentRequired, setConsentRequired] = useState(false);
  const [heldMessage, setHeldMessage] = useState<string | null>(null);

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

              // Free-tier limit: the server sends a signal-only `done` (no coach
              // text). Render a distinct SYSTEM notice instead of a coach bubble —
              // a limit message in the coach's voice mid-conversation reads as the
              // coach abandoning the user. Never push a coach message here.
              if (metadata.limit_reached) {
                setLimitInfo({ resetHours: metadata.reset_hours ?? 24 });
                setRemainingToday(0);
                setStreamingContent("");
                streamedTextRef.current = "";
                setIsLoading(false);
                return;
              }

              // Normal reply — clear any prior limit state and track how many
              // messages are left (for the low-balance heads-up).
              setLimitInfo(null);
              setRemainingToday(metadata.remaining_today ?? null);

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

              // I5.5 — the consent gate, which lands before turn 2 and never
              // before turn 1. The server refused BEFORE storing the message, so
              // the optimistic bubble is taken back off and held: after they
              // accept, it is sent again exactly once rather than lost or
              // duplicated. No error bubble either — being told "something went
              // wrong" for reaching a consent screen is its own small insult.
              if ((error as Error & { code?: string }).code === "CONSENT_REQUIRED") {
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
                setHeldMessage(message);
                setConsentRequired(true);
                return;
              }

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
            mode: mode ?? null,
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
    [conversationId, debugMode, isAdmin, engagementId, mode]
  );

  // ── Load active voice on mount (voice-enabled brands only) ──
  useEffect(() => {
    if (!user?.id || !enabledModules.has("coach_voices")) return;
    const supabase = createClient();
    supabase
      .from("coach_profiles")
      .select("voice_id")
      .eq("user_id", user.id)
      .eq("program", resolveBrandClient().programSlug) // PC2.2
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
  const moneyCard = moneyMap ? <MoneyMapCard map={moneyMap} /> : null;

  // I5.5 — it takes the whole slot when it is up. On accept, the message they
  // were trying to send goes exactly once, through the normal path.
  // I5.1's other half. Renders only for an anonymous HEARD session and only
  // after a real exchange, so the ask can never land on the turn the account
  // arrived. `KeepThis` returns null for every other brand and every signed-in
  // user, so this is a no-op everywhere else. Consent outranks it: two asks
  // stacked on one screen is the form this vertical exists to avoid.
  const keepThis = messages.length >= 2 ? <KeepThis /> : null;

  const consentGate = consentRequired
    ? (
      <ConsentGate
        onAccepted={() => {
          setConsentRequired(false);
          const held = heldMessage;
          setHeldMessage(null);
          if (held) void handleSendMessage(held);
        }}
      />
    )
    : null;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {/* Chat header bar — de-escalation mode + dyad indicator + voice */}
      <div className="chat-header-bar">
        {mode === "deescalate" && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)",
              color: "var(--color-primary)",
            }}
            title="Regulation-first coaching for in-the-moment conflict"
          >
            <Waves className="h-3.5 w-3.5" />
            De-escalation mode
          </span>
        )}
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
        {enabledModules.has("coach_voices") && (
          <CoachVoiceSelector
            activeVoiceId={activeVoiceId}
            onVoiceChanged={(voiceId) => setActiveVoiceId(voiceId)}
          />
        )}
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
              limitInfo={limitInfo}
              remainingToday={remainingToday}
              topCard={consentGate ?? keepThis ?? moneyCard}
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
          limitInfo={limitInfo}
          remainingToday={remainingToday}
          topCard={consentGate ?? keepThis ?? moneyCard}
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
