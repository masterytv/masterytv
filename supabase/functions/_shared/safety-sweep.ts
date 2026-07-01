/**
 * Tier 2 — Async post-response safety sweep. COACH_SAFETY_AND_TESTING_SPEC §A.2.
 *
 * Runs AFTER the coach reply has streamed (via EdgeRuntime.waitUntil), so it adds
 * ZERO user-facing latency. It reads the recent conversation window + the coach's
 * reply and logs a `crisis_flag` for the cases the Tier 1 keyword hard-stop is
 * deliberately blind to: THIRD-PERSON disclosures ("my husband hinted at ending his
 * life"), indirect ideation, and emotional-abuse-in-context. High-severity self-harm
 * or abuse also emails an internal alert.
 *
 * Domain-agnostic on purpose — safety is a KERNEL concern shared by every coach pack.
 * Runs on Claude Haiku (stronger safety recall than gpt-4o-mini, which has missed
 * cues before). Fully non-fatal: any failure is logged and swallowed.
 */

import { createSupabaseClient } from "./supabase.ts";
import { sendEmail } from "./resend.ts";
import { logError } from "./errors.ts";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const WINDOW = 8; // recent turns to consider
const ESCALATION_TO = "tom@relatti.com";
const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;

interface SweepParams {
  userId: string;
  conversationId: string | null;
  engagementId: string | null;
}

interface Classification {
  risk: "none" | "self_harm" | "abuse" | "acute_distress";
  severity: "none" | "low" | "moderate" | "high";
  subject_scope: "self" | "partner" | "third_party";
  confidence: number;
  coach_handled: boolean;
  rationale: string;
}

type Turn = { role: string; content: string; created_at: string };

export async function runSafetySweep(
  supabase: ReturnType<typeof createSupabaseClient>,
  params: SweepParams,
): Promise<void> {
  const { userId, conversationId, engagementId } = params;
  try {
    if (!conversationId) return;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.warn("[safety-sweep] ANTHROPIC_API_KEY not set — skipping");
      return;
    }

    const { data: rows } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(WINDOW);

    const turns = ((rows ?? []) as Turn[]).slice().reverse();
    if (turns.length === 0) return;

    const transcript = turns
      .map((m) => `${m.role === "coach" ? "COACH" : "USER"}: ${m.content}`)
      .join("\n");

    const c = await classify(apiKey, transcript);
    if (!c) return;

    // Focus the admin queue on genuine safety risk (avoid flag-flooding on ordinary
    // emotional conversations — grief the coach already routes is only logged when high).
    const isSafetyRisk =
      (c.risk === "self_harm" || c.risk === "abuse") &&
      (c.severity === "moderate" || c.severity === "high");
    const isAcuteHigh = c.risk === "acute_distress" && c.severity === "high";
    if ((!isSafetyRisk && !isAcuteHigh) || c.confidence < 0.5) return;

    const dbSeverity: "high" | "moderate" = c.severity === "high" ? "high" : "moderate";
    const lastUser = [...turns].reverse().find((t) => t.role !== "coach");
    const excerpt = (lastUser?.content ?? transcript).slice(0, 200);

    // Dedup — reuse an unreviewed flag for (user, conversation, category) in the window.
    const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const { data: existing } = await supabase
      .from("crisis_flags")
      .select("id, severity")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .eq("category", c.risk)
      .eq("reviewed", false)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    let escalate = c.severity === "high" && (c.risk === "self_harm" || c.risk === "abuse");
    const detail = {
      risk: c.risk,
      severity: c.severity,
      confidence: c.confidence,
      rationale: c.rationale,
    };

    if (existing) {
      // Don't re-email an ongoing conversation that was already high.
      if ((existing as { severity: string }).severity === "high") escalate = false;
      await supabase
        .from("crisis_flags")
        .update({
          severity: dbSeverity,
          subject_scope: c.subject_scope,
          coach_handled: c.coach_handled,
          message_excerpt: excerpt,
          source: "llm_sweep",
          detail: { ...detail, updated: true },
        })
        .eq("id", (existing as { id: string }).id);
    } else {
      await supabase.from("crisis_flags").insert({
        user_id: userId,
        conversation_id: conversationId,
        engagement_id: engagementId,
        severity: dbSeverity,
        category: c.risk,
        subject_scope: c.subject_scope,
        source: "llm_sweep",
        coach_handled: c.coach_handled,
        llm_confirmed: true,
        matched_keywords: [],
        message_excerpt: excerpt,
        reviewed: false,
        detail,
      });
    }

    console.log(
      `[safety-sweep] flag ${c.risk}/${c.severity}/${c.subject_scope} conf=${c.confidence} coach_handled=${c.coach_handled}`,
    );

    if (escalate) {
      await escalateEmail(supabase, userId, { ...c, excerpt });
    }
  } catch (e) {
    console.error("[safety-sweep] error:", (e as Error).message);
    await logError("safety-sweep", e as Error, userId);
  }
}

async function classify(apiKey: string, transcript: string): Promise<Classification | null> {
  const system = `You are a safety classifier for an AI coaching product (often relationship coaching). You read the recent conversation and flag risk the coach must not miss — INCLUDING risk about a THIRD PERSON the user describes (e.g. "my husband hinted at ending his life", "she said she doesn't want to be here").

Return ONLY a JSON object, no prose:
{"risk":"none|self_harm|abuse|acute_distress","severity":"none|low|moderate|high","subject_scope":"self|partner|third_party","confidence":0.0-1.0,"coach_handled":true|false,"rationale":"one short sentence"}

Definitions:
- self_harm: suicidal ideation, self-harm, or intent to die — the USER or a person they describe. severity high = explicit or current intent, a plan, or a clear recent statement; moderate = passive ideation or hints; low = vague hopelessness.
- abuse: intimate-partner abuse, coercive control, or fear for physical safety. high = violence/threats/fear in the present; moderate = a controlling or coercive pattern. Ordinary conflict or yelling WITHOUT fear/control/violence is NOT abuse.
- acute_distress: grief/trauma/distress clearly beyond everyday relationship coaching (e.g. a recent miscarriage, months-long hopelessness) with NO self_harm or abuse. Use high only when serious and sustained.
- subject_scope: who is AT RISK — "self" (the user, INCLUDING when the user is the one being abused, controlled, or afraid), "partner" (the user's romantic partner is the at-risk person, e.g. the partner is the one who is suicidal), or "third_party" (someone else, e.g. a child).
- coach_handled: did the COACH's most recent turn appropriately surface crisis/professional resources (988, a hotline, a counselor/therapist) or clearly stop coaching to route out?
- If nothing rises above ordinary relationship difficulty, return risk "none", severity "none".`;

  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 300,
        system,
        messages: [
          { role: "user", content: `Recent conversation (oldest to newest):\n\n${transcript.slice(0, 6000)}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      console.warn(`[safety-sweep] classifier HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      return null;
    }
    const data = await resp.json();
    const text = ((data.content ?? []) as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return parseClassification(text);
  } catch (e) {
    console.warn("[safety-sweep] classifier call failed:", (e as Error).message);
    return null;
  }
}

function parseClassification(text: string): Classification | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const o = JSON.parse(text.slice(start, end + 1));
    if (!o || typeof o.risk !== "string") return null;
    return {
      risk: o.risk,
      severity: o.severity ?? "none",
      subject_scope: o.subject_scope ?? "self",
      confidence: typeof o.confidence === "number" ? o.confidence : 0.5,
      coach_handled: o.coach_handled === true,
      rationale: String(o.rationale ?? "").slice(0, 300),
    };
  } catch {
    return null;
  }
}

/**
 * Tier-agnostic safety-escalation email. Used by BOTH the async Tier 2 sweep and
 * the synchronous Tier 1 keyword hard-stop (E15.4 — Tier 1 previously never emailed).
 * Fully non-fatal: any failure is logged and swallowed.
 */
export interface SafetyEscalation {
  source: "tier1_keyword" | "llm_sweep";
  risk: "none" | "self_harm" | "abuse" | "acute_distress";
  severity: "none" | "low" | "moderate" | "high";
  subject_scope: "self" | "partner" | "third_party";
  coach_handled: boolean;
  rationale: string;
  excerpt: string;
}

export async function sendSafetyEscalationEmail(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  info: SafetyEscalation,
): Promise<void> {
  try {
    const { data: u } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single();
    const who = (u as { name?: string; email?: string } | null)?.name ||
      (u as { email?: string } | null)?.email || userId;

    const tierLabel = info.source === "tier1_keyword"
      ? "Tier 1 (synchronous keyword hard-stop)"
      : "Tier 2 (async LLM sweep)";
    const subject = `[Relatti safety] ${info.risk} (${info.severity}) — about ${info.subject_scope}`;
    const html = `<h2>Safety flag — review</h2>
<p><strong>Detected by:</strong> ${tierLabel}</p>
<p><strong>Risk:</strong> ${info.risk} &middot; <strong>Severity:</strong> ${info.severity} &middot; <strong>About:</strong> ${info.subject_scope}</p>
<p><strong>Coach surfaced resources:</strong> ${info.coach_handled ? "yes" : "NO — check the reply"}</p>
<p><strong>User:</strong> ${who} (${userId})</p>
<p><strong>Why:</strong> ${info.rationale}</p>
<p><strong>Excerpt:</strong> ${info.excerpt}</p>
<hr>
<p style="color:#666">Internal audit alert only. The user was routed to crisis resources in-product; there is no promised human follow-up. Review in the admin crisis queue (/admin/crisis).</p>`;

    await sendEmail({ to: ESCALATION_TO, subject, html });
    console.log("[safety-escalation] emailed to", ESCALATION_TO, "source:", info.source);
  } catch (e) {
    console.error("[safety-escalation] email failed:", (e as Error).message);
  }
}

// Tier 2 adapter — kept so the sweep call site reads unchanged.
async function escalateEmail(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  info: Classification & { excerpt: string },
): Promise<void> {
  await sendSafetyEscalationEmail(supabase, userId, {
    source: "llm_sweep",
    risk: info.risk,
    severity: info.severity,
    subject_scope: info.subject_scope,
    coach_handled: info.coach_handled,
    rationale: info.rationale,
    excerpt: info.excerpt,
  });
}
