/**
 * Relatti brand mark — "The Held Heart."
 *
 * A heart drawn as two separate halves pulled together until they overlap;
 * the deeper band down the middle is the relationship itself. Concept A,
 * founder-approved 2026-07-02 (docs/relatti-logo-concepts.html). Favicon /
 * touch-icon renders of the same geometry live in public/relatti/.
 *
 * Tones come from CSS vars set in globals.css under [data-brand="relatti"]
 * (lighter rose on dark surfaces, deeper on light), with hex fallbacks so the
 * mark still renders correctly outside a branded root (e.g. emails, previews).
 */
export function RelattiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 29 C16 29 4.4 20.6 4.4 11.9 C4.4 7 8.3 3.5 12.6 3.5 C14.4 3.5 15.4 4.3 16 5.4 C17.7 9.5 17.7 19 16 29 Z"
        fill="var(--relatti-mark-left, #f43f5e)"
        fillOpacity={0.85}
      />
      <path
        d="M16 29 C16 29 27.6 20.6 27.6 11.9 C27.6 7 23.7 3.5 19.4 3.5 C17.6 3.5 16.6 4.3 16 5.4 C14.3 9.5 14.3 19 16 29 Z"
        fill="var(--relatti-mark-right, #be123c)"
        fillOpacity={0.85}
      />
    </svg>
  );
}
