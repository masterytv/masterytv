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
  /** Partner's scored instruments (percentiles etc.) — only at share level = full. */
  partnerScores?: Array<{
    instrument_id: string;
    total_score: number | null;
    percentile_scores: Record<string, unknown> | null;
    interpretation: string | Record<string, unknown> | null;
  }>;
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
    .select("engagement_id, role, engagement:engagement_id(id, kind, status, created_at, source_invite_id)")
    .eq("user_id", userId)
    .in("status", ["active", "consented"]);

  if (!myParts || myParts.length === 0) return null;

  // Keep relationship dyads only; prefer 'active', then most recently created.
  const dyads = myParts
    .map((p) => ({
      engagement_id: p.engagement_id as string,
      role: p.role as string,
      eng: (Array.isArray(p.engagement) ? p.engagement[0] : p.engagement) as
        | { id: string; kind: string; status: string; created_at: string; source_invite_id: string | null }
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

  // Partner name: their account name first — invited_email is null for
  // participants who signed up directly (both-joined-separately dyads), which
  // used to make the coach believe the partner is literally named "Partner"
  // and ask the user for the name (2026-07-15 tester1/tester2 chat).
  let partnerName = partner.invited_email
    ? partner.invited_email.split("@")[0]
    : "";
  if (partner.user_id) {
    const { data: pu } = await supabase
      .from("users")
      .select("name")
      .eq("id", partner.user_id)
      .maybeSingle();
    if (pu?.name) partnerName = pu.name;
  }
  partnerName = partnerName || "their partner";

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
      .select("archetype_base, archetype_sublabel, archetype_tagline, sections, assessment_id")
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

        // "full" means the coach knows what the USER can already see of their
        // partner — including the scored numbers (the 2026-07-15 tester chat
        // had to refuse an Openness-percentile question it was entitled to).
        if (report.assessment_id) {
          const { data: scores } = await supabase
            .from("assessment_scores")
            .select("instrument_id, total_score, percentile_scores, interpretation")
            .eq("assessment_id", report.assessment_id);
          if (scores && scores.length > 0) {
            ctx.partnerScores = scores as DyadContext["partnerScores"];
          }
        }
      }
    }
  }

  // 3b. Relationship styles (attachment) — the user's own always; the partner's
  // only at type_compatibility/full (same gate as their archetype).
  ctx.readerStyle = (await loadRelationshipStyle(supabase, userId)) ?? undefined;
  if (partner.user_id && (partnerShareLevel === "type_compatibility" || partnerShareLevel === "full")) {
    ctx.partnerStyle = (await loadRelationshipStyle(supabase, partner.user_id as string)) ?? undefined;
  }

  // 4. Blueprint + 5. stake. The compatibility report is per-user (each
  // partner reads a version written for them) — prefer THIS user's version
  // from the source invite so the coach sees exactly what the user sees;
  // fall back to the promoted Blueprint artifact.
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
  if (chosen.eng?.source_invite_id) {
    const { data: inv } = await supabase
      .from("decoded_invites")
      .select("inviter_id, compatibility_report, compatibility_report_inviter, compatibility_report_recipient")
      .eq("id", chosen.eng.source_invite_id)
      .maybeSingle();
    if (inv) {
      const mine = inv.inviter_id === userId
        ? (inv.compatibility_report_inviter ?? inv.compatibility_report)
        : (inv.compatibility_report_recipient ?? inv.compatibility_report);
      if (mine) ctx.blueprint = { compatibility_report: mine };
    }
  }
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
    const digest = renderCompatibilityDigest(cr);
    if (digest) {
      parts.push(`Their compatibility report (what the user reads on their Compatibility page — you know all of it):\n${digest}`);
    }
  }

  if (dyad.partnerScores && dyad.partnerScores.length > 0) {
    const scoreLines = dyad.partnerScores.map((s) => {
      const pctJson = s.percentile_scores ? JSON.stringify(s.percentile_scores) : "";
      const pct = pctJson && pctJson !== "{}" ? ` percentiles: ${pctJson}` : "";
      // interpretation is JSONB — a string in some instruments, an object in
      // others; an empty object renders as noise.
      const interpJson = typeof s.interpretation === "string"
        ? s.interpretation
        : s.interpretation
          ? JSON.stringify(s.interpretation)
          : "";
      const interp = interpJson && interpJson !== "{}" ? ` — ${interpJson}` : "";
      return `- ${s.instrument_id}: score ${s.total_score ?? "n/a"}${pct}${interp}`;
    });
    parts.push(`${dyad.partnerName}'s assessment scores (shared at "full" — the same numbers the user can see):\n${scoreLines.join("\n")}`);
  }

  if (dyad.stakeActive) {
    parts.push(`THE STAKE: ${dyad.partnerName} is this user's accountability partner. When one drifts, lean on the shared ritual to pull them back — the relationship is the reason to keep showing up.`);
  }

  parts.push(`ACCESS RULES:
- "type_compatibility" = you see ${dyad.partnerName}'s archetype + the Blueprint, NOT their full assessment. Don't claim detailed scores.
- "full" = you see their full profile + archetype + Blueprint.
- Current level for ${dyad.partnerName}: ${dyad.partnerShareLevel}.
- Everything above is ALREADY in your context. Never ask permission to "look up" or "pull up" this relationship, and never ask the user who their partner is or to confirm the name — you know it: ${dyad.partnerName}. Tools are only for OTHER connections beyond this one.
- If asked for a specific number that is not listed above, say you don't have that one — never invent scores.
- Use this naturally — discuss the dynamic, offer relationship-specific coaching. Don't volunteer it unprompted.`);

  return parts.join("\n\n");
}

/**
 * Render a compatibility report JSONB into prompt lines, handling BOTH shapes:
 * the legacy Decoded shape ({headline, chemistry, friction, superpower,
 * watch_out}) and the Relatti couples shape ({headline, couples_report:{...},
 * intimate:{...}}). The 2026-07-15 tester dyad exposed that the coach rendered
 * only `headline` for couples reports — the shape this engine actually ships.
 */
export function renderCompatibilityDigest(raw: unknown): string {
  const cr = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const lines: string[] = [];

  if (s(cr.headline)) lines.push(`- Dynamic: ${s(cr.headline)}`);

  // Legacy Decoded fields
  const LEGACY: Array<[string, string]> = [
    ["chemistry", "Chemistry"],
    ["friction", "Friction"],
    ["superpower", "Superpower"],
    ["watch_out", "Watch out"],
  ];
  for (const [key, label] of LEGACY) {
    if (s(cr[key])) lines.push(`- ${label}: ${s(cr[key])}`);
  }

  // Relatti couples report fields
  const couples = (cr.couples_report ?? {}) as Record<string, unknown>;
  const COUPLES: Array<[string, string]> = [
    ["dynamic", "The dynamic between them"],
    ["empathy", "Seeing it from both sides"],
    ["strengths", "Strengths"],
    ["challenges", "Challenges"],
    ["repair", "Repair"],
    ["loving_well", "Loving each other well"],
  ];
  for (const [key, label] of COUPLES) {
    if (s(couples[key])) lines.push(`- ${label}: ${s(couples[key])}`);
  }

  const intimate = (cr.intimate ?? {}) as Record<string, unknown>;
  if (s(intimate.friction)) lines.push(`- Partnership friction: ${s(intimate.friction)}`);
  if (s(intimate.strength)) lines.push(`- Partnership strength: ${s(intimate.strength)}`);

  return lines.join("\n");
}
