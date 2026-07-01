import type { Metadata } from "next";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import { LEGAL_CONTACT } from "@/lib/platform/legal";
import MasteryTerms from "../_content/MasteryTerms";
import RelattiTerms from "../_content/RelattiTerms";

interface PageProps {
  searchParams: Promise<{ brand?: string }>;
}

/**
 * Terms of Service — brand-aware (E15.5). Relatti gets its relationship-coaching
 * terms (not-therapy / not-a-crisis-service disclaimers, arbitration, indemnity
 * for third-party data); MasteryTV keeps the original executive terms.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const brand = await getBrandFromRequest((await searchParams).brand);
  const { product } = LEGAL_CONTACT[brand.id];
  return {
    title: `Terms of Service — ${product}`,
    description: `Terms and conditions for using the ${product} platform.`,
  };
}

export default async function TermsPage({ searchParams }: PageProps) {
  const brand = await getBrandFromRequest((await searchParams).brand);
  return brand.id === "relatti" ? <RelattiTerms /> : <MasteryTerms />;
}
