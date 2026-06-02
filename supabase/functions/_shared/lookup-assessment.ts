/**
 * Lookup Assessment — Gives the coach access to specific assessment data.
 *
 * Sprint 0.4: When users ask about their report details (specific scores,
 * section narratives, trait breakdowns), the coach can use this tool to
 * look up the exact data instead of hallucinating from the system prompt summary.
 *
 * Why a tool instead of putting everything in the prompt:
 * - The full assessment data is ~5-10K tokens — too much for the system prompt
 * - Most conversations don't need specific scores
 * - Tool use is "pay for what you need" — only loads data when asked
 */

import type { AnthropicTool } from "./anthropic.ts";
import { createSupabaseClient } from "./supabase.ts";

// ─── TOOL DEFINITION ────────────────────────────────────────────────────

export const LOOKUP_ASSESSMENT_TOOL: AnthropicTool = {
  name: "lookup_assessment",
  description:
    "Look up the user's Decoded personality assessment data. Use this when the user asks about specific scores, percentiles, trait details, report sections, or any numeric data from their assessment. ALWAYS use this tool instead of citing numbers from memory — your system prompt summary may not include all details. Categories: 'scores' (raw instrument scores and subscales), 'report_section' (narrative text from a specific report section), 'full_profile' (complete assessment profile with all instruments).",
  input_schema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        enum: ["scores", "report_section", "full_profile"],
        description:
          "What to look up: 'scores' for specific instrument scores (specify instrument_id), 'report_section' for narrative text from a report section (specify section_key like S1, S2, etc.), 'full_profile' for the complete assessment profile.",
      },
      instrument_id: {
        type: "string",
        description:
          "For 'scores' category: the instrument to look up. Options: ipip50 (Big Five personality), ecr_r_short (attachment style), ders16 (emotional regulation), scs_sf (self-compassion), swls (life satisfaction), weims (motivation/self-determination), flourishing (flourishing scale), wellness_check (wellness habits), gad7 (anxiety screening), riasec (career interests), asrs (ADHD screening), csi4 (relationship satisfaction), ace3 (adverse experiences).",
      },
      section_key: {
        type: "string",
        description:
          "For 'report_section' category: which report section to retrieve. Options: S1 (Archetype Overview), S2 (Big Five Deep Dive), S3 (Emotional Landscape), S4 (Relationships & Attachment), S5 (Career & Motivation), S6 (Wellness Snapshot), S7 (Integration & Patterns), S8 (Growth Roadmap).",
      },
    },
    required: ["category"],
  },
};

// ─── TOOL HANDLER ───────────────────────────────────────────────────────

export async function handleLookupAssessment(
  userId: string,
  input: { category: string; instrument_id?: string; section_key?: string }
): Promise<{ data: unknown; found: boolean }> {
  const supabase = createSupabaseClient();

  // Find the latest completed assessment
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) {
    return { data: "No completed assessment found for this user.", found: false };
  }

  const assessmentId = assessment.id;

  switch (input.category) {
    case "scores": {
      if (input.instrument_id) {
        // Look up a specific instrument
        const { data: score } = await supabase
          .from("assessment_scores")
          .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
          .eq("assessment_id", assessmentId)
          .eq("instrument_id", input.instrument_id)
          .maybeSingle();

        if (!score) {
          return { data: `No score found for instrument '${input.instrument_id}'.`, found: false };
        }

        return { data: formatScore(score), found: true };
      }

      // No specific instrument — return all scores summary
      const { data: scores } = await supabase
        .from("assessment_scores")
        .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
        .eq("assessment_id", assessmentId);

      if (!scores || scores.length === 0) {
        return { data: "No scores found.", found: false };
      }

      return {
        data: scores.map(formatScore),
        found: true,
      };
    }

    case "report_section": {
      if (!input.section_key) {
        return { data: "Please specify a section_key (S1-S8).", found: false };
      }

      const { data: report } = await supabase
        .from("assessment_reports")
        .select("sections")
        .eq("assessment_id", assessmentId)
        .maybeSingle();

      if (!report?.sections) {
        return { data: "No report found.", found: false };
      }

      const sections = report.sections as Record<string, unknown>;
      const section = sections[input.section_key];

      if (!section) {
        return {
          data: `Section '${input.section_key}' not found. Available: ${Object.keys(sections).join(", ")}`,
          found: false,
        };
      }

      return { data: section, found: true };
    }

    case "full_profile": {
      // Return the assessment_profile if it exists (generated by Coach Handoff)
      const { data: profile } = await supabase
        .from("assessment_profiles")
        .select("profile_data, coaching_priorities, coaching_letter")
        .eq("assessment_id", assessmentId)
        .maybeSingle();

      if (profile) {
        return { data: profile, found: true };
      }

      // Fallback: return all scores
      const { data: allScores } = await supabase
        .from("assessment_scores")
        .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
        .eq("assessment_id", assessmentId);

      return {
        data: {
          note: "No pre-built profile found. Raw scores below.",
          scores: (allScores ?? []).map(formatScore),
        },
        found: true,
      };
    }

    default:
      return { data: `Unknown category: '${input.category}'. Use 'scores', 'report_section', or 'full_profile'.`, found: false };
  }
}

// ─── FORMATTING ─────────────────────────────────────────────────────────

function formatScore(score: {
  instrument_id: string;
  total_score?: number | string | null;
  subscale_scores?: Record<string, number> | null;
  percentile_scores?: Record<string, number> | null;
  interpretation?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    instrument: score.instrument_id,
  };

  if (score.total_score !== null && score.total_score !== undefined) {
    formatted.total_score = score.total_score;
  }

  if (score.subscale_scores && Object.keys(score.subscale_scores).length > 0) {
    formatted.subscales = score.subscale_scores;
  }

  if (score.percentile_scores && Object.keys(score.percentile_scores).length > 0) {
    formatted.percentiles = score.percentile_scores;
  }

  if (score.interpretation && Object.keys(score.interpretation).length > 0) {
    formatted.interpretation = score.interpretation;
  }

  return formatted;
}
