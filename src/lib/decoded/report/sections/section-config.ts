/**
 * Decoded Report — Section Configuration
 *
 * Metadata for report sections defining titles, tiers,
 * visualization types, and rendering behavior.
 *
 * v1: 12 instrument-organized sections (RS01–RS12)
 * v2: 8 domain-organized sections (S1–S8)
 */

import type { SectionId, SectionIdV1, SectionIdV2, ReportTier, ReportVersion } from '../prompts/types';

export interface SectionConfig {
  id: SectionId;
  title: string;
  subtitle: string;
  minTier: ReportTier;
  hasVisualization: boolean;
  vizType?: 'summary_table' | 'radar_chart' | 'quadrant_plot' | 'bar_chart' | 'wellness_radar';
  /** Icon name (lucide-react) */
  icon: string;
  /** Teaser description shown in the locked section preview */
  lockedTeaser: string;
}

// ─────────────────────────────────────────────────────
// v2 Section Config (domain-organized, 8 sections)
// ─────────────────────────────────────────────────────

export const SECTION_CONFIGS_V2: SectionConfig[] = [
  {
    id: 'S1',
    title: 'You at a Glance',
    subtitle: 'The snapshot of who you are',
    minTier: 'free',
    hasVisualization: false,
    icon: 'Fingerprint',
    lockedTeaser: '',
  },
  {
    id: 'S2',
    title: 'Your Personality',
    subtitle: 'How your traits interact to shape who you are',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'radar_chart',
    icon: 'Fingerprint',
    lockedTeaser: '',
  },
  {
    id: 'S3',
    title: 'Your Inner World',
    subtitle: 'The protectors and patterns running beneath the surface',
    minTier: 'free',
    hasVisualization: false,
    icon: 'Shield',
    lockedTeaser: '',
  },
  {
    id: 'S4',
    title: 'Your Emotions',
    subtitle: 'How you process, regulate, and recover',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'bar_chart',
    icon: 'Waves',
    lockedTeaser: '',
  },
  // ─── UPGRADE GATE ───
  {
    id: 'S5',
    title: 'Your Relationships',
    subtitle: 'How you love, fight, and connect',
    minTier: 'insight',
    hasVisualization: true,
    vizType: 'quadrant_plot',
    icon: 'Heart',
    lockedTeaser: 'Discover how your attachment style shapes your love life, conflict patterns, and deepest relationship needs.',
  },
  {
    id: 'S6',
    title: 'Your Career & Motivation',
    subtitle: 'What drives you and where you thrive',
    minTier: 'insight',
    hasVisualization: true,
    vizType: 'radar_chart',
    icon: 'Compass',
    lockedTeaser: 'Understand the gap between what motivates you internally versus externally, and find environments that fit your wiring.',
  },
  {
    id: 'S7',
    title: 'Your Wellbeing',
    subtitle: 'The foundation everything else is built on',
    minTier: 'growth',
    hasVisualization: true,
    vizType: 'wellness_radar',
    icon: 'Activity',
    lockedTeaser: 'See your wellness profile and understand which lifestyle factors are supporting or undermining your growth.',
  },
  {
    id: 'S8',
    title: 'Your Growth Map',
    subtitle: 'Specific, actionable steps forward',
    minTier: 'mastery',
    hasVisualization: false,
    icon: 'Map',
    lockedTeaser: 'Your personalized growth roadmap with three prioritized edges, specific actions, and a 30-day challenge.',
  },
];

// ─────────────────────────────────────────────────────
// v1 Section Config (instrument-organized, 12 sections)
// Preserved for backward compatibility with existing reports
// ─────────────────────────────────────────────────────

export const SECTION_CONFIGS_V1: SectionConfig[] = [
  {
    id: 'RS01',
    title: 'You, Decoded',
    subtitle: 'Your personality at a glance',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'summary_table',
    icon: 'Fingerprint',
    lockedTeaser: '',
  },
  {
    id: 'RS02',
    title: 'What We Found',
    subtitle: 'Cross-instrument insights most people miss',
    minTier: 'free',
    hasVisualization: false,
    icon: 'Search',
    lockedTeaser: '',
  },
  {
    id: 'RS03',
    title: 'Your Decoded Archetype',
    subtitle: 'The pattern behind your personality',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'radar_chart',
    icon: 'Fingerprint',
    lockedTeaser: '',
  },
  {
    id: 'RS04',
    title: 'The Big Five — Your Core Patterns',
    subtitle: 'How your traits interact to shape behavior',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'radar_chart',
    icon: 'Pentagon',
    lockedTeaser: '',
  },
  {
    id: 'RS05',
    title: 'Trait Deep Dive',
    subtitle: 'Each trait unpacked — gifts and challenges',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'bar_chart',
    icon: 'Layers',
    lockedTeaser: '',
  },
  {
    id: 'RS06',
    title: 'Your Attachment Map',
    subtitle: 'How you connect — and why',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'quadrant_plot',
    icon: 'Heart',
    lockedTeaser: '',
  },
  {
    id: 'RS07',
    title: 'Your Inner System',
    subtitle: 'The protectors and patterns running beneath the surface',
    minTier: 'free',
    hasVisualization: false,
    icon: 'Shield',
    lockedTeaser: '',
  },
  {
    id: 'RS08',
    title: 'Your Emotional Landscape',
    subtitle: 'Six dimensions of emotional regulation',
    minTier: 'insight',
    hasVisualization: true,
    vizType: 'bar_chart',
    icon: 'Waves',
    lockedTeaser: 'Discover how you process, manage, and recover from emotional intensity across six clinically-validated dimensions.',
  },
  {
    id: 'RS09',
    title: 'Motivation & Vocation',
    subtitle: 'What drives you — and what drains you',
    minTier: 'insight',
    hasVisualization: true,
    vizType: 'radar_chart',
    icon: 'Compass',
    lockedTeaser: 'Understand the gap between what motivates you externally versus internally, and where your vocational identity truly lives.',
  },
  {
    id: 'RS10',
    title: 'Relationship Patterns',
    subtitle: 'How your attachment shapes love and conflict',
    minTier: 'growth',
    hasVisualization: true,
    vizType: 'quadrant_plot',
    icon: 'Users',
    lockedTeaser: 'Explore the specific relationship dynamics your attachment and personality create — including your conflict style.',
  },
  {
    id: 'RS11',
    title: 'Wellness & Life Satisfaction',
    subtitle: 'The foundation everything else is built on',
    minTier: 'growth',
    hasVisualization: true,
    vizType: 'wellness_radar',
    icon: 'Activity',
    lockedTeaser: 'See your 10-dimension wellness profile and understand which lifestyle factors are supporting or undermining your growth.',
  },
  {
    id: 'RS12',
    title: 'Your Growth Map',
    subtitle: 'Where to go from here — specific, actionable, personalized',
    minTier: 'mastery',
    hasVisualization: false,
    icon: 'Map',
    lockedTeaser: 'Your personalized coaching roadmap with three prioritized growth edges and specific actions for each.',
  },
];

// ─────────────────────────────────────────────────────
// Version-aware helpers
// ─────────────────────────────────────────────────────

/** Get section configs for a given report version */
export function getSectionConfigs(version: ReportVersion = 2): SectionConfig[] {
  return version === 1 ? SECTION_CONFIGS_V1 : SECTION_CONFIGS_V2;
}

/**
 * Default export — v2 configs for new code.
 * Existing v1 code can import SECTION_CONFIGS_V1 explicitly.
 */
export const SECTION_CONFIGS = SECTION_CONFIGS_V2;

/** Get config for a specific section across both versions */
export function getSectionConfig(id: SectionId): SectionConfig | undefined {
  return (
    SECTION_CONFIGS_V2.find((s) => s.id === id) ??
    SECTION_CONFIGS_V1.find((s) => s.id === id)
  );
}

/** Get all free section IDs for a version */
export function getFreeSectionIds(version: ReportVersion = 2): SectionId[] {
  const configs = getSectionConfigs(version);
  return configs.filter((s) => s.minTier === 'free').map((s) => s.id);
}

/** Get all locked section IDs for a version */
export function getLockedSectionIds(version: ReportVersion = 2): SectionId[] {
  const configs = getSectionConfigs(version);
  return configs.filter((s) => s.minTier !== 'free').map((s) => s.id);
}

/** Check if a user's tier unlocks a given section */
export function isSectionUnlocked(sectionTier: ReportTier, userTier: ReportTier): boolean {
  const tierOrder: ReportTier[] = ['free', 'insight', 'growth', 'mastery'];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(sectionTier);
}

/** The section ID after which the upgrade gate appears */
export function getUpgradeGateAfter(version: ReportVersion = 2): SectionId {
  return version === 1 ? 'RS07' : 'S5';
}

/** @deprecated Use getUpgradeGateAfter() instead */
export const UPGRADE_GATE_AFTER: SectionId = 'S5';
