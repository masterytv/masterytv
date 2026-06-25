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

import type { InstrumentDef } from "./core";
import { CORE_INSTRUMENTS, IPIP50, ECR_R_SHORT } from "./core";
import { CSI4 } from "./addons";

export interface BatteryConfig {
  /** Instruments administered, in presentation order. */
  instruments: InstrumentDef[];
  /** Whether the adaptive add-on phase runs after the core battery. */
  enableAddons: boolean;
  /** Rough completion estimate shown on the welcome screen (e.g. "8–12"). */
  estimatedMinutes: string;
  /** Relationship-framed intro copy (dimensions, consent wording). */
  relationshipMode: boolean;
}

/**
 * Relatti — attachment (the core of dyadic coaching) + Big Five (drives the
 * archetype/card) + relationship satisfaction. ~66 items, no add-on phase.
 */
export const RELATIONSHIP_BATTERY: BatteryConfig = {
  instruments: [IPIP50, ECR_R_SHORT, CSI4],
  enableAddons: false,
  estimatedMinutes: "8–12",
  relationshipMode: true,
};

/** MasteryTV — the full 9-instrument Core battery + adaptive add-ons. */
export const CORE_BATTERY: BatteryConfig = {
  instruments: CORE_INSTRUMENTS,
  enableAddons: true,
  estimatedMinutes: "25–35",
  relationshipMode: false,
};

/** Resolve the battery for a program slug (brand.programSlug). */
export function getBattery(programSlug: string): BatteryConfig {
  return programSlug === "relationship" ? RELATIONSHIP_BATTERY : CORE_BATTERY;
}
