/**
 * Decoded → Coach Handoff
 *
 * This module is the bridge between the Decoded assessment engine
 * and the Mastery Coach coaching engine. It transforms assessment
 * data into coaching context.
 *
 * Sprint 0.4
 */

export { buildAssessmentProfile } from './assessment-profile';
export type { AssessmentProfile } from './assessment-profile';
export { buildDecodedProfileLayer } from './prompt-layer';
export { generateFirstMessage } from './first-message';
