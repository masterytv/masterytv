import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import RelattiWhyAI from "../_content/RelattiWhyAI";

interface PageProps {
  searchParams: Promise<{ brand?: string }>;
}

/**
 * /why-ai — honest objection-handling for people wary of AI coaching.
 * Relatti-only content; on the MasteryTV brand this route bounces home.
 * Lives in the (legal) route group for its brand-aware info-page chrome.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const brand = await getBrandFromRequest((await searchParams).brand);
  if (brand.id !== "relatti") return { title: "Why AI" };
  return {
    title: "Why an AI Coach? — Honest Answers to Fair Questions | Relatti",
    description:
      "Shouldn't we just see a therapist? Is it safe? Where does what I share go? The real objections to AI relationship coaching, answered plainly — including what an AI can't do.",
  };
}

export default async function WhyAIPage({ searchParams }: PageProps) {
  const brand = await getBrandFromRequest((await searchParams).brand);
  if (brand.id !== "relatti") redirect("/");
  return <RelattiWhyAI />;
}
