/**
 * Coach Pack registry (PC4.2).
 *
 * THE one place the `program` string is interpreted. Everything downstream
 * receives a CoachPack and never asks "which vertical am I?" again.
 *
 * PC4.4 (shipped): the `program` string arriving here is already
 * spine-resolved — `_shared/resolve-program.ts` derives it from engagement
 * membership / participant rows / signup_brand and demotes the client string
 * to a validated tie-breaker hint. Junk strings resolve to null (executive)
 * BEFORE they reach resolvePack, so the mapping below stays a pure lookup.
 */

import type { CoachPack, PackPromptContext } from "./types.ts";
import { executivePack } from "./executive-pack.ts";
import { relationshipPack } from "./relationship-pack.ts";

export type { CoachPack, PackPromptContext };
export { executivePack, relationshipPack };

export function resolvePack(program: string | null | undefined): CoachPack {
  return (program ?? "").toLowerCase() === "relationship"
    ? relationshipPack
    : executivePack;
}

/**
 * The same mapping as resolvePack, but yielding the `assessments.program` /
 * `assessment_reports.program` VALUE to filter on (PC2.1e).
 *
 * Why this exists: `program` is nullable everywhere upstream (PC4.4 resolves
 * junk and no-signal to null rather than guessing), but the DB column is NOT
 * NULL and defaults to 'general'. A raw `.eq("program", program)` with a null
 * therefore filters `program IS NULL` and matches NOTHING — the coach would
 * silently lose the user's assessment instead of falling back to executive.
 *
 * Keeping it beside resolvePack is deliberate: this file is THE one place the
 * program string is interpreted, and these two must never disagree — the pack
 * the coach speaks with and the data it reads have to describe the same world.
 */
export function programScope(program: string | null | undefined): string {
  return (program ?? "").toLowerCase() === "relationship"
    ? "relationship"
    : "general";
}
