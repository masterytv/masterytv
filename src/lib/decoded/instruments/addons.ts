/**
 * Decoded — Add-On Instrument Definitions
 * 4 optional instruments triggered by adaptive logic post-Core.
 */

import type { InstrumentDef } from './core';

// ── GAD-7 ─────────────────────────────────────────────────────────────────
export const GAD7: InstrumentDef = {
  id: 'gad7', name: 'Anxiety Screening', shortName: 'Anxiety',
  layer: 'addon', itemCount: 7, scaleMin: 0, scaleMax: 3,
  scaleLabels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
  description: 'Over the last 2 weeks, how often have you been bothered by the following?',
  estimatedMinutes: 1,
  items: [
    { index: 1, text: 'Feeling nervous, anxious, or on edge' },
    { index: 2, text: 'Not being able to stop or control worrying' },
    { index: 3, text: 'Worrying too much about different things' },
    { index: 4, text: 'Trouble relaxing' },
    { index: 5, text: "Being so restless that it's hard to sit still" },
    { index: 6, text: 'Becoming easily annoyed or irritable' },
    { index: 7, text: 'Feeling afraid as if something awful might happen' },
  ],
};

// ── ASRS-v1.1 ─────────────────────────────────────────────────────────────
export const ASRS: InstrumentDef = {
  id: 'asrs', name: 'Attention & Focus', shortName: 'Focus',
  layer: 'addon', itemCount: 6, scaleMin: 0, scaleMax: 4,
  scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
  description: 'How often do you experience the following?',
  estimatedMinutes: 1,
  items: [
    { index: 1, text: 'How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?' },
    { index: 2, text: 'How often do you have difficulty getting things in order when you have to do a task that requires organization?' },
    { index: 3, text: 'How often do you have problems remembering appointments or obligations?' },
    { index: 4, text: 'When you have a task that requires a lot of thought, how often do you avoid or delay getting started?' },
    { index: 5, text: 'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?' },
    { index: 6, text: 'How often do you feel overly active and compelled to do things, like you were driven by a motor?' },
  ],
};

// ── CSI-4 ─────────────────────────────────────────────────────────────────
export const CSI4: InstrumentDef = {
  id: 'csi4', name: 'Relationship Satisfaction', shortName: 'Relationship',
  layer: 'addon', itemCount: 4, scaleMin: 0, scaleMax: 6,
  scaleLabels: [],
  description: 'If you are currently in a romantic relationship, please answer the following:',
  estimatedMinutes: 1,
  items: [
    {
      index: 1,
      text: 'Please indicate the degree of happiness, all things considered, of your relationship',
      scaleOverride: {
        min: 0, max: 6,
        labels: ['Extremely\nUnhappy', 'Fairly\nUnhappy', 'A Little\nUnhappy', 'Happy', 'Very\nHappy', 'Extremely\nHappy', 'Perfect'],
      },
    },
    {
      index: 2,
      text: 'I have a warm and comfortable relationship with my partner',
      scaleOverride: {
        min: 0, max: 5,
        labels: ['Not at\nAll', 'A\nLittle', 'Somewhat', 'Mostly', 'Almost\nCompletely', 'Completely'],
      },
    },
    {
      index: 3,
      text: 'How rewarding is your current relationship with your partner?',
      scaleOverride: {
        min: 0, max: 5,
        labels: ['Not at\nAll', 'A\nLittle', 'Somewhat', 'Mostly', 'Almost\nCompletely', 'Completely'],
      },
    },
    {
      index: 4,
      text: 'In general, how satisfied are you with your relationship?',
      scaleOverride: {
        min: 0, max: 5,
        labels: ['Not at\nAll', 'A\nLittle', 'Somewhat', 'Mostly', 'Almost\nCompletely', 'Completely'],
      },
    },
  ],
};

// ── ACE-3 ─────────────────────────────────────────────────────────────────
export const ACE3: InstrumentDef = {
  id: 'ace3', name: 'Early Experiences', shortName: 'Early Life',
  layer: 'addon', itemCount: 3, scaleMin: 0, scaleMax: 1,
  scaleType: 'boolean',
  scaleLabels: ['No', 'Yes'],
  description: 'These questions ask about experiences before age 18. Your answers are completely private and help personalize your coaching.',
  estimatedMinutes: 1,
  items: [
    { index: 1, text: 'Before age 18, did you live with anyone who was a problem drinker or alcoholic, or who used street drugs?' },
    { index: 2, text: 'Before age 18, did a parent or other adult in the household often push, grab, slap, or throw something at you, or ever hit you so hard that you had marks or were injured?' },
    { index: 3, text: 'Before age 18, did you often or very often feel that no one in your family loved you or thought you were important or special?' },
  ],
};

export const ADDON_INSTRUMENTS: InstrumentDef[] = [GAD7, ASRS, CSI4, ACE3];

/** Adaptive trigger rules — which add-ons to recommend based on Core scores */
export interface AdaptiveTrigger {
  addonId: string;
  condition: string;
  description: string;
}

export const ADAPTIVE_TRIGGERS: AdaptiveTrigger[] = [
  { addonId: 'gad7', condition: 'neuroticism >= 38', description: 'Elevated neuroticism suggests anxiety screening would be valuable' },
  { addonId: 'asrs', condition: 'conscientiousness <= 20', description: 'Low conscientiousness may indicate attention/focus challenges worth exploring' },
  { addonId: 'csi4', condition: 'always_offer', description: 'Offered to anyone in a romantic relationship' },
  { addonId: 'ace3', condition: 'always_offer', description: 'Always offered with sensitivity framing; includes safety gateway' },
];
