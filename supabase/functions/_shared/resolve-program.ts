/**
 * Program resolution — which vertical (Coach Pack) a request belongs to.
 *
 * Extracted from coach/index.ts (P1 fail-open fix) so the email/Telegram path
 * (channel-router) resolves the SAME way the web coach does instead of
 * defaulting every reply to the executive pack. PC4.4 will make the spine
 * fully authoritative; until then the precedence is:
 *   engagement membership > recognized client hint > spine heuristic.
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

  // 2. A recognized client hint is honored as sent.
  const hint = (clientProgram ?? "").toLowerCase();
  if (KNOWN_PROGRAM_HINTS.has(hint)) {
    return { ok: true, program: hint };
  }

  // 3. No usable hint → the spine decides. Any participant or invite row means
  //    this user is in the relationship product; never hand them the executive
  //    persona + business guardrails by default.
  const { count: participantCount } = await supabase
    .from("participant")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((participantCount ?? 0) > 0) return { ok: true, program: "relationship" };

  const { count: inviteCount } = await supabase
    .from("decoded_invites")
    .select("id", { count: "exact", head: true })
    .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`);
  if ((inviteCount ?? 0) > 0) return { ok: true, program: "relationship" };

  return { ok: true, program: clientProgram };
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
