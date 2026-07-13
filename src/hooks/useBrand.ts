"use client";

/**
 * useBrand — client-side brand resolution for the dashboard chrome.
 *
 * The dashboard layout + sidebar are client components, so they can't use the
 * server getBrand(). This resolves the brand the same way everywhere, with the
 * same precedence as middleware/getBrand: ?brand= override > host > brand
 * cookie (LOCALHOST ONLY — retired on deployed hosts 2026-07-14) > default.
 *
 * Reads in a useEffect (not the initial state) to avoid a hydration mismatch:
 * SSR + first client render use the default, then it re-resolves on mount.
 */
import { useEffect, useState } from "react";
import { resolveBrandId, BRANDS, DEFAULT_BRAND_ID, type Brand } from "@/lib/platform/brand";

/**
 * Synchronous client-side brand resolution via the shared rule. Reads the host
 * directly (not the data-brand attribute, which defaults to "masterytv" in SSR
 * and would mislead the chrome if the inline script lagged), so a dedicated
 * brand host is always authoritative.
 */
export function resolveBrandClient(): Brand {
  if (typeof window === "undefined") return BRANDS[DEFAULT_BRAND_ID];
  const param = new URLSearchParams(window.location.search).get("brand");
  const m = document.cookie.match(/(?:^|; )brand=([^;]+)/);
  const cookie = m ? decodeURIComponent(m[1]) : null;
  return BRANDS[resolveBrandId({ host: window.location.hostname, param, cookie })];
}

export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(BRANDS[DEFAULT_BRAND_ID]);
  useEffect(() => {
    setBrand(resolveBrandClient());
  }, []);
  return brand;
}
