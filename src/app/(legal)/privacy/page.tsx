import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import { LEGAL_CONTACT } from "@/lib/platform/legal";
import MasteryPrivacy from "../_content/MasteryPrivacy";
import RelattiPrivacy from "../_content/RelattiPrivacy";

interface PageProps {
  searchParams: Promise<{ brand?: string }>;
}

/**
 * Privacy Policy — brand-aware (E15.5). Relatti gets its relationship-coaching
 * policy (sensitive + third-party data, couples sharing, safety escalation);
 * MasteryTV keeps the original executive-coaching policy. Brand resolves from
 * host / cookie / ?brand= (getBrandFromRequest).
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const brand = await getBrandFromRequest((await searchParams).brand);
  const { product } = LEGAL_CONTACT[brand.id];
  return brandPageMetadata(brand.id, {
    title: `Privacy Policy — ${product}`,
    description: `How ${product} collects, uses, and protects your personal information.`,
  });
}

export default async function PrivacyPage({ searchParams }: PageProps) {
  const brand = await getBrandFromRequest((await searchParams).brand);
  return brand.id === "relatti" ? <RelattiPrivacy /> : <MasteryPrivacy />;
}
