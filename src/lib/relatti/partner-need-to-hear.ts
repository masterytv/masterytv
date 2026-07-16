import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getDisplayName } from "@/lib/decoded/display-name";

/**
 * Resolve the reciprocal half of the profile's need-to-hear pair: the phrases
 * that land for the READER'S PARTNER, taken from the partner's own S5 section.
 *
 * Why this is the partner's *own* words, not a fresh generation: S5 already asks
 * the model "what does THIS person need to hear," and the reader's own block is
 * captioned "share these with your partner." The reciprocal block is therefore a
 * pure re-projection of data that already exists — computing it in code keeps the
 * two directions from contradicting each other, per the dyad-interpretive rule in
 * RELATTI_EXPERIENCE.md §5.4.
 *
 * CONSENT (privacy-critical — ADR-R02, "privacy by assembly, not by RLS"):
 * gated at share_with_human = 'full', the same rung `verifySharedAccess` uses to
 * let a partner open the whole report page. At 'full' this surfaces NOTHING the
 * reader can't already read in full — it only puts it where it's useful. A lower
 * rung ('type_compatibility' grants archetype + style only) would disclose new
 * data and is a founder decision, not ours. Private coaching is never touched:
 * this reads assessment_reports only.
 *
 * Fails closed. Any missing dyad, consent, report, or malformed section returns
 * null and the caller keeps its honest empty state ("invite your partner").
 */

export interface PartnerNeedToHear {
  /** The partner's display name, when we have one — for the "…for Priya" caption. */
  partnerName: string | null;
  phrases: Array<{ phrase: string; why: string }>;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[partner-need-to-hear] Missing Supabase service-role env; skipping.");
    return null;
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getPartnerNeedToHear(
  userId: string
): Promise<PartnerNeedToHear | null> {
  const admin = serviceClient();
  if (!admin) return null;

  try {
    // The consented dyad. `revoked_at` stays authoritative even though a revoke
    // also drops share_with_human — belt and braces on the leak-prone axis.
    const { data: invite } = await admin
      .from("decoded_invites")
      .select("inviter_id, recipient_id, inviter_report_id, recipient_report_id")
      .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq("share_with_human", "full")
      .in("status", ["consented", "connected"])
      .is("revoked_at", null)
      .not("recipient_id", "is", null)
      .neq("recipient_email", "broadcast")
      .limit(1)
      .maybeSingle();

    if (!invite) return null;

    // Whichever side of the invite the reader isn't. The *_report_id pointers
    // track each user's current report (sync-my-report.ts), so a retake by the
    // partner propagates here for free.
    const viewerIsInviter = invite.inviter_id === userId;
    const partnerId = viewerIsInviter ? invite.recipient_id : invite.inviter_id;
    const partnerReportId = viewerIsInviter
      ? invite.recipient_report_id
      : invite.inviter_report_id;

    // Partner hasn't finished their profile yet — the empty state is correct.
    if (!partnerId || !partnerReportId) return null;

    const { data: partnerReport } = await admin
      .from("assessment_reports")
      .select("sections, user_id")
      .eq("id", partnerReportId)
      .maybeSingle();

    // Ownership assertion: the pointer must actually name the partner's report.
    // Cheap, and it turns a future backfill bug into an empty block rather than
    // a cross-user leak.
    if (!partnerReport || partnerReport.user_id !== partnerId) return null;

    const phrases = extractNeedToHear(partnerReport.sections);
    if (phrases.length === 0) return null;

    const partnerName = await getDisplayName(admin, partnerId);

    return { partnerName, phrases };
  } catch (err) {
    console.error("[partner-need-to-hear] resolve error:", err);
    return null;
  }
}

/**
 * S5 stores typed JSON in content_markdown (the v2 sections convention — see
 * ReportViewer's `parsed`). Older/partial reports may lack the key entirely, so
 * every step is defensive: a malformed section must degrade to the empty state,
 * never throw on a page the user is waiting on.
 */
function extractNeedToHear(sections: unknown): Array<{ phrase: string; why: string }> {
  if (!sections || typeof sections !== "object") return [];
  const s5 = (sections as Record<string, unknown>).S5;
  if (!s5 || typeof s5 !== "object") return [];
  const raw = (s5 as Record<string, unknown>).content_markdown;
  if (typeof raw !== "string") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];

  const list = (parsed as Record<string, unknown>).what_you_need_to_hear;
  if (!Array.isArray(list)) return [];

  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { phrase, why } = item as Record<string, unknown>;
    if (typeof phrase !== "string" || !phrase.trim()) return [];
    return [{ phrase, why: typeof why === "string" ? why : "" }];
  });
}
