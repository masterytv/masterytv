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
import { UserStar } from "lucide-react";
import type { ChatMessage } from "@/lib/chat";

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
    // Bold (**text**)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic (*text*)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
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

// ─── TYPING INDICATOR ───────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="chat-typing"
    >
      <div className="chat-avatar chat-avatar-coach">M</div>
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
      {!isUser && <div className="chat-avatar chat-avatar-coach">M</div>}
      <div className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-coach"}`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div
            className="chat-markdown"
            dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(message.content)}</p>` }}
          />
        )}
        <span className="chat-time">{time}</span>
      </div>
      {isUser && <div className="chat-avatar chat-avatar-user">You</div>}
    </motion.div>
  );
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="chat-empty">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="chat-empty-content"
      >
        <div className="chat-empty-icon"><UserStar size={44} strokeWidth={1.5} /></div>
        <h3>Welcome to Mastery Coach</h3>
        <p>
          I&apos;m your AI executive coach. Tell me about a challenge you&apos;re
          facing, a goal you&apos;re working toward, or just what&apos;s on your mind.
        </p>
        <div className="chat-starters">
          {[
            "I'm a founder struggling to get my first customers",
            "I need help preparing for a difficult conversation",
            "I want to build better daily habits for focus",
          ].map((starter) => (
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
}

export default function ChatWindow({
  messages,
  isLoading,
  streamingContent = "",
  onSendMessage,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
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

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      onSendMessage(trimmed);
      setInput("");
    },
    [input, isLoading, onSendMessage]
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
                  <div className="chat-avatar chat-avatar-coach">M</div>
                  <div className="chat-bubble chat-bubble-coach">
                    <div
                      className="chat-markdown"
                      dangerouslySetInnerHTML={{
                        __html: `<p>${renderMarkdown(streamingContent)}</p>`,
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
        <div ref={messagesEndRef} />
      </div>

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
            disabled={isLoading}
            maxLength={5000}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
        <p className="chat-disclaimer">
          Mastery Coach is AI-powered. It&apos;s not a licensed therapist, lawyer, or financial advisor.
        </p>
      </form>
    </div>
  );
}
