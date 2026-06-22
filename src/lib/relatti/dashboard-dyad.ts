/**
 * Dashboard dyad resolver (PB2).
 *
 * Resolves the signed-in user's active relationship dyad from the engagement
 * spine for the LOGGED-IN dashboard surface. Uses the user's own authed client
 * (RLS): a participant can read their engagement, the co-participant, and the
 * shared Blueprint artifact — none of the partner's private coaching data.
 *
 * Returns null when the user has no relationship_dyad engagement, so the
 * dashboard falls back to the standard solo surface (zero change for non-dyad
 * users). This is data-driven, not brand-driven: a couple sees couple UI on any
 * host; brand theming (rose) is applied separately via data-brand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardDyad {
  engagementId: string;
  status: string; // forming | active | paused | ended
  partnerName: string;
  partnerClaimed: boolean; // partner has an account vs. still invited
  partnerShareLevel: string; // none | type_compatibility | full
  hasBlueprint: boolean;
}

export async function getActiveDyad(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardDyad | null> {
  // 1. The user's participant rows in dyads they're active in.
  const { data: myParts } = await supabase
    .from("participant")
    .select("engagement_id, role, engagement:engagement_id(id, kind, status, created_at)")
    .eq("user_id", userId)
    .in("status", ["active", "consented"]);

  if (!myParts || myParts.length === 0) return null;

  const dyads = myParts
    .map((p) => {
      const eng = Array.isArray(p.engagement) ? p.engagement[0] : p.engagement;
      return {
        engagementId: p.engagement_id as string,
        role: p.role as string,
        eng: eng as { id: string; kind: string; status: string; created_at: string } | null,
      };
    })
    .filter((d) => d.eng?.kind === "relationship_dyad");

  if (dyads.length === 0) return null;

  // Prefer active, then most recently created.
  dyads.sort((a, b) => {
    const aA = a.eng?.status === "active" ? 1 : 0;
    const bA = b.eng?.status === "active" ? 1 : 0;
    if (aA !== bA) return bA - aA;
    return (b.eng?.created_at ?? "").localeCompare(a.eng?.created_at ?? "");
  });

  const chosen = dyads[0];
  const engagementId = chosen.engagementId;

  // 2. The partner participant (the other person in this engagement).
  const { data: parts } = await supabase
    .from("participant")
    .select("user_id, invited_email, role, share_level")
    .eq("engagement_id", engagementId);

  const partner = (parts ?? []).find((p) => p.user_id !== userId);
  const partnerName =
    (partner?.invited_email ? partner.invited_email.split("@")[0] : null) || "your partner";

  // 3. Does a shared Blueprint exist?
  const { count } = await supabase
    .from("engagement_artifact")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", engagementId)
    .eq("kind", "relationship_blueprint");

  return {
    engagementId,
    status: chosen.eng?.status ?? "forming",
    partnerName,
    partnerClaimed: !!partner?.user_id,
    partnerShareLevel: (partner?.share_level as string) ?? "none",
    hasBlueprint: (count ?? 0) > 0,
  };
}
