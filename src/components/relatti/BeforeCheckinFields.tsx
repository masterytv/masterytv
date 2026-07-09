"use client";

import { Check } from "lucide-react";

/**
 * The BEFORE check-in questions — the single source of truth for the fields,
 * shared by /beta (offer page), /dashboard/beta (unlock + backfill), and the
 * dashboard partner-enroll card. Dumb + controlled: parents own state and
 * submission; this renders the three questions + the deal acknowledgment.
 */

export interface BeforeCheckinValue {
  relationshipLength: string;
  hopefulness: number;
  topChange: string;
  ack: boolean;
}

export const EMPTY_BEFORE_CHECKIN: BeforeCheckinValue = {
  relationshipLength: "",
  hopefulness: 0,
  topChange: "",
  ack: false,
};

export function beforeCheckinComplete(v: BeforeCheckinValue): boolean {
  return !!(v.relationshipLength && v.hopefulness >= 1 && v.topChange.trim() && v.ack);
}

const LENGTH_OPTIONS = [
  { value: "lt1", label: "Under a year" },
  { value: "y1_3", label: "1–3 years" },
  { value: "y3_7", label: "3–7 years" },
  { value: "y7_15", label: "7–15 years" },
  { value: "gt15", label: "15+ years" },
];

const active = {
  background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
  color: "var(--color-primary)",
  boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent)",
} as const;
const inactive = {
  background: "var(--color-surface-100)",
  color: "var(--color-text-secondary)",
} as const;

export default function BeforeCheckinFields({
  value,
  onChange,
}: {
  value: BeforeCheckinValue;
  onChange: (patch: Partial<BeforeCheckinValue>) => void;
}) {
  return (
    <>
      <label className="mt-6 block text-sm font-medium text-text-primary">
        How long have you been with your partner?
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {LENGTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ relationshipLength: opt.value })}
            className="rounded-md px-3.5 py-2 text-sm transition-colors"
            style={value.relationshipLength === opt.value ? active : inactive}
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
            onClick={() => onChange({ hopefulness: n })}
            className="flex h-11 flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors"
            style={value.hopefulness === n ? active : inactive}
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
        value={value.topChange}
        onChange={(e) => onChange({ topChange: e.target.value })}
        rows={2}
        placeholder="In your own words — one line is plenty."
        className="mt-2 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
        style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
      />

      <button
        onClick={() => onChange({ ack: !value.ack })}
        className="mt-5 flex w-full items-start gap-3 rounded-md bg-surface-100 p-4 text-left"
      >
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
          style={{
            background: value.ack ? "var(--color-primary)" : "transparent",
            boxShadow: value.ack ? "none" : "inset 0 0 0 1.5px var(--color-text-muted)",
          }}
        >
          {value.ack && <Check className="h-3.5 w-3.5" style={{ color: "var(--color-text-inverse)" }} />}
        </span>
        <span className="text-sm text-text-secondary">
          I&apos;ll do this check-in now and one more at the 2-week mark — that&apos;s the whole
          deal for free unlimited access.
        </span>
      </button>
    </>
  );
}
