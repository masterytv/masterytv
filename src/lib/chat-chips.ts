/**
 * Answer-chip parsing for the coach chat (the money reveal's clickable quick
 * replies; MONEY_MAPS_INSTRUMENT.md §6, MONEY_EXPERIENCE.md §6).
 *
 * A coach message MAY end with a machine-readable marker on its own last line:
 *   [[CHIPS: option one | option two | option three]]
 * The money pack (supabase/functions/_shared/packs/money-pack.ts) is the ONLY
 * pack that instructs the coach to emit it, so this parsing is VERTICAL-BLIND:
 * any other coach's messages never match, the strip is a no-op, and no brand
 * check is needed. Free-text always stays the primary input — chips are a
 * shortcut, never the only door.
 *
 * Pure + framework-free so the client component and its unit tests share one
 * implementation (and a later bespoke Decision Room can reuse it).
 */

/** The chips marker as a whole trailing line: `\n [[CHIPS: a | b | c]]` at end. */
export const CHIPS_MARKER = /\n*[ \t]*\[\[CHIPS:\s*([^\]]+?)\s*\]\]\s*$/;

/** Options never exceed this — a runaway marker can't paint a wall of buttons. */
export const MAX_CHIPS = 6;

/**
 * Split a coach message into its visible text and its answer chips. When there
 * is no marker (every non-money coach, and money turns that ask open), returns
 * the content untouched and no chips.
 */
export function parseChips(content: string): { text: string; chips: string[] } {
  const m = content.match(CHIPS_MARKER);
  if (!m || m.index === undefined) return { text: content, chips: [] };
  const chips = m[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_CHIPS);
  // A marker with no usable options (e.g. "[[CHIPS: | ]]") still gets stripped
  // from the text, but yields no buttons.
  return { text: content.slice(0, m.index).trimEnd(), chips };
}

/**
 * While streaming, hide a complete OR still-arriving chips marker so the raw
 * "[[CHIPS: …" never flashes on screen before the buttons render on completion.
 */
export function stripStreamingChips(content: string): string {
  const full = content.match(CHIPS_MARKER);
  if (full && full.index !== undefined) return content.slice(0, full.index).trimEnd();
  // An opening marker still mid-stream: a trailing "[[…" with no closing "]]".
  // "[[" is not a sequence coaching prose produces, so this only ever fires on
  // the marker itself.
  const partial = content.match(/\n*[ \t]*\[\[[^\]]*$/);
  if (partial && partial.index !== undefined) return content.slice(0, partial.index).trimEnd();
  return content;
}
