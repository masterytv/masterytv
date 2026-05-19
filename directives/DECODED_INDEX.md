# Decoded — Document Map

> **Version:** 1.0
> **Date:** May 19, 2026
> **Purpose:** Master index of all Decoded product documentation. Use this to find the canonical source for any Decoded specification.
> **Rule:** If two documents disagree, **DECODED_PRD.md** wins. Always.

---

## Document Registry

| Document | Path | Purpose | Authority Level |
|:---|:---|:---|:---|
| **DECODED_INDEX.md** | `directives/DECODED_INDEX.md` | This file — document map | Navigation |
| **DECODED.md** | `directives/DECODED.md` | Discovery (Phase 0) — market research, competitive analysis, instrument selection, business model | Context |
| **DECODED_PRD.md** | `directives/DECODED_PRD.md` | Product Requirements Document — features, acceptance criteria, functional requirements | **Authoritative (wins all conflicts)** |
| **DECODED_FEATURES.md** | `directives/DECODED_FEATURES.md` | Feature specifications with competitive analysis per feature | Reference |
| **DECODED_REPORT_STRUCTURE.md** | `directives/DECODED_REPORT_STRUCTURE.md` | Section-level design specs, tone guide, gate psychology, competitive teardown | Reference |
| **DECODED_SCHEMA.md** | `directives/DECODED_SCHEMA.md` | Full DDL/RLS specifications for all Decoded database tables | Authoritative (schema) |
| **DECODED_SCORING.md** | `directives/DECODED_SCORING.md` | Scoring keys for all 13 instruments (9 Core + 4 Optional) — items, scales, reverse-scoring, interpretation | Authoritative (scoring) |
| **DECODED_ARCHETYPES.md** | `directives/DECODED_ARCHETYPES.md` | Base archetype definitions (~16 types) and AI sub-label generation logic | Authoritative (archetypes) |
| **SPRINT.md** | `directives/SPRINT.md` | Sprint plan — Sprint 0 (Decoded) + Sprints 1–6 (Coach App) | Authoritative (tasks) |
| **BRAND.md** | `directives/BRAND.md` | Visual identity, typography, color palette, anti-patterns (§14) | Authoritative (design) |

---

## Conflict Resolution

```
DECODED_PRD.md  →  wins over everything
DECODED_SCHEMA.md  →  wins on schema questions
DECODED_SCORING.md  →  wins on scoring questions
DECODED_ARCHETYPES.md  →  wins on archetype questions
SPRINT.md  →  wins on task ordering / timeline
BRAND.md §14  →  wins on visual design
DECODED.md  →  context only; superseded by PRD on all product decisions
DECODED_FEATURES.md  →  reference only; PRD has final acceptance criteria
DECODED_REPORT_STRUCTURE.md  →  reference only; PRD §4.2 has canonical section list
```

---

## Key Cross-References

| Topic | Canonical Source | Also Referenced In |
|:---|:---|:---|
| Report section IDs (RS01–RS12, RD01–RD04) | PRD §4.2 | REPORT_STRUCTURE, SPRINT S0.2 |
| Tier names (Insight/Growth/Mastery) | PRD §4.4 | DECODED §5, FEATURES, SPRINT S0.3 |
| Auth flow (account-first) | PRD §4.1, §6.1 | SPRINT S0.1, SCHEMA |
| Coach message limits | PRD §4.4 | FEATURES, SPRINT S0.3 |
| Archetype system (hybrid) | ARCHETYPES | PRD §4.2, REPORT_STRUCTURE §3 |
| Scoring keys | SCORING | PRD §4.1, SPRINT S0.1 |
| Database schema | SCHEMA | PRD §8, SPRINT S0.1 |
| Instrument licenses | DECODED §12 | PRD §9.1 |
| Visual anti-patterns | BRAND §14 | PRD §1, SPRINT S0.5 |
| Email sequences | DECODED §15 | FEATURES F10, SPRINT S0.6 |
| Abandonment recovery | PRD §4.1 (FR3) | SPRINT S0.6.0 |
| PDF strategy | PRD §4.2 | SPRINT S0.2 |

---

## Document Status

| Document | Status | Last Updated |
|:---|:---|:---|
| DECODED.md | ✅ Discovery Complete | May 19, 2026 |
| DECODED_PRD.md | 🟡 Draft — Gate 1 Pending | May 19, 2026 |
| DECODED_FEATURES.md | ✅ Active | May 19, 2026 |
| DECODED_REPORT_STRUCTURE.md | ✅ Active | May 19, 2026 |
| DECODED_SCHEMA.md | ✅ Created | May 19, 2026 |
| DECODED_SCORING.md | ✅ Created (v1.1) | May 19, 2026 |
| DECODED_ARCHETYPES.md | ✅ Created | May 19, 2026 |
| SPRINT.md | ✅ Active | May 19, 2026 |
| BRAND.md | ✅ Active | — |
