"use client";

/**
 * ChatWindow — The core coaching conversation UI.
 * 
 * Features:
 * - Message bubbles (user right, coach left)
 * - Markdown rendering in coach messages
 * - Auto-scroll to latest
 * - Typing indicator
 * - Timestamp display
 * 
 * Architecture: SPRINT.md S2.7
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserStar, Heart, Clock, Compass } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import type { ChatMessage } from "@/lib/chat";
import { parseChips, stripStreamingChips } from "@/lib/chat-chips";

// ─── MARKDOWN RENDERER ─────────────────────────────────────────────────
// Lightweight markdown → HTML for coach messages (bold, italic, bullets, emoji)

/**
 * Sanitize raw text by escaping HTML entities.
 * Must run BEFORE markdown transforms to prevent XSS via dangerouslySetInnerHTML.
 * Without this, a compromised LLM response could inject <script> tags.
 */
function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(text: string): string {
  // Sanitize first — escape all HTML, THEN apply known-safe transforms
  return sanitizeHtml(text)
    // Code blocks (```...```)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="chat-code-block"><code>$2</code></pre>')
    // Inline code (`...`)
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Headings (#, ##, ### …) → bold line. The coach is instructed not to emit
    // headings (E14 conversational stance), but never render a raw "### " if it does.
    .replace(/^#{1,6}\s+(.+?)\s*$/gm, "<strong>$1</strong>")
    // Bold (**text**)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic (*text*)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    // Links [text](url) — only allow safe protocols (relative, http, https)
    .replace(/\[([^\]]+)\]\((\/?[^\)]+)\)/g, '<a href="$2" class="chat-link">$1</a>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="chat-li">$1</li>')
    .replace(new RegExp('(<li class="chat-li">.*?<\\/li>\\n?)+', 'g'), '<ul class="chat-ul">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="chat-li-num">$1</li>')
    .replace(new RegExp('(<li class="chat-li-num">.*?<\\/li>\\n?)+', 'g'), '<ol class="chat-ol">$&</ol>')
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

// ─── COACH AVATAR ───────────────────────────────────────────────────────
// Brand-aware initial for the coach bubble: "R" for Relatti, "M" for MasteryTV.
// (Was hardcoded "M", which showed on the Relatti relationship coach too.)
function CoachAvatar() {
  const brand = useBrand();
  const initial = brand.name.charAt(0); // derived from the registry — new brands covered for free
  return <div className="chat-avatar chat-avatar-coach">{initial}</div>;
}

// Hours until the daily free-tier reset (UTC midnight) — mirrors the edge fn's
// calc so we can show the upgrade card the instant the last message is used,
// without waiting for the wall's server-sent `reset_hours`.
function hoursUntilReset(): number {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCDate(reset.getUTCDate() + 1);
  reset.setUTCHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / 3_600_000));
}

// ─── FREE-TIER LIMIT NOTICE ─────────────────────────────────────────────
// A distinct SYSTEM card — deliberately NOT a coach bubble and with no coach
// avatar. Warm and continuity-first ("your conversation is saved"), and it never
// speaks in the first person, so it can't read as the coach personally walking
// out mid-conversation. Brand-aware CTA (free beta unlock for Relatti).
function LimitNotice({ resetHours }: { resetHours: number }) {
  const brand = useBrand();
  const isRelatti = brand.id === "relatti";
  const resetText = resetHours <= 1 ? "in about an hour" : `in about ${resetHours} hours`;
  return (
    <div className="chat-system-notice" role="status">
      <div className="chat-system-notice-icon">
        <Clock size={18} strokeWidth={1.75} />
      </div>
      <div className="chat-system-notice-body">
        <p className="chat-system-notice-title">You&apos;ve used today&apos;s free messages</p>
        <p className="chat-system-notice-text">
          {isRelatti
            ? `Your conversation is saved — you can pick up right where you left off ${resetText}. Or keep going now, free while Relatti is in beta.`
            : `Your conversation is saved — your free messages reset ${resetText}.`}
        </p>
        <a
          className="chat-system-notice-cta"
          href={isRelatti ? "/dashboard/beta" : "/dashboard/settings"}
        >
          {isRelatti ? "Unlock unlimited — free" : "See upgrade options"}
        </a>
      </div>
    </div>
  );
}

// ─── TYPING INDICATOR ───────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="chat-typing"
    >
      <CoachAvatar />
      <div className="chat-bubble chat-bubble-coach">
        <div className="typing-dots">
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
          />
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
          />
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── MESSAGE BUBBLE ─────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // System messages (e.g. stream errors) are app chrome, not the coach — render
  // them centered with no coach avatar/bubble so they never read as the coach.
  if (message.role === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="chat-message chat-message-system"
      >
        <div className="chat-system-line">{message.content}</div>
      </motion.div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`chat-message ${isUser ? "chat-message-user" : "chat-message-coach"}`}
    >
      {!isUser && <CoachAvatar />}
      <div className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-coach"}`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div
            className="chat-markdown"
            dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(parseChips(message.content).text)}</p>` }}
          />
        )}
        <span className="chat-time">{time}</span>
      </div>
      {isUser && <div className="chat-avatar chat-avatar-user">You</div>}
    </motion.div>
  );
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────

// Brand-aware welcome + starter prompts. MasteryTV keeps the executive-coach
// framing; Relatti gets a relationship-framed welcome (Heart icon — no star).
const EMPTY_STATE = {
  masterytv: {
    icon: UserStar,
    heading: "Welcome to Mastery Coach",
    intro:
      "I'm your executive coach. Tell me about a challenge you're facing, a goal you're working toward, or just what's on your mind.",
    starters: [
      "I'm a founder struggling to get my first customers",
      "I need help preparing for a difficult conversation",
      "I want to build better daily habits for focus",
    ],
  },
  relatti: {
    icon: Heart,
    heading: "Your relationship coach",
    intro:
      "I know both of you. Tell me what's going on between you and your partner — a recurring fight, something you've been afraid to say, or just how things have felt lately.",
    starters: [
      "My partner and I keep having the same argument",
      "Help me understand our dynamic",
      "There's something I've been afraid to bring up",
    ],
  },
  money: {
    icon: Compass,
    heading: "Your money coach",
    intro:
      "I work on what's underneath your money decisions — the patterns, fears, and beliefs that move before you do. Bring me a real decision you're weighing, or tell me what keeps repeating with money.",
    starters: [
      "I keep undercharging and I'm not sure why",
      "Help me think through a big money decision",
      "The goalposts keep moving no matter how much I make",
    ],
  },
} as const;

function EmptyState() {
  const brand = useBrand();
  const c = EMPTY_STATE[brand.id] ?? EMPTY_STATE.masterytv;
  const Icon = c.icon;
  return (
    <div className="chat-empty">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="chat-empty-content"
      >
        <div className="chat-empty-icon"><Icon size={44} strokeWidth={1.5} /></div>
        <h3>{c.heading}</h3>
        <p>{c.intro}</p>
        <div className="chat-starters">
          {c.starters.map((starter) => (
            <button key={starter} className="chat-starter-btn" data-starter={starter}>
              {starter}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── CHAT WINDOW (MAIN COMPONENT) ──────────────────────────────────────

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent?: string;
  onSendMessage: (message: string) => void;
  userId?: string;
  /** Set when the free-tier daily limit is hit — renders the system notice. */
  limitInfo?: { resetHours: number } | null;
  /** Messages left today (free tier); null = unlimited/unknown → no heads-up. */
  remainingToday?: number | null;
}

export default function ChatWindow({
  messages,
  isLoading,
  streamingContent = "",
  onSendMessage,
  userId,
  limitInfo = null,
  remainingToday = null,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Return focus to the input once the coach finishes answering, so the user can
  // keep typing without clicking back into the box. The textarea is disabled while
  // streaming (isLoading), which blurs it — this refocuses it the moment it
  // re-enables. Keyed on the loading true→false transition so it never steals
  // focus on mount or mid-stream.
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      inputRef.current?.focus();
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  // Restore draft on mount — runs once after ChatWindow mounts (userId is stable by then)
  useEffect(() => {
    const key = userId ? `mastery_chat_draft_${userId}` : "mastery_chat_draft_anon";
    const saved = localStorage.getItem(key);
    if (saved) {
      setInput(saved);
      setDraftRestored(true);
      setTimeout(() => setDraftRestored(false), 2500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft on input change
  useEffect(() => {
    const key = userId ? `mastery_chat_draft_${userId}` : "mastery_chat_draft_anon";
    if (input) {
      localStorage.setItem(key, input);
    } else {
      localStorage.removeItem(key);
    }
  }, [input, userId]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      const key = userId ? `mastery_chat_draft_${userId}` : "mastery_chat_draft_anon";
      localStorage.removeItem(key);
      onSendMessage(trimmed);
      setInput("");
    },
    [input, isLoading, onSendMessage, userId]
  );

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Handle starter prompts
  const handleStarterClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const starter = target.closest("[data-starter]") as HTMLElement | null;
      if (starter) {
        const text = starter.getAttribute("data-starter");
        if (text) onSendMessage(text);
      }
    },
    [onSendMessage]
  );

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Free-tier limit display. Show the upgrade CARD the moment the last free message
  // is used (remainingToday === 0) — not only after the user wastes another send that
  // hits the wall (limitInfo). The chip is reserved for exactly 1 left.
  const atLimit = Boolean(limitInfo) || remainingToday === 0;
  const resetHours = limitInfo?.resetHours ?? hoursUntilReset();

  // Answer chips for the coach's CURRENT question — only when the last turn is a
  // completed coach message and the user can actually reply (not mid-stream, not
  // at the free-tier wall). Once the user taps or types, the last message flips
  // to theirs and the chips clear themselves.
  const lastMessage = messages[messages.length - 1];
  const activeChips =
    !isLoading && !atLimit && lastMessage?.role === "coach"
      ? parseChips(lastMessage.content).chips
      : [];

  return (
    <div className="chat-window" onClick={handleStarterClick}>
      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <AnimatePresence>
              {isLoading && streamingContent ? (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="chat-message chat-message-coach"
                >
                  <CoachAvatar />
                  <div className="chat-bubble chat-bubble-coach">
                    <div
                      className="chat-markdown"
                      dangerouslySetInnerHTML={{
                        __html: `<p>${renderMarkdown(stripStreamingChips(streamingContent))}</p>`,
                      }}
                    />
                    <span className="chat-streaming-cursor" />
                  </div>
                </motion.div>
              ) : isLoading ? (
                <TypingIndicator />
              ) : null}
            </AnimatePresence>
          </>
        )}
        {/* Low-balance heads-up — a gentle chip at exactly 1 left. At 0 (last free
            message used) we show the upgrade card right here instead, so the user
            never has to waste a question hitting the wall to reach the CTA. */}
        {!atLimit && !isLoading && remainingToday === 1 && (
          <div className="chat-heads-up" role="status">
            1 message left today on your free plan
          </div>
        )}
        {atLimit && <LimitNotice resetHours={resetHours} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Answer chips — quick replies for the coach's current question. Free-text
          below stays the primary input; these are only ever a shortcut. */}
      {activeChips.length > 0 && (
        <div className="chat-chips" role="group" aria-label="Quick replies">
          {activeChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="chat-chip"
              onClick={() => onSendMessage(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell your coach what's on your mind..."
            className="chat-input"
            rows={1}
            disabled={isLoading || atLimit}
            maxLength={5000}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!input.trim() || isLoading || atLimit}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
        {draftRestored && (
          <p style={{ fontSize: "0.7rem", color: "var(--text-hint)", paddingLeft: "0.5rem", marginTop: "0.2rem" }}>
            Draft restored
          </p>
        )}
        <p className="chat-disclaimer">
          Your coach isn&apos;t a licensed therapist, lawyer, or financial advisor.
        </p>
      </form>
    </div>
  );
}
