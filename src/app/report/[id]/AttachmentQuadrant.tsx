'use client';

/**
 * Attachment Style Quadrant Plot — SVG 2×2 quadrant
 * Used in RS06 and RS10 for attachment visualization
 *
 * Axis mapping:
 *   X = Anxiety (low-left → high-right)
 *   Y = Avoidance (low-bottom → high-top)
 * This produces four quadrants matching Bartholomew & Horowitz (1991).
 *
 * Each quadrant shows a tooltip on hover with a positive description.
 */

import { useState, useCallback } from 'react';
import { attachmentDisplay } from '@/lib/decoded/report/attachment-style';

interface AttachmentQuadrantProps {
  anxiety: number;    // ECR-R anxiety score (1-7)
  avoidance: number;  // ECR-R avoidance score (1-7)
  style: string;      // secure | anxious | avoidant | disorganized
  size?: number;
}

// Positive descriptions for each attachment quadrant
const QUADRANT_INFO: Record<string, { tagline: string; strengths: string; growth: string }> = {
  'Secure': {
    tagline: 'Comfortable with closeness and independence',
    strengths: 'You trust easily, communicate openly, and handle conflict with grace. You can depend on others without losing yourself.',
    growth: 'Your emotional stability is a foundation others lean on. You build deep, lasting bonds naturally.',
  },
  'Anxious-Preoccupied': {
    tagline: 'Deeply attuned to relationships',
    strengths: 'You are highly empathetic, emotionally available, and deeply invested in the people you love. You notice subtle shifts in others.',
    growth: 'Your relational awareness is a superpower — it makes you an incredible partner and friend when channeled with self-trust.',
  },
  'Dismissive-Avoidant': {
    tagline: 'Self-reliant and emotionally independent',
    strengths: 'You are resilient, composed under pressure, and capable of thriving independently. You bring stability and calm to chaotic situations.',
    growth: 'Your self-sufficiency is a genuine strength. Learning to let others in selectively can unlock even deeper fulfillment.',
  },
  'Fearful-Avoidant': {
    tagline: 'Complex emotional depth',
    strengths: 'You experience emotions with profound depth and nuance. You understand both the desire for closeness and the need for protection.',
    growth: 'Your emotional complexity gives you rare insight into the human experience. With the right support, this depth becomes wisdom.',
  },
};

export default function AttachmentQuadrant({
  anxiety,
  avoidance,
  style,
  size = 400,
}: AttachmentQuadrantProps) {
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
  const padding = 65;
  const plotSize = size - padding * 2;

  // Toggle on click/tap (universal). Hover sets on desktop only.
  const handleQuadrantClick = useCallback((key: string) => {
    setActiveQuadrant(prev => prev === key ? null : key);
  }, []);

  // Desktop-only: show on hover, but don't fight with click
  const handleMouseEnter = useCallback((key: string) => {
    // Only apply hover if nothing is "pinned" via click
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setActiveQuadrant(key);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setActiveQuadrant(null);
    }
  }, []);

  // The scoring engine classifies at threshold=3.5 (see engine.ts L170-177).
  const threshold = 3.5;
  const normX = Math.min(1, Math.max(0, 
    anxiety <= threshold 
      ? (anxiety - 1) / (threshold - 1) * 0.5
      : 0.5 + (anxiety - threshold) / (7 - threshold) * 0.5
  ));
  const normY = Math.min(1, Math.max(0,
    avoidance <= threshold
      ? (avoidance - 1) / (threshold - 1) * 0.5
      : 0.5 + (avoidance - threshold) / (7 - threshold) * 0.5
  ));

  // Plot coordinates (Y is inverted — high avoidance at top)
  const dotX = padding + normX * plotSize;
  const dotY = padding + (1 - normY) * plotSize;

  const quadrantLabels = [
    { label: 'The\nIndependent', key: 'Dismissive-Avoidant', x: padding + plotSize * 0.25, y: padding + plotSize * 0.25 },
    { label: 'The Guarded\nHeart', key: 'Fearful-Avoidant', x: padding + plotSize * 0.75, y: padding + plotSize * 0.25 },
    { label: 'Anchored', key: 'Secure', x: padding + plotSize * 0.25, y: padding + plotSize * 0.75 },
    { label: 'The Devoted', key: 'Anxious-Preoccupied', x: padding + plotSize * 0.75, y: padding + plotSize * 0.75 },
  ];

  // Clickable quadrant regions (for hover/tap)
  const quadrantRects = [
    { key: 'Dismissive-Avoidant', x: padding, y: padding, w: plotSize / 2, h: plotSize / 2 },
    { key: 'Fearful-Avoidant', x: padding + plotSize / 2, y: padding, w: plotSize / 2, h: plotSize / 2 },
    { key: 'Secure', x: padding, y: padding + plotSize / 2, w: plotSize / 2, h: plotSize / 2 },
    { key: 'Anxious-Preoccupied', x: padding + plotSize / 2, y: padding + plotSize / 2, w: plotSize / 2, h: plotSize / 2 },
  ];

  // Normalize legacy labels from older database records
  const legacyMap: Record<string, string> = {
    'secure': 'Secure',
    'anxious': 'Anxious-Preoccupied',
    'avoidant': 'Dismissive-Avoidant',
    'disorganized': 'Fearful-Avoidant',
  };
  const normalizedStyle = legacyMap[style] ?? style;
  const display = attachmentDisplay(normalizedStyle);

  const styleColors: Record<string, string> = {
    'Secure': 'var(--color-accent-emerald)',
    'Anxious-Preoccupied': '#fbbf24',
    'Dismissive-Avoidant': '#94a3b8',
    'Fearful-Avoidant': 'var(--color-danger)',
  };

  const dotColor = styleColors[normalizedStyle] ?? 'var(--color-primary)';

  return (
    <div className="viz-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: size }}
      >
        {/* Background quadrant box */}
        <rect
          x={padding}
          y={padding}
          width={plotSize}
          height={plotSize}
          fill="none"
          stroke="var(--text-label)"
          strokeWidth={1}
          opacity={0.3}
        />

        {/* Hover highlight rects */}
        {quadrantRects.map((q) => (
          <rect
            key={q.key}
            x={q.x}
            y={q.y}
            width={q.w}
            height={q.h}
            fill={activeQuadrant === q.key ? 'rgba(96, 99, 238, 0.06)' : 'transparent'}
            stroke="none"
            style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
            onMouseEnter={() => handleMouseEnter(q.key)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleQuadrantClick(q.key)}
          />
        ))}

        {/* Midlines — dashed dividers */}
        <line
          x1={padding + plotSize / 2} y1={padding}
          x2={padding + plotSize / 2} y2={padding + plotSize}
          stroke="var(--text-label)" strokeWidth={1} strokeDasharray="6,4" opacity={0.25}
        />
        <line
          x1={padding} y1={padding + plotSize / 2}
          x2={padding + plotSize} y2={padding + plotSize / 2}
          stroke="var(--text-label)" strokeWidth={1} strokeDasharray="6,4" opacity={0.25}
        />

        {/* Quadrant labels */}
        {quadrantLabels.map((q, i) => (
          <text
            key={i}
            x={q.x}
            y={q.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-heading)"
            fontSize={13}
            fontWeight={activeQuadrant === q.key ? 600 : 500}
            fontFamily="var(--font-sans)"
            opacity={activeQuadrant === q.key ? 0.9 : 0.55}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
            onMouseEnter={() => handleMouseEnter(q.key)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleQuadrantClick(q.key)}
          >
            {q.label.split('\n').map((line, j) => (
              <tspan key={j} x={q.x} dy={j === 0 ? 0 : 16}>{line}</tspan>
            ))}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={size / 2}
          y={size - 14}
          textAnchor="middle"
          fill="var(--text-heading)"
          fontSize={14}
          fontWeight={600}
          fontFamily="var(--font-sans)"
        >
          Need for Reassurance →
        </text>
        <text
          x={18}
          y={size / 2}
          textAnchor="middle"
          fill="var(--text-heading)"
          fontSize={14}
          fontWeight={600}
          fontFamily="var(--font-sans)"
          transform={`rotate(-90, 18, ${size / 2})`}
        >
          Need for Space →
        </text>

        {/* User dot with glow */}
        <circle cx={dotX} cy={dotY} r={16} fill={dotColor} opacity={0.15} />
        <circle cx={dotX} cy={dotY} r={9} fill={dotColor} stroke="var(--color-surface-0)" strokeWidth={2.5} />

        {/* Style label on dot — warm name only (no clinical label on the graph). */}
        <text
          x={dotX}
          y={dotY - 20}
          textAnchor="middle"
          fill={dotColor}
          fontFamily="var(--font-display)"
        >
          <tspan x={dotX} fontSize={14} fontWeight={700}>{display.name}</tspan>
        </text>
      </svg>

      {/* Tooltip — renders below the chart */}
      {activeQuadrant && QUADRANT_INFO[activeQuadrant] && (
        <div style={{
          width: '100%',
          padding: '0.75rem 1rem',
          marginTop: '0.5rem',
          background: 'var(--color-surface-100)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          lineHeight: 1.6,
          color: 'var(--text-body)',
          transition: 'all 0.15s ease',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.125rem' }}>
            {attachmentDisplay(activeQuadrant).name}
            <span style={{ fontWeight: 500, fontSize: '0.6875rem', color: 'var(--text-label)', marginLeft: '0.4rem' }}>
              in research: {attachmentDisplay(activeQuadrant).clinical}
            </span>
          </div>
          <div style={{ fontStyle: 'italic', color: 'var(--text-label)', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
            {QUADRANT_INFO[activeQuadrant].tagline}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '0.125rem' }}>
                Strengths
              </div>
              <div>{QUADRANT_INFO[activeQuadrant].strengths}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '0.125rem' }}>
                Growth Edge
              </div>
              <div>{QUADRANT_INFO[activeQuadrant].growth}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
