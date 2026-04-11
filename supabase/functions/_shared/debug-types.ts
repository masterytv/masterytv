/**
 * Debug Trace Types — Shared type definitions for the Coach Debugger system.
 *
 * These types define the structured metadata captured during prompt assembly
 * and pipeline execution. Used by both Edge Functions (runtime) and the
 * frontend debug panel (via manual type sync).
 *
 * Architecture: implementation_plan.md — Component 1
 */

// ─── PROMPT ASSEMBLY TRACE ─────────────────────────────────────────────

export interface PromptDebugTrace {
  layers: {
    base_persona: "static";
    challenges: Array<{
      title: string;
      framework: string;
      phase: string;
      progress: string; // e.g., "2/4"
    }>;
    intervention_bias: {
      autonomy: number;
      autonomy_label: "HIGH" | "MODERATE" | "LOW";
      challenge_level: number;
      challenge_label: "HIGH" | "MODERATE" | "LOW";
      trust_level: number;
    };
    user_profile: {
      name: string;
      timezone: string;
      tier: string;
    } | null;
    entities: "stub"; // Layer 5 not yet implemented
    delivery_style: string[]; // Computed style instructions
    memory: {
      semantic_facts: Array<{
        subject: string;
        content: string;
        category: string;
        similarity?: number;
      }>;
      importance_facts: Array<{
        subject: string;
        content: string;
        category: string;
        importance: number;
      }>;
      merged_count: number;
      session_summaries_count: number;
      session_summaries: Array<{
        date: string;
        topics: string[];
        framework: string | null;
        summary_preview: string; // first 100 chars
      }>;
    };
    agenda: {
      priority_topic: string | null;
      questions: string[];
    } | null;
    ai_tools: {
      user_tools: string[];
      catalog_categories: string[];
    };
    guardrails: "static";
    safety: "static";
  };
  system_prompt_chars: number;
  system_prompt_tokens_est: number; // chars / 4
  conversation_history_count: number;
}

// ─── PIPELINE TIMELINE ─────────────────────────────────────────────────

export interface PipelineTimeline {
  crisis_detection_ms: number;
  crisis_result: {
    passed: boolean;
    severity: "high" | "moderate" | "none";
    keywords_matched: string[];
  };
  conversation_resolution_ms: number;
  conversation_id: string;
  is_new_conversation: boolean;
  prompt_assembly_ms: number;
  claude_streaming_ms: number;
  model_used: string;
  is_fallback: boolean;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  tool_calls: Array<{
    name: string;
    query: string;
    result_confidence: string;
    cached: boolean;
    duration_ms: number;
  }>;
  total_ms: number;
}

// ─── POST-PROCESSOR TRACE ──────────────────────────────────────────────

export interface PostProcessTrace {
  facts_extracted: number;
  commitments_extracted: number;
  challenge_detected: boolean;
  challenge_title: string | null;
  sentiment: string | null;
  topics: string[];
  ai_tools_discovered: string[];
  profile_signals: ProfileSignals | null;
  profile_update: ProfileUpdateResult | null;
}

// ─── PROFILE SIGNALS ───────────────────────────────────────────────────

export interface ProfileSignals {
  directness_preference: "direct" | "diplomatic" | null;
  emotional_state: "positive" | "stressed" | "vulnerable" | "neutral";
  engagement_level: "high" | "medium" | "low";
  response_to_challenge: "welcomed" | "deflected" | "resisted" | null;
  preferred_depth: "surface" | "moderate" | "deep";
  action_orientation: "wants_action" | "wants_reflection" | "balanced" | null;
}

export interface ProfileUpdateResult {
  applied: boolean;
  reason: string; // "updated" | "below_threshold" | "no_signals"
  message_count: number;
  deltas: Record<string, { before: number; after: number; delta: number }>;
  confidence_before: number;
  confidence_after: number;
}

// ─── COMBINED DEBUG SUMMARY ────────────────────────────────────────────

/**
 * The complete debug summary sent as an SSE event after response completes.
 * Contains everything the debug panel needs to render its tabs.
 */
export interface DebugSummary {
  prompt_trace: PromptDebugTrace;
  pipeline: PipelineTimeline;
  post_process: PostProcessTrace | null; // null until post-processor completes
  coach_profile: {
    directness: number;
    framing: number;
    warmth: number;
    autonomy: number;
    pacing: number;
    evidence_style: number;
    accountability: number;
    challenge_level: number;
    trust_level: number;
    confidence: number;
    source: string;
  } | null;
}
