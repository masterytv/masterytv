"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { Infinity as InfinityIcon, ShieldCheck, Check, ArrowRight, KeyRound, CalendarCheck } from "lucide-react";

/**
 * Free-beta unlock page. A free tester who hits the daily coaching cap lands
 * here from the coach's limit message (or the topbar Beta badge). The deal:
 * an invite code + a 2-minute BEFORE check-in unlocks unlimited coaching at no
 * cost; a matching check-in at day 14 completes it. Satisfaction itself is NOT
 * re-asked here — the assessment's CSI-4 is the validated baseline.
 *
 * Already-unlocked testers who predate the survey see the check-in form alone
 * (backfill via /api/relatti/beta-survey phase=before).
 */

const LENGTH_OPTIONS = [
  { value: "lt1", label: "Under a year" },
  { value: "y1_3", label: "1–3 years" },
  { value: "y3_7", label: "3–7 years" },
  { value: "y7_15", label: "7–15 years" },
  { value: "gt15", label: "15+ years" },
];

interface SurveyState {
  before: boolean;
  after: boolean;
  checkinDue: boolean;
}

export default function BetaUnlockPage() {
  const { user, loading } = useUser();
  const [code, setCode] = useState("");
  const [relationshipLength, setRelationshipLength] = useState("");
  const [hopefulness, setHopefulness] = useState(0);
  const [topChange, setTopChange] = useState("");
  const [ack, setAck] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [survey, setSurvey] = useState<SurveyState | null>(null);

  useEffect(() => {
    fetch("/api/relatti/beta-survey")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSurvey(s))
      .catch(() => {});
  }, [status]);

  const unlocked = status === "done" || !!user?.beta_access;
  const needsBackfill = unlocked && survey !== null && !survey.before && status !== "done";
  const surveyComplete = relationshipLength && hopefulness >= 1 && topChange.trim() && ack;

  async function submit() {
    if (status === "sending" || !surveyComplete) return;
    if (!unlocked && !code.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    const surveyBody = { relationshipLength, hopefulness, topChange: topChange.trim() };
    try {
      const res = unlocked
        ? await fetch("/api/relatti/beta-survey", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase: "before", ...surveyBody }),
          })
        : await fetch("/api/relatti/beta-unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code.trim(), note: topChange.trim(), survey: surveyBody }),
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

  const showForm = !unlocked || needsBackfill;

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

        {!showForm ? (
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
              Thank you for helping shape Relatti.
            </p>
            {survey?.after ? (
              <p className="mt-3 text-base text-text-secondary">
                Both check-ins done — that&apos;s everything we&apos;ll ever ask. Thank you.
              </p>
            ) : survey?.checkinDue ? (
              <Link
                href="/dashboard/beta/checkin"
                className="mt-5 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
                }}
              >
                <CalendarCheck className="h-4 w-4" />
                Your 2-week check-in is ready
              </Link>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-sm text-text-muted">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
                One quick check-in at the 2-week mark completes the deal — we&apos;ll email you
                when it&apos;s time.
              </p>
            )}
            <div className="mt-6">
              <Link
                href="/dashboard/chat"
                className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-2"
                style={{ color: "var(--color-primary)" }}
              >
                Back to coaching
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-headline-lg mt-6 text-text-primary">
              {needsBackfill
                ? "One quick check-in to keep your free access"
                : "Unlock unlimited coaching — free during beta"}
            </h1>
            <p className="mt-3 text-base text-text-secondary">
              {needsBackfill
                ? "You already have unlimited beta access. The deal that comes with it is two 2-minute check-ins — this one now, and one at the 2-week mark."
                : "Relatti is free while we test. The whole deal: your invite code plus this 2-minute check-in now, and a matching one at 2 weeks. That's it — no card, no charge."}
            </p>

            {!unlocked && (
              <>
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
              </>
            )}

            {/* ── The before check-in ── */}
            <label className="mt-6 block text-sm font-medium text-text-primary">
              How long have you been with your partner?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRelationshipLength(opt.value)}
                  className="rounded-md px-3.5 py-2 text-sm transition-colors"
                  style={
                    relationshipLength === opt.value
                      ? {
                          background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
                          color: "var(--color-primary)",
                          boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent)",
                        }
                      : { background: "var(--color-surface-100)", color: "var(--color-text-secondary)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="mt-6 block text-sm font-medium text-text-primary">
              How hopeful are you that coaching will help your relationship?
            </label>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setHopefulness(n)}
                  className="flex h-11 flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors"
                  style={
                    hopefulness === n
                      ? {
                          background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
                          color: "var(--color-primary)",
                          boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent)",
                        }
                      : { background: "var(--color-surface-100)", color: "var(--color-text-secondary)" }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-text-muted">
              <span>Honestly skeptical</span>
              <span>Very hopeful</span>
            </div>

            <label className="mt-6 block text-sm font-medium text-text-primary">
              What&apos;s the #1 thing you hope changes?
            </label>
            <textarea
              value={topChange}
              onChange={(e) => setTopChange(e.target.value)}
              rows={2}
              placeholder="In your own words — one line is plenty."
              className="mt-2 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            />

            <button
              onClick={() => setAck(!ack)}
              className="mt-5 flex w-full items-start gap-3 rounded-md bg-surface-50 p-4 text-left"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{
                  background: ack ? "var(--color-primary)" : "transparent",
                  boxShadow: ack ? "none" : "inset 0 0 0 1.5px var(--color-text-muted)",
                }}
              >
                {ack && <Check className="h-3.5 w-3.5" style={{ color: "var(--color-text-inverse)" }} />}
              </span>
              <span className="text-sm text-text-secondary">
                I&apos;ll do this check-in now and one more at the 2-week mark — that&apos;s the
                whole deal for free unlimited access.
              </span>
            </button>

            {status === "error" && (
              <p className="mt-3 text-sm text-danger">
                {errorMsg || "Something went wrong. Please try again."}
              </p>
            )}

            <button
              onClick={submit}
              disabled={status === "sending" || !surveyComplete || (!unlocked && !code.trim())}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
              }}
            >
              {status === "sending"
                ? "Saving…"
                : needsBackfill
                  ? "Save my check-in"
                  : "Unlock unlimited — free"}
            </button>

            <div className="mt-5 flex items-start gap-2.5 rounded-md bg-surface-50 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
              <p className="text-xs leading-relaxed text-text-muted">
                Your coaching conversations are never read, analyzed, or used for marketing or
                research — period. Check-in answers are used only anonymously, in aggregate
                (&ldquo;X% of testers&hellip;&rdquo;). A quote is published only if you
                explicitly say so later, attributed only how you choose. Your name and email are
                never published.{" "}
                <Link href="/privacy" className="underline underline-offset-2">
                  Privacy policy
                </Link>
              </p>
            </div>

            <p className="mt-3 text-center text-xs text-text-muted">
              {loading ? " " : <InfinityIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />}
              {loading ? "" : "No daily limit once unlocked. No payment, no card, ever during beta."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
