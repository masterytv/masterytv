# Decoded — Adaptive Narrative Voices: Discovery

> **Phase:** 0 — Discovery  
> **Date:** June 1, 2026  
> **Status:** 🟡 Awaiting approval  
> **Project Type:** Type A (Development Project)  
> **References:** DECODED_REPORT_STRUCTURE.md, DECODED_ARCHETYPES.md, templates.ts, safety.ts

---

## Summary

Research and design specification for adapting Decoded report writing style to the reader's personality profile. Uses Big Five clusters for base voice selection and clinical instrument scores for tone modifiers.

**Key deliverable:** 6 narrative voice profiles + 4 tone modifiers that layer into the existing GPT-4o prompt pipeline, plus V1 API contracts for future coach integration.

See the full implementation plan artifact for details:
- Voice profile definitions (6 voices: Intellectual, Adventurer, Connector, Steward, Challenger, Sensitive)
- Tone modifier specifications (Compassion Boost, Anxiety Softener, Emotion Regulation Buffer, Attachment Sensitivity)
- Archetype → voice cluster mapping
- Integration architecture with score-transformer → prompt-template pipeline
- Modifier interaction rules and conflict resolution
- Coach voice integration analysis (V2 deferred, V1 contracts defined)

---

## Research Sources

### Academic
- Big Five communication preference correlations (personality psychology literature consensus)
- ARC personality prototypes (Asendorpf, Robins, Caspi — Resilient/Overcontrolled/Undercontrolled)
- Therapeutic feedback adaptation for anxious attachment (counseling psychology)
- Self-compassion as moderator of neuroticism → feedback reception (clinical research)
- Health communication tailoring by personality type (health psychology)

### Internal
- Existing 16-archetype centroid system (DECODED_ARCHETYPES.md)
- Current tone guide (DECODED_TONE_GUIDE in templates.ts)
- Safety layer precedent (safety.ts — already modifies prompts based on distress)
- Score transformer architecture (score-transformer.ts — proven pattern for section-specific data packaging)

---

## Risks

| Risk | Severity | Mitigation |
|:---|:---|:---|
| Voice distinctions too subtle for users to notice | Medium | Clear writing dimension specifications; side-by-side testing |
| Modifier conflicts create incoherent tone | Medium | Defined interaction rules; safety layer takes precedence |
| Token cost increase per report | Low | ~200-400 extra tokens per prompt; negligible at GPT-4o pricing |
| Over-adaptation feels manipulative | Low | Voices adapt style, not content; all users see the same data |
| Validation without A/B test infrastructure | Medium | Track voice_profile in analytics; post-launch cohort analysis |
