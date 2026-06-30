/**
 * Decoded — Instrument Definitions (Core Battery)
 * 9 Core instruments, ~113 items total
 * All users take the same Core battery.
 */

export interface InstrumentItem {
  index: number;
  text: string;
  reversed?: boolean;
  /** Per-item scale override — when items within the same instrument use different scales */
  scaleOverride?: {
    min: number;
    max: number;
    labels: string[];
  };
}

export interface InstrumentDef {
  id: string;
  name: string;
  shortName: string;
  layer: 'core' | 'addon' | 'depth';
  itemCount: number;
  scaleMin: number;
  scaleMax: number;
  scaleLabels: string[];
  scaleType?: 'likert' | 'numeric' | 'dropdown' | 'boolean';
  items: InstrumentItem[];
  description: string;
  estimatedMinutes: number;
}

// ── 1. IPIP-50 (Big Five) ─────────────────────────────────────────────────
export const IPIP50: InstrumentDef = {
  id: 'ipip50', name: 'Personality Profile', shortName: 'Personality (Big Five)',
  layer: 'core', itemCount: 50, scaleMin: 1, scaleMax: 5,
  scaleLabels: ['Very\nInaccurate', 'Moderately\nInaccurate', 'Neither', 'Moderately\nAccurate', 'Very\nAccurate'],
  description: 'How accurately do these statements describe you?',
  estimatedMinutes: 8,
  items: [
    { index: 1, text: 'I am the life of the party' },
    { index: 2, text: 'I feel little concern for others', reversed: true },
    { index: 3, text: 'I am always prepared' },
    { index: 4, text: 'I get stressed out easily' },
    { index: 5, text: 'I have a rich vocabulary' },
    { index: 6, text: "I don't talk a lot", reversed: true },
    { index: 7, text: 'I am interested in people' },
    { index: 8, text: 'I leave my belongings around', reversed: true },
    { index: 9, text: 'I am relaxed most of the time', reversed: true },
    { index: 10, text: 'I have difficulty understanding abstract ideas', reversed: true },
    { index: 11, text: 'I feel comfortable around people' },
    { index: 12, text: 'I insult people', reversed: true },
    { index: 13, text: 'I pay attention to details' },
    { index: 14, text: 'I worry about things' },
    { index: 15, text: 'I have a vivid imagination' },
    { index: 16, text: 'I keep in the background', reversed: true },
    { index: 17, text: "I sympathize with others' feelings" },
    { index: 18, text: 'I make a mess of things', reversed: true },
    { index: 19, text: 'I seldom feel blue', reversed: true },
    { index: 20, text: 'I am not interested in abstract ideas', reversed: true },
    { index: 21, text: 'I start conversations' },
    { index: 22, text: "I am not interested in other people's problems", reversed: true },
    { index: 23, text: 'I get chores done right away' },
    { index: 24, text: 'I am easily disturbed' },
    { index: 25, text: 'I have excellent ideas' },
    { index: 26, text: 'I have little to say', reversed: true },
    { index: 27, text: 'I have a soft heart' },
    { index: 28, text: 'I often forget to put things back in their proper place', reversed: true },
    { index: 29, text: 'I get upset easily', reversed: true },
    { index: 30, text: 'I do not have a good imagination', reversed: true },
    { index: 31, text: 'I talk to a lot of different people at parties' },
    { index: 32, text: 'I am not really interested in others', reversed: true },
    { index: 33, text: 'I like order' },
    { index: 34, text: 'I change my mood a lot' },
    { index: 35, text: 'I am quick to understand things' },
    { index: 36, text: "I don't like to draw attention to myself", reversed: true },
    { index: 37, text: 'I take time out for others' },
    { index: 38, text: 'I shirk my duties', reversed: true },
    { index: 39, text: 'I have frequent mood swings', reversed: true },
    { index: 40, text: 'I use difficult words', reversed: true },
    { index: 41, text: "I don't mind being the center of attention" },
    { index: 42, text: "I feel others' emotions" },
    { index: 43, text: 'I follow a schedule' },
    { index: 44, text: 'I get irritated easily' },
    { index: 45, text: 'I spend time reflecting on things' },
    { index: 46, text: 'I am quiet around strangers', reversed: true },
    { index: 47, text: 'I make people feel at ease' },
    { index: 48, text: 'I am exacting in my work', reversed: true },
    { index: 49, text: 'I often feel blue', reversed: true },
    { index: 50, text: 'I am full of ideas' },
  ],
};

// ── 2. RIASEC ─────────────────────────────────────────────────────────────
export const RIASEC: InstrumentDef = {
  id: 'riasec', name: 'Career Interests', shortName: 'Ideal Work (Holland Code)',
  layer: 'core', itemCount: 30, scaleMin: 1, scaleMax: 5,
  scaleLabels: ['Strongly\nDislike', 'Dislike', 'Neutral', 'Like', 'Strongly\nLike'],
  description: 'How much would you enjoy doing each of these activities?',
  estimatedMinutes: 5,
  items: [
    { index: 1, text: 'Build kitchen cabinets' },
    { index: 2, text: 'Study the structure of the human body' },
    { index: 3, text: 'Compose or arrange music' },
    { index: 4, text: 'Teach children how to read' },
    { index: 5, text: 'Start your own business' },
    { index: 6, text: 'Keep shipping and receiving records' },
    { index: 7, text: 'Repair household appliances' },
    { index: 8, text: 'Conduct biological research' },
    { index: 9, text: 'Write a screenplay' },
    { index: 10, text: 'Help people with personal or emotional difficulties' },
    { index: 11, text: 'Manage a retail store' },
    { index: 12, text: 'Proofread records or forms' },
    { index: 13, text: 'Operate a motorboat' },
    { index: 14, text: 'Develop a new medical treatment' },
    { index: 15, text: 'Design artwork for magazines' },
    { index: 16, text: 'Supervise the activities of children at a camp' },
    { index: 17, text: 'Negotiate business contracts' },
    { index: 18, text: 'Calculate the wages of employees' },
    { index: 19, text: 'Assemble electronic parts' },
    { index: 20, text: 'Study animal behavior' },
    { index: 21, text: 'Play in a band or orchestra' },
    { index: 22, text: 'Do volunteer work at a non-profit' },
    { index: 23, text: 'Lead a group in accomplishing a goal' },
    { index: 24, text: 'Inventory supplies using a computer' },
    { index: 25, text: 'Work on an offshore oil rig' },
    { index: 26, text: 'Do research on plants or animals' },
    { index: 27, text: 'Design a stage set for a play' },
    { index: 28, text: 'Help conduct a group therapy session' },
    { index: 29, text: 'Sell merchandise at a department store' },
    { index: 30, text: 'Stamp, sort, and distribute mail for an organization' },
  ],
};

// ── 3. ECR-R Short ────────────────────────────────────────────────────────
export const ECR_R_SHORT: InstrumentDef = {
  id: 'ecr_r_short', name: 'Attachment Style', shortName: 'Attachment',
  layer: 'core', itemCount: 12, scaleMin: 1, scaleMax: 7,
  scaleLabels: ['Strongly\nDisagree', '', '', 'Neutral', '', '', 'Strongly\nAgree'],
  description: 'How well do these statements describe your feelings in close relationships? If you\'re not currently in a romantic relationship, think about how you generally feel or have felt in past relationships.',
  estimatedMinutes: 2,
  items: [
    // Anxiety (1-6): all worded high-anxiety (agree = more anxious) — none reverse-keyed.
    { index: 1, text: "I'm afraid that I will lose my partner's love" },
    { index: 2, text: 'I often worry that my partner will not want to stay with me' },
    { index: 3, text: 'I often worry that my partner does not really love me' },
    { index: 4, text: "I worry that romantic partners won't care about me as much as I care about them" },
    { index: 5, text: 'I often wish that my partner\'s feelings for me were as strong as my feelings for them' },
    { index: 6, text: 'I worry a lot about my relationships' },
    // Avoidance (7-12): all worded high-avoidance EXCEPT item 8 (the one low-avoidance
    // item), which is reverse-keyed.
    { index: 7, text: 'I prefer not to show a partner how I feel deep down' },
    { index: 8, text: 'I feel comfortable sharing my private thoughts and feelings with my partner', reversed: true },
    { index: 9, text: 'I find it difficult to allow myself to depend on romantic partners' },
    { index: 10, text: "I don't feel comfortable opening up to romantic partners" },
    { index: 11, text: 'I prefer not to be too close to romantic partners' },
    { index: 12, text: 'I get uncomfortable when a romantic partner wants to be very close' },
  ],
};

// ── 4. SWLS ───────────────────────────────────────────────────────────────
export const SWLS: InstrumentDef = {
  id: 'swls', name: 'Life Satisfaction', shortName: 'Life Satisfaction',
  layer: 'core', itemCount: 5, scaleMin: 1, scaleMax: 7,
  scaleLabels: ['Strongly\nDisagree', '', '', 'Neutral', '', '', 'Strongly\nAgree'],
  description: 'How much do you agree with each statement about your life?',
  estimatedMinutes: 1,
  items: [
    { index: 1, text: 'In most ways my life is close to my ideal' },
    { index: 2, text: 'The conditions of my life are excellent' },
    { index: 3, text: 'I am satisfied with my life' },
    { index: 4, text: 'So far I have gotten the important things I want in life' },
    { index: 5, text: 'If I could live my life over, I would change almost nothing' },
  ],
};

// ── 5. SCS-SF ─────────────────────────────────────────────────────────────
export const SCS_SF: InstrumentDef = {
  id: 'scs_sf', name: 'Self-Compassion', shortName: 'Self-Compassion',
  layer: 'core', itemCount: 12, scaleMin: 1, scaleMax: 5,
  scaleLabels: ['Almost\nNever', 'Rarely', 'Sometimes', 'Often', 'Almost\nAlways'],
  description: 'How often do you experience the following?',
  estimatedMinutes: 2,
  items: [
    { index: 1, text: "When I fail at something important to me I become consumed by feelings of inadequacy", reversed: true },
    { index: 2, text: "I try to be understanding and patient towards those aspects of my personality I don't like" },
    { index: 3, text: 'When something painful happens I try to take a balanced view of the situation' },
    { index: 4, text: "When I'm feeling down, I tend to feel like most other people are probably happier than I am", reversed: true },
    { index: 5, text: 'I try to see my failings as part of the human condition' },
    { index: 6, text: "When I'm going through a very hard time, I give myself the caring and tenderness I need" },
    { index: 7, text: "When something upsets me I try to keep my emotions in balance" },
    { index: 8, text: "When I fail at something that's important to me, I tend to feel alone in my failure", reversed: true },
    { index: 9, text: "When I'm feeling down I tend to obsess and fixate on everything that's wrong", reversed: true },
    { index: 10, text: "When I feel inadequate in some way, I try to remind myself that feelings of inadequacy are shared by most people" },
    { index: 11, text: "I'm disapproving and judgmental about my own flaws and inadequacies", reversed: true },
    { index: 12, text: "I'm intolerant and impatient towards those aspects of my personality I don't like", reversed: true },
  ],
};

// ── 6. DERS-16 ────────────────────────────────────────────────────────────
export const DERS16: InstrumentDef = {
  id: 'ders16', name: 'Emotion Regulation', shortName: 'Emotion Reg.',
  layer: 'core', itemCount: 16, scaleMin: 1, scaleMax: 5,
  scaleLabels: ['Almost\nNever', 'Sometimes', 'About\nHalf', 'Most of\nthe Time', 'Almost\nAlways'],
  description: 'How often do the following apply to you?',
  estimatedMinutes: 3,
  items: [
    { index: 1, text: 'I have difficulty making sense out of my feelings' },
    { index: 2, text: 'I have no idea how I am going to feel' },
    { index: 3, text: 'I pay attention to how I feel', reversed: true },
    { index: 4, text: 'I am confused about how I feel' },
    { index: 5, text: 'When I am upset, I feel guilty for feeling that way' },
    { index: 6, text: 'When I am upset, I have difficulty getting work done' },
    { index: 7, text: 'When I am upset, I become out of control' },
    { index: 8, text: 'When I am upset, I have difficulty focusing on other things' },
    { index: 9, text: 'When I am upset, I feel out of control' },
    { index: 10, text: 'When I am upset, I feel ashamed with myself for feeling that way' },
    { index: 11, text: 'When I am upset, I believe that wallowing in it is all I can do' },
    { index: 12, text: 'When I am upset, it takes me a long time to feel better' },
    { index: 13, text: 'When I am upset, I start to feel very bad about myself' },
    { index: 14, text: 'When I am upset, I become angry with myself for feeling that way' },
    { index: 15, text: 'When I am upset, I have difficulty thinking about anything else' },
    { index: 16, text: 'When I am upset, my emotions feel overwhelming' },
  ],
};

// ── 7. WEIMS ──────────────────────────────────────────────────────────────
export const WEIMS: InstrumentDef = {
  id: 'weims', name: 'Work Motivation', shortName: 'Motivation',
  layer: 'core', itemCount: 18, scaleMin: 1, scaleMax: 7,
  scaleLabels: ['Not at\nAll', '', '', 'Moderate', '', '', 'Exactly'],
  description: 'Why do you do your work? Rate how well each statement corresponds to your reasons.',
  estimatedMinutes: 3,
  items: [
    { index: 1, text: 'Because this is the type of work I chose to do to attain a certain lifestyle' },
    { index: 2, text: 'For the income it provides me' },
    { index: 3, text: "I ask myself this question, I don't seem to be able to manage the important tasks related to this work" },
    { index: 4, text: 'Because I derive much pleasure from learning new things' },
    { index: 5, text: 'Because it has become a fundamental part of who I am' },
    { index: 6, text: "Because I want to be a 'winner' in life" },
    { index: 7, text: 'Because it is the type of work I have chosen to attain certain important objectives' },
    { index: 8, text: 'For the satisfaction I experience from taking on interesting challenges' },
    { index: 9, text: 'Because it allows me to earn money' },
    { index: 10, text: 'Because it is part of the way in which I have chosen to live my life' },
    { index: 11, text: 'Because I want to be very good at this work, otherwise I would be very disappointed' },
    { index: 12, text: "I don't know why, we are provided with unrealistic working conditions" },
    { index: 13, text: 'Because I want to succeed at this job, if not I would be very ashamed of myself' },
    { index: 14, text: 'Because I chose this type of work to attain my career goals' },
    { index: 15, text: 'For the satisfaction I experience when I am successful at doing difficult tasks' },
    { index: 16, text: 'Because this type of work provides me with security' },
    { index: 17, text: "I don't know, too much is expected of us" },
    { index: 18, text: 'Because this work is a part of my life' },
  ],
};

// ── 8. Flourishing Scale ──────────────────────────────────────────────────
export const FLOURISHING: InstrumentDef = {
  id: 'flourishing', name: 'Flourishing', shortName: 'Flourishing',
  layer: 'core', itemCount: 8, scaleMin: 1, scaleMax: 7,
  scaleLabels: ['Strongly\nDisagree', '', '', 'Mixed', '', '', 'Strongly\nAgree'],
  description: 'How much do you agree with each statement?',
  estimatedMinutes: 1,
  items: [
    { index: 1, text: 'I lead a purposeful and meaningful life' },
    { index: 2, text: 'My social relationships are supportive and rewarding' },
    { index: 3, text: 'I am engaged and interested in my daily activities' },
    { index: 4, text: 'I actively contribute to the happiness and well-being of others' },
    { index: 5, text: 'I am competent and capable in the activities that are important to me' },
    { index: 6, text: 'I am a good person and live a good life' },
    { index: 7, text: 'I am optimistic about my future' },
    { index: 8, text: 'People respect me' },
  ],
};

// ── 9. Decoded Wellness Check (Custom) ────────────────────────────────────
export const WELLNESS_CHECK: InstrumentDef = {
  id: 'wellness_check', name: 'Wellness Check', shortName: 'Wellness',
  layer: 'core', itemCount: 10, scaleMin: 0, scaleMax: 7,
  scaleLabels: [], // Mixed scales — handled per-item
  scaleType: 'likert',
  description: 'A quick check on your physical and mental wellness.',
  estimatedMinutes: 2,
  items: [
    { index: 1, text: 'How many days per week do you exercise for 20+ minutes?' },
    { index: 2, text: 'On average, how many hours of sleep do you get per night?' },
    { index: 3, text: 'How would you rate your current diet/nutrition?' },
    { index: 4, text: 'How often do you feel physically exhausted by end of day?', reversed: true },
    { index: 5, text: 'How often do you feel stressed to the point it affects your daily functioning?', reversed: true },
    { index: 6, text: 'When stressed, I tend to cope in healthy ways vs. unhealthy ways' },
    { index: 7, text: 'How many close relationships do you have where you feel truly seen?' },
    { index: 8, text: 'How often do you spend time on activities that give you a sense of purpose or meaning?' },
    { index: 9, text: 'How many hours per day do you spend on screens for non-work purposes?', reversed: true },
    { index: 10, text: 'How would you rate your overall energy level most days?' },
  ],
};

// Per-item scale overrides for Wellness Check
export const WELLNESS_CHECK_SCALES: Record<number, { min: number; max: number; labels: string[] }> = {
  1: { min: 0, max: 7, labels: ['0','1','2','3','4','5','6','7'] },
  2: { min: 1, max: 6, labels: ['<5 hours','5–6','6–7','7–8','8–9','9+'] },
  3: { min: 1, max: 5, labels: ['Very Poor','Poor','Fair','Good','Excellent'] },
  4: { min: 1, max: 5, labels: ['Rarely','Sometimes','About Half','Often','Almost Always'] },
  5: { min: 1, max: 5, labels: ['Rarely','Sometimes','About Half','Often','Almost Always'] },
  6: { min: 1, max: 5, labels: ['Mostly Unhealthy','Somewhat Unhealthy','Mixed','Somewhat Healthy','Mostly Healthy'] },
  7: { min: 1, max: 5, labels: ['0','1','2–3','4–5','6+'] },
  8: { min: 1, max: 5, labels: ['Rarely','Monthly','Weekly','Several Times/Week','Daily'] },
  9: { min: 1, max: 6, labels: ['<1 hour','1–2','2–4','4–6','6–8','8+'] },
  10: { min: 1, max: 5, labels: ['Very Low','Low','Moderate','High','Very High'] },
};

/** All Core instruments in presentation order */
export const CORE_INSTRUMENTS: InstrumentDef[] = [
  IPIP50, RIASEC, ECR_R_SHORT, SWLS, SCS_SF, DERS16, WEIMS, FLOURISHING, WELLNESS_CHECK,
];

/** Total Core item count */
export const CORE_ITEM_COUNT = CORE_INSTRUMENTS.reduce((sum, i) => sum + i.itemCount, 0); // ~161 but some are grouped
