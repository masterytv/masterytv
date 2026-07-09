"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import BeforeCheckinFields, {
  EMPTY_BEFORE_CHECKIN,
  beforeCheckinComplete,
  type BeforeCheckinValue,
} from "./BeforeCheckinFields";

/**
 * The inline before check-in for testers who got beta access WITHOUT the /beta
 * flow — auto-enrolled partners, and legacy unlocks that predate the survey.
 * A link-away banner proved too easy to scroll past (founder-observed on the
 * first real dyad test), so the three questions live right on the dashboard:
 * answer once, card gone. Posts to /api/relatti/beta-survey (phase=before).
 */
export default function BetaPartnerCheckinCard({ partnerName }: { partnerName?: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState<BeforeCheckinValue>(EMPTY_BEFORE_CHECKIN);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit() {
    if (status === "sending" || !beforeCheckinComplete(value)) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/relatti/beta-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "before",
          relationshipLength: value.relationshipLength,
          hopefulness: value.hopefulness,
          topChange: value.topChange.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
      router.refresh();
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-surface-50 p-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "color-mix(in oklch, var(--color-accent-teal) 16%, transparent)" }}
        >
          <Check className="h-5 w-5" style={{ color: "var(--color-accent-teal)" }} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-sm font-semibold text-text-primary">
            That&apos;s it — you&apos;re all set
          </span>
          <span className="mt-0.5 block text-sm text-text-secondary">
            Free unlimited coaching for the whole beta. We&apos;ll email your 2-week check-in
            when it&apos;s time.
          </span>
        </span>
      </div>
    );
  }

  return (
    <section
      className="mb-6 rounded-2xl bg-surface-50 p-6"
      style={{
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 25%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
        <h2 className="font-display text-lg font-semibold text-text-primary">
          You&apos;re in the beta — free unlimited coaching
        </h2>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        {partnerName ? (
          <>
            <span className="font-medium text-text-primary">{partnerName}</span> got you in.
          </>
        ) : (
          "You have free access."
        )}{" "}
        The whole deal: these three questions now, and a short check-in at the 2-week mark.
        No card, no charge — ever during beta.
      </p>

      <BeforeCheckinFields value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} />

      {status === "error" && (
        <p className="mt-3 text-sm text-danger">{errorMsg || "Something went wrong. Please try again."}</p>
      )}

      <button
        onClick={submit}
        disabled={status === "sending" || !beforeCheckinComplete(value)}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
        }}
      >
        {status === "sending" ? "Saving…" : "Done — keep my free access"}
      </button>

      <p className="mt-3 flex items-start gap-2 text-xs text-text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-primary)" }} />
        <span>
          Answers are used only anonymously, in aggregate. Your coaching conversations are never
          read or used for anything.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>
        </span>
      </p>
    </section>
  );
}
