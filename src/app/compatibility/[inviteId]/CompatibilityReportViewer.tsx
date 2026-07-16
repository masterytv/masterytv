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
  MessageSquare, ArrowUpRight, FileText, RefreshCw,
} from 'lucide-react';
import { useBrand, resolveBrandClient } from '@/hooks/useBrand';
import type { DyadNeedToHear } from '@/lib/relatti/partner-need-to-hear';
import { createClient } from '@/lib/supabase/client';
import './compatibility.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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
  dynamic_example?: string;
  empathy?: string;
  strengths?: string;
  challenges?: string;
  challenges_example?: string;
  loving_well?: string;
  loving_well_example?: string;
  repair?: string;
  repair_example?: string;
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
  /** Staleness: a partner retook their assessment after this report was written. */
  isStale?: boolean;
  /** The viewer is the one who retook (drives the banner copy). */
  viewerRetook?: boolean;
  /** The other partner is the one who retook. */
  partnerRetook?: boolean;
  /**
   * "What each of you needs to hear" — both partners' phrases, resolved and
   * consent-gated server-side. Null when there's no consented dyad or either
   * partner's profile lacks them; the block then simply doesn't render.
   */
  needToHear?: DyadNeedToHear | null;
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
  otherReportId, isStale, viewerRetook, partnerRetook,
  needToHear,
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
  const [regenerating, setRegenerating] = useState(false);
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

  // Re-write the compatibility report from both partners' latest results. Calls
  // the edge fn directly with force_regenerate (same pattern as GenerateReport),
  // then refreshes the server component so the fresh report + cleared staleness
  // render. Kept manual (banner button) so a retake never silently spends tokens.
  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        setRegenerating(false);
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/decoded-compatibility-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          invite_id: inviteId,
          force_regenerate: true,
          program: resolveBrandClient().programSlug,
        }),
      });
      if (res.ok) {
        // Leaves `regenerating` true until the refresh swaps in the fresh,
        // no-longer-stale server render (which unmounts this banner).
        router.refresh();
      } else {
        setRegenerating(false);
      }
    } catch {
      setRegenerating(false);
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

      {/* ═══ Stale banner — a partner retook after this report was written ═══ */}
      {isStale && (
        <motion.div
          className="compat-stale"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <RefreshCw className="compat-stale__icon h-4 w-4" />
          <div className="compat-stale__body">
            <div className="compat-stale__title">
              {viewerRetook && partnerRetook
                ? 'You both retook your assessment'
                : viewerRetook
                  ? 'You retook your assessment'
                  : `${otherPersonName} retook their assessment`}
            </div>
            <p className="compat-stale__text">
              This {isRelatti ? 'connection report' : 'compatibility report'} was written from earlier results. Regenerate it to reflect the latest.
            </p>
          </div>
          <button
            className="compat-stale__btn"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Regenerating…</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Regenerate</>
            )}
          </button>
        </motion.div>
      )}

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
        <CouplesReport
          data={report.couples_report}
          otherName={otherPersonName}
          inviteId={inviteId}
          needToHear={needToHear}
        />
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

function CouplesSection({
  heading,
  text,
  example,
  coachHref,
}: {
  heading: string;
  text?: string;
  example?: string;
  coachHref?: string;
}) {
  if (!text || !text.trim()) return null;
  return (
    <div className="couples-report__section">
      <h3 className="couples-report__heading">{heading}</h3>
      <Paragraphs text={text} className="couples-report__body" />
      {example && example.trim() && (
        <div className="couples-report__example">
          <div className="couples-report__example-label">For example</div>
          <Paragraphs text={example} className="couples-report__example-text" />
          {coachHref && (
            <Link href={coachHref} className="couples-report__example-coach">
              Not quite your situation? Bring it to your coach
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "What each of you needs to hear" — the pair, side by side.
 *
 * WHAT THESE ARE: phrases the model inferred from each person's assessment
 * results — NOT anything either partner wrote or told us. Copy must never imply
 * otherwise: we promise a partner's private coaching is never shared, and
 * wording that hints we're relaying their words undermines that promise even
 * though the data is harmless. Name the source as their relationship style.
 * (Founder correction, 2026-07-16.)
 *
 * Seeing both lists together IS the insight — most couples need opposite things.
 */
function NeedToHearPair({ dyad, otherName }: { dyad: DyadNeedToHear; otherName: string }) {
  const partnerLabel = dyad.partnerName || otherName;
  const columns: Array<{ heading: string; phrases: DyadNeedToHear['mine'] }> = [
    { heading: 'What you need to hear', phrases: dyad.mine },
    { heading: `What ${partnerLabel} needs to hear`, phrases: dyad.theirs },
  ];

  return (
    <div className="couples-report__section">
      <h3 className="couples-report__heading">What each of you needs to hear</h3>
      <p className="couples-report__body">
        Based on your relationship styles — the words most likely to land. You
        probably need different things, and that&apos;s the point.
      </p>
      <div className="needs-pair">
        {columns.map((col) => (
          <div key={col.heading} className="needs-pair__col">
            <div className="needs-pair__label">
              <Heart size={14} />
              {col.heading}
            </div>
            <ul className="needs-pair__list">
              {col.phrases.map((p, i) => (
                <li key={i} className="needs-pair__item">
                  <span className="needs-pair__phrase">&ldquo;{p.phrase}&rdquo;</span>
                  {p.why && <span className="needs-pair__why">{p.why}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouplesReport({
  data,
  otherName,
  inviteId,
  needToHear,
}: {
  data: CouplesReportData;
  otherName: string;
  inviteId: string;
  needToHear?: DyadNeedToHear | null;
}) {
  const coachHref = buildCoachDeepLink(otherName, inviteId);
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

      <CouplesSection heading="The dance between you" text={data.dynamic} example={data.dynamic_example} coachHref={coachHref} />
      <CouplesSection heading={`Understanding ${otherName}`} text={data.empathy} />
      <CouplesSection heading="What you build together" text={data.strengths} />
      <CouplesSection heading="Where it gets hard" text={data.challenges} example={data.challenges_example} coachHref={coachHref} />
      <CouplesSection heading="How to love each other well" text={data.loving_well} example={data.loving_well_example} coachHref={coachHref} />
      {/* The concrete companion to "how to love each other well": the actual
          words. Only renders when BOTH partners' phrases resolved. */}
      {needToHear && needToHear.mine.length > 0 && needToHear.theirs.length > 0 && (
        <NeedToHearPair dyad={needToHear} otherName={otherName} />
      )}
      <CouplesSection heading="Finding your way back" text={data.repair} example={data.repair_example} coachHref={coachHref} />

      {data.closing && (
        <div className="couples-report__closing">
          <Paragraphs text={data.closing} className="couples-report__closing-text" />
        </div>
      )}
    </motion.section>
  );
}
