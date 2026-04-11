"use client";

/**
 * Debug Tab Components — Individual tab content for the Coach Debugger.
 *
 * Each tab displays a different aspect of the coaching pipeline:
 * - BrainStateTab: Layer-by-layer prompt breakdown
 * - CoachProfileTab: Real-time dimension visualization
 * - MemoryTab: Retrieved facts and extracted knowledge
 * - PipelineTab: Timing waterfall + cost breakdown
 */

import { useState } from "react";
import type { DebugSummary } from "@/lib/chat";

// ─── COLLAPSIBLE SECTION ────────────────────────────────────────────────

function Section({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="debug-section">
      <div className="debug-section__header" onClick={() => setOpen(!open)}>
        <span className="debug-section__icon">{icon}</span>
        <span className="debug-section__title">{title}</span>
        <span className={`debug-section__chevron ${open ? "debug-section__chevron--open" : ""}`}>
          ▸
        </span>
      </div>
      {open && <div className="debug-section__body">{children}</div>}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="debug-kv">
      <span className="debug-kv__key">{label}</span>
      <span className="debug-kv__value">{value ?? "—"}</span>
    </div>
  );
}

function Badge({
  label,
  color = "gray",
}: {
  label: string;
  color?: "green" | "blue" | "amber" | "red" | "gray";
}) {
  return <span className={`debug-badge debug-badge--${color}`}>{label}</span>;
}

// ─── BRAIN STATE TAB ────────────────────────────────────────────────────

export function BrainStateTab({ data }: { data: DebugSummary }) {
  const layers = data.prompt_trace as Record<string, unknown>;
  const l = layers.layers as Record<string, unknown>;

  const challenges = (l?.challenges ?? []) as Array<{
    title: string;
    framework: string;
    phase: string;
    progress: string;
  }>;

  const intervention = l?.intervention_bias as {
    autonomy: number;
    autonomy_label: string;
    challenge_level: number;
    challenge_label: string;
    trust_level: number;
  } | null;

  const userProfile = l?.user_profile as {
    name: string;
    timezone: string;
    tier: string;
  } | null;

  const deliveryStyle = (l?.delivery_style ?? []) as string[];

  const agenda = l?.agenda as {
    priority_topic: string | null;
    questions: string[];
  } | null;

  const aiTools = l?.ai_tools as {
    user_tools: string[];
    catalog_categories: string[];
  } | null;

  return (
    <div>
      {/* Layer 1: Base Persona */}
      <Section icon="🎭" title="Layer 1: Base Persona" defaultOpen={false}>
        <Badge label="Static ✓" color="green" />
      </Section>

      {/* Layer 2: Active Challenges */}
      <Section icon="🎯" title={`Layer 2: Challenges (${challenges.length})`}>
        {challenges.length === 0 ? (
          <span className="debug-kv__value">No active challenges</span>
        ) : (
          challenges.map((c, i) => (
            <div key={i} className="debug-challenge">
              <div className="debug-challenge__title">{c.title}</div>
              <div className="debug-challenge__meta">
                <Badge label={c.framework} color="blue" />
                <Badge label={c.phase} color="amber" />
                <Badge label={c.progress} color="gray" />
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Layer 3: Intervention Bias */}
      <Section icon="⚖️" title="Layer 3: Intervention Bias">
        {intervention ? (
          <>
            <KV label="Autonomy" value={`${intervention.autonomy} (${intervention.autonomy_label})`} />
            <KV label="Challenge" value={`${intervention.challenge_level} (${intervention.challenge_label})`} />
            <KV label="Trust Level" value={`${intervention.trust_level}/5`} />
          </>
        ) : (
          <Badge label="Default values" color="gray" />
        )}
      </Section>

      {/* Layer 4: User Profile */}
      <Section icon="👤" title="Layer 4: User Profile">
        {userProfile ? (
          <>
            <KV label="Name" value={userProfile.name} />
            <KV label="Timezone" value={userProfile.timezone} />
            <KV label="Tier" value={userProfile.tier} />
          </>
        ) : (
          <Badge label="No profile loaded" color="red" />
        )}
      </Section>

      {/* Layer 5: Entities */}
      <Section icon="🔗" title="Layer 5: Entities" defaultOpen={false}>
        <Badge label="Stub — not yet implemented" color="gray" />
      </Section>

      {/* Layer 6: Delivery Style */}
      <Section icon="🗣️" title={`Layer 6: Delivery Style (${deliveryStyle.length})`}>
        {deliveryStyle.map((instruction, i) => (
          <div key={i} className="debug-kv__value" style={{ marginBottom: 4 }}>
            • {instruction}
          </div>
        ))}
      </Section>

      {/* Layer 8: Coaching Agenda */}
      <Section icon="📋" title="Layer 8: Coaching Agenda" defaultOpen={false}>
        {agenda?.priority_topic ? (
          <>
            <KV label="Priority" value={agenda.priority_topic} />
            {agenda.questions.map((q, i) => (
              <div key={i} className="debug-kv__value" style={{ marginBottom: 2 }}>
                • {q}
              </div>
            ))}
          </>
        ) : (
          <Badge label="No agenda set" color="gray" />
        )}
      </Section>

      {/* Layer 9: AI Tools */}
      <Section icon="🤖" title="Layer 9: AI Tools" defaultOpen={false}>
        {aiTools ? (
          <>
            <KV label="User Tools" value={aiTools.user_tools.join(", ") || "None"} />
            <KV label="Catalog" value={`${aiTools.catalog_categories.length} categories`} />
          </>
        ) : (
          <Badge label="No tools context" color="gray" />
        )}
      </Section>

      {/* Layers 10-11: Guardrails */}
      <Section icon="🛡️" title="Layers 10-11: Guardrails" defaultOpen={false}>
        <Badge label="Static ✓" color="green" />
      </Section>

      {/* Token Estimate */}
      <Section icon="📊" title="Prompt Stats" defaultOpen={false}>
        <KV label="System Chars" value={(layers.system_prompt_chars as number)?.toLocaleString()} />
        <KV label="Est. Tokens" value={`~${(layers.system_prompt_tokens_est as number)?.toLocaleString()}`} />
        <KV label="History Msgs" value={layers.conversation_history_count as number} />
      </Section>
    </div>
  );
}

// ─── COACH PROFILE TAB ──────────────────────────────────────────────────

const PROFILE_DIMENSIONS = [
  { key: "directness", label: "Directness", low: "Diplomatic", high: "Blunt" },
  { key: "framing", label: "Framing", low: "Risk/Prevention", high: "Opportunity" },
  { key: "warmth", label: "Warmth", low: "Challenge-First", high: "Relationship" },
  { key: "autonomy", label: "Autonomy", low: "Prescriptive", high: "Socratic" },
  { key: "pacing", label: "Pacing", low: "Spacious", high: "High-Frequency" },
  { key: "evidence_style", label: "Evidence", low: "Data/Logic", high: "Stories" },
  { key: "accountability", label: "Accountability", low: "Internal Trust", high: "External Push" },
  { key: "challenge_level", label: "Challenge", low: "Comfort Zone", high: "Stretch Zone" },
];

export function CoachProfileTab({ data }: { data: DebugSummary }) {
  const profile = data.coach_profile as Record<string, number | string> | null;

  if (!profile) {
    return (
      <div className="debug-empty">
        <span className="debug-empty__icon">🎭</span>
        <span className="debug-empty__text">No coach profile loaded</span>
      </div>
    );
  }

  return (
    <div>
      <Section icon="📊" title="Dimensions">
        {PROFILE_DIMENSIONS.map((dim) => {
          const value = Number(profile[dim.key] ?? 0.5);
          // Profile values are 0.0-1.0 for most, but some are 0-10 scale
          const normalized = value > 1 ? value / 10 : value;
          const pct = Math.round(normalized * 100);

          return (
            <div key={dim.key} className="debug-slider">
              <div className="debug-slider__header">
                <span className="debug-slider__label">{dim.label}</span>
                <span className="debug-slider__value">{value.toFixed(2)}</span>
              </div>
              <div className="debug-slider__track">
                <div className="debug-slider__fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="debug-slider__endpoints">
                <span className="debug-slider__endpoint">{dim.low}</span>
                <span className="debug-slider__endpoint">{dim.high}</span>
              </div>
            </div>
          );
        })}
      </Section>

      <Section icon="🔒" title="Meta" defaultOpen={false}>
        <KV label="Trust Level" value={`${profile.trust_level}/5`} />
        <KV label="Confidence" value={Number(profile.confidence ?? 0).toFixed(2)} />
        <KV label="Source" value={String(profile.source ?? "default")} />
      </Section>
    </div>
  );
}

// ─── MEMORY TAB ─────────────────────────────────────────────────────────

export function MemoryTab({ data }: { data: DebugSummary }) {
  const layers = data.prompt_trace as Record<string, unknown>;
  const l = layers.layers as Record<string, unknown>;

  const memory = l?.memory as {
    semantic_facts: Array<{ subject: string; content: string; category: string; similarity?: number }>;
    importance_facts: Array<{ subject: string; content: string; category: string; importance: number }>;
    merged_count: number;
    session_summaries_count: number;
    session_summaries: Array<{
      date: string;
      topics: string[];
      framework: string | null;
      summary_preview: string;
    }>;
  } | null;

  if (!memory) {
    return (
      <div className="debug-empty">
        <span className="debug-empty__icon">🔍</span>
        <span className="debug-empty__text">No memory data available</span>
      </div>
    );
  }

  return (
    <div>
      <Section icon="🧲" title={`Semantic Matches (${memory.semantic_facts.length})`}>
        {memory.semantic_facts.length === 0 ? (
          <span className="debug-kv__value">No semantic matches found</span>
        ) : (
          memory.semantic_facts.map((f, i) => (
            <div key={i} className="debug-fact">
              <div className="debug-fact__header">
                <span className="debug-fact__subject">{f.subject}</span>
                <Badge label={f.category} color="blue" />
                {f.similarity !== undefined && (
                  <span className="debug-fact__score">{(f.similarity * 100).toFixed(0)}%</span>
                )}
              </div>
              <div className="debug-fact__content">{f.content}</div>
            </div>
          ))
        )}
      </Section>

      <Section icon="⭐" title={`Top Importance (${memory.importance_facts.length})`} defaultOpen={false}>
        {memory.importance_facts.map((f, i) => (
          <div key={i} className="debug-fact">
            <div className="debug-fact__header">
              <span className="debug-fact__subject">{f.subject}</span>
              <Badge label={f.category} color="blue" />
              <span className="debug-fact__score">imp: {f.importance.toFixed(2)}</span>
            </div>
            <div className="debug-fact__content">{f.content}</div>
          </div>
        ))}
      </Section>

      <Section icon="📝" title={`Session Summaries (${memory.session_summaries_count})`} defaultOpen={false}>
        {memory.session_summaries.map((s, i) => (
          <div key={i} className="debug-challenge" style={{ marginBottom: 6 }}>
            <div className="debug-challenge__title">{s.date}</div>
            <div className="debug-challenge__meta" style={{ marginBottom: 4 }}>
              {s.topics.map((t, j) => (
                <Badge key={j} label={t} color="gray" />
              ))}
              {s.framework && <Badge label={s.framework} color="blue" />}
            </div>
            <div className="debug-fact__content">{s.summary_preview}…</div>
          </div>
        ))}
      </Section>

      <Section icon="📊" title="Summary" defaultOpen={false}>
        <KV label="Merged Facts" value={memory.merged_count} />
        <KV label="Summaries Sent" value={memory.session_summaries_count} />
      </Section>
    </div>
  );
}

// ─── PIPELINE TAB ───────────────────────────────────────────────────────

export function PipelineTab({ data }: { data: DebugSummary }) {
  const pipeline = data.pipeline as Record<string, unknown>;

  if (!pipeline?.total_ms) {
    return (
      <div className="debug-empty">
        <span className="debug-empty__icon">⚡</span>
        <span className="debug-empty__text">No pipeline data available</span>
      </div>
    );
  }

  const totalMs = pipeline.total_ms as number;
  const crisisMs = pipeline.crisis_detection_ms as number;
  const promptMs = pipeline.prompt_assembly_ms as number;
  const claudeMs = pipeline.claude_streaming_ms as number;
  const toolCalls = (pipeline.tool_calls ?? []) as Array<{
    name: string;
    query: string;
    result_confidence: string;
    cached: boolean;
    duration_ms: number;
  }>;

  const crisisResult = pipeline.crisis_result as {
    passed: boolean;
    severity: string;
    keywords_matched: string[];
  } | null;

  const barWidth = (ms: number) => `${Math.max(2, (ms / totalMs) * 100)}%`;

  return (
    <div>
      <Section icon="⏱️" title={`Request Timeline (${(totalMs / 1000).toFixed(1)}s)`}>
        <div className="debug-waterfall">
          <div className="debug-waterfall__row">
            <span className="debug-waterfall__label">Crisis Check</span>
            <div className="debug-waterfall__bar-bg">
              <div
                className="debug-waterfall__bar debug-waterfall__bar--crisis"
                style={{ width: barWidth(crisisMs) }}
              />
            </div>
            <span className="debug-waterfall__time">{crisisMs}ms</span>
          </div>
          <div className="debug-waterfall__row">
            <span className="debug-waterfall__label">Prompt Assembly</span>
            <div className="debug-waterfall__bar-bg">
              <div
                className="debug-waterfall__bar debug-waterfall__bar--prompt"
                style={{ width: barWidth(promptMs) }}
              />
            </div>
            <span className="debug-waterfall__time">{promptMs}ms</span>
          </div>
          <div className="debug-waterfall__row">
            <span className="debug-waterfall__label">Claude Stream</span>
            <div className="debug-waterfall__bar-bg">
              <div
                className="debug-waterfall__bar debug-waterfall__bar--claude"
                style={{ width: barWidth(claudeMs) }}
              />
            </div>
            <span className="debug-waterfall__time">{claudeMs}ms</span>
          </div>
          {toolCalls.map((tc, i) => (
            <div key={i} className="debug-waterfall__row">
              <span className="debug-waterfall__label" style={{ paddingLeft: 12 }}>
                ↳ {tc.name}
              </span>
              <div className="debug-waterfall__bar-bg">
                <div
                  className="debug-waterfall__bar debug-waterfall__bar--tool"
                  style={{ width: barWidth(tc.duration_ms) }}
                />
              </div>
              <span className="debug-waterfall__time">{tc.duration_ms}ms</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon="🛡️" title="Crisis Detection">
        {crisisResult ? (
          <>
            <KV
              label="Result"
              value={crisisResult.passed ? "✅ Passed" : "🚨 CRISIS DETECTED"}
            />
            <KV label="Severity" value={crisisResult.severity} />
          </>
        ) : (
          <Badge label="No data" color="gray" />
        )}
      </Section>

      <Section icon="🧠" title="Model & Cost">
        <KV label="Model" value={pipeline.model_used as string} />
        <KV label="Fallback" value={(pipeline.is_fallback as boolean) ? "Yes (GPT-4o)" : "No"} />
        <KV label="Tokens In" value={(pipeline.tokens_in as number)?.toLocaleString()} />
        <KV label="Tokens Out" value={(pipeline.tokens_out as number)?.toLocaleString()} />
        <KV label="Cost" value={`$${(pipeline.cost_usd as number)?.toFixed(5)}`} />
        <KV label="Conversation" value={(pipeline.conversation_id as string)?.slice(0, 8)} />
        <KV label="New Convo?" value={(pipeline.is_new_conversation as boolean) ? "Yes" : "No"} />
      </Section>

      {toolCalls.length > 0 && (
        <Section icon="🔧" title={`Tool Calls (${toolCalls.length})`}>
          {toolCalls.map((tc, i) => (
            <div key={i} className="debug-challenge" style={{ marginBottom: 6 }}>
              <div className="debug-challenge__title">{tc.name}</div>
              <KV label="Query" value={tc.query} />
              <KV label="Confidence" value={tc.result_confidence} />
              <KV label="Cached" value={tc.cached ? "Yes" : "No"} />
              <KV label="Duration" value={`${tc.duration_ms}ms`} />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
