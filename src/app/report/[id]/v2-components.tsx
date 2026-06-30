'use client';

/**
 * Decoded Report v2 — Structured Subcomponents
 *
 * Scannable UI components rendered inside v2 report sections:
 * - SummaryTable: 6-row dimension overview (S1)
 * - StrengthEdgeList: Named strengths/growth edges (S1)
 * - TraitCard: Big Five trait with Gifts/Challenges (S2)
 * - ProtectorCard: IFS protector profile (S3)
 * - FightStages: "How You Fight" numbered stages (S5)
 * - GrowthEdgeCard: Prioritized growth actions (S8)
 *
 * Design: BRAND.md tokens, dual-theme, Lucide icons
 */

import { motion } from 'framer-motion';
import {
  Award, TrendingUp, Shield, Zap, Heart,
  ChevronRight, AlertTriangle, Target,
} from 'lucide-react';
import type {
  SummaryRow, StrengthBullet, TraitCard as TraitCardType,
  ProtectorCard as ProtectorCardType, FightStage,
  GrowthEdgeCard as GrowthEdgeCardType,
} from '@/lib/decoded/report/prompts/types';

// ─────────────────────────────────────────────────────
// S1: Summary Table
// ─────────────────────────────────────────────────────

interface SummaryTableProps {
  rows: SummaryRow[];
}

export function SummaryTable({ rows }: SummaryTableProps) {
  return (
    <div className="v2-summary-table">
      {rows.map((row, i) => (
        <motion.div
          key={row.dimension}
          className="v2-summary-table__row"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <span className="v2-summary-table__dimension">{row.dimension}</span>
          <span className="v2-summary-table__summary">{row.summary}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// S1: Strength / Edge List
// ─────────────────────────────────────────────────────

interface StrengthEdgeListProps {
  items: StrengthBullet[];
  variant: 'strength' | 'edge';
}

export function StrengthEdgeList({ items, variant }: StrengthEdgeListProps) {
  const Icon = variant === 'strength' ? Award : TrendingUp;
  const title = variant === 'strength' ? 'Your Top 3 Strengths' : 'Your 3 Growth Edges';

  return (
    <div className={`v2-strength-list v2-strength-list--${variant}`}>
      <h4 className="v2-strength-list__title">
        <Icon size={16} />
        {title}
      </h4>
      <ul className="v2-strength-list__items">
        {items.map((item, i) => (
          <motion.li
            key={item.label}
            className="v2-strength-list__item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.25 }}
          >
            <strong className="v2-strength-list__label">{item.label}.</strong>
            {' '}
            <span className="v2-strength-list__desc">{item.description}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// S2: Trait Card
// ─────────────────────────────────────────────────────

interface TraitCardProps {
  card: TraitCardType;
}

export function TraitCard({ card }: TraitCardProps) {
  // Visual indicator position based on percentile
  const barPosition = Math.min(Math.max(card.percentile, 5), 95);

  return (
    <div className="v2-trait-card">
      <div className="v2-trait-card__header">
        <h4 className="v2-trait-card__label">{card.label}</h4>
        <div className="v2-trait-card__meta">
          <span className="v2-trait-card__trait-name">{card.trait_name}</span>
          <span className="v2-trait-card__percentile">{card.percentile}th percentile</span>
        </div>
        <div className="v2-trait-card__bar">
          <div
            className="v2-trait-card__bar-fill"
            style={{ width: `${barPosition}%` }}
          />
          <div
            className="v2-trait-card__bar-marker"
            style={{ left: `${barPosition}%` }}
          />
        </div>
      </div>

      <div className="v2-trait-card__body">
        <div className="v2-trait-card__column v2-trait-card__column--gifts">
          <h5 className="v2-trait-card__column-title">
            <Award size={13} />
            Gifts
          </h5>
          <ul>
            {card.gifts.map((gift, i) => (
              <li key={i}>{gift}</li>
            ))}
          </ul>
        </div>
        <div className="v2-trait-card__column v2-trait-card__column--challenges">
          <h5 className="v2-trait-card__column-title">
            <AlertTriangle size={13} />
            Challenges
          </h5>
          <ul>
            {card.challenges.map((ch, i) => (
              <li key={i}>{ch}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// S3: Protector Card
// ─────────────────────────────────────────────────────

interface ProtectorCardComponentProps {
  protector: ProtectorCardType;
  index: number;
}

export function ProtectorCardComponent({ protector, index }: ProtectorCardComponentProps) {
  return (
    <motion.div
      className="v2-protector-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="v2-protector-card__header">
        <Shield size={16} />
        <h4 className="v2-protector-card__name">{protector.name}</h4>
        {protector.score != null && (
          <span className="v2-protector-card__score">{protector.score}</span>
        )}
      </div>
      <p className="v2-protector-card__role">{protector.role}</p>
      <p className="v2-protector-card__cost">
        <strong>The cost:</strong> {protector.cost}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────
// S5: Fight Stages
// ─────────────────────────────────────────────────────

interface FightStagesProps {
  stages: FightStage[];
  title?: string;
}

export function FightStagesComponent({ stages, title = 'How You Fight' }: FightStagesProps) {
  return (
    <div className="v2-fight-stages">
      <h4 className="v2-fight-stages__title">
        <Zap size={16} />
        {title}
      </h4>
      <ol className="v2-fight-stages__list">
        {stages.map((stage, i) => (
          <motion.li
            key={stage.stage_number}
            className="v2-fight-stages__stage"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.25 }}
          >
            <div className="v2-fight-stages__number">{stage.stage_number}</div>
            <div className="v2-fight-stages__content">
              <strong className="v2-fight-stages__stage-title">{stage.title}</strong>
              <p className="v2-fight-stages__desc">{stage.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// S5: What You Need to Hear
// ─────────────────────────────────────────────────────

interface NeedToHearProps {
  phrases: Array<{ phrase: string; why: string }>;
  /** Heading (defaults to the reader's own needs). */
  title?: string;
  /** One-line context under the heading. */
  subtitle?: string;
  /** Shown instead of the list when there are no phrases yet (e.g. the partner
   *  hasn't completed their profile). */
  emptyMessage?: string;
}

export function NeedToHearComponent({
  phrases,
  title = 'What You Need to Hear',
  subtitle,
  emptyMessage,
}: NeedToHearProps) {
  return (
    <div className="v2-need-to-hear">
      <h4 className="v2-need-to-hear__title">
        <Heart size={16} />
        {title}
      </h4>
      {subtitle && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-label)', margin: '-0.25rem 0 0.75rem', lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
      {phrases.length === 0 && emptyMessage ? (
        <p style={{
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: 'var(--text-body)',
          margin: 0,
          padding: '1rem 1.125rem',
          background: 'color-mix(in oklch, var(--color-primary) 5%, transparent)',
          border: '1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)',
          borderRadius: 'var(--radius-md)',
        }}>
          {emptyMessage}
        </p>
      ) : (
        <ul className="v2-need-to-hear__list">
          {phrases.map((item, i) => (
            <motion.li
              key={i}
              className="v2-need-to-hear__item"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.2 }}
            >
              <blockquote className="v2-need-to-hear__phrase">
                "{item.phrase}"
              </blockquote>
              <p className="v2-need-to-hear__why">{item.why}</p>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// S8: Growth Edge Card
// ─────────────────────────────────────────────────────

interface GrowthEdgeCardComponentProps {
  edge: GrowthEdgeCardType;
}

export function GrowthEdgeCardComponent({ edge }: GrowthEdgeCardComponentProps) {
  return (
    <div className="v2-growth-card">
      <div className="v2-growth-card__header">
        <span className="v2-growth-card__priority">#{edge.priority}</span>
        <h4 className="v2-growth-card__title">{edge.title}</h4>
      </div>
      <p className="v2-growth-card__why">{edge.why}</p>
      <ul className="v2-growth-card__actions">
        {edge.actions.map((action, i) => (
          <li key={i}>
            <ChevronRight size={12} />
            {action}
          </li>
        ))}
      </ul>
    </div>
  );
}
