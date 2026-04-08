"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowRight, UserStar } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/coachapp/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/coachapp/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background gradient effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[rgba(96,99,238,0.05)] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-[rgba(105,246,184,0.04)] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="glass relative w-full max-w-md rounded-2xl p-8"
      >
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.12)]"
          >
            <UserStar className="h-7 w-7 text-[#a3a6ff]" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Mastery Coach
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your AI coaching partner for high-performance
          </p>
        </div>

        {sent ? (
          /* ── Magic Link Sent State ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-medium text-text-primary">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              We sent a magic link to{" "}
              <span className="font-medium text-text-primary">{email}</span>.
              <br />
              Click the link to sign in.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="mt-6 text-sm text-[#a3a6ff] hover:text-[#c4c6ff] transition-colors"
            >
              Use a different email
            </button>
          </motion.div>
        ) : (
          /* ── Login Form ── */
          <>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-danger"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue with Magic Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-surface-200" />
              <span className="text-xs text-text-muted">or</span>
              <div className="h-px flex-1 bg-surface-200" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              className="glass-hover flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-surface-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
