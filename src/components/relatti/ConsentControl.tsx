"use client";

/**
 * ConsentControl (PB2.3) — lets a partner see + change what the coach can use
 * about them in the relationship. Writes through /api/decoded/invite-consent
 * (the battle-tested flow that dual-writes the level to the participant spine).
 *
 * The level is the dyad's shared coach-visibility setting (decoded_invites
 * .share_with_coach): none | type_compatibility | full. BRAND.md: Lucide only
 * (no sparkles), semantic tokens, light + dark.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Check, Loader2 } from "lucide-react";

type Level = "none" | "type_compatibility" | "full";

const OPTIONS: { value: Level; label: string; desc: string }[] = [
  {
    value: "full",
    label: "Full profile",
    desc: "Your coach can use your complete assessment to coach the relationship.",
  },
  {
    value: "type_compatibility",
    label: "Archetype & Blueprint",
    desc: "Your coach sees your archetype and your shared Blueprint — not your full assessment.",
  },
  {
    value: "none",
    label: "Private",
    desc: "Your coach won't use your profile. You can still talk, but it won't reference your results.",
  },
];

export default function ConsentControl({
  inviteId,
  currentLevel,
}: {
  inviteId: string;
  currentLevel: string;
}) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>((currentLevel as Level) || "none");
  const [saving, setSaving] = useState<Level | null>(null);
  const [error, setError] = useState(false);

  async function choose(next: Level) {
    if (next === level || saving) return;
    setSaving(next);
    setError(false);
    try {
      const res = await fetch("/api/decoded/invite-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, shareLevel: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLevel(next);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl bg-surface-50 p-6">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
        <h2 className="font-display text-lg font-semibold text-text-primary">
          What your coach can see
        </h2>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        You control how much of your profile the coach uses. Your private conversations
        are never shared with your partner regardless of this setting.
      </p>

      <div className="mt-4 space-y-2">
        {OPTIONS.map((opt) => {
          const active = level === opt.value;
          const isSaving = saving === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => choose(opt.value)}
              disabled={!!saving}
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
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--color-text-muted)" }} />
                ) : active ? (
                  <Check className="h-3 w-3" style={{ color: "var(--color-text-inverse)" }} />
                ) : null}
              </span>
              <span>
                <span className="block text-sm font-medium text-text-primary">{opt.label}</span>
                <span className="mt-0.5 block text-sm text-text-secondary">{opt.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger">Couldn&apos;t update — please try again.</p>
      )}
    </section>
  );
}
