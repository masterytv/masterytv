/**
 * Decoded Report — Section Configuration
 *
 * Metadata for all 12 report sections defining titles, tiers,
 * visualization types, and rendering behavior.
 *
 * Source: DECODED_REPORT_STRUCTURE.md
 */

import type { SectionId, ReportTier } from '../prompts/types';

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

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'RS01',
    title: 'You, Decoded',
    subtitle: 'Your personality at a glance',
    minTier: 'free',
    hasVisualization: true,
    vizType: 'summary_table',
    icon: 'Sparkles',
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
  // --- UPGRADE GATE POSITIONED HERE ---
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

/** Get config for a specific section */
export function getSectionConfig(id: SectionId): SectionConfig | undefined {
  return SECTION_CONFIGS.find((s) => s.id === id);
}

/** Get all free section IDs */
export function getFreeSectionIds(): SectionId[] {
  return SECTION_CONFIGS.filter((s) => s.minTier === 'free').map((s) => s.id);
}

/** Get all locked section IDs */
export function getLockedSectionIds(): SectionId[] {
  return SECTION_CONFIGS.filter((s) => s.minTier !== 'free').map((s) => s.id);
}

/** Check if a user's tier unlocks a given section */
export function isSectionUnlocked(sectionTier: ReportTier, userTier: ReportTier): boolean {
  const tierOrder: ReportTier[] = ['free', 'insight', 'growth', 'mastery'];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(sectionTier);
}

/** The section ID after which the upgrade gate appears */
export const UPGRADE_GATE_AFTER: SectionId = 'RS07';
