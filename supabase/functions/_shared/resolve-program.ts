/**
 * Program resolution — which vertical (Coach Pack) a request belongs to.
 *
 * Extracted from coach/index.ts (P1 fail-open fix) so the email/Telegram path
 * (channel-router) resolves the SAME way the web coach does instead of
 * defaulting every reply to the executive pack.
 *
 * PC4.4: the spine is authoritative and the client `program` string is a
 * validated hint that only breaks ties when the spine is silent:
 *   named engagement (membership-verified)
 *     > any participant membership (engagement.kind / program slug)
 *     > recognized client hint
 *     > users.signup_brand (PC5.2 stamp)
 *     > legacy invite heuristic
 *     > null (executive default — never the raw client string)
 * A stripped or forged hint can therefore never hand a spine-known
 * relationship user the executive persona + business guardrails, and junk
 * program strings never leak into metadata.program stamps.
 */

import type { createSupabaseClient } from "./supabase.ts";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

// Program hints the client may name directly. 'general' = the executive coach
// (the MasteryTV brand sends it explicitly, so Decoded users keep their coach).
// Anything else — including a missing hint — falls through to the spine check,
// so a stripped/forged body can't silently select the executive persona for a
// Relatti user.
export const KNOWN_PROGRAM_HINTS = new Set(["relationship", "general"]);

export async function resolveProgram(
  supabase: SupabaseClient,
  userId: string,
  clientProgram: string | null,
  engagementId: string | null,
): Promise<{ ok: false } | { ok: true; program: string | null }> {
  // 1. An engagement is authoritative — but only if the caller belongs to it.
  //    (Also stops service-role writes to messages/engagement_activity being
  //    attributed to an engagement the caller isn't part of.)
  if (engagementId) {
    const { data: membership } = await supabase
      .from("participant")
      .select("id, engagement:engagement_id(program:program_id(slug))")
      .eq("engagement_id", engagementId)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!membership) return { ok: false };
    const slug = (membership as {
      engagement?: { program?: { slug?: string } | null } | null;
    }).engagement?.program?.slug;
    // Every engagement today is a relationship dyad; default that way if the
    // nested join comes back thin.
    return { ok: true, program: slug ?? "relationship" };
  }

  // 2. Spine membership outranks the hint (PC4.4). Any engagement this user
  //    belongs to decides — a stripped or forged "general" can never hand a
  //    dyad member the executive persona + business guardrails.
  const { data: memberships } = await supabase
    .from("participant")
    .select("engagement:engagement_id(kind, program:program_id(slug))")
    .eq("user_id", userId)
    .limit(1);
  const memberEngagement = (memberships?.[0] as {
    engagement?: {
      kind?: string | null;
      program?: { slug?: string } | null;
    } | null;
  } | undefined)?.engagement;
  if (memberEngagement) {
    // Every engagement today is a relationship dyad; default that way if the
    // nested join comes back thin.
    return { ok: true, program: memberEngagement.program?.slug ?? "relationship" };
  }

  // 3. A recognized client hint is honored when the spine is silent.
  const hint = (clientProgram ?? "").toLowerCase();
  if (KNOWN_PROGRAM_HINTS.has(hint)) {
    return { ok: true, program: hint };
  }

  // 4. Signup brand (PC5.2, stamped at auth) — the spine signal for solo
  //    users with no engagement yet. Closes the last silent-executive path:
  //    a Relatti signup whose client sends no usable hint still resolves to
  //    the relationship pack.
  const { data: userRow } = await supabase
    .from("users")
    .select("signup_brand")
    .eq("id", userId)
    .maybeSingle();
  if (userRow?.signup_brand === "relatti") {
    return { ok: true, program: "relationship" };
  }
  if (userRow?.signup_brand === "masterytv") {
    return { ok: true, program: null };
  }

  // 5. Legacy invite heuristic (pre-signup_brand accounts): involvement in a
  //    Relatti invite means the relationship product.
  const { count: inviteCount } = await supabase
    .from("decoded_invites")
    .select("id", { count: "exact", head: true })
    .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`);
  if ((inviteCount ?? 0) > 0) return { ok: true, program: "relationship" };

  // 6. Executive default — explicit null, never the raw client string.
  return { ok: true, program: null };
}

/**
 * Program resolution for channels with no client hint (email / Telegram),
 * where the CONVERSATION is the strongest signal:
 *   1. The latest program-stamped coach message in the conversation (the web
 *      coach and the proactive crons stamp `metadata.program` at write time) —
 *      exact for replies threading into an existing conversation.
 *   2. The conversation's engagement → program slug.
 *   3. The shared spine heuristic above (participant/invite → relationship).
 * Returns null for the executive default, mirroring the web path.
 */
export async function resolveConversationProgram(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<string | null> {
  // 1. Stamped coach messages in this conversation.
  const { data: recentCoachMsgs } = await supabase
    .from("messages")
    .select("metadata")
    .eq("conversation_id", conversationId)
    .eq("role", "coach")
    .order("created_at", { ascending: false })
    .limit(10);
  for (const m of recentCoachMsgs ?? []) {
    const stamped = (m.metadata as Record<string, unknown> | null)?.program;
    if (typeof stamped === "string" && stamped) return stamped;
  }

  // 2. The conversation's engagement.
  const { data: conv } = await supabase
    .from("conversations")
    .select("engagement_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (conv?.engagement_id) {
    const viaEngagement = await resolveProgram(supabase, userId, null, conv.engagement_id);
    if (viaEngagement.ok) return viaEngagement.program;
  }

  // 3. Spine heuristic (no hint, no engagement).
  const viaSpine = await resolveProgram(supabase, userId, null, null);
  return viaSpine.ok ? viaSpine.program : null;
}
