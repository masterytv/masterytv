/**
 * Coach Pack registry (PC4.2, typed per TENANCY_AUDIT.md T1+T2).
 *
 * THE one place the `program` string is interpreted. Everything downstream
 * receives a CoachPack and never asks "which vertical am I?" again.
 *
 * PC4.4 (shipped): the `program` string arriving here is already
 * spine-resolved — `_shared/resolve-program.ts` derives it from engagement
 * membership / participant rows / signup_brand and demotes the client string
 * to a validated tie-breaker hint. Junk strings resolve to NULL (executive)
 * BEFORE they reach resolvePack. A non-null string that is neither program is
 * therefore a NEW VERTICAL arriving without a pack — that must FAIL LOUDLY,
 * not silently coach as the executive (the failure mode that motivated the
 * tenancy audit: career users getting the executive persona with zero errors).
 *
 * ⚠️ LOCKSTEP TWIN: src/lib/platform/brand.ts declares the same ProgramId
 * union (edge functions can't import from src/). Add new programs in BOTH.
 */

import type { CoachPack, PackPromptContext } from "./types.ts";
import { executivePack } from "./executive-pack.ts";
import { relationshipPack } from "./relationship-pack.ts";
import { moneyPack } from "./money-pack.ts";

export type { CoachPack, PackPromptContext };
export { executivePack, relationshipPack, moneyPack };

export type ProgramId = "general" | "relationship" | "money" | "integration";

/**
 * Adding a program to the union makes this Record a COMPILE ERROR until the
 * vertical's pack is registered — the exhaustive-registry discipline the
 * brand axis already had (11 Record<BrandId,…> maps) applied to the program
 * axis, where a new vertical actually arrives.
 */
const PACKS: Record<ProgramId, CoachPack | null> = {
  general: executivePack,
  relationship: relationshipPack,
  money: moneyPack,
  // Integration — REGISTERED, NOT BUILT (INTEGRATION_SPRINT.md §3 / I4.1).
  //
  // `null` on purpose, and it is load-bearing. The program axis has to carry
  // this slug now (I2) so every exhaustive Record in the codebase is forced to
  // declare its integration behaviour, but the PACK itself must not exist yet:
  // §3 puts the safety kernel (I3) ahead of the pack deliberately, because the
  // memory-write filter governs what a pack is allowed to store and a narrative
  // that has ratcheted through months of stored facts cannot be un-ratcheted.
  //
  // A stub persona here would be worse than nothing — it would resolve, speak,
  // and write memory in whatever voice the placeholder happened to carry. So
  // null keeps `resolvePack` failing LOUDLY, exactly as an unregistered program
  // used to, while the type system still forces this line to be written by hand.
  //
  // Unreachable today by construction, verified rather than assumed:
  // `KNOWN_PROGRAM_HINTS` in resolve-program.ts is its own explicit set and does
  // not contain "integration", and no `signup_brand` case yields it. I4.5 adds
  // those, and it lands after I3 and I4.1.
  integration: null,
};

/**
 * Normalize a resolved-program value to a registered ProgramId.
 * null/undefined/"" → "general" (the PC4.4 resolved-null contract: no signal
 * means the executive default). An UNRECOGNIZED non-null string throws —
 * that's a vertical without a pack, and a wrong coach persona speaking to a
 * real user is strictly worse than a visible error.
 */
export function normalizeProgram(program: string | null | undefined): ProgramId {
  if (program == null || program === "") return "general";
  const p = program.toLowerCase();
  if (p in PACKS) return p as ProgramId;
  throw new Error(
    `Unknown program '${program}' — register its Coach Pack in _shared/packs/index.ts (and the ProgramId twin in src/lib/platform/brand.ts)`,
  );
}

export function resolvePack(program: string | null | undefined): CoachPack {
  const id = normalizeProgram(program);
  const pack = PACKS[id];
  if (!pack) {
    throw new Error(
      `Program '${id}' is registered on the program axis but has no Coach Pack yet — build it before routing anyone to this vertical's coach (_shared/packs/${id}-pack.ts)`,
    );
  }
  return pack;
}

/**
 * The `assessments.program` / `assessment_reports.program` VALUE to filter on
 * (PC2.1e). Shares normalizeProgram with resolvePack BY CONSTRUCTION — the
 * pack the coach speaks with and the data it reads must describe the same
 * world (they were previously twin ternaries that merely happened to agree).
 *
 * Why not raw `.eq("program", program)`: program is nullable upstream (PC4.4)
 * but the DB columns are NOT NULL — a null filters `IS NULL` and matches
 * NOTHING, silently losing the user's assessment.
 */
export function programScope(program: string | null | undefined): ProgramId {
  return normalizeProgram(program);
}
