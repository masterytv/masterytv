"use client";

/**
 * Client hook: the set of enabled modules for the current brand (PA4).
 *
 * Reads data-brand from <html> (set FOUC-free by the inline script in
 * layout.tsx). SSR + first render use the MasteryTV default; the effect
 * re-resolves on mount. For masterytv.com this is always masterytv, so nav
 * is identical to today; a non-default brand re-resolves after mount.
 */
import { useBrand } from "@/hooks/useBrand";
import { modulesForBrand, type ModuleId } from "@/lib/platform/modules";

export function useBrandModules(): Set<ModuleId> {
  const brand = useBrand();
  return modulesForBrand(brand.id);
}
