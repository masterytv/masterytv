/**
 * Joining dictated speech onto what is already in the box — I5.4.
 *
 * Pure and separate from the component because this is the part with edge
 * cases, and they are not hypothetical: browsers hand back phrases with a
 * leading space, emit whitespace-only results between phrases, and this box has
 * a real ceiling that a spoken account can actually reach (EXPERIENCE §5.2
 * promises "some will write four thousand" words, which is most of 25,000
 * characters).
 */

/**
 * The ceiling on a single account, shared by the textarea's `maxLength` and by
 * dictation, which `maxLength` cannot police because it writes programmatically.
 *
 * ⚠️ Lockstep twin of `MESSAGE_CEILING.integration` in `coach/index.ts`, which
 * the edge cannot import from here. If they drift the box builds a message the
 * coach rejects, on the one turn EXPERIENCE §5.2 says decides the trajectory.
 */
export const ACCOUNT_MAX_CHARS = 25000;

/**
 * Append one finished phrase, exactly one space between phrases, never past
 * `max`.
 *
 * Clamping truncates rather than refusing the phrase: it matches what the
 * textarea's own `maxLength` does to somebody typing, and dropping the phrase
 * silently would lose speech that has already been spoken. `trimEnd` only
 * touches the end, so paragraph breaks the person typed themselves survive.
 */
export function appendDictated(current: string, chunk: string, max: number): string {
  const phrase = chunk.trim();
  if (!phrase) return current;
  const joined = current ? `${current.trimEnd()} ${phrase}` : phrase;
  return joined.slice(0, max);
}
