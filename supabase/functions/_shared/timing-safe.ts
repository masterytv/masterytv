/**
 * Constant-time string comparison.
 *
 * A plain `a === b` short-circuits at the first differing byte, so the time it
 * takes leaks *where* the mismatch is — enough to recover a secret byte-by-byte
 * over many requests. This compares every byte of the longer input regardless
 * of where the first difference falls, and folds in a length-mismatch flag, so
 * the running time depends only on the input lengths, never on the secret's
 * contents.
 *
 * For fixed shared secrets and HMAC signatures (CRON_SECRET, Svix v1), not a
 * substitute for password hashing.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const len = Math.max(aBytes.length, bBytes.length);
  // Seed with the length delta so unequal-length inputs can never fold back to
  // 0 — without an early return, which would itself leak the length.
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}
