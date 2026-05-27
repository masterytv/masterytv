"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, Briefcase, Check, CheckCircle2,
  ChevronLeft, CircleDot, Clock, Compass, Fingerprint, Heart, Home,
  Leaf, Link2, Loader2, Mail, Save, Shield, Users, X, Zap,
} from "lucide-react";
import {
  CORE_INSTRUMENTS,
  ADDON_INSTRUMENTS,
  WELLNESS_CHECK_SCALES,
} from "@/lib/decoded/instruments";
import { scoreAssessment, type ScoringResult } from "./actions";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

interface Props {
  userId: string;
  existingAssessmentId: string | null;
  savedProgress: Record<string, Record<string, number>> | null;
  resumeInstrument: string | null;
  resumeItemIndex: number;
}

type Phase = "welcome" | "invite" | "primer" | "core" | "addon_selection" | "addons" | "complete";

const EXPLORE_DIMENSIONS = [
  { icon: Fingerprint, label: "Personality", desc: "How you think and react" },
  { icon: Heart, label: "Relationships", desc: "Your attachment patterns" },
  { icon: Activity, label: "Emotional Wellbeing", desc: "How you regulate and cope" },
  { icon: Shield, label: "Mental Health", desc: "Anxiety, mood, and sleep" },
  { icon: Leaf, label: "Health & Habits", desc: "Lifestyle and physical health" },
  { icon: Compass, label: "How You Think", desc: "Your cognitive style" },
  { icon: BookOpen, label: "Life Experiences", desc: "What shaped you" },
  { icon: Briefcase, label: "Career & Values", desc: "What drives and fulfills you" },
];

const RELATIONSHIP_TYPES = [
  { icon: Heart, label: "Your partner" },
  { icon: Users, label: "A close friend" },
  { icon: Briefcase, label: "A colleague" },
  { icon: Home, label: "A family member" },
];

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
  const [phase, setPhase] = useState<Phase>(savedProgress ? "core" : "welcome");
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

  // ── Pre-assessment screen state ──
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecks, setConsentChecks] = useState([false, false, false]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

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

  // ── Create assessment record when user starts (deferred from mount) ──
  useEffect(() => {
    if (phase === "core" && !assessmentId) {
      createAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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

  // ── Welcome Screen — set expectations ──
  if (phase === "welcome") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <FloatingThemeToggle />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="glass w-full max-w-lg rounded-2xl p-8 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(96,99,238,0.1)] ring-1 ring-[rgba(96,99,238,0.15)]">
            <Fingerprint className="h-8 w-8 text-[#a3a6ff]" strokeWidth={1.5} />
          </div>

          <h1 className="text-headline-lg text-text-primary mb-3">
            Finally Understand Your Patterns
          </h1>
          <p className="mx-auto max-w-sm text-sm text-text-secondary leading-relaxed">
            In 25&ndash;35 minutes, you&apos;ll understand why you react the way you do,
            why some relationships feel harder than others, and what you actually
            need to feel fulfilled. Save anytime and come back later.
          </p>

          <div className="mx-auto mt-6 flex items-center justify-center gap-2 text-xs text-text-muted">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Most finish in 25&ndash;35 min &middot; Save anytime &middot; Pick up where you left off</span>
          </div>

          <button
            onClick={() => setPhase("invite")}
            className="mt-8 w-full rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Invite/Share Screen — viral mechanic ──
  if (phase === "invite") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <FloatingThemeToggle />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="glass w-full max-w-lg rounded-2xl p-8"
        >
          <h2 className="text-headline-md text-text-primary text-center mb-2">
            Invite someone to take it too
          </h2>
          <p className="text-sm text-text-secondary text-center mb-6">
            The assessment is free &mdash; share it with someone you know
          </p>

          {/* Relationship chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {RELATIONSHIP_TYPES.map((rel) => (
              <button
                key={rel.label}
                onClick={() => setSelectedRelationship(rel.label === selectedRelationship ? null : rel.label)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                  selectedRelationship === rel.label
                    ? "bg-[rgba(96,99,238,0.15)] ring-1 ring-[rgba(96,99,238,0.3)] text-text-primary"
                    : "bg-surface-100/50 text-text-secondary hover:bg-surface-200/50"
                }`}
              >
                <rel.icon className="h-4 w-4" />
                {rel.label}
              </button>
            ))}
          </div>

          {/* Copy invite link */}
          <button
            onClick={async () => {
              const link = `${window.location.origin}/decoded?ref=${userId}`;
              await navigator.clipboard.writeText(link);
              setInviteCopied(true);
              setTimeout(() => setInviteCopied(false), 2000);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            {inviteCopied ? (
              <>
                <Check className="h-4 w-4" />
                Link Copied!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Copy Invite Link
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-200" />
            <span className="text-xs text-text-muted">or send an email</span>
            <div className="h-px flex-1 bg-surface-200" />
          </div>

          {/* Email invite */}
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Their email address"
              className="flex-1 rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
            />
            <button
              onClick={() => {
                if (inviteEmail) {
                  window.open(
                    `mailto:${inviteEmail}?subject=${encodeURIComponent("Take this personality assessment")}&body=${encodeURIComponent(`I just started the Decoded personality assessment — take it too so we can compare results: ${window.location.origin}/decoded?ref=${userId}`)}`,
                    "_blank"
                  );
                  setInviteEmail("");
                }
              }}
              disabled={!inviteEmail}
              className="flex items-center gap-2 rounded-lg bg-surface-200 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Mail className="h-4 w-4" />
              Send
            </button>
          </div>

          {/* Value prop */}
          <div className="mt-6 rounded-xl bg-[rgba(96,99,238,0.05)] p-4 ring-1 ring-[rgba(96,99,238,0.1)]">
            <p className="text-sm font-medium text-text-primary">Unlock a Comparison Report</p>
            <p className="mt-1 text-xs text-text-secondary">
              When you both complete the assessment, you can compare your profiles &mdash;
              see your compatibility, communication styles, and blind spots together.
            </p>
          </div>

          {/* Privacy note */}
          <div className="mt-4 flex items-start gap-2 text-xs text-text-muted">
            <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Your results are always private &mdash; you decide if and when to share.</span>
          </div>

          {/* Continue */}
          <button
            onClick={() => setPhase("primer")}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
          <button
            onClick={() => setPhase("primer")}
            className="mt-2 w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip for now
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Primer Screen — "What You'll Explore" + Consent Modal ──
  if (phase === "primer") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <FloatingThemeToggle />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="glass w-full max-w-lg rounded-2xl p-8"
        >
          <h2 className="text-headline-md text-text-primary text-center mb-6">
            What You&apos;ll Explore
          </h2>

          {/* Dimensions grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {EXPLORE_DIMENSIONS.map((dim) => (
              <div
                key={dim.label}
                className="flex items-start gap-3 rounded-xl bg-surface-100/50 p-3"
              >
                <dim.icon className="h-5 w-5 text-[#a3a6ff] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{dim.label}</p>
                  <p className="text-xs text-text-muted">{dim.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-[#a3a6ff] italic mb-6">
            Plus personalized sections based on your answers
          </p>

          {/* Tips */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Zap className="h-4 w-4 text-text-muted flex-shrink-0" />
              <span>Answer with your gut &mdash; first instinct is best</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <CircleDot className="h-4 w-4 text-text-muted flex-shrink-0" />
              <span>No right or wrong answers</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Save className="h-4 w-4 text-text-muted flex-shrink-0" />
              <span>Save anytime, resume on any device</span>
            </div>
          </div>

          {/* Start button — opens consent modal */}
          <button
            onClick={() => setShowConsent(true)}
            className="w-full rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Start My Profile
          </button>

          <button
            onClick={() => setPhase("invite")}
            className="mt-3 w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Back
          </button>

          <p className="mt-6 text-center text-xs text-text-muted italic">
            No right or wrong answers &mdash; just honest reflection. Your results are private,
            and you&apos;ll own them forever.
          </p>
        </motion.div>

        {/* ── Consent Modal ── */}
        {showConsent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="glass w-full max-w-md rounded-2xl p-6"
              role="dialog"
              aria-modal="true"
              aria-label="Before You Begin"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Before You Begin</h3>
                <button
                  onClick={() => setShowConsent(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-200 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-text-secondary mb-5">
                This assessment includes psychological screening tools. Please confirm the following:
              </p>

              <div className="space-y-4">
                {[
                  <>I confirm I am <strong>18 years or older</strong></>,
                  <>I understand this is a <strong>screening tool, not a clinical diagnosis</strong>. Results suggest areas to explore with qualified professionals.</>,
                  <>I consent to complete <strong>psychological assessments</strong> including personality, mental health screening, and interpersonal patterns.</>,
                ].map((label, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consentChecks[i]}
                      onChange={() => {
                        const next = [...consentChecks];
                        next[i] = !next[i];
                        setConsentChecks(next);
                      }}
                      className="mt-1 h-4 w-4 rounded accent-[#6063ee] flex-shrink-0"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowConsent(false);
                  setPhase("core");
                }}
                disabled={!consentChecks.every(Boolean)}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Continue to Assessment
              </button>

              <p className="mt-4 text-center text-xs text-text-muted">
                By continuing, you agree to our{" "}
                <a href="/terms" className="text-[#a3a6ff] hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-[#a3a6ff] hover:underline">Privacy Policy</a>
              </p>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // ── Addon Selection Phase ──
  if (phase === "addon_selection") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <FloatingThemeToggle />
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
        <FloatingThemeToggle />
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
              <a
                href="/dashboard"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </a>
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
      {/* Theme toggle */}
      <FloatingThemeToggle />
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
