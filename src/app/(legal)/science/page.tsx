import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { redirect } from "next/navigation";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import RelattiScience from "../_content/RelattiScience";

interface PageProps {
  searchParams: Promise<{ brand?: string }>;
}

/**
 * /science — the evidence page for skeptics, therapists, and researchers.
 * Relatti-only content; on the MasteryTV brand this route bounces home.
 * Lives in the (legal) route group for its brand-aware info-page chrome.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const brand = await getBrandFromRequest((await searchParams).brand);
  if (brand.id !== "relatti") return brandPageMetadata("masterytv", { title: "Science" });
  return brandPageMetadata("relatti", {
    canonical: "/science",
    title: "The Science Behind Relatti — Validated Instruments, EFT & Gottman Research",
    description:
      "The published research Relatti is built on: ECR-R attachment, the Couples Satisfaction Index, EFT and Gottman findings, and the first RCT of a relationship chatbot — plus what the evidence doesn't show yet.",
  });
}

export default async function SciencePage({ searchParams }: PageProps) {
  const brand = await getBrandFromRequest((await searchParams).brand);
  if (brand.id !== "relatti") redirect("/");
  return <RelattiScience />;
}
