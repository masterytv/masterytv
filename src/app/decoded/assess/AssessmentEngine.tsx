"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Fingerprint, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  CORE_INSTRUMENTS,
  ADDON_INSTRUMENTS,
  WELLNESS_CHECK_SCALES,
} from "@/lib/decoded/instruments";
import { scoreAssessment, type ScoringResult } from "./actions";

interface Props {
  userId: string;
  existingAssessmentId: string | null;
  savedProgress: Record<string, Record<string, number>> | null;
  resumeInstrument: string | null;
  resumeItemIndex: number;
}

type Phase = "core" | "addon_selection" | "addons" | "complete";

export default function AssessmentEngine({
  userId,
  existingAssessmentId,
  savedProgress,
  resumeInstrument,
  resumeItemIndex,
}: Props) {
  const supabase = createClient();

  // ── State ──
  const [assessmentId, setAssessmentId] = useState<string | null>(existingAssessmentId);
  const [phase, setPhase] = useState<Phase>("core");
  const [instrumentIndex, setInstrumentIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Record<string, number>>>(
    savedProgress ?? {}
  );
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addonInstrumentIndex, setAddonInstrumentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const itemStartTime = useRef<number>(Date.now());

  // All instruments being presented in current phase
  const currentInstruments = phase === "addons"
    ? ADDON_INSTRUMENTS.filter(i => selectedAddons.includes(i.id))
    : CORE_INSTRUMENTS;

  const currentInst = phase === "addons"
    ? currentInstruments[addonInstrumentIndex]
    : currentInstruments[instrumentIndex];

  const currentItem = currentInst?.items[itemIndex];

  // Total items for progress calculation
  const totalCoreItems = CORE_INSTRUMENTS.reduce((s, i) => s + i.itemCount, 0);
  const completedCoreItems = CORE_INSTRUMENTS.slice(0, instrumentIndex).reduce(
    (s, i) => s + i.itemCount, 0
  ) + itemIndex;
  const progressPercent = phase === "core"
    ? Math.round((completedCoreItems / totalCoreItems) * 100)
    : phase === "addon_selection" ? 100
    : 100; // Addons are bonus

  // ── Resume logic ──
  useEffect(() => {
    if (resumeInstrument && savedProgress) {
      const idx = CORE_INSTRUMENTS.findIndex(i => i.id === resumeInstrument);
      if (idx >= 0) {
        setInstrumentIndex(idx);
        setItemIndex(resumeItemIndex);
      }
    }
  }, [resumeInstrument, resumeItemIndex, savedProgress]);

  // ── Keyboard shortcuts (must be after currentInst/currentItem declarations) ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase !== "core" && phase !== "addons") return;
      if (!currentInst || !currentItem) return;

      const [min, max] = getScaleRange();
      const num = parseInt(e.key);

      if (!isNaN(num) && num >= min && num <= max) {
        handleAnswer(num);
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        handleBack();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentInst, currentItem, itemIndex, instrumentIndex, responses]);

  // ── Create assessment record on first load ──
  useEffect(() => {
    if (!assessmentId) {
      createAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAssessment() {
    const { data, error } = await supabase
      .from("assessments")
      .insert({
        user_id: userId,
        current_layer: "core",
        current_instrument: CORE_INSTRUMENTS[0].id,
        current_item_index: 0,
      })
      .select("id")
      .single();

    if (!error && data) {
      setAssessmentId(data.id);
      // Create progress record
      await supabase.from("assessment_progress").insert({
        assessment_id: data.id,
        user_id: userId,
        current_instrument: CORE_INSTRUMENTS[0].id,
        current_item_index: 0,
        responses: {},
      });
    }
  }

  // ── Save progress (debounced per-question) ──
  const saveProgress = useCallback(async (
    newResponses: Record<string, Record<string, number>>,
    instId: string,
    itemIdx: number,
  ) => {
    if (!assessmentId) return;
    setSaving(true);

    await Promise.all([
      supabase
        .from("assessment_progress")
        .update({
          responses: newResponses,
          current_instrument: instId,
          current_item_index: itemIdx,
          updated_at: new Date().toISOString(),
        })
        .eq("assessment_id", assessmentId),
      supabase
        .from("assessments")
        .update({
          current_instrument: instId,
          current_item_index: itemIdx,
          last_active_at: new Date().toISOString(),
          total_items_presented: Object.values(newResponses).reduce(
            (s, r) => s + Object.keys(r).length, 0
          ),
        })
        .eq("id", assessmentId),
    ]);

    setSaving(false);
  }, [assessmentId, supabase]);

  // ── Answer handler ──
  function handleAnswer(value: number) {
    if (!currentInst || !currentItem) return;

    const responseTimeMs = Date.now() - itemStartTime.current;
    const instId = currentInst.id;
    const itemKey = String(currentItem.index);

    // Update responses
    const newResponses = { ...responses };
    if (!newResponses[instId]) newResponses[instId] = {};
    newResponses[instId][itemKey] = value;
    setResponses(newResponses);

    // Also store individual response for response_time tracking
    if (assessmentId) {
      supabase.from("assessment_responses").upsert({
        assessment_id: assessmentId,
        user_id: userId,
        instrument_id: instId,
        item_index: currentItem.index,
        item_key: `${instId}_q${currentItem.index}`,
        response_value: value,
        response_time_ms: responseTimeMs,
      }, {
        onConflict: "assessment_id,instrument_id,item_index",
      });
    }

    // Advance
    setDirection(1);
    if (itemIndex < currentInst.items.length - 1) {
      // Next item in same instrument
      const nextIdx = itemIndex + 1;
      setItemIndex(nextIdx);
      itemStartTime.current = Date.now();
      saveProgress(newResponses, instId, nextIdx);
    } else {
      // End of instrument
      if (phase === "core") {
        if (instrumentIndex < CORE_INSTRUMENTS.length - 1) {
          // Next Core instrument
          const nextInstIdx = instrumentIndex + 1;
          setInstrumentIndex(nextInstIdx);
          setItemIndex(0);
          itemStartTime.current = Date.now();
          saveProgress(newResponses, CORE_INSTRUMENTS[nextInstIdx].id, 0);
        } else {
          // Core complete → addon selection
          setPhase("addon_selection");
          saveProgress(newResponses, "addon_selection", 0);
        }
      } else if (phase === "addons") {
        const addonInsts = ADDON_INSTRUMENTS.filter(i => selectedAddons.includes(i.id));
        if (addonInstrumentIndex < addonInsts.length - 1) {
          setAddonInstrumentIndex(addonInstrumentIndex + 1);
          setItemIndex(0);
          itemStartTime.current = Date.now();
        } else {
          // All done
          completeAssessment(newResponses);
        }
      }
    }
  }

  // ── Go back ──
  function handleBack() {
    if (phase === "addon_selection") {
      setPhase("core");
      setInstrumentIndex(CORE_INSTRUMENTS.length - 1);
      setItemIndex(CORE_INSTRUMENTS[CORE_INSTRUMENTS.length - 1].items.length - 1);
      return;
    }

    setDirection(-1);
    if (itemIndex > 0) {
      setItemIndex(itemIndex - 1);
      itemStartTime.current = Date.now();
    } else if (phase === "core" && instrumentIndex > 0) {
      const prevIdx = instrumentIndex - 1;
      setInstrumentIndex(prevIdx);
      setItemIndex(CORE_INSTRUMENTS[prevIdx].items.length - 1);
      itemStartTime.current = Date.now();
    }
  }

  // ── Complete assessment ──
  async function completeAssessment(finalResponses: Record<string, Record<string, number>>) {
    if (!assessmentId) return;
    setPhase("complete");
    setScoring(true);

    try {
      // Save final progress snapshot
      await saveProgress(finalResponses, "complete", 0);

      // Run server-side scoring
      const result = await scoreAssessment(assessmentId);
      setScoringResult(result);
    } catch (err) {
      console.error("[Decoded] Scoring failed:", err);
      setScoringResult({
        success: false,
        scores: [],
        coachingFlags: null,
        error: "Scoring failed. Your responses are saved — we'll generate your report shortly.",
      });
    } finally {
      setScoring(false);
    }
  }

  // ── Skip addons ──
  function handleSkipAddons() {
    if (selectedAddons.length === 0) {
      completeAssessment(responses);
    } else {
      setPhase("addons");
      setItemIndex(0);
      setAddonInstrumentIndex(0);
      itemStartTime.current = Date.now();
    }
  }

  // ── Get scale labels for current item ──
  function getScaleLabels(): string[] {
    if (currentInst?.id === "wellness_check" && currentItem) {
      const override = WELLNESS_CHECK_SCALES[currentItem.index];
      if (override) return override.labels;
    }
    return currentInst?.scaleLabels ?? [];
  }

  function getScaleRange(): [number, number] {
    if (currentInst?.id === "wellness_check" && currentItem) {
      const override = WELLNESS_CHECK_SCALES[currentItem.index];
      if (override) return [override.min, override.max];
    }
    return [currentInst?.scaleMin ?? 1, currentInst?.scaleMax ?? 5];
  }

  // ── Current answer (for highlighting selected) ──
  const currentAnswer = currentInst && currentItem
    ? responses[currentInst.id]?.[String(currentItem.index)]
    : undefined;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // ── Addon Selection Phase ──
  if (phase === "addon_selection") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass w-full max-w-lg rounded-2xl p-8"
        >
          <h2 className="text-headline-md text-text-primary mb-2">
            Optional Deep Dives
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Based on your results, these additional assessments could deepen your insights.
            Each takes 1–2 minutes. You can skip any or all.
          </p>

          <div className="space-y-3">
            {ADDON_INSTRUMENTS.map((addon) => (
              <label
                key={addon.id}
                className={`glass-hover flex cursor-pointer items-start gap-3 rounded-xl p-4 transition-all ${
                  selectedAddons.includes(addon.id)
                    ? "ring-1 ring-[rgba(96,99,238,0.3)] bg-[rgba(96,99,238,0.05)]"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAddons.includes(addon.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAddons([...selectedAddons, addon.id]);
                    } else {
                      setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                    }
                  }}
                  className="mt-1 accent-[#6063ee]"
                />
                <div>
                  <div className="text-sm font-medium text-text-primary">{addon.name}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {addon.itemCount} questions · {addon.estimatedMinutes} min
                  </div>
                  {addon.id === "ace3" && (
                    <div className="mt-1 text-xs text-text-muted italic">
                      Sensitive — about experiences before age 18
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => handleSkipAddons()}
              className="flex-1 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              {selectedAddons.length > 0
                ? `Continue with ${selectedAddons.length} add-on${selectedAddons.length > 1 ? "s" : ""}`
                : "Finish assessment"
              }
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Complete Phase ──
  if (phase === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass w-full max-w-lg rounded-2xl p-8 text-center"
        >
          {scoring ? (
            /* Scoring in progress */
            <>
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#a3a6ff]" />
              <h2 className="text-headline-md text-text-primary">Scoring your assessment…</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Running 13 instruments through the scoring engine.
              </p>
            </>
          ) : scoringResult?.success ? (
            /* Results summary */
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-headline-md text-text-primary">Assessment Complete</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {scoringResult.scores.length} instruments scored successfully.
              </p>

              {/* Quick score summary */}
              <div className="mt-6 space-y-2 text-left">
                {scoringResult.scores.map((score) => {
                  const label = CORE_INSTRUMENTS.find(i => i.id === score.instrumentId)?.shortName
                    ?? ADDON_INSTRUMENTS.find(i => i.id === score.instrumentId)?.shortName
                    ?? score.instrumentId;
                  const summary = score.totalScore !== undefined
                    ? `Score: ${score.totalScore}`
                    : score.interpretation
                      ? Object.values(score.interpretation).join(' · ')
                      : 'Scored';
                  return (
                    <div
                      key={score.instrumentId}
                      className="flex items-center justify-between rounded-lg bg-surface-100/50 px-4 py-2.5"
                    >
                      <span className="text-sm text-text-primary">{label}</span>
                      <span className="text-xs text-text-muted">{summary}</span>
                    </div>
                  );
                })}
              </div>

              {/* Coaching flags */}
              {scoringResult.coachingFlags && Object.values(scoringResult.coachingFlags).some(Boolean) && (
                <div className="mt-6 rounded-lg bg-[rgba(255,180,90,0.08)] p-4 text-left">
                  <p className="mb-2 text-xs font-semibold text-[#ffb45a]">
                    Areas flagged for coaching focus:
                  </p>
                  <ul className="space-y-1 text-xs text-text-secondary">
                    {scoringResult.coachingFlags.highNeuroticism && <li>• Elevated emotional reactivity</li>}
                    {scoringResult.coachingFlags.lowConscientiousness && <li>• Structure & follow-through</li>}
                    {scoringResult.coachingFlags.insecureAttachment && <li>• Attachment patterns</li>}
                    {scoringResult.coachingFlags.highStress && <li>• Stress management</li>}
                    {scoringResult.coachingFlags.sleepDeficit && <li>• Sleep quality</li>}
                    {scoringResult.coachingFlags.sedentary && <li>• Physical activity</li>}
                    {scoringResult.coachingFlags.socialIsolation && <li>• Social connection</li>}
                    {scoringResult.coachingFlags.lowOverallWellness && <li>• Overall wellness below threshold</li>}
                  </ul>
                </div>
              )}

              <p className="mt-6 text-xs text-text-muted">
                Your full personalized report will be available in your dashboard.
              </p>
            </>
          ) : (
            /* Error state */
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,180,90,0.1)] ring-1 ring-[rgba(255,180,90,0.2)]">
                <AlertTriangle className="h-8 w-8 text-[#ffb45a]" />
              </div>
              <h2 className="text-headline-md text-text-primary">Almost there</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {scoringResult?.error ?? "Your responses are saved. We'll generate your report shortly."}
              </p>
              <button
                onClick={() => assessmentId && completeAssessment(responses)}
                className="mt-4 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Retry scoring
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Question Phase (Core or Addons) ──
  if (!currentInst || !currentItem) return null;

  const scaleLabels = getScaleLabels();
  const [scaleMin, scaleMax] = getScaleRange();
  const scaleValues = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMin + i
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b border-surface-200/50 bg-surface-0/80 backdrop-blur-lg px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            onClick={handleBack}
            disabled={instrumentIndex === 0 && itemIndex === 0 && phase === "core"}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <span className="text-label-sm text-text-muted">
              {currentInst.shortName}
            </span>
            {saving && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
          </div>

          <span className="text-sm tabular-nums text-text-muted">
            {progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-2 max-w-2xl">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#a3a6ff] to-[#6063ee]"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* ── Question area ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Instrument transition label */}
          {itemIndex === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <p className="text-label-md text-[#a3a6ff] mb-1">{currentInst.shortName}</p>
              <p className="text-xs text-text-muted">{currentInst.description}</p>
            </motion.div>
          )}

          {/* Question text */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${currentInst.id}-${currentItem.index}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="mb-10"
            >
              <p className="text-center text-lg font-medium text-text-primary leading-relaxed">
                {currentItem.text}
              </p>
              <p className="mt-2 text-center text-xs text-text-muted">
                {itemIndex + 1} of {currentInst.items.length}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Scale buttons */}
          <div className="flex flex-col items-center gap-2">
            {scaleValues.map((value, idx) => {
              const label = scaleLabels[idx] || String(value);
              const isSelected = currentAnswer === value;

              return (
                <button
                  key={value}
                  onClick={() => handleAnswer(value)}
                  className={`w-full max-w-md rounded-xl px-5 py-3.5 text-left text-sm transition-all ${
                    isSelected
                      ? "bg-[rgba(96,99,238,0.15)] ring-1 ring-[rgba(96,99,238,0.3)] text-text-primary"
                      : "glass-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected
                        ? "bg-[#6063ee] text-white"
                        : "bg-surface-200 text-text-muted"
                    }`}>
                      {value}
                    </span>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Skip / keyboard hint */}
          <p className="mt-8 text-center text-xs text-text-muted">
            Press {scaleMin}–{scaleMax} on your keyboard to answer
          </p>
        </div>
      </div>
    </div>
  );
}
