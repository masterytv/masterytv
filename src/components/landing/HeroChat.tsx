"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * HeroChat — the animated "here's the coach" panel that sits beside the hero
 * headline on a vertical's landing page (Relatti, MoneyTraits).
 *
 * Why a live panel instead of a screenshot: the product IS a conversation, and
 * a scripted exchange that plays out shows the coach's stance (it knows you, it
 * pushes back) in a way a static image can't. Also stays sharp on every screen
 * and needs no asset pipeline.
 *
 * BRAND.md: semantic tokens only — the panel themes itself per brand through
 * --color-primary* (rose under data-brand="relatti", emerald under "money"),
 * renders in both light and dark, no hardcoded hex, no icons. Motion lives in
 * globals.css (.hero-chat-*) and is disabled under prefers-reduced-motion,
 * where the whole exchange renders at once.
 *
 * SSR renders exactly one message — matching the mounted state, so there's no
 * hydration flash — and the rest sit in a scripting-off block so the exchange
 * is readable without JavaScript.
 */

export type HeroChatMessage = {
  /** "coach" = the product speaking; "person" = the visitor's stand-in. */
  who: "coach" | "person";
  text: string;
};

/** Cadence between messages. Slow enough to read the coach's line. */
const STEP_MS = 1900;
/** How long the typing dots show before the coach's line lands. */
const TYPING_MS = 900;

export function HeroChat({
  messages,
  label,
  footnote,
}: {
  messages: HeroChatMessage[];
  /** Small all-caps line in the panel head, e.g. "SAMPLE EXCHANGE". */
  label: string;
  /** Honesty line under the panel — this is an illustration, not a transcript. */
  footnote: string;
}) {
  const total = messages.length;

  const [shown, setShown] = useState(1);
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTyping(false);
  }, []);

  const play = useCallback(() => {
    stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(total);
      return;
    }
    setShown(1);
    // One pre-scheduled timeline rather than a self-rescheduling interval:
    // replay just clears the whole set, so there's no half-finished state.
    for (let i = 1; i < total; i++) {
      const at = i * STEP_MS;
      if (messages[i].who === "coach") {
        timers.current.push(
          setTimeout(() => setTyping(true), at - TYPING_MS),
        );
      }
      timers.current.push(
        setTimeout(() => {
          setTyping(false);
          setShown(i + 1);
        }, at),
      );
    }
  }, [messages, stop, total]);

  useEffect(() => {
    play();
    return stop;
  }, [play, stop]);

  return (
    <div className="hero-chat">
      <div
        className="flex flex-col gap-4 rounded-3xl bg-surface-50 p-5 shadow-card sm:p-7"
        aria-label="Sample coaching exchange"
      >
        {/* Head */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--color-primary)" }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {label}
            </span>
          </span>
          <button
            type="button"
            onClick={play}
            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary"
          >
            Replay
          </button>
        </div>

        {/* Stream — a floor height sized to the finished exchange so the hero
            never jumps as messages land. */}
        <div className="flex min-h-[360px] flex-col gap-2.5 sm:min-h-[420px]">
          {messages.slice(0, shown).map((m, i) => (
            // Index is a stable key: a fixed script, always replayed in order.
            <Bubble key={`${i}-${m.who}`} message={m} />
          ))}

          {typing && (
            <span
              className="hero-chat-typing self-start rounded-2xl rounded-bl-md bg-surface-100 px-4 py-3.5"
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
          )}

          {/* Revealed only when scripting is unavailable (globals.css). */}
          <div className="hero-chat-noscript">
            {messages.slice(1).map((m, i) => (
              <Bubble key={`ns-${i}`} message={m} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 px-1 text-center text-xs leading-relaxed text-text-muted lg:text-left">
        {footnote}
      </p>
    </div>
  );
}

function Bubble({ message }: { message: HeroChatMessage }) {
  const isPerson = message.who === "person";
  return (
    <p
      className={
        isPerson
          ? "hero-chat-bubble max-w-[85%] self-end rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-relaxed text-text-inverse"
          : "hero-chat-bubble max-w-[88%] self-start rounded-2xl rounded-bl-md bg-surface-100 px-4 py-3 text-[15px] leading-relaxed text-text-primary"
      }
      style={
        isPerson
          ? { background: "var(--color-primary-container)" }
          : undefined
      }
    >
      {message.text}
    </p>
  );
}
