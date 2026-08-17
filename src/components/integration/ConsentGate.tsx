"use client";

/**
 * The consent screen — INTEGRATION_SPRINT.md §3 / I5.5, EXPERIENCE §5.2.
 *
 * It replaces the composer after the first exchange and before the second, so
 * the ordering the spec insists on is structural rather than remembered: they
 * type the hardest thing they have ever written, they get answered, and only
 * then does anything ask them for something.
 *
 * Deliberately NOT a dismissible banner. A consent somebody can scroll past is
 * the checkbox this exists to replace, and the point of a standalone screen is
 * that it happened as its own moment, at a version, at a time.
 *
 * BRAND.md: Lucide icons only, semantic tokens only, no hardcoded colour. The
 * type utilities used here are the ones globals.css actually implements —
 * `text-body-*` and `text-title-*` appear elsewhere in this app and are defined
 * nowhere, so they render as nothing and are not propagated into new work.
 */

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  INTEGRATION_AGE_ATTESTATION,
  INTEGRATION_DISCLOSURES,
} from "@/lib/platform/integration-consent";

interface ConsentGateProps {
  /** Called once the row is written, so the caller can retry the held message. */
  onAccepted: () => void;
}

export default function ConsentGate({ onAccepted }: ConsentGateProps) {
  const [ageAttested, setAgeAttested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function accept() {
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch("/api/integration/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageAttested: true }),
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      onAccepted();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="consent-heading"
      className="glass rounded-xl p-6 shadow-elevated"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
        >
          <ShieldCheck className="h-5 w-5" style={{ color: "var(--color-primary)" }} aria-hidden="true" />
        </span>
        <div>
          <h2 id="consent-heading" className="text-headline-md text-text-primary">
            Before we go on
          </h2>
          <p className="text-sm text-text-secondary">
            Six things worth knowing, and one question.
          </p>
        </div>
      </div>

      <dl className="mt-6 space-y-5">
        {INTEGRATION_DISCLOSURES.map((d) => (
          <div key={d.key}>
            <dt className="text-base font-semibold text-text-primary">{d.title}</dt>
            <dd className="mt-1 text-sm text-text-secondary">{d.body}</dd>
          </div>
        ))}
      </dl>

      <label className="mt-6 flex items-start gap-3 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={ageAttested}
          onChange={(e) => setAgeAttested(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded"
          style={{ accentColor: "var(--color-primary)" }}
        />
        <span>{INTEGRATION_AGE_ATTESTATION}</span>
      </label>

      <button
        type="button"
        onClick={accept}
        disabled={!ageAttested || saving}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-label-md text-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundImage: "linear-gradient(135deg, var(--cta-from), var(--cta-to))" }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        I understand, and I want to keep going
      </button>

      {failed ? (
        <p role="alert" className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>
          That did not save. Try once more.
        </p>
      ) : null}
    </section>
  );
}
