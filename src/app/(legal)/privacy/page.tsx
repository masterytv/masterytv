import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import { byBrand } from "@/lib/platform/brand";
import { LEGAL_CONTACT } from "@/lib/platform/legal";
import MasteryPrivacy from "../_content/MasteryPrivacy";
import RelattiPrivacy from "../_content/RelattiPrivacy";
import MoneyPrivacy from "../_content/MoneyPrivacy";

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
  // byBrand, not a ternary: serving another brand's PRIVACY POLICY silently is
  // the worst version of the fallback bug — a new brand must fail the build
  // here until its own legal text exists.
  return byBrand({ relatti: <RelattiPrivacy />, masterytv: <MasteryPrivacy />, money: <MoneyPrivacy /> }, brand.id);
}
