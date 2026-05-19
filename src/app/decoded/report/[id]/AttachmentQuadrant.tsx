'use client';

/**
 * Attachment Style Quadrant Plot — SVG 2×2 quadrant
 * Used in RS06 and RS10 for attachment visualization
 *
 * Axis mapping:
 *   X = Anxiety (low-left → high-right)
 *   Y = Avoidance (low-bottom → high-top)
 * This produces four quadrants matching Bartholomew & Horowitz (1991).
 */

interface AttachmentQuadrantProps {
  anxiety: number;    // ECR-R anxiety score (1-7)
  avoidance: number;  // ECR-R avoidance score (1-7)
  style: string;      // secure | anxious | avoidant | disorganized
  size?: number;
}

export default function AttachmentQuadrant({
  anxiety,
  avoidance,
  style,
  size = 400,
}: AttachmentQuadrantProps) {
  const padding = 65;
  const plotSize = size - padding * 2;

  // The scoring engine classifies at threshold=3.5 (see engine.ts L170-177).
  // The chart midlines must align with this threshold, NOT the linear midpoint of [1,7].
  // Map scores so that 3.5 → 0.5 (visual center), 1 → 0, 7 → 1.
  const threshold = 3.5;
  const normX = Math.min(1, Math.max(0, 
    anxiety <= threshold 
      ? (anxiety - 1) / (threshold - 1) * 0.5          // [1, 3.5] → [0, 0.5]
      : 0.5 + (anxiety - threshold) / (7 - threshold) * 0.5  // [3.5, 7] → [0.5, 1]
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
    { label: 'Dismissive-\nAvoidant', x: padding + plotSize * 0.25, y: padding + plotSize * 0.25 },
    { label: 'Fearful-\nAvoidant', x: padding + plotSize * 0.75, y: padding + plotSize * 0.25 },
    { label: 'Secure', x: padding + plotSize * 0.25, y: padding + plotSize * 0.75 },
    { label: 'Anxious-\nPreoccupied', x: padding + plotSize * 0.75, y: padding + plotSize * 0.75 },
  ];

  // Normalize legacy labels from older database records
  const legacyMap: Record<string, string> = {
    'secure': 'Secure',
    'anxious': 'Anxious-Preoccupied',
    'avoidant': 'Dismissive-Avoidant',
    'disorganized': 'Fearful-Avoidant',
  };
  const normalizedStyle = legacyMap[style] ?? style;

  const styleColors: Record<string, string> = {
    'Secure': 'var(--color-accent-emerald)',
    'Anxious-Preoccupied': '#fbbf24',
    'Dismissive-Avoidant': '#94a3b8',
    'Fearful-Avoidant': 'var(--color-danger)',
  };

  const dotColor = styleColors[normalizedStyle] ?? 'var(--color-primary)';

  return (
    <div className="viz-container" style={{ display: 'flex', justifyContent: 'center' }}>
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
            fontWeight={500}
            fontFamily="var(--font-sans)"
            opacity={0.55}
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
          Anxiety →
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
          Avoidance →
        </text>

        {/* User dot with glow */}
        <circle cx={dotX} cy={dotY} r={16} fill={dotColor} opacity={0.15} />
        <circle cx={dotX} cy={dotY} r={9} fill={dotColor} stroke="var(--color-surface-0)" strokeWidth={2.5} />

        {/* Style label on dot */}
        <text
          x={dotX}
          y={dotY - 22}
          textAnchor="middle"
          fill={dotColor}
          fontSize={14}
          fontWeight={700}
          fontFamily="var(--font-display)"
        >
          {normalizedStyle}
        </text>
      </svg>
    </div>
  );
}
