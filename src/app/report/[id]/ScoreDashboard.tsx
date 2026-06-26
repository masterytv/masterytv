'use client';

/**
 * Score Dashboard — Instant results visualization
 * 
 * Shows all scored assessment data immediately while AI narrative
 * sections generate in the background. Inspired by Deep Personality's
 * approach of showing graphs and scores instantly.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint,
  Link2,
  Compass,
  ShieldCheck,
  Heart,
  Waves,
  TrendingUp,
  Zap,
  Leaf,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import BigFiveRadar from './BigFiveRadar';
import AttachmentQuadrant from './AttachmentQuadrant';
import WellnessRadar from './WellnessRadar';
import { attachmentDisplay } from '@/lib/decoded/report/attachment-style';

interface ScoreRow {
  instrument_id: string;
  total_score?: number;
  subscale_scores?: Record<string, number>;
  percentile_scores?: Record<string, number>;
  interpretation?: Record<string, unknown>;
}

interface ScoreDashboardProps {
  scores: ScoreRow[];
  archetypeBase?: string;
  archetypeSublabel?: string;
  archetypeTagline?: string;
  /** Relationship report: lead the results with Relationship Style, reframe copy. */
  isRelationship?: boolean;
}

import type { Easing } from 'framer-motion';

// Severity color mapping for clinical screeners
const severityColors: Record<string, string> = {
  'Minimal': '#69f6b8',
  'Mild': '#fbbf24',
  'Moderate': '#fb923c',
  'Severe': '#f87171',
};

// Stagger animation for cards
const EASE_OUT: Easing = [0, 0, 0.2, 1];
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: EASE_OUT },
  }),
};

// Trait explanations — positively framed at both ends of the spectrum
const TRAIT_INFO: Record<string, { tagline: string; desc: string; high: string; low: string }> = {
  openness: {
    tagline: 'Your Creative & Practical Style',
    desc: 'How you process new ideas, art, and experiences.',
    high: 'You are naturally curious, imaginative, and love exploring abstract concepts and new horizons.',
    low: 'You are practical, realistic, and focused. You value tradition, consistency, and what is proven to work.',
  },
  conscientiousness: {
    tagline: 'Your Organization & Flexibility Style',
    desc: 'How you approach planning, discipline, and follow-through.',
    high: 'You are organized, dependable, and goal-driven. You thrive with structure and detailed plans.',
    low: 'You are adaptable, spontaneous, and comfortable with ambiguity. You stay flexible when plans change.',
  },
  extraversion: {
    tagline: 'Your Social Energy Style',
    desc: 'Where you draw your energy — from people or from solitude.',
    high: 'You are energized by social interaction, talkative, and assertive. You light up in groups.',
    low: 'You recharge through solitude, prefer deep one-on-one conversations, and think before speaking.',
  },
  agreeableness: {
    tagline: 'Your Collaboration & Advocacy Style',
    desc: 'How you balance harmony with honest directness.',
    high: 'You are warm, empathetic, and cooperative. You naturally build trust and prioritize others\' needs.',
    low: 'You are direct, analytical, and comfortable with debate. You advocate clearly and challenge ideas.',
  },
  neuroticism: {
    tagline: 'Your Emotional Sensitivity Style',
    desc: 'How intensely you experience emotions and stress.',
    high: 'You are deeply perceptive and emotionally attuned. You pick up on subtleties others miss.',
    low: 'You are calm under pressure, emotionally steady, and resilient. You recover quickly from setbacks.',
  },
};

// RIASEC dimension explanations — positively framed
const RIASEC_INFO: Record<string, { tagline: string; desc: string; careers: string }> = {
  realistic: {
    tagline: 'The Builder',
    desc: 'You prefer hands-on, physical work and practical problem-solving. You thrive when you can see tangible results from your effort.',
    careers: 'Engineering, mechanics, agriculture, athletics, skilled trades, outdoor work.',
  },
  investigative: {
    tagline: 'The Thinker',
    desc: 'You love analyzing data, solving complex puzzles, and exploring how things work at a deep level.',
    careers: 'Research, science, medicine, data analysis, technology, academia.',
  },
  artistic: {
    tagline: 'The Creator',
    desc: 'You express yourself through originality and imagination. You value aesthetics, self-expression, and creative freedom.',
    careers: 'Design, writing, music, film, architecture, fine arts, marketing.',
  },
  social: {
    tagline: 'The Helper',
    desc: 'You are drawn to teaching, healing, and supporting others. Connection and service give your work meaning.',
    careers: 'Counseling, education, healthcare, social work, coaching, nonprofit.',
  },
  enterprising: {
    tagline: 'The Persuader',
    desc: 'You lead, influence, and take initiative. You are energized by competition, risk, and building something from nothing.',
    careers: 'Entrepreneurship, sales, management, law, politics, business development.',
  },
  conventional: {
    tagline: 'The Organizer',
    desc: 'You bring order to chaos. You excel at systems, details, and processes that keep everything running smoothly.',
    careers: 'Finance, accounting, administration, logistics, data management, compliance.',
  },
};

export default function ScoreDashboard({ scores, archetypeBase, archetypeSublabel, archetypeTagline, isRelationship = false }: ScoreDashboardProps) {
  // Extract instrument data
  const ipip = scores.find(s => s.instrument_id === 'ipip50');
  const ecr = scores.find(s => s.instrument_id === 'ecr_r_short');
  const riasec = scores.find(s => s.instrument_id === 'riasec');
  const swls = scores.find(s => s.instrument_id === 'swls');
  const flourishing = scores.find(s => s.instrument_id === 'flourishing');
  const gad7 = scores.find(s => s.instrument_id === 'gad7');
  const ders = scores.find(s => s.instrument_id === 'ders16');
  const scs = scores.find(s => s.instrument_id === 'scs_sf');
  const weims = scores.find(s => s.instrument_id === 'weims');
  const wellness = scores.find(s => s.instrument_id === 'wellness_check');

  const hasScores = scores.length > 0;
  let cardIndex = 0;
  const [expandedTrait, setExpandedTrait] = useState<string | null>(null);
  const [expandedRiasec, setExpandedRiasec] = useState<string | null>(null);
  const [expandedScs, setExpandedScs] = useState<string | null>(null);
  const [expandedDers, setExpandedDers] = useState<string | null>(null);
  const [expandedWeims, setExpandedWeims] = useState<string | null>(null);
  const [expandedWellness, setExpandedWellness] = useState<string | null>(null);

  // Big Five percentiles in order [O, C, E, A, N]
  const bigFivePercentiles = ipip?.percentile_scores
    ? [
        ipip.percentile_scores.openness ?? 50,
        ipip.percentile_scores.conscientiousness ?? 50,
        ipip.percentile_scores.extraversion ?? 50,
        ipip.percentile_scores.agreeableness ?? 50,
        ipip.percentile_scores.neuroticism ?? 50,
      ]
    : null;

  const bigFiveSubscales = ipip?.subscale_scores;

  if (!hasScores) return null;

  return (
    <motion.div
      className="score-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-header">
        <div className="dashboard-header__label">Your Results</div>
        <h2 className="dashboard-header__title">
          {isRelationship ? 'Here’s What We Found' : 'Assessment Complete'}
        </h2>
        <p className="dashboard-header__subtitle">
          {isRelationship
            ? 'Starting with how you connect — explore your results while your personalized read generates below.'
            : 'Your scored data across all instruments — explore while your personalized narrative generates below.'}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* ── Big Five Personality ── */}
        {bigFivePercentiles && (
          <motion.div className="dashboard-card dashboard-card--wide" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Fingerprint className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Personality Profile</h3>
                <p className="dashboard-card__subtitle">Big Five (IPIP-50)</p>
              </div>
            </div>
            {/* Intro context — no good/bad scores */}
            <p style={{
              fontSize: '0.875rem',
              lineHeight: 1.7,
              color: 'var(--text-body)',
              margin: '0 0 1rem',
              padding: '0.875rem 1rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              There are no &ldquo;good&rdquo; or &ldquo;bad&rdquo; scores here. Each percentage shows where you naturally sit on a spectrum — and <strong style={{ color: 'var(--text-heading)' }}>every position brings its own strengths</strong>. Tap any trait below to learn more.
            </p>
            <BigFiveRadar values={bigFivePercentiles} size={260} />
            {bigFiveSubscales && (
              <div className="trait-bars">
                {(['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const).map((trait) => {
                  const pct = bigFivePercentiles[['openness','conscientiousness','extraversion','agreeableness','neuroticism'].indexOf(trait)];
                  const label = trait.charAt(0).toUpperCase() + trait.slice(1);
                  const info = TRAIT_INFO[trait];
                  const isExpanded = expandedTrait === trait;
                  return (
                    <div key={trait} className="trait-bar">
                      <button
                        onClick={() => setExpandedTrait(isExpanded ? null : trait)}
                        className="trait-bar__label"
                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {label}
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'var(--text-muted)',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </span>
                        <span className="trait-bar__value">{Math.round(pct)}%</span>
                      </button>
                      <div className="trait-bar__track">
                        <motion.div
                          className="trait-bar__fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                      <AnimatePresence>
                        {isExpanded && info && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0.75rem 0.875rem',
                              marginTop: '0.375rem',
                              background: 'var(--color-surface-100)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              lineHeight: 1.6,
                              color: 'var(--text-body)',
                            }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.25rem' }}>
                                {info.tagline}
                              </div>
                              <div style={{ marginBottom: '0.5rem' }}>{info.desc}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '0.125rem' }}>
                                    Higher scores
                                  </div>
                                  <div>{info.high}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '0.125rem' }}>
                                    Lower scores
                                  </div>
                                  <div>{info.low}</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Relationship / Attachment Style ── */}
        {ecr && (() => {
          const rawStyle = (ecr.interpretation?.attachmentStyle as string) ?? 'secure';
          const legacyMap: Record<string, string> = {
            secure: 'Secure', anxious: 'Anxious-Preoccupied',
            avoidant: 'Dismissive-Avoidant', disorganized: 'Fearful-Avoidant',
          };
          const displayStyle = legacyMap[rawStyle] ?? rawStyle;
          // Warm, non-clinical naming — leads with "The Guarded Heart", never the
          // clinical "Fearful-Avoidant" (the quadrant keeps it as a tiny ref).
          const warm = attachmentDisplay(displayStyle);
          return (
          <motion.div
            className="dashboard-card dashboard-card--wide"
            custom={cardIndex++}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            // Relationship reports LEAD the results with relationship style.
            style={isRelationship ? { order: -1 } : undefined}
          >
            <div className="dashboard-card__header">
              <Link2 className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">{isRelationship ? 'Relationship Style' : 'Attachment Style'}</h3>
                <p className="dashboard-card__subtitle">How you bond and connect</p>
              </div>
            </div>
            {/* Result — warm name leads, at the TOP of the card */}
            <div style={{ textAlign: 'center', margin: '0.25rem 0 1rem' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-heading)',
                lineHeight: 1.2,
              }}>
                {warm.name}
              </div>
              {warm.tagline && (
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-label)',
                  marginTop: '0.25rem',
                  fontStyle: 'italic',
                }}>
                  {warm.tagline}
                </div>
              )}
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.875rem',
              lineHeight: 1.7,
              color: 'var(--text-body)',
              margin: '0 0 1rem',
              padding: '0.875rem 1rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              {isRelationship ? 'Your relationship style describes' : 'Your attachment style describes'}{' '}
              <strong style={{ color: 'var(--text-heading)' }}>how you bond and connect in close relationships</strong>. No style is &ldquo;broken&rdquo; — each reflects strategies you developed to stay safe and loved. Tap any quadrant to understand its strengths.
            </p>
            <AttachmentQuadrant
              anxiety={ecr.subscale_scores?.anxiety ?? 3.5}
              avoidance={ecr.subscale_scores?.avoidance ?? 3.5}
              style={displayStyle}
            />
          </motion.div>
          );
        })()}

        {/* ── Mental Health Screening ── */}
        {gad7 && (() => {
          const severity = (gad7.interpretation?.severity as string) ?? 'Minimal';
          const severityExplanations: Record<string, string> = {
            'Minimal': 'Your score suggests you experience very little generalized anxiety in daily life. This is a sign of emotional stability and strong coping skills.',
            'Mild': 'Some anxiety can sharpen your awareness and empathy. At this level, it\u2019s a signal worth noticing \u2014 not a problem to fix.',
            'Moderate': 'Your sensitivity picks up on things others miss, but at this level it may be costing you energy. Simple tools like breathwork or a few therapy sessions can make a big difference.',
            'Severe': 'Your score suggests anxiety is significantly impacting your daily life. Speaking with a mental health professional can provide real relief \u2014 this is very treatable.',
          };
          return (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <ShieldCheck className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Anxiety Screening</h3>
                <p className="dashboard-card__subtitle">GAD-7</p>
              </div>
            </div>
            {/* Intro context — clarify GAD vs attachment anxiety */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              margin: '0 0 0.75rem',
              padding: '0.75rem 0.875rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              This measures <strong style={{ color: 'var(--text-heading)' }}>generalized anxiety</strong> — racing thoughts, restlessness, and persistent worry. It&rsquo;s different from the <em>attachment anxiety</em> in your relationship map, which is about fear of rejection in close bonds. You can score low here and high there — they&rsquo;re independent.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span className="dashboard-card__result" style={{ color: severityColors[severity] }}>
                {gad7.total_score}
              </span>
              <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 21</span>
            </div>
            <div className="severity-badge" style={{ background: `${severityColors[severity]}20`, color: severityColors[severity] }}>
              {severity}
            </div>
            <div className="score-bar-container">
              <motion.div className="score-bar" style={{ background: severityColors[severity] }} initial={{ width: 0 }} animate={{ width: `${((gad7.total_score ?? 0) / 21) * 100}%` }} transition={{ duration: 0.8 }} />
            </div>
            {/* Severity interpretation */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              marginTop: '0.75rem',
            }}>
              {severityExplanations[severity] ?? severityExplanations['Minimal']}
            </p>
            {/* Screening disclaimer — matches consent agreement */}
            <p style={{
              fontSize: '0.6875rem',
              lineHeight: 1.5,
              color: 'var(--text-muted)',
              marginTop: '0.75rem',
              fontStyle: 'italic',
            }}>
              This is a screening tool, not a clinical diagnosis. Results suggest areas to explore with qualified professionals.
            </p>
          </motion.div>
          );
        })()}

        {/* ── Self-Compassion ── */}
        {scs && (() => {
          const total = (scs.total_score as number) ?? 0;
          const pct = Math.round((total / 5) * 100);
          // Neff's cutoffs: Low < 2.5, Moderate 2.5-3.5, High > 3.5
          const level = total >= 3.5 ? 'High' : total >= 2.5 ? 'Moderate' : 'Low';
          const levelExplanations: Record<string, string> = {
            'High': 'You treat yourself with warmth and understanding when things go wrong. This is a powerful foundation for resilience and emotional well-being.',
            'Moderate': 'You sometimes extend compassion to yourself and sometimes fall into self-criticism. There is real room to strengthen this — and the research shows it responds beautifully to practice.',
            'Low': 'You tend to be harder on yourself than you are on others. This is common, and the good news: self-compassion is a learnable skill with one of the strongest evidence bases in psychology.',
          };
          const SCS_SUBSCALE_INFO: Record<string, { label: string; desc: string; positive: boolean }> = {
            selfKindness: {
              label: 'Self-Kindness',
              desc: 'How gently you treat yourself during difficult moments. Higher scores mean you offer yourself warmth instead of harsh criticism.',
              positive: true,
            },
            selfJudgment: {
              label: 'Self-Judgment',
              desc: 'How critically you evaluate yourself when you fail or fall short. Higher scores here mean more inner critic activity — this is the one to watch.',
              positive: false,
            },
            commonHumanity: {
              label: 'Common Humanity',
              desc: 'How much you see your struggles as part of the shared human experience rather than something isolating and personal.',
              positive: true,
            },
            isolation: {
              label: 'Isolation',
              desc: 'How alone you feel in your suffering. Higher scores mean you tend to feel like you\'re the only one going through it.',
              positive: false,
            },
            mindfulness: {
              label: 'Mindfulness',
              desc: 'Your ability to hold painful feelings in balanced awareness — neither ignoring them nor getting swept away.',
              positive: true,
            },
            overIdentification: {
              label: 'Over-Identification',
              desc: 'How much you get absorbed in and fixated on negative thoughts and feelings. Higher scores mean emotions can feel all-consuming.',
              positive: false,
            },
          };
          return (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Heart className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Self-Compassion</h3>
                <p className="dashboard-card__subtitle">SCS-SF</p>
              </div>
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              margin: '0 0 0.75rem',
              padding: '0.75rem 0.875rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              Self-compassion measures <strong style={{ color: 'var(--text-heading)' }}>how you relate to yourself during hard times</strong> — with kindness or criticism. It&rsquo;s one of the strongest predictors of emotional resilience. Tap any subscale to learn more.
            </p>
            {/* Score display — x/5 with percentage bar */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.25rem 0 0.25rem' }}>
              <span className="dashboard-card__result">{total.toFixed(1)}</span>
              <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 5</span>
            </div>
            <div className="severity-badge" style={{
              background: level === 'High' ? 'rgba(105, 246, 184, 0.15)' : level === 'Moderate' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              color: level === 'High' ? 'var(--color-accent-emerald)' : level === 'Moderate' ? '#fbbf24' : '#f87171',
            }}>
              {level}
            </div>
            <div className="score-bar-container">
              <motion.div
                className="score-bar"
                style={{ background: level === 'High' ? '#69f6b8' : level === 'Moderate' ? '#fbbf24' : '#f87171' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-body)', marginTop: '0.75rem' }}>
              {levelExplanations[level]}
            </p>
            {/* Expandable subscales */}
            {scs.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '0.75rem' }}>
                {Object.entries(scs.subscale_scores).map(([key, val]) => {
                  const info = SCS_SUBSCALE_INFO[key];
                  const isExpanded = expandedScs === key;
                  const numVal = val as number;
                  const barPct = (numVal / 5) * 100;
                  return (
                    <div key={key} className="trait-bar">
                      <button
                        onClick={() => setExpandedScs(isExpanded ? null : key)}
                        className="trait-bar__label"
                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {info?.label ?? key.replace(/([A-Z])/g, ' $1').trim()}
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'var(--text-muted)',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </span>
                        <span className="trait-bar__value">{numVal.toFixed(1)}</span>
                      </button>
                      <div className="trait-bar__track">
                        <motion.div
                          className={`trait-bar__fill ${info?.positive ? '' : 'trait-bar__fill--orange'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <AnimatePresence>
                        {isExpanded && info && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0.75rem 0.875rem',
                              marginTop: '0.375rem',
                              background: 'var(--color-surface-100)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              lineHeight: 1.6,
                              color: 'var(--text-body)',
                            }}>
                              {info.desc}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
          );
        })()}

        {/* ── Emotional Regulation ── */}
        {ders && (() => {
          const total = (ders.total_score as number) ?? 16;
          // DERS is inverted: lower = better regulation. Rough clinical thresholds:
          const level = total <= 36 ? 'Strong' : total <= 52 ? 'Moderate' : 'Developing';
          const levelExplanations: Record<string, string> = {
            'Strong': 'You have a solid ability to manage your emotions. You can sit with discomfort, stay focused under stress, and recover from emotional setbacks quickly.',
            'Moderate': 'You handle most emotions well, but certain situations may still overwhelm your coping resources. This is very common — targeted practice can sharpen these skills.',
            'Developing': 'Emotions may feel intense or hard to manage at times. This doesn\u2019t mean something is wrong with you — it means your emotional toolkit has room to grow, and it responds well to practice.',
          };
          const DERS_SUBSCALE_INFO: Record<string, { label: string; desc: string; max: number }> = {
            clarity: {
              label: 'Emotional Clarity',
              desc: 'How clearly you can identify what you\u2019re feeling. Higher scores mean emotions often feel confusing or hard to name.',
              max: 10,
            },
            goals: {
              label: 'Goal-Directed Behavior',
              desc: 'How well you stay focused on tasks when upset. Higher scores mean strong emotions derail your ability to function.',
              max: 15,
            },
            impulse: {
              label: 'Impulse Control',
              desc: 'How well you maintain control over your behavior when emotionally activated. Higher scores mean you may act before thinking.',
              max: 15,
            },
            nonAcceptance: {
              label: 'Emotional Acceptance',
              desc: 'How much you judge yourself for having negative emotions. Higher scores mean you tend to feel guilty or ashamed about feeling upset.',
              max: 15,
            },
            strategies: {
              label: 'Regulation Strategies',
              desc: 'Whether you have effective tools to calm yourself down. Higher scores mean you may feel stuck or helpless when distressed.',
              max: 20,
            },
            awareness: {
              label: 'Emotional Awareness',
              desc: 'How tuned in you are to your emotional state. This scale is reverse-scored — higher means more aware.',
              max: 5,
            },
          };
          return (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Waves className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Emotional Regulation</h3>
                <p className="dashboard-card__subtitle">DERS-16</p>
              </div>
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              margin: '0 0 0.75rem',
              padding: '0.75rem 0.875rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              This measures <strong style={{ color: 'var(--text-heading)' }}>how effectively you manage difficult emotions</strong>. Lower scores are better here — they mean your emotional regulation toolkit is well-developed. Tap any subscale to learn more.
            </p>
            {/* Score display */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.25rem 0 0.25rem' }}>
              <span className="dashboard-card__result">{total}</span>
              <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 80</span>
            </div>
            <div className="severity-badge" style={{
              background: level === 'Strong' ? 'rgba(105, 246, 184, 0.15)' : level === 'Moderate' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              color: level === 'Strong' ? 'var(--color-accent-emerald)' : level === 'Moderate' ? '#fbbf24' : '#f87171',
            }}>
              {level}
            </div>
            <div className="score-bar-container">
              <motion.div
                className="score-bar"
                style={{ background: level === 'Strong' ? '#69f6b8' : level === 'Moderate' ? '#fbbf24' : '#f87171' }}
                initial={{ width: 0 }}
                animate={{ width: `${(total / 80) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-body)', marginTop: '0.75rem' }}>
              {levelExplanations[level]}
            </p>
            {/* Expandable subscales */}
            {ders.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '0.75rem' }}>
                {Object.entries(ders.subscale_scores).map(([key, val]) => {
                  const info = DERS_SUBSCALE_INFO[key];
                  const isExpanded = expandedDers === key;
                  const maxVal = info?.max ?? 15;
                  const barPct = (val / maxVal) * 100;
                  return (
                    <div key={key} className="trait-bar">
                      <button
                        onClick={() => setExpandedDers(isExpanded ? null : key)}
                        className="trait-bar__label"
                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {info?.label ?? key.charAt(0).toUpperCase() + key.slice(1)}
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'var(--text-muted)',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </span>
                        <span className="trait-bar__value">{val}</span>
                      </button>
                      <div className="trait-bar__track">
                        <motion.div
                          className="trait-bar__fill trait-bar__fill--orange"
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <AnimatePresence>
                        {isExpanded && info && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0.75rem 0.875rem',
                              marginTop: '0.375rem',
                              background: 'var(--color-surface-100)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              lineHeight: 1.6,
                              color: 'var(--text-body)',
                            }}>
                              {info.desc}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
          );
        })()}

        {/* ── Life Satisfaction + Flourishing ── */}
        {(swls || flourishing) && (() => {
          const swlsTotal = (swls?.total_score as number) ?? 0;
          const swlsLevel = (swls?.interpretation?.level as string) ?? '';
          const flourTotal = (flourishing?.total_score as number) ?? 0;
          const flourLevel = (flourishing?.interpretation?.level as string) ?? '';

          const swlsExplanations: Record<string, string> = {
            'Extremely satisfied': 'You love your life as it is. This kind of deep contentment is rare and worth protecting.',
            'Satisfied': 'You feel genuinely good about the direction of your life. Most of the important pieces are in place.',
            'Slightly satisfied': 'Life is going reasonably well. You see room for improvement, but the foundation is solid.',
            'Neutral': 'You feel neither particularly satisfied nor dissatisfied. This is often a transition point — a signal to reflect on what matters most.',
            'Slightly dissatisfied': 'Something feels off. This score often points to a specific area — relationships, work, or health — that needs attention.',
            'Dissatisfied': 'You are noticeably unhappy with how things are going. Identifying the one or two biggest sources of friction can create a real shift.',
            'Extremely dissatisfied': 'Life feels very difficult right now. This is a strong signal to seek support — things can get significantly better with the right changes.',
          };
          const flourExplanations: Record<string, string> = {
            'High flourishing': 'You feel a strong sense of meaning, purpose, and positive relationships. You are thriving across the dimensions that matter most.',
            'Moderate-high flourishing': 'You are doing well — engaged, connected, and purposeful. Small adjustments can push this even higher.',
            'Moderate flourishing': 'You have a decent baseline of well-being, but some areas may feel flat or unfulfilling.',
            'Low-moderate flourishing': 'Several areas of your life may feel stagnant or disconnected. This score responds well to intentional focus on purpose and relationships.',
            'Low flourishing': 'You may be going through the motions without a deep sense of meaning. This is a call to action — not a life sentence.',
          };

          // Color coding based on level
          const swlsBadgeColor = ['Extremely satisfied', 'Satisfied'].includes(swlsLevel)
            ? { bg: 'rgba(105, 246, 184, 0.15)', text: 'var(--color-accent-emerald)' }
            : ['Slightly satisfied', 'Neutral'].includes(swlsLevel)
            ? { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' }
            : { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' };

          const flourBadgeColor = ['High flourishing', 'Moderate-high flourishing'].includes(flourLevel)
            ? { bg: 'rgba(105, 246, 184, 0.15)', text: 'var(--color-accent-emerald)' }
            : ['Moderate flourishing'].includes(flourLevel)
            ? { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' }
            : { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' };

          return (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <TrendingUp className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Life Satisfaction & Flourishing</h3>
                <p className="dashboard-card__subtitle">SWLS + Flourishing Scale</p>
              </div>
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              margin: '0 0 1rem',
              padding: '0.75rem 0.875rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              These two validated scales measure <strong style={{ color: 'var(--text-heading)' }}>how you feel about your life overall</strong> and whether you experience a deep sense of meaning, purpose, and connection.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* SWLS */}
              {swls && (
                <div>
                  <div className="text-label-sm" style={{ color: 'var(--text-label)', marginBottom: '0.25rem' }}>Life Satisfaction (SWLS)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="dashboard-card__result" style={{ fontSize: '2rem' }}>{swlsTotal}</span>
                    <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 35</span>
                  </div>
                  <div className="severity-badge" style={{ background: swlsBadgeColor.bg, color: swlsBadgeColor.text }}>
                    {swlsLevel}
                  </div>
                  <div className="score-bar-container" style={{ marginTop: '0.375rem' }}>
                    <motion.div className="score-bar" style={{ background: swlsBadgeColor.text }} initial={{ width: 0 }} animate={{ width: `${((swlsTotal - 5) / 30) * 100}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-body)', marginTop: '0.5rem' }}>
                    {swlsExplanations[swlsLevel] ?? ''}
                  </p>
                </div>
              )}
              {/* Flourishing */}
              {flourishing && (
                <div>
                  <div className="text-label-sm" style={{ color: 'var(--text-label)', marginBottom: '0.25rem' }}>Flourishing</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="dashboard-card__result" style={{ fontSize: '2rem' }}>{flourTotal}</span>
                    <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 56</span>
                  </div>
                  <div className="severity-badge" style={{ background: flourBadgeColor.bg, color: flourBadgeColor.text }}>
                    {flourLevel}
                  </div>
                  <div className="score-bar-container" style={{ marginTop: '0.375rem' }}>
                    <motion.div className="score-bar" style={{ background: flourBadgeColor.text }} initial={{ width: 0 }} animate={{ width: `${((flourTotal - 8) / 48) * 100}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-body)', marginTop: '0.5rem' }}>
                    {flourExplanations[flourLevel] ?? ''}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
          );
        })()}

        {/* ── RIASEC / Holland Code ── */}
        {riasec && (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Compass className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Career Interests</h3>
                <p className="dashboard-card__subtitle">Holland Code (RIASEC)</p>
              </div>
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.875rem',
              lineHeight: 1.7,
              color: 'var(--text-body)',
              margin: '0 0 1rem',
              padding: '0.875rem 1rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              Your Holland Code reveals <strong style={{ color: 'var(--text-heading)' }}>which types of work environments energize you most</strong>. The three-letter code below represents your top interests — tap any dimension to learn what it means.
            </p>
            <div className="dashboard-card__result" style={{ fontSize: '1.75rem', letterSpacing: '0.08em' }}>
              {(riasec.interpretation?.hollandCode as string) ?? '---'}
            </div>
            {riasec.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '1rem' }}>
                {Object.entries(riasec.subscale_scores).map(([key, val]) => {
                  const info = RIASEC_INFO[key];
                  const isExpanded = expandedRiasec === key;
                  return (
                    <div key={key} className="trait-bar">
                      <button
                        onClick={() => setExpandedRiasec(isExpanded ? null : key)}
                        className="trait-bar__label"
                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'var(--text-muted)',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </span>
                        <span className="trait-bar__value">{val}</span>
                      </button>
                      <div className="trait-bar__track">
                        <motion.div className="trait-bar__fill trait-bar__fill--teal" initial={{ width: 0 }} animate={{ width: `${(val / 25) * 100}%` }} transition={{ duration: 0.8 }} />
                      </div>
                      <AnimatePresence>
                        {isExpanded && info && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0.75rem 0.875rem',
                              marginTop: '0.375rem',
                              background: 'var(--color-surface-100)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              lineHeight: 1.6,
                              color: 'var(--text-body)',
                            }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.25rem' }}>
                                {info.tagline}
                              </div>
                              <div style={{ marginBottom: '0.5rem' }}>{info.desc}</div>
                              <div>
                                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '0.125rem' }}>
                                  Common Career Paths
                                </div>
                                <div>{info.careers}</div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Work Motivation ── */}
        {weims && (() => {
          const sdi = (weims.interpretation?.sdi as number) ?? 0;
          // SDI ranges roughly from -18 to +18. Positive = more self-determined
          const sdiLevel = sdi >= 6 ? 'Highly Self-Determined' : sdi >= 0 ? 'Moderately Self-Determined' : 'Externally Driven';
          const sdiExplanations: Record<string, string> = {
            'Highly Self-Determined': 'You work because you genuinely want to. Your motivation comes from within — passion, purpose, and personal values drive your effort. This is the strongest predictor of sustained performance and career satisfaction.',
            'Moderately Self-Determined': 'Your motivation is a mix of internal drive and external factors. You care about your work, but some of what keeps you going comes from obligation or reward rather than pure passion.',
            'Externally Driven': 'Much of your work motivation currently comes from external pressures — deadlines, money, approval, or avoiding consequences. This isn\u2019t a flaw, but it is a signal. Externally driven motivation burns out faster.',
          };
          const sdiBadgeColor = sdi >= 6
            ? { bg: 'rgba(105, 246, 184, 0.15)', text: 'var(--color-accent-emerald)' }
            : sdi >= 0
            ? { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' }
            : { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' };

          const WEIMS_SUBSCALE_INFO: Record<string, { label: string; desc: string; autonomous: boolean }> = {
            intrinsic: {
              label: 'Intrinsic',
              desc: 'You do it because it\u2019s genuinely interesting and enjoyable. This is the purest form of motivation — it doesn\u2019t need rewards to sustain itself.',
              autonomous: true,
            },
            integrated: {
              label: 'Integrated',
              desc: 'Your work aligns with who you are and what you value. You\u2019ve internalized it as part of your identity — not just a job, but a calling.',
              autonomous: true,
            },
            identified: {
              label: 'Identified',
              desc: 'You see the value and importance of what you do, even when it\u2019s not inherently fun. You choose it because it matters to you.',
              autonomous: true,
            },
            introjected: {
              label: 'Introjected',
              desc: 'You work to avoid guilt, shame, or to protect your ego. The drive is internal, but it comes from pressure rather than choice.',
              autonomous: false,
            },
            external: {
              label: 'External',
              desc: 'You work for tangible rewards — money, status, promotion — or to avoid punishment. This keeps you going short-term but erodes over time.',
              autonomous: false,
            },
            amotivation: {
              label: 'Amotivation',
              desc: 'A sense of "why bother?" — feeling disconnected from the purpose or value of your work. High scores here are a strong signal to reassess your path.',
              autonomous: false,
            },
          };

          return (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Zap className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Work Motivation</h3>
                <p className="dashboard-card__subtitle">WEIMS — Self-Determination</p>
              </div>
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              margin: '0 0 0.75rem',
              padding: '0.75rem 0.875rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              This measures <strong style={{ color: 'var(--text-heading)' }}>why you work — not how hard</strong>. Research shows that the <em>source</em> of your motivation matters more than the amount. Tap any type to learn more.
            </p>
            {/* SDI display */}
            <div className="text-label-sm" style={{ color: 'var(--text-label)', marginBottom: '0.25rem' }}>Self-Determination Index (SDI)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="dashboard-card__result">{sdi.toFixed(1)}</span>
              <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 18</span>
            </div>
            <div className="severity-badge" style={{ background: sdiBadgeColor.bg, color: sdiBadgeColor.text }}>
              {sdiLevel}
            </div>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-body)', marginTop: '0.5rem' }}>
              {sdiExplanations[sdiLevel]}
            </p>
            {/* Expandable subscales */}
            {weims.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '0.75rem' }}>
                {Object.entries(weims.subscale_scores).map(([key, val]) => {
                  const info = WEIMS_SUBSCALE_INFO[key];
                  const isExpanded = expandedWeims === key;
                  const numVal = val as number;
                  const barPct = (numVal / 7) * 100;
                  return (
                    <div key={key} className="trait-bar">
                      <button
                        onClick={() => setExpandedWeims(isExpanded ? null : key)}
                        className="trait-bar__label"
                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {info?.label ?? key.charAt(0).toUpperCase() + key.slice(1)}
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'var(--text-muted)',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </span>
                        <span className="trait-bar__value">{numVal.toFixed(1)} <span style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>/ 7</span></span>
                      </button>
                      <div className="trait-bar__track">
                        <motion.div
                          className={`trait-bar__fill ${info?.autonomous ? 'trait-bar__fill--purple' : 'trait-bar__fill--orange'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <AnimatePresence>
                        {isExpanded && info && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0.75rem 0.875rem',
                              marginTop: '0.375rem',
                              background: 'var(--color-surface-100)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              lineHeight: 1.6,
                              color: 'var(--text-body)',
                            }}>
                              {info.desc}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
          );
        })()}

        {/* ── Wellness Check ── */}
        {wellness && wellness.subscale_scores && (() => {
          const overall = (wellness.interpretation?.overallWellness as number) ?? 50;
          const overallLevel = overall >= 70 ? 'Thriving' : overall >= 40 ? 'Mixed' : 'Needs Attention';
          const overallBadge = overall >= 70
            ? { bg: 'rgba(105, 246, 184, 0.15)', text: 'var(--color-accent-emerald)' }
            : overall >= 40
            ? { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' }
            : { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' };

          const WELLNESS_INFO: Record<string, { label: string; low: string; mid: string; high: string }> = {
            exercise: {
              label: 'Exercise',
              low: 'You reported little to no physical activity this week. Even 10 minutes of walking creates measurable benefits for mood, energy, and sleep.',
              mid: 'You\u2019re getting some movement in, which is great. Consistency matters more than intensity \u2014 you\u2019re building a foundation.',
              high: 'You\u2019re physically active and it shows. Regular exercise is one of the most powerful tools for mental and physical health.',
            },
            sleep: {
              label: 'Sleep',
              low: 'You\u2019re significantly under-sleeping. This affects everything \u2014 mood, focus, immune function, and emotional regulation. Prioritizing sleep hygiene can transform how you feel.',
              mid: 'You\u2019re getting moderate sleep. Not terrible, but there\u2019s room to improve. Consistent bedtimes and limiting screens before sleep can help.',
              high: 'You\u2019re sleeping well. This is foundational \u2014 good sleep amplifies every other aspect of wellness.',
            },
            nutrition: {
              label: 'Nutrition',
              low: 'Your eating habits may be working against you. This doesn\u2019t require a diet \u2014 small improvements like more protein or vegetables can shift energy and mood.',
              mid: 'Your nutrition is decent but inconsistent. You\u2019re aware of what good eating looks like; now it\u2019s about making it easier to do consistently.',
              high: 'You\u2019re fueling yourself well. Good nutrition stabilizes mood, sharpens focus, and supports long-term health.',
            },
            energy: {
              label: 'Energy',
              low: 'You\u2019re running on empty. This score is inverted \u2014 a low score means your energy is heavily drained. Look at sleep, nutrition, and stress as likely culprits.',
              mid: 'Your energy is moderate. Some days are good, others feel flat. This usually improves when sleep and stress are addressed.',
              high: 'Your energy levels are strong. You\u2019re managing your physical and mental resources well.',
            },
            stress: {
              label: 'Stress Management',
              low: 'Stress is significantly impacting your daily life. This score is inverted \u2014 a low score means high stress impact. Identifying your top stressor and addressing it can create a ripple effect.',
              mid: 'You have some stress, but it\u2019s not overwhelming. Building a few go-to coping strategies can keep this from escalating.',
              high: 'Stress is well-managed. You\u2019ve either built good coping mechanisms or have low external pressure \u2014 either way, this is protective.',
            },
            coping: {
              label: 'Coping Skills',
              low: 'You may feel like you don\u2019t have effective tools when things get hard. This is very learnable \u2014 even one reliable strategy (breathwork, journaling, movement) can change the pattern.',
              mid: 'You have some coping tools but may not use them consistently. The goal isn\u2019t perfection \u2014 it\u2019s having something to reach for when stress spikes.',
              high: 'You have strong coping skills. When things get tough, you know how to steady yourself. This is one of the most important predictors of resilience.',
            },
            social: {
              label: 'Social Connection',
              low: 'You\u2019re socially isolated right now. This doesn\u2019t mean you\u2019re antisocial \u2014 it means your current life structure may not be providing enough meaningful connection. Even one regular, honest conversation a week can shift this.',
              mid: 'You have some social connection but may want more depth or frequency. Quality matters more than quantity here.',
              high: 'You feel socially connected and supported. Strong relationships are consistently one of the top predictors of long-term well-being.',
            },
            purpose: {
              label: 'Sense of Purpose',
              low: 'You may be feeling adrift or disconnected from meaning. This is common during transitions. Reconnecting with what matters \u2014 even in small ways \u2014 can reignite this.',
              mid: 'You have some sense of direction but it may feel inconsistent. Clarifying your values can sharpen this into something more sustaining.',
              high: 'You feel a clear sense of purpose and direction. This is one of the strongest protectors against burnout and depression.',
            },
            screenTime: {
              label: 'Screen Balance',
              low: 'You\u2019re spending a lot of time on screens. This score is inverted \u2014 a low score means high screen time. Consider whether it\u2019s intentional (productive work) or passive (scrolling). The latter erodes well-being.',
              mid: 'Your screen time is moderate. Being intentional about when and why you\u2019re on screens \u2014 rather than defaulting to them \u2014 makes the difference.',
              high: 'You have a healthy relationship with screens. You\u2019re using them as tools rather than being used by them.',
            },
            vitality: {
              label: 'Overall Vitality',
              low: 'You\u2019re feeling depleted. This is a summary signal \u2014 when vitality is low, look at the other dimensions to find what\u2019s dragging it down.',
              mid: 'You\u2019re getting by, but you\u2019re not at your best. Small improvements in your weakest areas can produce outsized gains here.',
              high: 'You feel alive and energized. This is the goal \u2014 when vitality is high, everything else gets easier.',
            },
          };

          return (
          <motion.div className="dashboard-card dashboard-card--wide" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Leaf className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Wellness Profile</h3>
                <p className="dashboard-card__subtitle">10-Dimension Check</p>
              </div>
            </div>
            {/* Intro context */}
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              margin: '0 0 0.75rem',
              padding: '0.75rem 0.875rem',
              background: 'rgba(96, 99, 238, 0.05)',
              border: '1px solid rgba(96, 99, 238, 0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              This is a snapshot of <strong style={{ color: 'var(--text-heading)' }}>your lifestyle and daily habits right now</strong> — not a permanent label. Each dimension is scored 0–100. Tap any dimension to understand what your score means.
            </p>
            {/* Overall score */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="text-label-sm" style={{ color: 'var(--text-label)' }}>Overall Wellness</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="dashboard-card__result" style={{ fontSize: '2rem' }}>{overall}</span>
              <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 100</span>
            </div>
            <div className="severity-badge" style={{ background: overallBadge.bg, color: overallBadge.text }}>
              {overallLevel}
            </div>
            <WellnessRadar dimensions={wellness.subscale_scores as Record<string, number>} />
            {/* Expandable dimension grid */}
            <div className="trait-bars" style={{ marginTop: '1rem' }}>
              {Object.entries(wellness.subscale_scores).map(([key, val]) => {
                const pct = Math.min(100, Math.max(0, (val as number)));
                const color = pct >= 70 ? '#69f6b8' : pct >= 40 ? '#fbbf24' : '#f87171';
                const info = WELLNESS_INFO[key];
                const isExpanded = expandedWellness === key;
                const explanation = pct >= 70 ? info?.high : pct >= 40 ? info?.mid : info?.low;
                return (
                  <div key={key} className="trait-bar">
                    <button
                      onClick={() => setExpandedWellness(isExpanded ? null : key)}
                      className="trait-bar__label"
                      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {info?.label ?? key.replace(/([A-Z])/g, ' $1').trim()}
                        <ChevronDown
                          size={14}
                          style={{
                            color: 'var(--text-muted)',
                            transition: 'transform 0.2s ease',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      </span>
                      <span className="trait-bar__value" style={{ color }}>{pct}</span>
                    </button>
                    <div className="trait-bar__track">
                      <motion.div
                        style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <AnimatePresence>
                      {isExpanded && explanation && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            padding: '0.75rem 0.875rem',
                            marginTop: '0.375rem',
                            background: 'var(--color-surface-100)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8125rem',
                            lineHeight: 1.6,
                            color: 'var(--text-body)',
                          }}>
                            {explanation}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
          );
        })()}
      </div>

      {/* Screening disclaimer */}
      <div className="dashboard-screening-note">
        <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.375rem' }} />
        These are screening tools, not diagnoses. Scores above clinical thresholds suggest further evaluation may be helpful. If you&apos;re struggling, professional support is a sign of strength, not weakness.
      </div>
    </motion.div>
  );
}
