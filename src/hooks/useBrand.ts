"use client";

/**
 * useBrand — client-side brand resolution for the dashboard chrome.
 *
 * The dashboard layout + sidebar are client components, so they can't use the
 * server getBrand(). This resolves the brand the same way everywhere, with the
 * same precedence as middleware/getBrand: ?brand= override > brand cookie >
 * data-brand attribute (set by the inline script) > host > default.
 *
 * Reads in a useEffect (not the initial state) to avoid a hydration mismatch:
 * SSR + first client render use the default, then it re-resolves on mount.
 */
import { useEffect, useState } from "react";
import { resolveBrand, isBrandId, BRANDS, DEFAULT_BRAND_ID, type Brand } from "@/lib/platform/brand";

function resolveClient(): Brand {
  if (typeof window === "undefined") return BRANDS[DEFAULT_BRAND_ID];
  const url = new URLSearchParams(window.location.search).get("brand");
  if (isBrandId(url)) return BRANDS[url];
  const m = document.cookie.match(/(?:^|; )brand=([^;]+)/);
  const cookie = m ? decodeURIComponent(m[1]) : null;
  if (isBrandId(cookie)) return BRANDS[cookie];
  const attr = document.documentElement.dataset.brand;
  if (isBrandId(attr)) return BRANDS[attr];
  return resolveBrand(window.location.hostname);
}

export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(BRANDS[DEFAULT_BRAND_ID]);
  useEffect(() => {
    setBrand(resolveClient());
  }, []);
  return brand;
}
