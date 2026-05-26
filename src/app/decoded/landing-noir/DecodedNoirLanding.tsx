"use client";

/**
 * DecodedNoirLanding — "Intelligence Dossier" landing page for Decoded
 *
 * Narrative arc: Classification → Briefing → Problem → Value → Process →
 *                Report Preview → Coach Briefing → Pricing → Final CTA → Footer
 *
 * Design: BRAND.md §14 enforced — zero sparkles, zero emoji, Lucide icons only.
 * Aesthetic: Noir/spy intelligence dossier — amber accents, monospaced labels,
 *            scan-line textures, crosshair grids, classified badges.
 */

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Fingerprint,
  BarChart3,
  FileText,
  MessageCircle,
  Check,
  Shield,
  Clock,
  Layers,
  Compass,
  Activity,
  Lock,
  Crosshair,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Animation variants (respects reduced motion)
   ═══════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ═══════════════════════════════════════════
   Data (same content as /decoded/landing)
   ═══════════════════════════════════════════ */

const TRUST_STATS = [
  { value: "13", label: "Validated Instruments" },
  { value: "30+", label: "Page Report" },
  { value: "~30", label: "Minutes to Complete" },
  { value: "Free", label: "Core Assessment" },
];

const PROBLEMS = [
  {
    number: "CASE 01",
    title: "Too Shallow",
    text: "16Personalities, Enneagram, and Myers-Briggs are entertainment-grade. They feel like horoscopes because they aren't built on validated science. You deserve better than \"Which Disney Princess are you?\"",
    examples: "16Personalities, Enneagram, BuzzFeed quizzes",
  },
  {
    number: "CASE 02",
    title: "Too Clinical",
    text: "PHQ-9, GAD-7, and clinical screeners are accurate but designed for therapists, not for you. You get a score with no context, no framing, and no pathway forward.",
    examples: "PHQ-9, GAD-7, clinical intake forms",
  },
  {
    number: "CASE 03",
    title: "Report, Then Nothing",
    text: "The best personality tools stop at understanding. You get a PDF — well-written, maybe even insightful — but there's no coach, no action plan, no \"what now?\"",
    examples: "Deep Personality, TraitLab, CliftonStrengths",
  },
];

const VALUE_PROPS = [
  {
    icon: BarChart3,
    step: "Phase 01 — Data Acquisition",
    title: "The Assessment",
    text: "13 scientifically-validated instruments covering personality, attachment, emotional regulation, career interests, motivation, and wellbeing. Adaptive — the assessment expands based on your unique profile.",
    tag: "~30 minutes",
    featured: false,
  },
  {
    icon: FileText,
    step: "Phase 02 — Intelligence Report",
    title: "The Report",
    text: "A free 30-page AI-written report that translates your results into a narrative you'll actually recognize as yourself. Big Five radar chart, attachment map, career alignment — all in language a human would use, not a clinician.",
    tag: "Free forever",
    featured: false,
  },
  {
    icon: MessageCircle,
    step: "Phase 03 — Active Guidance",
    title: "The Coach",
    text: "An AI coach built with one purpose — helping you reach your goals. 5x more effective than uploading your report to ChatGPT. It knows you better than you know yourself, adapts to every conversation, speaks to you in the way that inspires you most, manages your calendar, keeps you focused, and remembers everything. Not a chatbot — a 24/7 success coach you won't want to live without.",
    tag: "Pre-loaded with your profile",
    featured: true,
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Take the Assessment",
    desc: "Answer questions across 13 dimensions. Your progress saves automatically — close the tab anytime and pick up where you left off.",
  },
  {
    step: 2,
    title: "Get Your Report",
    desc: "Your personalized report generates in under 60 seconds. 7 free sections with deep narrative insights and data visualizations.",
  },
  {
    step: 3,
    title: "Meet Your Coach",
    desc: "Your AI coach already knows your personality, attachment style, and growth edges. The first message references your actual results.",
  },
];

const REPORT_SECTIONS = [
  { id: "RS01", name: "You, Decoded", free: true },
  { id: "RS02", name: "What the Data Shows", free: true },
  { id: "RS03", name: "Your Decoded Archetype", free: true },
  { id: "RS04", name: "How You're Wired", free: true },
  { id: "RS05", name: "Your Trait Profile", free: true },
  { id: "RS06", name: "Your Attachment Map", free: true },
  { id: "RS07", name: "Your Inner System", free: true },
  { id: "RS08", name: "Your Emotional Landscape", free: false },
  { id: "RS09", name: "Career & Motivation", free: false },
  { id: "RS10", name: "Your Relationship Blueprint", free: false },
  { id: "RS11", name: "Wellbeing Dashboard", free: false },
  { id: "RS12", name: "Your Growth Roadmap", free: false },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    note: "No credit card required",
    features: [
      "Full assessment (13 instruments)",
      "7-section AI-written report",
      "Big Five radar chart",
      "Attachment style quadrant",
      "5 coach messages per day",
      "Share your personality card",
    ],
    cta: "Begin Assessment",
    featured: false,
  },
  {
    name: "Insight",
    price: "$29",
    period: "/year",
    note: "Less than $2.50/month",
    features: [
      "Everything in Free",
      "5 additional report sections",
      "Emotional Landscape analysis",
      "Career & Motivation deep dive",
      "AI Compatibility Report",
      "50 coach messages per week",
    ],
    cta: "Start Free, Upgrade Later",
    featured: false,
  },
  {
    name: "Growth",
    price: "$69",
    period: "/year",
    note: "Most popular",
    features: [
      "Everything in Insight",
      "Growth Roadmap section",
      "90-day reflection questions",
      "Compare AI analysis",
      "300 coach messages per month",
      "Priority support",
    ],
    cta: "Start Free, Upgrade Later",
    featured: true,
  },
  {
    name: "Mastery",
    price: "$349",
    period: "/year",
    note: "Save $849 vs. monthly",
    features: [
      "Everything in Growth",
      "Unlimited coach messages",
      "Full coaching framework library",
      "Depth Layer assessments",
      "IFS parts mapping",
      "Shadow & integration work",
    ],
    cta: "Start Free, Upgrade Later",
    featured: false,
  },
];

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */

export default function DecodedNoirLanding() {
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation wrapper — returns static props when reduced motion is preferred
  const anim = prefersReducedMotion
    ? { initial: undefined, whileInView: undefined, viewport: undefined }
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, margin: "-60px" },
      };

  return (
    <div className="dn__page">
      {/* Scan-line overlay */}
      <div className="dn__scanlines" aria-hidden="true" />

      {/* ─── Navigation ─── */}
      <nav
        className={`dn__nav ${scrolled ? "dn__nav--scrolled" : ""}`}
        role="navigation"
        aria-label="Decoded navigation"
      >
        <div className="dn__nav-inner">
          <Link href="/decoded/landing-noir" className="dn__logo">
            <div className="dn__logo-mark">
              <Fingerprint
                style={{ width: 14, height: 14 }}
                strokeWidth={1.5}
              />
            </div>
            Decoded
          </Link>
          <Link
            href="/decoded"
            className="dn__nav-cta"
            id="noir-nav-start"
          >
            Initiate Assessment
            <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="dn__hero" id="noir-hero">
        <div className="dn__hero-grid" aria-hidden="true" />
        <div
          className="dn__hero-glow dn__hero-glow--amber"
          aria-hidden="true"
        />
        <div
          className="dn__hero-glow dn__hero-glow--blue"
          aria-hidden="true"
        />

        <motion.div
          className="dn__hero-content"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="dn__hero-classification">
            <div className="dn__hero-classification-dot" />
            Classified — Personal Intelligence Briefing
          </div>

          <h1 className="dn__hero-title">
            The Most Complete Dossier{" "}
            <em>Ever Written About You.</em>
          </h1>

          <p className="dn__hero-sub">
            13 validated psychological instruments. One adaptive assessment.
            A free 30-page intelligence report — and a coach who&apos;s
            already read every word of it.
          </p>

          <Link href="/decoded" className="dn__hero-cta" id="noir-hero-cta">
            Begin Your Assessment
            <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>

          <div className="dn__hero-meta">
            <span>
              <Shield style={{ width: 12, height: 12 }} />
              No credit card
            </span>
            <span>
              <Clock style={{ width: 12, height: 12 }} />
              ~30 minutes
            </span>
            <span>
              <Layers style={{ width: 12, height: 12 }} />
              13 instruments
            </span>
          </div>
        </motion.div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="dn__trust" aria-label="Trust metrics">
        <motion.div className="dn__trust-inner" variants={stagger} {...anim}>
          {TRUST_STATS.map((stat, i) => (
            <motion.div
              key={i}
              className="dn__trust-item"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <div className="dn__trust-value">{stat.value}</div>
              <div className="dn__trust-label">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Problem Section ─── */}
      <section className="dn__section" id="noir-the-problem">
        <motion.div className="dn__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="dn__section-label">
              <Compass style={{ width: 14, height: 14 }} />
              Situation Report
            </p>
            <h2 className="dn__section-title">
              Personality Tools Have Failed You
            </h2>
            <p className="dn__section-desc">
              You&apos;ve taken the tests. You&apos;ve read the results.
              And you&apos;re left exactly where you started — with a label
              and no pathway forward.
            </p>
          </motion.div>

          <div className="dn__problem-grid">
            {PROBLEMS.map((problem, i) => (
              <motion.div
                key={i}
                className="dn__problem-card"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                {...anim}
              >
                <div className="dn__problem-number">{problem.number}</div>
                <h3 className="dn__problem-title">{problem.title}</h3>
                <p className="dn__problem-text">{problem.text}</p>
                <p className="dn__problem-examples">{problem.examples}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <hr className="dn__rule" />

      {/* ─── What You Get ─── */}
      <section className="dn__section dn__section--alt" id="noir-what-you-get">
        <motion.div className="dn__section-inner" variants={stagger} {...anim}>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center" }}
          >
            <p
              className="dn__section-label"
              style={{ justifyContent: "center" }}
            >
              <Activity style={{ width: 14, height: 14 }} />
              Mission Briefing
            </p>
            <h2 className="dn__section-title dn__section-title--center">
              Assessment. Report. Coach. — All Connected.
            </h2>
            <p className="dn__section-desc dn__section-desc--center">
              Decoded is the only personality assessment that doesn&apos;t
              leave you alone with a PDF. Your results flow directly
              into a coach who already knows you.
            </p>
          </motion.div>

          <div className="dn__value-grid">
            {VALUE_PROPS.map((prop, i) => (
              <motion.div
                key={i}
                className={`dn__value-card ${
                  prop.featured ? "dn__value-card--featured" : ""
                }`}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                {...anim}
              >
                <div
                  className={`dn__value-icon ${
                    !prop.featured ? "dn__value-icon--blue" : ""
                  }`}
                >
                  <prop.icon
                    style={{ width: 18, height: 18 }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="dn__value-step">{prop.step}</div>
                <h3 className="dn__value-title">{prop.title}</h3>
                <p className="dn__value-text">{prop.text}</p>
                <span className="dn__value-tag">{prop.tag}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <hr className="dn__rule" />

      {/* ─── How It Works ─── */}
      <section className="dn__section" id="noir-how-it-works">
        <motion.div className="dn__section-inner" variants={stagger} {...anim}>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center" }}
          >
            <p
              className="dn__section-label"
              style={{ justifyContent: "center" }}
            >
              <Crosshair style={{ width: 14, height: 14 }} />
              Operations Protocol
            </p>
            <h2 className="dn__section-title dn__section-title--center">
              From Start to Insight in Under 30 Minutes
            </h2>
          </motion.div>

          <div className="dn__steps">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={i}
                className="dn__step"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                {...anim}
              >
                <div className="dn__step-number">{item.step}</div>
                <h3 className="dn__step-title">{item.title}</h3>
                <p className="dn__step-desc">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <hr className="dn__rule" />

      {/* ─── Report Preview ─── */}
      <section className="dn__section dn__section--alt" id="noir-the-report">
        <motion.div className="dn__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="dn__section-label">
              <FileText style={{ width: 14, height: 14 }} />
              Intelligence File — Contents
            </p>
            <h2 className="dn__section-title">
              12 Sections. 7 Declassified. All Personalized.
            </h2>
            <p className="dn__section-desc">
              Every section is AI-written specifically for your results —
              not a template with your name dropped in. Each one ends with
              the question your coach would open your first session with.
            </p>
          </motion.div>

          <div className="dn__report">
            {REPORT_SECTIONS.map((section, i) => (
              <motion.div
                key={section.id}
                className={`dn__report-item ${
                  !section.free ? "dn__report-item--locked" : ""
                }`}
                variants={fadeUp}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                {...anim}
              >
                <span className="dn__report-num">
                  {section.id.replace("RS", "")}
                </span>
                <span className="dn__report-name">{section.name}</span>
                {section.free ? (
                  <span className="dn__report-badge dn__report-badge--free">
                    <Check style={{ width: 9, height: 9 }} />
                    Declassified
                  </span>
                ) : (
                  <span className="dn__report-badge dn__report-badge--locked">
                    <Lock style={{ width: 9, height: 9 }} />
                    Insight+
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <hr className="dn__rule" />

      {/* ─── Coach Handoff ─── */}
      <section className="dn__section" id="noir-the-coach">
        <motion.div className="dn__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="dn__section-label">
              <MessageCircle style={{ width: 14, height: 14 }} />
              Handler Assignment
            </p>
            <h2 className="dn__section-title">
              A Coach That Already Knows You
            </h2>
            <p className="dn__section-desc">
              Most AI coaches start with &ldquo;Tell me about yourself.&rdquo;
              Yours starts with this — because it already read your
              entire report before you typed a single word.
            </p>
          </motion.div>

          <motion.div
            className="dn__coach"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            {...anim}
          >
            <div className="dn__coach-card">
              <div className="dn__coach-header">
                <div className="dn__coach-avatar">
                  <Fingerprint
                    style={{ width: 14, height: 14 }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="dn__coach-meta">
                  <span className="dn__coach-name">Mastery Coach</span>
                  <span className="dn__coach-label">
                    Based on your Decoded profile
                  </span>
                </div>
              </div>
              <p className="dn__coach-message">
                I&apos;ve read your full profile. Your{" "}
                <strong>secure-leaning attachment style</strong> combined with{" "}
                <strong>high Neuroticism</strong> and a strong{" "}
                <strong>RIASEC Social profile</strong> suggests you&apos;re
                someone who genuinely cares about people, but internal noise
                keeps you from showing up as fully as you want to. I&apos;d
                suggest we start with <strong>Emotional Regulation</strong> —
                want to dig in?
              </p>
              <p className="dn__coach-footnote">
                // This is a real example of a coach opener generated from
                Decoded assessment data. Your message will be specific to your
                results.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <hr className="dn__rule" />

      {/* ─── Pricing ─── */}
      <section className="dn__section dn__section--alt" id="noir-pricing">
        <motion.div className="dn__section-inner" variants={stagger} {...anim}>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center" }}
          >
            <p
              className="dn__section-label"
              style={{ justifyContent: "center" }}
            >
              <Layers style={{ width: 14, height: 14 }} />
              Access Levels
            </p>
            <h2 className="dn__section-title dn__section-title--center">
              Start Free. Go Deeper When You&apos;re Ready.
            </h2>
            <p className="dn__section-desc dn__section-desc--center">
              The core assessment and 7-section report are free — forever.
              Upgrade when you want the full picture and unlimited coaching.
            </p>
          </motion.div>

          <div className="dn__pricing-grid">
            {PRICING_TIERS.map((tier, i) => (
              <motion.div
                key={i}
                className={`dn__pricing-card ${
                  tier.featured ? "dn__pricing-card--featured" : ""
                }`}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                {...anim}
              >
                {tier.featured && (
                  <div className="dn__pricing-popular">Recommended</div>
                )}
                <div className="dn__pricing-name">{tier.name}</div>
                <div className="dn__pricing-price">
                  {tier.price}
                  {tier.period && <span>{tier.period}</span>}
                </div>
                <div className="dn__pricing-note">{tier.note}</div>
                <ul className="dn__pricing-features">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="dn__pricing-feature">
                      <Check className="dn__pricing-check" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/decoded"
                  className={`dn__pricing-cta ${
                    tier.featured ? "dn__pricing-cta--primary" : ""
                  }`}
                  id={`noir-pricing-${tier.name.toLowerCase()}`}
                >
                  {tier.cta}
                  <ArrowRight style={{ width: 12, height: 12 }} />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="dn__final">
        <div className="dn__final-grid" aria-hidden="true" />
        <motion.div
          className="dn__final-content"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="dn__final-title">
            The Most Honest Thing You&apos;ll Ever Read About Yourself.
          </h2>
          <p className="dn__final-sub">
            13 validated assessments. One intelligence report.
            A coach who already knows you. Free to start.
          </p>
          <Link href="/decoded" className="dn__hero-cta" id="noir-final-cta">
            Begin Your Assessment
            <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="dn__footer">
        <div className="dn__footer-brand">
          Decoded // Mastery Coach
        </div>
        <div className="dn__footer-links">
          <Link href="/privacy" className="dn__footer-link">
            Privacy Policy
          </Link>
          <Link href="/terms" className="dn__footer-link">
            Terms of Service
          </Link>
        </div>
        <p className="dn__footer-copy">
          &copy; {new Date().getFullYear()} Mastery Coach. All rights reserved.
        </p>
        <p className="dn__footer-disclaimer">
          Decoded is not a clinical diagnostic tool and is not a substitute for
          professional mental health support. Results are for personal growth
          purposes only. Your data is never sold or used to train AI models.
        </p>
      </footer>
    </div>
  );
}
