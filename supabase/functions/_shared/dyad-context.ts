/**
 * Dyad Context — Epic E4 (Relatti).
 *
 * Resolves the coach's view of a relationship dyad from the ENGAGEMENT SPINE
 * (engagement / participant / engagement_artifact / accountability_link) instead
 * of fanning out from decoded_invites (the legacy Layer 4.6 path).
 *
 * Runs under the service-role client, so it can read both participants' rows;
 * cross-partner visibility is gated IN CODE by the partner's share_level
 * (ADR-R02 — privacy by assembly, not by RLS). See RELATIONSHIP_ARCHITECTURE.md §7.
 *
 * Used by prompt-assembler.ts behind the RELATTI_DYAD_ENGINE flag.
 */

import { createSupabaseClient } from "./supabase.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type ShareLevel = "none" | "type_compatibility" | "full";

/** Warm-named attachment quadrant (mirrors deriveRelationshipStyle in the
 * compatibility edge fn — edge functions can't share src, so the logic is kept
 * in lockstep here). Axes are the ECR-R 1–7 scale; ~4 is the practical midpoint. */
export interface RelationshipStyle {
  name: string;
  needForReassurance: string; // low | moderate | high (ECR anxiety)
  needForSpace: string;       // low | moderate | high (ECR avoidance)
  summary: string;
}

function band(v: number | null | undefined): "low" | "moderate" | "high" {
  if (v == null) return "moderate";
  if (v >= 4.5) return "high";
  if (v <= 3) return "low";
  return "moderate";
}

export function deriveRelationshipStyle(
  anxiety: number | null | undefined,
  avoidance: number | null | undefined,
): RelationshipStyle {
  const a = band(anxiety);
  const v = band(avoidance);
  const highA = a === "high";
  const highV = v === "high";
  let name = "Anchored";
  let summary = "tends to feel secure reaching for closeness and giving space";
  if (highA && highV) {
    name = "The Guarded Heart";
    summary = "longs for closeness and fears it at once, so they protect themselves even when they want to draw near";
  } else if (highA && !highV) {
    name = "The Devoted";
    summary = "loves deeply and needs reassurance that the bond is safe; distance can read as danger";
  } else if (!highA && highV) {
    name = "The Independent";
    summary = "values autonomy and steadies under pressure by stepping back; closeness can feel like a loss of self";
  } else {
    name = "Anchored";
    summary = "generally trusts the bond, can ask for what they need, and offers steadiness in return";
  }
  return { name, needForReassurance: a, needForSpace: v, summary };
}

/** Load a user's relationship style from their latest ECR-R scores. */
export async function loadRelationshipStyle(
  supabase: SupabaseClient,
  userId: string,
): Promise<RelationshipStyle | null> {
  const { data } = await supabase
    .from("assessment_scores")
    .select("subscale_scores")
    .eq("user_id", userId)
    .eq("instrument_id", "ecr_r_short")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ss = data?.subscale_scores as Record<string, number> | undefined;
  if (!ss) return null;
  return deriveRelationshipStyle(ss.anxiety ?? null, ss.avoidance ?? null);
}

export interface DyadContext {
  engagementId: string;
  engagementStatus: string;          // forming | active | paused | ended
  partnerName: string;
  partnerShareLevel: ShareLevel;     // what the partner consented to share with the coach
  partnerArchetype?: { base: string | null; sublabel: string | null; tagline: string | null };
  partnerProfileSummary?: string;    // only when share level = full
  readerStyle?: RelationshipStyle;   // the coached user's own attachment style
  partnerStyle?: RelationshipStyle;  // partner's attachment style (gated by share level)
  blueprint?: Record<string, unknown> | null;
  stakeActive: boolean;              // is the partner accountability link active
}

/**
 * Resolve the user's primary active relationship dyad from the spine.
 * Returns null when the user has no relationship_dyad engagement.
 */
export async function resolveDyadContext(userId: string): Promise<DyadContext | null> {
  const supabase = createSupabaseClient();

  // 1. The user's participant rows in relationship dyads they're active in.
  const { data: myParts } = await supabase
    .from("participant")
    .select("engagement_id, role, engagement:engagement_id(id, kind, status, created_at)")
    .eq("user_id", userId)
    .in("status", ["active", "consented"]);

  if (!myParts || myParts.length === 0) return null;

  // Keep relationship dyads only; prefer 'active', then most recently created.
  const dyads = myParts
    .map((p) => ({
      engagement_id: p.engagement_id as string,
      role: p.role as string,
      eng: (Array.isArray(p.engagement) ? p.engagement[0] : p.engagement) as
        | { id: string; kind: string; status: string; created_at: string }
        | null,
    }))
    .filter((d) => d.eng?.kind === "relationship_dyad");

  if (dyads.length === 0) return null;

  dyads.sort((a, b) => {
    const aActive = a.eng?.status === "active" ? 1 : 0;
    const bActive = b.eng?.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return (b.eng?.created_at ?? "").localeCompare(a.eng?.created_at ?? "");
  });

  const chosen = dyads[0];
  const engagementId = chosen.engagement_id;

  // 2. The partner participant of this engagement (the other role).
  const { data: parts } = await supabase
    .from("participant")
    .select("role, user_id, invited_email, report_id, share_level, status")
    .eq("engagement_id", engagementId);

  const partner = (parts ?? []).find((p) => p.user_id !== userId || p.role !== chosen.role)
    ?? (parts ?? []).find((p) => p.user_id !== userId);
  if (!partner) return null;

  const partnerShareLevel = (partner.share_level ?? "none") as ShareLevel;
  const partnerName =
    (partner.invited_email ? partner.invited_email.split("@")[0] : null) || "Partner";

  const ctx: DyadContext = {
    engagementId,
    engagementStatus: chosen.eng?.status ?? "forming",
    partnerName,
    partnerShareLevel,
    stakeActive: false,
  };

  // 3. Partner profile — only what the share level permits.
  if (partner.report_id && (partnerShareLevel === "type_compatibility" || partnerShareLevel === "full")) {
    const { data: report } = await supabase
      .from("assessment_reports")
      .select("archetype_base, archetype_sublabel, archetype_tagline, sections")
      .eq("id", partner.report_id)
      .maybeSingle();
    if (report) {
      ctx.partnerArchetype = {
        base: report.archetype_base,
        sublabel: report.archetype_sublabel,
        tagline: report.archetype_tagline,
      };
      if (partnerShareLevel === "full") {
        const sections = (report.sections ?? {}) as Record<string, { content_markdown?: string }>;
        ctx.partnerProfileSummary = sections.S1?.content_markdown ?? undefined;
      }
    }
  }

  // 3b. Relationship styles (attachment) — the user's own always; the partner's
  // only at type_compatibility/full (same gate as their archetype).
  ctx.readerStyle = (await loadRelationshipStyle(supabase, userId)) ?? undefined;
  if (partner.user_id && (partnerShareLevel === "type_compatibility" || partnerShareLevel === "full")) {
    ctx.partnerStyle = (await loadRelationshipStyle(supabase, partner.user_id as string)) ?? undefined;
  }

  // 4. Blueprint artifact (shared) + 5. stake.
  const [{ data: artifact }, { data: stake }] = await Promise.all([
    supabase
      .from("engagement_artifact")
      .select("content")
      .eq("engagement_id", engagementId)
      .eq("kind", "relationship_blueprint")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("accountability_link")
      .select("status")
      .eq("engagement_id", engagementId)
      .eq("stake_type", "partner")
      .maybeSingle(),
  ]);

  ctx.blueprint = (artifact?.content as Record<string, unknown> | undefined) ?? null;
  ctx.stakeActive = stake?.status === "active";

  return ctx;
}

/**
 * Mediator persona addendum — prepended to the base persona when coaching a dyad.
 */
export function buildMediatorPersona(dyad: DyadContext): string {
  return `RELATIONSHIP DYAD MODE — YOU ARE THE COUPLE'S COACH:
- You hold BOTH partners. This user is one of two people in a coached relationship with ${dyad.partnerName}.
- Take a mediator stance: stay even-handed, never take sides, and translate rather than adjudicate ("here's what that might sound like from their side").
- Coach the *relationship* as the client, not just the individual in front of you.
- Keep each partner's private reflections private — only use shared profile data you've been given below.`;
}

/**
 * The dyad coaching layer (spine-based replacement for legacy Layer 4.6).
 */
export function buildDyadCoachLayer(dyad: DyadContext): string {
  const parts: string[] = ["# LAYER 4.6 — RELATIONSHIP DYAD CONTEXT"];
  parts.push(`The user is in a coached relationship with **${dyad.partnerName}** (engagement status: ${dyad.engagementStatus}).`);

  if (dyad.partnerShareLevel === "none") {
    parts.push(`${dyad.partnerName} has not shared their profile with the coach yet. You can still coach the relationship, but do not claim knowledge of ${dyad.partnerName}'s assessment.`);
  } else if (dyad.partnerArchetype) {
    parts.push(`${dyad.partnerName}'s archetype: ${dyad.partnerArchetype.base ?? "Unknown"}${dyad.partnerArchetype.sublabel ? ` (${dyad.partnerArchetype.sublabel})` : ""}.`);
    if (dyad.partnerShareLevel === "full" && dyad.partnerProfileSummary) {
      parts.push(`${dyad.partnerName}'s profile summary: ${dyad.partnerProfileSummary}`);
    }
  }

  // Relationship styles (attachment) — what lets you tailor advice to how each
  // person actually reaches and protects. The user's own is always known.
  const styleLines: string[] = [];
  if (dyad.readerStyle) {
    styleLines.push(`- The user you're coaching: ${dyad.readerStyle.name} (need for reassurance: ${dyad.readerStyle.needForReassurance}, need for space: ${dyad.readerStyle.needForSpace}) — ${dyad.readerStyle.summary}.`);
  }
  if (dyad.partnerStyle && dyad.partnerShareLevel !== "none") {
    styleLines.push(`- ${dyad.partnerName}: ${dyad.partnerStyle.name} (need for reassurance: ${dyad.partnerStyle.needForReassurance}, need for space: ${dyad.partnerStyle.needForSpace}) — ${dyad.partnerStyle.summary}.`);
  }
  if (styleLines.length > 0) {
    parts.push(`RELATIONSHIP STYLES (attachment — tailor advice to these, and name the cycle between them):\n${styleLines.join("\n")}`);
  }

  if (dyad.blueprint) {
    const b = dyad.blueprint as Record<string, unknown>;
    const cr = (b.compatibility_report ?? b.compatibility_report_inviter ?? {}) as Record<string, unknown>;
    if (cr.headline || cr.chemistry || cr.friction || cr.superpower || cr.watch_out) {
      parts.push(`Relationship Blueprint:
- Dynamic: ${cr.headline ?? ""}
- Chemistry: ${cr.chemistry ?? ""}
- Friction: ${cr.friction ?? ""}
- Superpower: ${cr.superpower ?? ""}
- Watch out: ${cr.watch_out ?? ""}`);
    }
  }

  if (dyad.stakeActive) {
    parts.push(`THE STAKE: ${dyad.partnerName} is this user's accountability partner. When one drifts, lean on the shared ritual to pull them back — the relationship is the reason to keep showing up.`);
  }

  parts.push(`ACCESS RULES:
- "type_compatibility" = you see ${dyad.partnerName}'s archetype + the Blueprint, NOT their full assessment. Don't claim detailed scores.
- "full" = you see their full profile + archetype + Blueprint.
- Current level for ${dyad.partnerName}: ${dyad.partnerShareLevel}.
- Use this naturally — discuss the dynamic, offer relationship-specific coaching. Don't volunteer it unprompted.`);

  return parts.join("\n\n");
}
