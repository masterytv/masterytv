# Product Requirements Document — Decoded Adaptive Narrative Voices

> **Author:** Thomas Wood + Antigravity Orchestrator  
> **Date:** June 1, 2026  
> **Version:** 1.0  
> **Status:** ✅ Approved (June 1, 2026)  
> **Product:** Decoded (`mastery.tv/decoded`) — Narrative Voice Subsystem  
> **Phase:** 1 — PRD  
> **Discovery:** [DECODED_NARRATIVE_VOICES_DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_DISCOVERY.md) ✅ Approved  
> **Parent PRD:** [DECODED_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_PRD.md)  
> **Design Authority:** [BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md)

---

## 1. Executive Summary

### 1.1 Problem

Decoded's report uses a single writing voice for all users. The `DECODED_TONE_GUIDE` in [templates.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/prompts/templates.ts#L17-L44) defines one style: "direct, warm, specific." But personality psychology research shows that communication effectiveness varies dramatically by personality type. A user high in Openness wants metaphor and intellectual challenge. A user high in Neuroticism with low Self-Compassion needs validation before confrontation. The same data delivered in the wrong voice can alienate rather than resonate.

### 1.2 Solution

Adapt the narrative voice of every report section based on the reader's personality profile:

1. **6 base voices** derived from Big Five personality clusters (mapped from the existing 16-archetype system)
2. **4 tone modifiers** from clinical instruments (SCS-SF, GAD-7, DERS-16, ECR-R) that layer additional adjustments
3. **Voice rewrite feature** allowing users to regenerate their report in any of the 6 voices
4. **Config-driven thresholds** with a test profile system for manual QA before launch

### 1.3 Relationship to Decoded

This is a **subsystem enhancement** to Decoded's Report Generator (F02 in DECODED_PRD.md). It modifies the prompt pipeline, not the scoring engine or section structure. All 12 sections (RS01–RS12) remain identical in scope and data — only the writing style adapts.

---

## 2. Success Criteria

### 2.1 User Success

| Criterion | Measurement | Target |
|:---|:---|:---|
| **Voice resonance** | Post-report feedback: "This report felt like it was written for me" | >75% agree |
| **Rewrite engagement** | % of users who try at least 1 voice rewrite | >10% |
| **Report completion** | % of users who scroll through all free sections (voice-adapted vs. baseline) | >85% (up from current baseline) |
| **Time on report** | Average time reading the full report | +15% vs. single-voice baseline |

### 2.2 Business Success

| Criterion | Target |
|:---|:---|
| **Free → paid conversion** | +2–5% lift from improved report resonance |
| **Share rate** | No regression from current rate (voice names add shareability) |
| **Coach activation** | +5% lift (better-written reports → more trust → more coach sessions) |

### 2.3 Technical Success

| Criterion | Target |
|:---|:---|
| **Voice classification latency** | <50ms (pure computation, no API calls) |
| **Prompt assembly overhead** | <100ms additional per section |
| **Rewrite generation time** | Same as initial report generation (~60s for 12 sections) |
| **No regressions** | All existing report generation tests pass unchanged |

---

## 3. User Journeys

### 3.1 Journey 1: Default Voice — The Seamless Experience

**Persona:** *Maya, 29, Advocate archetype. High A, High E, Low N.*

**Scene:** Maya completes Decoded. Her report generates in **The Connector** voice — warm, relational, flowing prose. She doesn't know a "voice" was selected. The report just feels right. Sections use metaphors about relationships and growth that resonate with her people-centered worldview. The coach question at the end of RS03 asks about her relational patterns specifically.

At the bottom of the report, a subtle footer shows: *"Your report was written in The Connector voice — one of 6 narrative styles we matched to your personality."* Below it: **"Read it differently →"** with 5 other voice options.

**Capabilities revealed:** Voice classification from archetype, modifier resolution, seamless integration with existing section templates.

---

### 3.2 Journey 2: Voice Rewrite — "I Want to Try Another Style"

**Persona:** *David, 34, Architect archetype. Received The Intellectual voice.*

**Scene:** David reads his full report. It's precise, structured, intellectually stimulating. He notices the voice label at the bottom. Curious, he clicks **"The Challenger"** — wanting to see how the report reads with more directness. The system shows a confirmation: *"Regenerating your report in The Challenger voice. This takes about 60 seconds."*

The report regenerates. Same data, same findings, different delivery. The Challenger voice is more confrontational: "Here's the blind spot you don't want to hear about." David prefers this. He bookmarks the Challenger version.

At the end of the rewritten report, a feedback prompt asks: *"Which voice felt more like 'you'?"* with the original and new voice as options + a free-text box.

**Capabilities revealed:** Voice rewrite trigger, section-by-section regeneration, voice preference feedback, version persistence.

---

### 3.3 Journey 3: Tone Modifier Activation — The Sensitive Case

**Persona:** *Sarah, 41, Healer archetype. High N, High A, Low E. GAD-7 = 14 (moderate anxiety). SCS-SF = 2.1 (low self-compassion). ECR-R = anxious attachment.*

**Scene:** Sarah's report generates in **The Sensitive** voice — slow, lyrical, honoring. But three modifiers also activate: **Compassion Boost** (low SCS), **Anxiety Softener** (moderate GAD-7), and **Attachment Sensitivity** (anxious attachment). 

The modifiers adjust the Sensitive voice: sentences are even shorter to reduce cognitive load. Each challenging finding is preceded by normalizing language. The attachment section (RS06) leads with relational strengths before vulnerabilities. The Inner System section (RS07) explicitly names emotions before exploring them.

The report's safety layer also adds the professional support note from [safety.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/safety.ts) because GAD-7 approaches the elevated threshold.

**Capabilities revealed:** Multi-modifier stacking, modifier interaction with safety layer, section-level override behavior.

---

### 3.4 Journey 4: Test Profile Review — Pre-Launch QA

**Persona:** *Thomas (product owner).*

**Scene:** Thomas opens the test profile dashboard. 24 synthetic test profiles are pre-loaded — 4 per voice × different modifier combinations. He clicks "Sentinel — Low SCS + High DERS" and sees the RS03 section rendered in The Steward voice with Compassion Boost and Emotion Regulation Buffer active.

He reads it. The directness feels right for the Steward, but the Compassion Boost phrasing sounds too clinical. He adjusts the Compassion Boost `confrontation_reduction` threshold from 0.7 to 0.5 in the config panel. Regenerates. Better.

He marks this profile as "reviewed ✅" and moves to the next.

**Capabilities revealed:** Test profile system, config-driven thresholds with live adjustment, per-profile regeneration, review tracking.

---

## 4. Core Features & Acceptance Criteria

### 4.1 Voice Classification Engine (NV01)

| Feature | Acceptance Criteria |
|:---|:---|
| **Voice classifier** | Takes Big Five z-scores + archetype result → returns one of 6 VoiceProfile IDs |
| **Deterministic** | Same input scores always produce the same voice assignment (no randomness) |
| **Archetype mapping** | All 16 archetypes map to exactly one voice; mapping table configurable |
| **Fallback** | If archetype result is missing or invalid, fall back to Connector (most universally warm) |
| **Speed** | Classification completes in <50ms (no API calls) |
| **Stored** | Voice profile ID stored in `assessment_reports.voice_profile` JSONB alongside report |

**Archetype → Voice Mapping (configurable):**

| Voice | Archetypes |
|:---|:---|
| The Intellectual | Architect, Sage, Strategist |
| The Adventurer | Explorer, Catalyst, Maverick, Rebel |
| The Connector | Advocate, Diplomat, Luminary |
| The Steward | Sentinel, Guardian, Anchor |
| The Challenger | Commander |
| The Sensitive | Healer, Artist |

**Done:** Every completed assessment gets a voice assignment. Assignment is stored, deterministic, and configurable.

---

### 4.2 Voice Profile Definitions (NV02)

| Feature | Acceptance Criteria |
|:---|:---|
| **6 profiles** | Each profile defines values for 6 writing dimensions: Sentence Structure, Metaphor Density, Directness, Warmth, Pacing, Structure Preference |
| **Prompt text** | Each profile produces a `voicePromptBlock` (200–400 tokens) that replaces the current `DECODED_TONE_GUIDE` voice section |
| **Example phrases** | Each profile includes 3+ example phrases that GPT-4o uses as style anchors |
| **Config-driven** | Profile definitions stored in a config object (not hardcoded in prompt strings); adjustable without code changes |
| **Distinct** | Side-by-side reading of the same section in 2 different voices must feel noticeably different to a non-expert reader |

**The 6 Voices:**

| Voice | Core Identity | Key Dimensions |
|:---|:---|:---|
| **The Intellectual** | Precise, nuanced, intellectual respect | Complex sentences, moderate-high metaphor (conceptual), high directness, restrained warmth |
| **The Adventurer** | Energetic, surprising, never boring | Short punchy sentences, high metaphor (vivid), high directness (playful), high warmth |
| **The Connector** | Held, understood, gently guided | Medium flowing sentences, moderate metaphor (relational), moderate directness, very high warmth |
| **The Steward** | Clear, practical, grounded | Simple declarative sentences, low metaphor, moderate-high directness (factual), moderate warmth |
| **The Challenger** | Pushed, provoked, respected | Varied rhythm, moderate metaphor (strategic), very high directness, low-moderate warmth |
| **The Sensitive** | Honored, held carefully, seen deeply | Flowing lyrical sentences, very high metaphor (emotional), low-moderate directness, very high warmth |

**Done:** 6 voice profiles exist as config objects. Each produces a distinct, coherent prompt block.

---

### 4.3 Tone Modifier System (NV03)

| Feature | Acceptance Criteria |
|:---|:---|
| **4 modifiers** | Compassion Boost (SCS-SF), Anxiety Softener (GAD-7), Emotion Regulation Buffer (DERS-16), Attachment Sensitivity (ECR-R) |
| **Config-driven thresholds** | Each modifier's trigger threshold is defined in a config object; adjustable without code changes |
| **Prompt injection** | Each active modifier produces a `modifierPromptBlock` (100–200 tokens) appended to the system prompt |
| **Stacking** | Multiple modifiers can be active simultaneously; union of all prompt blocks |
| **Interaction rules** | Defined conflict resolution when modifiers tension with base voice (e.g., Compassion Boost + Challenger → reduce Challenger directness) |
| **Safety integration** | If `safety.ts` flags `highDistress` or `emotionalRegulationConcern`, corresponding modifiers activate automatically regardless of score thresholds |
| **Stored** | Active modifier IDs stored in `assessment_reports.voice_profile` JSONB |

**Default Thresholds (configurable):**

| Modifier | Trigger Condition | Default Threshold |
|:---|:---|:---|
| Compassion Boost | SCS-SF total ≤ threshold OR Self-Judgment subscale ≥ threshold | total ≤ 2.5 / selfJudgment ≥ 4.0 |
| Anxiety Softener | GAD-7 total ≥ threshold OR severity = "Moderate" \| "Severe" | total ≥ 10 |
| Emotion Regulation Buffer | DERS-16 total ≥ threshold | total ≥ 52 |
| Attachment Sensitivity | Attachment style = "anxious" \| "disorganized" (anxiety score ≥ threshold) | anxiety ≥ 3.5 |

**Done:** Modifiers resolve automatically from scores. Thresholds are config-driven. Stacking works without contradictions.

---

### 4.4 Section-Level Voice Overrides (NV04)

| Feature | Acceptance Criteria |
|:---|:---|
| **Override config** | A `sectionVoiceOverrides` config object maps `SectionId → Partial<WritingDimensions>` |
| **Merge behavior** | Section overrides merge with (not replace) the base voice; only specified dimensions are nudged |
| **Required overrides** | RS07 (Inner System) → increase Warmth by 1 level, decrease Directness by 1 level regardless of voice. RS12 (Growth Map) → increase Structure Preference toward Lists regardless of voice. |
| **Configurable** | Additional section overrides can be added without code changes |

**Default Section Overrides:**

| Section | Override | Rationale |
|:---|:---|:---|
| RS07 (Inner System) | Warmth +1, Directness −1 | IFS-informed content is emotionally intense; all voices need more gentleness here |
| RS08 (Emotional Landscape) | Pacing → Slower, add pause points | Emotion regulation content needs breathing room |
| RS12 (Growth Map) | Structure → Lists, add action items format | Growth roadmap needs actionability regardless of voice |

**Done:** Section overrides merge cleanly with base voice. RS07 always feels gentle, RS12 always feels actionable.

---

### 4.5 Prompt Assembly Pipeline (NV05)

| Feature | Acceptance Criteria |
|:---|:---|
| **Assembler function** | `assembleVoicePrompt(sectionId, voiceProfile, activeModifiers, sectionOverrides) → systemPrompt` |
| **Replaces DECODED_TONE_GUIDE** | The current hardcoded `DECODED_TONE_GUIDE` string is replaced by the assembler's output |
| **Section templates preserved** | All 12 section-specific prompt templates (RS01–RS12) remain unchanged; only the shared voice block changes |
| **Idempotent** | Same inputs always produce the same prompt (no randomness, no timestamps) |
| **Token budget** | Assembled system prompt ≤ 800 tokens (voice block + modifier blocks + section-specific instructions) |

**Assembly order:**
1. Voice profile prompt block (200–400 tokens)
2. Active modifier prompt blocks (0–400 tokens, 100 per modifier)  
3. Section-level overrides (0–100 tokens)
4. Section-specific instructions from existing templates (unchanged)
5. Safety addendum from `safety.ts` (if applicable)

**Done:** The assembler produces a complete system prompt that combines voice, modifiers, overrides, and section instructions. Existing section templates work unchanged.

---

### 4.6 Voice Rewrite Feature (NV06)

| Feature | Acceptance Criteria |
|:---|:---|
| **Voice selector** | At the bottom of the report, user sees their current voice name + description + a "Read it differently" CTA |
| **Voice picker UI** | Modal or dropdown showing all 6 voices with name, one-line description, and "This is how your report would sound" preview sentence |
| **Regeneration** | Clicking a new voice triggers full report regeneration (all unlocked sections) in the new voice |
| **Progress indicator** | "Regenerating your report in The Challenger voice..." with section-by-section progress (same UX as initial generation) |
| **Version storage** | Each voice version is stored in a separate `assessment_report_versions` table row (not JSONB column) with `status` tracking |
| **No double-charge** | Regeneration uses the same GPT-4o pipeline; no additional user cost |
| **Unlimited rewrites** | V1: no limit on number of voice rewrites per user |
| **Feedback prompt** | After reading a rewritten report, user sees: "Which voice felt more like 'you'?" with original + new voice options + free-text box |
| **Feedback stored** | Responses stored in `voice_feedback` table: assessment_id, original_voice, chosen_voice, free_text, created_at |
| **Design** | Voice selector follows BRAND.md: glassmorphism card, no clipart, Lucide icons only |

**Done:** Users can regenerate their report in any voice. Feedback is collected. All versions are cached.

---

### 4.7 Test Profile System (NV07)

| Feature | Acceptance Criteria |
|:---|:---|
| **Synthetic profiles** | 24+ test profiles pre-defined: 4 per voice × varying modifier combinations |
| **Profile definition** | Each test profile includes: Big Five z-scores, archetype result, SCS-SF total, GAD-7 total, DERS-16 total, ECR-R scores |
| **Generation trigger** | Admin can trigger report generation for any test profile → produces full report in assigned voice with active modifiers |
| **Side-by-side view** | Admin can view the same section across multiple voices/modifier combos for comparison |
| **Config editor** | Admin can adjust voice profile dimensions and modifier thresholds; regenerate test profiles to see effect |
| **Review tracking** | Admin marks each test profile as reviewed (✅) or needs-work (🔧); status persists |
| **Pre-launch gate** | All 24 profiles must be reviewed ✅ before voice system goes live |

**Test Profile Matrix:**

| Voice | Profile 1 | Profile 2 | Profile 3 | Profile 4 |
|:---|:---|:---|:---|:---|
| Intellectual | No modifiers | + Anxiety Softener | + Compassion Boost | + All modifiers |
| Adventurer | No modifiers | + Anxiety Softener | + DERS Buffer | + Attachment Sensitivity |
| Connector | No modifiers | + Compassion Boost | + Attachment Sensitivity | + All modifiers |
| Steward | No modifiers | + Anxiety Softener | + DERS Buffer | + Compassion Boost |
| Challenger | No modifiers | + Compassion Boost | + Anxiety Softener | + All modifiers |
| Sensitive | No modifiers | + Compassion Boost | + All modifiers | + All modifiers (extreme case) |

**Done:** 24 test profiles exist. All can be generated, compared, and reviewed. Config changes regenerate instantly.

---

### 4.8 Voice Profile Configuration System (NV08)

| Feature | Acceptance Criteria |
|:---|:---|
| **Config file** | Single TypeScript config file exports all voice profiles, modifier thresholds, section overrides, and archetype mappings |
| **No code changes to adjust** | Changing a threshold, adjusting a voice dimension, or remapping an archetype requires editing only the config file |
| **Validation** | Config file has Zod schema validation; invalid configs fail at build time |
| **Version tracking** | Config changes are tracked in git; each change is a reviewable diff |
| **Hot reload** | In development, config changes take effect on next report generation without server restart |

**Done:** All tunable parameters live in one config file. Changes require no code edits to the pipeline.

---

## 5. Product Scope

### 5.1 In Scope (V1)

- Voice classification from archetype → 6 voices (NV01)
- 6 voice profile definitions with prompt text (NV02)
- 4 tone modifiers with config-driven thresholds (NV03)
- Section-level voice overrides for RS07, RS08, RS12 (NV04)
- Prompt assembly pipeline replacing DECODED_TONE_GUIDE (NV05)
- Voice rewrite feature with feedback collection (NV06)
- 24 test profiles for pre-launch QA (NV07)
- Config-driven threshold system with Zod validation (NV08)
- Database migration: `voice_profile` JSONB column + `voice_versions` + `voice_feedback` table

### 5.2 Explicit "Not in V1" List

| Feature | Why Not V1 | Target |
|:---|:---|:---|
| **Voice blending** (70/30 mix of two voices) | Risks incoherent tone; rewrites solve blended cases | V2 (if user feedback requests it) |
| **Per-section voice switching** (different voice per section) | Too complex; full-report voice is the right UX | V2 |
| **A/B testing infrastructure** | Need baseline data first; track analytics post-launch | V2 |
| **Coach Profile Seeder** (seed `coach_profiles` from voice data) | Requires voice system stable first; V1 ensures API contracts for the seeder | V2 |
| **First message voice variants** (voice-adaptive coach opening letter) | Template refactor dependent on which voices land | V2 |
| **Modifier-driven chat behavior** (modifiers influence coach delivery style) | Needs modifier-resolver stable before adding a second consumer | V2 |
| **Chat → voice feedback loop** (chat signals refine voice preference) | Needs data from both systems running simultaneously | V3 |
| **Voice in Compare reports** | Compare reports need their own voice system | V2 |
| **Rate-limiting rewrites** | Unlimited for V1; monitor token costs, add limits if needed | V2 (if cost issue) |
| **User-chosen default voice** (bypass personality classification) | Users should experience their matched voice first | V2 |
| **Admin voice analytics dashboard** | Track in analytics; dedicated dashboard later | V2 |

---

## 6. Functional Requirements

### 6.1 Voice Classification

- **NVR01:** System classifies every completed assessment into exactly one of 6 voice profiles based on archetype result
- **NVR02:** Classification is deterministic — same scores always produce the same voice
- **NVR03:** Archetype-to-voice mapping is defined in a config file, not hardcoded in classification logic
- **NVR04:** If archetype classification fails, system falls back to Connector voice

### 6.2 Prompt Assembly

- **NVR05:** System assembles a voice-adapted system prompt for each section by merging: voice profile block + active modifier blocks + section overrides + section-specific template
- **NVR06:** The current `DECODED_TONE_GUIDE` constant is replaced by a function that accepts voice parameters
- **NVR07:** All 12 section-specific prompt templates (RS01–RS12) remain unchanged — only the shared tone guide block is dynamic
- **NVR08:** Assembled prompts do not exceed 800 tokens for the voice/modifier portion

### 6.3 Tone Modifiers

- **NVR09:** System evaluates all 4 modifier conditions from scored instruments and activates applicable modifiers
- **NVR10:** If `safety.ts` flags `highDistress` → Compassion Boost and Anxiety Softener activate automatically
- **NVR11:** If `safety.ts` flags `emotionalRegulationConcern` → Emotion Regulation Buffer activates automatically
- **NVR12:** When Compassion Boost is active with Challenger voice, Challenger directness is reduced by one level
- **NVR13:** When Anxiety Softener is active with Adventurer voice, paragraph density is reduced (more breaks, fewer insights per paragraph)
- **NVR14:** When all 4 modifiers are active simultaneously, all modifier prompt blocks are included (union, not replacement)

### 6.4 Section Overrides

- **NVR15:** RS07 (Inner System) always increases Warmth and decreases Directness by one level, regardless of base voice
- **NVR16:** RS12 (Growth Map) always increases Structure Preference toward Lists/action items, regardless of base voice
- **NVR17:** Section overrides merge with (don't replace) the base voice dimensions

### 6.5 Voice Rewrite

- **NVR18:** After initial report generation, user can trigger a rewrite in any of the 6 voices
- **NVR19:** Rewrite regenerates all unlocked sections in the new voice; locked sections are not regenerated
- **NVR20:** Each voice version is cached in `assessment_report_versions` table; subsequent requests for the same voice serve the cache if `status = 'complete'`
- **NVR21:** Unlimited rewrites per user in V1
- **NVR22:** After reading a rewritten report, system presents a voice preference feedback prompt
- **NVR23:** Feedback is stored in `voice_feedback` table with: assessment_id, original_voice_id, rewrite_voice_id, preferred_voice_id, free_text, created_at

### 6.6 Configuration

- **NVR24:** All voice profiles, modifier thresholds, section overrides, and archetype mappings are defined in a single config file
- **NVR25:** Config file uses Zod schema validation; invalid configs produce build-time errors
- **NVR26:** Changing any threshold or voice dimension requires editing only the config file, not pipeline code

### 6.7 Test Profiles

- **NVR27:** 24+ synthetic test profiles are defined with fixed scores covering all 6 voices × modifier combinations
- **NVR28:** Admin can trigger report generation for any test profile
- **NVR29:** Admin can view side-by-side section comparisons across voices/modifiers
- **NVR30:** All 24 test profiles must be reviewed before voice system goes to production

### 6.8 Storage

- **NVR31:** `assessment_reports` table gets a `voice_profile` JSONB column: `{ voiceId: string, modifiers: string[] }`
- **NVR32:** New `assessment_report_versions` table: `report_id (FK), voice_id, sections (JSONB), status ('generating'|'complete'|'failed'), sections_completed, total_sections, created_at, completed_at`. UNIQUE on `(report_id, voice_id)`.
- **NVR33:** New `voice_feedback` table: `assessment_id (FK), original_voice_id, rewrite_voice_id, preferred_voice_id, free_text (nullable), created_at`

### 6.9 Coach Integration Contracts (V1 API Surface)

> These requirements ensure the voice system exports what the future Coach Profile Seeder needs. No coach-specific code is built in V1 — but these contracts prevent rework when V2 adds the seeder.

- **NVR34:** The `config.ts` file must include a `coachProfileSeed` mapping: `Record<VoiceId, Record<CoachDimension, number>>` — mapping each voice to initial `coach_profiles` dimension values (0.0–1.0 floats for all 8 coach dimensions: directness, framing, warmth, autonomy, pacing, evidence_style, accountability, challenge_level)
- **NVR35:** The voice system must export from `src/lib/decoded/report/voice/`: `VoiceId` (string union type), `VoiceProfile` type, `WritingDimensions` type, `ToneModifier` type, and the full config object
- **NVR36:** The `assessment_reports.voice_profile` JSONB must include both `voiceId` (stable string) and `modifiers` (string array of active modifier IDs) — these are consumed by the future seeder

---

## 7. Non-Functional Requirements

### 7.1 Performance
- **NVNFR1:** Voice classification <50ms (no API calls)
- **NVNFR2:** Prompt assembly <100ms overhead per section
- **NVNFR3:** Voice rewrite generation time equal to initial report generation (~60s for all sections)
- **NVNFR4:** Cached voice versions serve in <2s (same as existing report cache)

### 7.2 Quality
- **NVNFR5:** Each voice produces noticeably distinct prose — reviewable via test profiles
- **NVNFR6:** Modifier application never contradicts safety layer guidance
- **NVNFR7:** No regression in existing report generation (all current tests pass)

### 7.3 Maintainability
- **NVNFR8:** All tunable parameters in one config file
- **NVNFR9:** Adding a 7th voice requires only config changes + prompt text — no pipeline code changes
- **NVNFR10:** Adding a 5th modifier requires only config changes + prompt text

---

## 8. Database Schema Changes

```sql
-- Add voice profile to existing report table
ALTER TABLE assessment_reports
ADD COLUMN voice_profile jsonb DEFAULT NULL;

-- Voice rewrite versions table (separate to avoid row bloat)
CREATE TABLE assessment_report_versions (
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
  UNIQUE (report_id, voice_id)
);

ALTER TABLE assessment_report_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_user_read ON assessment_report_versions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY versions_service_manage ON assessment_report_versions
  FOR ALL USING (auth.role() = 'service_role');

-- Voice feedback table
CREATE TABLE voice_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_voice_id text NOT NULL,
  rewrite_voice_id text,
  preferred_voice_id text,
  free_text text,
  created_at timestamptz DEFAULT now()
);

-- RLS: users can only access their own feedback
ALTER TABLE voice_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_feedback_user_policy ON voice_feedback
  FOR ALL USING (auth.uid() = user_id);

-- Index for analytics queries
CREATE INDEX idx_voice_feedback_voice ON voice_feedback(original_voice_id, preferred_voice_id);
```

---

## 9. File Structure

```
src/lib/decoded/report/voice/
├── types.ts                    # VoiceProfile, ToneModifier, WritingDimension types
├── config.ts                   # All configurable params: profiles, thresholds, mappings, overrides
├── voice-classifier.ts         # Archetype → VoiceProfile classification
├── modifier-resolver.ts        # Scores → active ToneModifier[]
├── voice-prompt-assembler.ts   # Merges voice + modifiers + overrides + section template
├── test-profiles.ts            # 24 synthetic test profiles
└── __tests__/
    ├── voice-classifier.test.ts
    ├── modifier-resolver.test.ts
    └── voice-prompt-assembler.test.ts
```

**Modified files:**
- `src/lib/decoded/report/prompts/templates.ts` — Extract `DECODED_TONE_GUIDE` into dynamic function
- `src/lib/decoded/report/generate.ts` — Store voice metadata with report
- `src/lib/decoded/report/safety.ts` — Add `forceModifiers` output

---

## 10. Gate 1 Checklist

- [x] Core features defined with acceptance criteria (Section 4: NV01–NV08)
- [x] User journeys mapped (Section 3: 4 journeys covering default voice, rewrite, modifiers, QA)
- [x] MVP scope bounded (Section 5.2: explicit "Not in V1" list with coach integration deferred items)
- [x] Success metrics defined (Section 2: user, business, technical)
- [x] Database schema defined (Section 8)
- [x] File structure defined (Section 9)
- [x] Coach integration contracts defined (Section 6.9: NVR34–NVR36)
- [x] **User approved PRD** (June 1, 2026)

---

## 11. References

| Document | Location |
|:---|:---|
| Discovery (approved) | [DECODED_NARRATIVE_VOICES_DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_DISCOVERY.md) |
| Implementation Plan (approved) | [implementation_plan.md](file:///Users/thomaswood/.gemini/antigravity-ide/brain/69343d77-d48b-48ae-8e50-ce6b626051ab/implementation_plan.md) |
| Parent PRD | [DECODED_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_PRD.md) |
| Report Structure | [DECODED_REPORT_STRUCTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_REPORT_STRUCTURE.md) |
| Archetype System | [DECODED_ARCHETYPES.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_ARCHETYPES.md) |
| Scoring Keys | [DECODED_SCORING.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_SCORING.md) |
| Brand Guide | [BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md) |
| Existing Prompt Templates | [templates.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/prompts/templates.ts) |
| Safety Layer | [safety.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/safety.ts) |
| Score Transformer | [score-transformer.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/report/prompts/score-transformer.ts) |
| Coach Prompt Assembler | [prompt-assembler.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/supabase/functions/_shared/prompt-assembler.ts) |
| Coach Profile Updater | [profile-updater.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/supabase/functions/_shared/profile-updater.ts) |
| Coach Prompt Layer (Decoded→Coach) | [prompt-layer.ts](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/src/lib/decoded/coaching/prompt-layer.ts) |
| Coaching Brain Directive | [COACHING_BRAIN.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_BRAIN.md) |

> **Next Phase:** Architecture (Phase 2) — detailed technical design, ADRs, and integration spec. Gate 1 approval required first.
