"use client";

/**
 * Client hook: the set of enabled modules for the current brand (PA4).
 *
 * Reads data-brand from <html> (set FOUC-free by the inline script in
 * layout.tsx). SSR + first render use the MasteryTV default; the effect
 * re-resolves on mount. For masterytv.com this is always masterytv, so nav
 * is identical to today; a non-default brand re-resolves after mount.
 */
import { useEffect, useState } from "react";
import { type BrandId, DEFAULT_BRAND_ID, BRANDS } from "@/lib/platform/brand";
import { modulesForBrand, type ModuleId } from "@/lib/platform/modules";

export function useBrandModules(): Set<ModuleId> {
  const [modules, setModules] = useState<Set<ModuleId>>(() =>
    modulesForBrand(DEFAULT_BRAND_ID)
  );

  useEffect(() => {
    const raw = document.documentElement.dataset.brand;
    const brandId: BrandId = raw && raw in BRANDS ? (raw as BrandId) : DEFAULT_BRAND_ID;
    setModules(modulesForBrand(brandId));
  }, []);

  return modules;
}
