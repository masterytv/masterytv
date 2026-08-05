# Mastery Coach — Brand Guide & Design System

> **Creative North Star: "The Kinetic Curator"**
> An AI coaching interface that bridges high-velocity SaaS functionality with premium editorial storytelling. The system rejects clinical coldness — opting for **kinetic energy**, where elements feel captured in a moment of purposeful movement. Intentional asymmetry, tonal depth, and authoritative typography create a curated narrative, not a static grid.

> **Last Updated:** July 20, 2026 (§1.1 — the brand-name registry across verticals + the MoneyTraits rename and the gate-enforced "Money Maps" ban)  
> **Sources:** Stitch Design System (Light + Dark), Existing Codebase (`globals.css`, `onboarding.css`, `chat.css`)  
> **Status:** Canonical — All Sprint 6+ UI must conform to this guide

---

## 1. Brand Identity

### Name
**Mastery Coach** — always two words, always capitalized. Never "MasteryCoach" or "mastery coach" in UI.

### 1.1 The brand-name registry (all verticals) — exact wordmarks, no variants

| Vertical (brand id) | Wordmark | Domain | Rules |
|:---|:---|:---|:---|
| Executive (`masterytv`) | **Mastery Coach** | masterytv.com | Two words, capitalized. Family name for footers: **MasteryTV** (one word). |
| Relationship (`relatti`) | **Relatti** | relatti.com | One word. |
| Money (`money`) | **MoneyTraits** | moneytraits.com | **One word** (house style with MasteryTV/Relatti — never "Money Traits" spaced). "MoneyTraits™" on product artifacts (card chip, report masthead) is fine. |

> [!CAUTION]
> **🚫 BANNED IN ALL USER-FACING AND MODEL-FACING TEXT: "Money Maps", "MoneyMaps", "Money Map".** The money vertical's interim name turned out to be a **third party's registered trademark** — renamed to MoneyTraits by founder decision 2026-07-20 (full record + naming contract: [`MONEY_TRAITS_RENAME.md`](MONEY_TRAITS_RENAME.md)). Reintroducing it — in UI copy, an email, an LLM prompt, an OG card — is **legal exposure**, not just stale branding.
>
> - **Gate-enforced, not convention:** `npm run gate` / CI runs **`check:brand-terms`** (`scripts/check-banned-brand-terms.mjs`) — any spaced form in any case ("Money Maps", "money map", "MONEY MAP PROFILE") or the standalone camel word "MoneyMaps" anywhere in `src/`, `supabase/functions/`, or `scripts/` **fails the build**.
> - **Locked internal identifiers are exempt and must NEVER be renamed** (storage contracts, invisible to users — renaming them destroys stored assessments): instrument id `money_maps`, JSONB keys `sections.money_map` / `sections.money_narrative`, TS names `MoneyMap`/`StoredMoneyMap`/`scoreMoneyMaps`/`MoneyMapsRadar`, file names `money-maps.ts` / `money-map-*`, the `money_decisions` table, and the transition alias host `moneymaps.masterytv.com` (301s away post-cutover). Never surface any of them in copy.
> - **Money vocabulary (exact):** the four dimensions are **traits** — GUARD / DRIVE / MIRROR / SHADOW (never "Maps"); the assessment artifact is **"your trait profile"** (never "your Money Map"); the overclocked strength's cost is **"the Challenge"** (never "leak" — founder call 2026-07-20); the fifth measure is **"the Fear"** (never "the Leap"/"LEAP"). The Money Tell LP (`/tell`) is a campaign door under the same MoneyTraits brand.

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

#### Accent (Light)
> [!IMPORTANT]
> Dark-mode accent colors (`#4edea3` teal, `#ffb74d` amber, `#fabd00` gold) have **insufficient contrast** on white backgrounds. Light mode must use these darkened variants to meet WCAG AA (4.5:1 text contrast).

| Token | Dark Hex | Light Hex | Usage |
|:---|:---|:---|:---|
| `accent-teal` | `#4edea3` | `#059669` | Success, strengths, gifts, growth actions |
| `semantic-warning` | `#ffb74d` | `#c45d00` | Challenges, caution labels, screening flags |
| `accent-gold` | `#fabd00` | `#92600a` | Priority badges, 30-day challenge titles |

#### Semantic (Light)
| Token | Dark Hex | Light Hex | Usage |
|:---|:---|:---|:---|
| `success` | `#69f6b8` | `#059669` | Positive states, completion |
| `warning` | `oklch(0.78 0.15 75)` | `#c45d00` | Caution, approaching deadline |
| `danger` | `#ff6e84` | `#dc2626` | Errors, crisis alerts |
| `info` | `#a3a6ff` | `#003ec7` | Informational badges |

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

### 8.6 Assessment Scale Buttons

Assessment questions use a **horizontal 1-row layout** that must never wrap to a second line.

| Rule | Value |
|:---|:---|
| **Layout** | `flex` row, `flex-1 min-w-0` per button — fills available width equally |
| **Max label width** | `60px` on mobile, `80px` on desktop |
| **Font** | `text-[10px]` on mobile, `text-xs` on desktop |
| **Number badge** | `h-7 w-7` circle, `text-xs font-semibold` |
| **5-point scales** | Show official wording on every point, split to two lines with `\n` (e.g., `Very\nInaccurate`) |
| **7-point scales** | Show text anchors at positions 1, 4, 7 only — intermediate points show number only, two-line split |
| **Gap** | `gap-1.5` mobile, `gap-2` desktop (`sm:gap-2`) |

**Section Intro Card:** Each instrument begins with a glass card showing:
- Category label (uppercase, `text-[#a3a6ff]`)
- Instrument name (`text-xl font-semibold`)
- Question count + estimated time
- Instructions in a subtle callout box
- "Start Section ↵" button

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

> [!IMPORTANT]
> **Colors are gate-enforced, not just convention — the §15 metadata gate's twin.** `npm run gate` (and CI) run two brand-color checks, so a leak fails the build:
> - **`check:colors`** — no hardcoded brand-identity color (`#6063ee`, `rgba(96, 99, 238, …)`, the Tailwind-arbitrary `text-[#a3a6ff]`, the light-mode navy `rgba(0, 62, 199, …)`, or *any* brand's palette) may appear in a component or shared CSS. Use a semantic token: `var(--color-primary)` / `var(--color-primary-container)`, a `color-mix(in oklch, var(--color-primary-container) N%, transparent)` tint, or a Tailwind token utility (`text-primary`, `bg-primary-container/10`). The ban-set is **derived from `globals.css`**, so a new brand's palette is covered automatically.
> - **`check:brand-tokens`** — every `[data-brand]` block must override the *full* identity token set in **both** light and dark, so a brand can never silently fall back to the incumbent's color (the exact bug that made Relatti-dark render indigo accents).
> - **`check:brand-terms`** — banned brand names (today: the money vertical's abandoned "Money Maps"/"MoneyMaps" — a third party's registered mark) may not appear anywhere in `src/`, `supabase/functions/`, or `scripts/`, in any case or spacing. Locked storage identifiers are exempt; full rule + vocabulary in §1.1.
>
> The reviewed allowlist for unavoidable literal hex (token definitions, email HTML, the OG image, provably single-brand surfaces) lives in `scripts/check-brand-colors.mjs`. This closes the color-leak class the July 2026 Relatti sweep had to clean up by hand.

### 14.1 The "AI Aesthetic" Problem

The visual language of AI startups has converged into a recognizable, now-dated style. It signals "cheap product" to any design-literate user:

- Colorful emoji used as section or feature icons (🧠 🎯 🔮 💡 ⚡)
- ✨ **Sparkle / magic stars — ABSOLUTE ZERO TOLERANCE.** No `Sparkles` Lucide icon, no `✨` Unicode character, no sparkle SVG, no star-burst decoration. Not as an icon, not as a label prefix, not as a loading indicator, not as a decorative accent — **never, anywhere, for any reason.** Any PR or commit introducing a sparkle in any form must be rejected on sight. This is the single most important visual rule in the entire brand guide.
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
| ✨ Sparkle / Magic Stars (`Sparkles` icon, `✨` emoji, any sparkle SVG) | **#1 most banned element.** Universal "AI did this" cliché. Signals low-effort product instantly. | **Nothing.** No replacement. Let content quality speak for itself. |
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

### 14.6 Banned copy constructions — the written half of the AI aesthetic

§14.1 bans the *visual* signature of AI-built products. This section bans the *prose* signature. A page can pass every color and icon rule and still read as machine-written, which costs exactly the same credibility.

> [!CAUTION]
> **🚫 THE NEGATION PIVOT — "It's not X, it's Y."** The single most recognizable LLM writing tell. Variants: "not just a test, it's a mirror" · "isn't a label, it's a lens" · "The best relationships **aren't** lucky. They're understood." · "Not a chatbot. A coach." · "Not couples therapy. Not a journaling app." · "not only… but also…". One per page is a rhetorical device; three is a signature. The pre-rewrite MoneyTraits homepage used it roughly **fifteen times on one page** (founder call, 2026-08-05).
>
> **Gate-enforced:** `npm run gate` / CI run **`check:copy-tells`** (`scripts/check-copy-tells.mjs`), which flags the pivot in `src/` and `supabase/functions/`. It is **BLOCKING as of 2026-08-05** (`--strict` in the package.json script), after one day warn-only settled at 5 findings and all 5 were cleared: the two live LP lines reworded (`/tell`, `/samefight` — the founder unfroze the frozen `/samefight` subhead specifically so the gate could go blocking), and the two report-prompt templates reworded rather than allow-listed. Self-test: `node scripts/check-copy-tells.mjs --self-test`.
>
> **Two things that surprise people the first time the gate bites:**
> - **It scans comments too, deliberately** — so a comment *quoting* the old copy you just fixed ("Was 'Not couples therapy. Not a journaling app.' …") re-trips the gate on the very commit that removes it. Describe the shape instead of reproducing it: *a pair of bare negations ("Not couples therapy…")*. This happened twice on the 2026-08-05 cleanup.
> - **LLM prompts are copy for this purpose.** `templates.ts` / `templates-v2.ts` told the report model *"Be direct, warm, and specific. Not clinical. Not flattering. Not vague."* — the banned shape, handed to the model that writes the reports, where it reads as an accidental few-shot example. Rewording it ("Avoid clinical distance, flattery, and vague generalities") removes the demonstration and needs no allow-marker. Prefer rewording over exempting for anything a model reads.
>
> **Three things the v1 gate got wrong, all fixed 2026-08-05 — worth knowing if you extend it.** The live Relatti H1 sat on the homepage uncaught because it tripped all three at once: (1) the patterns only knew `isn't`/`is not`, missing the whole **`aren't`/`wasn't`/`weren't`** family; (2) they matched the straight apostrophe only, while our copy uses the **curly `’`** at least as often; (3) the scan was strictly **per-line**, and the headline lived in two adjacent fields (`headlineTop` / `headlineAccent`), so no regex could have seen the shape. The gate now joins adjacent line pairs (string contents, not raw source, so `", headlineAccent: "` between the halves doesn't hide the sentence). **`that`/`this` are deliberately excluded** as restatement subjects: "…aren't easily swayed. That's a leadership asset" is commentary on the whole clause, not a pivot, and was the one real false positive.
>
> **The fix is not a synonym — cut the negative half and assert the positive.** "This isn't a label, it's a lens" → "Think of it as a lens." The negation was scaffolding; removing it loses nothing and shortens the line.
>
> **Plain negations are fine and are NOT flagged**, including the ones we are legally required to make: "This isn't financial advice", "We never link to your bank", "not therapy, and not financial, investment, or tax advice."

**Not gate-enforced (regex can't separate these from legitimate code, comments, and identifiers) but equally banned in user-facing copy** — these are review concerns, and the `humanizer` skill catches them on a finishing pass:

| Construction | Why | Instead |
|:---|:---|:---|
| **Em dashes** (—, –) | Second-most-cited tell; founder ask 2026-07-24 to remove every one | Period, comma, colon, or parentheses |
| **Triads everywhere** ("faster, simpler, smarter") | Rule-of-three on every line becomes a drumbeat | Use once per page at most |
| **Metronomic rhythm** (every sentence 15–20 words) | Uniform cadence reads as generated | Vary hard: a long sentence, then a three-word one |
| **Matched-template cards** | Three cards, identical grammar, identical length | Break one on purpose |
| **An epigram per section** | If every section ends on a mic drop, none land | Let some sections end flat |
| **AI vocabulary** | unlock, unleash, elevate, empower, seamless, effortless, transform, journey, delve, leverage, harness, foster, navigate, robust, comprehensive, holistic, game-changer, revolutionary, landscape, ecosystem, tapestry, realm, cutting-edge, streamline | Plain verbs |
| **Throat-clearing transitions** | "That being said", "It's worth noting", "At its core", "In today's landscape", "In conclusion" | Start where the tension is |
| **Exclamation points** | Never earned in this brand's register | Remove |

**Copy tooling:** the `copywriter` skill drafts against these rules (it also carries the positioning/awareness diagnosis that precedes any headline); the `humanizer` skill is the finishing pass. Draft with copywriter, polish with humanizer — never the reverse, because humanizer is tuned for encyclopedic neutrality and will flatten legitimate persuasion if it drafts.

---

## 15. Page Metadata & Link Previews (MANDATORY for every new page)

> [!CAUTION]
> **Every new page MUST set its metadata through `src/lib/platform/brand-metadata.ts`.** Never export a bare `{ title: … }`. This rule exists because we shipped relatti.com pages whose iMessage previews showed the MasteryTV icon and the title "Mastery Coach — Coaching for High-Performers" (found live by the founder, 2026-07-14).
>
> **Mechanically enforced:** `npm run gate` / CI runs `scripts/check-brand-metadata.mjs`, which checks **routes, not just files**: (RULE 1) any `page.tsx`/`layout.tsx` exporting metadata without the helper fails the build, and (RULE 2) any page ROUTE with **no brand-aware metadata anywhere below the root layout** — the typical state of a `"use client"` page, which cannot export metadata at all — also fails. Escape hatch: the script's reviewed ALLOWLIST (reserved for provably MasteryTV-only surfaces; an allowlisted `layout.tsx` covers its whole subtree). With white-label tenants this bug class would leak our brand onto a customer's domain, which is why it's a hard gate, not a convention.

### 15.1 Why a bare `title` — or NO title — ships the wrong brand

Three mechanics conspire, and none is visible in the browser:

1. **Next.js merges metadata per TOP-LEVEL key.** A page that exports only `title` inherits the root layout's entire `openGraph` object and `icons` set — which are Mastery Coach. Preview crawlers (iMessage, Slack, WhatsApp, X) prefer `og:title` over `<title>`, so the page previews as Mastery Coach even when its tab title is right.
2. **Client components can't export metadata AT ALL.** A `"use client"` page silently inherits the root layout's *entire* head — title included. This is how relatti.com/dashboard/chat shipped with a "Mastery Coach — Coaching for High-Performers" browser tab (found live by the founder, 2026-07-15) even after the 7/14 sweep: the v1 gate only inspected files that *did* export metadata, so a missing export passed silently. The fix is a **metadata-only `layout.tsx` in the page's segment** (see below).
3. **Link-preview crawlers never run JavaScript.** The client-side brand script in `layout.tsx` swaps favicons in the browser, so everything *looks* right in dev and in your own tab — but crawlers only see the server-rendered head. Client-side fixes do not exist for bots.

### 15.2 The rule

| Page type | Pattern |
|:---|:---|
| **Relatti-only page** (marketing, static) | `export const metadata: Metadata = relattiPageMetadata({ title, description, canonical?, ogTitle?, ogDescription? })` — pure data, page stays statically rendered |
| **Page served by BOTH brands** (legal, login, dashboard, invite…) | `export async function generateMetadata()` → resolve the brand (`getBrand()` / `getBrandFromRequest(param)`) → `return brandPageMetadata(brand.id, { … })` |
| **`"use client"` page** (chat, settings, onboarding…) | The page CANNOT export metadata. Add a **metadata-only `layout.tsx` in its segment** that exports `generateMetadata()` via the helper and returns `children` untouched — pattern: [`src/app/dashboard/chat/layout.tsx`](../src/app/dashboard/chat/layout.tsx). If the whole subtree is client-side (like `/dashboard`), split its layout into a server shell (metadata) + `*LayoutClient.tsx` (interactivity) — pattern: [`src/app/dashboard/layout.tsx`](../src/app/dashboard/layout.tsx) |
| **MasteryTV-only page** | Root-layout defaults are MasteryTV, so inheritance is safe — but prefer the helper anyway for og completeness |

**Tab titles:** use `brandTitle(brand.id, "Coach")` → `"Coach — Relatti"` / `"Coach — Mastery"` — one convention, no per-page ternaries. Authed/private pages always pass `noindex: true`.

The helper emits `title` + `openGraph` (incl. `siteName`) + `twitter` + the brand's icon set **as one unit**, so no key can fall back to the wrong brand. Brand icon assets: MasteryTV at `/favicon.png` + `/apple-touch-icon.png`; Relatti under `/public/relatti/` (regenerate with sharp from `icon.svg`, geometry v2).

**Rich preview cards are automatic.** Every indexable page gets a generated 1200×630 `og:image` (`/api/og?brand=…&title=…`, rendered by `src/app/api/og/route.tsx` from the brand palette — logo + product-name lockup matching the site header, page title large, domain anchor line). Noindex pages get none by design; pass `ogImage: false` to opt a public page out, or `ogImage: "Custom card text"` to override. og:image URLs are emitted ABSOLUTE against the brand origin (crawlers resolve nothing, and Next's inferred metadataBase would point at the vercel.app host).

**Adding a brand (white-label tenant) to the cards = two things, no designer:** (1) an `OG_BRANDS` palette entry in the og route (name, two gradient stops, accent, domain, optional `markBadge` when the logo's palette matches the gradient — e.g. Relatti's rose heart sits in a light circle); (2) the tenant's mark copied into `src/app/api/og/assets/` (highest-quality PNG-on-transparent or the raw SVG; assets are function-BUNDLED via `fetch(new URL(…, import.meta.url))` because the edge runtime can't read `public/`).

### 15.3 SEO & AEO — canonicals, robots, sitemap (brand-aware, host-resolved)

Every route in this app is technically reachable on **every** brand's domain (masterytv.com/couples renders the Relatti couples page). Search engines punish that as duplicate content, so the discoverability layer is host-aware:

| Surface | Where | Rule |
|:---|:---|:---|
| **Canonical URL** | `canonical: "/path"` in the helper call | Set on every **indexable** page. Emitted absolute against the brand origin, so masterytv.com/couples declares `https://relatti.com/couples` as the real URL. The Relatti landing uses `canonical: "/"` because middleware serves `/relatti` at the root of relatti.com. Noindex pages don't need one. |
| **robots.txt** | `src/app/robots.txt/route.ts` | Brand-aware by host. Production domains: crawl allowed, private surfaces (`/dashboard/`, `/admin/`, `/api/`, `/auth/`, `/onboarding`, `/coachapp/`) disallowed, AI answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot) explicitly welcomed (AEO). **Staging/preview/localhost hosts get `Disallow: /`** so preview deployments never enter the index. Do NOT add a static `public/robots.txt` — it conflicts with the route and can't vary by brand (the old static one advertised MasteryTV on relatti.com). |
| **sitemap.xml** | `src/app/sitemap.xml/route.ts` | Brand-aware by host. **When you ship a new public page, add it to `PUBLIC_PATHS` there** — the metadata gate guarantees the page's head, but only the sitemap gets it crawled. Authed/noindex pages never go in it. |

New white-label tenant checklist: brand entry in `brand.ts` + icons + `OG_BRANDS` palette (§15.2) **and** an origin in `BRAND_ORIGINS` (brand-metadata.ts), a production-host entry in the robots route, and a `PUBLIC_PATHS` list in the sitemap route.

### 15.4 Verify like a crawler, not like a browser

Before shipping any page with a shareable URL:

```bash
curl -sL "http://localhost:3000/<path>?brand=relatti" | \
  grep -oE '<title>[^<]*</title>|property="og:(title|site_name)" content="[^"]*"|rel="apple-touch-icon" href="[^"]*"'
```

Expect the brand's title, `og:site_name`, and icon path. (Shared pages that resolve brand via `getBrand()` take a `-H "Cookie: brand=relatti"` header instead of the `?brand=` param.) A browser check is NOT sufficient — the client script masks exactly this bug.

Remember: iMessage caches previews per URL — repaste in a new thread after deploying to see a change.
