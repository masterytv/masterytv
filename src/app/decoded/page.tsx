import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DecodedLanding from "./DecodedLanding";

export const metadata: Metadata = {
  title: "Decoded — Know Yourself. Master Everything.",
  description:
    "A 30-minute personality assessment that reveals your Big Five traits, attachment style, emotional regulation, career interests, and more. Get a personalized coaching report powered by AI.",
  openGraph: {
    title: "Decoded — Deep Personality Assessment",
    description:
      "Discover your personality across 13 scientifically-validated dimensions. Free Core assessment.",
    type: "website",
  },
};

/**
 * /decoded — Landing page with auth gate.
 * Authenticated users are redirected to /decoded/assess.
 * Unauthenticated users see the landing + login form.
 */
export default async function DecodedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Already authenticated → go to unified dashboard
  if (user) {
    redirect("/dashboard");
  }

  return <DecodedLanding />;
}
