# Mastery Coach — Brand Guide & Design System

> **Creative North Star: "The Kinetic Curator"**
> An AI coaching interface that bridges high-velocity SaaS functionality with premium editorial storytelling. The system rejects clinical coldness — opting for **kinetic energy**, where elements feel captured in a moment of purposeful movement. Intentional asymmetry, tonal depth, and authoritative typography create a curated narrative, not a static grid.

> **Last Updated:** April 2, 2026  
> **Sources:** Stitch Design System (Light + Dark), Existing Codebase (`globals.css`, `onboarding.css`, `chat.css`)  
> **Status:** Canonical — All Sprint 6+ UI must conform to this guide

---

## 1. Brand Identity

### Name
**Mastery Coach** — always two words, always capitalized. Never "MasteryCoach" or "mastery coach" in UI.

### Voice & Personality
| Dimension | Direction |
|:---|:---|
| **Tone** | Confident, concise, warm — never clinical or robotic |
| **Authority** | Speaks with expertise, not arrogance |
| **Warmth** | Respectful challenge, not cheerleading |
| **Precision** | Specific over vague — names, dates, numbers |
| **Brevity** | Says more with less — no padding |

### Brand Promise
*"A coach that remembers everything, adapts to how you think, and shows up before you ask."*

### Tagline (Primary)
*"Your AI Coach Remembers Everything That Matters"*

---

## 2. Color System

We operate a **dark-mode-first** system with a light-mode variant. Both themes share the same semantic roles.

> [!IMPORTANT]
> **Dual-Theme Rule (Mandatory):** Every page and component must render correctly in **both** dark mode and light mode. The user can toggle between themes at any time using the 3-state theme switcher (Light / System / Dark) in the top bar. Components that only look correct in one mode are considered **broken** and must be fixed before merging.
>
> Implementation pattern:
> - Use CSS custom properties from `globals.css` (`var(--color-surface-0)`, `var(--text-heading)`, etc.) — these automatically adapt to `[data-theme="light"]`.
> - For Tailwind classes that use `@theme` tokens (e.g., `bg-surface-50`, `text-text-primary`), matching `[data-theme="light"]` overrides exist in `globals.css`.
> - **Never hardcode dark-mode hex colors inline** (e.g., `text-[#a3a6ff]`). Use semantic tokens or add corresponding light-mode overrides.
> - When adding a new component with custom color, add both the dark default and `[data-theme="light"]` override.

### 2.1 Dark Mode (Primary — Dashboard & App)

The app environment. Deep nocturnal foundation with tonal depth.

#### Surface Hierarchy
Layer surfaces like stacked sheets of frosted glass — never use borders to define regions.

| Token | Hex | OKLCH | Usage |
|:---|:---|:---|:---|
| `surface-base` | `#0b1326` | `oklch(0.13 0.01 250)` | Deepest page background |
| `surface-0` | `#0c0e1a` | `oklch(0.13 0.01 250)` | App background (current `globals.css`) |
| `surface-50` | `#171f33` | `oklch(0.16 0.01 250)` | Card backgrounds, containers |
| `surface-100` | `#1a1d2e` | `oklch(0.20 0.015 250)` | Elevated surfaces, active areas |
| `surface-200` | `#2d3449` | `oklch(0.25 0.02 250)` | Hover states, interaction surface |
| `surface-300` | `#45464d` | `oklch(0.30 0.02 250)` | Ghost borders (at 12% opacity only) |

#### Primary Blues
| Token | Hex | Usage |
|:---|:---|:---|
| `primary` | `#b4c5ff` | Light primary on dark backgrounds |
| `primary-container` | `#4278ff` | Interactive elements, active states |
| `primary-deep` | `#003ec7` | Gradient anchor for CTAs |
| `primary-darker` | `#0038b6` | Gradient terminus |

#### Accent — The Spark
| Token | Hex | Usage |
|:---|:---|:---|
| `accent-gold` | `#fabd00` | **Conversion-only.** Reserved for the single most important CTA on each page |
| `accent-teal` | `#4edea3` | Success states, "Goal Achieved," commitment completion |

> [!IMPORTANT]
> **Single-CTA Rule:** `accent-gold` (#fabd00) must only appear on the ONE primary conversion point per page. Overuse dilutes its "conversion power." Use `primary-container` for secondary actions.

#### Semantic
| Token | Hex | Usage |
|:---|:---|:---|
| `success` | `#34d399` / `oklch(0.72 0.17 155)` | Positive states, completion |
| `warning` | `oklch(0.78 0.15 75)` | Caution, approaching deadline |
| `danger` | `#f87171` / `oklch(0.65 0.20 25)` | Errors, crisis alerts |
| `info` | `oklch(0.70 0.14 235)` | Informational badges |

#### Text
| Token | Hex | Usage |
|:---|:---|:---|
| `text-primary` | `#f1f5f9` / `oklch(0.95 0.005 250)` | Main content |
| `text-secondary` | `#c6c6cd` / `oklch(0.70 0.01 250)` | Supporting content, labels |
| `text-muted` | `oklch(0.50 0.01 250)` | Metadata, timestamps, disclaimers |
| `on-surface-variant` | `#c6c6cd` | Non-essential text — maintain calm, low-stress reading |

> [!CAUTION]
> **Never use pure black (#000000)** for text or shadows. Always use `surface-0` or `surface-base` tints. The deep navy soul of the system must remain intact.

### 2.2 Light Mode (Marketing / Landing Pages)

#### Surface Hierarchy
| Token | Hex | Usage |
|:---|:---|:---|
| `surface` | `#f7fafd` | Base canvas |
| `surface-container-low` | `#f1f4f7` | Subtle sectioning |
| `surface-container` | `#e8ebee` | Standard containers |
| `surface-container-highest` | `#e0e3e6` | Deepest nested layers |
| `surface-container-lowest` | `#ffffff` | Elevated cards, input wells |

#### Primary Blues (Light)
| Token | Hex | Usage |
|:---|:---|:---|
| `primary` | `#003ec7` | High-impact brand moments |
| `primary-container` | `#0052ff` | Active states |
| `surface-tint` | `#004ced` | Focus rings, input borders |

#### Text (Light)
| Token | Hex | Usage |
|:---|:---|:---|
| `on-surface` | `#181c1e` | Primary text — **never pure black** |
| `on-surface-variant` | `#44474a` | Secondary text |
| `outline-variant` | `#c4c7ca` | Ghost borders at 15% opacity |

---

## 3. Typography

### Dual-Font Strategy

| Role | Font | Fallback | Why |
|:---|:---|:---|:---|
| **Display & Headlines** | **Manrope** | Plus Jakarta Sans, system-ui | Geometric precision, modern executive feel, tight letter-spacing creates "locked-in" authority |
| **Functional & Body** | **Inter** | system-ui, sans-serif | Readability gold standard for dense SaaS data and coaching dialogue |
| **Monospace** | **JetBrains Mono** | Fira Code, monospace | Code blocks, data displays |

> [!NOTE]
> The current codebase uses only **Inter** (loaded via Google Fonts in `layout.tsx`). Sprint 6 must add **Manrope** to the font stack for display/headline use. The onboarding CSS comment references "Outfit + Inter" — this is superseded by this guide.

### Type Scale

| Category | Token | Font | Size | Weight | Spacing |
|:---|:---|:---|:---|:---|:---|
| Display Large | `display-lg` | Manrope | 3.5rem (56px) | 700 Bold | -2% letter-spacing |
| Display Small | `display-sm` | Manrope | 2.5rem (40px) | 700 Bold | -1.5% letter-spacing |
| Headline Large | `headline-lg` | Manrope | 2rem (32px) | 700 Bold | -1% letter-spacing |
| Headline Medium | `headline-md` | Manrope | 1.75rem (28px) | 600 Semibold | -0.5% letter-spacing |
| Title Large | `title-lg` | Inter | 1.375rem (22px) | 500 Medium | Normal |
| Title Medium | `title-md` | Inter | 1.125rem (18px) | 500 Medium | Normal |
| Body Large | `body-lg` | Inter | 1rem (16px) | 400 Regular | 1.6 line-height |
| Body Medium | `body-md` | Inter | 0.875rem (14px) | 400 Regular | 1.5 line-height |
| Label Medium | `label-md` | Inter | 0.75rem (12px) | 600 Semibold | ALL CAPS, 0.05em letter-spacing |
| Label Small | `label-sm` | Inter | 0.65rem (10.4px) | 500 Medium | ALL CAPS, 0.06em letter-spacing |

### The Scale Principle
Use **extreme contrast** between headline and body. Pair a `display-sm` heading with a `body-md` description. The size "gap" creates the high-end editorial feel.

---

## 4. Structural Rules

### 4.1 The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are **strictly prohibited** for structural sectioning.

Boundaries must be defined through:
1. **Background Color Shifts** — A `surface-50` card sitting on a `surface-0` background
2. **Tonal Transitions** — Using depth to imply containment
3. **Generous Spacing** — `spacing-12` (3rem) or `spacing-16` (4rem) between sections

> The only exception is the existing onboarding step container (`ob-step`) which uses a `1px solid rgba(255,255,255,0.06)` border. This is acceptable because it's at <10% opacity (a "Ghost Border").

### 4.2 The "Ghost Border" Fallback
When a container **must** have a visible edge (accessibility, contrast):
- **Dark mode:** `surface-300` (#45464d) at **12% opacity** — felt, not seen
- **Light mode:** `outline-variant` (#c4c7ca) at **15% opacity**
- **Never** use 100% opaque borders

### 4.3 The "Glass & Gradient" Rule
Floating elements (modals, popovers, navigation bars) must use **Glassmorphism**:
```css
/* Dark mode glass */
.glass {
  background: rgba(23, 31, 51, 0.6);    /* surface-50 at 60% */
  backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* Light mode glass */
.glass-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.04);
}
```

Primary CTAs should use a **gradient**, never flat color:
```css
/* Signature CTA gradient */
.cta-primary {
  background: linear-gradient(135deg, #b4c5ff, #4278ff);
}

/* Gold conversion CTA */
.cta-conversion {
  background: linear-gradient(135deg, #fabd00, #e5a800);
}
```

### 4.4 The "Dot Pattern" Texture
On large primary-blue sections (hero backgrounds, CTAs), use a subtle dot pattern at **10% opacity** to break up color blocks and add a tactile, printed-press quality.

---

## 5. Elevation & Depth

Depth is a **functional tool for hierarchy**, not decoration. Shadows and lines are crutches — we use light and tone.

### Layering Principle
- **Recessed:** Place `surface-base` elements on `surface-50` backgrounds
- **Raised:** Place `surface-100` elements on `surface-0` backgrounds

### Ambient Shadows
For floating elements, use extra-diffused shadows tinted with the surface color:
```css
/* Dark mode ambient shadow */
box-shadow: 0 20px 40px rgba(6, 14, 32, 0.4);

/* Light mode ambient shadow */
box-shadow: 0 8px 32px rgba(24, 28, 30, 0.06);
```

**Rules:**
- Blur: 32px to 64px
- Opacity: 4% to 8% (light mode) / 30% to 40% (dark mode)  
- Shadow color: Tinted with the surface color, **never pure black**
- Standard "drop shadows" are forbidden — if it doesn't look like ambient light, it doesn't belong

### Glassmorphism Depth
For special "deep insight" containers from the coach, add a subtle inner stroke:
```css
border: 1px solid rgba(180, 197, 255, 0.1); /* primary at 10% */
```

---

## 6. Spacing System

| Token | Value | Usage |
|:---|:---|:---|
| `spacing-1` | 0.25rem (4px) | Tight element gaps |
| `spacing-2` | 0.5rem (8px) | Related element spacing |
| `spacing-3` | 0.75rem (12px) | Card internal padding (compact) |
| `spacing-4` | 1rem (16px) | List item separation, standard gap |
| `spacing-6` | 1.5rem (24px) | Card internal padding (standard) |
| `spacing-8` | 2rem (32px) | Section internal padding |
| `spacing-10` | 2.5rem (40px) | Hero internal padding |
| `spacing-12` | 3rem (48px) | Section separation — breathing room |
| `spacing-16` | 4rem (64px) | Hero-level breathing space |
| `spacing-18` | 4.5rem (72px) | Page vertical rhythm |
| `spacing-22` | 5.5rem (88px) | Maximum breathing room |

> **DO** use `spacing-12` and `spacing-16` generously. If you feel the need for a divider line, it's a sign you haven't used enough whitespace.

---

## 7. Border Radius

| Token | Value | Usage |
|:---|:---|:---|
| `radius-sm` | 0.375rem (6px) | Badges, chips, inline elements |
| `radius-md` | 0.75rem (12px) | Buttons, inputs, small cards |
| `radius-lg` | 1rem (16px) | Main containers, cards |
| `radius-xl` | 1.5rem (24px) | Hero blocks, modals |
| `radius-full` | 9999px | Avatar circles, pill buttons |

---

## 8. Components

### 8.1 Buttons

| Type | Background | Text | Radius | Usage |
|:---|:---|:---|:---|:---|
| **Primary Conversion** | Gradient `accent-gold → #e5a800` | `on-surface` (#181c1e) | `radius-md` | THE one action per page |
| **Primary Action** | Gradient `primary → primary-container` | `#ffffff` | `radius-md` | Standard primary actions |
| **Secondary** | `primary-deep` (#003ec7) | `#ffffff` | `radius-md` | Supporting actions |
| **Ghost / Tertiary** | Transparent | `primary` text | `radius-md` | Ghost Border on hover (15% opacity) |

### 8.2 Cards & Containers
- **No borders, no dividers** — use background color shifts
- **Internal separation:** `spacing-6` (1.5rem) between content blocks
- **Corner radius:** `radius-lg` (1rem) for standard cards, `radius-xl` (1.5rem) for hero-level
- **On hover:** Shift background from `surface-50` → `surface-200`. Do NOT use "lift" animations; use color "glow"

### 8.3 Input Fields

#### Dark Mode
- **Background:** `var(--color-surface-100)` — tonal layer above page bg
- **Border (resting):** `rgba(255, 255, 255, 0.12)` — ghost border, always visible
- **Border (focus):** `rgba(96, 99, 238, 0.3)` — indigo accent
- **Focus ring:** `0 0 0 3px rgba(96, 99, 238, 0.15)`
- **Text:** `var(--text-heading)`
- **Placeholder:** `var(--text-placeholder)`

#### Light Mode
- **Background:** `#ffffff` (`surface-container-lowest`) — must contrast against page bg `#f7fafd`
- **Border (resting):** `rgba(24, 28, 30, 0.12)` — ghost border, always visible
- **Border (focus):** `#004ced` (`surface-tint`) — solid blue
- **Focus ring:** `0 0 0 3px rgba(0, 76, 237, 0.12)`
- **Text:** `#181c1e` (`on-surface`)
- **Placeholder:** `#6b7280`

> [!CAUTION]
> **Light mode inputs must NEVER use a background that matches the page canvas.** `#f3f3f6` on `#f9f9fc` is invisible. Always use `#ffffff` with a visible ghost border.

### 8.4 The "Data Float" Chip
Used for metrics and stats:
- Background: `surface-50` (dark) or `surface-container-lowest` (light)
- Radius: `radius-md`
- Shadow: 20% opacity primary blue ambient shadow
- Font: `label-md` (ALL CAPS) for the label, `headline-md` for the value

### 8.5 List Items
- **No horizontal divider lines** — ever
- Separate items using `spacing-4` vertical gaps and subtle background shifts
- Active state: `surface-200` pill in sidebar navigation

---

## 9. Motion & Interactions

### Transitions
```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* Bouncy, delightful */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);        /* Standard Material ease */
```

### Animation Rules
- Default duration: **200ms** for micro-interactions, **300-500ms** for layout transitions
- Use `ease-smooth` for most transitions
- Use `ease-spring` for elements entering the viewport or appearing
- **Always respect** `prefers-reduced-motion: reduce` — disable animations and transitions
- Hover effects: background color shift (NOT transform/lift)

### Scrollbar
Custom styled, 6px wide, transparent track, `surface-300` thumb:
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: oklch(0.30 0.02 250); border-radius: 3px; }
```

---

## 10. Layout Principles

### Asymmetric Breathing Space
Favor **asymmetric layouts.** If a card is on the left, leave the right-side gutter wider to create "Breathing Room." This is editorial design, not spreadsheet layout.

### High-Contrast Sectioning
Switch from deep blue background to light gray (or vice versa) to signal a **change in content context.** This is how the marketing page alternates between navy hero sections and white feature sections.

### Overlapping Elements
**DO** overlap elements — a card partially crossing the boundary of a blue-to-white section creates depth and movement. This is the "Kinetic" in "Kinetic Curator."

### Content Width Constraints
| Context | Max Width |
|:---|:---|
| Chat interface | 780px |
| Onboarding wizard | 720px |
| Dashboard cards | Full width within sidebar area |
| Landing page content | 1200px container, 720px for text blocks |

---

## 11. Do's and Don'ts

### ✅ Do
- Use whitespace as a structural element — `spacing-12` and `spacing-16` to let hero elements breathe
- Use `accent-teal` (#4edea3) for success states — it signals growth and movement
- Use `on-surface-variant` for all non-essential text to maintain calm, low-stress reading
- Overlap elements across section boundaries to create depth
- Use high-contrast sectioning (deep blue ↔ light gray) to signal content context changes
- Use the dot pattern texture at 10% opacity on large blue surfaces

### ❌ Don't
- Use pure black (#000000) — anywhere. Text uses `on-surface` (#181c1e), dark backgrounds use `surface-0`
- Use 1px solid dividers to separate content — use tonal shifts or vertical spacing
- Use 100% opaque borders — they clutter the executive mind
- Use `accent-gold` for anything other than the single most important CTA on the page
- Use standard "drop shadows" — if it doesn't look like ambient light, it doesn't belong
- Crowd the screen — if you want to add a divider, you need more whitespace instead

---

## 12. Font Loading (Implementation Note)

Add to `layout.tsx` `<head>`:
```html
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
  rel="stylesheet"
/>
```

Add to `globals.css` `@theme`:
```css
--font-display: "Manrope", "Plus Jakarta Sans", system-ui, sans-serif;
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

---

## 13. Migration Notes (Existing Code → Brand Guide)

| Current State | Brand Guide Target | Status |
|:---|:---|:---|
| Only Inter loaded | Inter + Manrope | ✅ Completed — Manrope added to layout.tsx |
| Onboarding used violet (#7c3aed) | Violet removed → primary blue (#4278ff) | ✅ Completed — all violet eliminated |
| Chat used blue (#2563eb) | Align with `primary-container` (#4278ff) | ✅ Completed — blues shifted |
| Hardcoded colors in CSS | Centralized CSS custom properties | ✅ Completed — onboarding.css + chat.css tokenized |
| `globals.css` tokens use OKLCH | Keep OKLCH, add hex fallbacks | ✅ Completed — semantic vars in :root |
| No display font differentiation | Use Manrope for h1/h2/display text | ✅ Completed — .text-display-*, .text-headline-* |
| No light mode theme | Add light mode CSS for all pages | ✅ Completed — `[data-theme="light"]` overrides in globals.css, ThemeProvider + ThemeToggle implemented |

> **Self-Annealing Note:** This file supersedes all ad-hoc color/font decisions in individual CSS files. As Sprint 6 components are built, they must reference these tokens. Older files (onboarding, chat) have been migrated to the centralized token system.

---

## 14. Visual Anti-Patterns — Banned Elements

> [!CAUTION]
> This section documents design patterns that are **permanently banned** across all Mastery Coach and Decoded products. Violating these rules makes the product look like a generic AI SaaS from 2023. That is the worst possible outcome for a premium brand.

### 14.1 The "AI Aesthetic" Problem

The visual language of AI startups has converged into a recognizable, now-dated style. It signals "cheap product" to any design-literate user:

- Colorful emoji used as section or feature icons (🧠 🎯 🔮 💡 ⚡)
- ✨ Sparkle / magic stars as decorative elements — **absolutely prohibited, zero exceptions**
- Purple/pink/teal gradient blobs floating behind content
- Clipart-style 3D or illustrated icons per feature/tier
- Generic "futuristic" illustration with circuit or particle patterns

**Deep Personality uses this aesthetic throughout their report. It is the wrong direction. We reject it entirely.**

### 14.1.1 Approved Icon Library

> [!IMPORTANT]
> **The only approved icon library is [Lucide React](https://lucide.dev/).** No emoji, no clipart, no icon packs, no SVG art packs. Lucide icons are monochrome, stroke-based, and match the editorial restraint of our brand.

| Rule | Specification |
|:---|:---|
| **Library** | `lucide-react` — the sole approved source |
| **Size** | 16–20px for inline/card headers, 24px max for standalone hero usage |
| **Color** | Single color only: `var(--color-primary)` or `var(--text-label)` — never multi-color |
| **Weight** | Default stroke weight (2px) — never filled/solid variants |
| **Never** | Emoji (any Unicode emoji character), clipart, 3D icons, illustrated icons, sparkles (✨), gradient icons |

**Selection principle:** Choose the most abstract, geometrically neutral Lucide icon available. Prefer `Fingerprint` over `Brain`, `Compass` over `Target`, `Waves` over `Ocean`. If no icon fits without becoming decorative, **use no icon** — let typography carry the hierarchy.

### 14.2 Banned Icons & Symbols

The following are **permanently prohibited** in all UI across Mastery Coach, Decoded, and MasteryTV:

| Banned Element | Why Banned | Permitted Alternative |
|:---|:---|:---|
| ✨ Sparkle / Magic Stars | Universal "AI did this" cliché — on every low-effort AI product | No icon; let the content speak |
| 🧠 Brain clipart | Generic "psychology/AI thinking" icon | Custom SVG line art, or data visualization |
| 🎯 Target/Bulls-eye | Overused SaaS "goal" icon | Typographic — use a number, label, or score |
| 🔮 Crystal ball | New-age AI cliché | Remove the concept from UI entirely |
| 💡 Lightbulb | Overused "insight/idea" metaphor | Pull-quote styling or whitespace callout |
| 🤖 Robot face | Implies chatbot, not coach | Never, under any circumstances |
| ⚡ Lightning bolt (as "AI = fast") | Generic speed/AI decoration | Only when part of named content (e.g. IFS "Self-Energy" label) |
| Colorful 3D plastic-style icons | The MasteryTV tier icons (ruler, brain, bar chart, face) | Flat monochrome SVG, or typographic numbering |
| Gradient blob shapes | Decorative purple/pink circles behind content | Structured directional gradients only |
| Emoji used as section headers | Deep Personality's 🎯 🔍 🔮 ✨ as report section labels | All-caps `label-md` text labels, or no label decoration at all |

### 14.3 Specific Existing Violations to Fix

**MasteryTV Homepage — Tier Cards:**
The four tier cards use colorful clipart icons from an icon pack. All four are banned:
- Tier 1 Session Structure: ruler/structure icon — **replace**
- Tier 2 Business & Execution: bar chart icon — **replace**
- Tier 3 Mindset & Resilience: 3D pink/purple brain — **replace**
- Tier 4 Deep Psychology: colorful face/blob icon — **replace**

**Replacement:** Typographic numbering ("01" "02" "03" "04") in `text-muted` using `label-md` style, or a single-color minimal SVG. The tier name and description carry the weight — the icon should not compete.

**Do Not Copy Deep Personality's Visual Style:**
Their content is excellent. Their design is a cautionary tale:
- ✨ sparkle appears as decoration throughout — do not replicate
- Emoji section headers (🎯 🔍 🔮) throughout the report — do not replicate
- Multiple bright accent colors per screen — do not replicate
- *Exception:* Their IFS node visualization (dark canvas, glowing data nodes) is acceptable — it serves a data purpose, not a decorative one

### 14.4 What Premium Looks Like Instead

Premium communicates through **restraint**. Decoration is the enemy of authority.

| Instead of... | Use... |
|:---|:---|
| Colorful icon per feature/section | **Weight and size contrast in typography** — hierarchy through type, not color |
| ✨ sparkles to signal intelligence | **Nothing** — intelligence speaks through content quality, not decoration |
| 3D illustrated icons | **Data visualizations** — a radar chart, slider, or score is more credible than any icon |
| Emoji section labels | **Numbered sections** ("01.") or **all-caps category label** in `label-md` |
| Floating gradient blobs | **Structural gradients** — directional, purposeful, serving layout — never decorative shapes |

### 14.5 The Four-Question Test

Before adding any icon, illustration, or decorative element:

1. **Would this look at home on a $10/month SaaS?** → If yes, remove it.
2. **Is it a sparkle, gradient blob, or colorful emoji icon?** → Remove it.
3. **Is it communicating data/information, or just decorating?** → If decorating, remove it.
4. **Would it appear in the _New York Times_, _The Economist_, or a McKinsey report?** → If not, it doesn't belong here.

> [!IMPORTANT]
> **This applies retroactively.** Any existing component using banned icons or the AI aesthetic must be updated in the next sprint that touches that component. Do not leave old violations in place and do not add new ones.
