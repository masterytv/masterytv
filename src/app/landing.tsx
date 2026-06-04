"use client";

/**
 * LandingPage — Unified marketing page for MasteryTV
 *
 * Blends personality assessment (Decoded) + AI coaching into one story.
 * Hero switches between logged-out conversion and logged-in welcome-back.
 *
 * Sections: Hero → Social Proof → Feature Grid → How It Works →
 *           Differentiator → Testimonial Stories → Final CTA → Footer
 *
 * BRAND.md: Manrope headlines, Inter body, accent-gold single CTA,
 * glassmorphism nav, no emoji icons, no hard borders.
 */

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Fingerprint,
  Brain,
  Heart,
  Briefcase,
  Flame,
  Users,
  BarChart3,
  Sparkles,
  MessageSquare,
  FileText,
  ChevronRight,
  Shield,
  Lock,
  Download,
  Trash2,
  User,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

/* ════════════════════════════════════════════
   Animation variants
   ════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ════════════════════════════════════════════
   Data
   ════════════════════════════════════════════ */

const TESTIMONIALS = [
  {
    quote: "I felt like someone finally gets me.",
    author: "Sarah M.",
    role: "Startup Founder",
  },
  {
    quote:
      "My coach understood both me and my partner in a way neither of us ever considered.",
    author: "James & Rachel K.",
    role: "Married 12 years",
  },
  {
    quote:
      "This goes beyond a personality test and gives you a deep understanding of why you are the way you are.",
    author: "David L.",
    role: "Executive Coach",
  },
];

const FEATURES = [
  {
    icon: BarChart3,
    feature: "15 Personality Tests in 30 min",
    benefit: "Know yourself deeper than ever",
  },
  {
    icon: MessageSquare,
    feature: "Coaching Platform Built In",
    benefit: "The only coach that knows everything about you",
  },
  {
    icon: Heart,
    feature: "Relationship Compatibility",
    benefit: "Stop guessing — your coach will guide you",
  },
  {
    icon: Briefcase,
    feature: "Work Style Assessment",
    benefit: "Know which jobs are best for you",
  },
  {
    icon: Flame,
    feature: "Work Motivation Mapping",
    benefit: "Understand why you love or hate what you do",
  },
  {
    icon: Brain,
    feature: "Emotional Pattern Analysis",
    benefit: "See the patterns you've never noticed",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: FileText,
    title: "Take the Assessment",
    description:
      "Answer questions across 15 validated instruments. Takes about 30 minutes. It's free.",
  },
  {
    step: 2,
    icon: Fingerprint,
    title: "Get Your Report",
    description:
      "13 deep narrative sections. Your Big Five profile, attachment style, emotional patterns, archetype, and more.",
  },
  {
    step: 3,
    icon: Sparkles,
    title: "Meet Your Coach",
    description:
      "An AI coach that has read your entire report. It knows your strengths, blind spots, and how you communicate.",
  },
];

const STORIES = [
  {
    quote:
      "I felt totally understood and have the support I need to get to the next level.",
    context: "On personal growth",
    author: "Michael T.",
    role: "Entrepreneur",
  },
  {
    quote:
      "We know how to communicate with each other better and we always have a coach that knows us in case things get difficult.",
    context: "On relationships",
    author: "Lisa & Mark P.",
    role: "Couple",
  },
  {
    quote:
      "The only personality test that didn't just label me — it gave me a coach and a plan.",
    context: "On the difference",
    author: "Alex R.",
    role: "Team Lead",
  },
];

const PRIVACY_FEATURES = [
  { icon: Lock, text: "Encrypted conversations" },
  { icon: Shield, text: "Never sold or shared" },
  { icon: Download, text: "Export your data anytime" },
  { icon: Trash2, text: "Delete everything with one click" },
];

/* ════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════ */

interface LandingPageProps {
  isLoggedIn: boolean;
  userName: string;
}

export default function LandingPage({ isLoggedIn, userName }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Nav scroll detection
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick() {
      setProfileOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [profileOpen]);

  // Fallback: if IntersectionObserver doesn't fire (iOS Chrome bug),
  // force all sections visible after 2 seconds
  const [forceVisible, setForceVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const anim = prefersReducedMotion || forceVisible
    ? { initial: undefined, whileInView: undefined, viewport: undefined }
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, amount: 0.1 },
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
            <Image src="/logo.png" alt="MasteryTV" width={36} height={36} />
            MasteryTV
          </div>
          <div className="landing__nav-center">
            <FloatingThemeToggle />
          </div>
          <div className="landing__nav-actions">
            {isLoggedIn ? (
              <div className="landing__profile-wrap">
                <button
                  className="landing__profile-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen(!profileOpen);
                  }}
                  aria-label="Profile menu"
                  id="nav-profile"
                >
                  <div className="landing__avatar">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="landing__profile-name">{userName}</span>
                </button>
                {profileOpen && (
                  <div className="landing__profile-dropdown">
                    <Link
                      href="/dashboard"
                      className="landing__profile-item"
                    >
                      Your Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="landing__profile-item"
                    >
                      Settings
                    </Link>
                    <button
                      className="landing__profile-item landing__profile-item--danger"
                      onClick={() => {
                        // Sign out via supabase client
                        import("@/lib/supabase/client").then(({ createClient }) => {
                          const supabase = createClient();
                          supabase.auth.signOut().then(() => {
                            window.location.reload();
                          });
                        });
                      }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/decoded" className="landing__cta-ghost" id="nav-sign-in">
                  Sign In
                </Link>
                <Link
                  href="/decoded"
                  className="landing__cta-primary landing__cta-primary--sm"
                  id="nav-get-started"
                >
                  Take the Test
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="landing__hero" id="hero">
        <div
          className="landing__dot-pattern"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.1 }}
        />
        <motion.div
          className="landing__hero-content"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="landing__hero-label">
                <Fingerprint className="w-3.5 h-3.5" />
                Personality Science + AI Coaching
              </div>
              <h1 className="landing__hero-title">
                Know Thyself.
                <br />
                <em>Then Grow Thyself.</em>
              </h1>
              <p className="landing__hero-sub">
                The only personality test that gives you a coach.
                15 validated instruments. 30 minutes. A report that goes deeper
                than any test you&apos;ve taken — and a coach that remembers{" "}
                <strong style={{ color: "#dfe4fe" }}>everything.</strong>
              </p>
              {isLoggedIn ? (
                <Link href="/dashboard" className="landing__cta-gold" id="hero-cta">
                  View Your Assessment &amp; Coach
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <Link href="/decoded" className="landing__cta-gold" id="hero-cta">
                  Take the Free Assessment
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              <p className="landing__hero-trust">
                Free · 30 minutes · 15 validated instruments · Results are private
              </p>
        </motion.div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="landing__social-proof">
        <motion.div
          className="landing__proof-inner"
          variants={stagger}
          {...anim}
        >
          {TESTIMONIALS.map((item, i) => (
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

      {/* ─── Feature Grid — Know Yourself. Grow Yourself. ─── */}
      <section className="landing__section" id="features">
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="landing__section-label">
              <Fingerprint className="w-4 h-4" />
              Features &amp; Benefits
            </p>
            <h2 className="landing__section-title">
              Discover Who You Really Are.{" "}
              <em>Then Become Everything You Want to Be.</em>
            </h2>
            <p className="landing__section-desc">
              Not just another personality label. A complete system that maps who
              you are — and gives you an AI coach to help you grow.
            </p>
          </motion.div>

          <div className="landing__feature-grid">
            {FEATURES.map((item, i) => (
              <motion.div
                key={i}
                className="landing__feature-card"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                {...anim}
              >
                <div className="landing__feature-icon">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="landing__feature-title">{item.feature}</h3>
                  <p className="landing__feature-benefit">{item.benefit}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        className="landing__section"
        style={{ background: "var(--color-surface-50)" }}
        id="how-it-works"
      >
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center" }}
          >
            <p
              className="landing__section-label"
              style={{ justifyContent: "center" }}
            >
              <Sparkles className="w-4 h-4" />
              How It Works
            </p>
            <h2
              className="landing__section-title"
              style={{
                marginLeft: "auto",
                marginRight: "auto",
                maxWidth: "700px",
              }}
            >
              From Assessment to Coaching in Under an Hour
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
                <div className="landing__step-icon">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="landing__step-number">Step {item.step}</div>
                <h3 className="landing__step-title">{item.title}</h3>
                <p className="landing__step-desc">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Differentiator ─── */}
      <section className="landing__section" id="differentiator">
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="landing__section-label">
              <Brain className="w-4 h-4" />
              What Makes This Different
            </p>
            <h2 className="landing__section-title">
              The Only Personality Test That{" "}
              <em>Gives You a Coach</em>
            </h2>
            <p className="landing__section-desc" style={{ maxWidth: "680px" }}>
              Other tests give you a label and a PDF. We give you a 13-section
              deep report — and then an AI coach that has read every word of it.
              Your coach knows your strengths, your blind spots, your attachment
              style, and your emotional patterns. From day one.
            </p>
          </motion.div>

          <div className="landing__diff-grid">
            <motion.div
              className="landing__diff-card"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              {...anim}
            >
              <div className="landing__diff-label">Other Tests</div>
              <ul className="landing__diff-list landing__diff-list--other">
                <li>One personality framework</li>
                <li>Generic 2-page PDF</li>
                <li>A label you forget in a week</li>
                <li>No coaching, no action plan</li>
                <li>No relationship insight</li>
              </ul>
            </motion.div>
            <motion.div
              className="landing__diff-card landing__diff-card--us"
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              {...anim}
            >
              <div className="landing__diff-label landing__diff-label--us">
                MasteryTV Decoded
              </div>
              <ul className="landing__diff-list landing__diff-list--us">
                <li>15 validated instruments combined</li>
                <li>13-section narrative report</li>
                <li>Your unique archetype</li>
                <li>AI coach that knows you deeply</li>
                <li>Relationship compatibility reports</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── Deeper Stories ─── */}
      <section
        className="landing__section"
        style={{ background: "var(--color-surface-50)" }}
        id="stories"
      >
        <motion.div className="landing__section-inner" variants={stagger} {...anim}>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center" }}
          >
            <p
              className="landing__section-label"
              style={{ justifyContent: "center" }}
            >
              <Users className="w-4 h-4" />
              Real Stories
            </p>
            <h2
              className="landing__section-title"
              style={{
                marginLeft: "auto",
                marginRight: "auto",
                maxWidth: "700px",
              }}
            >
              A Better Entrepreneur. Partner. Parent. Leader. <em>Lover.</em>
            </h2>
          </motion.div>

          <div className="landing__stories-grid">
            {STORIES.map((story, i) => (
              <motion.div
                key={i}
                className="landing__story-card"
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                {...anim}
              >
                <p className="landing__story-context">{story.context}</p>
                <blockquote className="landing__story-quote">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
                <div className="landing__story-author">
                  <span className="landing__story-name">{story.author}</span>
                  <span className="landing__story-role">{story.role}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Privacy ─── */}
      <section className="landing__section" id="privacy">
        <motion.div
          className="landing__section-inner landing__privacy"
          variants={stagger}
          {...anim}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="landing__privacy-icon">
              <Shield className="w-7 h-7" />
            </div>
            <h2
              className="landing__section-title"
              style={{
                maxWidth: "600px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Your Data. Your Rules. Always.
            </h2>
            <p
              className="landing__section-desc"
              style={{
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Everything you share stays between you and your coach. Your data is
              never sold, never shared, and never used to train AI models.
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
          <h2 className="landing__final-cta-title">
            Personal Development, Decoded and Delivered.
          </h2>
          <p className="landing__final-cta-sub">
            {isLoggedIn
              ? "Your coach is waiting. Pick up where you left off."
              : "Know yourself. Grow yourself. Start today — it's free."}
          </p>
          <Link
            href={isLoggedIn ? "/dashboard" : "/decoded"}
            className="landing__cta-gold"
            id="final-cta"
          >
            {isLoggedIn ? "Go to Dashboard" : "Take the Free Assessment"}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing__footer" role="contentinfo">
        <div className="landing__footer-inner">
          <p className="landing__footer-text">
            © {new Date().getFullYear()} MasteryTV. All rights reserved.
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
    </>
  );
}
