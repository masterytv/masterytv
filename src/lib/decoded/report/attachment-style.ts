/**
 * Attachment-style display naming.
 *
 * The clinical labels (anxious-preoccupied, dismissive-avoidant, fearful-avoidant)
 * read like diagnoses and make people reject otherwise-accurate results ("I'm not
 * fearful — I don't avoid relationships"). There's no industry-standard friendly
 * naming, but the coaching best-practice is a strengths-based reframe describing
 * what someone NEEDS, not what they fear/avoid.
 *
 * We lead with a warm name and keep the clinical term as a small "in research…"
 * reference (honest + searchable, without leading with the indictment). Used by
 * the report's attachment quadrant + the Relationships section.
 */

export interface AttachmentStyleDisplay {
  /** Warm, non-clinical name shown prominently. */
  name: string;
  /** Clinical/research term, kept as a small secondary reference. */
  clinical: string;
  /** One-line, needs-based descriptor people recognize themselves in. */
  tagline: string;
}

/** Keyed by the canonical clinical label used across scoring + reports. */
export const ATTACHMENT_DISPLAY: Record<string, AttachmentStyleDisplay> = {
  'Secure': {
    name: 'Anchored',
    clinical: 'Secure',
    tagline: 'Comfortable with closeness and independence alike',
  },
  'Anxious-Preoccupied': {
    name: 'The Devoted',
    clinical: 'Anxious-Preoccupied',
    tagline: 'You love deeply and thrive on closeness and reassurance',
  },
  'Dismissive-Avoidant': {
    name: 'The Independent',
    clinical: 'Dismissive-Avoidant',
    tagline: 'You value your autonomy and stay steady on your own',
  },
  'Fearful-Avoidant': {
    name: 'The Guarded Heart',
    clinical: 'Fearful-Avoidant',
    tagline: 'You crave deep connection — and protect it carefully',
  },
};

/** Legacy / lowercase score keys → canonical clinical label. */
const LEGACY_MAP: Record<string, string> = {
  secure: 'Secure',
  anxious: 'Anxious-Preoccupied',
  avoidant: 'Dismissive-Avoidant',
  disorganized: 'Fearful-Avoidant',
  'fearful-avoidant': 'Fearful-Avoidant',
};

/** Resolve any stored style value to its display naming. */
export function attachmentDisplay(style: string | null | undefined): AttachmentStyleDisplay {
  if (!style) return { name: 'Your Style', clinical: '', tagline: '' };
  const key = LEGACY_MAP[style] ?? style;
  return ATTACHMENT_DISPLAY[key] ?? { name: key, clinical: key, tagline: '' };
}
