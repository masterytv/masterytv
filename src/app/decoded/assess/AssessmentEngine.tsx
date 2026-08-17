"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, Briefcase, Check, CheckCircle2,
  ChevronLeft, CircleDot, Clock, Compass, Fingerprint, Heart, Home,
  Leaf, Link2, Loader2, Mail, Save, Shield, User, Users, X, Zap,
} from "lucide-react";
import {
  ADDON_INSTRUMENTS,
  WELLNESS_CHECK_SCALES,
  type InstrumentDef,
} from "@/lib/decoded/instruments";
import type { ProgramId } from "@/lib/platform/brand";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { scoreAssessment, type ScoringResult } from "./actions";
import { generateReport } from "@/lib/decoded/report/generate";
import { completionPlan } from "@/lib/decoded/completion-destination";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

interface Props {
  userId: string;
  existingAssessmentId: string | null;
  savedProgress: Record<string, Record<string, number>> | null;
  resumeInstrument: string | null;
  resumeItemIndex: number;
  /** The instruments to administer (program-aware; see batteries.ts). */
  battery: InstrumentDef[];
  /**
   * The program this assessment belongs to ('general' | 'relationship' |
   * 'money'), from the resolved brand. Stamped on the row and — critically —
   * the scope of the supersede on completion: a retake supersedes only WITHIN
   * its program, while a first assessment in a NEW program supersedes nothing.
   * Also selects the onboarding copy (ASSESS_ONBOARDING).
   * See directives/ASSESSMENT_PROGRAM_SCOPING.md (PC2.1).
   */
  program: ProgramId;
  /** Whether the adaptive add-on phase runs after the core battery. */
  enableAddons: boolean;
  /** Completion estimate for the welcome screen (e.g. "8–12"). */
  estimatedMinutes: string;
  /**
   * True when this user arrived via someone else's invitation (they are the
   * invited partner in a dyad). Invitees skip the "invite someone" screen —
   * they're the one who was invited, so asking them to invite a partner is
   * wrong. Organic signups still see it (the viral/partner loop).
   */
  isInvitee: boolean;
}

type Phase = "welcome" | "invite" | "primer" | "profile" | "core" | "addon_selection" | "addons" | "complete";

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other', 'Rather not say'];
const RELATIONSHIP_OPTIONS = ['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'Rather not say'];
const CHILDREN_OPTIONS = ['Yes', 'No', 'Rather not say'];

interface ExploreDimension {
  icon: LucideIcon;
  label: string;
  desc: string;
}

/**
 * The assessment ONBOARDING surfaces (welcome, invite, primer + consent) are
 * copy that differs by vertical. Program-keyed config — NOT a `relationshipMode`
 * boolean or a `program === "money"` ternary (which check:ternaries bans and
 * which would silently hand every future vertical the executive copy, the exact
 * bug this whole flow had for money). Record<ProgramId,…> is exhaustive, so a new
 * vertical must declare its onboarding copy here or the typecheck fails.
 */
interface AssessOnboarding {
  welcome: { icon: LucideIcon; title: string; body: (mins: string) => ReactNode };
  invite: {
    title: string;
    subtitle: ReactNode;
    /** The "who are you inviting" chips — the general share loop only. */
    showRecipientChips: boolean;
    /** Value-prop card under the email input. null → hidden (money is a solo
        instrument with no comparison/dyad payoff). */
    valueProp: { title: string; body: ReactNode } | null;
  };
  primer: {
    title: string;
    /** The "What You'll Explore" grid. null → skip it (money). */
    dimensions: ExploreDimension[] | null;
    startLabel: string;
    consentIntro: string;
    consentItems: ReactNode[];
  };
}

const RECIPIENT_TYPES = [
  { icon: Heart, label: "Your partner" },
  { icon: Users, label: "A close friend" },
  { icon: Briefcase, label: "A colleague" },
  { icon: Home, label: "A family member" },
];

const GENERAL_DIMENSIONS: ExploreDimension[] = [
  { icon: Fingerprint, label: "Personality", desc: "How you think and react" },
  { icon: Heart, label: "Relationships", desc: "Your attachment patterns" },
  { icon: Activity, label: "Emotional Wellbeing", desc: "How you regulate and cope" },
  { icon: Shield, label: "Mental Health", desc: "Anxiety, mood, and sleep" },
  { icon: Leaf, label: "Health & Habits", desc: "Lifestyle and physical health" },
  { icon: Compass, label: "How You Think", desc: "Your cognitive style" },
  { icon: BookOpen, label: "Life Experiences", desc: "What shaped you" },
  { icon: Briefcase, label: "Career & Values", desc: "What drives and fulfills you" },
];

// Relatti (relationship program): a focused, relationship-framed set.
const RELATIONSHIP_DIMENSIONS: ExploreDimension[] = [
  { icon: Fingerprint, label: "Your Personality", desc: "How you think and connect" },
  { icon: Heart, label: "Attachment Style", desc: "How you bond and seek closeness" },
  { icon: Activity, label: "Emotional Patterns", desc: "How you handle conflict and stress" },
  { icon: Users, label: "Relationship Fit", desc: "What you need from a partner" },
];

const ASSESS_ONBOARDING: Record<ProgramId, AssessOnboarding> = {
  general: {
    welcome: {
      icon: Fingerprint,
      title: "Finally Understand Your Patterns",
      body: (mins) => (
        <>In {mins} minutes, you&apos;ll understand why you react the way you do,
        why some relationships feel harder than others, and what you actually
        need to feel fulfilled. Save anytime and come back later.</>
      ),
    },
    invite: {
      title: "Invite someone to take it too",
      subtitle: <>The assessment is free &mdash; share it with someone you know</>,
      showRecipientChips: true,
      valueProp: {
        title: "Unlock a Comparison Report",
        body: <>When you both complete the assessment, you can compare your profiles &mdash; see your compatibility, communication styles, and blind spots together.</>,
      },
    },
    primer: {
      title: "What You'll Explore",
      dimensions: GENERAL_DIMENSIONS,
      startLabel: "Start My Profile",
      consentIntro: "This assessment includes psychological screening tools. Please confirm the following:",
      consentItems: [
        <>I confirm I am <strong>18 years or older</strong></>,
        <>I understand this is a <strong>screening tool, not a clinical diagnosis</strong>. Results suggest areas to explore with qualified professionals.</>,
        <>I consent to complete <strong>psychological assessments</strong> including personality, mental health screening, and interpersonal patterns.</>,
      ],
    },
  },
  relationship: {
    welcome: {
      icon: Fingerprint,
      title: "Discover What Kind of Partner You Are",
      body: (mins) => (
        <>In about {mins} minutes, you&apos;ll discover your relationship
        archetype and attachment style &mdash; the first step to being understood
        by your partner. Save anytime and come back later.</>
      ),
    },
    invite: {
      title: "Bring your partner in",
      subtitle: "This works best with the two of you — invite your partner to take their relationship profile too.",
      showRecipientChips: false,
      valueProp: {
        title: "See your relationship Blueprint together",
        body: "When you both complete your profiles, you’ll see how you fit — your chemistry, your friction, and the small things that bring you closer.",
      },
    },
    primer: {
      title: "What You'll Explore",
      dimensions: RELATIONSHIP_DIMENSIONS,
      startLabel: "Start My Profile",
      consentIntro: "This assessment includes psychological screening tools. Please confirm the following:",
      consentItems: [
        <>I confirm I am <strong>18 years or older</strong></>,
        <>I understand this is a <strong>screening tool, not a clinical diagnosis</strong>. Results suggest areas to explore with qualified professionals.</>,
        <>I consent to complete a <strong>psychological assessment</strong> covering personality, attachment, and relationship patterns.</>,
      ],
    },
  },
  money: {
    welcome: {
      icon: Compass,
      title: "Finally Understand Your Money Patterns",
      body: (mins) => (
        <>In about {mins} minutes, MoneyTraits measures the four traits behind
        how you earn, spend, and price &mdash; before you even decide. Save
        anytime and come back later.</>
      ),
    },
    invite: {
      title: "Know someone who should take it too?",
      subtitle: <>MoneyTraits is free &mdash; share it with someone you know.</>,
      showRecipientChips: false,
      valueProp: null,
    },
    primer: {
      title: "A quick, honest quiz",
      dimensions: null,
      startLabel: "Measure My Traits",
      consentIntro: "A couple of quick confirmations before you start:",
      consentItems: [
        <>I confirm I am <strong>18 years or older</strong></>,
        <>I understand MoneyTraits is <strong>coaching on the psychology of money</strong> &mdash; not financial, investment, or tax advice.</>,
      ],
    },
  },
  // Integration — a DIAGNOSTIC screen, not product copy, and deliberately so
  // (INTEGRATION_SPRINT.md §3 / I7 replaces this block wholesale).
  //
  // The Footing check's instruments do not exist in this repo yet and its
  // battery is empty, so nothing can be administered here. Writing plausible
  // welcome copy would make an unbuilt surface look finished; saying plainly
  // that it is unbuilt makes a wrong route obvious the moment anyone hits it.
  // Nothing reaches this today — `integration` has no brand, no host and no
  // signup path — and the vertical's real flow never opens with questions
  // anyway: the Footing check is administered mid-stream, after The Company.
  integration: {
    welcome: {
      icon: Compass,
      title: "This part isn't built yet",
      body: () => (
        <>The Footing check comes later in the build, and its questions do not
        exist yet. Nothing on this screen records anything.</>
      ),
    },
    invite: {
      title: "Not open yet",
      subtitle: "Sharing here goes to one named person at a time, and it is not built yet.",
      showRecipientChips: false,
      valueProp: null,
    },
    primer: {
      title: "Nothing to answer yet",
      dimensions: null,
      startLabel: "Go back",
      consentIntro: "There is nothing to agree to here, because there is nothing to answer.",
      consentItems: [
        <>I confirm I am <strong>18 years or older</strong></>,
      ],
    },
  },
};

export default function AssessmentEngine({
  userId,
  existingAssessmentId,
  savedProgress,
  resumeInstrument,
  resumeItemIndex,
  battery,
  program,
  enableAddons,
  estimatedMinutes,
  isInvitee,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  // Where a finished assessment lands, by program (money → the reveal chat, not
  // the Big-Five report viewer it has no sections for). See completion-destination.ts.
  const plan = completionPlan(program);
  // Onboarding copy for this vertical (welcome / invite / primer + consent),
  // keyed by program — no relationshipMode boolean, no `program === …` ternary.
  const copy = ASSESS_ONBOARDING[program];

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
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const itemStartTime = useRef<number>(Date.now());

  // ── Pre-assessment screen state ──
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecks, setConsentChecks] = useState<boolean[]>(
    () => copy.primer.consentItems.map(() => false)
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

  async function handleSendInvite() {
    if (!inviteEmail || inviteSending) return;
    setInviteSending(true);
    setInviteError(null);
    setInviteSent(false);

    try {
      const res = await fetch('/api/decoded/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          relationship: selectedRelationship,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to send. Try again.');
      } else {
        setInviteSent(true);
        setInviteEmail('');
        // Reset success state after 3s so they can send another
        setTimeout(() => setInviteSent(false), 3000);
      }
    } catch {
      setInviteError('Network error. Please try again.');
    } finally {
      setInviteSending(false);
    }
  }

  // ── Profile (Get to Know You) state ──
  const [profileName, setProfileName] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileOccupation, setProfileOccupation] = useState('');
  const [profileRelStatus, setProfileRelStatus] = useState('');
  const [profileChildren, setProfileChildren] = useState('');

  // ── Section intro state ──
  const [showSectionIntro, setShowSectionIntro] = useState(true);

  // All instruments being presented in current phase
  const currentInstruments = phase === "addons"
    ? ADDON_INSTRUMENTS.filter(i => selectedAddons.includes(i.id))
    : battery;

  const currentInst = phase === "addons"
    ? currentInstruments[addonInstrumentIndex]
    : currentInstruments[instrumentIndex];

  const currentItem = currentInst?.items[itemIndex];

  // Total items for progress calculation
  const totalCoreItems = battery.reduce((s, i) => s + i.itemCount, 0);
  const completedCoreItems = battery.slice(0, instrumentIndex).reduce(
    (s, i) => s + i.itemCount, 0
  ) + itemIndex;
  const progressPercent = phase === "core"
    ? Math.round((completedCoreItems / totalCoreItems) * 100)
    : phase === "addon_selection" ? 100
    : 100; // Addons are bonus

  // ── Resume logic ──
  useEffect(() => {
    if (resumeInstrument && savedProgress) {
      const idx = battery.findIndex(i => i.id === resumeInstrument);
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
        program,
        current_layer: "core",
        current_instrument: battery[0].id,
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
        current_instrument: battery[0].id,
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

    // Best-effort per-item write (captures response_time_ms, which the blob
    // doesn't). Non-blocking so it never stalls the question transition, but
    // errors are logged rather than swallowed — this upsert silently failed for
    // months because its onConflict target had no matching unique constraint.
    // The authoritative write happens server-side in scoreAssessment().
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
      }).then(({ error }) => {
        if (error) console.error("[Decoded] response upsert failed:", error.message);
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
        if (instrumentIndex < battery.length - 1) {
          // Next Core instrument
          const nextInstIdx = instrumentIndex + 1;
          setInstrumentIndex(nextInstIdx);
          setItemIndex(0);
          setShowSectionIntro(true);
          itemStartTime.current = Date.now();
          saveProgress(newResponses, battery[nextInstIdx].id, 0);
        } else if (enableAddons) {
          // Core complete → adaptive add-on selection (MasteryTV)
          setPhase("addon_selection");
          saveProgress(newResponses, "addon_selection", 0);
        } else {
          // Fixed battery (e.g. Relatti): no add-ons → score + report now
          completeAssessment(newResponses);
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

  // ── Skip current addon section (e.g., user not in a relationship) ──
  function skipCurrentAddon() {
    const addonInsts = ADDON_INSTRUMENTS.filter(i => selectedAddons.includes(i.id));
    if (addonInstrumentIndex < addonInsts.length - 1) {
      setAddonInstrumentIndex(addonInstrumentIndex + 1);
      setItemIndex(0);
      setShowSectionIntro(true);
      itemStartTime.current = Date.now();
    } else {
      // Last addon — complete the assessment
      completeAssessment(responses);
    }
  }

  // ── Go back ──
  function handleBack() {
    if (phase === "addon_selection") {
      setPhase("core");
      setInstrumentIndex(battery.length - 1);
      setItemIndex(battery[battery.length - 1].items.length - 1);
      return;
    }

    setDirection(-1);
    if (itemIndex > 0) {
      setItemIndex(itemIndex - 1);
      itemStartTime.current = Date.now();
    } else if (phase === "core" && instrumentIndex > 0) {
      const prevIdx = instrumentIndex - 1;
      setInstrumentIndex(prevIdx);
      setItemIndex(battery[prevIdx].items.length - 1);
      itemStartTime.current = Date.now();
    }
  }

  // ── Complete assessment ──
  async function completeAssessment(finalResponses: Record<string, Record<string, number>>) {
    if (!assessmentId) return;
    setPhase("complete");
    setScoring(true);

    try {
      // Supersede older completed assessments for this user — WITHIN THIS
      // PROGRAM ONLY.
      //
      // The .eq("program") is load-bearing, not tidiness. Without it this
      // superseded EVERY completed assessment the user had, across all
      // programs: a dual-brand user finishing their first Relatti assessment
      // silently destroyed their MasteryTV profile — the one the executive
      // coach reads — and nothing errored. It also encodes the whole
      // retake-vs-new-program rule in one filter: a retake supersedes its
      // predecessors, a first assessment in a new program supersedes nothing.
      // (PC2.1b — directives/ASSESSMENT_PROGRAM_SCOPING.md §5.3.)
      await supabase
        .from("assessments")
        .update({ current_layer: "superseded" })
        .eq("user_id", userId)
        .eq("program", program)
        .not("completed_at", "is", null)
        .neq("id", assessmentId);

      // Save final progress snapshot
      await saveProgress(finalResponses, "complete", 0);

      // Run server-side scoring
      const result = await scoreAssessment(assessmentId);
      setScoringResult(result);

      // Auto-generate report if scoring succeeded
      if (result.success) {
        const reportResult = await generateReport(assessmentId);
        if (reportResult.success && reportResult.reportId) {
          setGeneratedReportId(reportResult.reportId);
          // Money's payoff is the coach's reveal in chat (off the trait profile the
          // report row just stored at sections.money_map), not the Big-Five
          // report viewer — go straight there. Report-viewer verticals keep the
          // click-through (autoNavigate:false).
          if (plan.autoNavigate) {
            router.push(plan.href(reportResult.reportId));
          }
        }
      }
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
    // Per-item override takes priority (e.g., CSI-4 has different scales per item)
    if (currentItem?.scaleOverride) {
      return currentItem.scaleOverride.labels;
    }
    if (currentInst?.id === "wellness_check" && currentItem) {
      const override = WELLNESS_CHECK_SCALES[currentItem.index];
      if (override) return override.labels;
    }
    return currentInst?.scaleLabels ?? [];
  }

  function getScaleRange(): [number, number] {
    // Per-item override takes priority
    if (currentItem?.scaleOverride) {
      return [currentItem.scaleOverride.min, currentItem.scaleOverride.max];
    }
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
    const WelcomeIcon = copy.welcome.icon;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <FloatingThemeToggle />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="glass w-full max-w-lg rounded-2xl p-8 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--color-primary-container)_10%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_15%,transparent)]">
            <WelcomeIcon className="h-8 w-8 text-[var(--color-primary)]" strokeWidth={1.5} />
          </div>

          <h1 className="text-headline-lg text-text-primary mb-3">
            {copy.welcome.title}
          </h1>
          <p className="mx-auto max-w-sm text-sm text-text-secondary leading-relaxed">
            {copy.welcome.body(estimatedMinutes)}
          </p>

          <div className="mx-auto mt-6 flex items-center justify-center gap-2 text-xs text-text-muted">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Most finish in {estimatedMinutes} min &middot; Save anytime &middot; Pick up where you left off</span>
          </div>

          <button
            onClick={() => setPhase(isInvitee ? "primer" : "invite")}
            className="mt-8 w-full rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
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
            {copy.invite.title}
          </h2>
          <p className="text-sm text-text-secondary text-center mb-6">
            {copy.invite.subtitle}
          </p>

          {/* Recipient chips — the "who are you inviting" picker. Shown only for
              the general share loop; hidden for relationship (always the partner)
              and money (a solo instrument, no comparison). */}
          {copy.invite.showRecipientChips && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {RECIPIENT_TYPES.map((rel) => (
                <button
                  key={rel.label}
                  onClick={() => setSelectedRelationship(rel.label === selectedRelationship ? null : rel.label)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                    selectedRelationship === rel.label
                      ? "bg-[color-mix(in_oklch,var(--color-primary-container)_15%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] text-text-primary"
                      : "bg-surface-100/50 text-text-secondary hover:bg-surface-200/50"
                  }`}
                >
                  <rel.icon className="h-4 w-4" />
                  {rel.label}
                </button>
              ))}
            </div>
          )}

          {/* Copy invite link */}
          <button
            onClick={async () => {
              const link = `${window.location.origin}/decoded?ref=${userId}`;
              await navigator.clipboard.writeText(link);
              setInviteCopied(true);
              setTimeout(() => setInviteCopied(false), 2000);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
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
              className="flex-1 rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklch,var(--color-primary-container)_20%,transparent)] transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteEmail && !inviteSending) {
                  handleSendInvite();
                }
              }}
            />
            <button
              onClick={handleSendInvite}
              disabled={!inviteEmail || inviteSending}
              className="flex items-center gap-2 rounded-lg bg-surface-200 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {inviteSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : inviteSent ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {inviteSending ? 'Sending…' : inviteSent ? 'Sent!' : 'Send'}
            </button>
          </div>
          {inviteError && (
            <p className="mt-2 text-xs text-red-400">{inviteError}</p>
          )}

          {/* Value prop — the comparison/dyad payoff. Hidden for money (a solo
              instrument with no comparison report). */}
          {copy.invite.valueProp && (
            <div
              className="mt-6 rounded-xl p-4"
              style={{
                background: "color-mix(in oklch, var(--color-primary) 5%, transparent)",
                boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 12%, transparent)",
              }}
            >
              <p className="text-sm font-medium text-text-primary">
                {copy.invite.valueProp.title}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {copy.invite.valueProp.body}
              </p>
            </div>
          )}

          {/* Privacy note */}
          <div className="mt-4 flex items-start gap-2 text-xs text-text-muted">
            <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Your results are always private &mdash; you decide if and when to share.</span>
          </div>

          {/* Continue */}
          <button
            onClick={() => setPhase("primer")}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
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
            {copy.primer.title}
          </h2>

          {/* Dimensions grid — the "What You'll Explore" preview. Skipped for
              money (dimensions: null — one focused instrument, not a battery). */}
          {copy.primer.dimensions && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {copy.primer.dimensions.map((dim) => (
                  <div
                    key={dim.label}
                    className="flex items-start gap-3 rounded-xl bg-surface-100/50 p-3"
                  >
                    <dim.icon className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{dim.label}</p>
                      <p className="text-xs text-text-muted">{dim.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs text-[var(--color-primary)] italic mb-6">
                Plus personalized sections based on your answers
              </p>
            </>
          )}

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
            className="w-full rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            {copy.primer.startLabel}
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
                {copy.primer.consentIntro}
              </p>

              <div className="space-y-4">
                {copy.primer.consentItems.map((label, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consentChecks[i]}
                      onChange={() => {
                        const next = [...consentChecks];
                        next[i] = !next[i];
                        setConsentChecks(next);
                      }}
                      className="mt-1 h-4 w-4 rounded accent-[var(--color-primary-container)] flex-shrink-0"
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
                  setPhase("profile");
                }}
                disabled={!consentChecks.every(Boolean)}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Continue to Assessment
              </button>

              <p className="mt-4 text-center text-xs text-text-muted">
                By continuing, you agree to our{" "}
                <a href="/terms" className="text-[var(--color-primary)] hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-[var(--color-primary)] hover:underline">Privacy Policy</a>
              </p>
            </motion.div>
          </div>
        )}
      </div>
    );
  }
  // ── Profile Phase — "Get to Know You" ──
  if (phase === "profile") {
    async function saveProfile() {
      const profileData: Record<string, string | number | null> = {};
      if (profileName.trim()) profileData.name = profileName.trim();
      if (profileAge.trim()) profileData.age = parseInt(profileAge, 10) || null;
      if (profileGender) profileData.gender = profileGender.toLowerCase().replace(/ /g, '_');
      if (profileOccupation.trim()) profileData.occupation = profileOccupation.trim();
      if (profileRelStatus) profileData.relationship_status = profileRelStatus.toLowerCase().replace(/ /g, '_');
      if (profileChildren) profileData.has_children = profileChildren.toLowerCase().replace(/ /g, '_');

      if (Object.keys(profileData).length > 0) {
        await supabase.from('users').update(profileData).eq('id', userId);
      }
      setPhase("core");
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-start px-4 py-12">
        <FloatingThemeToggle />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="glass w-full max-w-lg rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--color-primary-container)_10%,transparent)]">
              <User className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-headline-md text-text-primary">
              Let&apos;s Get to Know You
            </h2>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            A few details to personalize your journey. Only your name is required &mdash;
            everything else helps us tailor your insights.
          </p>

          <div className="space-y-5">
            {/* Name (required) */}
            <div>
              <label htmlFor="profile-name" className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                Name <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Whatever feels right — real name, nickname, anything"
                className="w-full rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] border border-white/10 transition-all"
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="profile-age" className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                Age
              </label>
              <input
                id="profile-age"
                type="number"
                min={18}
                max={120}
                value={profileAge}
                onChange={(e) => setProfileAge(e.target.value)}
                placeholder="25"
                className="w-full max-w-[100px] rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] border border-white/10 transition-all"
              />
            </div>

            {/* Gender (chips) */}
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                Gender
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setProfileGender(profileGender === g ? '' : g)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      profileGender === g
                        ? 'bg-[color-mix(in_oklch,var(--color-primary-container)_15%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] text-text-primary'
                        : 'bg-surface-100/50 text-text-secondary hover:bg-surface-200/50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Occupation */}
            <div>
              <label htmlFor="profile-occupation" className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                Occupation
              </label>
              <input
                id="profile-occupation"
                type="text"
                value={profileOccupation}
                onChange={(e) => setProfileOccupation(e.target.value)}
                placeholder="e.g. designer, student, nurse..."
                className="w-full rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] border border-white/10 transition-all"
              />
            </div>

            {/* Relationship Status + Children */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-rel" className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                  Relationship
                </label>
                <select
                  id="profile-rel"
                  value={profileRelStatus}
                  onChange={(e) => setProfileRelStatus(e.target.value)}
                  className="w-full rounded-lg bg-surface-100 px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] border border-white/10 transition-all appearance-none"
                >
                  <option value="">Select...</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                  Children
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CHILDREN_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProfileChildren(profileChildren === c ? '' : c)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        profileChildren === c
                          ? 'bg-[color-mix(in_oklch,var(--color-primary-container)_15%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] text-text-primary'
                          : 'bg-surface-100/50 text-text-secondary hover:bg-surface-200/50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={!profileName.trim()}
            className="mt-8 w-full rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Begin Assessment →
          </button>

          <button
            onClick={() => setPhase("primer")}
            className="mt-3 w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Back
          </button>
        </motion.div>
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
                    ? "ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] bg-[color-mix(in_oklch,var(--color-primary-container)_5%,transparent)]"
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
                  className="mt-1 accent-[var(--color-primary-container)]"
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
              className="flex-1 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
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
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[var(--color-primary)]" />
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
              <p className="mt-3 text-sm text-text-secondary">
                {generatedReportId
                  ? plan.ready
                  : 'Your full personalized report will be available in your dashboard.'}
              </p>
              <a
                href={plan.href(generatedReportId)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                {generatedReportId ? plan.cta : 'Go to Dashboard'}
                <ArrowRight className="h-4 w-4" />
              </a>
            </>
          ) : (
            /* Error state */
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--color-warning)_10%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-warning)_20%,transparent)]">
                <AlertTriangle className="h-8 w-8 text-[var(--color-warning)]" />
              </div>
              <h2 className="text-headline-md text-text-primary">Almost there</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {scoringResult?.error ?? "Your responses are saved. We'll generate your report shortly."}
              </p>
              <button
                onClick={() => assessmentId && completeAssessment(responses)}
                className="mt-4 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
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
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)]"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* ── Question area ── */}
      <div className="flex flex-1 flex-col items-center justify-start px-4 py-12">
        <div className="w-full max-w-xl">

          {/* ── Section Intro Card ── */}
          {itemIndex === 0 && showSectionIntro ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="glass rounded-2xl p-8 text-center"
            >
              <p className="text-label-md text-[var(--color-primary)] mb-3 tracking-wider uppercase">
                {currentInst.shortName}
              </p>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                {currentInst.name}
              </h2>
              <p className="text-sm text-text-muted mb-4">
                {currentInst.items.length} questions &middot; ~{currentInst.estimatedMinutes} min
              </p>

              <div className="rounded-xl bg-[color-mix(in_oklch,var(--color-primary-container)_5%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_10%,transparent)] p-4 mb-6">
                <p className="text-label-sm text-[var(--color-primary)] mb-1 uppercase tracking-wider">Instructions</p>
                <p className="text-sm text-text-secondary italic">
                  {currentInst.description}
                </p>
              </div>

              <button
                onClick={() => setShowSectionIntro(false)}
                className="rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] px-8 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Start Section ↵
              </button>

              {phase === "addons" && (
                <button
                  onClick={skipCurrentAddon}
                  className="mt-3 block mx-auto text-sm text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip this section →
                </button>
              )}
            </motion.div>
          ) : (
            <>
              {/* Persistent instruction context */}
              <p className="text-center text-xs text-[var(--color-primary)] italic mb-6">
                {currentInst.description}
              </p>

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

              {/* Scale buttons — always one row */}
              <div className="flex justify-center gap-1.5 sm:gap-2">
                {scaleValues.map((value, idx) => {
                  const label = scaleLabels[idx] || '';
                  const isSelected = currentAnswer === value;

                  return (
                    <button
                      key={value}
                      onClick={() => handleAnswer(value)}
                      className={`flex-1 min-w-0 rounded-xl py-3 text-center transition-all ${
                        isSelected
                          ? "bg-[color-mix(in_oklch,var(--color-primary-container)_15%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary-container)_30%,transparent)] text-text-primary"
                          : "glass-hover text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <span className="flex flex-col items-center gap-1">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isSelected
                            ? "bg-[var(--color-primary-container)] text-white"
                            : "bg-surface-200 text-text-muted"
                        }`}>
                          {value}
                        </span>
                        {label && (
                          <span className="text-[10px] sm:text-xs leading-tight text-center">
                            {label.split('\n').map((line, i) => (
                              <span key={i} className="block">{line}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Keyboard hint */}
              <p className="mt-8 text-center text-xs text-text-muted">
                Click or press {scaleMin}–{scaleMax} on your keyboard to answer
              </p>

              {phase === "addons" && (
                <button
                  onClick={skipCurrentAddon}
                  className="mt-4 block mx-auto text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip this section →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
