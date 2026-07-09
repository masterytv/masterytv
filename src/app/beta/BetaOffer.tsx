"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { RelattiMark } from "@/components/relatti/RelattiMark";
import BeforeCheckinFields, {
  EMPTY_BEFORE_CHECKIN,
  beforeCheckinComplete,
  type BeforeCheckinValue,
} from "@/components/relatti/BeforeCheckinFields";
import {
  Infinity as InfinityIcon,
  Users,
  ShieldCheck,
  Check,
  ArrowRight,
  KeyRound,
  Loader2,
} from "lucide-react";

/**
 * The /beta offer form. Two exits:
 *   • signed OUT → stores {code + before-answers} in the `beta_offer` cookie
 *     (30 days, same pattern as pending_invite) and sends them into the normal
 *     Get Started flow; the dashboard auto-redeems after their assessment.
 *   • signed IN  → redeems immediately via /api/relatti/beta-unlock.
 * A code carried on the link (?code=) is validated up front and the field is
 * hidden — a dead or full link says so BEFORE anyone invests in signing up.
 */

type CodeStatus = "checking" | "live" | "invalid" | "expired" | "full" | "none";

export default function BetaOffer({ initialCode }: { initialCode: string }) {
  const { user } = useUser();
  const [code, setCode] = useState(initialCode);
  const [codeStatus, setCodeStatus] = useState<CodeStatus>(initialCode ? "checking" : "none");
  const [checkin, setCheckin] = useState<BeforeCheckinValue>(EMPTY_BEFORE_CHECKIN);
  const [status, setStatus] = useState<"idle" | "sending" | "unlocked" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Validate a link-carried code up front so a dead link fails honestly here.
  useEffect(() => {
    if (!initialCode) return;
    fetch(`/api/relatti/beta-code-status?code=${encodeURIComponent(initialCode)}`)
      .then((r) => (r.ok ? r.json() : { status: "error" }))
      .then((d) => setCodeStatus(d.status === "live" ? "live" : (d.status as CodeStatus)))
      .catch(() => setCodeStatus("live")); // network hiccup: don't block; redemption re-checks
  }, [initialCode]);

  const codeHidden = codeStatus === "checking" || codeStatus === "live";
  const canSubmit = beforeCheckinComplete(checkin) && code.trim() && codeStatus !== "checking";

  async function claim() {
    if (status === "sending" || !canSubmit) return;
    setStatus("sending");
    setErrorMsg("");
    const survey = {
      relationshipLength: checkin.relationshipLength,
      hopefulness: checkin.hopefulness,
      topChange: checkin.topChange.trim(),
    };

    // Signed in → redeem right now.
    if (user) {
      try {
        const res = await fetch("/api/relatti/beta-unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim(), survey, source: "/beta" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(data.error || "Something went wrong. Please try again.");
          setStatus("error");
          return;
        }
        setStatus("unlocked");
      } catch {
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      }
      return;
    }

    // Signed out → carry everything through signup in a cookie, then Get Started.
    const payload = encodeURIComponent(JSON.stringify({ code: code.trim(), ...survey }));
    document.cookie = `beta_offer=${payload}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    window.location.href = "/assess";
  }

  return (
    <main className="min-h-screen bg-surface-0 font-sans text-text-primary">
      {/* Minimal header */}
      <header className="mx-auto flex max-w-2xl items-center gap-2.5 px-6 py-5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "color-mix(in oklch, var(--color-primary-container) 16%, transparent)" }}
        >
          <RelattiMark className="h-4 w-4" />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight">Relatti</span>
      </header>

      <div className="mx-auto max-w-2xl px-6 pb-16 pt-6">
        {status === "unlocked" ? (
          <div className="rounded-2xl bg-surface-50 p-8">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklch, var(--color-accent-teal) 16%, transparent)" }}
            >
              <Check className="h-6 w-6" style={{ color: "var(--color-accent-teal)" }} />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">You&apos;re in.</h1>
            <p className="mt-3 text-base text-text-secondary">
              Unlimited coaching is unlocked for the rest of the beta — no card, no charge.
              We&apos;ll email you the 2-week check-in when it&apos;s time.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
              }}
            >
              Go to your dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <span
              className="text-label-sm rounded-full px-2.5 py-1"
              style={{
                color: "var(--color-primary)",
                background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
              }}
            >
              Free beta
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              A coach for your relationship — free while we test it
            </h1>
            <p className="mt-4 text-base text-text-secondary">
              Relatti is a relationship coach grounded in each partner&rsquo;s real
              psychology. You take a short research-backed quiz, your partner takes theirs, and
              you get a coach that understands you both — plus your shared compatibility report.
            </p>
            <p className="mt-3 text-base text-text-secondary">
              <span className="font-semibold text-text-primary">The whole deal:</span> answer
              three questions now and a short check-in at the 2-week mark. In return, everything
              is free and unlimited for the entire beta. No card, ever.
            </p>

            {/* What you get */}
            <div className="mt-6 space-y-3 rounded-2xl bg-surface-50 p-6">
              {[
                { icon: InfinityIcon, head: "Unlimited coaching", sub: "No daily cap for you — or your partner." },
                { icon: Users, head: "Built for both of you", sub: "Invite your partner free; the coach understands the two of you together." },
                { icon: ShieldCheck, head: "Private by design", sub: "What you tell your coach is never shared with your partner." },
              ].map(({ icon: Icon, head, sub }) => (
                <div key={head} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--color-primary)" }} />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{head}</p>
                    <p className="text-sm text-text-secondary">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Code — hidden while a link-carried code is valid */}
            {codeHidden ? (
              <p className="mt-6 flex items-center gap-2 text-sm text-text-secondary">
                {codeStatus === "checking" ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-primary)" }} />
                ) : (
                  <KeyRound className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                )}
                {codeStatus === "checking" ? (
                  "Checking your invite…"
                ) : (
                  <>
                    Invite code <span className="font-semibold text-text-primary">{code.toUpperCase()}</span> applied.
                  </>
                )}
              </p>
            ) : (
              <>
                {codeStatus !== "none" && (
                  <p className="mt-6 text-sm text-danger">
                    {codeStatus === "full"
                      ? "That invite link has been fully claimed. If you have another code, enter it below — or reach out and we'll sort you out."
                      : codeStatus === "expired"
                        ? "That invite link is no longer active. If you have another code, enter it below."
                        : "We don't recognize that invite code. Double-check the link, or enter a code below."}
                  </p>
                )}
                <label className={`${codeStatus === "none" ? "mt-6" : "mt-3"} block text-sm font-medium text-text-primary`}>
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
            <BeforeCheckinFields value={checkin} onChange={(patch) => setCheckin((v) => ({ ...v, ...patch }))} />

            {status === "error" && (
              <p className="mt-3 text-sm text-danger">{errorMsg || "Something went wrong. Please try again."}</p>
            )}

            <button
              onClick={claim}
              disabled={status === "sending" || !canSubmit}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
              }}
            >
              {status === "sending" ? (
                "One moment…"
              ) : user ? (
                "Unlock my free access"
              ) : (
                <>
                  Claim free access &amp; get started
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {!user && (
              <p className="mt-3 text-center text-xs text-text-muted">
                Next: create your account and take the 10-minute relationship quiz. Your free
                access applies automatically when you finish — nothing to remember.
              </p>
            )}

            <div className="mt-6 flex items-start gap-2.5 rounded-md bg-surface-50 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
              <p className="text-xs leading-relaxed text-text-muted">
                Your coaching conversations are never read, analyzed, or used for marketing or
                research — period. Check-in answers are used only anonymously, in aggregate. A
                quote is published only if you explicitly say so later, attributed only how you
                choose. Your name and email are never published.{" "}
                <Link href="/privacy" className="underline underline-offset-2">
                  Privacy policy
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
