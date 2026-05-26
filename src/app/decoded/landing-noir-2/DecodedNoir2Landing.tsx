"use client";

/**
 * DecodedNoir2Landing — Ultra-retro detective noir landing page (Screen 179a9b145a354844800a1c3833b4e2b6)
 * 
 * Aesthetic: 1940s film noir detective case file. Typewriter fonts, manila folder sheets,
 *            polaroid photos pinned to folders, hazard stripe badges, wooden backgrounds, sepia tones.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Shield,
  Clock,
  Layers,
  Search,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Custom SVG Silhouettes for Polaroids
   ═══════════════════════════════════════════ */

// Fedora Hat Silhouette
const FedoraIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
    <path d="M15 75 C15 75, 25 70, 35 68 C38 52, 42 35, 50 30 C58 25, 62 25, 66 31 C70 38, 71 52, 73 68 C80 70, 85 75, 85 75 C85 75, 50 82, 15 75 Z" />
    <path d="M33 65 C33 65, 50 68, 69 65 C68 60, 67 58, 67 58 C67 58, 50 60, 34 58 Z" fill="#fabd00" />
    <path d="M10 76 C20 78, 80 78, 90 76 C92 78, 92 80, 90 81 C80 83, 20 83, 10 81 C8 80, 8 78, 10 76 Z" />
  </svg>
);

// Magnifying Glass Silhouette
const MagnifyingGlassIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
    <circle cx="45" cy="45" r="22" stroke="currentColor" strokeWidth="6" fill="none" />
    <line x1="60" y1="60" x2="85" y2="85" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <circle cx="45" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
  </svg>
);

// Smoking Pipe Silhouette
const SmokingPipeIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
    <path d="M75 30 C78 30, 82 35, 80 48 C78 60, 68 70, 55 70 C48 70, 42 66, 38 60 C30 63, 20 62, 15 60 C12 59, 12 56, 15 56 C22 56, 30 57, 36 54 C35 52, 35 50, 35 48 C35 35, 42 30, 48 30 C52 30, 56 34, 56 38 C56 42, 54 44, 52 46 C48 50, 50 56, 56 56 C62 56, 70 48, 72 38 C72 35, 70 33, 70 32 Z" />
    <path d="M72 26 L78 26 L78 30 L72 30 Z" />
    {/* Smoke trails */}
    <path d="M73 20 C73 20, 75 14, 73 10 C71 6, 75 2, 75 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M77 22 C77 22, 80 16, 78 12 C76 8, 80 4, 80 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />
  </svg>
);

// Film Reel Icon
const FilmReelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
    <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="6" fill="none" />
    <circle cx="50" cy="50" r="8" fill="currentColor" />
    {/* Reel cutouts */}
    <circle cx="50" cy="28" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="50" cy="72" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="28" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="72" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="34" cy="34" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="66" cy="66" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Manila Folder Icon
const FolderIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
    <path d="M15 25 L35 25 L43 33 L85 33 L85 75 L15 75 Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" fill="none" />
    <path d="M22 42 L78 42 M22 52 L78 52 M22 62 L55 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Detective Silhouette / Spy / Informant
const SpyIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
    {/* Hat */}
    <path d="M25 45 C35 43, 65 43, 75 45 C78 45, 80 41, 75 39 C68 36, 68 22, 60 22 C52 22, 48 22, 40 22 C32 22, 32 36, 25 39 C20 41, 22 45, 25 45 Z" />
    {/* Sunglasses / Eyes */}
    <path d="M35 52 L45 52 L47 56 L37 56 Z M53 56 L55 52 L65 52 L63 56 Z" />
    {/* Collar turned up */}
    <path d="M20 78 L32 58 L50 66 L68 58 L80 78 C70 82, 30 82, 20 78 Z" />
  </svg>
);

/* ═══════════════════════════════════════════
   Data Structures
   ═══════════════════════════════════════════ */

const COLD_CASES = [
  {
    caseNo: "CASE 01",
    title: "Too Shallow",
    desc: "16Personalities, Enneagram, and Myers-Briggs are entertainment-grade. They feel like horoscopes because they aren't built on validated science. You deserve better than \"Which Disney Princess are you?\"",
    examples: "Buzzfeed, 16Personalities, Enneagram",
    icon: FedoraIcon,
    rotClass: "dn2__polaroid--rot-left",
  },
  {
    caseNo: "CASE 02",
    title: "Too Clinical",
    desc: "PHQ-9, GAD-7, and clinical screeners are accurate but designed for therapists, not for you. You get a score with no context, no framing, and no pathway forward.",
    examples: "PHQ-9, GAD-7, Clinical Intake Forms",
    icon: MagnifyingGlassIcon,
    rotClass: "dn2__polaroid--rot-right",
  },
  {
    caseNo: "CASE 03",
    title: "Report, Then Silence",
    desc: "The best personality tools stop at understanding. You get a PDF — well-written, maybe even insightful — but there's no coach, no action plan, no \"what now?\"",
    examples: "Deep Personality, TraitLab, CliftonStrengths",
    icon: SmokingPipeIcon,
    rotClass: "dn2__polaroid--rot-left",
  },
];

const STAGES = [
  {
    caseNo: "STAGE 01",
    title: "Take The Assessment",
    desc: "Answer questions across 13 dimensions. Your progress saves automatically — close the tab anytime and pick up where you left off.",
    icon: FilmReelIcon,
    rotClass: "dn2__polaroid--rot-right",
  },
  {
    caseNo: "STAGE 02",
    title: "The Dossier",
    desc: "Your personalized report generates in under 60 seconds. 7 free sections with deep narrative insights and data visualizations.",
    icon: FolderIcon,
    rotClass: "dn2__polaroid--rot-left",
  },
  {
    caseNo: "STAGE 03",
    title: "The Informant",
    desc: "Your AI coach already knows your personality, attachment style, and growth edges. The first message references your actual results.",
    icon: SpyIcon,
    rotClass: "dn2__polaroid--rot-right",
  },
];

export default function DecodedNoir2Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="dn2__page">
      {/* ── Navigation ── */}
      <nav className={`dn2__nav ${scrolled ? "dn2__nav--scrolled" : ""}`}>
        <div className="dn2__nav-inner">
          <Link href="/decoded/landing-noir-2" className="dn2__logo">
            Decoded
          </Link>
          <Link href="/decoded" className="dn2__nav-cta">
            Start the Investigation
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="dn2__hero">
        <div className="dn2__hero-content">
          <p className="dn2__hero-eyebrow">The Case of You</p>
          <h1 className="dn2__hero-title">
            FINALLY CRACK THE CODE<br />ON WHO YOU ARE.
          </h1>
          <p className="dn2__hero-sub">
            13 validated psychological instruments. One adaptive assessment.
            A free 30-page dossier — and an informant who&apos;s already read every word.
          </p>

          <Link href="/decoded" className="dn2__btn-tape">
            START THE INVESTIGATION
          </Link>

          <div className="dn2__hero-meta">
            <div className="dn2__hero-meta-item">
              <Search className="w-4 h-4" />
              <span>NO CREDIT CARD REQUIRED</span>
            </div>
            <div className="dn2__hero-meta-item">
              <Clock className="w-4 h-4" />
              <span>~30 MINUTES</span>
            </div>
            <div className="dn2__hero-meta-item">
              <Layers className="w-4 h-4" />
              <span>13 VALIDATED INSTRUMENTS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cold Cases ── */}
      <section className="dn2__section" id="cold-cases">
        <div className="dn2__section-inner">
          <h2 className="dn2__section-title">Cold Cases: Why Others Failed You</h2>
          
          <div className="dn2__folder-grid">
            {COLD_CASES.map((item, index) => (
              <div className="dn2__folder-card" key={index}>
                <div className="dn2__folder-tab">{item.caseNo}</div>
                <div className={`dn2__polaroid ${item.rotClass}`}>
                  <div className="dn2__polaroid-img">
                    <item.icon />
                  </div>
                </div>
                <h3 className="dn2__folder-title">{item.title}</h3>
                <p className="dn2__folder-text">{item.desc}</p>
                <div className="dn2__folder-examples">EXAMPLES: {item.examples}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Investigation ── */}
      <section className="dn2__section" id="the-investigation">
        <div className="dn2__section-inner">
          <h2 className="dn2__section-title">The Investigation: Your Assessment</h2>
          
          <div className="dn2__folder-grid">
            {STAGES.map((item, index) => (
              <div className="dn2__folder-card" key={index}>
                <div className="dn2__folder-tab">{item.caseNo}</div>
                <div className={`dn2__polaroid ${item.rotClass}`}>
                  <div className="dn2__polaroid-img">
                    <item.icon />
                  </div>
                </div>
                <h3 className="dn2__folder-title">{item.title}</h3>
                <p className="dn2__folder-text">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Envelope / Pricing ── */}
      <section className="dn2__case-file-section" id="pricing">
        <div className="dn2__section-inner">
          <div className="dn2__dossier-envelope">
            <div className="dn2__envelope-stamp">Declassified</div>
            <h2 className="dn2__envelope-title">Confidential Case File</h2>
            
            <div className="dn2__envelope-grid">
              {/* Free Card */}
              <div className="dn2__envelope-card">
                <span className="dn2__envelope-tag">Begin Case</span>
                <h3 className="dn2__envelope-name">Free Investigation</h3>
                <p className="dn2__envelope-desc">
                  Gain access to the core assessment and obtain your initial personality dossier immediately.
                </p>
                
                <ul className="dn2__envelope-features">
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" />
                    <span>Full assessment (13 instruments)</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" />
                    <span>7-section AI-written dossier</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" />
                    <span>Big Five radar chart analysis</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" />
                    <span>Attachment style quadrant mapping</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" />
                    <span>5 AI Informant messages per day</span>
                  </li>
                </ul>
                
                <Link href="/decoded" className="dn2__env-cta">
                  UPGRADE NOW
                </Link>
              </div>

              {/* Paid Card */}
              <div className="dn2__envelope-card dn2__envelope-card--featured">
                <span className="dn2__envelope-tag">Unlock File</span>
                <h3 className="dn2__envelope-name">The Full Dossier</h3>
                <p className="dn2__envelope-desc">
                  Acquire complete psychological clearance. Access all 12 intelligence reports and unlimited coaching.
                </p>
                
                <ul className="dn2__envelope-features">
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" strokeWidth={3} />
                    <span><strong>Everything in Free</strong></span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" strokeWidth={3} />
                    <span>5 additional depth dossier reports</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" strokeWidth={3} />
                    <span>Full Emotional Landscape details</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" strokeWidth={3} />
                    <span>Growth Roadmap action plans</span>
                  </li>
                  <li className="dn2__envelope-feature">
                    <Check className="w-4 h-4" strokeWidth={3} />
                    <span>Unlimited AI Informant coaching</span>
                  </li>
                </ul>
                
                <Link href="/decoded" className="dn2__env-cta dn2__env-cta--yellow">
                  UPGRADE NOW
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="dn2__footer">
        <div className="dn2__footer-brand">
          Decoded // Mastery Coach
        </div>
        <div className="dn2__footer-links">
          <Link href="/privacy" className="dn2__footer-link">Privacy Policy</Link>
          <Link href="/terms" className="dn2__footer-link">Terms of Service</Link>
        </div>
        <p className="dn2__footer-copy">
          &copy; {new Date().getFullYear()} Mastery Coach. All rights reserved.<br />
          Decoded is for personal insights only and does not provide clinical mental health diagnoses.
        </p>
      </footer>
    </div>
  );
}
