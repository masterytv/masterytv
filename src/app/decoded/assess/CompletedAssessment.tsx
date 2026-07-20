"use client";

import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw, Loader2, ArrowRight } from "lucide-react";
import { CORE_INSTRUMENTS, ADDON_INSTRUMENTS } from "@/lib/decoded/instruments";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { scoreAssessment, type ScoringResult } from "./actions";
import { generateReport } from "@/lib/decoded/report/generate";
import { completionPlan } from "@/lib/decoded/completion-destination";
import DecodedNav from "../DecodedNav";

interface ScoreRow {
  instrument_id: string;
  total_score?: number | null;
  subscale_scores?: Record<string, number> | null;
  percentile_scores?: Record<string, number> | null;
  interpretation: Record<string, string | boolean | number> | null;
}

interface Props {
  assessmentId: string;
  scores: ScoreRow[];
  /** The program this assessment belongs to — decides where results land
   *  (money → the reveal chat, not the Big-Five report viewer). */
  program: string;
}

/**
 * Displays results for a completed assessment.
 * If scores are missing (assessment completed before scoring was wired up),
 * auto-triggers server-side scoring on mount.
 */
export default function CompletedAssessment({ assessmentId, scores: initialScores, program }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const plan = completionPlan(program);
  const [retaking, setRetaking] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [navigating, setNavigating] = useState(false);

  // Auto-score if no scores exist yet
  useEffect(() => {
    if (initialScores.length === 0 && !scoring && !scoringResult) {
      runScoring();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-navigate to report once scores are ready
  // Why: user shouldn't have to click a button — go straight to the report
  // where Part I (dashboards) renders instantly and Part II generates in background
  useEffect(() => {
    const hasScores = initialScores.length > 0 || (scoringResult?.success && scoringResult.scores.length > 0);
    if (hasScores && !navigating && !retaking) {
      navigateToReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScores, scoringResult]);

  async function navigateToReport() {
    setNavigating(true);
    try {
      const result = await generateReport(assessmentId);
      if (result.success && result.reportId) {
        // Program-keyed: money lands in the reveal chat (off the trait profile its
        // report row just stored), every other vertical in the report viewer.
        router.push(plan.href(result.reportId));
        return;
      }
    } catch {
      // Fall through — user can still click manually
    }
    setNavigating(false);
  }

  async function runScoring() {
    setScoring(true);
    try {
      const result = await scoreAssessment(assessmentId);
      setScoringResult(result);
    } catch {
      setScoringResult({
        success: false,
        scores: [],
        coachingFlags: null,
        error: "Scoring failed. Please try again.",
      });
    } finally {
      setScoring(false);
    }
  }

  function getInstrumentLabel(id: string): string {
    return (
      CORE_INSTRUMENTS.find((i) => i.id === id)?.shortName ??
      ADDON_INSTRUMENTS.find((i) => i.id === id)?.shortName ??
      id
    );
  }

  async function handleRetake() {
    setRetaking(true);
    await supabase
      .from("assessments")
      .update({ current_layer: "superseded" })
      .eq("id", assessmentId);
    router.refresh();
  }

  return (
    <>
    <DecodedNav />
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-lg rounded-2xl p-8"
      >
        {scoring ? (
          /* Auto-scoring in progress */
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[var(--color-primary)]" />
            <h2 className="text-headline-md text-text-primary">Scoring your assessment…</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Running your responses through 13 scoring instruments.
            </p>
          </div>
        ) : navigating ? (
          /* Auto-navigating to report */
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[var(--color-primary)]" />
            <h2 className="text-headline-md text-text-primary">{plan.opening}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Your personalized dashboard is ready.
            </p>
          </div>
        ) : scoringResult && !scoringResult.success ? (
          /* Scoring failed */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-headline-md text-text-primary">Assessment Complete</h2>
            <p className="mt-2 text-sm text-text-muted">{scoringResult.error}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={runScoring}
                className="rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Retry scoring
              </button>
              <button
                onClick={handleRetake}
                disabled={retaking}
                className="flex items-center justify-center gap-2 rounded-lg border border-surface-200 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-100 transition-all disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {retaking ? "Starting fresh…" : "Retake assessment"}
              </button>
            </div>
          </div>
        ) : (
          /* Default: loading state while useEffect kicks in */
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[var(--color-primary)]" />
            <h2 className="text-headline-md text-text-primary">Preparing…</h2>
          </div>
        )}
      </motion.div>
    </div>
    </>
  );
}
