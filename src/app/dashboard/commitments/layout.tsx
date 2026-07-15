import type { Metadata } from "next";
import { getBrand } from "@/lib/platform/brand.server";
import { brandPageMetadata, brandTitle } from "@/lib/platform/brand-metadata";

// Metadata-only layout: this segment's page is "use client" and client
// components cannot export metadata — without this file the page inherits the
// root layout's Mastery Coach title/og/icons on every brand (BRAND.md §15).
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return brandPageMetadata(brand.id, {
    title: brandTitle(brand.id, "Commitments"),
    noindex: true,
  });
}

export default function CommitmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
