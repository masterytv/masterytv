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
import { type BrandId, type ProgramId, BRANDS } from "./brand";

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
  | "beta_program"
  // Money (Money Maps) — bespoke primary surfaces (ADR-P03). The routes + nav +
  // ROUTE_MODULES guards for these are the surface leaves (Decision Room / Money
  // OS); the module IDs are reserved here so money's declared capability set is
  // honest and the leaves add the page, not re-touch this union.
  | "decision_room"
  | "money_os";

const CORE: ModuleId[] = ["assessment", "coach", "report", "settings"];

/**
 * Enabled modules per program. Record<ProgramId,…> on purpose (T2): adding a
 * program to the ProgramId union makes this a COMPILE ERROR until the new
 * vertical's module set is declared — no more silent fallback to general
 * (which once shipped MasteryTV's modules on relatti.com).
 */
export const PROGRAM_MODULES: Record<ProgramId, ModuleId[]> = {
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
  money: [
    ...CORE,
    // The bespoke money surfaces (MONEY_EXPERIENCE §8/§9). Enabled here; their
    // routes + sidebar nav + ROUTE_MODULES guards land with the surface leaves.
    "decision_room",
    "money_os",
    // GROW surfaces the money coach earns: it captures commitments on every turn
    // (shared post-processor) and memory (T3 taxonomy), so Commitments + Progress
    // apply (founder request 2026-07-18). Both pages + their metadata layouts are
    // already brand-aware + token-based, so enabling the modules is all it takes —
    // the sidebar nav (module-gated) and the middleware ROUTE_MODULES guards
    // (which already list these prefixes) light up for money automatically.
    "commitments",
    "progress",
    // coaching_letters + coach_voices stay OFF (executive-specific personas); the
    // relationship dyad set stays OFF (money is solo). "cofounder edge comparison"
    // (dyad reused) is a later vertical feature, not V1 core.
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

export function modulesForProgram(programSlug: ProgramId): Set<ModuleId> {
  return new Set(PROGRAM_MODULES[programSlug]);
}

export function modulesForBrand(brandId: BrandId): Set<ModuleId> {
  return modulesForProgram(BRANDS[brandId].programSlug);
}
