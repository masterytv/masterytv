"use client";

/**
 * ConsentControl — the two-axis sharing surface on the Relatti dashboard.
 *
 *   1. "What your coach can see"   — PER-PERSON, unilateral. Sets your own
 *      participant.coach_share_level via /api/relatti/coach-visibility. Applies
 *      immediately; your partner is never involved.
 *   2. "What your partner can see" — NEGOTIATED for the couple. RAISING the level
 *      sends a request your partner must accept (a notice appears for them);
 *      LOWERING (incl. Private) applies immediately. Via /api/relatti/partner-sharing.
 *
 * BRAND.md: Lucide-only single-color icons (no sparkles), semantic tokens, light
 * + dark safe, ghost inset borders only.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Users, Check, Loader2, Clock } from "lucide-react";

type Level = "none" | "type_compatibility" | "full";

const RANK: Record<Level, number> = { none: 0, type_compatibility: 1, full: 2 };
const LABEL: Record<Level, string> = {
  none: "Private",
  type_compatibility: "Archetype & Blueprint",
  full: "Full profile",
};

const COACH_OPTIONS: { value: Level; label: string; desc: string }[] = [
  { value: "full", label: "Full profile", desc: "Your coach uses your complete assessment to coach the relationship." },
  { value: "type_compatibility", label: "Archetype & Blueprint", desc: "Your coach uses your archetype and your shared Blueprint — not your full assessment." },
  { value: "none", label: "Private", desc: "Your coach won't use your profile. You can still talk; it just won't reference your results." },
];

const PARTNER_OPTIONS: { value: Level; label: string; desc: string }[] = [
  { value: "full", label: "Full profile", desc: "Your compatibility view can draw on your complete assessment." },
  { value: "type_compatibility", label: "Archetype & Blueprint", desc: "Shares your archetype and your Blueprint — enough for your compatibility report." },
  { value: "none", label: "Private", desc: "Nothing from your profile is shared with your partner, and your compatibility report pauses." },
];

function norm(level: string): Level {
  if (level === "full") return "full";
  if (level === "type_compatibility" || level === "compatibility") return "type_compatibility";
  return "none";
}

export default function ConsentControl({
  inviteId,
  engagementId,
  partnerName,
  coachLevel,
  partnerLevel,
  pending,
}: {
  inviteId: string;
  engagementId: string;
  partnerName: string;
  coachLevel: string;
  partnerLevel: string;
  pending: { level: string; byMe: boolean } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const coach = norm(coachLevel);
  const agreed = norm(partnerLevel);

  async function post(url: string, bodyObj: unknown, tag: string) {
    if (busy) return;
    setBusy(tag);
    setError(false);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  function chooseCoach(next: Level) {
    if (next === coach) return;
    post("/api/relatti/coach-visibility", { engagementId, level: next }, `coach-${next}`);
  }

  function choosePartner(next: Level) {
    if (next === agreed) return;
    const action = RANK[next] > RANK[agreed] ? "request" : "lower";
    post("/api/relatti/partner-sharing", { inviteId, action, level: next }, `partner-${next}`);
  }

  return (
    <div className="mt-8 space-y-4">
      {/* ── Axis 1: coach (per-person, immediate) ── */}
      <section className="rounded-2xl bg-surface-50 p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
          <h2 className="font-display text-lg font-semibold text-text-primary">What your coach can see</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          How much of your own profile your coach uses. This is just for you — your partner isn&rsquo;t
          affected, and your private conversations are never shared with them.
        </p>
        <div className="mt-4 space-y-2">
          {COACH_OPTIONS.map((opt) => (
            <RadioRow
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              active={coach === opt.value}
              saving={busy === `coach-${opt.value}`}
              disabled={!!busy}
              onClick={() => chooseCoach(opt.value)}
            />
          ))}
        </div>
      </section>

      {/* ── Axis 2: partner (negotiated) ── */}
      <section className="rounded-2xl bg-surface-50 p-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
          <h2 className="font-display text-lg font-semibold text-text-primary">What your partner can see</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          How much of your profile feeds your shared compatibility report. Sharing more needs you both to
          agree; you can always share less right away.
        </p>

        {/* Pending-request notice */}
        {pending && !pending.byMe && (
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: "color-mix(in oklch, var(--color-primary) 10%, transparent)" }}
          >
            <p className="text-sm text-text-primary">
              <span className="font-semibold">{partnerName}</span> wants to share{" "}
              <span className="font-semibold">{LABEL[norm(pending.level)]}</span> for your compatibility report.
              It won&rsquo;t change until you agree.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => post("/api/relatti/partner-sharing", { inviteId, action: "accept" }, "accept")}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: "var(--color-primary-container)" }}
              >
                {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Agree &amp; share
              </button>
              <button
                onClick={() => post("/api/relatti/partner-sharing", { inviteId, action: "decline" }, "decline")}
                disabled={!!busy}
                className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
              >
                Not now
              </button>
            </div>
          </div>
        )}
        {pending && pending.byMe && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-100 p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-sm text-text-secondary">
              Waiting for <span className="font-medium text-text-primary">{partnerName}</span> to agree to{" "}
              <span className="font-medium text-text-primary">{LABEL[norm(pending.level)]}</span>.{" "}
              <button
                onClick={() => post("/api/relatti/partner-sharing", { inviteId, action: "decline" }, "decline")}
                disabled={!!busy}
                className="font-medium underline underline-offset-2 disabled:opacity-60"
                style={{ color: "var(--color-primary)" }}
              >
                Cancel request
              </button>
            </p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {PARTNER_OPTIONS.map((opt) => {
            const needsAgreement = RANK[opt.value] > RANK[agreed];
            return (
              <RadioRow
                key={opt.value}
                label={opt.label}
                desc={opt.desc}
                active={agreed === opt.value}
                saving={busy === `partner-${opt.value}`}
                disabled={!!busy}
                hint={needsAgreement ? `Needs ${partnerName}'s agreement` : undefined}
                onClick={() => choosePartner(opt.value)}
              />
            );
          })}
        </div>
      </section>

      {error && <p className="text-sm text-danger">Couldn&apos;t update — please try again.</p>}
    </div>
  );
}

function RadioRow({
  label,
  desc,
  active,
  saving,
  disabled,
  hint,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  saving: boolean;
  disabled: boolean;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors disabled:opacity-60"
      style={{
        background: active
          ? "color-mix(in oklch, var(--color-primary) 10%, transparent)"
          : "var(--color-surface-100)",
        boxShadow: active
          ? "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent)"
          : "none",
      }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          background: active ? "var(--color-primary)" : "transparent",
          boxShadow: active ? "none" : "inset 0 0 0 1.5px var(--color-text-muted)",
        }}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--color-text-muted)" }} />
        ) : active ? (
          <Check className="h-3 w-3" style={{ color: "var(--color-text-inverse)" }} />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {hint && <span className="text-[0.68rem] font-medium text-text-muted">{hint}</span>}
        </span>
        <span className="mt-0.5 block text-sm text-text-secondary">{desc}</span>
      </span>
    </button>
  );
}
