"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { Infinity as InfinityIcon, MessageSquare, Check, ArrowRight, KeyRound } from "lucide-react";

/**
 * Free-beta unlock page. A free tester who hits the daily coaching cap lands
 * here from the coach's limit message (or the topbar Beta badge). During the
 * controlled beta they redeem an INVITE CODE (per-code cap) to unlock unlimited
 * coaching at no cost, plus an optional feedback note.
 * POSTs /api/relatti/beta-unlock → redeem_beta_code → flips users.beta_access.
 */
export default function BetaUnlockPage() {
  const { user, loading } = useUser();
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const unlocked = status === "done" || !!user?.beta_access;

  async function unlock() {
    if (status === "sending" || !code.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/relatti/beta-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-6 py-12">
        <span
          className="text-label-sm rounded-full px-2.5 py-1"
          style={{
            color: "var(--color-primary)",
            background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
          }}
        >
          Beta
        </span>

        {unlocked ? (
          <div className="mt-6 rounded-xl bg-surface-50 p-8">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklch, var(--color-accent-teal) 16%, transparent)" }}
            >
              <Check className="h-6 w-6" style={{ color: "var(--color-accent-teal)" }} />
            </div>
            <h1 className="text-headline-lg text-text-primary">You&apos;re all set.</h1>
            <p className="mt-3 text-base text-text-secondary">
              Your coaching is unlimited for the rest of the beta — no daily cap, no card.
              Thank you for helping shape Relatti. The feedback button is always in the
              corner whenever something stands out.
            </p>
            <Link
              href="/dashboard/chat"
              className="mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
              }}
            >
              Back to coaching
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-headline-lg mt-6 text-text-primary">
              Unlock unlimited coaching — free during beta
            </h1>
            <p className="mt-3 text-base text-text-secondary">
              Relatti is still in beta, so we&apos;re not charging yet. Enter your invite
              code to unlock unlimited coaching at no cost. All we ask in return is your
              honest feedback — it&apos;s what makes the product better.
            </p>

            <div className="mt-6 space-y-4 rounded-xl bg-surface-50 p-6">
              <div className="flex items-start gap-3">
                <InfinityIcon
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    No daily limit
                  </p>
                  <p className="text-sm text-text-secondary">
                    Coach as much as you and your partner need.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Just share what you think
                  </p>
                  <p className="text-sm text-text-secondary">
                    Tell us what works and what doesn&apos;t — no credit card, ever
                    during beta.
                  </p>
                </div>
              </div>
            </div>

            <label className="mt-6 block text-sm font-medium text-text-primary">
              Your invite code
            </label>
            <div className="relative mt-2">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--color-primary)" }}
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code we sent you"
                autoCapitalize="characters"
                className="w-full rounded-md bg-surface-100 py-3 pl-10 pr-3 text-sm uppercase tracking-wide text-text-primary outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-text-muted"
                style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
              />
            </div>

            <label className="mt-6 block text-sm font-medium text-text-primary">
              Anything you&apos;d like us to know? <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What made you want to try Relatti? What are you hoping it helps with?"
              className="mt-2 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            />

            {status === "error" && (
              <p className="mt-3 text-sm text-danger">
                {errorMsg || "Something went wrong unlocking your access. Please try again."}
              </p>
            )}

            <button
              onClick={unlock}
              disabled={status === "sending" || !code.trim()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
              }}
            >
              {status === "sending" ? "Unlocking…" : "Unlock unlimited — free"}
            </button>
            <p className="mt-3 text-center text-xs text-text-muted">
              {loading ? " " : "No payment. No card. You can opt out of emails anytime."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
