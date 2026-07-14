/**
 * Coach Pack contract (PC4.2 — COACH_ARCHITECTURE_AUDIT Phase 1).
 *
 * A Coach Pack is everything that makes a coaching vertical ITSELF: its
 * persona, its guardrails, which prompt layers render, which tools the model
 * may call, how conversation history is scoped, and its model parameters.
 * The orchestrator (prompt-assembler / coach) is vertical-blind: it loads
 * data, hands the pack a context, and composes whatever the pack returns.
 *
 * Adding a vertical = adding a pack file + a resolvePack() entry. Editing the
 * orchestrator for a vertical-specific behavior is a design smell — put it in
 * the pack.
 */

import type { AnthropicTool } from "../anthropic.ts";
import type {
  ActiveChallenge,
  AIToolRecord,
  CoachingAgenda,
  CoachProfile,
  ConversationSummary,
  MemoryFact,
  Message,
  UserAITool,
  UserProfile,
} from "../prompt-layers.ts";

/**
 * Everything a pack may draw on when composing its layer stack. The assembler
 * populates ALL fields for every pack (the loads run in parallel and the
 * cross-vertical ones are cheap); the pack decides what actually renders.
 */
export interface PackPromptContext {
  mode: string | null;
  user: UserProfile | null;
  profile: CoachProfile | null;
  challenges: ActiveChallenge[];
  messages: Message[];
  facts: MemoryFact[];
  sessionSummaries: ConversationSummary[];
  agenda: CoachingAgenda | null;
  userTools: UserAITool[];
  availableAITools: AIToolRecord[];
  /** Layer 4.5 — Decoded profile, pre-rendered by the assembler (share-level gated). */
  decodedLayer: string;
  /** Layer 4.6 — shared relationship profiles / dyad layer, pre-rendered. */
  relationshipLayer: string;
  /** Layer 1.5 — dyad mediator persona, pre-rendered ("" unless dyad). */
  mediatorPersona: string;
}

/**
 * PC4.3 — pack-owned post-processing. The extractor's memory taxonomy is a
 * vertical decision: executive memory is business-shaped (org facts, tools),
 * relationship memory is texture-shaped (themes, interaction patterns,
 * attachment cues). The post-processor composes its extraction prompt and
 * gates its side effects from THIS config — no domain ternaries there.
 *
 * NOTE: fact categories must stay within the memory_facts_category_check DB
 * constraint (migration 20260714220000 lists the allowed set).
 */
export interface PackExtraction {
  /** Enum string for the extractor's fact `category` JSON field. */
  factCategories: string;
  /** The fact-extraction rule bullet(s), domain-shaped. Verbatim prompt text. */
  factsRule: string;
  /** The ai_tools_mentioned rule bullet (or an always-empty instruction). */
  aiToolsRule: string;
  /** Persist tool/platform mentions to users.ai_tools (executive behavior). */
  extractAiTools: boolean;
  /** May a detected challenge spawn a framework-assigned coaching challenge? */
  frameworkChallenges: boolean;
}

export interface CoachPack {
  key: "executive" | "relationship";

  /** PC4.3 — post-processing extraction schema + memory taxonomy. */
  extraction: PackExtraction;

  /**
   * How the last-20 recent messages are scoped.
   * - "engagement": engagement thread (or the null-engagement thread) — cross-
   *   session continuity in-prompt. Executive behavior.
   * - "conversation": current conversation only, so "New conversation" truly
   *   starts fresh (E14); continuity flows through memory facts + summaries.
   */
  recentMessageScope: "engagement" | "conversation";

  /** Tools the model may call for this vertical. */
  tools: AnthropicTool[];

  /**
   * Whether tool-loop continuation calls must stay on Claude (no fallback
   * provider mid-conversation). The FIRST call always forces Claude for every
   * pack; this governs the continuations after tool use.
   */
  forceClaudeOnToolContinuation: boolean;

  /**
   * The ordered layer stack. Return "" for a slot that shouldn't render — the
   * assembler filters empties and joins with the standard separator. Order and
   * content are golden-locked (PC4.1): one byte of drift fails the gate.
   */
  buildLayers(ctx: PackPromptContext): string[];
}
