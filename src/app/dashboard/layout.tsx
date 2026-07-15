import type { Metadata } from "next";
import { getBrand } from "@/lib/platform/brand.server";
import { brandPageMetadata, brandTitle } from "@/lib/platform/brand-metadata";
import DashboardLayoutClient from "./DashboardLayoutClient";

/**
 * Server shell for the dashboard subtree. Exists so every /dashboard/* page —
 * including "use client" pages, which CANNOT export metadata — gets
 * brand-correct <head> defaults instead of inheriting the root layout's
 * Mastery Coach title/og/icons on relatti.com (BRAND.md §15). Pages that
 * export their own generateMetadata override this per top-level key.
 */
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return brandPageMetadata(brand.id, {
    title: brandTitle(brand.id, "Dashboard"),
    noindex: true,
  });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
