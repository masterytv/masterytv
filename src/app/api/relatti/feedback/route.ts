/**
 * Deprecated alias — feedback capture moved to /api/feedback when the widget
 * went all-brands (2026-07-20). Kept so widget bundles deployed before the
 * move (open dashboard tabs) keep posting successfully; the shared handler
 * resolves brand by host, so a stale relatti.com client still files as
 * `relationship`. Safe to remove once pre-move deploys have aged out.
 */
export { POST } from "../../feedback/route";
