"use client";

import { useState } from "react";
import { MessageCircle, X, Check } from "lucide-react";
import { resolveBrandClient } from "@/hooks/useBrand";

/**
 * Feedback capture — platform chrome on every brand's dashboard
 * (Relatti-only until 2026-07-20; lived in components/relatti/). Low-friction
 * so testers can tell us what works and what doesn't from any dashboard page.
 * Posts to /api/feedback with the client-resolved brand id; the route stamps
 * the row's `program` and emails the founder. Styling is all semantic tokens,
 * so each brand's palette themes it automatically.
 *
 * CONTROLLED open state (2026-07-20, founder mobile feedback): on phones a
 * floating pill overlapped the chat composer and page CTAs, so the widget
 * renders NO overlay chrome below md — the mobile entry point is a topbar
 * icon (in-flow, owned by DashboardLayoutClient via the shared open state)
 * and the panel opens as a full-width bottom sheet. Desktop (md+) keeps the
 * floating pill launcher.
 */

const CATEGORIES = [
  { id: "idea", label: "Idea" },
  { id: "bug", label: "Bug" },
  { id: "confusing", label: "Confusing" },
  { id: "praise", label: "Praise" },
] as const;

interface FeedbackWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackWidget({ open, onOpenChange }: FeedbackWidgetProps) {
  const [category, setCategory] = useState<string>("idea");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          rating,
          brand: resolveBrandClient().id,
          page_url: typeof window !== "undefined" ? window.location.pathname : null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
      setMessage("");
      setRating(null);
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 1600);
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    // Desktop-only launcher; below md the topbar icon is the entry point, so
    // nothing floats over the product.
    return (
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-full px-4 py-3 shadow-elevated transition-opacity hover:opacity-90 md:flex"
        style={{ background: "var(--color-primary-container)", color: "#ffffff" }}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Feedback</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Share feedback"
      className="glass fixed inset-x-0 bottom-0 z-40 rounded-t-xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-elevated md:inset-x-auto md:bottom-5 md:right-5 md:w-[min(360px,calc(100vw-2.5rem))] md:rounded-xl md:pb-5"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Share feedback</h2>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close feedback"
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        What&apos;s working, what isn&apos;t? It goes straight to the team.
      </p>

      {status === "sent" ? (
        <div className="flex items-center gap-2 py-6 text-sm text-text-primary">
          <Check className="h-4 w-4" style={{ color: "var(--color-accent-teal)" }} />
          Thank you — got it.
        </div>
      ) : (
        <>
          {/* Category */}
          <div className="mb-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="text-label-sm rounded-full px-3 py-1.5 transition-opacity hover:opacity-80"
                  style={{
                    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                    background: active
                      ? "color-mix(in oklch, var(--color-primary) 16%, transparent)"
                      : "var(--color-surface-100)",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Message */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Tell us what you noticed…"
            className="mb-3 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
            style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
          />

          {/* Optional rating */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-text-muted">Overall</span>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = rating === n;
              return (
                <button
                  key={n}
                  onClick={() => setRating(active ? null : n)}
                  aria-label={`Rate ${n} of 5`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{
                    color: active ? "#ffffff" : "var(--color-text-secondary)",
                    background: active
                      ? "var(--color-primary-container)"
                      : "var(--color-surface-100)",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {status === "error" && (
            <p className="mb-3 text-xs text-danger">
              Couldn&apos;t send — please try again.
            </p>
          )}

          <button
            onClick={submit}
            disabled={!message.trim() || status === "sending"}
            className="w-full rounded-md py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
            }}
          >
            {status === "sending" ? "Sending…" : "Send feedback"}
          </button>
        </>
      )}
    </div>
  );
}
