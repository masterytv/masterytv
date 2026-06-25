/**
 * Attachment-style warm naming for the coach (Deno mirror of
 * src/lib/decoded/report/attachment-style.ts).
 *
 * Clinical labels read like diagnoses and make people defensive. The coach
 * leads with a warm name and frames attachment as a learned strategy, not a
 * flaw — keeping the clinical term only as an internal reference for the model.
 */

export interface AttachmentNaming {
  name: string;
  clinical: string;
}

const MAP: Record<string, AttachmentNaming> = {
  secure: { name: "Anchored", clinical: "secure" },
  "anxious-preoccupied": { name: "The Devoted", clinical: "anxious-preoccupied" },
  anxious: { name: "The Devoted", clinical: "anxious-preoccupied" },
  "dismissive-avoidant": { name: "The Independent", clinical: "dismissive-avoidant" },
  avoidant: { name: "The Independent", clinical: "dismissive-avoidant" },
  "fearful-avoidant": { name: "The Guarded Heart", clinical: "fearful-avoidant" },
  disorganized: { name: "The Guarded Heart", clinical: "fearful-avoidant" },
};

export function attachmentNaming(style: string): AttachmentNaming {
  const key = (style ?? "").toLowerCase().trim();
  return MAP[key] ?? { name: style, clinical: style };
}
