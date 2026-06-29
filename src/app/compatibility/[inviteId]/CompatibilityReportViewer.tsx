'use client';

/**
 * CompatibilityReportViewer — Per-user personalized compatibility report
 * 
 * Each user sees their own version written in their Decoded narrative voice.
 * Advice is reframed as "Advice for you" / "Advice for {otherName}".
 * When full report access is shared, shows a link to view the other person's
 * full Decoded report.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Heart, Users, Briefcase, Check, Lock, X,
  Send, Loader2, Eye,
  Handshake, Flame, Zap, ShieldAlert,
  MessageSquare, ArrowUpRight, FileText,
} from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';
import './compatibility.css';

interface CompatDimension {
  dimension: string;
  score: number;
  insight: string;
}

interface ContextInsights {
  label?: string;
  chemistry: string;
  friction: string;
  superpower: string;
  watch_out: string;
  // Per-user format (new)
  advice_for_reader?: string;
  advice_for_other?: string;
  // Legacy shared format (backward compat)
  advice_for_a?: string;
  advice_for_b?: string;
}

/** Long-form couples analysis (Relatti) — generated after the cards + chart. */
interface CouplesReportData {
  title?: string;
  intro?: string;
  dynamic?: string;
  empathy?: string;
  strengths?: string;
  challenges?: string;
  loving_well?: string;
  repair?: string;
  closing?: string;
}

interface CompatReport {
  headline: string;
  couples_report?: CouplesReportData;
  intimate?: ContextInsights;
  family_friendship?: ContextInsights;
  work?: ContextInsights;
  // Legacy flat format
  chemistry?: string;
  friction?: string;
  superpower?: string;
  watch_out?: string;
  advice_for_a?: string;
  advice_for_b?: string;
  advice_for_reader?: string;
  advice_for_other?: string;
  compatibility_dimensions: CompatDimension[];
}

interface Props {
  report: CompatReport;
  inviterName: string;
  recipientName: string;
  shareWithHuman: string;
  isInviter: boolean;
  inviteId: string;
  otherPersonName: string;
  /** The level the upgrade was requested at (e.g. 'full') */
  upgradeRequestedLevel: string | null;
  /** Who requested the upgrade — user ID */
  upgradeRequestedBy: string | null;
  /** Current user's ID */
  userId: string;
  /** The other person's Decoded report ID — only set when share_with_human === 'full' */
  otherReportId?: string | null;
}

type TabId = 'intimate' | 'family_friendship' | 'work';

const TABS: Array<{ id: TabId; label: string; icon: typeof Heart }> = [
  { id: 'intimate', label: 'Intimate', icon: Heart },
  { id: 'family_friendship', label: 'Family & Friends', icon: Users },
  { id: 'work', label: 'Work', icon: Briefcase },
];

// What each share level includes
const SHARE_ITEMS = [
  { key: 'compatibility', label: 'Compatibility Summary', minLevel: 'compatibility' },
  { key: 'type', label: 'Personality Archetype', minLevel: 'type_compatibility' },
  { key: 'full', label: 'Full Report (All 13 Dimensions)', minLevel: 'full' },
] as const;

function isShared(itemMinLevel: string, currentLevel: string): boolean {
  const order = ['none', 'compatibility', 'type_compatibility', 'full'];
  return order.indexOf(currentLevel) >= order.indexOf(itemMinLevel);
}

/**
 * Build a deep link URL to open the coach with compatibility context.
 */
function buildCoachDeepLink(otherName: string, inviteId: string): string {
  const params = new URLSearchParams({
    context: 'compatibility',
    topic: `my relationship with ${otherName}`,
    inviteId,
  });
  return `/dashboard/chat?${params.toString()}`;
}

export default function CompatibilityReportViewer({
  report, inviterName, recipientName,
  shareWithHuman, isInviter, inviteId, otherPersonName,
  upgradeRequestedLevel, upgradeRequestedBy, userId,
  otherReportId,
}: Props) {
  const brand = useBrand();
  const isRelatti = brand.id === 'relatti';
  const isMultiContext = !!report.intimate || !!report.family_friendship || !!report.work;
  const [activeTab, setActiveTab] = useState<TabId>('intimate');
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const [acceptingUpgrade, setAcceptingUpgrade] = useState(false);

  // Upgrade request states — 3 clean states:
  //   1. theyRequestedUpgrade → show Accept / Deny buttons to me
  //   2. iRequestedUpgrade → show "Requested" (waiting)
  //   3. neither → show "Request Access" button
  // Note: denial clears both fields to null, so there is no "denied" state in the data.
  const iRequestedUpgrade = upgradeRequestedLevel && upgradeRequestedBy === userId;
  const theyRequestedUpgrade = upgradeRequestedLevel && upgradeRequestedBy && upgradeRequestedBy !== userId;
  const [localIRequested, setLocalIRequested] = useState(!!iRequestedUpgrade);
  const [upgradeAccepted, setUpgradeAccepted] = useState(false);
  const [unsharing, setUnsharing] = useState(false);
  const router = useRouter();

  const context: ContextInsights | null = isMultiContext
    ? (report[activeTab] ?? null)
    : {
        chemistry: report.chemistry || '',
        friction: report.friction || '',
        superpower: report.superpower || '',
        watch_out: report.watch_out || '',
        advice_for_reader: report.advice_for_reader || report.advice_for_a || '',
        advice_for_other: report.advice_for_other || report.advice_for_b || '',
      };

  // Show the sharing card to both users so they see the mutual level
  const showSharingCard = shareWithHuman !== 'none';

  // Resolve advice labels: per-user reports use advice_for_reader/advice_for_other;
  // legacy shared reports use advice_for_a/advice_for_b
  function getAdviceForReader(ctx: ContextInsights): string {
    return ctx.advice_for_reader || (isInviter ? ctx.advice_for_a || '' : ctx.advice_for_b || '');
  }
  function getAdviceForOther(ctx: ContextInsights): string {
    return ctx.advice_for_other || (isInviter ? ctx.advice_for_b || '' : ctx.advice_for_a || '');
  }

  async function handleRequestUpgrade() {
    setRequestingUpgrade(true);
    try {
      const res = await fetch('/api/decoded/compatibility-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, level: 'full' }),
      });
      if (res.ok) {
        setLocalIRequested(true);
      }
    } finally {
      setRequestingUpgrade(false);
    }
  }

  async function handleAcceptUpgrade() {
    setAcceptingUpgrade(true);
    try {
      const res = await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareLevel: 'full' }),
      });
      if (res.ok) {
        setUpgradeAccepted(true);
        router.refresh();
      }
    } finally {
      setAcceptingUpgrade(false);
    }
  }

  async function handleDenyUpgrade() {
    try {
      await fetch('/api/decoded/deny-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      router.refresh();
    } catch {
      // silent
    }
  }

  async function handleUnshare() {
    setUnsharing(true);
    try {
      await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareLevel: 'none' }),
      });
      router.push('/dashboard/compatibility');
    } finally {
      setUnsharing(false);
    }
  }

  return (
    <div className="compat-container">
      {/* Back link */}
      <Link href="/dashboard/compatibility" className="compat-back">
        <ArrowLeft size={16} />
        Back to Compatibility
      </Link>

      {/* Header */}
      <motion.div
        className="compat-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="compat-header__label">{isRelatti ? 'Your Connection' : 'Compatibility Report'}</div>
        <h1 className="compat-header__headline">{report.headline}</h1>
        <p className="compat-header__names">
          <span>{inviterName}</span> × <span>{recipientName}</span>
        </p>
      </motion.div>

      {/* ═══ Sharing Transparency Card ═══ */}
      {showSharingCard && (
        <motion.div
          className="compat-sharing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="compat-sharing__header">
            <Eye className="compat-sharing__icon" />
            <span>Mutual sharing level</span>
          </div>

          <div className="compat-sharing__items">
            {SHARE_ITEMS.map((item) => {
              const shared = isShared(item.minLevel, shareWithHuman);
              const isFullItem = item.key === 'full';
              return (
                <div
                  key={item.key}
                  className={`compat-sharing__item ${shared ? 'compat-sharing__item--shared' : 'compat-sharing__item--locked'}`}
                >
                  {shared ? (
                    <Check className="compat-sharing__item-icon compat-sharing__item-icon--check" />
                  ) : (
                    <Lock className="compat-sharing__item-icon compat-sharing__item-icon--lock" />
                  )}
                  <span className="compat-sharing__item-label">{item.label}</span>

                  {/* Full report upgrade — 3 clean states */}
                  {isFullItem && !shared && (
                    <>
                      {upgradeAccepted ? (
                        /* Just accepted — refreshing */
                        <span className="compat-sharing__requested">
                          <Check className="h-3 w-3" /> Accepted
                        </span>
                      ) : theyRequestedUpgrade && !localIRequested ? (
                        /* They requested full access — show Accept / Deny */
                        <div className="compat-sharing__denied-group">
                          <button
                            onClick={handleAcceptUpgrade}
                            disabled={acceptingUpgrade}
                            className="compat-sharing__request-btn"
                          >
                            {acceptingUpgrade ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Accepting...</>
                            ) : (
                              <><Check className="h-3 w-3" /> Accept</>
                            )}
                          </button>
                          <button
                            onClick={handleDenyUpgrade}
                            className="compat-sharing__denied-badge"
                            style={{ cursor: 'pointer' }}
                          >
                            <X className="h-3 w-3" /> Deny
                          </button>
                        </div>
                      ) : localIRequested || iRequestedUpgrade ? (
                        /* I requested — waiting for their response */
                        <span className="compat-sharing__requested">
                          <Check className="h-3 w-3" /> Requested
                        </span>
                      ) : (
                        /* No request yet — show Request Access button */
                        <button
                          onClick={handleRequestUpgrade}
                          disabled={requestingUpgrade}
                          className="compat-sharing__request-btn"
                        >
                          {requestingUpgrade ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Requesting...</>
                          ) : (
                            <><Send className="h-3 w-3" /> Request Access</>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* View Full Report link — only when full access is shared */}
          {shareWithHuman === 'full' && otherReportId && (
            <Link
              href={`/report/${otherReportId}?shared=true`}
              className="compat-sharing__full-report-link"
            >
              <FileText className="h-4 w-4" />
              View {otherPersonName}&apos;s {isRelatti ? 'relationship profile' : 'Full Decoded Report'}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}

          {/* Unshare button */}
          <button
            onClick={handleUnshare}
            disabled={unsharing}
            className="compat-sharing__unshare-btn"
          >
            {unsharing ? 'Unsharing...' : 'Unshare this connection'}
          </button>
        </motion.div>
      )}

      {/* Tabs — hidden for Relatti (a couples product centers the intimate lens) */}
      {isMultiContext && !isRelatti && (
        <motion.div
          className="compat-tabs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`compat-tab ${activeTab === tab.id ? 'compat-tab--active' : ''}`}
            >
              <tab.icon className="compat-tab__icon" />
              {tab.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Context-specific content */}
      {context && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="compat-grid">
              <div className="compat-card">
                <div className="compat-card__icon compat-card__icon--chemistry">
                  <Handshake className="compat-card__lucide" />
                </div>
                <div className="compat-card__title">What Clicks</div>
                <p className="compat-card__body">{context.chemistry}</p>
              </div>

              <div className="compat-card">
                <div className="compat-card__icon compat-card__icon--friction">
                  <Flame className="compat-card__lucide" />
                </div>
                <div className="compat-card__title">Where You&apos;ll Clash</div>
                <p className="compat-card__body">{context.friction}</p>
              </div>

              <div className="compat-card">
                <div className="compat-card__icon compat-card__icon--superpower">
                  <Zap className="compat-card__lucide" />
                </div>
                <div className="compat-card__title">Your Superpower Together</div>
                <p className="compat-card__body">{context.superpower}</p>
              </div>

              <div className="compat-card">
                <div className="compat-card__icon compat-card__icon--watchout">
                  <ShieldAlert className="compat-card__lucide" />
                </div>
                <div className="compat-card__title">Watch Out For</div>
                <p className="compat-card__body">{context.watch_out}</p>
              </div>
            </div>

            {/* Personalized advice — "Advice for you" / "Advice for {Name}" */}
            <div className="compat-advice">
              <div className="compat-advice__card">
                <div className="compat-advice__for">Advice for you</div>
                <p className="compat-advice__text">{getAdviceForReader(context)}</p>
              </div>
              <div className="compat-advice__card">
                <div className="compat-advice__for">Advice for {otherPersonName}</div>
                <p className="compat-advice__text">{getAdviceForOther(context)}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Dimensions */}
      {report.compatibility_dimensions?.length > 0 && (
        <motion.div
          className="compat-dimensions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="compat-dimensions__title">Compatibility Dimensions</h2>
          {report.compatibility_dimensions.map((dim, i) => (
            <motion.div
              key={dim.dimension}
              className="compat-dimension"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
            >
              <div className="compat-dimension__label">{dim.dimension}</div>
              <div className="compat-dimension__bar-container">
                <div className="compat-dimension__bar-bg">
                  <motion.div
                    className="compat-dimension__bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${dim.score * 10}%` }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                  />
                </div>
                <div className="compat-dimension__score">{dim.score}/10</div>
              </div>
              {dim.insight && (
                <p className="compat-dimension__insight">{dim.insight}</p>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ═══ Couples Report — the long-form, science-grounded analysis ═══ */}
      {report.couples_report && (
        <CouplesReport data={report.couples_report} otherName={otherPersonName} />
      )}

      {/* ═══ Coach Deep Link CTA ═══ */}
      <motion.div
        className="compat-coach-cta"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Link
          href={buildCoachDeepLink(otherPersonName, inviteId)}
          className="compat-coach-cta__link"
        >
          <MessageSquare className="h-5 w-5" />
          <div>
            <div className="compat-coach-cta__title">Discuss this relationship with your coach</div>
            <div className="compat-coach-cta__subtitle">
              Ask questions about your compatibility with {otherPersonName}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 compat-coach-cta__arrow" />
        </Link>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Couples Report — the long-form analysis (Relatti). Fixed, on-brand section
 * headings carry the structure; the model fills the prose. Paragraphs split on
 * blank lines. Themed entirely with semantic tokens (light + dark safe).
 * ─────────────────────────────────────────────────────────────────────────── */

function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

function CouplesSection({ heading, text }: { heading: string; text?: string }) {
  if (!text || !text.trim()) return null;
  return (
    <div className="couples-report__section">
      <h3 className="couples-report__heading">{heading}</h3>
      <Paragraphs text={text} className="couples-report__body" />
    </div>
  );
}

function CouplesReport({ data, otherName }: { data: CouplesReportData; otherName: string }) {
  return (
    <motion.section
      className="couples-report"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="couples-report__eyebrow">Your couples report</div>
      {data.title && <h2 className="couples-report__title">{data.title}</h2>}
      {data.intro && <Paragraphs text={data.intro} className="couples-report__lead" />}

      <CouplesSection heading="The dance between you" text={data.dynamic} />
      <CouplesSection heading={`Understanding ${otherName}`} text={data.empathy} />
      <CouplesSection heading="What you build together" text={data.strengths} />
      <CouplesSection heading="Where it gets hard" text={data.challenges} />
      <CouplesSection heading="How to love each other well" text={data.loving_well} />
      <CouplesSection heading="Finding your way back" text={data.repair} />

      {data.closing && (
        <div className="couples-report__closing">
          <Paragraphs text={data.closing} className="couples-report__closing-text" />
        </div>
      )}
    </motion.section>
  );
}
