/**
 * Relationship resolver — the dashboard's "your relationships" surface.
 *
 * Supersedes the single getActiveDyad() panel: returns EVERY relationship the
 * user is in (a couple can grow into more than one engagement over time), each
 * enriched with both partners' identity, assessment status, and sharing — a
 * simple at-a-glance "where are we both at" card, symmetric for inviter and
 * invitee alike.
 *
 * Reads only shared spine data under the user's own RLS:
 *   • participant rows (readable by both partners) → role, share_level, report_id.
 *   • the source invite (readable by inviter + recipient) → names + report ids.
 * Never reads a partner's private coaching or raw assessment answers.
 *
 * Each person's assessment status is derived from the SHARED report-id fields
 * (kept current by syncMyReportToSpine on load) since a user can't read the
 * partner's own assessment rows directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDyadStreak, type DyadStreak } from "./dashboard-dyad";

export type AssessmentStatus = "not_started" | "in_progress" | "completed";

export interface PersonStatus {
  name: string;
  isYou: boolean;
  joined: boolean; // has claimed an account on this engagement
  assessment: AssessmentStatus;
  sharedWithCoach: boolean;
  sharedWithPartner: boolean;
}

export interface Relationship {
  engagementId: string;
  status: string; // forming | active | paused | ended
  partnerJoined: boolean;
  /** Partner deleted their account: engagement tombstoned, no partner row left. */
  partnerDeparted: boolean;
  me: PersonStatus;
  partner: PersonStatus;
  hasBlueprint: boolean;
  streak: DyadStreak | null;
}

// A level exposes the profile at 'full' or 'type_compatibility'; 'none' exposes
// nothing. The two axes are independent: the coach badge reads the per-person
// coach axis (coach_share_level), the partner badge reads the negotiated partner
// axis (share_level). (They used to derive from one shared value — that made a
// user who set their coach to Private still show "With coach".)
function isSharing(level: string | null | undefined): boolean {
  return level === "full" || level === "type_compatibility";
}

interface ParticipantRow {
  engagement_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  share_level: string | null;
  coach_share_level: string | null;
  report_id: string | null;
}

interface InviteRow {
  id: string;
  inviter_name: string | null;
  inviter_email: string | null;
  inviter_report_id: string | null;
  recipient_email: string | null;
  recipient_report_id: string | null;
}

function emailName(email: string | null | undefined): string | null {
  return email ? email.split("@")[0] : null;
}

/**
 * Resolve every relationship the user is in, with both partners' status.
 * `myState` is the user's own (authoritative) assessment state from the page.
 */
export async function getRelationships(
  supabase: SupabaseClient,
  userId: string,
  myState: AssessmentStatus
): Promise<Relationship[]> {
  // 1. My participant rows in dyads I can act in.
  const { data: myParts, error } = await supabase
    .from("participant")
    .select("engagement_id, role, engagement:engagement_id(id, kind, status, source_invite_id, created_at, metadata)")
    .eq("user_id", userId)
    .in("status", ["active", "consented"]);

  if (error) console.error("[relationships] myParts error:", error.message);
  if (!myParts || myParts.length === 0) return [];

  const myDyads = myParts
    .map((p) => {
      const eng = Array.isArray(p.engagement) ? p.engagement[0] : p.engagement;
      return { myRole: p.role as string, eng: eng as { id: string; kind: string; status: string; source_invite_id: string | null; created_at: string; metadata: Record<string, unknown> | null } | null };
    })
    .filter((d) => d.eng?.kind === "relationship_dyad" && d.eng);

  if (myDyads.length === 0) return [];

  const engagementIds = myDyads.map((d) => d.eng!.id);
  const inviteIds = myDyads.map((d) => d.eng!.source_invite_id).filter((x): x is string => !!x);

  // 2. All participants for these engagements (both partners) + the source invites.
  const [{ data: allParts }, { data: invites }] = await Promise.all([
    supabase
      .from("participant")
      .select("engagement_id, user_id, invited_email, role, share_level, coach_share_level, report_id")
      .in("engagement_id", engagementIds),
    inviteIds.length > 0
      ? supabase
          .from("decoded_invites")
          .select("id, inviter_name, inviter_email, inviter_report_id, recipient_email, recipient_report_id")
          .in("id", inviteIds)
      : Promise.resolve({ data: [] as InviteRow[] }),
  ]);

  const partsByEng = new Map<string, ParticipantRow[]>();
  for (const p of (allParts ?? []) as ParticipantRow[]) {
    const list = partsByEng.get(p.engagement_id) ?? [];
    list.push(p);
    partsByEng.set(p.engagement_id, list);
  }
  const inviteById = new Map<string, InviteRow>();
  for (const inv of (invites ?? []) as InviteRow[]) inviteById.set(inv.id, inv);

  // 3. Blueprint existence (one grouped query).
  const { data: blueprints } = await supabase
    .from("engagement_artifact")
    .select("engagement_id")
    .in("engagement_id", engagementIds)
    .eq("kind", "relationship_blueprint");
  const hasBlueprintSet = new Set((blueprints ?? []).map((b) => b.engagement_id as string));

  const relationships: Relationship[] = [];

  for (const d of myDyads) {
    const eng = d.eng!;
    const parts = partsByEng.get(eng.id) ?? [];
    const mine = parts.find((p) => p.user_id === userId) ?? parts.find((p) => p.role === d.myRole);
    const partner = parts.find((p) => p.role !== d.myRole);
    if (!mine) continue;

    // Partner deleted their account: delete-user-data removed their participant
    // row but left a PII-free tombstone on the engagement, so we surface a
    // "your partner left" notice instead of the relationship silently vanishing.
    // Cleared once the survivor dismisses it.
    const meta = (eng.metadata ?? {}) as Record<string, unknown>;
    const partnerDeparted = meta.partner_departed === true && meta.partner_departed_dismissed !== true;
    if (!partner) {
      if (partnerDeparted) {
        relationships.push({
          engagementId: eng.id,
          status: eng.status,
          partnerJoined: false,
          partnerDeparted: true,
          me: {
            name: "You",
            isYou: true,
            joined: true,
            assessment: myState,
            sharedWithCoach: isSharing(mine.coach_share_level),
            sharedWithPartner: isSharing(mine.share_level),
          },
          partner: {
            name: "your partner",
            isYou: false,
            joined: false,
            assessment: "not_started",
            sharedWithCoach: false,
            sharedWithPartner: false,
          },
          hasBlueprint: hasBlueprintSet.has(eng.id),
          streak: null,
        });
      }
      continue;
    }
    // Only surface a card once the partner has an account — pending/unaccepted
    // invites stay in the "invite your partner" prompt, not as waiting cards.
    if (!partner.user_id) continue;

    const invite = eng.source_invite_id ? inviteById.get(eng.source_invite_id) : undefined;

    // Partner identity — from the invite (the only place a name lives pre-claim).
    // If I'm the inviter (self), my partner is the recipient; vice-versa.
    let partnerName = "your partner";
    if (d.myRole === "self") {
      partnerName = emailName(partner.invited_email) || emailName(invite?.recipient_email) || "your partner";
    } else {
      partnerName = invite?.inviter_name || emailName(invite?.inviter_email) || "your partner";
    }

    // Assessment status from shared report-id fields (kept current on load).
    const partnerReport =
      partner.report_id ||
      (partner.role === "self" ? invite?.inviter_report_id : invite?.recipient_report_id) ||
      null;
    const partnerJoined = !!partner.user_id;
    const partnerAssessment: AssessmentStatus = partnerReport
      ? "completed"
      : partnerJoined
        ? "in_progress"
        : "not_started";

    relationships.push({
      engagementId: eng.id,
      status: eng.status,
      partnerJoined,
      partnerDeparted: false,
      me: {
        name: "You",
        isYou: true,
        joined: true,
        assessment: myState,
        sharedWithCoach: isSharing(mine.coach_share_level),
        sharedWithPartner: isSharing(mine.share_level),
      },
      partner: {
        name: partnerName,
        isYou: false,
        joined: partnerJoined,
        assessment: partnerAssessment,
        // The coach axis (coach_share_level) is private + unilateral — how much of
        // their OWN profile the partner lets THEIR coach use. It's not the user's to
        // see, so we never surface it AND never ship the real value to the client.
        // Only "With partner" (the negotiated, mutually-agreed axis) belongs here.
        sharedWithCoach: false,
        sharedWithPartner: isSharing(partner.share_level),
      },
      hasBlueprint: hasBlueprintSet.has(eng.id),
      streak: await getDyadStreak(supabase, eng.id, userId),
    });
  }

  // Active first, then most engaged (has blueprint), then partner-joined.
  relationships.sort((a, b) => {
    const aw = (a.status === "active" ? 2 : 0) + (a.partnerJoined ? 1 : 0);
    const bw = (b.status === "active" ? 2 : 0) + (b.partnerJoined ? 1 : 0);
    return bw - aw;
  });

  return relationships;
}
