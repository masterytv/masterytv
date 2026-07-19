import { timingSafeEqual } from "./timing-safe.ts";

/**
 * Shared-secret gate for internal edge functions invoked server-to-server by
 * pg_cron. See the 2026-07-19 security review.
 *
 * WHY this exists and verify_jwt does not replace it: the Supabase gateway's
 * verify_jwt only checks that *some* valid project JWT is present — and the anon
 * key is a valid JWT that ships in the public web bundle. A verify_jwt=true
 * function is therefore still world-callable. These crons run service-role batch
 * jobs (send user emails, spend LLM tokens), so the real boundary has to be a
 * secret the public never sees: the `x-cron-secret` header, set on each pg_cron
 * job and compared here in constant time.
 *
 * Fails CLOSED: if CRON_SECRET is unset in the function env, every request is
 * rejected. A missing secret must disable the endpoint, never wave callers
 * through (the failure mode this whole change exists to kill).
 *
 * @returns a Response to return immediately when the caller is unauthorized, or
 *          `null` when the request carries the correct secret and may proceed.
 */
export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.error("[cron-auth] CRON_SECRET not set — rejecting (fail closed)");
    return new Response("Service unavailable", { status: 503 });
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!timingSafeEqual(provided, expected)) {
    console.warn("[cron-auth] Missing or invalid x-cron-secret — rejecting");
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
