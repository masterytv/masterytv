/**
 * Module registry (PLATFORM_ARCHITECTURE.md §7).
 *
 * Capabilities are toggleable per vertical, not hardcoded. A program enables a
 * set of modules; nav + (later) routes check membership. This is the discipline
 * that keeps one codebase from rotting into per-brand conditionals.
 *
 * Pure + edge-safe (no next/headers). Source of truth will later be
 * program.config.modules in the DB; for now it's this code map.
 */
import { type BrandId, BRANDS } from "./brand";

export type ModuleId =
  // Core — every vertical has these
  | "assessment"
  | "coach"
  | "report"
  | "settings"
  // MasteryTV (general) extras
  | "compatibility"
  | "commitments"
  | "progress"
  | "coaching_letters"
  // Relationship (Relatti)
  | "partner_invite"
  | "dyad"
  | "blueprint";

const CORE: ModuleId[] = ["assessment", "coach", "report", "settings"];

/** Enabled modules per program slug. Unknown program falls back to general. */
export const PROGRAM_MODULES: Record<string, ModuleId[]> = {
  general: [
    ...CORE,
    "compatibility",
    "commitments",
    "progress",
    "coaching_letters",
    "partner_invite",
  ],
  relationship: [
    ...CORE,
    "partner_invite",
    "dyad",
    "blueprint",
    "compatibility",
    // commitments / progress / coaching_letters intentionally OFF (PRD §6 / founder)
  ],
};

export function modulesForProgram(programSlug: string): Set<ModuleId> {
  return new Set(PROGRAM_MODULES[programSlug] ?? PROGRAM_MODULES.general);
}

export function modulesForBrand(brandId: BrandId): Set<ModuleId> {
  return modulesForProgram(BRANDS[brandId].programSlug);
}
