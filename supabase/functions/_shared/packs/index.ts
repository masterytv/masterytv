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
