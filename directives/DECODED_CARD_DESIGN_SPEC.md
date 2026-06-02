# Decoded — Archetype Share Card Design Specification

> **Version:** 1.0
> **Created:** June 1, 2026
> **Status:** 🟢 LOCKED — Design approved, batch generation in progress
> **Authority:** This document is the source of truth for all archetype card image generation. Any agent generating card images MUST follow this spec exactly.
> **References:** DECODED_ARCHETYPES.md, BRAND.md

---

## Purpose

This spec defines the exact visual design, prompt templates, and asset pipeline for generating 64 personalized archetype share cards (16 archetypes × 4 illustration styles). These are pre-designed base images that a Satori/`@vercel/og` API route will composite with dynamic text overlays (name, sub-label, superpowers).

---

## 1. Card Template — LOCKED DESIGN

Every card follows this identical structure. The ONLY thing that changes between cards is the illustration subject, archetype name, sub-label text, description quote, and superpower text.

### Visual Specifications

| Element | Specification |
|:--------|:-------------|
| **Dimensions** | Square for generation (1024×1024), will be served as Story (1080×1920) and Square (1080×1080) |
| **Background** | Dark navy blue `#0b1326` |
| **Border** | Elegant thin double-line border with art deco corner ornaments, cream/off-white |
| **Illustration style** | Cream/off-white fine-line engraving on navy — detailed crosshatching, stippling like a luxury banknote, vintage scientific illustration, or Dürer woodcut |
| **Typography color** | Cream/off-white for headers and body, Gold `#fabd00` for user's name |
| **Art style keywords** | NOT cartoon. NOT cute. NOT AI-aesthetic. Premium engraving, crosshatching, stippling. Like a luxury whiskey label, premium playing card, or currency engraving. |

### Card Layout (Top to Bottom)

```
┌─────────────────────────────────┐
│           D E C O D E D         │  ← Spaced small caps, cream
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   [ILLUSTRATION]        │    │  ← Central artwork (style-specific)
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│       THE [ARCHETYPE]           │  ← Bold cream all-caps
│       ──── ◆ ────               │  ← Decorative divider
│    [Sub-label in italic]        │  ← Cream italic
│                                 │
│  "[Description quote]"          │  ← Smaller italic, in quotes
│                                 │
│  ◆ [Power 1] ◆ [Power 2]       │  ← Superpower badges
│  ◆ [Power 3]                    │
│                                 │
│      ≈ [FULL NAME] ≈           │  ← Gold #fabd00 with flourishes
│     masterytv.com/decoded       │  ← Small watermark, cream
└─────────────────────────────────┘
```

---

## 2. Master Prompt Template

Use this EXACT prompt template for every card. Replace only the `{{variables}}`.

### Template

```
Ultra-premium personality type share card. Dark navy blue background (#0b1326). Consistent template: elegant thin double-line border with art deco corner ornaments, "DECODED" spaced small caps at top in cream, large centered illustration in the middle, "THE {{ARCHETYPE_NAME}}" in bold cream all-caps below, decorative divider, "{{SUB_LABEL}}" in italic cream, then a description quote in smaller italic "{{DESCRIPTION}}", then three superpower badges "◆ {{POWER_1}} ◆ {{POWER_2}} ◆ {{POWER_3}}", then "THOMAS WOOD" in gold (#fabd00) with small flourishes at bottom, "masterytv.com/decoded" watermark at very bottom. Vertical 9:16 story format.

ILLUSTRATION ({{STYLE_TYPE}}): {{ILLUSTRATION_DESCRIPTION}}

Ultra-premium, collectible, shareable.
```

### Variable Replacement Rules

- `{{ARCHETYPE_NAME}}` — ALL CAPS, e.g., "ARCHITECT"
- `{{SUB_LABEL}}` — Title case italic, e.g., "Designer with Compassion"
- `{{DESCRIPTION}}` — Sentence case, e.g., "Systematic visionary who builds frameworks and structures"
- `{{POWER_1/2/3}}` — Title case, e.g., "Deep Empathy"
- `{{STYLE_TYPE}}` — One of: "Animal", "Object", "Male figure", "Female figure"
- `{{ILLUSTRATION_DESCRIPTION}}` — Style-specific, see Section 3

---

## 3. All 16 Archetypes — Complete Config

### #1 THE ARCHITECT
| Field | Value |
|:------|:------|
| Sub-label | Designer with Compassion |
| Description | Systematic visionary who builds frameworks and structures |
| Powers | Deep Empathy · Creative Vision · Strategic Thinking |
| **Animal** | A majestic great horned owl perched on a drafting compass, facing forward with intense knowing eyes. One talon grips the compass, the other rests on a geometric ruler. Behind the owl, faint architectural blueprint grid lines and a golden ratio spiral. The owl's feathers show incredible detail. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury whiskey label or premium playing card. NOT cartoon. NOT cute. This owl commands respect. |
| **Object** | An elegant heraldic still-life of architectural tools: a brass drafting compass standing upright at center, crossed with a T-square and protractor. An unrolled blueprint scroll beneath. A small golden ratio spiral diagram to the right. All arranged in a balanced, symmetrical coat-of-arms composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching, stippling like a luxury banknote or vintage technical illustration. |
| **Male** | A distinguished male figure in profile, standing at a massive drafting table. He wears a tailored vest with rolled sleeves, holding a compass and drawing precise arcs on a blueprint. Around him, geometric shapes float — cubes, triangles, golden spirals — as if designing the world. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a vintage scientific illustration or Dürer woodcut. Timeless, elegant, intellectual. NOT cartoon. The figure could be from 1920 or 2025. |
| **Female** | A distinguished female figure in profile, standing at a massive drafting table. She wears a structured blazer with hair pulled back, holding a compass and drawing precise arcs on a blueprint. Around her, geometric shapes float — cubes, triangles, golden spirals — as if designing the world. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a vintage scientific illustration or Dürer woodcut. Timeless, elegant, intellectual. NOT cartoon. The figure could be from 1920 or 2025. Strong and confident. |

---

### #2 THE EXPLORER
| Field | Value |
|:------|:------|
| Sub-label | Wanderer with Purpose |
| Description | Curiosity-driven adventurer who thrives on novelty |
| Powers | Boundless Curiosity · Adaptive Thinking · Courageous Discovery |
| **Animal** | A majestic golden eagle in flight, wings fully extended, soaring over a mountain range. Below, a winding river cuts through a vast landscape. The eagle carries a small compass in one talon. Wind currents rendered with fine crosshatch lines. Rendered in exquisite cream/off-white fine-line engraving on navy. Powerful, free, far-seeing. NOT cartoon. |
| **Object** | An elegant heraldic still-life of exploration tools: a vintage brass telescope at center, crossed with a navigator's sextant. An unrolled antique map beneath with compass rose. A leather-bound journal with pen. Mountain silhouettes in background. Balanced, symmetrical coat-of-arms composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury banknote. |
| **Male** | A distinguished male figure standing on a mountain summit, looking out over a vast landscape. He wears a long explorer's coat, one hand shading his eyes, the other holding a telescope. Wind catches his coat. Behind him, a trail stretches into the distance. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Timeless adventurer. NOT cartoon. |
| **Female** | A distinguished female figure standing on a mountain summit, looking out over a vast landscape. She wears a practical explorer's jacket, one hand shading her eyes, the other holding a telescope. Wind catches her hair. Behind her, a trail stretches into the distance. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Timeless adventurer. NOT cartoon. Strong and confident. |

---

### #3 THE ADVOCATE
| Field | Value |
|:------|:------|
| Sub-label | Voice for the Voiceless |
| Description | People-centered champion who fights for others |
| Powers | Moral Courage · Deep Conviction · Empathic Leadership |
| **Animal** | A powerful standing bear, protective stance, one paw raised. The bear is noble and upright, not aggressive — a guardian. Behind the bear, a faint banner or shield emblem. Strong musculature rendered with detailed crosshatching. Rendered in exquisite cream/off-white fine-line engraving on navy. Protective, strong, noble. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of advocacy objects: a raised torch at center burning with a steady flame, a round shield with a heart emblem, a banner unfurling behind. A pair of clasped hands at the base. Balanced, symmetrical coat-of-arms composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury banknote. |
| **Male** | A distinguished male figure standing tall at a podium or raised platform, one arm raised holding a torch or banner. He wears a formal coat, expression determined and compassionate. Behind him, silhouettes of people he protects. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Inspiring, principled. NOT cartoon. |
| **Female** | A distinguished female figure standing tall at a podium or raised platform, one arm raised holding a torch or banner. She wears a formal coat, expression determined and compassionate. Behind her, silhouettes of people she protects. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Inspiring, principled. NOT cartoon. Strong and confident. |

---

### #4 THE SENTINEL
| Field | Value |
|:------|:------|
| Sub-label | Keeper of the Watch |
| Description | Reliable protector who values tradition and duty |
| Powers | Unwavering Loyalty · Structured Thinking · Quiet Strength |
| **Animal** | A noble German Shepherd sitting at attention, alert and watchful. Ears forward, eyes scanning the horizon. A faint watchtower or castle wall behind. The dog wears a simple collar with a key pendant. Fur rendered with incredible detail and crosshatching. Rendered in exquisite cream/off-white fine-line engraving on navy. Loyal, vigilant, dependable. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of protection objects: a large ornate key at center, crossed with a sword. Behind them, a castle tower or watchtower. A clock with Roman numerals. A shield at the base. Balanced, symmetrical coat-of-arms composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure standing at a tower window, looking outward with vigilant expression. He wears a structured uniform or formal military-style coat. One hand rests on a large key or sword hilt. The room has stone walls, a clock, order and structure. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Steadfast, reliable. NOT cartoon. |
| **Female** | A distinguished female figure standing at a tower window, looking outward with vigilant expression. She wears a structured uniform or formal coat. One hand rests on a large key or sword hilt. The room has stone walls, a clock, order and structure. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Steadfast, reliable. NOT cartoon. Strong and confident. |

---

### #5 THE CATALYST
| Field | Value |
|:------|:------|
| Sub-label | Spark That Starts the Fire |
| Description | Energetic change-maker who disrupts the status quo |
| Powers | Infectious Energy · Transformative Vision · Fearless Initiative |
| **Animal** | A mythical phoenix mid-rise, wings spread wide, feathers made of flame and light. Rising from stylized embers and smoke below. The bird is powerful, dynamic, ascending. Radiating lines behind suggest explosive energy. Rendered in exquisite cream/off-white fine-line engraving on navy with select gold (#fabd00) accents on the flame tips. NOT cartoon. Majestic, transformative. |
| **Object** | An elegant heraldic still-life of transformation objects: a lightning bolt at center striking an anvil. Gears and mechanical cogs mid-turn around the impact point. Sparks flying outward. A match lit at the base. Dynamic, energetic composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure mid-stride, lighting a massive torch or brazier. Sparks fly around him. He wears dynamic clothing caught in the wind of the fire. Behind him, a path of lit torches stretching into the distance — he has ignited a chain reaction. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Dynamic, energetic. NOT cartoon. |
| **Female** | A distinguished female figure mid-stride, lighting a massive torch or brazier. Sparks fly around her. She wears dynamic clothing caught in the wind of the fire. Behind her, a path of lit torches stretching into the distance — she has ignited a chain reaction. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Dynamic, energetic. NOT cartoon. Strong and confident. |

---

### #6 THE SAGE
| Field | Value |
|:------|:------|
| Sub-label | Seeker of Hidden Truths |
| Description | Deep thinker who seeks understanding over action |
| Powers | Profound Insight · Patient Analysis · Wisdom Under Pressure |
| **Animal** | A majestic raven perched on a stack of ancient leather-bound books, head tilted thoughtfully. One talon rests on an open book. Behind the raven, an hourglass and faint celestial star map. The raven's feathers show incredible iridescent detail in crosshatching. Rendered in exquisite cream/off-white fine-line engraving on navy. Wise, knowing, ancient. NOT cartoon. |
| **Object** | An elegant heraldic still-life of knowledge objects: an open ancient tome at center with an ornate quill pen. An hourglass beside it, sand mid-flow. A magnifying glass. A celestial armillary sphere above. Balanced, symmetrical coat-of-arms composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury banknote. |
| **Male** | A distinguished male figure seated at a massive desk surrounded by books and scrolls. He holds a quill, deep in thought, chin resting on one hand. An hourglass and globe nearby. Warm candlelight suggests late-night study. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Contemplative, brilliant. NOT cartoon. |
| **Female** | A distinguished female figure seated at a massive desk surrounded by books and scrolls. She holds a quill, deep in thought, chin resting on one hand. An hourglass and globe nearby. Warm candlelight suggests late-night study. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Contemplative, brilliant. NOT cartoon. Strong and confident. |

---

### #7 THE HEALER
| Field | Value |
|:------|:------|
| Sub-label | Gentle Force in Quiet Rooms |
| Description | Empathic nurturer who absorbs others' pain |
| Powers | Deep Listening · Emotional Intelligence · Gentle Strength |
| **Animal** | A graceful doe deer lying peacefully in a nest of healing herbs and wildflowers. Lavender, chamomile, fern fronds surround her. Small fireflies drift nearby. The deer's expression is soft, compassionate, serene. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury whiskey label. NOT cartoon. Gentle but powerful. |
| **Object** | An elegant heraldic still-life of healing objects: an ornate chalice with a single flame rising from within, surrounded by a wreath of medicinal herbs — lavender, chamomile, rosemary. A mortar and pestle nestled among the botanicals. A small crystal vial. Balanced, symmetrical composition like a coat of arms. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching and stippling like a luxury banknote. |
| **Male** | A distinguished male figure kneeling, hands extended forward with palms up, a small flame hovering above his cupped hands. He wears simple flowing garments. Surrounded by delicate botanical elements — herbs, flowers, ivy. Behind him, a subtle halo or aureole of radiating lines. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a Dürer woodcut. Serene, compassionate, powerful in stillness. NOT cartoon. |
| **Female** | A distinguished female figure kneeling gracefully, hands extended forward with palms up, a small flame hovering above her cupped hands. She wears flowing robes, hair loose. Surrounded by delicate botanical elements — herbs, flowers, ivy. Behind her, a subtle halo or aureole of radiating lines. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a Dürer woodcut. Serene, compassionate, powerful in stillness. NOT cartoon. Feminine strength. |

---

### #8 THE COMMANDER
| Field | Value |
|:------|:------|
| Sub-label | The One They Follow |
| Description | Decisive leader who takes charge naturally |
| Powers | Natural Authority · Strategic Command · Decisive Action |
| **Animal** | A fierce hawk perched on a gauntlet, wings partially spread, fierce forward gaze. One talon grips the leather gauntlet, the other clenches. Behind the hawk, faint battle standards or military banners. The hawk's feathers show aggressive, precise detail. Rendered in exquisite cream/off-white fine-line engraving on navy. Commanding, sharp, decisive. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of command objects: a crown at center above crossed scepters. A battle map unrolled beneath with strategic markers. A war horn to the side. A commander's ring or signet seal. Balanced, powerful composition like a royal coat of arms. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure standing at the head of a large table, one hand flat on a battle map or strategic plan, the other pointing decisively forward. He wears a structured military-style coat or tailored suit. Behind him, others follow his direction. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Authoritative, decisive, born leader. NOT cartoon. |
| **Female** | A distinguished female figure standing at the head of a large table, one hand flat on a battle map or strategic plan, the other pointing decisively forward. She wears a structured military-style coat or tailored blazer. Behind her, others follow her direction. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Authoritative, decisive, born leader. NOT cartoon. Strong and confident. |

---

### #9 THE ARTIST
| Field | Value |
|:------|:------|
| Sub-label | Feeling Made Visible |
| Description | Sensitive creator who channels emotion into expression |
| Powers | Raw Creativity · Emotional Depth · Visionary Expression |
| **Animal** | A delicate hummingbird hovering mid-flight, wings a blur of motion, beak touching a blooming flower. Around the bird, swirling patterns of ink or paint splatter that suggest creative energy. Incredibly fine feather detail. Rendered in exquisite cream/off-white fine-line engraving on navy. Beautiful, delicate, alive with energy. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of creative tools: an artist's palette at center with brushes crossed behind it. A sculptor's chisel and small marble bust to one side. Paint tubes, a violin bow. Ink splatters arranged artfully. Balanced composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure standing at an easel, mid-brushstroke, painting on a large canvas. He wears a loose shirt with rolled sleeves, intense concentration on his face. Paint spatters on his hands. Behind him, finished canvases lean against the wall. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Lost in creation. NOT cartoon. |
| **Female** | A distinguished female figure standing at an easel, mid-brushstroke, painting on a large canvas. She wears a loose blouse, intense concentration on her face. Paint spatters on her hands. Behind her, finished canvases lean against the wall. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Lost in creation. NOT cartoon. Strong and confident. |

---

### #10 THE DIPLOMAT
| Field | Value |
|:------|:------|
| Sub-label | Bridge Between Worlds |
| Description | Harmony-seeking bridge-builder in every room |
| Powers | Social Intelligence · Conflict Resolution · Unifying Presence |
| **Animal** | A graceful white dove in flight, carrying an olive branch in its beak. Below, a stylized bridge spanning two cliff faces. Soft radiating lines suggest peace and harmony. The dove's wings show delicate feather detail. Rendered in exquisite cream/off-white fine-line engraving on navy. Peaceful, elegant, purposeful. NOT cartoon. |
| **Object** | An elegant heraldic still-life of diplomacy objects: a balanced scale of justice at center, perfectly level. An olive branch draped over one side. A handshake emblem beneath. A bridge arch behind. A dove feather quill. Balanced, symmetrical coat-of-arms composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure standing between two groups of people, arms extended to both sides in a welcoming, bridging gesture. He wears a formal diplomat's attire. The two groups face him with trust. Behind, a bridge arch or doorway frames the scene. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Unifying, trusted, warm. NOT cartoon. |
| **Female** | A distinguished female figure standing between two groups of people, arms extended to both sides in a welcoming, bridging gesture. She wears formal diplomatic attire. The two groups face her with trust. Behind, a bridge arch or doorway frames the scene. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Unifying, trusted, warm. NOT cartoon. Strong and confident. |

---

### #11 THE MAVERICK
| Field | Value |
|:------|:------|
| Sub-label | Instinct Over Instructions |
| Description | Rule-breaking innovator who trusts instinct over process |
| Powers | Bold Intuition · Creative Disruption · Fearless Action |
| **Animal** | A powerful lone wolf mid-howl on a rocky outcrop, silhouetted against a crescent moon. The wolf stands at the cliff edge, head thrown back, wind catching its fur. Below, broken chain links scattered on the rocks. Raw power in elegant lines. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury whiskey label. Wild but NOT aggressive. Independent, untamed, free. |
| **Object** | An elegant heraldic still-life of rebellion objects: a broken compass with needle pointing its own direction at center, a torn rulebook with pages flying, a single wild arrow shot through a playing card (ace of spades), a motorcycle helmet, scattered broken chain links. Arranged in a dynamic slightly asymmetric composition — a coat of arms for renegades. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury banknote. Bold, defiant energy in elegant craftsmanship. |
| **Male** | A confident male figure striding forward against a crowd of faceless figures going the other direction. He wears a long coat blowing in the wind, chin up, determined expression. One hand holds a torn map or broken rulebook. Dynamic wind and movement. The figure is bright cream, the crowd behind is faded/darker. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a Dürer woodcut. Bold, self-assured. Walks alone by choice. NOT cartoon. |
| **Female** | A confident female figure striding forward against a crowd of faceless figures going the other direction. She wears a leather jacket or long coat blowing in the wind, chin up, determined expression, hair flowing behind her. One hand holds a torn map or broken rulebook. Dynamic wind and movement. She is bright cream, the crowd behind faded/darker. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a Dürer woodcut. Bold, fierce, self-assured. Walks alone by choice. NOT cartoon. |

---

### #12 THE GUARDIAN
| Field | Value |
|:------|:------|
| Sub-label | Shield Against the Storm |
| Description | Anxious protector who plans for every contingency |
| Powers | Protective Instinct · Risk Awareness · Fierce Devotion |
| **Animal** | A powerful mother bear standing protectively over her cub. The cub is nestled between her front legs. The mother bear's posture is alert and defensive — not aggressive, but clearly saying "not on my watch." Behind them, a forest of fir trees. Fur rendered with incredible crosshatching detail. Rendered in exquisite cream/off-white fine-line engraving on navy. Protective, fierce, loving. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of protection objects: a massive round shield at center with a family crest emblem. Behind it, a fortress wall with turrets. A set of keys at the base. An umbrella and a first-aid kit tucked to the sides. Balanced, defensive composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure standing in a doorway, arms spread wide in a protective stance, blocking the entrance. He wears a heavy cloak. Behind him, warm light from a home interior. Outside, a storm rages. His expression is determined — he will not let harm pass. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Protective, self-sacrificing. NOT cartoon. |
| **Female** | A distinguished female figure standing in a doorway, arms spread wide in a protective stance, blocking the entrance. She wears a heavy cloak. Behind her, warm light from a home interior. Outside, a storm rages. Her expression is determined — she will not let harm pass. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Protective, self-sacrificing. NOT cartoon. Strong and confident. |

---

### #13 THE LUMINARY
| Field | Value |
|:------|:------|
| Sub-label | The Room Remembers You |
| Description | Charismatic inspirer who lights up rooms |
| Powers | Magnetic Presence · Inspirational Vision · Emotional Resonance |
| **Animal** | A majestic male lion with a full flowing mane, seated regally. Behind the lion, a large golden sun disc (#fabd00) radiates beams of light in all directions. Smaller animals or silhouettes gather around the lion's base, drawn to the light. The lion's expression is warm, magnetic, powerful. Rendered in exquisite cream/off-white fine-line engraving on navy with the gold sun accent. NOT cartoon. Regal, warm, magnetic. |
| **Object** | An elegant heraldic still-life of light and inspiration objects: a grand ornate lantern or oil lamp at center with a brilliant flame, radiating beams of light. A crown of laurel leaves around it. An open book of wisdom at the base. Small stars and celestial elements. A golden disc (#fabd00) behind the lantern creates a warm aureole. Balanced, radiant composition. Rendered in exquisite cream/off-white fine-line engraving on navy. |
| **Male** | A distinguished male figure standing on an elevated platform or stage, arms outstretched, radiating light. He wears a flowing robe or tailored coat. Below, an audience of silhouetted figures look up, inspired. Behind him, radiating lines of light fan outward like a sunrise. A subtle golden halo (#fabd00). Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Inspiring, magnetic, warm. NOT cartoon. |
| **Female** | A distinguished female figure standing on an elevated platform or stage, arms outstretched, radiating light. She wears a flowing dress or tailored coat. Below, an audience of silhouetted figures look up, inspired. Behind her, radiating lines of light fan outward like a sunrise. A subtle golden halo (#fabd00). Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Inspiring, magnetic, warm. NOT cartoon. Strong and confident. |

---

### #14 THE STRATEGIST
| Field | Value |
|:------|:------|
| Sub-label | Three Moves Ahead |
| Description | Long-range planner who sees three moves ahead |
| Powers | Systems Thinking · Pattern Recognition · Calculated Precision |
| **Animal** | A magnificent octopus with eight tentacles, each gripping a different strategic object — a chess piece, a telescope, a clock, a key, a coin, a pen, a compass, a scroll. The octopus is centered and composed, its eye intelligent and calculating. Rendered in exquisite cream/off-white fine-line engraving on navy — incredible tentacle sucker detail. Brilliant, multi-threaded, elegant. NOT cartoon. |
| **Object** | An elegant heraldic still-life of strategy objects: a chess board at center with pieces mid-game. A telescope folded beside it. A star map or constellation chart behind. A pocket watch. Precision instruments. Balanced, intellectual composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching like a luxury banknote. |
| **Male** | A distinguished male figure seated at a chess board, one hand poised over a piece, the other holding a telescope or spyglass. His expression is focused, calculating, several steps ahead. Behind him, a star map or strategic diagram on the wall. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Brilliant, patient, precise. NOT cartoon. |
| **Female** | A distinguished female figure seated at a chess board, one hand poised over a piece, the other holding a telescope or spyglass. Her expression is focused, calculating, several steps ahead. Behind her, a star map or strategic diagram on the wall. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Brilliant, patient, precise. NOT cartoon. Strong and confident. |

---

### #15 THE REBEL
| Field | Value |
|:------|:------|
| Sub-label | Beautifully Uncontainable |
| Description | Intense individualist who resists conformity |
| Powers | Radical Authenticity · Unshakable Identity · Creative Defiance |
| **Animal** | A black panther mid-leap, muscles coiled, powerful and dynamic. The panther leaps over broken chains or a shattered cage. Behind, a full moon partially obscured by clouds. The panther's spots and musculature rendered in obsessive crosshatch detail. Rendered in exquisite cream/off-white fine-line engraving on navy. Intense, untamed, nocturnal power. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of rebellion objects: a shattered crown at center, broken into elegant pieces. A spray paint can beside it. A burning match. A torn flag or banner. A single rose growing through cracked concrete. Dynamic, defiant composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure mid-stride, breaking free from chains that shatter around his wrists. He wears a mix of formal and informal clothing — structured coat, open collar. His expression is fierce but free, not angry. Behind him, a wall he has just broken through. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Free, fierce, authentic. NOT cartoon. |
| **Female** | A distinguished female figure mid-stride, breaking free from chains that shatter around her wrists. She wears a mix of formal and informal clothing — structured jacket, flowing hair. Her expression is fierce but free, not angry. Behind her, a wall she has just broken through. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Free, fierce, authentic. NOT cartoon. Strong and confident. |

---

### #16 THE ANCHOR
| Field | Value |
|:------|:------|
| Sub-label | The Ground Beneath Your Feet |
| Description | Steady, grounding presence others rely on |
| Powers | Unshakable Calm · Deep Reliability · Emotional Stability |
| **Animal** | A majestic African elephant walking steadily forward, trunk raised slightly. The elephant is massive, calm, grounded. Behind the elephant, a vast savanna landscape with an acacia tree. A small bird (oxpecker) perches on its back — symbolizing trust. Incredible skin texture rendered in crosshatching. Rendered in exquisite cream/off-white fine-line engraving on navy. Steady, ancient, wise. NOT cartoon. NOT cute. |
| **Object** | An elegant heraldic still-life of grounding objects: a massive ship's anchor at center, wrapped with a sturdy rope. A compass rose beneath it. A foundation stone or cornerstone with roman numerals. Deep roots of an oak tree frame the sides. Balanced, solid, immovable composition. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. |
| **Male** | A distinguished male figure standing as a literal pillar of strength — feet planted wide, arms at his sides, calm and unshakable. Others lean against him or stand close, drawing stability from his presence. Behind him, a massive oak tree with deep roots visible underground. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Calm, immovable, trustworthy. NOT cartoon. |
| **Female** | A distinguished female figure standing as a literal pillar of strength — feet planted wide, arms at her sides, calm and unshakable. Others lean against her or stand close, drawing stability from her presence. Behind her, a massive oak tree with deep roots visible underground. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching. Calm, immovable, trustworthy. NOT cartoon. Strong and confident. |

---

## 4. File Naming Convention

All generated images must be saved to `/public/decoded/cards/` with this naming:

```
/public/decoded/cards/{archetype}/{style}.png
```

Where:
- `{archetype}` = lowercase slug: `architect`, `explorer`, `advocate`, `sentinel`, `catalyst`, `sage`, `healer`, `commander`, `artist`, `diplomat`, `maverick`, `guardian`, `luminary`, `strategist`, `rebel`, `anchor`
- `{style}` = `animal`, `object`, `male`, `female`

Example: `/public/decoded/cards/architect/animal.png`

---

## 5. Generation Progress Tracker

| # | Archetype | Animal | Object | Male | Female | Status |
|:--|:----------|:------:|:------:|:----:|:------:|:-------|
| 1 | Architect | ✅ | ✅ | ✅ | ✅ | **Complete** |
| 2 | Explorer | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 3 | Advocate | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 4 | Sentinel | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 5 | Catalyst | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 6 | Sage | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 7 | Healer | ✅ | ✅ | ✅ | ✅ | **Complete** |
| 8 | Commander | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 9 | Artist | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 10 | Diplomat | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 11 | Maverick | ✅ | ✅ | ⬜ | ⬜ | 2 remaining |
| 12 | Guardian | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 13 | Luminary | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 14 | Strategist | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 15 | Rebel | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| 16 | Anchor | ⬜ | ⬜ | ⬜ | ⬜ | Pending |

**Total: 10/64 complete**

### Batch Order for Remaining Generation

Generate 4 images at a time (1 archetype × 4 styles), verify quality, then next archetype.

**Priority order:**
1. Maverick Male + Female (finish incomplete)
2. Luminary (4 styles)
3. Explorer (4 styles)
4. Sage (4 styles)
5. Commander (4 styles)
6. Artist (4 styles)
7. Advocate (4 styles)
8. Sentinel (4 styles)
9. Catalyst (4 styles)
10. Diplomat (4 styles)
11. Guardian (4 styles)
12. Strategist (4 styles)
13. Rebel (4 styles)
14. Anchor (4 styles)

---

## 6. Quality Checklist — Per Image

Before marking an image ✅, verify:

- [ ] Dark navy background is consistent (#0b1326)
- [ ] Art deco border with corner ornaments is present
- [ ] "DECODED" in spaced small caps at top
- [ ] Illustration is cream/off-white fine-line engraving (not color, not cartoon)
- [ ] Archetype name in bold cream all-caps ("THE ARCHITECT")
- [ ] Decorative divider present
- [ ] Sub-label in italic cream
- [ ] Description quote in smaller italic with quotation marks
- [ ] Three superpower badges with ◆ diamonds
- [ ] "THOMAS WOOD" in gold (#fabd00) with flourishes
- [ ] "masterytv.com/decoded" watermark at bottom
- [ ] Overall premium feel — would you frame this on your wall?

---

## 7. Agent Instructions for New Conversations

If you are a new agent picking up this work:

1. **Read this entire file first.** It is the source of truth.
2. **Check the progress tracker** (Section 5) to see what's done and what's next.
3. **Use the exact prompt template** from Section 2 with the per-archetype configs from Section 3.
4. **Generate 4 images per archetype** (animal, object, male, female).
5. **After generating, update the progress tracker** in this file.
6. **Save final approved images** to `/public/decoded/cards/{archetype}/{style}.png`.
7. **Do NOT change the design style.** If an image looks inconsistent, regenerate it — don't adjust the prompt template.
8. **Rate limit awareness:** ~20 images per 4-hour window. Plan accordingly.
