/**
 * Coach Pack registry (PC4.2).
 *
 * THE one place the `program` string is interpreted. Everything downstream
 * receives a CoachPack and never asks "which vertical am I?" again.
 *
 * PC4.4 will move resolution onto the engagement spine (engagement.kind /
 * workspace) and demote the client `program` string to a validated hint —
 * when that lands, it lands HERE and nowhere else.
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
