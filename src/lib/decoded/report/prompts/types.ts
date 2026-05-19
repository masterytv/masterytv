/**
 * Decoded Report — Prompt Type Definitions
 *
 * Types for the 12 report section prompt templates (RS01–RS12)
 * and the structured data they produce.
 */

/** Tier required to view a section */
export type ReportTier = 'free' | 'insight' | 'growth' | 'mastery';

/** Section IDs */
export type SectionId =
  | 'RS01' | 'RS02' | 'RS03' | 'RS04' | 'RS05' | 'RS06'
  | 'RS07' | 'RS08' | 'RS09' | 'RS10' | 'RS11' | 'RS12';

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

/** Generated section content (stored in assessment_reports.sections JSONB) */
export interface ReportSectionContent {
  title: string;
  content_markdown: string;
  coach_question: string;
  data_viz?: DataVisualization;
  word_count: number;
  min_tier: ReportTier;
  generated_at: string;
}

/** Data visualization payload — rendered by the frontend */
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
