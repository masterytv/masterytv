"use client";

/**
 * Onboarding Page — Production-Grade Multi-Step Wizard
 * 
 * Aesthetic: Luxury minimal dark — layered depth, restrained motion
 * Typography: Outfit (display) + Inter (body)
 * 
 * Flow:
 *   Screen 1: "About You" — LinkedIn, Website, context (≥1 required, validated)
 *             → fires background research on "Next"
 *   Screen 2: "Starting Point" — Challenge / Goal / Systematic
 *             → research runs in parallel (badge shows status)
 *   Screen 3: "Confirm" — review research findings
 *   Screen 4: "Coaching Letter" — personalized welcome
 *   Screen 5: "Connect" channels → redirect to chat
 * 
 * Architecture: SPRINT.md S3.2
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { type ResearchResults } from "@/lib/onboarding/machine";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mail, Send } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildAssessmentProfile, generateFirstMessage } from "@/lib/decoded/coaching";
import "./onboarding.css";

// ─── TYPES ──────────────────────────────────────────────────────────────

type Step = "about_you" | "starting_point" | "research_pending" | "research_confirm" | "coaching_letter" | "channel_connect";

const STEP_ORDER: Step[] = ["about_you", "starting_point", "research_confirm", "coaching_letter", "channel_connect"];
const STEP_DISPLAY: Record<Step, string> = {
  about_you: "About You",
  starting_point: "Focus",
  research_pending: "Focus",
  research_confirm: "Review",
  coaching_letter: "Letter",
  channel_connect: "Connect",
};

// ─── VALIDATION HELPERS ─────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true; // Empty is OK (not required individually)
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function isValidLinkedInUrl(url: string): boolean {
  if (!url.trim()) return true;
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/.test(normalized);
}

// ─── SVG ICONS ──────────────────────────────────────────────────────────

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function MountainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" className="spinner-svg" />
    </svg>
  );
}

// ─── PROGRESS BAR ───────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const displaySteps = STEP_ORDER;
  const resolved = currentStep === "research_pending" ? "starting_point" : currentStep;
  const stepIdx = displaySteps.indexOf(resolved);

  return (
    <div className="ob-progress" role="progressbar" aria-valuenow={stepIdx + 1} aria-valuemin={1} aria-valuemax={displaySteps.length}>
      <div className="ob-progress__track">
        {displaySteps.map((step, i) => (
          <div key={step} className={`ob-progress__step ${i <= stepIdx ? "active" : ""} ${i === stepIdx ? "current" : ""}`}>
            <div className="ob-progress__dot">
              {i < stepIdx ? <CheckIcon /> : <span>{i + 1}</span>}
            </div>
            <span className="ob-progress__label">{STEP_DISPLAY[step]}</span>
          </div>
        ))}
        <div className="ob-progress__line">
          <div className="ob-progress__line-fill" style={{ width: `${(stepIdx / (displaySteps.length - 1)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── STEP 1: ABOUT YOU ──────────────────────────────────────────────────

function AboutYouStep({
  onNext,
  loading,
}: {
  onNext: (data: { linkedinUrl: string; websiteUrl: string; moreInfo: string }) => void;
  loading: boolean;
}) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [moreInfo, setMoreInfo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const hasInput = linkedinUrl.trim() || websiteUrl.trim() || moreInfo.trim();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!hasInput) {
      newErrors.general = "Please fill in at least one field so your coach can prepare.";
    }

    if (linkedinUrl.trim() && !isValidLinkedInUrl(linkedinUrl)) {
      newErrors.linkedin = "Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)";
    }

    if (websiteUrl.trim() && !isValidUrl(websiteUrl)) {
      newErrors.website = "Please enter a valid website URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Validate on blur
    const newErrors = { ...errors };
    if (field === "linkedin" && linkedinUrl.trim() && !isValidLinkedInUrl(linkedinUrl)) {
      newErrors.linkedin = "Please enter a valid LinkedIn profile URL";
    } else if (field === "linkedin") {
      delete newErrors.linkedin;
    }
    if (field === "website" && websiteUrl.trim() && !isValidUrl(websiteUrl)) {
      newErrors.website = "Please enter a valid website URL";
    } else if (field === "website") {
      delete newErrors.website;
    }
    setErrors(newErrors);
  }

  function handleNext() {
    setTouched({ linkedin: true, website: true, more: true });
    if (!validate()) return;
    onNext({ linkedinUrl: linkedinUrl.trim(), websiteUrl: websiteUrl.trim(), moreInfo: moreInfo.trim() });
  }

  return (
    <div className="ob-step">
      <div className="ob-step__header">
        <h2 className="ob-step__title">Let&apos;s get to know you</h2>
        <p className="ob-step__desc">
          Share any of the following so your coach can do their homework before your first session.
        </p>
      </div>

      <div className="ob-fields">
        <div className="ob-field">
          <label htmlFor="linkedin-url" className="ob-field__label">
            <LinkedInIcon />
            LinkedIn Profile
          </label>
          <div className={`ob-field__input-wrap ${touched.linkedin && errors.linkedin ? "error" : ""} ${touched.linkedin && linkedinUrl.trim() && !errors.linkedin ? "valid" : ""}`}>
            <input
              id="linkedin-url"
              type="url"
              className="ob-field__input"
              placeholder="linkedin.com/in/yourname"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              onBlur={() => handleBlur("linkedin")}
              autoComplete="url"
            />
            {touched.linkedin && linkedinUrl.trim() && !errors.linkedin && (
              <span className="ob-field__check"><CheckIcon /></span>
            )}
          </div>
          {touched.linkedin && errors.linkedin && (
            <p className="ob-field__error" role="alert">{errors.linkedin}</p>
          )}
          <p className="ob-field__hint">We&apos;ll scan your experience, skills, and headline</p>
        </div>

        <div className="ob-field">
          <label htmlFor="website-url" className="ob-field__label">
            <GlobeIcon />
            Company Website
          </label>
          <div className={`ob-field__input-wrap ${touched.website && errors.website ? "error" : ""} ${touched.website && websiteUrl.trim() && !errors.website ? "valid" : ""}`}>
            <input
              id="website-url"
              type="url"
              className="ob-field__input"
              placeholder="yourcompany.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onBlur={() => handleBlur("website")}
              autoComplete="url"
            />
            {touched.website && websiteUrl.trim() && !errors.website && (
              <span className="ob-field__check"><CheckIcon /></span>
            )}
          </div>
          {touched.website && errors.website && (
            <p className="ob-field__error" role="alert">{errors.website}</p>
          )}
          <p className="ob-field__hint">We&apos;ll learn about your business, industry, and stage</p>
        </div>

        <div className="ob-field">
          <label htmlFor="more-info" className="ob-field__label">
            Tell us more
            <span className="ob-field__optional">optional</span>
          </label>
          <textarea
            id="more-info"
            className="ob-field__textarea"
            placeholder="e.g., I'm a SaaS founder trying to scale from $10K to $50K MRR, or I just raised a Series A and need help building my leadership team..."
            rows={4}
            value={moreInfo}
            onChange={(e) => setMoreInfo(e.target.value)}
          />
        </div>
      </div>

      {errors.general && (
        <p className="ob-field__error ob-field__error--general" role="alert">{errors.general}</p>
      )}

      <div className="ob-actions">
        <button className="ob-btn ob-btn--primary" onClick={handleNext} disabled={loading}>
          {loading ? <><SpinnerIcon /> Starting research...</> : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2: STARTING POINT ────────────────────────────────────────────

function StartingPointStep({
  onSelect,
  researchStatus,
}: {
  onSelect: (type: "challenge" | "goal" | "systematic", input: string) => void;
  researchStatus: "pending" | "done" | "failed";
}) {
  const [selected, setSelected] = useState<"challenge" | "goal" | "systematic" | null>(null);
  const [details, setDetails] = useState("");

  const cards = [
    {
      type: "challenge" as const,
      icon: <TargetIcon />,
      title: "Specific Challenge",
      desc: "I have a problem I need to solve",
      placeholder: "What's the challenge you're facing?",
    },
    {
      type: "goal" as const,
      icon: <MountainIcon />,
      title: "Big Goal",
      desc: "I'm working toward something ambitious",
      placeholder: "What are you trying to achieve?",
    },
    {
      type: "systematic" as const,
      icon: <ClipboardIcon />,
      title: "Questionnaire",
      desc: "Start with a guided assessment",
      placeholder: "Anything specific you want us to cover?",
    },
  ];

  return (
    <div className="ob-step">
      <div className="ob-step__header">
        <div>
          <h2 className="ob-step__title">What brings you here?</h2>
          <p className="ob-step__desc">Pick an approach so your coach knows where to focus.</p>
        </div>
        <div className={`ob-badge ${researchStatus === "done" ? "ob-badge--done" : ""}`}>
          {researchStatus === "pending" && <><SpinnerIcon /> Researching...</>}
          {researchStatus === "done" && <><CheckIcon /> Research done</>}
          {researchStatus === "failed" && <>Research unavailable</>}
        </div>
      </div>

      <div className="ob-cards">
        {cards.map((card) => (
          <button
            key={card.type}
            className={`ob-card ${selected === card.type ? "ob-card--selected" : ""}`}
            onClick={() => setSelected(card.type)}
            aria-pressed={selected === card.type}
          >
            <span className="ob-card__icon">{card.icon}</span>
            <h3 className="ob-card__title">{card.title}</h3>
            <p className="ob-card__desc">{card.desc}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="ob-field" style={{ marginTop: "1.5rem" }}>
              <label htmlFor="starting-details" className="ob-field__label">
                Tell your coach more
                <span className="ob-field__optional">optional</span>
              </label>
              <textarea
                id="starting-details"
                className="ob-field__textarea"
                placeholder={cards.find((c) => c.type === selected)?.placeholder}
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ob-actions">
        <button className="ob-btn ob-btn--primary" onClick={() => selected && onSelect(selected, details)} disabled={!selected}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 3: RESEARCH CONFIRM ──────────────────────────────────────────

function ResearchConfirmStep({
  results,
  onConfirm,
  loading,
}: {
  results: ResearchResults | null;
  onConfirm: (confirmed: ResearchResults) => void;
  loading: boolean;
}) {
  if (!results) {
    return (
      <div className="ob-step ob-step--center">
        <div className="ob-loader"><SpinnerIcon size={32} /></div>
        <h2 className="ob-step__title">Finishing research...</h2>
        <p className="ob-step__desc">Almost there — assembling what we found.</p>
      </div>
    );
  }

  const items = [
    { label: "Company", value: results.company_name },
    { label: "Role", value: results.user_role },
    { label: "Industry", value: results.industry },
    { label: "Stage", value: results.stage },
  ].filter((item) => item.value);

  return (
    <div className="ob-step">
      <div className="ob-step__header">
        <h2 className="ob-step__title">Here&apos;s what we found</h2>
        <p className="ob-step__desc">Review this and correct anything that&apos;s off. Accuracy = better coaching.</p>
      </div>

      <div className="ob-research">
        <div className="ob-research__grid">
          {items.map((item) => (
            <div key={item.label} className="ob-research__item">
              <span className="ob-research__label">{item.label}</span>
              <span className="ob-research__value">{item.value}</span>
            </div>
          ))}
        </div>

        {results.user_background && (
          <div className="ob-research__item ob-research__item--full">
            <span className="ob-research__label">Background</span>
            <span className="ob-research__value">{results.user_background}</span>
          </div>
        )}

        {results.challenges_detected && results.challenges_detected.length > 0 && (
          <div className="ob-research__item ob-research__item--full">
            <span className="ob-research__label">Potential Coaching Topics</span>
            <ul className="ob-research__list">
              {results.challenges_detected.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="ob-actions">
        <button className="ob-btn ob-btn--primary" onClick={() => onConfirm(results)} disabled={loading}>
          {loading ? <><SpinnerIcon /> Saving...</> : "Looks Good — Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 4: COACHING LETTER ────────────────────────────────────────────

function parseMarkdownToHtml(md: string): string {
  return md
    // Headings: ### → h4, ## → h3, # → h2
    .replace(/^### (.+)$/gm, '<h4 class="ob-letter__h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="ob-letter__h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="ob-letter__h2">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul class="ob-letter__list">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs: wrap remaining text blocks
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) return trimmed;
      return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');
}

function CoachingLetterStep({ letter, onContinue }: { letter: string | null; onContinue: () => void }) {
  if (!letter) {
    return (
      <div className="ob-step ob-step--center">
        <div className="ob-loader"><SpinnerIcon size={32} /></div>
        <h2 className="ob-step__title">Writing your coaching letter...</h2>
        <p className="ob-step__desc">This takes up to a minute while your coach reviews your background and prepares a personalized introduction.</p>
      </div>
    );
  }

  const html = parseMarkdownToHtml(letter);

  return (
    <div className="ob-step">
      <div className="ob-step__header">
        <h2 className="ob-step__title">Your Coaching Letter</h2>
      </div>
      <div className="ob-letter" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="ob-actions">
        <button className="ob-btn ob-btn--primary" onClick={onContinue}>
          Let&apos;s Go →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 5: CHANNEL CONNECT ────────────────────────────────────────────

function ChannelConnectStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="ob-step">
      <div className="ob-step__header">
        <h2 className="ob-step__title">You&apos;re all set</h2>
        <p className="ob-step__desc">Your coach is ready. Here&apos;s how you can connect:</p>
      </div>

      <div className="ob-channels">
        <div className="ob-channel ob-channel--active">
          <div className="ob-channel__icon"><MessageSquare size={22} strokeWidth={1.5} /></div>
          <div className="ob-channel__info">
            <h3>Web Chat</h3>
            <p>Always on — chat anytime</p>
          </div>
          <span className="ob-channel__status ob-channel__status--connected">Connected</span>
        </div>
        <div className="ob-channel">
          <div className="ob-channel__icon"><Mail size={22} strokeWidth={1.5} /></div>
          <div className="ob-channel__info">
            <h3>Email</h3>
            <p>Morning briefings &amp; check-ins</p>
          </div>
          <span className="ob-channel__status ob-channel__status--connected">Connected</span>
        </div>
        <div className="ob-channel ob-channel--disabled">
          <div className="ob-channel__icon"><Send size={22} strokeWidth={1.5} /></div>
          <div className="ob-channel__info">
            <h3>Telegram</h3>
            <p>Quick messages &amp; coaching</p>
          </div>
          <span className="ob-channel__status">Coming Soon</span>
        </div>
      </div>

      <div className="ob-actions">
        <button className="ob-btn ob-btn--primary" onClick={onComplete}>
          Start My First Session →
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("about_you");
  const [loading, setLoading] = useState(false);
  const [researchStatus, setResearchStatus] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const [researchResults, setResearchResults] = useState<ResearchResults | null>(null);
  const [coachingLetter, setCoachingLetter] = useState<string | null>(null);
  const [startingPointType, setStartingPointType] = useState("");
  const [startingPointInput, setStartingPointInput] = useState("");
  const [moreInfo, setMoreInfo] = useState("");
  const researchPromiseRef = useRef<Promise<ResearchResults | null> | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Decoded Fast-Track: detect assessment users on mount ──
  const [isDecodedUser, setIsDecodedUser] = useState(false);
  const [decodedChecked, setDecodedChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkDecoded() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setDecodedChecked(true); return; }

        // Check if user has a completed Decoded assessment report
        const { data: report } = await supabase
          .from('assessment_reports')
          .select('archetype_base, archetype_sublabel, archetype_tagline, generated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!report || cancelled) { setDecodedChecked(true); return; }

        // User has a Decoded assessment — load scores and generate letter
        const { data: scores } = await supabase
          .from('assessment_scores')
          .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
          .eq('user_id', user.id);

        if (scores && scores.length > 0 && !cancelled) {
          const profile = buildAssessmentProfile(scores, report);
          const userName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          const letter = generateFirstMessage(profile, userName);

          setIsDecodedUser(true);
          setCoachingLetter(letter);
          setStep('coaching_letter'); // Skip steps 1-3 entirely
        }
      } catch (e) {
        // Non-fatal — fall through to normal onboarding
        console.error('[onboarding] Decoded check failed:', (e as Error).message);
      } finally {
        if (!cancelled) setDecodedChecked(true);
      }
    }
    checkDecoded();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1 → 2: Fire research in background
  const handleAboutYouNext = useCallback(async (data: { linkedinUrl: string; websiteUrl: string; moreInfo: string }) => {
    setLoading(true);
    setMoreInfo(data.moreInfo);
    setResearchStatus("pending");

    const researchPromise = (async (): Promise<ResearchResults | null> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-research`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              linkedin_url: data.linkedinUrl,
              website_url: data.websiteUrl,
              starting_point_type: "systematic",
              starting_point_input: data.moreInfo || "Getting started with coaching",
            }),
          }
        );
        if (!res.ok) { setResearchStatus("failed"); return null; }
        const results = await res.json();
        setResearchResults(results);
        setResearchStatus("done");
        return results;
      } catch { setResearchStatus("failed"); return null; }
    })();

    researchPromiseRef.current = researchPromise;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users").update({
        linkedin_url: data.linkedinUrl || null,
        website_url: data.websiteUrl || null,
      }).eq("id", user.id);
    }

    setLoading(false);
    setStep("starting_point");
  }, [supabase]);

  // Step 2 → 3: Wait for research if still pending
  const handleStartingPointSelect = useCallback(async (type: "challenge" | "goal" | "systematic", input: string) => {
    setStartingPointType(type);
    setStartingPointInput(input);

    if (researchStatus === "pending" && researchPromiseRef.current) {
      setStep("research_pending");
      await researchPromiseRef.current;
    }

    if (researchResults || researchStatus === "done") {
      setStep("research_confirm");
    } else {
      triggerLetterGeneration(type, input);
    }
  }, [researchStatus, researchResults]);

  // Step 3 → 4: Confirm + generate letter
  const handleConfirmResearch = useCallback(async (confirmed: ResearchResults) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ confirmed_research: confirmed, starting_point_type: startingPointType }),
      });
    } catch (e) { console.error("[onboarding] Confirm:", (e as Error).message); }
    setLoading(false);
    triggerLetterGeneration(startingPointType, startingPointInput);
  }, [supabase, startingPointType, startingPointInput]);

  // Generate coaching letter (20s timeout to prevent infinite spinner)
  const triggerLetterGeneration = useCallback(async (spType: string, spInput: string) => {
    setStep("coaching_letter");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ starting_point: spType, user_input: spInput || moreInfo || "Getting started" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) { const d = await res.json(); setCoachingLetter(d.letter); }
      else { throw new Error(`Letter API returned ${res.status}`); }
    } catch (e) {
      clearTimeout(timeout);
      console.error("[onboarding] Letter:", (e as Error).message);
      setCoachingLetter("Welcome! Your coach is ready. Head to the chat to begin.");
    }
  }, [supabase, moreInfo]);

  // Complete onboarding
  const handleComplete = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("onboarding_state").upsert(
        { user_id: user.id, current_step: "complete", updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }
    router.push("/coachapp/dashboard/chat");
  }, [supabase, router]);

  const slideVariants = {
    enter: { opacity: 0, x: 24 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  return (
    <div className="ob-page">
      <header className="ob-header">
        <div className="ob-header__row">
          <h1 className="ob-brand">Mastery Coach</h1>
          <ThemeToggle />
        </div>
        {/* Decoded users skip the progress bar since they only see 2 steps */}
        {!isDecodedUser && <ProgressBar currentStep={step} />}
      </header>

      <main className="ob-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {step === "about_you" && <AboutYouStep onNext={handleAboutYouNext} loading={loading} />}
            {step === "starting_point" && (
              <StartingPointStep onSelect={handleStartingPointSelect} researchStatus={researchStatus === "idle" ? "pending" : researchStatus as "pending" | "done" | "failed"} />
            )}
            {step === "research_pending" && <ResearchConfirmStep results={null} onConfirm={() => {}} loading={false} />}
            {step === "research_confirm" && <ResearchConfirmStep results={researchResults} onConfirm={handleConfirmResearch} loading={loading} />}
            {step === "coaching_letter" && <CoachingLetterStep letter={coachingLetter} onContinue={() => setStep("channel_connect")} />}
            {step === "channel_connect" && <ChannelConnectStep onComplete={handleComplete} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
