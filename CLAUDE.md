# MasteryTV / Relatti — CLAUDE.md

> ## 📍 Current direction (updated June 29, 2026)
> The project has **detoured to Relatti** (relationship coaching) — Stage 1 of a Relationship → Career → White-Label roadmap. The Decoded + Mastery Coach **engine is reused**; the product direction is new.
> **Read first — single entry point:** [`directives/ORIENT.md`](directives/ORIENT.md). It's the ~1,300-word briefing (status, stack, the DB spine) plus a "doing X → read Y" router into the deeper docs. Read only what your task needs; superseded pre-detour docs are in [`directives/archive/`](directives/archive/). For rolling "what changed this week" state, the `relatti-open-state` auto-memory is the live log.

Type A product. Process rules (classification, advisory phase gates, sprint-file
state, push/deploy confirmation) come from the global `~/.claude/CLAUDE.md`.

## Phase tracking

Phase is tracked explicitly in [`directives/STRATEGY.md`](directives/STRATEGY.md) §6 and summarized in [`directives/ORIENT.md`](directives/ORIENT.md) — it is **Phase 4 (Build)**. The active artifacts are the `RELATIONSHIP_*` / `PLATFORM_*` docs; the generic phase-named docs (`DISCOVERY.md`, `PRD.md`, `SPRINT.md`) were the *pre-detour* set and now live in `directives/archive/`. Do **not** infer phase from their absence in `directives/`.

## New vertical / new domain? → the Vertical Playbook is MANDATORY

Launching a new domain on the platform (career, white-label tenant, …) follows [`directives/VERTICAL_PLAYBOOK.md`](directives/VERTICAL_PLAYBOOK.md): **Phase 0.5 Experience Discovery first** (`{VERTICAL}_EXPERIENCE.md`, founder-approved, before any surface is built), then the **§5 Launch Checklist** (brand · SEO/AEO · assessment · coach pack · dashboard/modules · consent/privacy · proactive/email · admin · infra) and the **§5.10 verification sweep** before any public link. The engine defaults to the existing verticals at every seam — anything skipped silently ships the wrong vertical's behavior in front of the new domain's users. Advisory gate: skipping requires an explicit founder "skip gate".

## Skills

Before responding to ANY request, check whether a skill applies — a 1% chance it might is
enough to invoke it. Process skills first (`concise-planning`, `systematic-debugging`), which
decide *how* to approach the task; implementation skills second (`frontend-design`,
`nextjs-best-practices`). Stack them when both apply. Never skip the check by reasoning that a
task is too simple.

## Hard rules

- **Brand Compliance (MANDATORY):** Before writing ANY CSS, component styles, or inline style props in this workspace, you **must** read `directives/BRAND.md`. Use only the defined type scale tokens (`text-display-lg`, `text-headline-md`, `text-label-sm`, etc.), CSS custom properties from `globals.css @theme`, and Lucide React icons. Hardcoded hex colors, non-standard font sizes, emoji icons, and clipart are permanently banned (BRAND.md §14). This is non-negotiable — violations require rework.
- **UX-First Decision Principle:** When evaluating implementation options for any user-facing feature, **user experience is the primary constraint — not cost, not technical simplicity, not legal convenience.** Less friction = more success. If a solution requires the user to do manual work that a machine could do (copying, pasting, uploading, re-entering data), that solution is wrong — find a way to automate it. Only recommend user effort as a last resort when all automated options have been exhausted and priced.
