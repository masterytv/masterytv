/**
 * Decoded Report — Prompt Type Definitions
 *
 * Types for report section prompt templates and the structured data they produce.
 *
 * v1: 12 sections (RS01–RS12) — instrument-organized
 * v2: 8 sections (S1–S8)     — domain-organized
 */

/** Tier required to view a section */
export type ReportTier = 'free' | 'insight' | 'growth' | 'mastery';

/** Report structure version */
export type ReportVersion = 1 | 2;

// ─────────────────────────────────────────────────────
// Section IDs
// ─────────────────────────────────────────────────────

/** v1 section IDs (instrument-organized, 12 sections) */
export type SectionIdV1 =
  | 'RS01' | 'RS02' | 'RS03' | 'RS04' | 'RS05' | 'RS06'
  | 'RS07' | 'RS08' | 'RS09' | 'RS10' | 'RS11' | 'RS12';

/** v2 section IDs (domain-organized, 8 sections) */
export type SectionIdV2 =
  | 'S1' | 'S2' | 'S3' | 'S4'
  | 'S5' | 'S6' | 'S7' | 'S8';

/** Union type for backward compatibility */
export type SectionId = SectionIdV1 | SectionIdV2;

// ─────────────────────────────────────────────────────
// Prompt Templates
// ─────────────────────────────────────────────────────

/** Prompt template for a single report section */
export interface ReportSectionPrompt {
  sectionId: SectionId;
  title: string;
  systemPrompt: string;
  /** Template with {{placeholders}} for dynamic score data */
  userPromptTemplate: string;
  /** Which instrument scores are needed to build this section */
  requiredInstruments: string[];
  minTier: ReportTier;
  targetWordCount: { min: number; max: number };
}

// ─────────────────────────────────────────────────────
// v2 Structured Subsection Types
// ─────────────────────────────────────────────────────

/** Named strength or growth edge with a bold label + supporting sentence */
export interface StrengthBullet {
  label: string;       // e.g., "Social Magnetism"
  description: string; // e.g., "Your extraversion and agreeableness make you the person others open up to."
}

/** Per-trait Gifts/Challenges card */
export interface TraitCard {
  trait_name: string;      // e.g., "Openness"
  percentile: number;      // 0–100
  label: string;           // e.g., "The Visionary"
  gifts: string[];         // 2–3 bullet points
  challenges: string[];    // 2–3 bullet points
}

/** Named personality pattern (cross-trait interaction) */
export interface NamedPattern {
  name: string;        // e.g., "The Charismatic Implementer Gap"
  description: string; // 2–3 sentence explanation
}

/** IFS protector profile card */
export interface ProtectorCard {
  name: string;        // e.g., "The Caretaker"
  role: string;        // What it does
  cost: string;        // What it costs
  score?: number;      // 0–100 if available
}

/** Numbered conflict/emotional stage */
export interface FightStage {
  stage_number: number;
  title: string;       // e.g., "Tension Builds"
  description: string; // 2–3 sentences
}

/** Growth edge with priority and actions */
export interface GrowthEdgeCard {
  priority: number;     // 1, 2, or 3
  title: string;        // e.g., "Build External Structure"
  why: string;          // Why this matters for you
  actions: string[];    // 2–3 specific actions
}

/** Summary table row for S1 "You at a Glance" */
export interface SummaryRow {
  dimension: string;    // e.g., "Core Personality"
  summary: string;      // 1-line interpretation
}

// ─────────────────────────────────────────────────────
// v2 Section Content (structured JSON from LLM)
// ─────────────────────────────────────────────────────

/** Base fields shared by all v2 sections */
interface V2SectionBase {
  title: string;
  tldr: string;          // Bold one-line summary
  coach_question: string;
  word_count: number;
  min_tier: ReportTier;
  generated_at: string;
  voice_id?: string;
}

/** S1: You at a Glance */
export interface S1Content extends V2SectionBase {
  summary_table: SummaryRow[];
  top_strengths: StrengthBullet[];
  growth_edges: StrengthBullet[];
}

/** S2: Your Personality */
export interface S2Content extends V2SectionBase {
  trait_cards: TraitCard[];
  signature_pattern: NamedPattern;
  narrative: string;     // Voice-modulated prose connecting the traits
}

/** S3: Your Inner World */
export interface S3Content extends V2SectionBase {
  protectors: ProtectorCard[];
  vulnerability_themes: string;  // Narrative paragraph
  coping_style: string;          // Proactive vs reactive description
}

/** S4: Your Emotions */
export interface S4Content extends V2SectionBase {
  dimensions: Array<{
    name: string;           // e.g., "Awareness"
    score_label: string;    // e.g., "Above average"
    interpretation: string; // 1–2 sentences
  }>;
  emotional_triggers: StrengthBullet[];   // Named triggers
  self_compassion: string;                // Interpretation paragraph
}

/** S5: Your Relationships */
export interface S5Content extends V2SectionBase {
  attachment_tldr: string;        // Bold 1-liner
  how_you_love: string;           // Narrative paragraph
  how_you_fight: FightStage[];    // 5–6 stages
  what_you_need_to_hear: Array<{
    phrase: string;       // The phrase
    why: string;          // Why it works
  }>;
}

/** S6: Your Career & Motivation */
export interface S6Content extends V2SectionBase {
  top_values: StrengthBullet[];     // Top 3 values
  bottom_values: StrengthBullet[];  // Bottom 3 values
  motivation_type: string;          // Intrinsic vs extrinsic narrative
  career_environments: string[];    // 3–4 environment descriptions
}

/** S7: Your Wellbeing */
export interface S7Content extends V2SectionBase {
  life_satisfaction: string;   // Interpretation
  screening_flags: Array<{
    area: string;              // e.g., "Attention Patterns"
    finding: string;           // Gentle framing
    recommendation: string;   // Growth-oriented
  }>;
}

/** S8: Your Growth Map */
export interface S8Content extends V2SectionBase {
  growth_edges: GrowthEdgeCard[];
  thirty_day_challenge: string;   // A specific 30-day suggestion
}

/** Union of all v2 section content types */
export type V2SectionContent =
  | S1Content | S2Content | S3Content | S4Content
  | S5Content | S6Content | S7Content | S8Content;

// ─────────────────────────────────────────────────────
// v1 Section Content (backward compatible)
// ─────────────────────────────────────────────────────

/** v1 generated section content (stored in assessment_reports.sections JSONB) */
export interface ReportSectionContent {
  title: string;
  content_markdown: string;
  coach_question: string;
  data_viz?: DataVisualization;
  word_count: number;
  min_tier: ReportTier;
  generated_at: string;
}

// ─────────────────────────────────────────────────────
// Data Visualizations (shared across v1 and v2)
// ─────────────────────────────────────────────────────

export type DataVisualization =
  | SummaryTableViz
  | RadarChartViz
  | QuadrantPlotViz
  | BarChartViz
  | WellnessRadarViz;

export interface SummaryTableViz {
  type: 'summary_table';
  data: {
    decoded_score: number;
    top_strengths: string[];
    growth_edges: string[];
    archetype: string;
    sublabel: string;
  };
}

export interface RadarChartViz {
  type: 'radar_chart';
  data: {
    axes: string[];
    values: number[]; // 0–100 percentiles
    labels?: string[];
  };
}

export interface QuadrantPlotViz {
  type: 'quadrant_plot';
  data: {
    x: number;  // anxiety score
    y: number;  // avoidance score
    x_label: string;
    y_label: string;
    quadrant_labels: [string, string, string, string]; // TL, TR, BL, BR
    result_label: string;
  };
}

export interface BarChartViz {
  type: 'bar_chart';
  data: {
    labels: string[];
    values: number[];
    max: number;
  };
}

export interface WellnessRadarViz {
  type: 'wellness_radar';
  data: {
    dimensions: string[];
    values: number[]; // 0–100
    thresholds: { green: number; amber: number }; // color boundaries
  };
}

/** Score data package sent to GPT-4o for a given section */
export interface SectionScoreData {
  sectionId: SectionId;
  archetype: {
    primary: string;
    secondary: string;
    isBlended: boolean;
    sublabel?: string;
    tagline?: string;
  };
  bigFive: {
    raw: Record<string, number>;
    percentiles: Record<string, number>;
    zScores: Record<string, number>;
  };
  /** Section-specific score data — varies by section */
  sectionData: Record<string, unknown>;
}
