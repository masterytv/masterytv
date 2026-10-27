/**
 * The free-tier daily message allowance, per vertical.
 *
 * A single global number was the shipped shape until 2026-08-19, when HEARD
 * needed a larger one: two or three replies is a reasonable trial of a coach
 * you are evaluating, and it is not a reasonable amount of room for somebody
 * describing a near-death experience for the first time. Raising it globally
 * would have handed the other three verticals a pricing change nobody asked
 * for, so the number is per-program instead (founder call).
 *
 * 🔑 Record<ProgramId, …>, never a ternary and never a default branch — the
 * tenancy rule the rest of this codebase follows (see INPUT_CEILING in
 * coach/index.ts, which check:ternaries caught in its ternary form). An
 * else-branch here would silently hand the NEXT vertical whichever number
 * happened to be on the other side.
 *
 * ⚠️ KEY THIS ON THE RESOLVED PROGRAM, NOT THE CLIENT'S HINT. Unlike
 * INPUT_CEILING — where forging a hint buys tokens and nothing else — forging
 * one here would buy free messages, so the caller must pass what
 * resolve-program returned rather than what the request claimed.
 */

import type { ProgramId } from "./packs/index.ts";

export const FREE_TIER_DAILY_LIMIT: Record<ProgramId, number> = {
  general: 5,
  relationship: 5,
  money: 5,
  integration: 10,
};

/**
 * Safe lookup for a resolved program, which is `string | null` at every call
 * site: null is the executive default, and an unregistered slug must not throw
 * (a garbage value should cost somebody the smaller allowance, never a 500).
 */
export function freeTierLimitFor(program: string | null | undefined): number {
  if (program && program in FREE_TIER_DAILY_LIMIT) {
    return FREE_TIER_DAILY_LIMIT[program as ProgramId];
  }
  return FREE_TIER_DAILY_LIMIT.general;
}
