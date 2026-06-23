import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getActiveDyad } from "@/lib/relatti/dashboard-dyad";
import BlueprintView from "./BlueprintView";

export const metadata: Metadata = {
  title: "Your Relationship Blueprint — Relatti",
  robots: { index: false, follow: false },
};

/**
 * /dashboard/blueprint (PB3) — the productized Relationship Blueprint.
 *
 * Reads the shared Blueprint from the engagement spine (engagement_artifact,
 * kind=relationship_blueprint) via the user's own RLS — both partners see the
 * same shared artifact. Relationship-framed (the "intimate" lens), not the
 * MasteryTV multi-context compatibility hub. Solo users / no-Blueprint fall
 * back to the dashboard.
 */
export default async function BlueprintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/decoded");

  const dyad = await getActiveDyad(supabase, user.id);
  if (!dyad) redirect("/dashboard");

  const { data: artifact } = await supabase
    .from("engagement_artifact")
    .select("content")
    .eq("engagement_id", dyad.engagementId)
    .eq("kind", "relationship_blueprint")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content = (artifact?.content ?? null) as Record<string, unknown> | null;
  const report = (content?.compatibility_report ?? null) as Record<string, unknown> | null;

  return <BlueprintView partnerName={dyad.partnerName} report={report} />;
}
