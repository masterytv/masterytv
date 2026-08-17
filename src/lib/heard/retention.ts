/**
 * How long an unclaimed anonymous HEARD session survives after its last
 * activity. Founder call, 2026-08-13.
 *
 * 🔑 This is the number the COPY says. The rule that enforces it lives in
 * `supabase/migrations/20260813190000_anonymous_retention.sql`
 * (`sweep_stale_anonymous_users`, run daily by pg_cron), and nothing can check
 * the two against each other — a TS constant cannot reach SQL. Change both.
 *
 * It is said out loud, on the box and in the "Keep this conversation" strip,
 * because the people it applies to have given no email and so cannot be warned
 * before it happens. A deletion nobody can be notified of has to be announced
 * up front or not made.
 */
export const ANONYMOUS_RETENTION_DAYS = 14;
