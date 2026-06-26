"use client";

/**
 * RitualCard — the "Today's Question" daily connection ritual
 * (RELATTI_EXPERIENCE.md §5.9). The primary recurring action on the Relatti
 * dashboard. Blind-reveal for dyads (answer independently, reveal together);
 * a single reflection + invite nudge for solo users (full value, never gated).
 *
 * BRAND.md: Lucide-only icons (no sparkles), semantic tokens (--color-primary,
 * surface and text scales), Manrope via font-display, light + dark safe. No 1px
 * structural borders — tonal surfaces only.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageCircleHeart,
  Send,
  Eye,
  Clock,
  ArrowRight,
  Check,
  UserPlus,
} from "lucide-react";
import type { RitualView, RitualCadence } from "@/lib/relatti/ritual";
import { submitRitualResponse, setRitualCadence } from "@/lib/relatti/ritual-actions";

const DEPTH_LABEL: Record<string, string> = {
  light: "Lighthearted",
  medium: "Going deeper",
  deep: "Heart to heart",
};

function coachLink(promptText: string): string {
  return `/dashboard/chat?context=ritual&topic=${encodeURIComponent(promptText)}`;
}

export default function RitualCard({ view }: { view: RitualView }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (view.state === "empty") return null;

  function submit() {
    if (!view.prompt) return;
    const text = answer.trim();
    if (!text) {
      setError("Write a short answer first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitRitualResponse(view.prompt!.id, text, view.engagementId);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setAnswer("");
      router.refresh();
    });
  }

  function changeCadence(next: RitualCadence) {
    if (next === view.cadence) return;
    startTransition(async () => {
      await setRitualCadence(next);
      router.refresh();
    });
  }

  return (
    <section className="mb-8 rounded-2xl bg-surface-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
          >
            <MessageCircleHeart className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
              Today&rsquo;s question
            </p>
            {view.prompt && (
              <p className="text-xs uppercase tracking-wide text-text-muted">
                {DEPTH_LABEL[view.prompt.depth] ?? "Connection"}
              </p>
            )}
          </div>
        </div>
        <CadenceToggle current={view.cadence} disabled={pending} onChange={changeCadence} />
      </div>

      {/* The prompt */}
      {view.prompt && (
        <h2 className="mt-5 font-display text-xl font-semibold leading-snug text-text-primary">
          {view.prompt.text}
        </h2>
      )}

      {/* State-specific body */}
      <div className="mt-5">
        {view.state === "answer" && (
          <AnswerForm
            answer={answer}
            setAnswer={setAnswer}
            onSubmit={submit}
            pending={pending}
            error={error}
            mode={view.mode}
            partnerName={view.partnerName}
            partnerAnsweredActive={view.partnerAnsweredActive}
          />
        )}

        {view.state === "waiting" && (
          <WaitingPanel myAnswer={view.myAnswer} partnerName={view.partnerName} />
        )}

        {view.state === "reveal" && view.prompt && (
          <RevealPanel
            myAnswer={view.myAnswer}
            partnerAnswer={view.partnerAnswer}
            partnerName={view.partnerName}
            promptText={view.prompt.text}
          />
        )}

        {view.state === "solo_reflection" && view.prompt && (
          <SoloReflectionPanel
            myAnswer={view.myAnswer}
            promptText={view.prompt.text}
            nextUnlockLabel={view.nextUnlockLabel}
          />
        )}

        {view.state === "resting" && (
          <RestingPanel nextUnlockLabel={view.nextUnlockLabel} mode={view.mode} partnerName={view.partnerName} />
        )}
      </div>
    </section>
  );
}

/* ── Cadence toggle ─────────────────────────────────────────────────── */
function CadenceToggle({
  current,
  disabled,
  onChange,
}: {
  current: RitualCadence;
  disabled: boolean;
  onChange: (c: RitualCadence) => void;
}) {
  const options: { value: RitualCadence; label: string }[] = [
    { value: "3x_week", label: "3×/week" },
    { value: "daily", label: "Daily" },
  ];
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-100 p-1">
      {options.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60"
            style={
              active
                ? { background: "var(--color-primary-container)", color: "var(--color-text-inverse)" }
                : { color: "var(--color-text-secondary)" }
            }
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Answer form ────────────────────────────────────────────────────── */
function AnswerForm({
  answer,
  setAnswer,
  onSubmit,
  pending,
  error,
  mode,
  partnerName,
  partnerAnsweredActive,
}: {
  answer: string;
  setAnswer: (v: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
  mode: "solo" | "dyad";
  partnerName: string;
  partnerAnsweredActive: boolean;
}) {
  return (
    <div>
      {mode === "dyad" && (
        <p className="mb-3 text-sm text-text-secondary">
          {partnerAnsweredActive ? (
            <span className="font-medium text-text-primary">
              {partnerName} already answered — write yours to see what they said.
            </span>
          ) : (
            <>You both answer on your own. Neither of you sees the other&rsquo;s answer until you&rsquo;ve both replied.</>
          )}
        </p>
      )}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Take a minute — there&rsquo;s no wrong answer."
        className="w-full resize-none rounded-xl bg-surface-100 p-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        style={{ boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--color-primary-container)" }}
      >
        <Send className="h-4 w-4" />
        {pending ? "Saving…" : "Share my answer"}
      </button>
    </div>
  );
}

/* ── Dyad: waiting on partner (the curiosity hook) ──────────────────── */
function WaitingPanel({
  myAnswer,
  partnerName,
}: {
  myAnswer: string | null;
  partnerName: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-3 text-sm text-text-secondary">
        <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
        <span>
          You answered — <span className="font-medium text-text-primary">{partnerName}</span> hasn&rsquo;t yet.
          You&rsquo;ll both see each other&rsquo;s answers once they reply.
        </span>
      </div>
      {myAnswer && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Your answer</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{myAnswer}</p>
        </div>
      )}
    </div>
  );
}

/* ── Dyad: both answered → reveal ───────────────────────────────────── */
function RevealPanel({
  myAnswer,
  partnerAnswer,
  partnerName,
  promptText,
}: {
  myAnswer: string | null;
  partnerAnswer: string | null;
  partnerName: string;
  promptText: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-primary)" }}>
        <Eye className="h-4 w-4" />
        You both answered
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-100 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">You</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{myAnswer ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-surface-100 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">{partnerName}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{partnerAnswer ?? "—"}</p>
        </div>
      </div>
      <Link
        href={coachLink(promptText)}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
        style={{ color: "var(--color-primary)" }}
      >
        Talk to your coach about this
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ── Solo: reflection + invite nudge ────────────────────────────────── */
function SoloReflectionPanel({
  myAnswer,
  promptText,
  nextUnlockLabel,
}: {
  myAnswer: string | null;
  promptText: string;
  nextUnlockLabel: string | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-primary)" }}>
        <Check className="h-4 w-4" />
        Answered
      </div>
      {myAnswer && (
        <div className="mt-3 rounded-xl bg-surface-100 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Your answer</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{myAnswer}</p>
        </div>
      )}
      <p className="mt-4 text-sm text-text-secondary">
        Sitting with a question like this is its own kind of work. Want to go further? Your coach can help you
        unpack it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={coachLink(promptText)}
          className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: "var(--color-primary)" }}
        >
          Talk it through with your coach
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-100 px-4 py-3">
        <UserPlus className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Do this together.</span> Invite your partner and
          you&rsquo;ll each answer, then see what the other said.
        </p>
      </div>
      {nextUnlockLabel && (
        <p className="mt-3 text-xs text-text-muted">Your next question unlocks {nextUnlockLabel.toLowerCase()}.</p>
      )}
    </div>
  );
}

/* ── Bank exhausted / resting ───────────────────────────────────────── */
function RestingPanel({
  nextUnlockLabel,
  mode,
  partnerName,
}: {
  nextUnlockLabel: string | null;
  mode: "solo" | "dyad";
  partnerName: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-3 text-sm text-text-secondary">
      <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
      <span>
        {mode === "dyad"
          ? `You're all caught up with ${partnerName}.`
          : "You're all caught up."}{" "}
        {nextUnlockLabel ? `Your next question unlocks ${nextUnlockLabel.toLowerCase()}.` : ""}
      </span>
    </div>
  );
}
