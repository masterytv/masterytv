import type { Metadata } from "next";
import { relattiPageMetadata } from "@/lib/platform/brand-metadata";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import BetaOffer from "./BetaOffer";

interface PageProps {
  searchParams: Promise<{ code?: string; brand?: string }>;
}

/**
 * /beta — the public beta offer page (the front door for testers).
 *
 * Share it as relatti.com/beta?code=XXXX: the code rides the link so nobody
 * types or remembers anything. The page makes the offer, collects the BEFORE
 * check-in up front, and stores {code + answers} in a browser cookie that
 * survives signup + assessment; the dashboard then auto-redeems the moment
 * their assessment is done (see dashboard/page.tsx). Signed-in visitors
 * unlock immediately. Relatti-only; MasteryTV bounces home.
 */
export const metadata: Metadata = relattiPageMetadata({
  title: "Join the Relatti Beta — Free Relationship Coaching",
  description:
    "Free unlimited relationship coaching during the beta. In exchange: two 2-minute check-ins that tell us whether it's working.",
});

export default async function BetaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const brand = await getBrandFromRequest(params.brand);
  if (brand.id !== "relatti") redirect("/");
  // A code seen on ANY marketing link (?code= on /, /relatti, /challenge, …)
  // is persisted to the beta_code cookie by the middleware — so a visitor who
  // wandered the site before hitting a CTA still lands here with their code.
  // An explicit ?code= on this URL always wins.
  const cookieCode = (await cookies()).get("beta_code")?.value ?? "";
  return <BetaOffer initialCode={(params.code ?? "").trim() || cookieCode.trim()} />;
}
