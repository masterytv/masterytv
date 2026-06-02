'use client';

/**
 * CompatibilityReportViewer — Visual display with tabs for three relationship contexts
 * and a sharing transparency section showing what data was shared vs. not shared.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Heart, Users, Briefcase, Check, Lock,
  Send, Loader2, Eye, EyeOff,
  Handshake, Flame, Zap, ShieldAlert,
} from 'lucide-react';
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
  advice_for_a: string;
  advice_for_b: string;
}

interface CompatReport {
  headline: string;
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
  upgradeAlreadyRequested?: boolean;
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

export default function CompatibilityReportViewer({
  report, inviterName, recipientName,
  shareWithHuman, isInviter, inviteId, otherPersonName,
  upgradeAlreadyRequested = false,
}: Props) {
  const isMultiContext = !!report.intimate || !!report.family_friendship || !!report.work;
  const [activeTab, setActiveTab] = useState<TabId>('intimate');
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState(upgradeAlreadyRequested);
  const router = useRouter();

  const context: ContextInsights | null = isMultiContext
    ? (report[activeTab] ?? null)
    : {
        chemistry: report.chemistry || '',
        friction: report.friction || '',
        superpower: report.superpower || '',
        watch_out: report.watch_out || '',
        advice_for_a: report.advice_for_a || '',
        advice_for_b: report.advice_for_b || '',
      };

  // Show the sharing card to both users so they see the mutual level
  const showSharingCard = shareWithHuman !== 'none';

  // Check if there are items not shared (to show Request Access)
  const hasLockedItems = shareWithHuman !== 'full';

  async function handleRequestUpgrade() {
    setRequestingUpgrade(true);
    try {
      const res = await fetch('/api/decoded/invite-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'request', level: 'full' }),
      });
      if (res.ok) {
        setUpgradeRequested(true);
      }
    } finally {
      setRequestingUpgrade(false);
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
        <div className="compat-header__label">Compatibility Report</div>
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
                  {!shared && !upgradeRequested && (
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
                  {!shared && upgradeRequested && (
                    <span className="compat-sharing__requested">
                      <Check className="h-3 w-3" /> Requested
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      {isMultiContext && (
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

            <div className="compat-advice">
              <div className="compat-advice__card">
                <div className="compat-advice__for">Advice for {inviterName}</div>
                <p className="compat-advice__text">{context.advice_for_a}</p>
              </div>
              <div className="compat-advice__card">
                <div className="compat-advice__for">Advice for {recipientName}</div>
                <p className="compat-advice__text">{context.advice_for_b}</p>
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
    </div>
  );
}
