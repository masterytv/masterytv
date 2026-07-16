/**
 * Edge-side brand registry (TENANCY_AUDIT.md T4).
 *
 * Replaces the six per-function `program === "relationship" ? "relatti" :
 * "masterytv"` ternaries that silently sent a NEW vertical MasteryTV-branded
 * email (off-platform, where no build gate can see it). One registry, derived
 * lookups, and Record<BrandId,…> exhaustiveness — adding a brand without
 * declaring its edge identity is a compile error, not an 8am mis-branded
 * briefing.
 *
 * ⚠️ LOCKSTEP TWIN: src/lib/platform/brand.ts is the app-side registry (edge
 * functions can't import from src/). Add new brands in BOTH. ProgramId comes
 * from packs/index.ts so brand resolution and pack resolution can never
 * disagree about what a program string means.
 */

import { normalizeProgram, type ProgramId } from "./packs/index.ts";

export type BrandId = "masterytv" | "relatti";

export interface EdgeBrand {
  id: BrandId;
  /** program.slug this brand serves (mirror of the src BRANDS registry). */
  programSlug: ProgramId;
  /** Public origin for deep links in proactive email. */
  origin: string;
  /** Coach display name used in email subjects/fallbacks. */
  coachName: string;
  /**
   * Reply-to override for proactive sends. Inbound email processing only
   * exists on mail.masterytv.com today, so Relatti-branded sends route replies
   * there to keep "just reply" true. Drop once coach@mail.relatti.com has an
   * inbound webhook. undefined = reply-to defaults to the from address.
   */
  replyToOverride?: string;
}

export const EDGE_BRANDS: Record<BrandId, EdgeBrand> = {
  masterytv: {
    id: "masterytv",
    programSlug: "general",
    origin: "https://masterytv.com",
    coachName: "Mastery Coach",
  },
  relatti: {
    id: "relatti",
    programSlug: "relationship",
    origin: "https://relatti.com",
    coachName: "Relatti",
    replyToOverride: "Relatti Coach <coach@mail.masterytv.com>",
  },
};

export function isBrandId(x: unknown): x is BrandId {
  return x === "masterytv" || x === "relatti";
}

/**
 * Program → brand, via the registry. Shares normalizeProgram with resolvePack,
 * so the pack a message is authored with and the brand it's dressed in can
 * never disagree (null → general → masterytv; an unregistered program throws
 * there rather than silently mailing as the incumbent).
 */
export function brandForProgram(program: string | null | undefined): EdgeBrand {
  const id = normalizeProgram(program);
  for (const brand of Object.values(EDGE_BRANDS)) {
    if (brand.programSlug === id) return brand;
  }
  // Unreachable while EDGE_BRANDS covers every ProgramId; the throw keeps the
  // lockstep honest if the twin registries ever drift.
  throw new Error(`No brand serves program '${id}' — add it to EDGE_BRANDS in _shared/brands.ts`);
}
