"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Fingerprint, Eye, EyeOff, User, Mail, Check } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import "./decoded-landing.css";

/**
 * Decoded Landing — Full conversion page with auth gate.
 *
 * Structure:
 * 1. Hero — Fingerprint badge, headline, subtitle, gold CTA, trust strip
 * 2. What You'll Discover — 4-column feature grid
 * 3. The Science — credibility section with instrument tags
 * 4. Auth Section — email/password + Google OAuth
 *
 * "Editorial midnight" aesthetic per BRAND.md §14.
 */

// Instrument names for the science section
const INSTRUMENTS = [
  'IPIP-50', 'ECR-R', 'DERS-16', 'RIASEC', 'PWB',
  'FS-8', 'SWLS', 'GRIT-S', 'LOT-R', 'BRS',
  'RAS', 'MSPSS', 'SDT-BPN',
];

// Feature cards for "What You'll Discover"
const FEATURES = [
  {
    num: '01',
    title: 'Personality Profile',
    desc: 'Your Big Five traits — Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism — mapped to one of 16 archetypes.',
  },
  {
    num: '02',
    title: 'Attachment & Relationships',
    desc: 'Understand your attachment style — secure, anxious, avoidant, or fearful — and how it shapes your closest connections.',
  },
  {
    num: '03',
    title: 'Career & Motivation',
    desc: 'Discover your RIASEC career interests, grit score, and what truly drives you — autonomy, competence, or belonging.',
  },
  {
    num: '04',
    title: 'Emotional Regulation',
    desc: 'Your emotional awareness, stress resilience, life satisfaction, and psychological well-being — scored against population norms.',
  },
];

export default function DecodedLanding({ inviteCode }: { inviteCode?: string }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const supabase = createClient();

  const redirectTo = inviteCode ? `/dashboard?invite=${inviteCode}` : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      // Validate password length
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
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
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        // Handle explicit "user already exists" error
        if (signUpError.message.includes("already registered")) {
          setAccountExists(true);
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Supabase anti-enumeration: existing confirmed users get a fake success
      // with user object but empty identities array and no session
      if (
        data.user &&
        (!data.user.identities || data.user.identities.length === 0)
      ) {
        setAccountExists(true);
        setLoading(false);
        return;
      }

      // If email confirmation is required, Supabase returns a user but no session
      if (data.user && !data.session) {
        setConfirmationSent(true);
        setLoading(false);
        return;
      }

      // If auto-confirm is on (dev mode), redirect immediately
      window.location.href = redirectTo;
    } else {
      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

      // Successful login → redirect to dashboard
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

    // Check if this email was registered via OAuth (Google, etc.)
    try {
      const providerRes = await fetch('/api/auth/check-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const { provider } = await providerRes.json();

      if (provider && provider !== 'email') {
        // OAuth user — don't send a password reset, show helpful message
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        setError(
          `This email was registered with ${providerName}. Please use "Continue with ${providerName}" to sign in.`
        );
        setLoading(false);
        return;
      }
    } catch {
      // If the check fails, fall through to normal reset flow
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    if (resetError) {
      // Show user-friendly rate limit message
      if (resetError.message.includes("security purposes") || resetError.message.includes("rate")) {
        setError("Please wait a moment before requesting another reset email.");
      } else {
        setError(resetError.message);
      }
    } else {
      // Success — dismiss accountExists and show the "check email" screen
      setAccountExists(false);
      setConfirmationSent(true);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  function scrollToAuth() {
    const authSection = document.getElementById('dl-auth');
    authSection?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="dl">
      <FloatingThemeToggle />

      {/* Background glow */}
      <div className="dl__glow" aria-hidden="true">
        <div className="dl__glow-orb dl__glow-orb--primary" />
        <div className="dl__glow-orb dl__glow-orb--accent" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════════════════════ */}
      <motion.header
        className="dl-hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div
          className="dl-hero__badge"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Fingerprint className="dl-hero__badge-icon" strokeWidth={1.5} />
        </motion.div>

        <p className="dl-hero__label">DECODED</p>
        <h1 className="dl-hero__title">Know yourself. Master everything.</h1>
        <p className="dl-hero__subtitle">
          A 30-minute personality assessment across 13 scientifically-validated
          dimensions — personality, attachment, motivation, emotional regulation,
          and more.
        </p>
        <p className="dl-hero__detail">
          Distilled into a personalized coaching report with your archetype,
          superpowers, and growth edges. Free Core assessment.
        </p>

        <button onClick={scrollToAuth} className="dl-hero__cta">
          Start Your Assessment
          <ArrowRight className="dl-hero__cta-icon" />
        </button>

        <div className="dl-hero__trust">
          <span className="dl-hero__trust-item">
            <Check className="dl-hero__trust-check" />
            13 validated instruments
          </span>
          <span className="dl-hero__trust-item">
            <Check className="dl-hero__trust-check" />
            ~30 minutes
          </span>
          <span className="dl-hero__trust-item">
            <Check className="dl-hero__trust-check" />
            AI-powered report
          </span>
          <span className="dl-hero__trust-item">
            <Check className="dl-hero__trust-check" />
            Resume anytime
          </span>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════════════
         WHAT YOU'LL DISCOVER
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="dl-discover">
        <div className="dl-discover__inner">
          <h2 className="dl-discover__title">What You&apos;ll Discover</h2>
          <div className="dl-discover__grid">
            {FEATURES.map((feature) => (
              <div key={feature.num} className="dl-discover__card">
                <span className="dl-discover__num">{feature.num}</span>
                <h3 className="dl-discover__card-title">{feature.title}</h3>
                <p className="dl-discover__card-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
         THE SCIENCE
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="dl-science">
        <h2 className="dl-science__title">Built on Peer-Reviewed Science</h2>
        <p className="dl-science__desc">
          Every question maps to a published psychometric instrument used in
          thousands of research studies. Your scores are normalized against
          population data — no generic quizzes, no guesswork.
        </p>
        <div className="dl-science__instruments">
          {INSTRUMENTS.map((inst) => (
            <span key={inst} className="dl-science__tag">{inst}</span>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
         AUTH SECTION
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="dl-auth" id="dl-auth">
        <h2 className="dl-auth__title">Ready to be decoded?</h2>
        <p className="dl-auth__subtitle">Create an account to start. Your progress is saved automatically.</p>

        <div className="dl-auth__card">
          {confirmationSent ? (
            /* ── Confirmation email sent screen ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
                <Mail className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-lg font-medium text-text-primary">Check your email</h2>
              <p className="mt-2 text-sm text-text-secondary">
                We sent a link to{" "}
                <span className="font-medium text-text-primary">{email}</span>.
                <br />Click it to continue, then come back and sign in.
              </p>
              <button
                onClick={() => {
                  setConfirmationSent(false);
                  setMode("signin");
                  setPassword("");
                }}
                className="mt-6 text-sm text-[#a3a6ff] hover:text-[#c4c6ff] transition-colors"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : accountExists ? (
            /* ── Account already exists screen ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(96,99,238,0.1)] ring-1 ring-[rgba(96,99,238,0.15)]">
                <User className="h-8 w-8 text-[#a3a6ff]" />
              </div>
              <h2 className="text-lg font-medium text-text-primary">Account already exists</h2>
              <p className="mt-2 text-sm text-text-secondary">
                An account with{" "}
                <span className="font-medium text-text-primary">{email}</span>{" "}
                already exists. Sign in to continue your assessment.
              </p>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-sm text-danger"
                >
                  {error}
                </motion.p>
              )}
              <button
                onClick={() => {
                  setAccountExists(false);
                  setMode("signin");
                  setPassword("");
                  setError(null);
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Sign In
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="mt-3 text-sm text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Forgot your password?"}
              </button>
            </motion.div>
          ) : (
          <>
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold text-text-primary">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {mode === "signup"
                ? "Your progress is saved automatically — return anytime."
                : "Sign in to continue your assessment."}
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="glass-hover flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-surface-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-200" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-surface-200" />
          </div>

          {/* Email + Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — sign up only */}
            {mode === "signup" && (
              <div>
                <label htmlFor="decoded-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Name <span className="text-text-muted font-normal">(optional)</span>
                </label>
              <div>
                  <input
                    id="decoded-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="decoded-email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Email
              </label>
              <input
                id="decoded-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="decoded-password" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Password
              </label>
              <div className="relative">
                <input
                  id="decoded-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  required
                  minLength={6}
                  className="w-full rounded-lg bg-surface-100 px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 self-start text-sm text-[#a3a6ff] hover:text-[#c4c6ff] transition-colors"
                >
                  Forgot your password?
                </button>
              )}
            </div>

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-danger"
              >
                {error}
              </motion.p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? "Create Account & Start" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle sign up / sign in */}
          <p className="mt-6 text-center text-sm text-text-secondary">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("signin"); setError(null); }}
                  className="font-medium text-[#a3a6ff] hover:text-[#c4c6ff] transition-colors"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className="font-medium text-[#a3a6ff] hover:text-[#c4c6ff] transition-colors"
                >
                  Create one
                </button>
              </>
            )}
          </p>
          </>
          )}
        </div>
      </section>
    </div>
  );
}
