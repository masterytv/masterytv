"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

/**
 * Password Reset Page
 * 
 * Handles the Supabase recovery flow:
 * 1. User clicks "Reset Password" link in email
 * 2. Supabase redirects to /auth/callback with a code
 * 3. Callback exchanges code for session, redirects here
 * 4. User sets a new password
 *
 * Also handles direct hash-fragment recovery tokens.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check if there's an active session (from the callback code exchange)
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    }

    // Also listen for auth state changes (handles hash fragment tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setHasSession(true);
          setChecking(false);
        }
      }
    );

    checkSession();

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <FloatingThemeToggle />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary-container/6 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass relative w-full max-w-md rounded-2xl p-8"
      >
        {success ? (
          /* ── Success state ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-medium text-text-primary">
              Password updated
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <a
              href="/decoded"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        ) : hasSession ? (
          /* ── Password form ── */
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/10 ring-1 ring-primary-container/15">
                <Lock className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">
                Set a new password
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Choose a strong password for your account.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full rounded-lg bg-surface-100 px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-container/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type it again"
                  required
                  minLength={6}
                  className="w-full rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-container/20 transition-all"
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
                disabled={loading || !password || !confirmPassword}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* ── No session / expired token ── */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,180,90,0.1)] ring-1 ring-[rgba(255,180,90,0.2)]">
              <Lock className="h-8 w-8 text-[#ffb45a]" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-medium text-text-primary">
              Reset link expired
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              This password reset link has expired or is invalid. Request a new one from the sign-in page.
            </p>
            <a
              href="/decoded"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Back to sign in
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}
