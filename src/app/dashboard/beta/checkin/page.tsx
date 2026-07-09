"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CSI4 } from "@/lib/decoded/instruments/addons";
import { Check, ArrowRight, ShieldCheck, MessageSquareQuote } from "lucide-react";

/**
 * The day-14 (after) beta check-in — the second half of the free-access deal.
 *
 * Re-administers CSI-4 VERBATIM (imported from the same instrument definition
 * the assessment uses, so the before/after delta is a real measured change on
 * a validated scale), then a few experience questions, then an optional public
 * quote gated on an explicit permission checkbox + attribution choice.
 * Posts to /api/relatti/beta-survey (phase=after); first submission wins.
 */

const IMPROVED_OPTIONS = [
  { value: "much_better", label: "A lot better" },
  { value: "somewhat_better", label: "Somewhat better" },
  { value: "same", label: "About the same" },
  { value: "somewhat_worse", label: "Somewhat worse" },
  { value: "much_worse", label: "A lot worse" },
];

const ATTRIBUTION_OPTIONS = [
  { value: "first_name", label: "My first name" },
  { value: "initials", label: "My initials" },
  { value: "anonymous", label: "Anonymous" },
];

export default function BetaCheckinPage() {
  const [csi, setCsi] = useState<Record<string, number>>({});
  const [improved, setImproved] = useState("");
  const [recommend, setRecommend] = useState(-1);
  const [whatChanged, setWhatChanged] = useState("");
  const [shouldFix, setShouldFix] = useState("");
  const [testimonial, setTestimonial] = useState("");
  const [quotePermission, setQuotePermission] = useState(false);
  const [quoteAttribution, setQuoteAttribution] = useState("first_name");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/relatti/beta-survey")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s?.after && setStatus("already"))
      .catch(() => {});
  }, []);

  const complete =
    CSI4.items.every((it) => csi[String(it.index)] != null) && improved && recommend >= 0;

  async function submit() {
    if (status === "sending" || !complete) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/relatti/beta-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "after",
          csi,
          improved,
          recommend,
          whatChanged: whatChanged.trim(),
          shouldFix: shouldFix.trim(),
          testimonial: testimonial.trim(),
          quotePermission,
          quoteAttribution,
        }),
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

  if (status === "done" || status === "already") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-xl px-6 py-12">
          <div className="rounded-xl bg-surface-50 p-8">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklch, var(--color-accent-teal) 16%, transparent)" }}
            >
              <Check className="h-6 w-6" style={{ color: "var(--color-accent-teal)" }} />
            </div>
            <h1 className="text-headline-lg text-text-primary">
              {status === "already" ? "Already done — thank you." : "That's everything. Thank you."}
            </h1>
            <p className="mt-3 text-base text-text-secondary">
              Both check-ins are complete — that&apos;s the whole deal, and your unlimited access
              continues for the rest of the beta. What you shared genuinely shapes what we build
              next.
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
        </div>
      </div>
    );
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
          Beta · 2-week check-in
        </span>
        <h1 className="text-headline-lg mt-6 text-text-primary">How are things two weeks in?</h1>
        <p className="mt-3 text-base text-text-secondary">
          Three minutes, and it completes the beta deal. Straight answers help most — including
          the unflattering ones.
        </p>

        {/* ── CSI-4, verbatim ── */}
        <div className="mt-8 space-y-7">
          {CSI4.items.map((item) => {
            const scale = item.scaleOverride!;
            const key = String(item.index);
            return (
              <div key={item.index}>
                <p className="text-sm font-medium text-text-primary">{item.text}</p>
                <div className="mt-2.5 flex gap-1.5 sm:gap-2">
                  {scale.labels.map((label, i) => {
                    const value = scale.min + i;
                    const active = csi[key] === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setCsi((prev) => ({ ...prev, [key]: value }))}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 transition-colors"
                        style={
                          active
                            ? {
                                background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
                                boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent)",
                              }
                            : { background: "var(--color-surface-100)" }
                        }
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                          style={
                            active
                              ? { background: "var(--color-primary)", color: "var(--color-text-inverse)" }
                              : { color: "var(--color-text-secondary)" }
                          }
                        >
                          {value}
                        </span>
                        <span
                          className="whitespace-pre-line text-center text-[10px] leading-tight sm:text-xs"
                          style={{ color: active ? "var(--color-primary)" : "var(--color-text-muted)" }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Experience ── */}
          <div>
            <p className="text-sm font-medium text-text-primary">
              Since starting with the coach, your relationship feels&hellip;
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {IMPROVED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setImproved(opt.value)}
                  className="rounded-md px-3.5 py-2 text-sm transition-colors"
                  style={
                    improved === opt.value
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
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary">
              How likely are you to recommend Relatti to a friend?
            </p>
            <div className="mt-2.5 flex gap-1 sm:gap-1.5">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  onClick={() => setRecommend(n)}
                  className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-md text-xs font-medium transition-colors sm:text-sm"
                  style={
                    recommend === n
                      ? {
                          background: "var(--color-primary)",
                          color: "var(--color-text-inverse)",
                        }
                      : { background: "var(--color-surface-100)", color: "var(--color-text-secondary)" }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-text-muted">
              <span>Not likely</span>
              <span>Extremely likely</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary">
              What changed for you, if anything? <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              value={whatChanged}
              onChange={(e) => setWhatChanged(e.target.value)}
              rows={3}
              placeholder="A moment, a pattern, a conversation that went differently…"
              className="mt-2 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary">
              What should we fix or improve? <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              value={shouldFix}
              onChange={(e) => setShouldFix(e.target.value)}
              rows={3}
              placeholder="Anything confusing, annoying, or missing."
              className="mt-2 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            />
          </div>

          {/* ── Optional public quote ── */}
          <div className="rounded-xl bg-surface-50 p-5">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm font-semibold text-text-primary">
                A sentence we could share publicly? <span className="font-normal text-text-muted">(optional)</span>
              </p>
            </div>
            <textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              rows={2}
              placeholder='e.g. "We were doubtful an app could help — two weeks later we argue completely differently."'
              className="mt-3 w-full resize-none rounded-md bg-surface-100 p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              style={{ border: "1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            />
            <button
              onClick={() => setQuotePermission(!quotePermission)}
              disabled={!testimonial.trim()}
              className="mt-3 flex w-full items-start gap-3 text-left disabled:opacity-50"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{
                  background: quotePermission ? "var(--color-primary)" : "transparent",
                  boxShadow: quotePermission ? "none" : "inset 0 0 0 1.5px var(--color-text-muted)",
                }}
              >
                {quotePermission && (
                  <Check className="h-3.5 w-3.5" style={{ color: "var(--color-text-inverse)" }} />
                )}
              </span>
              <span className="text-sm text-text-secondary">
                Relatti may share this quote publicly. Without this box, it stays private — no
                exceptions.
              </span>
            </button>
            {quotePermission && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ATTRIBUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setQuoteAttribution(opt.value)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                    style={
                      quoteAttribution === opt.value
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
            )}
          </div>
        </div>

        {status === "error" && (
          <p className="mt-4 text-sm text-danger">
            {errorMsg || "Something went wrong. Please try again."}
            {errorMsg.includes("first check-in") && (
              <>
                {" "}
                <Link href="/dashboard/beta" className="underline underline-offset-2">
                  Go to the beta page
                </Link>
              </>
            )}
          </p>
        )}

        <button
          onClick={submit}
          disabled={status === "sending" || !complete}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
          }}
        >
          {status === "sending" ? "Saving…" : "Finish my check-in"}
        </button>

        <div className="mt-5 flex items-start gap-2.5 rounded-md bg-surface-50 p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
          <p className="text-xs leading-relaxed text-text-muted">
            Same promise as always: your coaching conversations are never read or used for
            anything. These answers are used anonymously, in aggregate — and your quote only
            with the box above checked.{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
