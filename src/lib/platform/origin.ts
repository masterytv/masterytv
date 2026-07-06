/**
 * The current request's public origin (scheme + host), e.g. `https://relatti.com`.
 *
 * Invite / share links MUST use the domain the user is actually on: a Relatti user
 * on relatti.com gets relatti.com links, a MasteryTV user gets masterytv.com, and
 * local/staging testing gets localhost / staging.relatti.com. Deriving from the
 * request host — not the static `NEXT_PUBLIC_APP_URL`, which is only ever one
 * brand's domain — is the fix for the cross-brand leak where relatti.com invite
 * links pointed at masterytv.com.
 *
 * Pure over a Headers object, so it works in both contexts:
 *   • Server Components: `originFromHeaders(await headers())`
 *   • Route handlers:    `originFromHeaders(req.headers)`
 */
export function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  // A real request always carries a host; this only guards exotic cases. Relatti
  // is the primary product, so default there rather than masterytv.
  return process.env.NEXT_PUBLIC_APP_URL || "https://relatti.com";
}
