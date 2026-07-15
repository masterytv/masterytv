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
  | "coach_voices"
  // Relationship (Relatti)
  | "partner_invite"
  | "dyad"
  | "blueprint"
  | "beta_program";

const CORE: ModuleId[] = ["assessment", "coach", "report", "settings"];

/** Enabled modules per program slug. Unknown program falls back to general. */
export const PROGRAM_MODULES: Record<string, ModuleId[]> = {
  general: [
    ...CORE,
    "compatibility",
    "commitments",
    "progress",
    "coaching_letters",
    "coach_voices",
    "partner_invite",
  ],
  relationship: [
    ...CORE,
    "partner_invite",
    "dyad",
    "blueprint",
    "compatibility",
    "beta_program",
    // commitments / progress / coaching_letters intentionally OFF (PRD §6 / founder).
    // coach_voices OFF: the six voices are executive coach personas; Relatti has
    // one deliberate counselling stance (RELATTI_EXPERIENCE §5.6.1).
  ],
};

/**
 * Route → required module, longest-prefix wins. The middleware enforces this
 * for direct URL access (nav hiding alone is not brand isolation: a dual-brand
 * user can carry a masterytv URL onto relatti.com and vice versa). Keep in
 * sync with the sidebar's nav `module` tags.
 */
export const ROUTE_MODULES: Array<[prefix: string, module: ModuleId]> = [
  ["/dashboard/commitments", "commitments"],
  ["/dashboard/progress", "progress"],
  ["/dashboard/coaching-letter", "coaching_letters"],
  ["/dashboard/compatibility", "compatibility"],
  ["/dashboard/blueprint", "blueprint"],
  ["/dashboard/beta", "beta_program"],
  ["/compatibility", "compatibility"],
];

/** The module a path requires, or null when the path is core/unmapped. */
export function moduleForPath(pathname: string): ModuleId | null {
  for (const [prefix, mod] of ROUTE_MODULES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return mod;
  }
  return null;
}

export function modulesForProgram(programSlug: string): Set<ModuleId> {
  return new Set(PROGRAM_MODULES[programSlug] ?? PROGRAM_MODULES.general);
}

export function modulesForBrand(brandId: BrandId): Set<ModuleId> {
  return modulesForProgram(BRANDS[brandId].programSlug);
}
