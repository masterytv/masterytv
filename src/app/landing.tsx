"use client";

/**
 * LandingPage — Premium marketing page for Mastery Coach
 * S6.11 — All CTAs open beta lead capture modal
 *
 * Hero: Option C from MARKETING.md ("Not a Chatbot")
 * Sections: Hero → Social Proof → Memory → How It Works →
 *           Adaptation → Privacy → Comparison → Pricing → Final CTA → Footer
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Users,
  Target,
  TrendingUp,
  ArrowRight,
  Shield,
  Lock,
  Download,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  Brain,
  MessageCircle,
  Search,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ════════════════════════════════════════════
   Animation variants (respects reduced motion)
   ════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ════════════════════════════════════════════
   Data
   ════════════════════════════════════════════ */

const SOCIAL_PROOF = [
  {
    quote:
      "My human coach knew my name but forgot my goals between sessions. Mastery Coach reminded me about a commitment I made 3 weeks ago — at exactly the right moment.",
    author: "Sarah M.",
    role: "Startup Founder",
  },
  {
    quote:
      "It told me I had a pattern of avoiding hard conversations. I didn't see it. My coach did — because it remembered every time I mentioned avoiding one.",
    author: "James K.",
    role: "VP of Engineering",
  },
  {
    quote:
      "The first few sessions it was pretty generic. By week 2, it was speaking my language. Direct, no fluff, straight to what matters.",
    author: "Alex R.",
    role: "Serial Entrepreneur",
  },
];

const MEMORY_CARDS = [
  {
    icon: Users,
    title: "Your People",
    description:
      "Your coach knows the names, roles, and dynamics of every important person in your professional life.",
    quote:
      '"You mentioned you and Chuck got in a heated debate yesterday. Have you reached out to him to resolve it like we discussed?"',
  },
  {
    icon: Target,
    title: "Your Goals",
    description:
      "Not just what you want to achieve — your coach tracks life goals, quarterly rocks, and weekly targets.",
    quote:
      '"Your Q2 rock was \'hire your first employee.\' You\'re at 30% progress with 6 weeks left. Want to break it into smaller steps?"',
  },
  {
    icon: TrendingUp,
    title: "Your Patterns",
    description:
      "Human coaches take months to spot a pattern. Your AI coach detects them in weeks — because it remembers everything.",
    quote:
      '"I\'ve noticed you tend to delay difficult conversations — this is the 3rd time in 2 months. Want to explore what\'s behind this?"',
  },
];

const FRAMEWORK_TIERS = [
  {
    tier: "Tier 1",
    emoji: "🏗️",
    label: "Session Structure",
    tagline: "How we coach you",
    color: "var(--color-primary)",
    frameworks: ["GROW", "OSKAR", "Motivational Interviewing", "Socratic Questioning"],
    example: "You're stuck on a decision → GROW walks you through Goal → Reality → Options → Will.",
  },
  {
    tier: "Tier 2",
    emoji: "📈",
    label: "Business & Execution",
    tagline: "What we coach you on",
    color: "var(--success-hex)",
    frameworks: ["EOS/Traction", "Lean Startup", "Hormozi Offers", "Situational Leadership", "Robbins RPM"],
    example: "Your pricing isn't converting → Hormozi Offer Optimization restructures your value stack.",
  },
  {
    tier: "Tier 3",
    emoji: "🧠",
    label: "Mindset & Resilience",
    tagline: "Who you're becoming",
    color: "#b4a6ff",
    frameworks: ["Stoic Philosophy", "PERMA+", "Growth Mindset", "Mindfulness", "Stages of Change"],
    example: "You're burned out → PERMA+ identifies which life pillar is depleted and rebuilds it.",
  },
  {
    tier: "Tier 4",
    emoji: "🔮",
    label: "Deep Psychology",
    tagline: "Trust-unlocked (Month 2+)",
    color: "#ff8fa3",
    frameworks: ["Narrative Coaching", "Shadow Work", "Inner Critic", "Psychodynamic", "Emotional Fluidity"],
    example: "You keep saying 'I'm not a real CEO' → Narrative Coaching rewrites the story you're trapped in.",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Sign Up",
    description:
      "Create your account in 30 seconds. No credit card required for the free tier.",
  },
  {
    step: 2,
    title: "Your Coach Researches You",
    description:
      "Share your LinkedIn or website. Your coach builds a profile and writes your personalized coaching letter.",
  },
  {
    step: 3,
    title: "Start Coaching",
    description:
      "Chat on the web, reply via email, or message on Telegram. Your coach is always ready — and always remembers.",
  },
];

const ADAPTATION_DIMS = [
  {
    label: "Directness",
    icon: "🎯",
    low: "Diplomatic",
    high: "Straight Talk",
    value: 72,
  },
  {
    label: "Warmth",
    icon: "🤝",
    low: "Challenge-First",
    high: "Relationship-First",
    value: 58,
  },
  {
    label: "Autonomy",
    icon: "🧭",
    low: "Tell Me What to Do",
    high: "Help Me Figure It Out",
    value: 65,
  },
  {
    label: "Challenge Level",
    icon: "🔥",
    low: "Comfort Zone",
    high: "Stretch Zone",
    value: 80,
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Remembers your goals",
    generic: "Resets every chat",
    human: "From notes (if reviewed)",
    mastery: "Automatic, always current",
  },
  {
    feature: "Knows your people",
    generic: "No",
    human: "After months",
    mastery: "From Day 1",
  },
  {
    feature: "Detects your patterns",
    generic: "No",
    human: "After many sessions",
    mastery: "Within weeks",
  },
  {
    feature: "Adapts communication style",
    generic: "One voice",
    human: "Intuitively, slowly",
    mastery: "8 dimensions, calibrated by Week 2",
  },
  {
    feature: "Coaching methodologies",
    generic: "Generic prompts",
    human: "2–3 they know",
    mastery: "20+ frameworks, auto-selected",
  },
  {
    feature: "Proactive check-ins",
    generic: "You initiate",
    human: "Between sessions only",
    mastery: "Daily, intelligent",
  },
  {
    feature: "Available 24/7",
    generic: "Yes",
    human: "Scheduled only",
    mastery: "Any channel, any time",
  },
  {
    feature: "Cost",
    generic: "$0–20/mo",
    human: "$300–500/hr",
    mastery: "$99/mo",
  },
];

const FREE_FEATURES = [
  "5 messages per day",
  "Web chat",
  "Personalized coaching letter",
  "Background research",
  "Memory & pattern detection",
];

const CORE_FEATURES = [
  "Unlimited messages",
  "Web, email, and Telegram",
  "Morning briefings",
  "Accountability check-ins",
  "20+ coaching frameworks",
  "AI tool recommendations",
  "Priority support",
];

const PRIVACY_FEATURES = [
  { icon: Lock, text: "End-to-end encrypted conversations" },
  { icon: Shield, text: "Never sold, never shared, never used to train AI" },
  { icon: Download, text: "Export your data anytime" },
  { icon: Trash2, text: "Delete everything with one click" },
];

/* ════════════════════════════════════════════
   Beta Capture Modal
   ════════════════════════════════════════════ */

function BetaModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      // Store lead in Supabase — use the existing EmailForm pattern
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("email_signups")
        .insert({ email });

      if (insertError) {
        // Duplicate email is fine — treat as success
        if (insertError.code === "23505") {
          setSubmitted(true);
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setEmail("");
        setSubmitted(false);
        setError(null);
      }, 300);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="landing__modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Join the beta waitlist"
        >
          <motion.div
            className="landing__modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.25,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-surface-200/50 transition-colors"
              aria-label="Close"
              style={{ position: "absolute", top: "1rem", right: "1rem" }}
            >
              <X className="w-5 h-5" style={{ color: "var(--text-hint)" }} />
            </button>

            {submitted ? (
              <motion.div
                className="landing__modal-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="landing__modal-success-icon">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="landing__modal-title">You&apos;re on the list!</h3>
                <p className="landing__modal-desc">
                  We&apos;ll send you an invite as soon as we&apos;re ready.
                  Keep an eye on your inbox.
                </p>
                <button
                  onClick={onClose}
                  className="landing__cta-primary"
                  style={{ marginTop: "0.5rem" }}
                >
                  Got it
                </button>
              </motion.div>
            ) : (
              <>
                <div style={{ marginBottom: "0.25rem" }}>
                  <Sparkles
                    className="w-5 h-5"
                    style={{
                      color: "var(--color-primary-container)",
                      marginBottom: "0.75rem",
                    }}
                  />
                </div>
                <h3 className="landing__modal-title">We&apos;re launching soon</h3>
                <p className="landing__modal-desc">
                  Enter your email to be invited to the beta. Early members get
                  priority access and founding member pricing.
                </p>

                <form onSubmit={handleSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="landing__modal-input"
                    autoFocus
                    id="beta-email-input"
                  />

                  {error && (
                    <p
                      style={{
                        color: "var(--danger-hex)",
                        fontSize: "0.8125rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="landing__cta-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "1rem",
                      opacity: loading || !email ? 0.6 : 1,
                      cursor: loading ? "wait" : "pointer",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Join the Waitlist
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--text-hint)",
                    marginTop: "1rem",
                    textAlign: "center",
                  }}
                >
                  No spam. We&apos;ll only email you about the launch.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════ */

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  // Nav scroll detection
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation wrapper — returns static props when reduced motion
  const anim = prefersReducedMotion
    ? { initial: undefined, whileInView: undefined, viewport: undefined }
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, margin: "-80px" },
      };

  return (
    <>
      {/* ─── Navigation ─── */}
      <nav
        className={`landing__nav ${scrolled ? "landing__nav--scrolled" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="landing__nav-inner">
          <div className="landing__logo">
            <Brain className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
            Mastery Coach
          </div>
          <div className="landing__nav-actions">
            <button
              onClick={openModal}
              className="landing__cta-ghost"
              id="nav-sign-in"
            >
              Sign In
            </button>
            <button
              onClick={openModal}
              className="landing__cta-primary landing__cta-primary--sm"
              id="nav-get-started"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="landing__hero" id="hero">
        <div className="landing__dot-pattern" aria-hidden="true" style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          opacity: 0.1,
        }} />
        <motion.div
          className="landing__hero-content"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="landing__hero-label">
            <Sparkles className="w-3.5 h-3.5" />
            AI Coaching for High-Performers
          </div>
          <h1 className="landing__hero-title">
            Not a Chatbot.
            <br />A Performance Coach That <em>Really Knows You.</em>
          </h1>
          <p className="landing__hero-sub">
            It knows your boss is Chuck, your Q2 rock is hiring, and you always
            procrastinate before investor calls. Because it remembers —{" "}
            <strong style={{ color: "#dfe4fe" }}>everything.</strong>
          </p>
          <button
            onClick={openModal}
            className="landing__cta-primary"
            id="hero-cta"
          >
            Start Your First Session Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="landing__social-proof">
        <motion.div
          className="landing__proof-inner"
          variants={stagger}
          {...anim}
        >
          {SOCIAL_PROOF.map((item, i) => (
            <motion.div
              key={i}
              className="landing__proof-card"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <p className="landing__proof-quote">&ldquo;{item.quote}&rdquo;</p>
              <p className="landing__proof-author">{item.author}</p>
              <p className="landing__proof-role">{item.role}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Memory Differentiator ─── */}
      <section className="landing__section" id="features">
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="landing__section-label">
              <Brain className="w-4 h-4" />
              The Memory Advantage
            </p>
            <h2 className="landing__section-title">
              A Coach That Remembers Everything That Matters
            </h2>
            <p className="landing__section-desc">
              Your people. Your goals. Your fears. Your wins. Every conversation
              builds on the last — so you never have to repeat yourself.
            </p>
          </motion.div>

          <div className="landing__memory-grid">
            {MEMORY_CARDS.map((card, i) => (
              <motion.div
                key={i}
                className="landing__memory-card"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                {...anim}
              >
                <div className="landing__memory-icon">
                  <card.icon className="w-6 h-6" />
                </div>
                <h3 className="landing__memory-title">{card.title}</h3>
                <p className="landing__memory-description">
                  {card.description}
                </p>
                <div className="landing__memory-quote">{card.quote}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="landing__section" style={{ background: "var(--color-surface-50)" }} id="how-it-works">
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} style={{ textAlign: "center" }}>
            <p className="landing__section-label" style={{ justifyContent: "center" }}>
              <Zap className="w-4 h-4" />
              How It Works
            </p>
            <h2 className="landing__section-title" style={{ marginLeft: "auto", marginRight: "auto", maxWidth: "600px" }}>
              From Signup to Coaching in Under 5 Minutes
            </h2>
          </motion.div>

          <div className="landing__steps">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={i}
                className="landing__step"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                {...anim}
              >
                <div className="landing__step-number">{item.step}</div>
                <h3 className="landing__step-title">{item.title}</h3>
                <p className="landing__step-desc">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Frameworks ─── */}
      <section className="landing__section" id="frameworks">
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} style={{ textAlign: "center" }}>
            <p className="landing__section-label" style={{ justifyContent: "center" }}>
              <Search className="w-4 h-4" />
              20+ Proven Frameworks
            </p>
            <h2 className="landing__section-title" style={{ marginLeft: "auto", marginRight: "auto", maxWidth: "700px" }}>
              One Coach. Twenty Methods.{" "}
              <em>The Right One for This Exact Moment.</em>
            </h2>
            <p className="landing__section-desc" style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
              A human coach knows 2–3 methods and uses them for everything.
              Your Mastery Coach selects from 20+ proven frameworks — automatically
              matched to your challenge, your stage, and your readiness.
            </p>
          </motion.div>

          <div className="landing__fw-grid">
            {FRAMEWORK_TIERS.map((tier, i) => (
              <motion.div
                key={i}
                className="landing__fw-card"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                {...anim}
              >
                <div className="landing__fw-header">
                  <span className="landing__fw-emoji">{tier.emoji}</span>
                  <div>
                    <div className="landing__fw-tier" style={{ color: tier.color }}>
                      {tier.tier}: {tier.label}
                    </div>
                    <div className="landing__fw-tagline">{tier.tagline}</div>
                  </div>
                </div>
                <div className="landing__fw-pills">
                  {tier.frameworks.map((fw, j) => (
                    <span key={j} className="landing__fw-pill">{fw}</span>
                  ))}
                </div>
                <div className="landing__fw-example">
                  <ChevronRight className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: "2px", color: tier.color }} />
                  <span>{tier.example}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="landing__fw-bottom"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.5 }}
            {...anim}
          >
            <p className="landing__fw-bottom-text">
              Your coach detects that your &ldquo;marketing problem&rdquo; is actually an
              avoidance pattern, coaches you through the inner resistance,{" "}
              <em>and then</em> helps you build the marketing plan.{" "}
              <strong>In the same conversation.</strong>
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Adaptation ─── */}
      <section className="landing__section" id="adaptation">
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="landing__section-label">
              <SlidersHorizontal className="w-4 h-4" />
              Adaptive Communication
            </p>
            <h2 className="landing__section-title">
              A Coach That Speaks Your Language
            </h2>
            <p className="landing__section-desc">
              Your coach tracks 8 dimensions of your communication style and
              adapts every single message. No personality quiz — it learns by
              listening.
            </p>
          </motion.div>

          <div className="landing__adapt-grid">
            {ADAPTATION_DIMS.map((dim, i) => (
              <motion.div
                key={i}
                className="landing__adapt-card"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                {...anim}
              >
                <div className="landing__adapt-label">
                  <span>{dim.icon}</span> {dim.label}
                </div>
                <div className="landing__adapt-bar">
                  <motion.div
                    className="landing__adapt-fill"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${dim.value}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 1.2,
                      delay: 0.3 + i * 0.1,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                </div>
                <div className="landing__adapt-range">
                  <span>{dim.low}</span>
                  <span>{dim.high}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Privacy & Trust ─── */}
      <section
        className="landing__section"
        style={{ background: "var(--color-surface-50)" }}
        id="privacy"
      >
        <motion.div
          className="landing__section-inner landing__privacy"
          variants={stagger}
          {...anim}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="landing__privacy-icon">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="landing__section-title" style={{ maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
              Your Data. Your Rules. Always.
            </h2>
            <p
              className="landing__section-desc"
              style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}
            >
              Everything you share stays between you and your coach. Your data is
              never sold, never shared, and never used to train AI models. With
              bank-grade encryption and full data portability, you&apos;re more
              protected than any paper notebook could offer — and you can view,
              export, or delete your data at any time.
            </p>
          </motion.div>

          <motion.div
            className="landing__privacy-features"
            variants={stagger}
            {...anim}
          >
            {PRIVACY_FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                className="landing__privacy-feature"
                variants={fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <feature.icon className="landing__privacy-feature-icon" />
                <span className="landing__privacy-feature-text">
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="landing__section" id="compare">
        <motion.div className="landing__section-inner" {...anim} variants={fadeUp} transition={{ duration: 0.5 }}>
          <p className="landing__section-label">
            <MessageCircle className="w-4 h-4" />
            See the Difference
          </p>
          <h2 className="landing__section-title">
            Not All Coaching is Created Equal
          </h2>
          <p className="landing__section-desc">
            See how Mastery Coach compares to generic AI chat and traditional
            human coaching.
          </p>

          <div className="landing__table-wrap">
            <table className="landing__table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Generic AI Chat</th>
                  <th>Human Coach</th>
                  <th>Mastery Coach</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td>{row.feature}</td>
                    <td>{row.generic}</td>
                    <td>{row.human}</td>
                    <td>{row.mastery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        className="landing__section"
        style={{ background: "var(--color-surface-50)" }}
        id="pricing"
      >
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} style={{ textAlign: "center" }}>
            <p className="landing__section-label" style={{ justifyContent: "center" }}>
              <Sparkles className="w-4 h-4" />
              Simple Pricing
            </p>
            <h2 className="landing__section-title" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Start Free. Upgrade When You&apos;re Ready.
            </h2>
          </motion.div>

          <div className="landing__pricing-grid">
            {/* Free tier */}
            <motion.div
              className="landing__pricing-card"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              {...anim}
            >
              <h3 className="landing__pricing-tier">Free</h3>
              <div className="landing__pricing-price">
                <span className="landing__pricing-amount">$0</span>
                <span className="landing__pricing-period">/month</span>
              </div>
              <p className="landing__pricing-desc">
                Get started with the basics. Perfect for trying out AI coaching.
              </p>
              <ul className="landing__pricing-features">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="landing__pricing-feature">
                    <Check className="landing__pricing-check" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={openModal}
                className="landing__cta-ghost"
                style={{ width: "100%", justifyContent: "center" }}
                id="pricing-free-cta"
              >
                Get Started
              </button>
            </motion.div>

            {/* Core tier */}
            <motion.div
              className="landing__pricing-card landing__pricing-card--featured"
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              {...anim}
            >
              <div className="landing__pricing-badge">Most Popular</div>
              <h3 className="landing__pricing-tier">Core</h3>
              <div className="landing__pricing-price">
                <span className="landing__pricing-amount">$99</span>
                <span className="landing__pricing-period">/month</span>
              </div>
              <p className="landing__pricing-desc">
                The full coaching experience. Unlimited access across all
                channels.
              </p>
              <ul className="landing__pricing-features">
                {CORE_FEATURES.map((f, i) => (
                  <li key={i} className="landing__pricing-feature">
                    <Check className="landing__pricing-check" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={openModal}
                className="landing__cta-primary"
                style={{ width: "100%", justifyContent: "center" }}
                id="pricing-core-cta"
              >
                Start Your First Session Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="landing__final-cta">
        <div
          className="landing__dot-pattern"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.08 }}
        />
        <motion.div
          className="landing__final-cta-content"
          {...anim}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          <h2 className="landing__final-cta-title">Your coach is ready.</h2>
          <p className="landing__final-cta-sub">
            Stop repeating yourself. Start building momentum with a coach that
            remembers everything.
          </p>
          <button
            onClick={openModal}
            className="landing__cta-primary"
            id="final-cta"
          >
            Start Your First Session Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing__footer" role="contentinfo">
        <div className="landing__footer-inner">
          <p className="landing__footer-text">
            © {new Date().getFullYear()} MasteryTV. All rights reserved.
          </p>
          <p
            className="landing__footer-text"
            style={{ fontStyle: "italic" }}
          >
            Crafted with love from the team at MasteryTV.
          </p>
          <div className="landing__footer-links">
            <a href="/privacy" className="landing__footer-link">
              Privacy
            </a>
            <a href="/terms" className="landing__footer-link">
              Terms
            </a>
          </div>
        </div>
      </footer>

      {/* ─── Beta Lead Capture Modal ─── */}
      <BetaModal isOpen={modalOpen} onClose={closeModal} />
    </>
  );
}
