'use client';

/**
 * Decoded Report Viewer — Premium report rendering
 * 
 * Architecture: Show scored data INSTANTLY (ScoreDashboard), then
 * progressively load AI narrative sections via polling while user
 * explores their data visualizations.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ArrowUpRight, Loader2, Printer, MessageSquare, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BigFiveRadar from './BigFiveRadar';
import BigFiveContext from './BigFiveContext';
import AttachmentQuadrant from './AttachmentQuadrant';
import WellnessRadar from './WellnessRadar';
import ScoreDashboard from './ScoreDashboard';
import UpgradeModal from './UpgradeModal';
import VoiceSelector from './VoiceSelector';
import type { VoiceId } from './VoiceSelector';
import {
  SummaryTable, StrengthEdgeList, TraitCard,
  ProtectorCardComponent, FightStagesComponent,
  NeedToHearComponent, GrowthEdgeCardComponent,
} from './v2-components';
import { createClient } from '@/lib/supabase/client';
import ShareModal from '@/components/decoded/ShareModal';
import ArchetypeCard from './ArchetypeCard';
import DecodedNav from '../../DecodedNav';
import { getSectionConfigs, getUpgradeGateAfter, isSectionUnlocked } from '@/lib/decoded/report/sections/section-config';
import { REPORT_DISCLAIMER, evaluateSafetyFlags, CRISIS_RESOURCES } from '@/lib/decoded/report/safety';
import type { InstrumentScore } from '@/lib/decoded/scoring/types';
import type { ReportTier } from '@/lib/decoded/report/prompts/types';
import './report.css';
import './v2-components.css';
import './archetype-card.css';

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
  voice_profile?: { voiceId: string; modifiers?: string[] } | null;
  report_version?: number;
  created_at: string;
  updated_at: string;
}

interface ReportViewerProps {
  report: ReportData;
  scores: ScoreRow[];
  /** When viewing someone else's shared report, their name or email */
  sharedOwnerName?: string;
}

// ─────────────────────────────────────────────────────
// V2 Structured Section Renderer
// ─────────────────────────────────────────────────────

/**
 * Sprint 0.4: Build a deep link URL to open the coach with context about
 * a specific report section. The chat page reads these params and auto-sends
 * an opening message to the coach.
 */
function buildCoachDeepLink(section: string, topic?: string): string {
  const params = new URLSearchParams({
    context: 'report_deep_link',
    section,
  });
  if (topic) params.set('topic', topic);
  return `/dashboard/chat?${params.toString()}`;
}

/**
 * Sprint 0.4 (S0.4.11): Fire-and-forget tracking for coach deep link clicks.
 * Logs which report sections users click for CTA optimization.
 */
function trackDeepLinkClick(section: string, topic?: string) {
  const supabase = createClient();
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    supabase.from('report_events').insert({
      user_id: data.user.id,
      context_key: topic ?? section,
      section_id: section,
    }).then(() => {/* fire-and-forget */});
  });
}

interface V2SectionContentProps {
  sectionId: string;
  data: SectionData;
  scores: ScoreRow[];
  bigFivePercentiles: number[];
  attachmentAnxiety: number;
  attachmentAvoidance: number;
  attachmentStyle: string;
}

/**
 * Renders v2 structured sections.
 * v2 sections store typed JSON in content_markdown (parsed here),
 * unlike v1 which stores raw markdown.
 */
function V2SectionContent({
  sectionId, data, scores,
  bigFivePercentiles, attachmentAnxiety, attachmentAvoidance, attachmentStyle,
}: V2SectionContentProps) {
  // Parse structured content from v2 sections
  // v2 stores JSON in content_markdown instead of raw markdown
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(data.content_markdown);
  } catch {
    // Fallback: if content isn't valid JSON, render as markdown (hybrid mode)
    return (
      <div className="report-prose">
        <ReactMarkdown>{data.content_markdown}</ReactMarkdown>
      </div>
    );
  }

  const tldr = parsed.tldr as string | undefined;

  switch (sectionId) {
    case 'S1': {
      const summaryTable = (parsed.summary_table ?? []) as Array<{ dimension: string; summary: string }>;
      const topStrengths = (parsed.top_strengths ?? []) as Array<{ label: string; description: string }>;
      const growthEdges = (parsed.growth_edges ?? []) as Array<{ label: string; description: string }>;
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          <SummaryTable rows={summaryTable} />
          <div className="v2-section-columns" style={{ marginTop: '1.5rem' }}>
            <StrengthEdgeList items={topStrengths} variant="strength" />
            <StrengthEdgeList items={growthEdges} variant="edge" />
          </div>
        </div>
      );
    }

    case 'S2': {
      const narrative = parsed.narrative as string | undefined;
      const traitCards = (parsed.trait_cards ?? []) as Array<{
        trait_name: string; percentile: number; label: string;
        gifts: string[]; challenges: string[];
      }>;
      const pattern = parsed.signature_pattern as { name: string; description: string } | undefined;
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          <BigFiveRadar values={bigFivePercentiles} />
          {narrative && (
            <div className="report-prose" style={{ marginBottom: '1.5rem' }}>
              <ReactMarkdown>{narrative}</ReactMarkdown>
            </div>
          )}
          {traitCards.map((card) => (
            <TraitCard key={card.trait_name} card={card} />
          ))}
          {pattern && (
            <div className="v2-named-pattern">
              <h4 className="v2-named-pattern__name">{pattern.name}</h4>
              <p className="v2-named-pattern__desc">{pattern.description}</p>
            </div>
          )}
          <a
            href={buildCoachDeepLink('Personality Deep Dive', pattern?.name ?? 'your personality patterns')}
            className="coach-deep-link"
            style={{ marginTop: '1.25rem' }}
            onClick={() => trackDeepLinkClick('Personality Deep Dive', pattern?.name)}
          >
            Explore these patterns with your coach
            <ArrowUpRight size={14} className="coach-deep-link__icon" />
          </a>
        </div>
      );
    }

    case 'S3': {
      const protectors = (parsed.protectors ?? []) as Array<{
        name: string; role: string; cost: string; score?: number;
      }>;
      const vulnThemes = parsed.vulnerability_themes as string | undefined;
      const copingStyle = parsed.coping_style as string | undefined;
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          {protectors.map((p, i) => (
            <ProtectorCardComponent key={p.name} protector={p} index={i} />
          ))}
          {vulnThemes && (
            <div className="report-prose" style={{ marginTop: '1.25rem' }}>
              <ReactMarkdown>{vulnThemes}</ReactMarkdown>
            </div>
          )}
          {copingStyle && (
            <div className="report-prose">
              <ReactMarkdown>{copingStyle}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    }

    case 'S4': {
      const dimensions = (parsed.dimensions ?? []) as Array<{
        name: string; score_label: string; interpretation: string;
      }>;
      const triggers = (parsed.emotional_triggers ?? []) as Array<{ label: string; description: string }>;
      const selfComp = parsed.self_compassion as string | undefined;
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          <div className="v2-dimension-grid">
            {dimensions.map((dim) => (
              <div key={dim.name} className="v2-dimension-item">
                <div className="v2-dimension-item__header">
                  <span className="v2-dimension-item__name">{dim.name}</span>
                  <span className="v2-dimension-item__label">{dim.score_label}</span>
                </div>
                <p className="v2-dimension-item__interp">{dim.interpretation}</p>
              </div>
            ))}
          </div>
          {triggers.length > 0 && (
            <StrengthEdgeList items={triggers} variant="edge" />
          )}
          {selfComp && (
            <div className="report-prose" style={{ marginTop: '1rem' }}>
              <ReactMarkdown>{selfComp}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    }

    case 'S5': {
      const attachTldr = parsed.attachment_tldr as string | undefined;
      const howYouLove = parsed.how_you_love as string | undefined;
      const fightStages = (parsed.how_you_fight ?? []) as Array<{
        stage_number: number; title: string; description: string;
      }>;
      const needToHear = (parsed.what_you_need_to_hear ?? []) as Array<{
        phrase: string; why: string;
      }>;
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          <AttachmentQuadrant
            anxiety={attachmentAnxiety}
            avoidance={attachmentAvoidance}
            style={attachmentStyle}
          />
          {attachTldr && (
            <p className="v2-attachment-tldr">{attachTldr}</p>
          )}
          {howYouLove && (
            <>
              <h4 className="v2-subsection-title">How You Love</h4>
              <div className="report-prose">
                <ReactMarkdown>{howYouLove}</ReactMarkdown>
              </div>
            </>
          )}
          <FightStagesComponent stages={fightStages} />
          <NeedToHearComponent phrases={needToHear} />
        </div>
      );
    }

    case 'S6': {
      const topValues = (parsed.top_values ?? []) as Array<{ label: string; description: string }>;
      const bottomValues = (parsed.bottom_values ?? []) as Array<{ label: string; description: string }>;
      const motivationType = parsed.motivation_type as string | undefined;
      const careerEnvs = (parsed.career_environments ?? []) as string[];
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          <div className="v2-section-columns">
            <StrengthEdgeList items={topValues} variant="strength" />
            <StrengthEdgeList items={bottomValues} variant="edge" />
          </div>
          {motivationType && (
            <div className="report-prose" style={{ marginTop: '1.25rem' }}>
              <ReactMarkdown>{motivationType}</ReactMarkdown>
            </div>
          )}
          {careerEnvs.length > 0 && (
            <div className="v2-career-envs">
              <h4 className="v2-subsection-title">Environments That Fit Your Wiring</h4>
              <ul className="v2-career-envs__list">
                {careerEnvs.map((env, i) => (
                  <li key={i}>{env}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case 'S7': {
      const lifeSat = parsed.life_satisfaction as string | undefined;
      const flags = (parsed.screening_flags ?? []) as Array<{
        area: string; finding: string; recommendation: string;
      }>;
      const wellness = scores.find(s => s.instrument_id === 'wellness_check');
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          {wellness?.subscale_scores && (
            <WellnessRadar dimensions={wellness.subscale_scores as Record<string, number>} />
          )}
          {lifeSat && (
            <div className="report-prose">
              <ReactMarkdown>{lifeSat}</ReactMarkdown>
            </div>
          )}
          {flags.length > 0 && (
            <div className="v2-screening-flags">
              {flags.map((flag, i) => (
                <div key={i} className="v2-screening-flag">
                  <h5 className="v2-screening-flag__area">{flag.area}</h5>
                  <p className="v2-screening-flag__finding">{flag.finding}</p>
                  <p className="v2-screening-flag__rec">{flag.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'S8': {
      const edges = (parsed.growth_edges ?? []) as Array<{
        priority: number; title: string; why: string; actions: string[];
      }>;
      const challenge = parsed.thirty_day_challenge as string | undefined;
      return (
        <div className="v2-section-content">
          {tldr && <p className="v2-section-tldr">{tldr}</p>}
          {edges.map((edge) => (
            <div key={edge.priority}>
              <GrowthEdgeCardComponent edge={edge} />
              <a
                href={buildCoachDeepLink('Growth Roadmap', edge.title)}
                className="coach-deep-link"
                onClick={() => trackDeepLinkClick('Growth Roadmap', edge.title)}
              >
                Explore this with your coach
                <ArrowUpRight size={14} className="coach-deep-link__icon" />
              </a>
            </div>
          ))}
          {challenge && (
            <div className="v2-challenge">
              <h4 className="v2-challenge__title">Your 30-Day Challenge</h4>
              <p className="v2-challenge__text">{challenge}</p>
            </div>
          )}
        </div>
      );
    }

    default:
      // Unknown section, fall back to markdown
      return (
        <div className="report-prose">
          <ReactMarkdown>{data.content_markdown}</ReactMarkdown>
        </div>
      );
  }
}

export default function ReportViewer({ report: initialReport, scores, sharedOwnerName }: ReportViewerProps) {
  const [report, setReport] = useState<ReportData>(initialReport);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUnlocked, setShareUnlocked] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userTier, setUserTier] = useState<ReportTier>('free');

  // Fetch user data: display name, decoded_tier, and share unlock status
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Display name
        const name = user.user_metadata?.display_name
          || user.user_metadata?.full_name
          || user.email?.split('@')[0];
        if (name) setUserName(name);

        // Decoded tier from users table
        const { data: userData } = await supabase
          .from('users')
          .select('decoded_tier')
          .eq('id', user.id)
          .single();
        if (userData?.decoded_tier) {
          setUserTier(userData.decoded_tier as ReportTier);
        }

        // S0.5.3i: Check if user already earned the share unlock
        const { data: unlocks } = await supabase
          .from('share_unlocks')
          .select('id')
          .limit(1);
        if (unlocks && unlocks.length > 0) {
          setShareUnlocked(true);
        }
      }
    };
    fetchUserData();
  }, []);

  // S0.5.3j: Alpha upgrade callback — refresh tier state instantly
  const handleUpgradeComplete = useCallback((newTier: ReportTier) => {
    setUserTier(newTier);
    // Small delay to let user see the success state before closing
    setTimeout(() => setShowUpgradeModal(false), 1500);
  }, []);

  // Version-aware section config — v1 reports use RS01-RS12, v2 uses S1-S8
  const reportVersion = (report.report_version ?? 1) as 1 | 2;
  const SECTION_CONFIGS = getSectionConfigs(reportVersion);
  const UPGRADE_GATE_AFTER = getUpgradeGateAfter(reportVersion);

  // Voice system state
  const originalVoiceId = (report.voice_profile?.voiceId ?? 'connector') as VoiceId;
  const [activeVoiceId, setActiveVoiceId] = useState<VoiceId>(originalVoiceId);
  const [voiceSections, setVoiceSections] = useState<Record<string, SectionData> | null>(null);

  // Use voice-specific sections if a rewrite is active, otherwise original
  const displaySections = (activeVoiceId !== originalVoiceId && voiceSections)
    ? voiceSections as Record<string, SectionData>
    : (report.sections ?? {});

  const sections = displaySections;

  // Relationship report (Relatti's short battery): detected from the scored
  // instruments (no career measures) — stable across generation. Such reports
  // render only the sections that were generated (no empty Career/Wellbeing/
  // Emotions), and everything is unlocked (the relationship section is the core
  // value, and there's no paywall for the relationship product yet).
  const isRelationshipReport =
    reportVersion === 2 &&
    !scores.some((s) => s.instrument_id === 'riasec' || s.instrument_id === 'weims');
  // Relationship reports show only the relationship-relevant sections that were
  // generated. The explicit allow-list (not just "what's in sections") also
  // trims older Relatti reports that were generated before the generator skip,
  // so their empty Career/Wellbeing/Emotions sections never render.
  const RELATIONSHIP_SECTION_IDS = ['S1', 'S2', 'S3', 'S5', 'S8'];
  // The sections this report is EXPECTED to have (drives progress + the
  // auto-retrigger/poll). Relationship reports expect only the allow-list.
  const expectedSectionIds = isRelationshipReport
    ? RELATIONSHIP_SECTION_IDS
    : SECTION_CONFIGS.map((c) => c.id);
  const renderConfigs = SECTION_CONFIGS.filter((c) => expectedSectionIds.includes(c.id));

  const totalSections = expectedSectionIds.length;
  const generatedCount = expectedSectionIds.filter((id) => sections[id]).length;
  const isGenerating = generatedCount < totalSections;

  // Voice change handler
  const handleVoiceChange = useCallback(
    (voiceId: VoiceId, newSections: Record<string, unknown> | null) => {
      setActiveVoiceId(voiceId);
      setVoiceSections(newSections as Record<string, SectionData> | null);
    },
    [],
  );

  // Auto-retrigger generation if report has 0 sections (Edge Function call was missed or report was reset)
  const hasRetriggered = useRef(false);
  useEffect(() => {
    if (hasRetriggered.current) return;
    if (generatedCount > 0) return; // Already has content, no need to retrigger

    hasRetriggered.current = true;
    console.log('[ReportViewer] 0 sections detected — re-triggering Edge Function');

    const retrigger = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;

        const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        await fetch(`${projectUrl}/functions/v1/decoded-generate-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            assessment_id: report.assessment_id,
            report_id: report.id,
          }),
        });
      } catch (err) {
        console.error('[ReportViewer] Retrigger failed:', err);
      }
    };

    retrigger();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Navigation (includes theme toggle) */}
      <DecodedNav backHref="/dashboard" backLabel="Dashboard" />

      {/* Reading progress */}
      <div className="reading-progress" style={{ width: `${readingProgress}%` }} />

      <div className="report-container">
        {/* Shared report banner */}
        {sharedOwnerName && (
          <div className="shared-report-banner">
            <span className="shared-report-banner__icon">👤</span>
            You&apos;re viewing <strong>{sharedOwnerName}&apos;s</strong> Decoded Report
          </div>
        )}

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

          {/* Collectible archetype card — dynamically composited with user data */}
          {report.archetype_base && (() => {
            // Extract top 3 strengths from S1 section (if available)
            const s1 = displaySections?.['S1'];
            let topStrengths: string[] = [];
            if (s1) {
              try {
                const parsed = JSON.parse(s1.content_markdown);
                const strengths = (parsed.top_strengths ?? []) as Array<{ label: string }>;
                topStrengths = strengths.slice(0, 3).map(s => s.label);
              } catch { /* S1 not JSON — skip strengths */ }
            }

            const displayName = sharedOwnerName ?? userName;

            return (
              <ArchetypeCard
                archetype={report.archetype_base!}
                sublabel={report.archetype_sublabel}
                tagline={report.archetype_tagline}
                userName={displayName}
                strengths={topStrengths}
              />
            );
          })()}

          {/* S0.5.4: Share Your Type prompt — inline after archetype card */}
          {!sharedOwnerName && report.archetype_base && (
            <button
              className="share-type-prompt"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 size={15} className="share-type-prompt__icon" />
              Know someone who&apos;d recognize you from this? Share your type.
            </button>
          )}

        </motion.div>

        {/* Disclaimer */}
        <div className="report-disclaimer">
          <strong>This report is for personal insight and growth — not a clinical diagnosis.</strong>{' '}
          The assessments used are validated research instruments, but their application here is for self-understanding, not medical evaluation. If you&rsquo;re experiencing significant distress, please consult a licensed mental health professional.
        </div>

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
        />

        {/* Coach learning note — sets expectation that the coach grows beyond the static report */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          margin: '1.5rem 0',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(96, 99, 238, 0.06)',
          border: '1px solid rgba(96, 99, 238, 0.15)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}>
          <MessageSquare size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '0.125rem' }} />
          <span>
            <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>This report is a snapshot, not your ceiling.</strong>{' '}
            It reflects who you were when you took the assessment on {new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Your Mastery Coach, however, is a living model — it learns from every conversation and deepens its understanding of you over time.
          </span>
        </div>

        {/* ═══════ NARRATIVE TRANSITION ═══════ */}
        <div className="narrative-divider">
          <div className="narrative-divider__label">Part II</div>
          <div className="narrative-divider__title">
            {isGenerating ? 'Your Report is Generating' : 'Your Full Report'}
          </div>
          <div className="narrative-divider__subtitle">
            {isGenerating
              ? generatedCount === 0
                ? 'Analyzing your data and preparing your personalized narrative…'
                : `Writing your story… ${generatedCount} of ${totalSections} sections complete`
              : 'Insights based on your unique data'}
          </div>
          {isGenerating && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1.25rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 1.25rem',
                background: 'rgba(96, 99, 238, 0.08)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                color: 'var(--color-primary)',
                fontWeight: 500,
              }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                {generatedCount === 0
                  ? 'Preparing your report…'
                  : `Generating section ${generatedCount + 1} of ${totalSections}…`}
              </div>
              {generatedCount === 0 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'center',
                  maxWidth: '28rem',
                }}>
                  This usually takes 1–2 minutes. Your report will appear section by section as it&apos;s written.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════ VOICE SELECTOR — Below divider ═══════ */}
        {!isGenerating && generatedCount > 0 && (
          <VoiceSelector
            currentVoiceId={originalVoiceId}
            activeVoiceId={activeVoiceId}
            reportId={report.id}
            onVoiceChange={handleVoiceChange}
            canRewrite={true}
          />
        )}

        {/* ═══════ AI NARRATIVE SECTIONS ═══════ */}
        {renderConfigs.map((config, index) => {
          const section = sections[config.id];
          const isUnlocked = isRelationshipReport
            || isSectionUnlocked(config.minTier, userTier)
            || (config.id === 'S5' && shareUnlocked);
          const showUpgradeGate = !isRelationshipReport && config.id === UPGRADE_GATE_AFTER;

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
                        {/* ═══ V2 STRUCTURED RENDERING ═══ */}
                        {reportVersion === 2 ? (
                          <V2SectionContent sectionId={config.id} data={section} scores={scores}
                            bigFivePercentiles={bigFivePercentiles}
                            attachmentAnxiety={attachmentAnxiety}
                            attachmentAvoidance={attachmentAvoidance}
                            attachmentStyle={attachmentStyle}
                          />
                        ) : (
                          /* ═══ V1 MARKDOWN RENDERING (backward compat) ═══ */
                          <>
                            {config.id === 'RS04' && <BigFiveContext />}
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
                            <div className="report-prose">
                              <ReactMarkdown>{section.content_markdown}</ReactMarkdown>
                            </div>
                          </>
                        )}

                        {/* Coach question callout — Sprint 0.4: now links to coach */}
                        {section.coach_question && (
                          <a
                            href={buildCoachDeepLink(config.title, section.coach_question)}
                            className="coach-question coach-question--clickable"
                            style={{ display: 'block', textDecoration: 'none' }}
                            onClick={() => trackDeepLinkClick(config.title, section.coach_question)}
                          >
                            <div className="coach-question__label">Your Coach Question</div>
                            <div className="coach-question__text">&ldquo;{section.coach_question}&rdquo;</div>
                            <span className="coach-deep-link" style={{ marginTop: '0.5rem' }}>
                              Discuss with your coach
                              <ArrowUpRight size={14} className="coach-deep-link__icon" />
                            </span>
                          </a>
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
                        {config.id === 'S5' ? (
                          /* S0.5.3i: Share-to-unlock gate for Relationships */
                          <div className="locked-section__overlay">
                            <div className="locked-section__badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                              FREE WITH SHARE
                            </div>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--text-heading)', fontWeight: 600, marginBottom: '0.25rem' }}>
                              Unlock Your Relationships
                            </p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-body)', maxWidth: '22rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                              Share Decoded with a friend and unlock this section — see how your attachment style shapes love, conflict, and connection.
                            </p>
                            <button
                              onClick={() => setShowShareModal(true)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                background: 'linear-gradient(135deg, #34d399, #10b981)',
                                color: 'white', padding: '0.75rem 1.75rem',
                                borderRadius: 'var(--radius-lg)', border: 'none',
                                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                              }}
                            >
                              Share to Unlock <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setShowUpgradeModal(true)}
                              style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)',
                                fontSize: '0.75rem', marginTop: '0.75rem', cursor: 'pointer',
                                textDecoration: 'underline', textUnderlineOffset: '2px',
                              }}
                            >
                              or upgrade to Insight
                            </button>
                          </div>
                        ) : (
                          <div className="locked-section__overlay">
                            <div className="locked-section__badge">
                              {config.minTier.toUpperCase()} TIER
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', maxWidth: '24rem', lineHeight: 1.6 }}>
                              {config.lockedTeaser}
                            </p>
                          </div>
                        )}
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

              {/* Upgrade gate */}
              {showUpgradeGate && !isSectionUnlocked('insight', userTier) && (
                <div className="upgrade-gate">
                  <div className="upgrade-gate__title">Keep Reading?</div>
                  <p className="upgrade-gate__subtitle">
                    You&apos;ve seen the foundation. The next sections go deeper into your relationships, career fit, wellbeing, and a personalized growth roadmap.
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

      {/* S0.5.4: Share Your Type — footer card */}
      {!isGenerating && generatedCount > 0 && !sharedOwnerName && report.archetype_base && (
        <div className="share-type-footer no-print">
          <div className="share-type-footer__content">
            <div className="share-type-footer__label">YOUR TYPE</div>
            <h3 className="share-type-footer__archetype">
              The {report.archetype_base}
              {report.archetype_sublabel && (
                <span className="share-type-footer__sublabel"> — {report.archetype_sublabel}</span>
              )}
            </h3>
            <p className="share-type-footer__text">
              Share your Decoded type with friends — see who resonates, and unlock your compatibility report together.
            </p>
            <button
              className="share-type-footer__cta"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 size={16} /> Share Your Type
            </button>
          </div>
        </div>
      )}

      {/* Meet Your Coach CTA — conversion funnel from assessment to coaching */}
      {!isGenerating && generatedCount > 0 && (
        <div className="coach-cta no-print">
          <div className="coach-cta__content">
            <div className="coach-cta__icon">
              <MessageSquare size={28} strokeWidth={1.5} />
            </div>
            <h3 className="coach-cta__title">Ready to put this into action?</h3>
            <p className="coach-cta__text">
              Your AI coach has already read your full assessment. No awkward introductions — 
              they know your personality, patterns, and priorities from day one.
            </p>
            <a
              href={buildCoachDeepLink('Your Full Report', 'my assessment results and what they mean for me')}
              className="coach-cta__button"
              onClick={() => trackDeepLinkClick('Your Full Report', 'meet-your-coach')}
            >
              Meet Your Coach <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={userTier}
        onUpgradeComplete={handleUpgradeComplete}
      />

      {/* S0.5.3i: Share-to-unlock modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onUnlock={() => {
          setShareUnlocked(true);
          setShowShareModal(false);
        }}
        shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/decoded`}
        archetype={report.archetype_base}
      />
    </>
  );
}
