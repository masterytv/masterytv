# Decoded — Scoring Keys

> **Version:** 1.1
> **Date:** May 19, 2026
> **Status:** 🟡 Specification — Not yet implemented
> **Authority:** This document is the source of truth for all instrument scoring logic. See DECODED_INDEX.md.
> **References:** DECODED_PRD.md §4.1, DECODED.md §4.1, §12
> **Assessment Model:** Complete Core + Selective Add-Ons (approved May 19, 2026)

---

## Scoring Architecture

Each instrument has a TypeScript scoring function: `score_{instrument}(responses: Record<string, number>): InstrumentScore`

All scoring functions must be **pure functions** (no side effects) and **unit-tested** with known-answer test cases.

### Assessment Model: Complete Core + Selective Add-Ons

| Layer | Model | Items | Time |
|:---|:---|:---|:---|
| **Core (mandatory, all users)** | Complete — everyone takes the same battery | ~113 items | ~25–30 min |
| **Optional add-ons (user selects)** | Selective — user chooses which to add | 4–20 items | 1–5 min |
| **Depth Layer (Mastery tier)** | Gated — unlocked by subscription | TBD | TBD |

**Why Complete Core:** Ensures Compare parity (everyone has the same data), simplifies branching logic, and gives every report — including the coaching handoff — access to wellness, emotion regulation, and work motivation data.

**Core instruments (9):** IPIP-50, RIASEC, ECR-R Short, SWLS, SCS-SF, DERS-16, WEIMS, Flourishing Scale, Decoded Wellness Check
**Optional add-ons (4):** GAD-7, ASRS, CSI-4, ACE-3

---

## Core Layer Instruments (All Users)

### 1. IPIP-50 (Big Five)

**Items:** 50 (10 per trait)
**Scale:** 1–5 Likert (Very Inaccurate → Very Accurate)
**License:** Public Domain (IPIP)

| Trait | Items (+) | Items (−, reverse-scored) |
|:---|:---|:---|
| **Extraversion** | 1, 11, 21, 31, 41 | 6, 16, 26, 36, 46 |
| **Agreeableness** | 7, 17, 27, 37, 47 | 2, 12, 22, 32, 42 |
| **Conscientiousness** | 3, 13, 23, 33, 43 | 8, 18, 28, 38, 48 |
| **Neuroticism** | 4, 14, 24, 34, 44 | 9, 19, 29, 39, 49 |
| **Openness** | 5, 15, 25, 35, 45 | 10, 20, 30, 40, 50 |

**Scoring:**
1. Reverse-score negative items: `reversed = 6 - raw`
2. Sum all 10 items per trait → trait score (10–50)
3. Convert to percentile using normative table (general adult population)

**Output:** `{ O: number, C: number, E: number, A: number, N: number }` (each 10–50 raw + percentile)

**Coaching flags (informational, not branching):**
- Neuroticism ≥ 38 (76th percentile) → flag in coaching profile; suggest GAD-7 add-on if user hasn't already taken it
- Conscientiousness ≤ 20 (40th percentile) → flag in coaching profile; suggest ASRS add-on

---

### 2. RIASEC / Holland Code (Career Interests)

**Items:** 30 (5 per type)
**Scale:** 1–5 Likert (Strongly Dislike → Strongly Like)
**License:** Public Domain (O*NET adaptation)

| Type | Items |
|:---|:---|
| **Realistic** | 1, 7, 13, 19, 25 |
| **Investigative** | 2, 8, 14, 20, 26 |
| **Artistic** | 3, 9, 15, 21, 27 |
| **Social** | 4, 10, 16, 22, 28 |
| **Enterprising** | 5, 11, 17, 23, 29 |
| **Conventional** | 6, 12, 18, 24, 30 |

**Scoring:**
1. Sum 5 items per type → type score (5–25)
2. Rank types by score → top 3 = Holland Code (e.g., "SAE")
3. No reverse-scoring needed

**Output:** `{ R: number, I: number, A: number, S: number, E: number, C: number, code: string }`

---

### 3. ECR-R Short (Attachment)

**Items:** 12 (6 Anxiety, 6 Avoidance)
**Scale:** 1–7 Likert (Strongly Disagree → Strongly Agree)
**License:** Public Domain (Fraley et al.)

| Subscale | Items (+) | Items (−, reverse-scored) |
|:---|:---|:---|
| **Anxiety** | 1, 3, 5 | 2, 4, 6 |
| **Avoidance** | 8, 10, 12 | 7, 9, 11 |

**Scoring:**
1. Reverse-score negative items: `reversed = 8 - raw`
2. Mean of 6 items per subscale → subscale score (1.0–7.0)
3. Quadrant: Anxiety < 3.5 AND Avoidance < 3.5 → Secure; Anxiety ≥ 3.5 AND Avoidance < 3.5 → Anxious; etc.

**Output:** `{ anxiety: number, avoidance: number, style: "secure" | "anxious" | "avoidant" | "disorganized" }`

**Coaching flag:** Anxiety ≥ 4.0 OR Avoidance ≥ 4.0 → flag as insecure attachment in coaching profile; enriches RS06 and RS10 narratives

---

### 4. SWLS (Satisfaction With Life Scale)

**Items:** 5
**Scale:** 1–7 Likert (Strongly Disagree → Strongly Agree)
**License:** Public Domain (Diener et al.)

**Scoring:**
1. Sum all 5 items → total score (5–35)
2. No reverse-scoring

| Score Range | Interpretation |
|:---|:---|
| 31–35 | Extremely satisfied |
| 26–30 | Satisfied |
| 21–25 | Slightly satisfied |
| 20 | Neutral |
| 15–19 | Slightly dissatisfied |
| 10–14 | Dissatisfied |
| 5–9 | Extremely dissatisfied |

**Output:** `{ total: number, interpretation: string }`

---

### 5. SCS-SF (Self-Compassion Scale — Short Form)

**Items:** 12
**Scale:** 1–5 Likert (Almost Never → Almost Always)
**License:** Public Domain (Raes et al.)

| Subscale | Items (+) | Items (−, reverse-scored) |
|:---|:---|:---|
| **Self-Kindness** | 2, 6 | — |
| **Self-Judgment** | — | 11, 12 |
| **Common Humanity** | 5, 10 | — |
| **Isolation** | — | 4, 8 |
| **Mindfulness** | 3, 7 | — |
| **Over-Identification** | — | 1, 9 |

**Scoring:**
1. Reverse-score negative subscale items: `reversed = 6 - raw`
2. Mean of all 12 items (after reversals) → total self-compassion score (1.0–5.0)
3. Subscale scores: mean of 2 items each

**Output:** `{ total: number, subscales: { selfKindness, selfJudgment, commonHumanity, isolation, mindfulness, overIdentification } }`

---

### 6. DERS-16 (Difficulty in Emotion Regulation)

**Items:** 16
**Scale:** 1–5 (Almost Never → Almost Always)
**License:** Verify with Gratz & Roemer (see DECODED.md §12)

| Subscale | Items |
|:---|:---|
| **Clarity** | 1, 4 |
| **Goals** | 8, 12, 15 |
| **Impulse** | 9, 13, 16 |
| **Non-Acceptance** | 5, 10, 14 |
| **Strategies** | 2, 6, 7, 11 |
| **Awareness** | 3 (reverse-scored) |

**Scoring:**
1. Reverse-score Awareness items: `reversed = 6 - raw`
2. Sum per subscale → subscale scores
3. Sum all 16 → total (16–80); higher = more difficulty

**Output:** `{ total: number, subscales: { clarity, goals, impulse, nonAcceptance, strategies, awareness } }`

---

### 7. WEIMS (Work Extrinsic & Intrinsic Motivation Scale)

**Items:** 18 (3 per motivation type)
**Scale:** 1–7 (Does not correspond at all → Corresponds exactly)
**License:** Verify with Tremblay et al. (see DECODED.md §12)

| Motivation Type | Items | SDT Continuum |
|:---|:---|:---|
| **Intrinsic** | 4, 8, 15 | Self-determined ↑ |
| **Integrated** | 5, 10, 18 | |
| **Identified** | 1, 7, 14 | |
| **Introjected** | 6, 11, 13 | |
| **External** | 2, 9, 16 | |
| **Amotivation** | 3, 12, 17 | Non-self-determined ↓ |

**Scoring:**
1. Mean of 3 items per type → type score (1.0–7.0)
2. Self-Determination Index (SDI): `(2 × Intrinsic + Integrated + Identified) - (Introjected + External + 2 × Amotivation)`
3. No reverse-scoring

**Output:** `{ types: { intrinsic, integrated, identified, introjected, external, amotivation }, sdi: number }`

---

### 8. Flourishing Scale (FS)

**Items:** 8
**Scale:** 1–7 (Strongly Disagree → Strongly Agree)
**License:** Public Domain (Diener et al., 2010)

**Items (all positively worded, no reverse scoring):**
1. I lead a purposeful and meaningful life
2. My social relationships are supportive and rewarding
3. I am engaged and interested in my daily activities
4. I actively contribute to the happiness and well-being of others
5. I am competent and capable in the activities that are important to me
6. I am a good person and live a good life
7. I am optimistic about my future
8. People respect me

**Scoring:**
1. Sum all 8 items → total (8–56)
2. No reverse-scoring
3. Higher scores = greater psychological flourishing

| Score Range | Interpretation |
|:---|:---|
| 48–56 | High flourishing |
| 40–47 | Moderate-high flourishing |
| 32–39 | Moderate flourishing |
| 24–31 | Low-moderate flourishing |
| 8–23 | Low flourishing |

**Output:** `{ total: number, interpretation: string }`

**Report integration:** Powers RS11 (Wellbeing Dashboard) alongside SWLS. Flourishing captures meaning, engagement, and social contribution — dimensions SWLS doesn't touch.

---

### 9. Decoded Wellness Check (DWC) — Custom

**Items:** 10
**Scale:** Mixed (see individual items)
**License:** Proprietary — Mastery.tv (we own this)

| # | Item Text | Scale | Domain |
|:---|:---|:---|:---|
| 1 | How many days per week do you exercise for 20+ minutes? | 0–7 (numeric) | Physical activity |
| 2 | On average, how many hours of sleep do you get per night? | 1–6 (dropdown: <5, 5–6, 6–7, 7–8, 8–9, 9+) | Sleep |
| 3 | How would you rate your current diet/nutrition? | 1–5 (Very poor → Excellent) | Nutrition |
| 4 | How often do you feel physically exhausted by end of day? | 1–5 (Rarely → Almost always) | Energy drain |
| 5 | How often do you feel stressed to the point it affects your daily functioning? | 1–5 (Rarely → Almost always) | Stress impact |
| 6 | When stressed, I tend to cope in healthy ways vs. unhealthy ways | 1–5 (Mostly unhealthy → Mostly healthy) | Coping style |
| 7 | How many close relationships do you have where you feel truly seen? | 1–5 (0, 1, 2–3, 4–5, 6+) | Social connection |
| 8 | How often do you spend time on activities that give you a sense of purpose or meaning? | 1–5 (Rarely → Daily) | Purpose |
| 9 | How many hours per day do you spend on screens for non-work purposes? | 1–6 (dropdown: <1, 1–2, 2–4, 4–6, 6–8, 8+) | Digital habits |
| 10 | How would you rate your overall energy level most days? | 1–5 (Very low → Very high) | Vitality |

**Scoring:**
1. No composite score — each item scored individually as a wellness dimension
2. Items 4, 5, 9 are reverse-valenced (higher raw = worse outcome) → invert for the wellness profile: `inverted = scale_max + 1 - raw`
3. Generate a wellness profile vector: `{ exercise, sleep, nutrition, energy, stress, coping, social, purpose, screenTime, vitality }`
4. Each dimension normalized to 0–100 scale for radar chart visualization

**Output:**
```typescript
{
  dimensions: {
    exercise: number,      // 0-100
    sleep: number,          // 0-100
    nutrition: number,      // 0-100
    energy: number,         // 0-100 (inverted from item 4)
    stress: number,         // 0-100 (inverted from item 5)
    coping: number,         // 0-100
    social: number,         // 0-100
    purpose: number,        // 0-100
    screenTime: number,     // 0-100 (inverted from item 9)
    vitality: number        // 0-100
  },
  overallWellness: number   // mean of all 10 dimensions, 0-100
}
```

**Report integration:** Powers RS11 (Wellbeing Dashboard), RS12 (Growth Roadmap), and coaching handoff. These are the actionable levers a coach works with on day one.

**Coaching flags:**
- Exercise = 0 days/week → flag "sedentary" in coaching profile
- Sleep < 6 hours → flag "sleep deficit"
- Stress ≥ 4 → flag "high stress impact"
- Social connection = 0 close relationships → flag "social isolation"
- Overall wellness < 40 → flag "low overall wellness" → prioritize wellness in coaching opener

---

## Optional Add-On Instruments (User Selects)

> After completing the Core battery, the user is offered optional add-ons based on context. These are **not auto-triggered** — the user decides.

### 10. GAD-7 (Generalized Anxiety)

**Presented when:** After Core completion. Prompt: *"Based on your responses, you might benefit from a quick anxiety check. Want to add it? (7 questions, ~1 min)"*
**Recommended when:** Big Five Neuroticism ≥ 38 (system highlights this add-on)
**Items:** 7
**Scale:** 0–3 (Not at all → Nearly every day)
**License:** Public Domain (Spitzer et al.)

**Scoring:** Sum all 7 items → total (0–21). No reverse-scoring.

| Score | Severity |
|:---|:---|
| 0–4 | Minimal |
| 5–9 | Mild |
| 10–14 | Moderate |
| 15–21 | Severe |

**Output:** `{ total: number, severity: string }`

---

### 11. ASRS-v1.1 (ADHD Self-Report — Screener)

---

**Presented when:** After Core completion. Prompt: *"Want to add a quick focus & attention check? (6 questions, ~1 min)"*
**Recommended when:** Big Five Conscientiousness ≤ 20 (system highlights this add-on)
**Items:** 6
**Scale:** 0–4 (Never → Very Often)
**License:** Public Domain (WHO)

**Scoring:**
- Items 1–3: score ≥ 2 counts as positive
- Items 4–6: score ≥ 3 counts as positive
- Total positive items ≥ 4 → "screen positive"

**Output:** `{ positiveCount: number, screenPositive: boolean }`

---

### 12. CSI-4 (Couples Satisfaction Index — Short)

**Presented when:** After Core completion. Prompt: *"Are you currently in a romantic relationship? Add a quick relationship satisfaction check. (4 questions, ~30 sec)"*
**Items:** 4
**Scale:** Mixed (item 1: 0–6; items 2–4: 0–5)
**License:** Public Domain (Funk & Rogge)

**Scoring:** Sum all 4 items → total (0–21). Score ≤ 13.5 → "distressed"

**Output:** `{ total: number, distressed: boolean }`

---

### 13. ACE-3 (Adverse Childhood Experiences — Short)

**Presented when:** After Core completion. Prompt: *"This optional section asks about early life experiences. It's sensitive — only add it if you feel comfortable. (3 questions, ~30 sec)"*
**Items:** 3 (screener subset)
**Scale:** Yes (1) / No (0)
**License:** Public Domain (CDC)

**Scoring:** Sum → total (0–3)

**Output:** `{ total: number }`

> [!CAUTION]
> ACE items require the safety gateway. If user responds "yes" to any item AND shows elevated distress (GAD-7 ≥ 15 or DERS-16 total ≥ 60), trigger crisis resource display.

---

## Scoring Function Interface

```typescript
interface InstrumentScore {
  instrumentId: string;
  totalScore?: number;
  subscaleScores?: Record<string, number>;
  percentileScores?: Record<string, number>;
  interpretation?: Record<string, string | boolean | number>;
  rawScoreDetails?: Record<string, number>;
}

// Example: scoreIPIP50(responses) → InstrumentScore
function scoreIPIP50(responses: Record<string, number>): InstrumentScore {
  // 1. Reverse-score items
  // 2. Sum per trait
  // 3. Look up percentiles
  // 4. Return structured result
}
```

---

## Test Cases

Each scoring function must pass at least these test patterns:
1. **All minimum** — every item = lowest value → expected floor scores
2. **All maximum** — every item = highest value → expected ceiling scores
3. **Known clinical** — a set of responses matching a known clinical profile (e.g., GAD-7 = 15 → "Severe")
4. **Reverse-scoring** — verify reverse-scored items are handled correctly
5. **Boundary** — scores at exact threshold values (e.g., ASRS positive count = 3 vs. 4)
