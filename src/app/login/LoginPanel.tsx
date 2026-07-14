"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Loader2, ArrowRight, Eye, EyeOff, User, Mail, Check, Fingerprint } from "lucide-react";
import { RelattiMark } from "@/components/relatti/RelattiMark";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import type { BrandId } from "@/lib/platform/brand";
import { LEGAL_VERSION } from "@/lib/platform/legal";

/**
 * LoginPanel — the clean, brand-aware auth entry (no marketing).
 *
 * Marketing lives on the home page (/); this is just sign in / sign up. It's
 * tokenized (var(--color-primary*), semantic surface/text tokens) so it themes
 * automatically per brand — rose under data-brand="relatti", indigo for
 * MasteryTV — with no per-brand markup. Reuses the established auth flow
 * (anti-enumeration handling, email confirmation, Google OAuth) and threads
 * `next` through /auth/callback so post-auth lands where intent pointed.
 */

const COPY: Record<BrandId, { tagline: string; signinSubtitle: string }> = {
  masterytv: {
    tagline: "Know yourself. Master everything.",
    signinSubtitle: "Sign in to continue.",
  },
  relatti: {
    tagline: "Understand each other better — starting with you.",
    signinSubtitle: "Sign in to your relationship coach.",
  },
};

export default function LoginPanel({
  brandId,
  brandName,
  next,
  inviteCode,
  prefilledEmail,
  initialMode,
}: {
  brandId: BrandId;
  brandName: string;
  /** Which card to open on. An explicit "Log in" click passes "signin";
      the default stays "signup" for Get-started / invite arrivals. */
  initialMode?: "signup" | "signin";
  next?: string;
  inviteCode?: string;
  prefilledEmail?: string;
}) {
  const [mode, setMode] = useState<"signup" | "signin">(initialMode ?? "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefilledEmail ?? "");
  // When the email came from an invite, lock it so the dyad link can't be broken
  // by a typo or a mismatched address. The invitee can still opt out (e.g. their
  // account is under a different email) via "Use a different email".
  const [emailLocked, setEmailLocked] = useState(!!prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  // E15.5 — signup is gated on accepting the legal docs. We record the accepted
  // version so a consent record maps to a specific published revision.
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const supabase = createClient();

  // Post-auth destination: intended `next` (e.g. /assess) wins, else dashboard
  // (preserving invite context). Passed to /auth/callback for OAuth + email.
  // Invitees go straight to the assessment (the dyad links there by email);
  // everyone else to the dashboard. An explicit `next` still wins.
  const redirectTo = next ?? (inviteCode ? "/assess" : "/dashboard");
  const callbackUrl = (origin: string) =>
    `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const copy = COPY[brandId] ?? COPY.masterytv;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }

      if (!acceptedLegal) {
        setError("Please agree to the Terms, Privacy Policy, and Disclaimer to continue.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name || undefined,
            full_name: name || undefined,
            // Consent record: which legal revision the user accepted, and when.
            legal_accepted_at: new Date().toISOString(),
            legal_version: LEGAL_VERSION,
            // PC5.2: brand the signup happened on — handle_new_user stamps it
            // onto users.signup_brand at row creation. OAuth signups can't
            // carry metadata; /auth/callback stamps those from the host.
            signup_brand: brandId,
          },
          emailRedirectTo: callbackUrl(window.location.origin),
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setAccountExists(true);
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Supabase anti-enumeration: existing confirmed users return a user with
      // an empty identities array and no session.
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setAccountExists(true);
        setLoading(false);
        return;
      }

      // Email confirmation required → user but no session.
      if (data.user && !data.session) {
        setConfirmationSent(true);
        setLoading(false);
        return;
      }

      window.location.href = redirectTo;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        if (signInError.message.includes("Invalid login")) {
          setError("Invalid email or password. Check your credentials and try again.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please confirm your email first. Check your inbox for the confirmation link.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      window.location.href = redirectTo;
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address first, then click forgot password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const providerRes = await fetch("/api/auth/check-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const { provider } = await providerRes.json();
      if (provider && provider !== "email") {
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        setError(`This email was registered with ${providerName}. Please use "Continue with ${providerName}" to sign in.`);
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to normal reset flow
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // Carry the brand so the Send Email Hook can brand the reset email even
      // on localhost/staging (where the host alone resolves to the default).
      redirectTo: `${window.location.origin}/auth/callback?brand=${brandId}`,
    });
    setLoading(false);
    if (resetError) {
      if (resetError.message.includes("security purposes") || resetError.message.includes("rate")) {
        setError("Please wait a moment before requesting another reset email.");
      } else {
        setError(resetError.message);
      }
    } else {
      setAccountExists(false);
      setConfirmationSent(true);
    }
  }

  async function handleGoogleLogin() {
    // E15.5 — gate Google *sign-up* on accepting the legal docs. Sign-in is not
    // gated (existing users already accepted). We can't distinguish signup from
    // signin inside the OAuth callback, so we stash the accepted version in a
    // short-lived cookie that /auth/callback records onto the user.
    if (mode === "signup") {
      if (!acceptedLegal) {
        setError("Please agree to the Terms, Privacy Policy, and Disclaimer to continue.");
        return;
      }
      document.cookie = `legal_ack=${LEGAL_VERSION}; path=/; max-age=600; samesite=lax`;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(window.location.origin) },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <FloatingThemeToggle />

      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
          >
            {brandId === "relatti" ? (
              <RelattiMark className="h-6 w-6" />
            ) : (
              <Fingerprint className="h-6 w-6" style={{ color: "var(--color-primary)" }} strokeWidth={1.5} />
            )}
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">{brandName}</h1>
          <p className="mt-1 text-sm text-text-secondary">{copy.tagline}</p>
        </div>

        <div className="rounded-2xl bg-surface-50 p-6 sm:p-8">
          {confirmationSent ? (
            <div className="text-center">
              <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}>
                <Mail className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
              </span>
              <h2 className="font-display text-lg font-semibold text-text-primary">Check your email</h2>
              <p className="mt-2 text-sm text-text-secondary">
                We sent a confirmation link to <strong className="text-text-primary">{email}</strong>. Click it to continue.
              </p>
              <button
                onClick={() => { setConfirmationSent(false); setMode("signin"); }}
                className="mt-5 text-sm font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                Back to sign in
              </button>
            </div>
          ) : accountExists ? (
            <div className="text-center">
              <h2 className="font-display text-lg font-semibold text-text-primary">You already have an account</h2>
              <p className="mt-2 text-sm text-text-secondary">
                An account with <strong className="text-text-primary">{email}</strong> already exists. Sign in to continue.
              </p>
              <button
                onClick={() => { setAccountExists(false); setMode("signin"); setError(null); }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse"
                style={{ background: "var(--color-primary)" }}
              >
                Sign in instead <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-center font-display text-lg font-semibold text-text-primary">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-1 mb-6 text-center text-sm text-text-secondary">
                {mode === "signup" ? "It takes a few seconds — your progress saves as you go." : copy.signinSubtitle}
              </p>

              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-surface-0 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-200" />
                <span className="text-xs text-text-muted">or</span>
                <div className="h-px flex-1 bg-surface-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "signup" && (
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl bg-surface-0 py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2"
                      style={{ ["--tw-ring-color" as string]: "color-mix(in oklch, var(--color-primary) 35%, transparent)" }}
                    />
                  </div>
                )}
                <div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={emailLocked}
                      aria-readonly={emailLocked}
                      placeholder="Email address"
                      className={`w-full rounded-xl py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ${emailLocked ? "bg-surface-100 cursor-default" : "bg-surface-0"}`}
                      style={{ ["--tw-ring-color" as string]: "color-mix(in oklch, var(--color-primary) 35%, transparent)" }}
                    />
                  </div>
                  {emailLocked && (
                    <p className="mt-1.5 pl-1 text-xs text-text-muted">
                      You were invited as <strong className="text-text-secondary">{email}</strong>.{" "}
                      <button
                        type="button"
                        onClick={() => setEmailLocked(false)}
                        className="font-medium"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Use a different email
                      </button>
                    </p>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl bg-surface-0 py-2.5 pl-3 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: "color-mix(in oklch, var(--color-primary) 35%, transparent)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {mode === "signup" && (
                  <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={acceptedLegal}
                      onChange={(e) => setAcceptedLegal(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded"
                      style={{ accentColor: "var(--color-primary)" }}
                    />
                    <span>
                      I agree to the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2" style={{ color: "var(--color-primary)" }}>
                        Terms
                      </a>
                      ,{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2" style={{ color: "var(--color-primary)" }}>
                        Privacy Policy
                      </a>
                      , and{" "}
                      <a href="/disclaimer" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2" style={{ color: "var(--color-primary)" }}>
                        AI &amp; Coaching Disclaimer
                      </a>
                      . This is an AI coach — not therapy or a crisis service.
                    </span>
                  </label>
                )}

                {error && <p className="text-xs text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || (mode === "signup" && !acceptedLegal)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--color-primary)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Sign in"}<ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              {mode === "signin" && (
                <button onClick={handleForgotPassword} className="mt-3 w-full text-center text-xs text-text-muted hover:text-text-secondary">
                  Forgot your password?
                </button>
              )}

              <p className="mt-6 text-center text-sm text-text-secondary">
                {mode === "signup" ? (
                  <>Already have an account?{" "}
                    <button onClick={() => { setMode("signin"); setError(null); }} className="font-semibold" style={{ color: "var(--color-primary)" }}>Sign in</button>
                  </>
                ) : (
                  <>New here?{" "}
                    <button onClick={() => { setMode("signup"); setError(null); }} className="font-semibold" style={{ color: "var(--color-primary)" }}>Create an account</button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
