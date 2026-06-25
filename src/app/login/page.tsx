import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LoginPanel from "./LoginPanel";
import { getBrand } from "@/lib/platform/brand.server";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; invite?: string }>;
}

/**
 * /login — clean, brand-aware auth entry. Marketing lives on the home page.
 * Authenticated users skip straight to their intended destination.
 */
export default async function LoginPage({ searchParams }: PageProps) {
  const { next, invite } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Open-redirect guard: only honor internal paths.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  if (user) {
    redirect(safeNext ?? (invite ? `/dashboard?invite=${invite}` : "/dashboard"));
  }

  const brand = await getBrand();

  return <LoginPanel brandId={brand.id} brandName={brand.name} next={safeNext} inviteCode={invite} />;
}
