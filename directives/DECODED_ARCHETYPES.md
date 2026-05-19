# Decoded — Archetype Classification System

> **Version:** 1.0
> **Date:** May 19, 2026
> **Status:** 🟡 Specification — Not yet implemented
> **Authority:** This document is the source of truth for archetype definitions and AI sub-label generation. See DECODED_INDEX.md.
> **References:** DECODED_PRD.md §4.2, DECODED_REPORT_STRUCTURE.md §3
> **Design Decision:** Hybrid model — recognizable base types + AI-generated unique sub-labels (approved May 19, 2026)

---

## Design Philosophy

Most people who have taken a personality test will recognize archetype labels like "Architect" or "Advocate." We lean into that familiarity — it creates instant recognition and shareability. But we don't want to be "just another personality test."

**The differentiation:** Standard Labels with **Unique Sub-Labels and Descriptions** written by AI based on the rest of the test results.

Example: **ARCHITECT — Designer with Compassion** — *"You're the kind of Architect who thinks about others before you begin and who gives structure to your life and the life of those around you."*

The base type tells them *what* they are. The sub-label tells them *who* they are. The description explains *how* they are that way.

---

## Base Archetype Mapping

~16 base types derived from Big Five cluster analysis. Each archetype maps to a dominant Big Five profile.

| # | Base Archetype | Primary Traits (High) | Primary Traits (Low) | Short Description |
|:---|:---|:---|:---|:---|
| 1 | **The Architect** | O+, C+ | A−, E− | Systematic visionary who builds frameworks and structures |
| 2 | **The Explorer** | O+, E+ | C−, N− | Curiosity-driven adventurer who thrives on novelty |
| 3 | **The Advocate** | A+, E+ | N−, C− | People-centered champion who fights for others |
| 4 | **The Sentinel** | C+, A+ | O−, E− | Reliable protector who values tradition and duty |
| 5 | **The Catalyst** | E+, O+ | A−, C− | Energetic change-maker who disrupts the status quo |
| 6 | **The Sage** | O+, C+ | E−, N− | Deep thinker who seeks understanding over action |
| 7 | **The Healer** | A+, N+ | E−, C− | Empathic nurturer who absorbs others' pain |
| 8 | **The Commander** | E+, C+ | A−, N− | Decisive leader who takes charge naturally |
| 9 | **The Artist** | O+, N+ | C−, E− | Sensitive creator who channels emotion into expression |
| 10 | **The Diplomat** | A+, E+ | N−, O− | Harmony-seeking bridge-builder in every room |
| 11 | **The Maverick** | O+, E+ | C−, A− | Rule-breaking innovator who trusts instinct over process |
| 12 | **The Guardian** | C+, N+ | O−, E− | Anxious protector who plans for every contingency |
| 13 | **The Luminary** | E+, A+ | N−, C− | Charismatic inspirer who lights up rooms |
| 14 | **The Strategist** | C+, O+ | E−, A− | Long-range planner who sees three moves ahead |
| 15 | **The Rebel** | O+, N+ | A−, C− | Intense individualist who resists conformity |
| 16 | **The Anchor** | A+, C+ | O−, N− | Steady, grounding presence others rely on |

---

## Classification Algorithm

### Step 1: Normalize Big Five Scores

Convert raw IPIP-50 trait scores to z-scores using population norms:

```typescript
const zScores = {
  O: (rawO - normMeanO) / normSdO,
  C: (rawC - normMeanC) / normSdC,
  E: (rawE - normMeanE) / normSdE,
  A: (rawA - normMeanA) / normSdA,
  N: (rawN - normMeanN) / normSdN,
};
```

### Step 2: Compute Distance to Each Archetype Centroid

Each archetype has a centroid vector in Big Five z-score space. Compute Euclidean distance from user's profile to each centroid:

```typescript
const distance = Math.sqrt(
  archetypeCentroids[archetype].reduce((sum, centroidVal, i) => {
    const userVal = Object.values(zScores)[i];
    return sum + Math.pow(userVal - centroidVal, 2);
  }, 0)
);
```

### Step 3: Select Best Match

- Primary archetype = minimum distance
- Secondary archetype = second minimum (used in sub-label generation for nuance)
- If top two are within 0.5 distance, flag as "blended" and reference both in the narrative

### Step 4: Generate AI Sub-Label

Feed the following to GPT-4o:

**Prompt template:**
```
You are a personality insight writer for Decoded (mastery.tv/decoded).

The user's base archetype is: {base_archetype}
Their secondary archetype influence is: {secondary_archetype}
Their full Big Five profile: O={O_percentile}%, C={C_percentile}%, E={E_percentile}%, A={A_percentile}%, N={N_percentile}%
Their attachment style: {attachment_style}
Their Holland Code: {holland_code}
Their top 3 strengths: {strengths}
Their top 3 growth edges: {growth_edges}

Generate a unique sub-label (2-5 words) that captures what makes this person's version of {base_archetype} distinct. The sub-label should feel like a title — something they'd want on a card.

Then write a one-sentence description (max 25 words) that explains the sub-label in second person ("You're the kind of...").

Rules:
- The sub-label must NOT be generic ("With Heart", "Who Cares"). It must be specific to THIS person's data.
- Reference at least one non-Big-Five data point (attachment, Holland, or strength/growth edge).
- Tone: warm, direct, slightly surprising. Not clinical. Not flattering.

Output format (JSON):
{
  "sub_label": "Designer with Compassion",
  "description": "You're the kind of Architect who thinks about others before you begin."
}
```

---

## Archetype Centroid Definitions

> [!NOTE]
> These centroids are initial estimates. They should be refined with real user data after launch (target: 500+ assessments).

| Archetype | O | C | E | A | N |
|:---|:---|:---|:---|:---|:---|
| Architect | +1.2 | +1.0 | −0.8 | −0.5 | −0.3 |
| Explorer | +1.5 | −0.8 | +1.0 | 0.0 | −0.5 |
| Advocate | +0.3 | −0.3 | +1.0 | +1.5 | −0.5 |
| Sentinel | −0.5 | +1.5 | −0.5 | +1.0 | 0.0 |
| Catalyst | +1.0 | −0.5 | +1.5 | −0.5 | −0.3 |
| Sage | +1.5 | +0.8 | −1.0 | 0.0 | −0.8 |
| Healer | 0.0 | −0.5 | −0.8 | +1.5 | +1.0 |
| Commander | −0.3 | +1.2 | +1.5 | −0.8 | −0.5 |
| Artist | +1.5 | −1.0 | −0.5 | 0.0 | +1.2 |
| Diplomat | −0.3 | 0.0 | +1.0 | +1.2 | −0.5 |
| Maverick | +1.2 | −1.0 | +1.2 | −0.8 | 0.0 |
| Guardian | −0.5 | +1.2 | −0.8 | 0.0 | +1.0 |
| Luminary | +0.3 | −0.3 | +1.5 | +1.0 | −0.8 |
| Strategist | +1.0 | +1.5 | −0.5 | −0.5 | −0.3 |
| Rebel | +1.2 | −1.0 | 0.0 | −1.0 | +1.0 |
| Anchor | −0.5 | +1.0 | 0.0 | +1.2 | −1.0 |

---

## Report Section Integration (RS03)

The archetype powers **RS03: Your Decoded Archetype** with:

1. **Hero section:** `ARCHETYPE NAME — Sub-Label` (e.g., "ARCHITECT — Designer with Compassion")
2. **Tagline:** The one-sentence description from AI generation
3. **Narrative:** 2–3 paragraphs in second person, synthesizing Big Five + attachment + RIASEC into a coherent identity story
4. **3 named sub-themes:** Pattern names derived from cross-instrument interactions (e.g., "The Loneliness Paradox," "The Perfectionism Shield," "The Unfinished Arc")
5. **Closing coach question:** *"This is the question I'd open our first session with: [question]"*

---

## Share Card Integration (F06)

The archetype drives the shareable personality card:
- Archetype name + sub-label as hero text
- Big Five radar chart overlay
- Attachment style badge
- `mastery.tv/decoded` watermark
- Premium glassmorphism design (BRAND.md §14 — no clipart, no sparkles)
