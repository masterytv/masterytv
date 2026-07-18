/**
 * Assessment batteries — which instruments each program administers.
 *
 * The intake is program-aware: MasteryTV (general) runs the full Core battery
 * plus the adaptive add-on phase, while Relatti (relationship) runs a short,
 * relationship-relevant battery so partners can join quickly. The scorer +
 * report are subset-safe (they only score/transform instruments that have
 * responses), so a battery is just "which instruments, in what order."
 *
 * Resolved from a brand's program slug in /assess; see brand.ts (programSlug).
 */

import type { ProgramId } from "@/lib/platform/brand";
import type { InstrumentDef } from "./core";
import { CORE_INSTRUMENTS, IPIP50, ECR_R_SHORT } from "./core";
import { CSI4 } from "./addons";
import { MONEY_MAPS } from "./money-maps";

export interface BatteryConfig {
  /** Instruments administered, in presentation order. */
  instruments: InstrumentDef[];
  /** Whether the adaptive add-on phase runs after the core battery. */
  enableAddons: boolean;
  /** Rough completion estimate shown on the welcome screen (e.g. "8–12"). */
  estimatedMinutes: string;
}

/**
 * Relatti — attachment (the core of dyadic coaching) + Big Five (drives the
 * archetype/card) + relationship satisfaction. ~66 items, no add-on phase.
 */
export const RELATIONSHIP_BATTERY: BatteryConfig = {
  instruments: [IPIP50, ECR_R_SHORT, CSI4],
  enableAddons: false,
  estimatedMinutes: "8–12",
};

/** MasteryTV — the full 9-instrument Core battery + adaptive add-ons. */
export const CORE_BATTERY: BatteryConfig = {
  instruments: CORE_INSTRUMENTS,
  enableAddons: true,
  estimatedMinutes: "25–35",
};

/**
 * Money — the single Money Maps™ instrument (16 items), no add-on phase. The
 * whole point is a fast, in-chat-adjacent quiz that reaches the reveal quickly
 * (MONEY_EXPERIENCE.md §6), not a 30-item wall. Deterministic money scoring
 * (Map means → archetype → LEAP band) is a separate leaf (scripts/money-maps-scoring.mjs).
 */
export const MONEY_MAPS_BATTERY: BatteryConfig = {
  instruments: [MONEY_MAPS],
  enableAddons: false,
  estimatedMinutes: "3–4",
};

/**
 * Battery per program. Record<ProgramId,…> on purpose (TENANCY_AUDIT T2): a
 * new vertical fails the typecheck here until its battery is declared, instead
 * of silently administering the 66-item Core battery.
 */
const BATTERIES: Record<ProgramId, BatteryConfig> = {
  general: CORE_BATTERY,
  relationship: RELATIONSHIP_BATTERY,
  money: MONEY_MAPS_BATTERY,
};

/** Resolve the battery for a program slug (brand.programSlug). */
export function getBattery(programSlug: ProgramId): BatteryConfig {
  return BATTERIES[programSlug];
}
