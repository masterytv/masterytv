'use client';

/**
 * CompatibilityReportViewer — Visual display of the compatibility report.
 * Punchy, editorial layout matching the main Decoded report aesthetic.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import './compatibility.css';

interface CompatDimension {
  dimension: string;
  score: number;
  insight: string;
}

interface CompatReport {
  headline: string;
  chemistry: string;
  friction: string;
  superpower: string;
  watch_out: string;
  advice_for_a: string;
  advice_for_b: string;
  compatibility_dimensions: CompatDimension[];
}

interface Props {
  report: CompatReport;
  inviterName: string;
  recipientName: string;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function CompatibilityReportViewer({ report, inviterName, recipientName }: Props) {
  const avgScore = report.compatibility_dimensions?.length
    ? Math.round(report.compatibility_dimensions.reduce((s, d) => s + d.score, 0) / report.compatibility_dimensions.length * 10)
    : 0;

  return (
    <div className="compat-container">
      {/* Back link */}
      <Link href="/dashboard" className="compat-back">
        <ArrowLeft size={16} />
        Back to Dashboard
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

      {/* Insight cards */}
      <div className="compat-grid">
        <motion.div className="compat-card" {...fadeIn} transition={{ delay: 0.1 }}>
          <div className="compat-card__icon compat-card__icon--chemistry">💚</div>
          <div className="compat-card__title">What Clicks</div>
          <p className="compat-card__body">{report.chemistry}</p>
        </motion.div>

        <motion.div className="compat-card" {...fadeIn} transition={{ delay: 0.15 }}>
          <div className="compat-card__icon compat-card__icon--friction">🔥</div>
          <div className="compat-card__title">Where You&apos;ll Clash</div>
          <p className="compat-card__body">{report.friction}</p>
        </motion.div>

        <motion.div className="compat-card" {...fadeIn} transition={{ delay: 0.2 }}>
          <div className="compat-card__icon compat-card__icon--superpower">⚡</div>
          <div className="compat-card__title">Your Superpower Together</div>
          <p className="compat-card__body">{report.superpower}</p>
        </motion.div>

        <motion.div className="compat-card" {...fadeIn} transition={{ delay: 0.25 }}>
          <div className="compat-card__icon compat-card__icon--watchout">⚠️</div>
          <div className="compat-card__title">Watch Out For</div>
          <p className="compat-card__body">{report.watch_out}</p>
        </motion.div>
      </div>

      {/* Dimensions */}
      {report.compatibility_dimensions?.length > 0 && (
        <motion.div
          className="compat-dimensions"
          {...fadeIn}
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

      {/* Advice */}
      <motion.div className="compat-advice" {...fadeIn} transition={{ delay: 0.5 }}>
        <div className="compat-advice__card">
          <div className="compat-advice__for">Advice for {inviterName}</div>
          <p className="compat-advice__text">{report.advice_for_a}</p>
        </div>
        <div className="compat-advice__card">
          <div className="compat-advice__for">Advice for {recipientName}</div>
          <p className="compat-advice__text">{report.advice_for_b}</p>
        </div>
      </motion.div>
    </div>
  );
}
