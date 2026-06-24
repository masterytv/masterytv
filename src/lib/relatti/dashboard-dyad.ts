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

export interface DyadConsent {
  /** The dyad's invite row — the target for the invite-consent API (PB2.3). */
  inviteId: string;
  /** Current shared coach-visibility level: none | type_compatibility | full. */
  shareLevel: string;
}

/**
 * Resolve the consent target for a dyad (PB2.3): the source invite + its current
 * shared coach-visibility level. Editing it goes through /api/decoded/invite-
 * consent, which dual-writes to the participant spine. Readable via the user's
 * own RLS (they're a party to the invite).
 */
export async function getDyadConsent(
  supabase: SupabaseClient,
  engagementId: string
): Promise<DyadConsent | null> {
  const { data: eng } = await supabase
    .from("engagement")
    .select("source_invite_id")
    .eq("id", engagementId)
    .maybeSingle();

  const inviteId = eng?.source_invite_id as string | undefined;
  if (!inviteId) return null;

  const { data: invite } = await supabase
    .from("decoded_invites")
    .select("id, share_with_coach")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) return null;
  return { inviteId: invite.id as string, shareLevel: (invite.share_with_coach as string) ?? "none" };
}

export interface DyadStreak {
  /** Consecutive weeks (current run) the couple has been active. 0 = none/broken. */
  streakWeeks: number;
  /** ISO date of the partner's most recent activity, or null. */
  partnerLastActive: string | null;
}

/**
 * Shared dyad streak (E8). Reads engagement_activity (both partners' rows, via
 * the engagement-shared RLS) and computes a current weekly streak + the
 * partner's last-active date. Privacy-safe — activity dates only, no content.
 */
export async function getDyadStreak(
  supabase: SupabaseClient,
  engagementId: string,
  userId: string
): Promise<DyadStreak> {
  const { data } = await supabase
    .from("engagement_activity")
    .select("user_id, activity_date")
    .eq("engagement_id", engagementId)
    .order("activity_date", { ascending: false })
    .limit(400);

  const rows = data ?? [];
  if (rows.length === 0) return { streakWeeks: 0, partnerLastActive: null };

  const partnerLastActive =
    (rows.find((r) => r.user_id !== userId)?.activity_date as string | undefined) ?? null;

  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const weekStart = (d: string): number => {
    const dt = new Date(d + "T00:00:00Z");
    const mondayOffset = (dt.getUTCDay() + 6) % 7; // Mon = 0
    dt.setUTCDate(dt.getUTCDate() - mondayOffset);
    dt.setUTCHours(0, 0, 0, 0);
    return dt.getTime();
  };

  const weeks = [...new Set(rows.map((r) => weekStart(r.activity_date as string)))].sort(
    (a, b) => b - a
  );
  const nowWeek = weekStart(new Date().toISOString().slice(0, 10));
  // Streak is "current" only if the latest active week is this or last week.
  if (weeks[0] < nowWeek - WEEK) return { streakWeeks: 0, partnerLastActive };

  let streak = 0;
  let cursor = weeks[0];
  for (const w of weeks) {
    if (w === cursor) {
      streak++;
      cursor -= WEEK;
    } else {
      break;
    }
  }
  return { streakWeeks: streak, partnerLastActive };
}
