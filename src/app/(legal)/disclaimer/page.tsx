import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import { LEGAL_CONTACT } from "@/lib/platform/legal";
import MasteryDisclaimer from "../_content/MasteryDisclaimer";
import RelattiDisclaimer from "../_content/RelattiDisclaimer";

interface PageProps {
  searchParams: Promise<{ brand?: string }>;
}

/**
 * AI & Coaching Disclaimer — brand-aware (E15.5). The standing, plain-language
 * disclaimer referenced from signup, the footer, and (for Relatti) the coach.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const brand = await getBrandFromRequest((await searchParams).brand);
  const { product } = LEGAL_CONTACT[brand.id];
  return brandPageMetadata(brand.id, {
    title: `AI & Coaching Disclaimer — ${product}`,
    description: `What ${product} is — and is not. AI coaching, not professional or crisis care.`,
  });
}

export default async function DisclaimerPage({ searchParams }: PageProps) {
  const brand = await getBrandFromRequest((await searchParams).brand);
  return brand.id === "relatti" ? <RelattiDisclaimer /> : <MasteryDisclaimer />;
}
