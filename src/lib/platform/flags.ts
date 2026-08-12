/**
 * App-side feature flags.
 *
 * ⚠️ LOCKSTEP TWIN: `supabase/functions/_shared/flags.ts`. Edge functions
 * cannot import from `src/`, so the same flag contract exists twice. Change
 * one, change both (ORIENT.md §7).
 *
 * ⚠️ SERVER ONLY. No flag here is `NEXT_PUBLIC_`, so none of them reach the
 * browser bundle. Read them in server components, route handlers and server
 * actions. A client component that needs to know must be told by its server
 * parent — do not re-export any of this through a client boundary.
 */

/** Env var → boolean. Anything other than "on" (any casing) is off. */
function on(name: string): boolean {
  return (process.env[name] ?? "off").trim().toLowerCase() === "on";
}

/**
 * INTEGRATION_ENGINE — the `integration` vertical's kill switch.
 *
 * INTEGRATION_SPRINT.md §2. Everything from I1's corpus bridge through I6's
 * reveal ships DARK behind this, so the code can land on main while the
 * founder's go/no-go on I1 is still open. Default off: an unset var in any
 * environment means the vertical does not exist there.
 *
 * Two ways on, because Sprint 0 needs both:
 *   - `INTEGRATION_ENGINE=on` — everyone (staging, or after the go decision).
 *   - `INTEGRATION_ENGINE_USERS=<uuid>,<uuid>` — just these accounts, while
 *     the flag itself stays off. This is how I1.5's 5–10 real experiencers get
 *     the bridge without it existing for anyone else, and it is why the check
 *     takes a userId rather than being a constant.
 *
 * Passing no userId asks the global question only.
 */
export function integrationEngineEnabled(userId?: string | null): boolean {
  if (on("INTEGRATION_ENGINE")) return true;
  if (!userId) return false;
  const allow = (process.env.INTEGRATION_ENGINE_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(userId);
}
