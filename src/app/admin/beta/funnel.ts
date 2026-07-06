import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Beta funnel aggregation (server-only, service-role).
 *
 * There are no analytics in the product, so this reconstructs the whole tester
 * funnel — signup → assessment → report → invited → partner claimed → both
 * active — straight from the spine. It runs under the SERVICE ROLE because the
 * funnel spans cross-user tables (participant, messages, ritual_responses) that
 * a partner/admin's own RLS would hide.
 *
 * Privacy: we deliberately read only counts + timestamps from coaching content
 * (messages/rituals select ONLY user_id, created_at — never `content`/`answer`),
 * so no private conversation text is loaded into the admin surface. Feedback IS
 * shown in full — testers wrote it for us on purpose.
 *
 * The dataset is tiny (a ~20-person beta), so we fetch the handful of small
 * tables and stitch them in JS. If message volume ever grows large, move the
 * per-user counts into a SQL function.
 */

export interface FeedbackItem {
  id: string;
  category: string;
  message: string;
  rating: number | null;
  status: string;
  createdAt: string;
}

export interface DyadSummary {
  engagementId: string;
  status: string;
  partnerLabel: string;
  partnerJoined: boolean;
  bothActive: boolean;
}

export interface Tester {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  betaAccess: boolean;
  tier: string | null;
  role: string;
  startedAssessment: boolean;
  hasReport: boolean;
  reportAt: string | null;
  invitesSent: number;
  invitesClaimed: number;
  dyads: DyadSummary[];
  partnerJoined: boolean;
  bothActive: boolean;
  messageCount: number;
  ritualCount: number;
  lastActivity: string | null;
  feedback: FeedbackItem[];
  /** Furthest funnel milestone reached, 0 (signed up) … 5 (both active). */
  stage: number;
}

export interface CohortMetrics {
  testers: number;
  startedAssessment: number;
  completedAssessment: number;
  invitedTesters: number;
  invitesSent: number;
  invitesClaimed: number;
  claimRatePct: number | null;
  dyadsPartnerJoined: number;
  dyadsBothActive: number;
  totalMessages: number;
  totalRituals: number;
  feedbackCount: number;
}

/** Milestone labels, index-aligned with Tester.stage (also used for the funnel bar). */
export const FUNNEL_STAGES = [
  "Signed up",
  "Assessment",
  "Report",
  "Invited",
  "Partner joined",
  "Both active",
] as const;

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export async function getBetaFunnel(
  admin: SupabaseClient,
): Promise<{ testers: Tester[]; metrics: CohortMetrics }> {
  // Fetch the small set of spine tables in parallel. Coaching-content tables
  // (messages, ritual_responses) return ONLY user_id + created_at.
  const [
    usersRes,
    engRes,
    partsRes,
    invitesRes,
    reportsRes,
    progressRes,
    messagesRes,
    ritualsRes,
    feedbackRes,
  ] = await Promise.all([
    admin.from("users").select("id, email, name, created_at, role, beta_access, decoded_tier"),
    admin.from("engagement").select("id, kind, status, metadata").eq("kind", "relationship_dyad"),
    admin.from("participant").select("engagement_id, user_id, invited_email, role, status"),
    admin.from("decoded_invites").select("id, inviter_id, recipient_id, recipient_email, created_at"),
    admin.from("assessment_reports").select("user_id, generated_at, created_at"),
    admin.from("assessment_progress").select("user_id"),
    admin.from("messages").select("user_id, created_at"),
    admin.from("ritual_responses").select("user_id, created_at"),
    admin.from("feedback").select("id, user_id, category, message, rating, status, created_at").order("created_at", { ascending: false }),
  ]);

  const users = (usersRes.data ?? []) as Array<{
    id: string; email: string; name: string | null; created_at: string;
    role: string; beta_access: boolean; decoded_tier: string | null;
  }>;
  const dyadEngIds = new Set((engRes.data ?? []).map((e) => e.id as string));
  const parts = ((partsRes.data ?? []) as Array<{
    engagement_id: string; user_id: string | null; invited_email: string | null; role: string; status: string;
  }>).filter((p) => dyadEngIds.has(p.engagement_id));

  const userById = new Map(users.map((u) => [u.id, u]));

  // ── Per-user rollups ──
  const startedSet = new Set((progressRes.data ?? []).map((r) => r.user_id as string));
  const reportAtByUser = new Map<string, string | null>();
  for (const r of (reportsRes.data ?? []) as Array<{ user_id: string; generated_at: string | null; created_at: string }>) {
    const at = r.generated_at ?? r.created_at;
    reportAtByUser.set(r.user_id, latest(reportAtByUser.get(r.user_id) ?? null, at));
  }

  const invitesSent = new Map<string, number>();
  const invitesClaimed = new Map<string, number>();
  for (const inv of (invitesRes.data ?? []) as Array<{ inviter_id: string | null; recipient_id: string | null }>) {
    if (!inv.inviter_id) continue;
    invitesSent.set(inv.inviter_id, (invitesSent.get(inv.inviter_id) ?? 0) + 1);
    if (inv.recipient_id) invitesClaimed.set(inv.inviter_id, (invitesClaimed.get(inv.inviter_id) ?? 0) + 1);
  }

  const msgCount = new Map<string, number>();
  const msgLast = new Map<string, string | null>();
  for (const m of (messagesRes.data ?? []) as Array<{ user_id: string; created_at: string }>) {
    msgCount.set(m.user_id, (msgCount.get(m.user_id) ?? 0) + 1);
    msgLast.set(m.user_id, latest(msgLast.get(m.user_id) ?? null, m.created_at));
  }
  const ritualCount = new Map<string, number>();
  const ritualLast = new Map<string, string | null>();
  for (const r of (ritualsRes.data ?? []) as Array<{ user_id: string; created_at: string }>) {
    ritualCount.set(r.user_id, (ritualCount.get(r.user_id) ?? 0) + 1);
    ritualLast.set(r.user_id, latest(ritualLast.get(r.user_id) ?? null, r.created_at));
  }

  const feedbackByUser = new Map<string, FeedbackItem[]>();
  for (const f of (feedbackRes.data ?? []) as Array<{
    id: string; user_id: string; category: string; message: string; rating: number | null; status: string; created_at: string;
  }>) {
    const list = feedbackByUser.get(f.user_id) ?? [];
    list.push({ id: f.id, category: f.category, message: f.message, rating: f.rating, status: f.status, createdAt: f.created_at });
    feedbackByUser.set(f.user_id, list);
  }

  // ── Participants grouped by engagement (to find each person's partner) ──
  const partsByEng = new Map<string, typeof parts>();
  for (const p of parts) {
    const list = partsByEng.get(p.engagement_id) ?? [];
    list.push(p);
    partsByEng.set(p.engagement_id, list);
  }
  const myPartsByUser = new Map<string, typeof parts>();
  for (const p of parts) {
    if (!p.user_id) continue;
    const list = myPartsByUser.get(p.user_id) ?? [];
    list.push(p);
    myPartsByUser.set(p.user_id, list);
  }

  function partnerLabel(other: (typeof parts)[number]): string {
    if (other.user_id) {
      const u = userById.get(other.user_id);
      if (u) return u.name || u.email;
    }
    return other.invited_email || "partner";
  }

  const testers: Tester[] = [];
  for (const u of users) {
    if (ADMIN_ROLES.has(u.role)) continue; // admins aren't testers

    const myParts = myPartsByUser.get(u.id) ?? [];
    const dyads: DyadSummary[] = [];
    let partnerJoined = false;
    let bothActive = false;
    for (const mp of myParts) {
      const others = (partsByEng.get(mp.engagement_id) ?? []).filter((x) => x.role !== mp.role);
      const other = others[0];
      const pJoined = !!other?.user_id;
      const active = mp.status === "active" && other?.status === "active";
      if (pJoined) partnerJoined = true;
      if (active) bothActive = true;
      const eng = (engRes.data ?? []).find((e) => e.id === mp.engagement_id);
      dyads.push({
        engagementId: mp.engagement_id,
        status: (eng?.status as string) ?? "—",
        partnerLabel: other ? partnerLabel(other) : "awaiting partner",
        partnerJoined: pJoined,
        bothActive: active,
      });
    }

    const hasReport = reportAtByUser.has(u.id);
    const started = startedSet.has(u.id) || hasReport;
    const sent = invitesSent.get(u.id) ?? 0;
    const inLoop = sent > 0 || dyads.length > 0;

    const stage = Math.max(
      0,
      started ? 1 : 0,
      hasReport ? 2 : 0,
      inLoop ? 3 : 0,
      partnerJoined ? 4 : 0,
      bothActive ? 5 : 0,
    );

    testers.push({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.created_at,
      betaAccess: u.beta_access,
      tier: u.decoded_tier,
      role: u.role,
      startedAssessment: started,
      hasReport,
      reportAt: reportAtByUser.get(u.id) ?? null,
      invitesSent: sent,
      invitesClaimed: invitesClaimed.get(u.id) ?? 0,
      dyads,
      partnerJoined,
      bothActive,
      messageCount: msgCount.get(u.id) ?? 0,
      ritualCount: ritualCount.get(u.id) ?? 0,
      lastActivity: latest(msgLast.get(u.id) ?? null, ritualLast.get(u.id) ?? null),
      feedback: feedbackByUser.get(u.id) ?? [],
      stage,
    });
  }

  // Furthest along first; then most recently active.
  testers.sort((a, b) => b.stage - a.stage || (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));

  // ── Cohort metrics. Invite→claim is measured at the INVITE level (the metric). ──
  const allInvites = (invitesRes.data ?? []) as Array<{ recipient_id: string | null }>;
  const invitesSentTotal = allInvites.length;
  const invitesClaimedTotal = allInvites.filter((i) => i.recipient_id).length;

  let dyadsPartnerJoined = 0;
  let dyadsBothActive = 0;
  for (const [, list] of partsByEng) {
    const joined = list.filter((p) => p.user_id).length >= 2;
    if (joined) dyadsPartnerJoined++;
    if (list.filter((p) => p.status === "active").length >= 2) dyadsBothActive++;
  }

  const metrics: CohortMetrics = {
    testers: testers.length,
    startedAssessment: testers.filter((t) => t.startedAssessment).length,
    completedAssessment: testers.filter((t) => t.hasReport).length,
    invitedTesters: testers.filter((t) => t.invitesSent > 0).length,
    invitesSent: invitesSentTotal,
    invitesClaimed: invitesClaimedTotal,
    claimRatePct: invitesSentTotal > 0 ? Math.round((invitesClaimedTotal / invitesSentTotal) * 100) : null,
    dyadsPartnerJoined,
    dyadsBothActive,
    totalMessages: (messagesRes.data ?? []).length,
    totalRituals: (ritualsRes.data ?? []).length,
    feedbackCount: (feedbackRes.data ?? []).length,
  };

  return { testers, metrics };
}
