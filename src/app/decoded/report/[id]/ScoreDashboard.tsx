'use client';

/**
 * Score Dashboard — Instant results visualization
 * 
 * Shows all scored assessment data immediately while AI narrative
 * sections generate in the background. Inspired by Deep Personality's
 * approach of showing graphs and scores instantly.
 */

import { motion } from 'framer-motion';
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
} from 'lucide-react';
import BigFiveRadar from './BigFiveRadar';
import AttachmentQuadrant from './AttachmentQuadrant';
import WellnessRadar from './WellnessRadar';

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
  decodedScore?: number;
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

export default function ScoreDashboard({ scores, archetypeBase, archetypeSublabel, archetypeTagline, decodedScore }: ScoreDashboardProps) {
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
        <h2 className="dashboard-header__title">Assessment Complete</h2>
        <p className="dashboard-header__subtitle">
          Your scored data across all instruments — explore while your personalized narrative generates below.
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
            <BigFiveRadar values={bigFivePercentiles} size={260} />
            {bigFiveSubscales && (
              <div className="trait-bars">
                {(['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const).map((trait) => {
                  const pct = bigFivePercentiles[['openness','conscientiousness','extraversion','agreeableness','neuroticism'].indexOf(trait)];
                  const label = trait.charAt(0).toUpperCase() + trait.slice(1);
                  return (
                    <div key={trait} className="trait-bar">
                      <div className="trait-bar__label">
                        <span>{label}</span>
                        <span className="trait-bar__value">{Math.round(pct)}th</span>
                      </div>
                      <div className="trait-bar__track">
                        <motion.div
                          className="trait-bar__fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Attachment Style ── */}
        {ecr && (() => {
          const rawStyle = (ecr.interpretation?.attachmentStyle as string) ?? 'secure';
          const legacyMap: Record<string, string> = {
            secure: 'Secure', anxious: 'Anxious-Preoccupied',
            avoidant: 'Dismissive-Avoidant', disorganized: 'Fearful-Avoidant',
          };
          const displayStyle = legacyMap[rawStyle] ?? rawStyle;
          return (
          <motion.div className="dashboard-card dashboard-card--wide" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Link2 className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Attachment Style</h3>
                <p className="dashboard-card__subtitle">ECR-R Short</p>
              </div>
            </div>
            <AttachmentQuadrant
              anxiety={ecr.subscale_scores?.anxiety ?? 3.5}
              avoidance={ecr.subscale_scores?.avoidance ?? 3.5}
              style={displayStyle}
            />
            <div className="dashboard-card__result">
              {displayStyle}
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
            <div className="dashboard-card__result" style={{ fontSize: '1.75rem', letterSpacing: '0.08em' }}>
              {(riasec.interpretation?.hollandCode as string) ?? '---'}
            </div>
            {riasec.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '1rem' }}>
                {Object.entries(riasec.subscale_scores).map(([key, val]) => (
                  <div key={key} className="trait-bar">
                    <div className="trait-bar__label">
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className="trait-bar__value">{val}</span>
                    </div>
                    <div className="trait-bar__track">
                      <motion.div className="trait-bar__fill trait-bar__fill--teal" initial={{ width: 0 }} animate={{ width: `${(val / 25) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Mental Health Screening ── */}
        {gad7 && (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <ShieldCheck className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Anxiety Screening</h3>
                <p className="dashboard-card__subtitle">GAD-7</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span className="dashboard-card__result" style={{ color: severityColors[(gad7.interpretation?.severity as string) ?? 'Minimal'] }}>
                {gad7.total_score}
              </span>
              <span className="text-label-md" style={{ color: 'var(--text-label)' }}>/ 21</span>
            </div>
            <div className="severity-badge" style={{ background: `${severityColors[(gad7.interpretation?.severity as string) ?? 'Minimal']}20`, color: severityColors[(gad7.interpretation?.severity as string) ?? 'Minimal'] }}>
              {(gad7.interpretation?.severity as string) ?? 'Minimal'}
            </div>
            <div className="score-bar-container">
              <motion.div className="score-bar" style={{ background: severityColors[(gad7.interpretation?.severity as string) ?? 'Minimal'] }} initial={{ width: 0 }} animate={{ width: `${((gad7.total_score ?? 0) / 21) * 100}%` }} transition={{ duration: 0.8 }} />
            </div>
          </motion.div>
        )}

        {/* ── Self-Compassion ── */}
        {scs && (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Heart className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Self-Compassion</h3>
                <p className="dashboard-card__subtitle">SCS-SF</p>
              </div>
            </div>
            <div className="dashboard-card__result">{scs.total_score ?? '—'}</div>
            {scs.subscale_scores && (
              <div className="scs-grid">
                {Object.entries(scs.subscale_scores).map(([key, val]) => (
                  <div key={key} className="scs-item">
                    <span className="scs-item__label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="scs-item__value">{(val as number).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Emotional Regulation ── */}
        {ders && (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Waves className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Emotional Regulation</h3>
                <p className="dashboard-card__subtitle">DERS-16</p>
              </div>
            </div>
            <div className="dashboard-card__result">{ders.total_score ?? '—'}<span className="text-label-md" style={{ color: 'var(--text-label)' }}> / 80</span></div>
            {ders.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '0.75rem' }}>
                {Object.entries(ders.subscale_scores).map(([key, val]) => (
                  <div key={key} className="trait-bar">
                    <div className="trait-bar__label">
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className="trait-bar__value">{val}</span>
                    </div>
                    <div className="trait-bar__track">
                      <motion.div className="trait-bar__fill trait-bar__fill--orange" initial={{ width: 0 }} animate={{ width: `${(val / 15) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Life Satisfaction + Flourishing ── */}
        {(swls || flourishing) && (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <TrendingUp className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Life Satisfaction & Flourishing</h3>
                <p className="dashboard-card__subtitle">SWLS + Flourishing Scale</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
              {swls && (
                <div>
                  <div className="text-label-sm" style={{ color: 'var(--text-label)' }}>Life Satisfaction</div>
                  <div className="dashboard-card__result">{swls.total_score}<span className="text-label-md" style={{ color: 'var(--text-label)' }}> / 35</span></div>
                  <div className="severity-badge" style={{ background: 'rgba(105, 246, 184, 0.15)', color: 'var(--color-accent-emerald)' }}>
                    {(swls.interpretation?.level as string) ?? '—'}
                  </div>
                </div>
              )}
              {flourishing && (
                <div>
                  <div className="text-label-sm" style={{ color: 'var(--text-label)' }}>Flourishing</div>
                  <div className="dashboard-card__result">{flourishing.total_score}<span className="text-label-md" style={{ color: 'var(--text-label)' }}> / 56</span></div>
                  <div className="severity-badge" style={{ background: 'rgba(105, 246, 184, 0.15)', color: 'var(--color-accent-emerald)' }}>
                    {(flourishing.interpretation?.level as string) ?? '—'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Work Motivation ── */}
        {weims && (
          <motion.div className="dashboard-card" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Zap className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Work Motivation</h3>
                <p className="dashboard-card__subtitle">WEIMS — Self-Determination</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="text-label-sm" style={{ color: 'var(--text-label)' }}>SDI</span>
              <span className="dashboard-card__result">{(weims.interpretation?.sdi as number)?.toFixed(1) ?? '—'}</span>
            </div>
            {weims.subscale_scores && (
              <div className="trait-bars" style={{ marginTop: '0.75rem' }}>
                {Object.entries(weims.subscale_scores).map(([key, val]) => (
                  <div key={key} className="trait-bar">
                    <div className="trait-bar__label">
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className="trait-bar__value">{(val as number).toFixed(1)}</span>
                    </div>
                    <div className="trait-bar__track">
                      <motion.div className="trait-bar__fill trait-bar__fill--purple" initial={{ width: 0 }} animate={{ width: `${((val as number) / 7) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Wellness Check ── */}
        {wellness && wellness.subscale_scores && (
          <motion.div className="dashboard-card dashboard-card--wide" custom={cardIndex++} variants={cardVariants} initial="hidden" animate="visible">
            <div className="dashboard-card__header">
              <Leaf className="dashboard-card__icon" size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="dashboard-card__title">Wellness Profile</h3>
                <p className="dashboard-card__subtitle">10-Dimension Check</p>
              </div>
            </div>
            <WellnessRadar dimensions={wellness.subscale_scores as Record<string, number>} />
            <div className="wellness-grid" style={{ marginTop: '1rem' }}>
              {Object.entries(wellness.subscale_scores).map(([key, val]) => {
                const pct = Math.min(100, Math.max(0, (val as number)));
                const color = pct >= 70 ? '#69f6b8' : pct >= 40 ? '#fbbf24' : '#f87171';
                return (
                  <div key={key} className="wellness-item">
                    <div className="wellness-item__label">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="wellness-item__bar">
                      <motion.div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <div className="wellness-item__value" style={{ color }}>{pct}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Screening disclaimer */}
      <div className="dashboard-screening-note">
        <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.375rem' }} />
        These are screening tools, not diagnoses. Scores above clinical thresholds suggest further evaluation may be helpful. If you&apos;re struggling, professional support is a sign of strength, not weakness.
      </div>
    </motion.div>
  );
}
