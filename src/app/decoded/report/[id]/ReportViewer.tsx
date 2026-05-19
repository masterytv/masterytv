'use client';

/**
 * Decoded Report Viewer — Premium report rendering
 * 
 * Architecture: Show scored data INSTANTLY (ScoreDashboard), then
 * progressively load AI narrative sections via polling while user
 * explores their data visualizations.
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BigFiveRadar from './BigFiveRadar';
import AttachmentQuadrant from './AttachmentQuadrant';
import WellnessRadar from './WellnessRadar';
import ScoreDashboard from './ScoreDashboard';
import UpgradeModal from './UpgradeModal';
import DecodedNav from '../../DecodedNav';
import { SECTION_CONFIGS, UPGRADE_GATE_AFTER, isSectionUnlocked } from '@/lib/decoded/report/sections/section-config';
import { REPORT_DISCLAIMER, evaluateSafetyFlags, CRISIS_RESOURCES } from '@/lib/decoded/report/safety';
import type { InstrumentScore } from '@/lib/decoded/scoring/types';
import type { ReportTier } from '@/lib/decoded/report/prompts/types';
import { createClient } from '@/lib/supabase/client';
import './report.css';

interface ScoreRow {
  instrument_id: string;
  total_score?: number;
  subscale_scores?: Record<string, number>;
  percentile_scores?: Record<string, number>;
  interpretation?: Record<string, unknown>;
}

interface SectionData {
  title: string;
  content_markdown: string;
  coach_question: string;
  data_viz?: unknown;
  word_count: number;
  min_tier: string;
  generated_at: string;
}

interface ReportData {
  id: string;
  assessment_id: string;
  sections: Record<string, SectionData> | null;
  archetype_base?: string;
  archetype_sublabel?: string;
  archetype_tagline?: string;
  decoded_score?: number;
  created_at: string;
  updated_at: string;
}

interface ReportViewerProps {
  report: ReportData;
  scores: ScoreRow[];
}

export default function ReportViewer({ report: initialReport, scores }: ReportViewerProps) {
  const [report, setReport] = useState<ReportData>(initialReport);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const userTier: ReportTier = 'free'; // TODO: Connect to user subscription

  const sections = report.sections ?? {};
  const totalSections = SECTION_CONFIGS.length;
  const generatedCount = Object.keys(sections).length;
  const isGenerating = generatedCount < totalSections;

  // Poll for new sections while generation is in progress
  const pollForUpdates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('assessment_reports')
      .select('sections, archetype_base, archetype_sublabel, archetype_tagline, decoded_score, updated_at')
      .eq('id', report.id)
      .single();
    
    if (data) {
      setReport(prev => ({
        ...prev,
        sections: data.sections ?? prev.sections,
        archetype_base: data.archetype_base ?? prev.archetype_base,
        archetype_sublabel: data.archetype_sublabel ?? prev.archetype_sublabel,
        archetype_tagline: data.archetype_tagline ?? prev.archetype_tagline,
        decoded_score: data.decoded_score ?? prev.decoded_score,
        updated_at: data.updated_at ?? prev.updated_at,
      }));
    }
  }, [report.id]);

  useEffect(() => {
    if (!isGenerating) return;
    
    const interval = setInterval(pollForUpdates, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [isGenerating, pollForUpdates]);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadingProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Extract Big Five percentiles for inline section charts
  const ipip = scores.find((s) => s.instrument_id === 'ipip50');
  const bigFivePercentiles = ipip?.percentile_scores
    ? [
        ipip.percentile_scores.openness ?? 50,
        ipip.percentile_scores.conscientiousness ?? 50,
        ipip.percentile_scores.extraversion ?? 50,
        ipip.percentile_scores.agreeableness ?? 50,
        ipip.percentile_scores.neuroticism ?? 50,
      ]
    : [50, 50, 50, 50, 50];

  // Attachment data
  const ecr = scores.find((s) => s.instrument_id === 'ecr_r_short');
  const attachmentAnxiety = (ecr?.subscale_scores?.anxiety as number) ?? 3.5;
  const attachmentAvoidance = (ecr?.subscale_scores?.avoidance as number) ?? 3.5;
  const attachmentStyle = (ecr?.interpretation?.attachmentStyle as string) ?? 'secure';

  return (
    <>
      {/* Navigation */}
      <DecodedNav backHref="/decoded/assess" backLabel="Dashboard" />

      {/* Reading progress */}
      <div className="reading-progress" style={{ width: `${readingProgress}%` }} />

      <div className="report-container">
        {/* Report header */}
        <motion.div
          className="report-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {report.archetype_base && (
            <div className="report-header__archetype">
              The {report.archetype_base}
            </div>
          )}
          <h1 className="report-header__sublabel">
            {report.archetype_sublabel
              ? `${report.archetype_base} — ${report.archetype_sublabel}`
              : 'Your Decoded Report'}
          </h1>
          {report.archetype_tagline && (
            <p className="report-header__tagline">{report.archetype_tagline}</p>
          )}
          {report.decoded_score !== undefined && report.decoded_score !== null && (
            <div style={{ marginTop: '1.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-label)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                Decoded Score
              </span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                {report.decoded_score}
              </div>
            </div>
          )}
        </motion.div>

        {/* Disclaimer */}
        <div className="report-disclaimer">{REPORT_DISCLAIMER}</div>

        {/* Crisis resources — safety layer */}
        {(() => {
          // Map score rows to InstrumentScore format for safety evaluation
          const instrumentScores: InstrumentScore[] = scores.map(s => ({
            instrumentId: s.instrument_id,
            totalScore: s.total_score,
            subscaleScores: s.subscale_scores ?? {},
            percentileScores: s.percentile_scores ?? {},
            interpretation: (s.interpretation as Record<string, string | boolean | number>) ?? {},
          }));
          const safety = evaluateSafetyFlags(instrumentScores);
          if (!safety.showCrisisResources) return null;
          return (
            <div className="crisis-resources">
              <div className="crisis-resources__header">
                <span className="crisis-resources__icon">💛</span>
                <strong>You&apos;re not alone.</strong> Some of your responses suggest you may be going through a difficult time. Help is available.
              </div>
              <div className="crisis-resources__list">
                {CRISIS_RESOURCES.map((r) => (
                  <div key={r.name} className="crisis-resources__item">
                    <span className="crisis-resources__name">{r.name}</span>
                    <span className="crisis-resources__contact">
                      {r.contact.startsWith('http') ? (
                        <a href={r.contact} target="_blank" rel="noopener noreferrer">{r.contact}</a>
                      ) : r.contact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══════ SCORE DASHBOARD — Shows instantly ═══════ */}
        <ScoreDashboard
          scores={scores}
          archetypeBase={report.archetype_base}
          archetypeSublabel={report.archetype_sublabel}
          archetypeTagline={report.archetype_tagline}
          decodedScore={report.decoded_score}
        />

        {/* ═══════ NARRATIVE TRANSITION ═══════ */}
        <div className="narrative-divider">
          <div className="narrative-divider__label">Part II</div>
          <div className="narrative-divider__title">Your Personalized Narrative</div>
          <div className="narrative-divider__subtitle">
            {isGenerating
              ? `Writing your story… ${generatedCount} of ${totalSections} sections complete`
              : 'AI-generated insights based on your unique data'}
          </div>
          {isGenerating && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(96, 99, 238, 0.06)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-label)' }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--color-primary)' }} />
                Generating ({generatedCount}/{totalSections})
              </div>
            </div>
          )}
        </div>

        {/* ═══════ AI NARRATIVE SECTIONS ═══════ */}
        {SECTION_CONFIGS.map((config, index) => {
          const section = sections[config.id];
          const isUnlocked = isSectionUnlocked(config.minTier, userTier);
          const showUpgradeGate = config.id === UPGRADE_GATE_AFTER;

          return (
            <div key={config.id}>
              <AnimatePresence mode="wait">
                {section ? (
                  <motion.div
                    className={`report-section ${!isUnlocked ? 'locked-section' : ''}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    {/* Section header */}
                    <div className="report-section__header">
                      <div className="report-section__number">{config.id}</div>
                      <h2 className="report-section__title">
                        {!isUnlocked && <Lock className="inline h-5 w-5 mr-2 opacity-50" />}
                        {config.title}
                      </h2>
                      <p className="report-section__subtitle">{config.subtitle}</p>
                    </div>

                    {isUnlocked ? (
                      <>
                        {/* Data visualization for certain sections */}
                        {(config.id === 'RS03' || config.id === 'RS04') && (
                          <BigFiveRadar values={bigFivePercentiles} />
                        )}
                        {config.id === 'RS06' && (
                          <AttachmentQuadrant
                            anxiety={attachmentAnxiety}
                            avoidance={attachmentAvoidance}
                            style={attachmentStyle}
                          />
                        )}
                        {config.id === 'RS11' && (() => {
                          const wellness = scores.find(s => s.instrument_id === 'wellness_check');
                          return wellness?.subscale_scores ? (
                            <WellnessRadar dimensions={wellness.subscale_scores as Record<string, number>} />
                          ) : null;
                        })()}

                        {/* Rendered markdown content */}
                        <div className="report-prose">
                          <ReactMarkdown>{section.content_markdown}</ReactMarkdown>
                        </div>

                        {/* Coach question callout */}
                        {section.coach_question && (
                          <div className="coach-question">
                            <div className="coach-question__label">Your Coach Question</div>
                            <div className="coach-question__text">&ldquo;{section.coach_question}&rdquo;</div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Locked section with blur */
                      <>
                        <div className="locked-section__content">
                          <div className="report-prose">
                            <ReactMarkdown>{section.content_markdown.substring(0, 200) + '…'}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="locked-section__overlay">
                          <div className="locked-section__badge">
                            {config.minTier.toUpperCase()} TIER
                          </div>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', maxWidth: '24rem', lineHeight: 1.6 }}>
                            {config.lockedTeaser}
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                ) : (
                  /* Skeleton for sections not yet generated */
                  <div className="report-section report-skeleton">
                    <div className="report-section__header">
                      <div className="report-section__number">{config.id}</div>
                      <h2 className="report-section__title">{config.title}</h2>
                      <p className="report-section__subtitle">{config.subtitle}</p>
                    </div>
                    <div className="report-skeleton__line report-skeleton__line--full" />
                    <div className="report-skeleton__line report-skeleton__line--medium" />
                    <div className="report-skeleton__line report-skeleton__line--full" />
                    <div className="report-skeleton__line report-skeleton__line--short" />
                  </div>
                )}
              </AnimatePresence>

              {/* Upgrade gate after RS07 */}
              {showUpgradeGate && !isSectionUnlocked('insight', userTier) && (
                <div className="upgrade-gate">
                  <div className="upgrade-gate__title">Keep Reading?</div>
                  <p className="upgrade-gate__subtitle">
                    You&apos;ve seen the foundation. The next 5 sections go deeper — emotional regulation, motivation mapping, relationship dynamics, wellness analysis, and your personalized growth roadmap.
                  </p>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      background: 'linear-gradient(135deg, #a3a6ff, #6063ee)',
                      color: 'white', padding: '0.75rem 2rem',
                      borderRadius: 'var(--radius-lg)', border: 'none',
                      fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
                    }}
                  >
                    Unlock Full Report <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Print / Save as PDF — only when generation is complete */}
      {!isGenerating && generatedCount > 0 && (
        <button
          className="report-print-btn"
          onClick={() => window.print()}
          aria-label="Print or save as PDF"
        >
          <Printer size={16} />
          Save as PDF
        </button>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={userTier}
      />
    </>
  );
}
