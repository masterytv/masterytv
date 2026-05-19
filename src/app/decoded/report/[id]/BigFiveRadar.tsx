'use client';

/**
 * Big Five Radar Chart — SVG-based 5-axis radar
 * Used in RS03 and RS04 for Big Five percentile visualization
 *
 * Why the padding: Labels sit outside the radar polygon, so the viewBox
 * must extend beyond the chart radius to prevent clipping.
 */

interface BigFiveRadarProps {
  values: number[]; // 5 percentile values (0-100) in order: O, C, E, A, N
  labels?: string[];
  size?: number;
}

const DEFAULT_LABELS = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];

export default function BigFiveRadar({
  values,
  labels = DEFAULT_LABELS,
  size = 320,
}: BigFiveRadarProps) {
  // Add padding so labels aren't clipped
  const padding = 50;
  const viewSize = size + padding * 2;
  const center = viewSize / 2;
  const maxRadius = size * 0.36;
  const numAxes = 5;
  const angleStep = (2 * Math.PI) / numAxes;
  // Start from top (-90°)
  const startAngle = -Math.PI / 2;

  // Get point on the radar for a given axis and value (0-100)
  const getPoint = (axisIndex: number, value: number): [number, number] => {
    const angle = startAngle + axisIndex * angleStep;
    const r = (value / 100) * maxRadius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };

  // Background rings
  const rings = [20, 40, 60, 80, 100];

  // Value polygon points
  const polygonPoints = values
    .map((v, i) => getPoint(i, Math.min(100, Math.max(0, v))))
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
        {/* Background rings — visible grid lines */}
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
              opacity={pct === 100 ? 0.35 : 0.18}
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
              opacity={0.2}
            />
          );
        })}

        {/* Value polygon — gradient fill */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-accent-emerald)" stopOpacity={0.15} />
          </linearGradient>
        </defs>
        <polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Value dots */}
        {values.map((v, i) => {
          const [x, y] = getPoint(i, Math.min(100, Math.max(0, v)));
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r={5}
              fill="var(--color-primary)"
              stroke="var(--color-surface-0)"
              strokeWidth={2}
            />
          );
        })}

        {/* Labels — positioned outside the radar with enough room */}
        {labels.map((label, i) => {
          const [x, y] = getPoint(i, 125);
          // Adjust text anchor based on position to prevent clipping
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
              fontSize={14}
              fontWeight={500}
              fontFamily="var(--font-sans)"
            >
              {label}
            </text>
          );
        })}

        {/* Percentile values — positioned near the data points */}
        {values.map((v, i) => {
          const clampedV = Math.min(100, Math.max(0, v));
          const [x, y] = getPoint(i, clampedV);
          // Offset the label away from center
          const angle = startAngle + i * angleStep;
          const offsetX = Math.cos(angle) * 16;
          const offsetY = Math.sin(angle) * 16;
          return (
            <text
              key={`val-${i}`}
              x={x + offsetX}
              y={y + offsetY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-primary)"
              fontSize={12}
              fontWeight={600}
              fontFamily="var(--font-mono)"
            >
              {Math.round(v)}%
            </text>
          );
        })}
      </svg>
    </div>
  );
}
