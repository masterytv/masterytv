"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Fingerprint,
  ArrowRight,
  FileText,
  MessageSquare,
  Share2,
  RotateCcw,
  Check,
  Clock,
  Sparkles,
  Copy,
  Mail,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userName: string;
  state: "none" | "in-progress" | "completed";
  answeredCount: number;
  totalQuestions: number;
  reportId: string | null;
  assessmentId: string | null;
  onboardingComplete: boolean;
  hasInProgressRetake?: boolean;
}

/**
 * Dashboard Home — adapts card layout based on assessment state.
 * BRAND.md compliant: editorial midnight, Lucide icons only, glass cards.
 */
export default function DashboardHome({
  userName,
  state,
  answeredCount,
  totalQuestions,
  reportId,
  assessmentId,
  onboardingComplete,
  hasInProgressRetake = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const progressPercent = totalQuestions > 0
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  async function handleRedoOnboarding() {
    setResetting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("onboarding_state").upsert(
        {
          user_id: user.id,
          current_step: "about_you",
          coaching_letter: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
    router.push("/coachapp/onboarding?redo=1");
  }

  function handleCopyLink() {
    const shareUrl = `${window.location.origin}/decoded`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEmailInvite() {
    const shareUrl = `${window.location.origin}/decoded`;
    const subject = encodeURIComponent("Take this personality assessment");
    const body = encodeURIComponent(
      `I just took the Decoded personality assessment — it's surprisingly accurate. You should try it:\n\n${shareUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 lg:py-12">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-headline-lg text-text-primary">
            {getGreeting()}, {userName}
          </h1>
          <p className="mt-1 text-body-lg text-text-secondary">
            {state === "none" && "Ready to discover what makes you tick?"}
            {state === "in-progress" && "Pick up where you left off."}
            {state === "completed" && "Your profile is ready. Explore your results."}
          </p>
        </motion.div>

        {/* Card grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* ── Assessment Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            {state === "none" ? (
              /* No assessment — Start CTA */
              <Link
                href="/assess"
                className="group block rounded-2xl bg-surface-50 p-6 transition-all hover:bg-surface-100"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.1)]">
                  <Fingerprint className="h-6 w-6 text-[#a3a6ff]" strokeWidth={1.5} />
                </div>
                <h2 className="text-title-lg text-text-primary font-semibold">
                  Start Your Assessment
                </h2>
                <p className="mt-1.5 text-body-md text-text-secondary">
                  30 minutes across 13 dimensions. Personality, attachment, motivation, and more.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#a3a6ff] group-hover:gap-2.5 transition-all">
                  Begin now
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ) : state === "in-progress" ? (
              /* In-progress — Continue */
              <Link
                href="/assess"
                className="group block rounded-2xl bg-surface-50 p-6 transition-all hover:bg-surface-100"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.1)]">
                    <Clock className="h-6 w-6 text-[#a3a6ff]" strokeWidth={1.5} />
                  </div>
                  <span className="text-label-md text-[#a3a6ff]">
                    {progressPercent}% complete
                  </span>
                </div>
                <h2 className="text-title-lg text-text-primary font-semibold">
                  Continue Assessment
                </h2>
                <p className="mt-1.5 text-body-md text-text-secondary">
                  {answeredCount} of {totalQuestions} questions answered. Your progress is saved.
                </p>
                {/* Progress bar */}
                <div className="mt-4 h-1.5 w-full rounded-full bg-surface-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </Link>
            ) : hasInProgressRetake ? (
                /* Active retake in progress — show prominent finish card */
                <Link
                  href="/assess"
                  className="group block rounded-2xl bg-surface-50 p-6 transition-all hover:bg-surface-100"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.1)]">
                      <Clock className="h-6 w-6 text-[#a3a6ff]" strokeWidth={1.5} />
                    </div>
                    <span className="text-label-md text-[#a3a6ff]">
                      Retake in progress
                    </span>
                  </div>
                  <h2 className="text-title-lg text-text-primary font-semibold">
                    Finish Assessment
                  </h2>
                  <p className="mt-1.5 text-body-md text-text-secondary">
                    You started a retake. Pick up where you left off.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#a3a6ff] group-hover:gap-2.5 transition-all">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ) : (
                /* Fully completed — retake option */
                <div className="rounded-2xl bg-surface-50 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                      <Check className="h-6 w-6 text-success" strokeWidth={1.5} />
                    </div>
                    <span className="text-label-md text-success">Completed</span>
                  </div>
                  <h2 className="text-title-lg text-text-primary font-semibold">
                    Assessment Complete
                  </h2>
                  <p className="mt-1.5 text-body-md text-text-secondary">
                    All 13 dimensions scored. View your report or retake.
                  </p>
                  <Link
                    href="/assess?retake=1"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retake assessment
                  </Link>
                </div>
              )}
          </motion.div>

          {/* ── Report Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {state === "completed" && reportId ? (
              <Link
                href={`/decoded/report/${reportId}`}
                className="group block rounded-2xl bg-surface-50 p-6 transition-all hover:bg-surface-100"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(105,246,184,0.08)]">
                  <FileText className="h-6 w-6 text-[#69f6b8]" strokeWidth={1.5} />
                </div>
                <h2 className="text-title-lg text-text-primary font-semibold">
                  Your Report
                </h2>
                <p className="mt-1.5 text-body-md text-text-secondary">
                  Personalized insights across personality, attachment, motivation, and more.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#69f6b8] group-hover:gap-2.5 transition-all">
                  View full report
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl bg-surface-50 p-6 opacity-50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100">
                  <FileText className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
                </div>
                <h2 className="text-title-lg text-text-primary font-semibold">
                  Your Report
                </h2>
                <p className="mt-1.5 text-body-md text-text-secondary">
                  {state === "none"
                    ? "Complete the assessment to unlock your report."
                    : "Finish your assessment to generate your report."}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Coach Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {state === "completed" ? (
              <div className="rounded-2xl bg-surface-50 p-6 transition-all hover:bg-surface-100">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.1)]">
                  <MessageSquare className="h-6 w-6 text-[#a3a6ff]" strokeWidth={1.5} />
                </div>
                <h2 className="text-title-lg text-text-primary font-semibold">
                  Talk to Your Coach
                </h2>
                <p className="mt-1.5 text-body-md text-text-secondary">
                  Your coach has read your full profile. Start a conversation.
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href="/dashboard/chat"
                    className="flex items-center gap-1.5 text-sm font-medium text-[#a3a6ff] hover:gap-2.5 transition-all"
                  >
                    Open chat
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {onboardingComplete && (
                    <button
                      onClick={handleRedoOnboarding}
                      disabled={resetting}
                      className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-[#a3a6ff] transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`h-3 w-3 ${resetting ? 'animate-spin' : ''}`} />
                      {resetting ? 'Redirecting…' : 'Redo setup'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-50 p-6 opacity-50">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100">
                    <MessageSquare className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
                  </div>
                  <Lock className="h-4 w-4 text-text-muted" />
                </div>
                <h2 className="text-title-lg text-text-primary font-semibold">
                  Talk to Your Coach
                </h2>
                <p className="mt-1.5 text-body-md text-text-secondary">
                  Complete the assessment to unlock your AI coach.
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Share Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="rounded-2xl bg-surface-50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(105,246,184,0.08)]">
                <Share2 className="h-6 w-6 text-[#69f6b8]" strokeWidth={1.5} />
              </div>
              <h2 className="text-title-lg text-text-primary font-semibold">
                Invite Someone
              </h2>
              <p className="mt-1.5 text-body-md text-text-secondary">
                Share Decoded with a friend or partner. Compare personality profiles.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-200 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-300 transition-all"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  onClick={handleEmailInvite}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-200 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-300 transition-all"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email invite
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
