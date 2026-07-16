# Architecture — Decoded Adaptive Narrative Voices

> **Author:** Thomas Wood + Antigravity Orchestrator  
> **Date:** June 1, 2026  
> **Version:** 1.0  
> **Status:** ✅ Approved (June 1, 2026)  
> **Phase:** 2 — Architecture  
> **PRD:** [DECODED_NARRATIVE_VOICES_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_PRD.md) ✅ Approved  
> **Discovery:** [DECODED_NARRATIVE_VOICES_DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_DISCOVERY.md) ✅ Approved  
> **Design Authority:** [BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md)

---

## 1. Tech Stack

| Layer | Technology | Rationale |
|:---|:---|:---|
| **Type system** | TypeScript (strict mode) | Project standard; Zod validation for config |
| **Voice classification** | Pure TS function, no API calls | Same pattern as [classifier.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/archetypes/classifier.ts) — deterministic, <50ms |
| **Prompt assembly** | Template string concatenation | Same pattern as [templates.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/prompts/templates.ts) — no new dependencies |
| **Config validation** | Zod | Project standard (GEMINI.md §3C) |
| **Report generation** | GPT-4o via Edge Function | Existing pipeline — no model change |
| **Database** | Supabase Postgres | Existing — JSONB columns + new table |
| **Frontend** | Next.js App Router + Tailwind + Framer Motion | Project standard |

**No new dependencies.** This system is pure TypeScript — config objects, type definitions, and string assembly. Zero runtime packages.

---

## 2. Type System

All types live in `src/lib/decoded/report/voice/types.ts`.

### 2.1 Voice Identifiers

```typescript
/**
 * The 6 narrative voice identifiers.
 * These are stable strings — never use numeric indices.
 * Referenced by: voice config, assessment_reports.voice_profile, coach profile seeder (V2).
 */
export const VOICE_IDS = [
  'intellectual',
  'adventurer',
  'connector',
  'steward',
  'challenger',
  'sensitive',
] as const;

export type VoiceId = (typeof VOICE_IDS)[number];
```

### 2.2 Writing Dimensions

```typescript
/**
 * 6 writing dimensions that define a voice's prose style.
 * Each is a 1–10 scale with named anchors at low/mid/high.
 * 
 * These are REPORT dimensions (monologue), not coach dimensions (dialogue).
 * The mapping to coach dimensions is defined in config.coachProfileSeed.
 */
export interface WritingDimensions {
  /** Simple/short (1) ↔ Complex/compound (10) */
  sentenceStructure: number;
  /** Literal/concrete (1) ↔ Figurative/abstract (10) */
  metaphorDensity: number;
  /** Softened/hedged (1) ↔ Blunt/confrontational (10) */
  directness: number;
  /** Professional distance (1) ↔ Intimate care (10) */
  warmth: number;
  /** Fast/clipped (1) ↔ Slow/spacious (10) */
  pacing: number;
  /** Flowing narrative (1) ↔ Organized sections (10) */
  structurePreference: number;
}
```

### 2.3 Voice Profile

```typescript
/**
 * Complete voice profile definition.
 * Each voice includes its identity, dimensions, prompt text, and example phrases.
 */
export interface VoiceProfile {
  /** Stable identifier — matches VoiceId union */
  id: VoiceId;
  /** Human-readable name shown in UI (e.g., "The Intellectual") */
  displayName: string;
  /** One-line description for the voice picker */
  description: string;
  /** Which archetypes map to this voice (configurable) */
  archetypes: ArchetypeName[];
  /** Writing dimension values for this voice */
  dimensions: WritingDimensions;
  /** 
   * The prompt block (~200–400 tokens) injected into the system prompt.
   * Replaces DECODED_TONE_GUIDE's voice section.
   */
  promptBlock: string;
  /**
   * 3+ example phrases the LLM uses as style anchors.
   * Included in the prompt block for few-shot guidance.
   */
  examplePhrases: string[];
}
```

### 2.4 Tone Modifiers

```typescript
/**
 * Tone modifier identifiers — 4 clinical instrument-based adjustments.
 */
export const MODIFIER_IDS = [
  'compassion_boost',
  'anxiety_softener',
  'emotion_regulation_buffer',
  'attachment_sensitivity',
] as const;

export type ModifierId = (typeof MODIFIER_IDS)[number];

/**
 * Tone modifier definition.
 * Each modifier has a trigger condition and a prompt block.
 */
export interface ToneModifier {
  id: ModifierId;
  displayName: string;
  /** Source instrument for the trigger condition */
  sourceInstrument: string;
  /** 
   * Evaluator function — receives the raw InstrumentScore[] and returns
   * whether this modifier should activate.
   * Defined in config, not hardcoded in the resolver.
   */
  trigger: ToneModifierTrigger;
  /**
   * The prompt block (~100–200 tokens) appended after the voice block.
   */
  promptBlock: string;
  /**
   * Interaction rules — how this modifier adjusts when paired with specific voices.
   * Key = VoiceId, value = WritingDimension adjustments (partial).
   */
  voiceInteractions: Partial<Record<VoiceId, Partial<WritingDimensions>>>;
}

/**
 * Trigger configuration for a tone modifier.
 * All thresholds are config-driven (NVR24–NVR26).
 */
export interface ToneModifierTrigger {
  /** Type of check to perform */
  type: 'score_threshold' | 'interpretation_match' | 'compound';
  /** For score_threshold: which score field to check */
  scoreField?: 'totalScore' | `subscaleScores.${string}`;
  /** For score_threshold: comparison operator */
  operator?: 'gte' | 'lte';
  /** For score_threshold: the threshold value */
  threshold?: number;
  /** For interpretation_match: field and expected values */
  interpretationField?: string;
  matchValues?: string[];
  /** For compound: combine multiple conditions with AND/OR */
  conditions?: ToneModifierTrigger[];
  combinator?: 'AND' | 'OR';
}
```

### 2.5 Section Override

```typescript
/**
 * Section-level voice dimension overrides.
 * Applied after voice + modifiers to fine-tune specific sections.
 */
export interface SectionVoiceOverride {
  sectionId: SectionId;
  /** Partial dimension adjustments — additive (clamped to 1–10) */
  dimensionAdjustments: Partial<WritingDimensions>;
  /** Optional additional prompt text for this section */
  additionalPrompt?: string;
}
```

### 2.6 Coach Profile Seed (V1 Contract — NVR34)

```typescript
/**
 * The 8 coach profile dimensions (matches coach_profiles table).
 * These are DIALOGUE dimensions (chat), not report dimensions.
 */
export type CoachDimension = 
  | 'directness' | 'framing' | 'warmth' | 'autonomy'
  | 'pacing' | 'evidence_style' | 'accountability' | 'challenge_level';

/**
 * Coach profile seed mapping.
 * Maps each voice to initial coach_profiles dimension values.
 * The seeder (V2) consumes this to set coach dimensions from Decoded data.
 */
export type CoachProfileSeed = Record<VoiceId, Record<CoachDimension, number>>;

/**
 * Coach modifier delta mapping.
 * Maps each modifier to additive deltas on coach profile dimensions.
 */
export type CoachModifierDelta = Record<ModifierId, Partial<Record<CoachDimension, number>>>;
```

### 2.7 Assembled Voice Context

```typescript
/**
 * The complete voice context passed to the prompt assembler.
 * Produced by the voice pipeline, consumed by voice-prompt-assembler.
 */
export interface VoiceContext {
  /** The resolved voice profile */
  voice: VoiceProfile;
  /** Active tone modifiers (0–4) */
  activeModifiers: ToneModifier[];
  /** Section-level override for the current section (if any) */
  sectionOverride: SectionVoiceOverride | null;
  /** Safety-forced modifiers (from safety.ts) */
  safetyForcedModifiers: ModifierId[];
  /** The effective writing dimensions after all layers are applied */
  effectiveDimensions: WritingDimensions;
}

/**
 * Stored in assessment_reports.voice_profile JSONB (NVR31, NVR36).
 */
export interface StoredVoiceProfile {
  voiceId: VoiceId;
  modifiers: ModifierId[];
  /** Big Five z-scores at time of classification (for audit) */
  classificationInput: {
    archetype: string;
    zScores: Record<string, number>;
  };
}

/**
 * Row in assessment_report_versions table.
 * Each voice rewrite gets its own row (not embedded JSONB).
 * 
 * Design decision: Separate table avoids row bloat on the primary
 * assessment_reports table. See ADR-06.
 */
export interface ReportVersionRow {
  id: string;
  report_id: string;
  voice_id: VoiceId;
  sections: Record<SectionId, ReportSectionContent>;
  status: 'generating' | 'complete' | 'failed';
  sections_completed: number;
  total_sections: number;
  created_at: string;
  completed_at: string | null;
}
```

---

## 3. Module Design

### 3.1 Architecture Diagram

```mermaid
graph TD
    subgraph "Existing Pipeline (unchanged)"
        SE["Scoring Engine<br/>scoring/engine.ts"]
        AC["Archetype Classifier<br/>archetypes/classifier.ts"]
        ST["Score Transformer<br/>prompts/score-transformer.ts"]
        SL["Safety Layer<br/>safety.ts"]
        TPL["Section Templates<br/>prompts/templates.ts"]
    end

    subgraph "New Voice Pipeline"
        VC["Voice Classifier<br/>voice/voice-classifier.ts"]
        MR["Modifier Resolver<br/>voice/modifier-resolver.ts"]
        VPA["Voice Prompt Assembler<br/>voice/voice-prompt-assembler.ts"]
        CFG["Voice Config<br/>voice/config.ts"]
        TYP["Types<br/>voice/types.ts"]
    end

    SE -->|InstrumentScore[]| AC
    SE -->|InstrumentScore[]| ST
    SE -->|InstrumentScore[]| SL
    
    AC -->|ArchetypeResult| VC
    SE -->|InstrumentScore[]| MR
    SL -->|SafetyFlags| MR
    
    CFG --> VC
    CFG --> MR
    CFG --> VPA
    TYP --> VC
    TYP --> MR
    TYP --> VPA
    
    VC -->|VoiceProfile| VPA
    MR -->|ToneModifier[]| VPA
    
    VPA -->|voicePromptBlock| BSP["buildSectionPrompt()<br/>(modified)"]
    TPL -->|sectionPrompt| BSP
    ST -->|scoreData| BSP
    SL -->|safetyAddendum| BSP
    
    BSP -->|system + user prompt| GPT["GPT-4o"]
    GPT -->|ReportSectionContent| DB["assessment_reports<br/>(sections JSONB)"]

    style VC fill:#ffd700,stroke:#333
    style MR fill:#ffd700,stroke:#333
    style VPA fill:#ffd700,stroke:#333
    style CFG fill:#ffd700,stroke:#333
    style TYP fill:#ffd700,stroke:#333
```

### 3.2 Module Specifications

---

#### [NEW] `src/lib/decoded/report/voice/types.ts`

**Purpose:** All type definitions for the voice system (§2 above).  
**Dependencies:** Imports `ArchetypeName` from `../../archetypes/types`, `SectionId` from `../prompts/types`.  
**Consumers:** All other voice modules, coach profile seeder (V2).  
**Exports:** All types and const arrays (`VOICE_IDS`, `MODIFIER_IDS`).

---

#### [NEW] `src/lib/decoded/report/voice/config.ts`

**Purpose:** Single source of truth for all tunable parameters (NVR24–NVR26).  
**Dependencies:** `types.ts`, `zod` for validation.

**Structure:**
```typescript
import { z } from 'zod';
import type { VoiceProfile, ToneModifier, SectionVoiceOverride, CoachProfileSeed, CoachModifierDelta } from './types';

// ── Schema validation ──
const WritingDimensionsSchema = z.object({
  sentenceStructure: z.number().min(1).max(10),
  metaphorDensity: z.number().min(1).max(10),
  directness: z.number().min(1).max(10),
  warmth: z.number().min(1).max(10),
  pacing: z.number().min(1).max(10),
  structurePreference: z.number().min(1).max(10),
});

// ... full Zod schemas for VoiceProfile, ToneModifier, etc.

// ── Voice Profiles ──
export const VOICE_PROFILES: Record<VoiceId, VoiceProfile> = { ... };

// ── Tone Modifiers ──
export const TONE_MODIFIERS: Record<ModifierId, ToneModifier> = { ... };

// ── Archetype → Voice Mapping (configurable) ──
export const ARCHETYPE_VOICE_MAP: Record<ArchetypeName, VoiceId> = { ... };

// ── Section Overrides ──
export const SECTION_VOICE_OVERRIDES: SectionVoiceOverride[] = [ ... ];

// ── Coach Profile Seeds (V1 contract — NVR34) ──
export const COACH_PROFILE_SEED: CoachProfileSeed = { ... };
export const COACH_MODIFIER_DELTAS: CoachModifierDelta = { ... };

// ── Fallback voice when classification fails ──
export const FALLBACK_VOICE: VoiceId = 'connector';

// ── Validate at import time (build-time safety) ──
validateConfig();
```

**Design decision:** Config is validated at import time, not at call time. If the config is invalid, the module throws during build — catching errors before they reach production. This follows the Zod pattern already used in the project.

---

#### [NEW] `src/lib/decoded/report/voice/voice-classifier.ts`

**Purpose:** Takes an `ArchetypeResult` → returns a `VoiceId` (NV01).  
**Pattern:** Mirrors [classifier.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/archetypes/classifier.ts) — pure function, deterministic, no API calls.

```typescript
import type { ArchetypeResult } from '../../archetypes/types';
import type { VoiceId, VoiceProfile } from './types';
import { ARCHETYPE_VOICE_MAP, VOICE_PROFILES, FALLBACK_VOICE } from './config';

/**
 * Classify an archetype result into a narrative voice.
 * 
 * Algorithm:
 * 1. Look up primary archetype in ARCHETYPE_VOICE_MAP
 * 2. If not found (shouldn't happen), use FALLBACK_VOICE
 * 3. Return the full VoiceProfile
 * 
 * Complexity: O(1) — simple map lookup
 * Latency: <1ms
 */
export function classifyVoice(archetype: ArchetypeResult): VoiceProfile {
  const voiceId: VoiceId = ARCHETYPE_VOICE_MAP[archetype.primary.name] ?? FALLBACK_VOICE;
  return VOICE_PROFILES[voiceId];
}
```

**Why not use z-scores directly?** The archetype classifier already does the heavy lifting of z-score → prototype matching. The voice classifier is a thin mapping on top. This keeps the two systems decoupled — archetype centroids can change without affecting voice assignments (just update the mapping table in config).

---

#### [NEW] `src/lib/decoded/report/voice/modifier-resolver.ts`

**Purpose:** Takes `InstrumentScore[]` + `SafetyFlags` → returns `ToneModifier[]` (NV03).

```typescript
import type { InstrumentScore } from '../../scoring/types';
import type { SafetyFlags } from '../safety';
import type { ToneModifier, ModifierId } from './types';
import { TONE_MODIFIERS } from './config';

/**
 * Resolve which tone modifiers are active for this user's scores.
 * 
 * Algorithm:
 * 1. Evaluate each modifier's trigger condition against the scores
 * 2. Check safety flag overrides (highDistress → compassion_boost + anxiety_softener)
 * 3. Return deduplicated array of active modifiers
 * 
 * Complexity: O(M × I) where M = 4 modifiers, I = instruments. Effectively O(1).
 * Latency: <5ms
 */
export function resolveModifiers(
  scores: InstrumentScore[],
  safetyFlags: SafetyFlags,
): { modifiers: ToneModifier[]; safetyForced: ModifierId[] } {
  const active = new Map<ModifierId, ToneModifier>();
  const safetyForced: ModifierId[] = [];

  // 1. Evaluate trigger conditions
  for (const modifier of Object.values(TONE_MODIFIERS)) {
    if (evaluateTrigger(modifier.trigger, scores)) {
      active.set(modifier.id, modifier);
    }
  }

  // 2. Safety overrides (NVR10, NVR11)
  if (safetyFlags.highDistress) {
    forceModifier('compassion_boost', active, safetyForced);
    forceModifier('anxiety_softener', active, safetyForced);
  }
  if (safetyFlags.emotionalRegulationConcern) {
    forceModifier('emotion_regulation_buffer', active, safetyForced);
  }

  return {
    modifiers: [...active.values()],
    safetyForced,
  };
}

function evaluateTrigger(trigger: ToneModifierTrigger, scores: InstrumentScore[]): boolean { ... }
function forceModifier(id: ModifierId, active: Map, forced: ModifierId[]): void { ... }
```

---

#### [NEW] `src/lib/decoded/report/voice/voice-prompt-assembler.ts`

**Purpose:** Merges voice + modifiers + section overrides → final voice prompt block (NV05).

```typescript
import type { SectionId } from '../prompts/types';
import type { VoiceContext, VoiceProfile, ToneModifier, WritingDimensions, SectionVoiceOverride } from './types';
import { SECTION_VOICE_OVERRIDES } from './config';

/**
 * Assemble the complete voice prompt block for a given section.
 * 
 * This REPLACES the hardcoded DECODED_TONE_GUIDE voice instructions.
 * Section-specific instructions (RS01–RS12) remain unchanged.
 * 
 * Assembly order:
 * 1. Voice profile prompt block (200–400 tokens)
 * 2. Active modifier prompt blocks (0–400 tokens)
 * 3. Voice×modifier interaction adjustments
 * 4. Section-level override prompt (0–100 tokens)
 * 
 * Token budget: ≤800 tokens for voice-injected content (blocks 1–4 above).
 * Full system prompt including static preamble, safety rules, output format,
 * and section-specific instructions will be ~1200–1600 tokens total.
 * This is well within GPT-4o's context window.
 * 
 * @returns VoiceContext with the assembled prompt block and effective dimensions
 */
export function assembleVoicePrompt(
  voice: VoiceProfile,
  modifiers: ToneModifier[],
  sectionId: SectionId,
  safetyForcedModifiers: ModifierId[],
): VoiceContext {
  // 1. Start with base voice dimensions
  let effectiveDimensions: WritingDimensions = { ...voice.dimensions };

  // 2. Apply modifier interactions (e.g., Compassion + Challenger → reduce directness)
  for (const modifier of modifiers) {
    const interaction = modifier.voiceInteractions[voice.id];
    if (interaction) {
      effectiveDimensions = mergeDimensions(effectiveDimensions, interaction);
    }
  }

  // 3. Apply section overrides
  const sectionOverride = SECTION_VOICE_OVERRIDES.find(o => o.sectionId === sectionId) ?? null;
  if (sectionOverride) {
    effectiveDimensions = mergeDimensions(effectiveDimensions, sectionOverride.dimensionAdjustments);
  }

  return {
    voice,
    activeModifiers: modifiers,
    sectionOverride,
    safetyForcedModifiers,
    effectiveDimensions,
  };
}

/**
 * Build the prompt string from a VoiceContext.
 * Called by the modified buildSectionPrompt().
 */
export function buildVoicePromptBlock(ctx: VoiceContext): string {
  const parts: string[] = [];

  // Voice identity + dimensions + examples
  parts.push(ctx.voice.promptBlock);

  // Modifier blocks
  for (const modifier of ctx.activeModifiers) {
    parts.push(modifier.promptBlock);
  }

  // Section override
  if (ctx.sectionOverride?.additionalPrompt) {
    parts.push(ctx.sectionOverride.additionalPrompt);
  }

  return parts.join('\n\n');
}

/** Merge partial dimension adjustments (additive, clamped 1–10) */
function mergeDimensions(base: WritingDimensions, delta: Partial<WritingDimensions>): WritingDimensions { ... }
```

---

#### [NEW] `src/lib/decoded/report/voice/test-profiles.ts`

**Purpose:** 24 synthetic test profiles for pre-launch QA (NV07).

```typescript
import type { InstrumentScore } from '../../scoring/types';
import type { ArchetypeResult } from '../../archetypes/types';
import type { VoiceId, ModifierId } from './types';

export interface TestProfile {
  id: string;
  name: string;
  expectedVoice: VoiceId;
  expectedModifiers: ModifierId[];
  scores: InstrumentScore[];
  archetype: ArchetypeResult;
  reviewed: boolean;
}

/** 
 * 24 test profiles: 4 per voice × varying modifier combinations.
 * Each profile has fixed scores that deterministically produce
 * the expected voice + modifier combination.
 */
export const TEST_PROFILES: TestProfile[] = [ ... ];
```

---

### 3.3 Modified Existing Files

#### [MODIFY] `src/lib/decoded/report/prompts/templates.ts`

**What changes:**
1. Extract `DECODED_TONE_GUIDE` from a `const` to a function parameter
2. Modify `buildSectionPrompt()` to accept an optional `voicePromptBlock` parameter
3. When `voicePromptBlock` is provided, replace the voice/tone section of `DECODED_TONE_GUIDE` with it; preserve the `CRITICAL RULES` and `OUTPUT FORMAT` sections unchanged

```typescript
// BEFORE (current):
const DECODED_TONE_GUIDE = `You are a senior personality coach...
VOICE & TONE:
- Write in second person...
...
OUTPUT FORMAT:
...`;

export function buildSectionPrompt(sectionId, scoreData, archetype, bigFive) { ... }

// AFTER:
// Split DECODED_TONE_GUIDE into: ROLE_PREAMBLE (static) + VOICE_SECTION (replaceable) + RULES_AND_FORMAT (static)

const ROLE_PREAMBLE = `You are a senior personality coach writing a section of a premium personality report for Decoded (mastery.tv/decoded).`;

const DEFAULT_VOICE_SECTION = `VOICE & TONE:
- Write in second person ("You tend to…", "Your pattern shows…")
- Be direct, warm, and specific. Not clinical. Not flattering. Not vague.
- Think of this as the first session of a coaching relationship — you've just read their full file
- Surprise them with insight they haven't heard before
- Every paragraph should make them feel SEEN, not labeled`;

const RULES_AND_FORMAT = `CRITICAL RULES:
...
OUTPUT FORMAT:
...`;

// Preserved for backward compatibility
const DECODED_TONE_GUIDE = `${ROLE_PREAMBLE}\n\n${DEFAULT_VOICE_SECTION}\n\n${RULES_AND_FORMAT}`;

/**
 * Build the final prompt messages for a given section.
 * 
 * @param voicePromptBlock — If provided, replaces DEFAULT_VOICE_SECTION.
 *   This is the output of voice-prompt-assembler.buildVoicePromptBlock().
 *   When undefined, falls back to the original single-voice behavior.
 */
export function buildSectionPrompt(
  sectionId: string,
  scoreDataJson: string,
  archetypeJson: string,
  bigFiveJson: string,
  voicePromptBlock?: string,
): { system: string; user: string } {
  const template = REPORT_PROMPTS[sectionId];
  if (!template) throw new Error(`Unknown section ID: ${sectionId}`);

  // Build the system prompt with voice block injection
  const toneGuide = voicePromptBlock
    ? `${ROLE_PREAMBLE}\n\n${voicePromptBlock}\n\n${RULES_AND_FORMAT}`
    : DECODED_TONE_GUIDE;

  // Replace the hardcoded DECODED_TONE_GUIDE in the section's systemPrompt
  const system = template.systemPrompt.replace(DECODED_TONE_GUIDE, toneGuide);

  const user = template.userPromptTemplate
    .replace('{{archetype}}', archetypeJson)
    .replace('{{bigFive}}', bigFiveJson)
    .replace('{{sectionData}}', scoreDataJson);

  return { system, user };
}
```

**Key design decision:** The `DECODED_TONE_GUIDE` const remains exported for backward compatibility. Existing code that doesn't pass `voicePromptBlock` continues to work identically. This is a non-breaking change.

> [!NOTE]
> **Section template tone audit (completed):** All 12 section-specific templates in `REPORT_PROMPTS` were audited for tone directives that could conflict with injected voice profiles. Finding: section templates are overwhelmingly data/structure-focused ("identify 3 patterns", "cover all 6 DERS dimensions") with no direct voice-style instructions. A few borderline phrases (RS01: "immediately compelling", RS03: "feel like meeting yourself") describe user experience, not writing style, and will not conflict with voice injection. **No sanitization pass required.** Future section template additions should follow this convention: describe WHAT to analyze and WHAT structure to use, never HOW to write it — the voice system handles that.

---

#### [MODIFY] `src/lib/decoded/report/safety.ts`

**What changes:** Add a `forceModifiers` output to `SafetyFlags` so the modifier resolver knows which modifiers to force.

```typescript
// ADD to SafetyFlags interface:
export interface SafetyFlags {
  showCrisisResources: boolean;
  highDistress: boolean;
  emotionalRegulationConcern: boolean;
  riskLevel: 'standard' | 'elevated' | 'high';
  /** NEW: Modifier IDs that must be forced regardless of score thresholds */
  forceModifiers: ModifierId[];
}

// ADD to evaluateSafetyFlags():
const forceModifiers: ModifierId[] = [];
if (highDistress) {
  forceModifiers.push('compassion_boost', 'anxiety_softener');
}
if (emotionalRegulationConcern) {
  forceModifiers.push('emotion_regulation_buffer');
}
// ... return { ...existing, forceModifiers };
```

---

#### [MODIFY] `src/lib/decoded/report/generate.ts`

**What changes:** Pass `voice_profile` JSONB in the report insert and the Edge Function invocation body.

```typescript
// In the insert call, add voice_profile:
const { data: report } = await supabase
  .from('assessment_reports')
  .insert({
    assessment_id: assessmentId,
    user_id: user.id,
    sections: {},
    generation_model: 'gpt-4o',
    voice_profile: voiceProfileJson,  // NEW: { voiceId, modifiers, classificationInput }
    voice_versions: {},               // NEW: empty, populated by rewrites
  })
  .select('id')
  .single();

// In the Edge Function invocation body, pass voice context:
body: JSON.stringify({
  assessment_id: assessmentId,
  report_id: report.id,
  voice_profile: voiceProfileJson,  // NEW
}),
```

---

## 4. Integration Points

### 4.1 Data Flow — Full Pipeline

```
1. User completes assessment
2. Scoring Engine → InstrumentScore[] (10 instruments)
3. Archetype Classifier → ArchetypeResult (primary + secondary)

── NEW STEPS ──
4. Voice Classifier(ArchetypeResult) → VoiceProfile
5. Safety Layer(InstrumentScore[]) → SafetyFlags (with forceModifiers)
6. Modifier Resolver(InstrumentScore[], SafetyFlags) → ToneModifier[]
7. Store { voiceId, modifiers } in assessment_reports.voice_profile

── PER SECTION (12×) ──
8.  Score Transformer(sectionId, scores, archetype) → sectionScoreData
9.  Voice Prompt Assembler(voice, modifiers, sectionId) → VoiceContext
10. buildVoicePromptBlock(VoiceContext) → voicePromptBlock (string)
11. buildSectionPrompt(sectionId, scoreData, archetype, bigFive, voicePromptBlock) → { system, user }
12. GPT-4o(system, user) → ReportSectionContent
13. Store in assessment_reports.sections[sectionId]
```

### 4.2 Voice Rewrite Flow

```
1. User clicks "Read it differently" → selects new voiceId
2. Client checks assessment_report_versions for cached version
   → If status = 'complete', serve cached version immediately
   → If status = 'generating', show progress indicator
   → If not found or status = 'failed', proceed to step 3
3. Client calls rewrite Edge Function with { report_id, target_voice_id }
4. Edge Function:
   a. Create assessment_report_versions row with status = 'generating'
   b. Load existing assessment scores + archetype from assessment_scores
   c. Voice Classifier → new VoiceProfile (from target_voice_id, not archetype)
   d. Modifier Resolver → same modifiers as original (scores haven't changed)
   e. For each unlocked section:
      - Reassemble voice prompt → call GPT-4o
      - Write section to the version row incrementally
      - Update sections_completed counter
   f. On success: set status = 'complete', completed_at = now()
   g. On failure: set status = 'failed', log error
5. Client polls assessment_report_versions for progress (same pattern as initial generation)
6. Frontend only renders a version if status = 'complete'; ignores 'generating'/'failed' entries
```

> [!IMPORTANT]
> **Partial rewrite resilience:** If a user closes their browser during rewrite, the version row stays at `status: 'generating'`. On next visit, the frontend sees the incomplete version and offers to restart. The Edge Function is idempotent — re-triggering with the same `report_id + voice_id` upserts the version row and starts fresh.

### 4.3 Dependency Graph (Import Order)

```
types.ts ← has no imports (except ArchetypeName, SectionId from existing)
config.ts ← imports types.ts, zod
voice-classifier.ts ← imports types.ts, config.ts, ../../archetypes/types
modifier-resolver.ts ← imports types.ts, config.ts, ../../scoring/types, ../safety
voice-prompt-assembler.ts ← imports types.ts, config.ts, ../prompts/types
test-profiles.ts ← imports types.ts, ../../scoring/types, ../../archetypes/types
```

No circular dependencies. All imports flow downward from types → config → modules.

---

## 5. Database Schema

### 5.1 Migrations

```sql
-- Migration: 20260601_add_voice_profile.sql

-- 1. Add voice_profile column to assessment_reports
--    (NOT voice_versions — those go in a separate table per ADR-06)
ALTER TABLE assessment_reports
  ADD COLUMN IF NOT EXISTS voice_profile jsonb DEFAULT NULL;

-- voice_profile schema: { voiceId: string, modifiers: string[], classificationInput: {...} }

COMMENT ON COLUMN assessment_reports.voice_profile IS 
  'Voice classification result: voiceId, active modifiers, and classification input. Set at report generation time.';

-- 2. Report versions table (voice rewrites)
--    Separate table to avoid row bloat on assessment_reports.
--    Each rewrite is ~20-25KB of section content; 6 rewrites would add
--    ~150KB to the primary report row, degrading all queries that touch it.
CREATE TABLE IF NOT EXISTS assessment_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES assessment_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id text NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'complete', 'failed')),
  sections_completed integer NOT NULL DEFAULT 0,
  total_sections integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (report_id, voice_id)  -- One version per voice per report
);

COMMENT ON TABLE assessment_report_versions IS
  'Cached voice rewrites. Each row holds a full report rewrite in a specific voice. The UNIQUE constraint on (report_id, voice_id) ensures at most one version per voice.';

-- RLS: users access only their own versions
ALTER TABLE assessment_report_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own report versions"
  ON assessment_report_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage report versions"
  ON assessment_report_versions FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_report_versions_report ON assessment_report_versions(report_id);
CREATE INDEX idx_report_versions_status ON assessment_report_versions(report_id, status);

-- 3. Voice feedback table
CREATE TABLE IF NOT EXISTS voice_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_voice_id text NOT NULL,
  rewrite_voice_id text,
  preferred_voice_id text,
  free_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: users access only their own feedback
ALTER TABLE voice_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own voice feedback"
  ON voice_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own voice feedback"
  ON voice_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admin read access (for analytics)
CREATE POLICY "Service role can read all voice feedback"
  ON voice_feedback FOR SELECT
  USING (auth.role() = 'service_role');

-- Indexes for analytics
CREATE INDEX idx_voice_feedback_voice_ids 
  ON voice_feedback(original_voice_id, preferred_voice_id);
CREATE INDEX idx_voice_feedback_user 
  ON voice_feedback(user_id);
CREATE INDEX idx_voice_feedback_created
  ON voice_feedback(created_at DESC);

-- 3. Index on voice_profile for analytics queries
CREATE INDEX idx_assessment_reports_voice 
  ON assessment_reports USING gin(voice_profile);
```

### 5.2 RLS Analysis

| Table | Policy | Concern |
|:---|:---|:---|
| `assessment_reports` | Existing RLS unchanged — `voice_profile` column inherits existing policies | ✅ No change needed |
| `assessment_report_versions` | Users SELECT their own rows; service_role manages all (Edge Function writes) | ✅ Standard pattern |
| `voice_feedback` | Users insert/read their own rows only; service_role reads all | ✅ Standard pattern |

No new RLS vulnerabilities. The `voice_profile` column is read/written through existing `assessment_reports` policies which already enforce `user_id = auth.uid()`. Report versions are created by the Edge Function (service_role) and read by the user (their own rows only).

---

## 6. API Contracts

### 6.1 Voice Classification (Internal — No HTTP API)

```typescript
// Called during report generation, before section loop
import { classifyVoice } from '@/lib/decoded/report/voice/voice-classifier';
import { resolveModifiers } from '@/lib/decoded/report/voice/modifier-resolver';

const voiceProfile = classifyVoice(archetypeResult);
const { modifiers, safetyForced } = resolveModifiers(scores, safetyFlags);
```

### 6.2 Voice Rewrite (Edge Function — New)

```
POST /functions/v1/decoded-rewrite-voice

Headers:
  Authorization: Bearer <jwt>

Body:
{
  "report_id": "uuid",
  "target_voice_id": "challenger"  // VoiceId
}

Response (SSE stream):
event: progress
data: { "section": "RS01", "status": "generating" }

event: progress  
data: { "section": "RS01", "status": "complete" }

event: done
data: { "voice_id": "challenger", "sections_generated": 7, "total_cost_usd": 0.15 }
```

### 6.3 Voice Feedback (Client → Supabase Direct)

```typescript
// No Edge Function needed — direct Supabase insert
await supabase.from('voice_feedback').insert({
  assessment_id,
  user_id: user.id,
  original_voice_id: 'intellectual',
  rewrite_voice_id: 'challenger',
  preferred_voice_id: 'challenger',
  free_text: 'The Challenger felt more like me',
});
```

---

## 7. Architectural Decision Records (ADRs)

### ADR-01: Config-in-Code vs. Config-in-Database

**Decision:** Config lives in TypeScript files (`voice/config.ts`), not in a database table.

**Rationale:**
- Voice profiles are prompt text (~400 tokens each) — they need version control and code review
- Zod validation catches errors at build time, not runtime
- Changes deploy with the app, not as hot patches to production
- The config is read-only at runtime — no user-facing admin UI needed for V1
- Consistent with existing patterns (e.g., `ARCHETYPE_CENTROIDS` in classifier.ts, `REPORT_PROMPTS` in templates.ts)

**Trade-off:** Can't adjust thresholds without a deploy. Acceptable for V1 — we have test profiles for pre-deploy QA.

---

### ADR-02: Voice Classification — Map Lookup vs. Distance-Based

**Decision:** Simple archetype → voice map lookup in config, not a secondary z-score distance calculation.

**Rationale:**
- The archetype classifier already does the complex z-score work
- A secondary distance calculation would create two "classification" systems that could disagree
- Map lookup is O(1), deterministic, and trivially testable
- If we need finer-grained voice assignment later, we add z-score conditions to the map (config change, not code change)

---

### ADR-03: DECODED_TONE_GUIDE — Replace vs. Inject

**Decision:** Split `DECODED_TONE_GUIDE` into 3 parts (preamble + voice section + rules/format). The voice section is replaceable; the other two are static.

**Rationale:**
- The `CRITICAL RULES` section (no diagnostic language, growth framing, no raw scores) must apply to ALL voices — it's safety-critical
- The `OUTPUT FORMAT` section (JSON structure) must be consistent across all voices
- Only the `VOICE & TONE` section varies per voice
- Splitting preserves backward compatibility — if `voicePromptBlock` is undefined, the original tone guide is used

---

### ADR-04: Modifier Evaluation — Trigger Config vs. Hardcoded Logic

**Decision:** Modifier triggers are defined as declarative config objects (`ToneModifierTrigger` type) evaluated by a generic `evaluateTrigger()` function.

**Rationale:**
- Adding a 5th modifier requires only config (NVR-10 requirement)
- Trigger logic is the same pattern: "check a score field against a threshold"
- The compound trigger type handles complex cases (e.g., "SCS ≤ 2.5 OR selfJudgment ≥ 4.0")
- Testable in isolation — each trigger config can be unit tested without the full pipeline

---

### ADR-05: Voice Rewrite — Full Regeneration vs. Template Swaps

**Decision:** Voice rewrites regenerate all unlocked sections via GPT-4o (full cost). Not template substitutions.

**Rationale:**
- Template swaps would produce obviously artificial voice changes — the LLM needs to write fresh prose in the target voice
- The same data + different voice prompt → genuinely different writing style
- Cached in `voice_versions` JSONB — each voice is generated at most once per report
- Cost: ~$0.15 per full report generation × up to 6 voices = $0.90 max per user (approved trade-off)

---

### ADR-06: Voice Versions — Separate Table (Revised After Review)

**Decision:** Voice versions stored in a dedicated `assessment_report_versions` table with a 1-to-many relationship to `assessment_reports`.

**Original proposal:** JSONB column on `assessment_reports`. Rejected after code review revealed:
- [page.tsx L28](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/app/decoded/report/%5Bid%5D/page.tsx#L28) uses `.select('*')` — would pull all version data on every page load
- Actual report size is ~20-25KB per version (not 5KB as originally estimated: 12 sections × ~700 words × ~3 bytes/word + JSON overhead), so 6 versions = ~150KB bloat on the primary row
- Polling queries in [ReportViewer.tsx L80](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/app/decoded/report/%5Bid%5D/ReportViewer.tsx#L80) would transfer this blob every 5 seconds during generation

**Rationale for separate table:**
- Each version is independently fetchable — only load the voice the user is viewing
- UNIQUE constraint on `(report_id, voice_id)` enforces at most 1 version per voice
- `status` column enables resilient partial-write handling (generating/complete/failed)
- Primary `assessment_reports` row stays lean for dashboard and polling queries
- Trade-off: Requires a JOIN or separate query to list available versions. Acceptable — this is a 1-to-6 relationship, not a performance concern.

---

## 8. Security Model

### 8.1 Threat Analysis

| Threat | Mitigation |
|:---|:---|
| **Prompt injection via voice config** | Config is code-controlled, not user-input. Zod validation at build time. |
| **Unauthorized voice rewrite** | Rewrite Edge Function verifies `auth.uid() = report.user_id`. RLS on `assessment_reports`. |
| **Voice feedback spam** | RLS ensures `user_id = auth.uid()`. Rate-limiting not needed V1 (bounded by report generation rate). |
| **Clinical data exposure** | Voice system never reads clinical data directly — it reads `InstrumentScore` outputs. Same boundary as existing report system. |
| **Safety bypass** | Safety flags are evaluated BEFORE voice/modifier resolution. `forceModifiers` ensures safety-critical modifiers cannot be disabled by config changes. |

### 8.2 Data Classification

| Data | Classification | Storage |
|:---|:---|:---|
| Voice profile ID | Non-sensitive (personality preference) | `assessment_reports.voice_profile` |
| Active modifiers | Sensitive (implies clinical scores) | `assessment_reports.voice_profile` |
| Voice prompt text | Internal (IP) | Code only — never stored in DB |
| Voice feedback | User-generated, non-sensitive | `voice_feedback` table |
| Coach profile seeds | Non-sensitive (preference mapping) | Code only — V2 writes to `coach_profiles` |

The `modifiers` array in `voice_profile` JSONB is sensitive because it reveals clinical instrument results (e.g., "anxiety_softener" implies GAD-7 ≥ 10). This data is already protected by the existing RLS on `assessment_reports` which ensures users can only access their own rows.

---

## 9. 3rd Party Integrations

| Service | Usage | Cost Impact |
|:---|:---|:---|
| **OpenAI GPT-4o** | Existing — no new integration | Rewrite cost: ~$0.15 per full report × up to 6 rewrites = $0.90/user max |
| **Supabase** | Existing — 2 new columns + 1 new table | Negligible storage increase |

No new 3rd party integrations.

---

## 10. File Structure (Final)

```
src/lib/decoded/report/voice/
├── types.ts                    # All type definitions (§2)
├── config.ts                   # Voice profiles, modifiers, thresholds, mappings (§3.2)
├── voice-classifier.ts         # ArchetypeResult → VoiceProfile (§3.2)
├── modifier-resolver.ts        # InstrumentScore[] + SafetyFlags → ToneModifier[] (§3.2)
├── voice-prompt-assembler.ts   # Voice + modifiers + overrides → prompt block (§3.2)
├── test-profiles.ts            # 24 synthetic test profiles (§3.2)
├── index.ts                    # Public API exports
└── __tests__/
    ├── voice-classifier.test.ts
    ├── modifier-resolver.test.ts
    ├── voice-prompt-assembler.test.ts
    └── trigger-path-validation.test.ts  # Validates trigger config paths against real InstrumentScore shapes

Modified files:
├── src/lib/decoded/report/prompts/templates.ts  # Split DECODED_TONE_GUIDE (§3.3)
├── src/lib/decoded/report/safety.ts             # Add forceModifiers (§3.3)
└── src/lib/decoded/report/generate.ts           # Pass voice_profile (§3.3)

New Edge Function:
└── supabase/functions/decoded-rewrite-voice/index.ts  # Voice rewrite handler (§6.2)

Migration:
└── supabase/migrations/20260601_add_voice_profile.sql  # Schema changes (§5)
```

> [!NOTE]
> **New test: `trigger-path-validation.test.ts`** — Structural validation that maps all `ToneModifierTrigger.scoreField` paths against real `InstrumentScore` type shapes from `scoring/types.ts`. Catches typos in config trigger paths (e.g., `subscaleScores.self_judgement` vs. `subscaleScores.selfJudgment`) that Zod can't validate at build time.

---

## 11. Gate 2 Checklist

- [x] Tech stack selected with rationale (§1)
- [x] Complete type system designed (§2)
- [x] Module design with dependency graph (§3)
- [x] Integration points mapped to existing pipeline (§4)
- [x] Database schema designed with RLS (§5)
- [x] API contracts defined (§6)
- [x] ADRs documented for all key decisions (§7)
- [x] Security model defined (§8)
- [x] 3rd party integrations identified with costs (§9)
- [ ] **User approved architecture**

---

## 12. References

| Document | Location |
|:---|:---|
| PRD (approved) | [DECODED_NARRATIVE_VOICES_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_PRD.md) |
| Discovery (approved) | [DECODED_NARRATIVE_VOICES_DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_DISCOVERY.md) |
| Implementation Plan (approved) | [implementation_plan.md](file:///Users/thomaswood/.gemini/antigravity-ide/brain/69343d77-d48b-48ae-8e50-ce6b626051ab/implementation_plan.md) |
| Archetype Classifier | [classifier.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/archetypes/classifier.ts) |
| Archetype Types | [types.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/archetypes/types.ts) |
| Prompt Templates | [templates.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/prompts/templates.ts) |
| Score Transformer | [score-transformer.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/prompts/score-transformer.ts) |
| Safety Layer | [safety.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/safety.ts) |
| Report Generator | [generate.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/generate.ts) |
| Section Config | [section-config.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/sections/section-config.ts) |
| Scoring Types | [types.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/scoring/types.ts) |
| Coach Prompt Assembler | [prompt-assembler.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/supabase/functions/_shared/prompt-assembler.ts) |
| Coaching Brain | [COACHING_BRAIN.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_BRAIN.md) |
| Brand Guide | [BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md) |

> **Next Phase:** Sprint Planning (Phase 3) — epics, stories, tasks, ordered by dependency. Gate 2 approval required first.
