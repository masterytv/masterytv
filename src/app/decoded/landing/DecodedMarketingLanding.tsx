"use client";

/**
 * DecodedMarketingLanding — Premium marketing landing page for Decoded
 *
 * Narrative arc: Hook → Credibility → Problem → Value → How It Works →
 *                Report Preview → Coach Handoff → Pricing → Final CTA → Footer
 *
 * Design: BRAND.md §14 enforced — zero sparkles, zero emoji icons, zero AI aesthetic.
 * Copy: Sourced from DECODED.md, DECODED_PRD.md, MARKETING.md
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Fingerprint,
  BarChart3,
  FileText,
  MessageCircle,
  Check,
  Lock,
  Shield,
  Clock,
  Layers,
  Compass,
  Activity,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Data
   ═══════════════════════════════════════════ */

const TRUST_STATS = [
  { value: "13", label: "Validated Instruments" },
  { value: "30+", label: "Page Report" },
  { value: "~30", label: "Minutes to Complete" },
  { value: "Free", label: "Core Assessment" },
];

const PROBLEMS = [
  {
    number: "01",
    title: "Too Shallow",
    text: "16Personalities, Enneagram, and Myers-Briggs are entertainment-grade. They feel like horoscopes because they aren't built on validated science. You deserve better than \"Which Disney Princess are you?\"",
    examples: "16Personalities, Enneagram, BuzzFeed quizzes",
  },
  {
    number: "02",
    title: "Too Clinical",
    text: "PHQ-9, GAD-7, and clinical screeners are accurate but designed for therapists, not for you. You get a score with no context, no framing, and no pathway forward.",
    examples: "PHQ-9, GAD-7, clinical intake forms",
  },
  {
    number: "03",
    title: "Report, Then Nothing",
    text: "The best personality tools stop at understanding. You get a PDF — well-written, maybe even insightful — but there's no coach, no action plan, no \"what now?\"",
    examples: "Deep Personality, TraitLab, CliftonStrengths",
  },
];

const VALUE_PROPS = [
  {
    icon: BarChart3,
    step: "Step 01",
    title: "The Assessment",
    text: "13 scientifically-validated instruments covering personality, attachment, emotional regulation, career interests, motivation, and wellbeing. Adaptive — the assessment expands based on your unique profile.",
    tag: "~30 minutes",
  },
  {
    icon: FileText,
    step: "Step 02",
    title: "The Report",
    text: "A free 30-page report written specifically for your results — a narrative you'll actually recognize as yourself. Big Five radar chart, attachment map, career alignment — all in language a human would use, not a clinician.",
    tag: "Free forever",
  },
  {
    icon: MessageCircle,
    step: "Step 03",
    title: "The Coach",
    text: "A coach built with one purpose — helping you reach your goals. It knows you better than you know yourself, adapts to every conversation, speaks to you in the way that inspires you most, manages your calendar, keeps you focused, and remembers everything. Not a chatbot — a 24/7 success coach you won't want to live without.",
    tag: "Pre-loaded with your profile",
    accent: true,
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
    desc: "Your coach already knows your personality, attachment style, and growth edges. The first message references your actual results.",
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
      "7-section personalized report",
      "Big Five radar chart",
      "Attachment style quadrant",
      "1 compatibility report",
      "5 coach messages per day",
    ],
    cta: "Start Free Assessment",
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
      "3 compatibility reports",
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
      "Unlimited compatibility reports",
      "Side-by-side compatibility analysis",
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
      "Unlimited compatibility reports",
      "Full coaching framework library",
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

export default function DecodedMarketingLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  return (
    <>
      {/* ─── Navigation ─── */}
      <nav
        className={`dl__nav ${scrolled ? "dl__nav--scrolled" : ""}`}
        role="navigation"
        aria-label="Decoded navigation"
      >
        <div className="dl__nav-inner">
          <Link href="/decoded/landing" className="dl__logo">
            <div className="dl__logo-icon">
              <Fingerprint
                style={{ width: 16, height: 16, color: "#a3a6ff" }}
                strokeWidth={1.5}
              />
            </div>
            Decoded
          </Link>
          <Link href="/decoded" className="dl__nav-cta" id="nav-start-assessment">
            Start Free Assessment
            <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="dl__hero" id="hero">
        <div
          className="dl__dot-pattern"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />
        <div className="dl__hero-glow dl__hero-glow--primary" aria-hidden="true" />
        <div className="dl__hero-glow dl__hero-glow--accent" aria-hidden="true" />

        <motion.div
          className="dl__hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="dl__hero-eyebrow">
            <Fingerprint style={{ width: 14, height: 14 }} strokeWidth={1.5} />
            Personality Assessment
          </div>

          <h1 className="dl__hero-title">
            Finally Understand Why You Are{" "}
            <em>the Way You Are.</em>
          </h1>

          <p className="dl__hero-sub">
            15 validated psychological instruments. One adaptive assessment.
            A free 30-page report — and a coach who&apos;s already read
            every word of it.
          </p>

          <Link href="/decoded" className="dl__hero-cta" id="hero-cta">
            Start Your Free Assessment
            <ArrowRight style={{ width: 18, height: 18 }} />
          </Link>

          <div className="dl__hero-proof">
            <span>
              <Shield style={{ width: 14, height: 14 }} />
              No credit card required
            </span>
            <span>
              <Clock style={{ width: 14, height: 14 }} />
              ~30 minutes
            </span>
            <span>
              <Layers style={{ width: 14, height: 14 }} />
              13 validated instruments
            </span>
          </div>
        </motion.div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="dl__trust" aria-label="Trust metrics">
        <div className="dl__trust-inner">
          {TRUST_STATS.map((stat, i) => (
            <div key={i} className="dl__trust-item">
              <div className="dl__trust-value">{stat.value}</div>
              <div className="dl__trust-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Problem Section ─── */}
      <section className="dl__section" id="the-problem">
        <div className="dl__section-inner">
          <div>
            <p className="dl__section-eyebrow">
              <Compass style={{ width: 16, height: 16 }} />
              The Problem
            </p>
            <h2 className="dl__section-title">
              Personality Tools Have Failed You
            </h2>
            <p className="dl__section-desc">
              You&apos;ve taken the tests. You&apos;ve read the results.
              And you&apos;re left exactly where you started — with a label
              and no pathway forward.
            </p>
          </div>

          <div className="dl__problem-grid">
            {PROBLEMS.map((problem, i) => (
              <div key={i} className="dl__problem-card">
                <div className="dl__problem-number">{problem.number}</div>
                <h3 className="dl__problem-title">{problem.title}</h3>
                <p className="dl__problem-text">{problem.text}</p>
                <p className="dl__problem-examples">{problem.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What You Get ─── */}
      <section className="dl__section dl__section--alt" id="what-you-get">
        <div className="dl__section-inner">
          <div style={{ textAlign: "center" }}>
            <p className="dl__section-eyebrow" style={{ justifyContent: "center" }}>
              <Activity style={{ width: 16, height: 16 }} />
              What You Get
            </p>
            <h2 className="dl__section-title dl__section-title--center">
              Assessment. Report. Coach. — All Connected.
            </h2>
            <p className="dl__section-desc dl__section-desc--center">
              Decoded is the only personality assessment that doesn&apos;t
              leave you alone with a PDF. Your results flow directly
              into a coach who already knows you.
            </p>
          </div>

          <div className="dl__value-grid">
            {VALUE_PROPS.map((prop, i) => (
              <div key={i} className="dl__value-card">
                <div className={`dl__value-icon ${prop.accent ? "dl__value-icon--accent" : ""}`}>
                  <prop.icon style={{ width: 20, height: 20 }} strokeWidth={1.5} />
                </div>
                <div className="dl__value-step">{prop.step}</div>
                <h3 className="dl__value-title">{prop.title}</h3>
                <p className="dl__value-text">{prop.text}</p>
                <span className="dl__value-tag">{prop.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="dl__section" id="how-it-works">
        <div className="dl__section-inner">
          <div style={{ textAlign: "center" }}>
            <p className="dl__section-eyebrow" style={{ justifyContent: "center" }}>
              <Clock style={{ width: 16, height: 16 }} />
              How It Works
            </p>
            <h2 className="dl__section-title dl__section-title--center">
              From Start to Insight in Under 30 Minutes
            </h2>
          </div>

          <div className="dl__steps">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="dl__step">
                <div className="dl__step-number">{item.step}</div>
                <h3 className="dl__step-title">{item.title}</h3>
                <p className="dl__step-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Report Preview ─── */}
      <section className="dl__section dl__section--alt" id="the-report">
        <div className="dl__section-inner">
          <div>
            <p className="dl__section-eyebrow">
              <FileText style={{ width: 16, height: 16 }} />
              Your Report
            </p>
            <h2 className="dl__section-title">
              12 Sections. 7 Free. All Personalized.
            </h2>
            <p className="dl__section-desc">
              Every section is written specifically for your results —
              not a template with your name dropped in. Each one ends with
              the question your coach would open your first session with.
            </p>
          </div>

          <div className="dl__report">
            {REPORT_SECTIONS.map((section) => (
              <div
                key={section.id}
                className={`dl__report-section ${!section.free ? "dl__report-section--locked" : ""}`}
              >
                <span className="dl__report-num">{section.id.replace("RS", "")}</span>
                <span className="dl__report-name">{section.name}</span>
                {section.free ? (
                  <span className="dl__report-badge dl__report-badge--free">
                    <Check style={{ width: 10, height: 10 }} />
                    Free
                  </span>
                ) : (
                  <span className="dl__report-badge dl__report-badge--locked">
                    <Lock style={{ width: 10, height: 10 }} />
                    Insight+
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Coach Handoff ─── */}
      <section className="dl__section" id="the-coach">
        <div className="dl__section-inner">
          <div>
            <p className="dl__section-eyebrow">
              <MessageCircle style={{ width: 16, height: 16 }} />
              The Coach
            </p>
            <h2 className="dl__section-title">
              A Coach That Already Knows You
            </h2>
            <p className="dl__section-desc">
              Most coaching apps start with &ldquo;Tell me about yourself.&rdquo;
              Yours starts with this — because it already read your
              entire report before you typed a single word.
            </p>
          </div>

          <div className="dl__coach">
            <div className="dl__coach-card">
              <div className="dl__coach-header">
                <div className="dl__coach-avatar">
                  <Fingerprint style={{ width: 16, height: 16 }} strokeWidth={1.5} />
                </div>
                <div className="dl__coach-meta">
                  <span className="dl__coach-name">Mastery Coach</span>
                  <span className="dl__coach-label">Based on your Decoded profile</span>
                </div>
              </div>
              <p className="dl__coach-message">
                I&apos;ve read your full profile. Your{" "}
                <strong>secure-leaning attachment style</strong> combined with{" "}
                <strong>high Neuroticism</strong> and a strong{" "}
                <strong>RIASEC Social profile</strong> suggests you&apos;re
                someone who genuinely cares about people, but internal noise
                keeps you from showing up as fully as you want to. I&apos;d
                suggest we start with <strong>Emotional Regulation</strong> —
                want to dig in?
              </p>
              <p className="dl__coach-footnote">
                This is a real example of a coach opener generated from Decoded
                assessment data. Your message will be specific to your results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="dl__section dl__section--alt" id="pricing">
        <div className="dl__section-inner">
          <div style={{ textAlign: "center" }}>
            <p className="dl__section-eyebrow" style={{ justifyContent: "center" }}>
              <Layers style={{ width: 16, height: 16 }} />
              Pricing
            </p>
            <h2 className="dl__section-title dl__section-title--center">
              Start Free. Go Deeper When You&apos;re Ready.
            </h2>
            <p className="dl__section-desc dl__section-desc--center">
              The core assessment and 7-section report are free — forever.
              Upgrade when you want the full picture and unlimited coaching.
            </p>
          </div>

          <div className="dl__pricing-grid">
            {PRICING_TIERS.map((tier, i) => (
              <div
                key={i}
                className={`dl__pricing-card ${tier.featured ? "dl__pricing-card--featured" : ""}`}
              >
                {tier.featured && (
                  <div className="dl__pricing-popular">Most Popular</div>
                )}
                <div className="dl__pricing-name">{tier.name}</div>
                <div className="dl__pricing-price">
                  {tier.price}
                  {tier.period && <span>{tier.period}</span>}
                </div>
                <div className="dl__pricing-note">{tier.note}</div>
                <ul className="dl__pricing-features">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="dl__pricing-feature">
                      <Check className="dl__pricing-check" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/decoded"
                  className={`dl__pricing-cta ${tier.featured ? "dl__pricing-cta--primary" : ""}`}
                  id={`pricing-cta-${tier.name.toLowerCase()}`}
                >
                  {tier.cta}
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="dl__final-cta">
        <div
          className="dl__dot-pattern"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.08 }}
        />
        <div>
          <h2 className="dl__final-cta-title">
            The Most Honest Thing You&apos;ll Ever Read About Yourself.
          </h2>
          <p className="dl__final-cta-sub">
            15 validated assessments. One transformational report.
            A coach who already knows you. Free to start.
          </p>
          <Link href="/decoded" className="dl__hero-cta" id="final-cta">
            Start Your Free Assessment
            <ArrowRight style={{ width: 18, height: 18 }} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="dl__footer">
        <div className="dl__footer-brand">Decoded by Mastery Coach</div>
        <div className="dl__footer-links">
          <Link href="/privacy" className="dl__footer-link">
            Privacy Policy
          </Link>
          <Link href="/terms" className="dl__footer-link">
            Terms of Service
          </Link>
        </div>
        <p className="dl__footer-copy">
          &copy; {new Date().getFullYear()} Mastery Coach. All rights reserved.
        </p>
        <p className="dl__footer-disclaimer">
          Decoded is not a clinical diagnostic tool and is not a substitute for
          professional mental health support. Results are for personal growth
          purposes only. Your data is never sold or used to train AI models.
        </p>
      </footer>
    </>
  );
}
