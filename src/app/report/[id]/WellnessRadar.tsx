'use client';

/**
 * Wellness Radar — SVG-based 10-axis radar chart
 * 
 * Visualizes the Decoded Wellness Check across 10 lifestyle dimensions.
 * Each axis is 0–100. Color-coded fill signals overall wellness level.
 * 
 * Architecture: Same SVG pattern as BigFiveRadar, scaled to 10 axes
 * with tighter label placement for the denser layout.
 */

interface WellnessRadarProps {
  /** 10 values (0–100) keyed by dimension name */
  dimensions: Record<string, number>;
  size?: number;
}

/** Human-readable labels in display order */
const DIMENSION_ORDER = [
  'sleep', 'exercise', 'nutrition', 'energy', 'stress',
  'coping', 'social', 'purpose', 'vitality', 'screenTime',
];

const DIMENSION_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  exercise: 'Exercise',
  nutrition: 'Nutrition',
  energy: 'Energy',
  stress: 'Stress',
  coping: 'Coping',
  social: 'Social',
  purpose: 'Purpose',
  vitality: 'Vitality',
  screenTime: 'Screen Time',
};

/** Color for a 0–100 value: green ≥ 70, amber ≥ 40, red < 40 */
function valueColor(v: number): string {
  if (v >= 70) return '#69f6b8';
  if (v >= 40) return '#fbbf24';
  return '#f87171';
}

export default function WellnessRadar({ dimensions, size = 360 }: WellnessRadarProps) {
  const padding = 60;
  const viewSize = size + padding * 2;
  const center = viewSize / 2;
  const maxRadius = size * 0.36;
  const numAxes = 10;
  const angleStep = (2 * Math.PI) / numAxes;
  const startAngle = -Math.PI / 2;

  // Ordered values
  const values = DIMENSION_ORDER.map((key) => Math.min(100, Math.max(0, dimensions[key] ?? 50)));
  const labels = DIMENSION_ORDER.map((key) => DIMENSION_LABELS[key] ?? key);

  // Compute average for gradient color
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const fillColor = valueColor(avg);

  const getPoint = (axisIndex: number, value: number): [number, number] => {
    const angle = startAngle + axisIndex * angleStep;
    const r = (value / 100) * maxRadius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };

  const rings = [25, 50, 75, 100];

  const polygonPoints = values
    .map((v, i) => getPoint(i, v))
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  return (
    <div className="viz-container" style={{ display: 'flex', justifyContent: 'center' }}>
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        style={{ maxWidth: viewSize, overflow: 'visible' }}
      >
        {/* Background rings */}
        {rings.map((pct) => {
          const ringPoints = Array.from({ length: numAxes }, (_, i) => {
            const [x, y] = getPoint(i, pct);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={pct}
              points={ringPoints}
              fill="none"
              stroke="var(--text-label)"
              strokeWidth={pct === 100 ? 1.5 : 0.75}
              opacity={pct === 100 ? 0.35 : 0.15}
            />
          );
        })}

        {/* Axis lines */}
        {Array.from({ length: numAxes }, (_, i) => {
          const [x, y] = getPoint(i, 100);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--text-label)"
              strokeWidth={0.75}
              opacity={0.15}
            />
          );
        })}

        {/* Value polygon */}
        <defs>
          <radialGradient id="wellnessGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.1} />
          </radialGradient>
        </defs>
        <polygon
          points={polygonPoints}
          fill="url(#wellnessGradient)"
          stroke={fillColor}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={0.9}
        />

        {/* Value dots */}
        {values.map((v, i) => {
          const [x, y] = getPoint(i, v);
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r={4}
              fill={valueColor(v)}
              stroke="var(--color-surface-0)"
              strokeWidth={2}
            />
          );
        })}

        {/* Dimension labels — outside the radar */}
        {labels.map((label, i) => {
          const [x, y] = getPoint(i, 120);
          const angle = startAngle + i * angleStep;
          const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          let anchor: 'start' | 'middle' | 'end' = 'middle';
          if (normalizedAngle > 0.3 && normalizedAngle < Math.PI - 0.3) anchor = 'start';
          if (normalizedAngle > Math.PI + 0.3 && normalizedAngle < 2 * Math.PI - 0.3) anchor = 'end';

          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="var(--text-heading)"
              fontSize={12}
              fontWeight={500}
              fontFamily="var(--font-sans)"
            >
              {label}
            </text>
          );
        })}

        {/* Value labels — near data points */}
        {values.map((v, i) => {
          const [x, y] = getPoint(i, v);
          const angle = startAngle + i * angleStep;
          const offsetX = Math.cos(angle) * 14;
          const offsetY = Math.sin(angle) * 14;
          return (
            <text
              key={`val-${i}`}
              x={x + offsetX}
              y={y + offsetY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={valueColor(v)}
              fontSize={11}
              fontWeight={600}
              fontFamily="var(--font-mono)"
            >
              {Math.round(v)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
