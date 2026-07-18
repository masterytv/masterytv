import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import LoginPanel from "./LoginPanel";
import { getBrand } from "@/lib/platform/brand.server";
import { byBrand } from "@/lib/platform/brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return brandPageMetadata(brand.id, {
    title: byBrand({ relatti: "Sign in — Relatti", masterytv: "Sign in — Mastery Coach", money: "Sign in — Money Maps" }, brand.id),
    noindex: true,
  });
}

interface PageProps {
  searchParams: Promise<{ next?: string; invite?: string; mode?: string }>;
}

/**
 * /login — clean, brand-aware auth entry. Marketing lives on the home page.
 * Authenticated users skip straight to their intended destination.
 */
export default async function LoginPage({ searchParams }: PageProps) {
  const { next, invite, mode } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Open-redirect guard: only honor internal paths.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  if (user) {
    redirect(safeNext ?? (invite ? `/dashboard?invite=${invite}` : "/dashboard"));
  }

  const brand = await getBrand();

  // When arriving from an invite, the dyad link is keyed on an EXACT match
  // between the invitee's signup email and the invite's recipient_email. If we
  // let them free-type the email, a typo (or a different address) silently
  // breaks the dyad with no feedback. So we look up the intended recipient and
  // prefill + lock it. Skip "broadcast" share-links (no specific recipient).
  let prefilledEmail: string | undefined;
  if (invite) {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: inviteRow } = await admin
      .from("decoded_invites")
      .select("recipient_email")
      .eq("id", invite)
      .maybeSingle();
    const email = inviteRow?.recipient_email?.trim().toLowerCase();
    if (email && email !== "broadcast" && email.includes("@")) {
      prefilledEmail = email;
    }
  }

  return (
    <LoginPanel
      brandId={brand.id}
      brandName={brand.name}
      next={safeNext}
      inviteCode={invite}
      prefilledEmail={prefilledEmail}
      initialMode={mode === "signin" ? "signin" : undefined}
    />
  );
}
