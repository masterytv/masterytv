/**
 * MoneyMapsRadar — the four core Maps as a diamond radar (the report's
 * signature "shape of your money" visual; BRAND.md §14.4 explicitly endorses a
 * radar over decorative icons).
 *
 * Deterministic render of the stored bundle — no re-scoring, no LLM numbers.
 * Single-hue (the brand primary) per the dataviz sequential rule; the grid is
 * recessive; the 4.0 "running hot" threshold ring is the ONE emphasized
 * gridline (dashed) because it's the only line with meaning. Text uses text
 * tokens, never the series color. All colors are semantic custom properties, so
 * the emerald money palette and both themes resolve without per-theme code.
 */

import type { MoneyMap } from "@/lib/decoded/scoring/money-maps";

const R_MAX = 100;
const CX = 170;
const CY = 150;

/** Clockwise from the top — matches the report's Map reading order. */
const AXES: Array<{ map: MoneyMap; dx: number; dy: number }> = [
  { map: "GUARD", dx: 0, dy: -1 },
  { map: "DRIVE", dx: 1, dy: 0 },
  { map: "MIRROR", dx: 0, dy: 1 },
  { map: "SHADOW", dx: -1, dy: 0 },
];

/** 1–6 scale → radius. 1 sits at the center; 6 at the rim. */
function radius(v: number): number {
  return Math.max(0, Math.min(R_MAX, ((v - 1) / 5) * R_MAX));
}

function point(dx: number, dy: number, r: number): [number, number] {
  return [CX + dx * r, CY + dy * r];
}

function diamondPath(r: number): string {
  const [tx, ty] = point(0, -1, r);
  const [rx, ry] = point(1, 0, r);
  const [bx, by] = point(0, 1, r);
  const [lx, ly] = point(-1, 0, r);
  return `M ${tx},${ty} L ${rx},${ry} L ${bx},${by} L ${lx},${ly} Z`;
}

const LABEL_POS: Record<MoneyMap, { x: number; y: number; anchor: "middle" | "start" | "end"; scoreDy: number }> = {
  GUARD: { x: CX, y: CY - R_MAX - 22, anchor: "middle", scoreDy: 13 },
  DRIVE: { x: CX + R_MAX + 14, y: CY - 2, anchor: "start", scoreDy: 14 },
  MIRROR: { x: CX, y: CY + R_MAX + 22, anchor: "middle", scoreDy: 13 },
  SHADOW: { x: CX - R_MAX - 14, y: CY - 2, anchor: "end", scoreDy: 14 },
};

export default function MoneyMapsRadar({
  dims,
  overclocked,
}: {
  dims: Record<MoneyMap, number>;
  overclocked: MoneyMap[];
}) {
  const hot = new Set(overclocked);
  const vertices = AXES.map((a) => point(a.dx, a.dy, radius(dims[a.map])));
  const shape = vertices.map(([x, y]) => `${x},${y}`).join(" ");

  const summary = AXES.map(
    (a) => `${a.map} ${dims[a.map].toFixed(1)} of 6${hot.has(a.map) ? ", running hot" : ""}`,
  ).join("; ");

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 340 300"
        role="img"
        aria-label={`The shape of your four Maps: ${summary}.`}
        className="w-full max-w-[340px]"
      >
        <title>{`The shape of your four Maps: ${summary}.`}</title>

        {/* Recessive grid rings at 2, 3, 5, 6 */}
        {[2, 3, 5, 6].map((v) => (
          <path
            key={v}
            d={diamondPath(radius(v))}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeOpacity={0.16}
            strokeWidth={1}
          />
        ))}

        {/* The one line with meaning: the 4.0 "running hot" threshold */}
        <path
          d={diamondPath(radius(4))}
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          strokeDasharray="5 4"
        />

        {/* Axis spokes */}
        {AXES.map((a) => {
          const [x, y] = point(a.dx, a.dy, R_MAX);
          return (
            <line
              key={a.map}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="var(--color-text-muted)"
              strokeOpacity={0.14}
              strokeWidth={1}
            />
          );
        })}

        {/* Their shape */}
        <polygon
          points={shape}
          fill="color-mix(in oklch, var(--color-primary) 22%, transparent)"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Vertices — hot Maps get the halo ring */}
        {AXES.map((a, i) => {
          const [x, y] = vertices[i];
          const isHot = hot.has(a.map);
          return (
            <g key={a.map}>
              {isHot && (
                <circle cx={x} cy={y} r={7.5} fill="none" stroke="var(--color-primary)" strokeOpacity={0.5} strokeWidth={1.5} />
              )}
              <circle cx={x} cy={y} r={3.5} fill="var(--color-primary)" />
            </g>
          );
        })}

        {/* Labels + scores (text tokens, never the series color — hot Maps earn primary) */}
        {AXES.map((a) => {
          const pos = LABEL_POS[a.map];
          const isHot = hot.has(a.map);
          return (
            <g key={a.map} textAnchor={pos.anchor}>
              <text
                x={pos.x}
                y={pos.y}
                fill={isHot ? "var(--color-primary)" : "var(--color-text-secondary)"}
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}
              >
                {a.map}
              </text>
              <text
                x={pos.x}
                y={pos.y + pos.scoreDy}
                fill="var(--color-text-muted)"
                style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}
              >
                {dims[a.map].toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs leading-relaxed text-text-muted">
        Scored 1–6. The dashed line is where a Map starts running hot.
      </figcaption>
    </figure>
  );
}
