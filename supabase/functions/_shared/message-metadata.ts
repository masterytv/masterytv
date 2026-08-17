/**
 * `messages.metadata` is written by more than one writer, so it is MERGED.
 *
 * 🔥 WHY THIS FILE EXISTS (found 2026-08-12, in the first live `integration`
 * run; the bug itself is old and cross-vertical). The coach writes a rich object
 * onto the coach message the moment it stores the reply — `program`, token
 * counts, `active_challenges`, and for integration the `draft_audit` record of
 * whether the reply was blocked and regenerated. Seconds later `post-processor`
 * runs in `waitUntil` and issued a whole-object `update({ metadata: { sentiment,
 * topics } })`, which REPLACES the JSONB column rather than merging into it.
 *
 * Last writer won, and the post-processor usually did: across 60 days of coach
 * messages, 31 of 53 relationship turns kept the coach's object and 22 kept the
 * post-processor's — never both — and `draft_audit` survived 0 of 5 integration
 * turns. So the audit trail for a blocked-and-regenerated reply did not exist in
 * production, which is exactly the number the vertical's residual has to be
 * tracked by, and the `program` stamp anything downstream might read was gone
 * too.
 *
 * 🔑 The batteries never saw it because they call `auditAndFinalizeDraft`
 * directly and never touch the storage path. A green gate proved the auditor
 * decided correctly and said nothing about whether its decision was recorded.
 * That is the general lesson: a test that stops at the return value does not
 * cover the write.
 */

/** What a JSONB metadata column holds: an object, or nothing at all. */
export type MessageMetadata = Record<string, unknown> | null | undefined;

/**
 * Merge a patch into whatever is already on the row.
 *
 * Shallow on purpose. The writers own DISJOINT top-level keys — the coach owns
 * `program`, `draft_audit`, `active_challenges`, tokens; the post-processor owns
 * `sentiment` and `topics` — so a deep merge would buy nothing and would quietly
 * combine two halves of one key's value if that ever stopped being true. On a
 * genuine collision the patch wins, because the patch is the newer measurement.
 *
 * Total: a non-object `existing` (null, or a scalar some older row holds) is
 * treated as absent rather than throwing, since this runs inside a background
 * task whose failure nobody sees.
 */
export function mergeMessageMetadata(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base = existing && typeof existing === "object" && !Array.isArray(existing)
    ? existing as Record<string, unknown>
    : {};
  return { ...base, ...patch };
}
