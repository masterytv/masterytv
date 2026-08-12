/**
 * Post-Processor — Extracts facts, commitments, and challenges from conversations.
 *
 * Extracted from coach/index.ts for cross-channel use (S4.5).
 * Uses GPT-4o-mini for cost efficiency. Runs async, never blocks response delivery.
 *
 * Architecture: SPRINT.md S2.5
 */

import { createSupabaseClient } from "./supabase.ts";
import { generateEmbeddings, logEmbeddingCost } from "./embeddings.ts";
import { logError } from "./errors.ts";
import { updateCoachProfile } from "./profile-updater.ts";
import type { ProfileSignals } from "./debug-types.ts";
import { resolvePack, programScope } from "./packs/index.ts";
import type { PackExtraction } from "./packs/types.ts";
import { filterMemoryWrites } from "./memory-filter.ts";

// ─── FRAMEWORK ASSIGNMENT ──────────────────────────────────────────────

/**
 * Category-to-framework mapping for initial assignment.
 * Maps challenge categories to the most appropriate framework.
 */
const CATEGORY_FRAMEWORK_MAP: Record<string, string> = {
  business_growth: "GROW",
  leadership: "Situational Leadership",
  productivity: "Robbins RPM",
  career: "GROW",
  personal_development: "OSKAR",
  relationships: "Motivational Interviewing",
  health: "GROW",
  financial: "EOS/Traction",
};

/**
 * Assigns a coaching framework to a new challenge based on:
 * 1. User's trust level (determines which tiers are available)
 * 2. Challenge category → default framework mapping
 * 3. User's framework affinity (preferred frameworks from past usage)
 */
export async function assignFramework(
  supabase: ReturnType<typeof createSupabaseClient>,
  challengeCategory: string,
  trustLevel: number,
  frameworkAffinity: unknown
): Promise<{ name: string; firstPhase: string }> {
  const maxTier = trustLevel <= 2 ? 1 : trustLevel <= 3 ? 2 : 3;
  const suggestedName =
    CATEGORY_FRAMEWORK_MAP[challengeCategory] || "GROW";

  const { data: suggested } = await supabase
    .from("framework_config")
    .select("name, tier, phases, is_active")
    .eq("name", suggestedName)
    .eq("is_active", true)
    .single();

  if (suggested && suggested.tier <= maxTier) {
    return {
      name: suggested.name,
      firstPhase: suggested.phases?.[0] ?? "Start",
    };
  }

  // Check framework affinity
  if (frameworkAffinity && typeof frameworkAffinity === "object") {
    const affinityMap = frameworkAffinity as Record<string, number>;
    const sortedAffinity = Object.entries(affinityMap).sort(
      ([, a], [, b]) => b - a
    );

    for (const [name] of sortedAffinity) {
      const { data: fw } = await supabase
        .from("framework_config")
        .select("name, tier, phases, is_active")
        .eq("name", name)
        .eq("is_active", true)
        .single();

      if (fw && fw.tier <= maxTier) {
        return { name: fw.name, firstPhase: fw.phases?.[0] ?? "Start" };
      }
    }
  }

  // Safe default: GROW (Tier 1, always available)
  const { data: grow } = await supabase
    .from("framework_config")
    .select("name, phases")
    .eq("name", "GROW")
    .single();

  return {
    name: "GROW",
    firstPhase: grow?.phases?.[0] ?? "Goal",
  };
}

// ─── COMMITMENT SUPERSEDE (PC6.1) ──────────────────────────────────────

/**
 * The extractor — not a post-hoc dedup job — decides supersession, because
 * "the plan evolved" is a semantic judgment. It sees the conversation's
 * existing ACTIVE commitments and returns `supersedes: <id>` when the user's
 * new statement revises one. A code-level embedding backstop catches misses:
 * same conversation + <30 min apart + similarity > threshold → auto-supersede
 * the older row. Superseded rows keep their audit trail (superseded_by) and
 * drop out of every status='active' reader (crons, dashboard) automatically.
 */
export const SUPERSEDE_SIMILARITY = 0.86;
export const SUPERSEDE_WINDOW_MS = 30 * 60 * 1000;

export interface ActiveCommitmentRef {
  id: string;
  description: string;
  due_date: string | null;
  created_at: string;
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface ExtractionPromptOpts {
  userMessage: string;
  coachResponse: string;
  todayLocal: string; // YYYY-MM-DD in the user's timezone
  weekdayLocal: string; // e.g. "Monday"
  tz: string;
  existingCommitments: ActiveCommitmentRef[];
  /** PC4.3 — the pack's extraction schema + memory taxonomy. */
  extraction: PackExtraction;
}

/**
 * Builds the FULL extraction prompt (including profile signals). Exported so
 * the coach-lab replay harness runs the byte-identical prompt the production
 * post-processor runs — replay fidelity is the PC6.1 acceptance test.
 */
export function buildExtractionPrompt(opts: ExtractionPromptOpts): string {
  const { userMessage, coachResponse, todayLocal, weekdayLocal, tz, existingCommitments, extraction } = opts;

  const existingBlock = existingCommitments.length > 0
    ? `\nEXISTING ACTIVE COMMITMENTS in this conversation (id · description · due):
${existingCommitments
  .map((c) => `- ${c.id} · ${c.description} · ${c.due_date ?? "no due date"}`)
  .join("\n")}\n`
    : "";

  const extractionPrompt = `Analyze this coaching conversation exchange and extract structured data.

TODAY is ${weekdayLocal}, ${todayLocal} in the user's local timezone (${tz}). Use this to resolve relative dates.
${existingBlock}
USER MESSAGE: ${userMessage}

COACH RESPONSE: ${coachResponse}

Extract the following as JSON:
{
  "facts": [
    { "category": "${extraction.factCategories}", "subject": "brief label", "content": "the fact", "importance": 0.1-1.0 }
  ],
  "commitments": [
    { "type": "goal|action_item|habit", "description": "what the user committed to", "due_date": "YYYY-MM-DD or null", "context_note": "1-sentence context: why they made this commitment or what challenge it addresses", "supersedes": "id of an EXISTING ACTIVE COMMITMENT this replaces, or null" }
  ],
  "challenge_detected": {
    "is_new": true/false,
    "title": "brief label for the challenge or goal",
    "description": "one-sentence description",
    "category": "business_growth|leadership|productivity|career|personal_development|relationships|health|financial"
  },
  "ai_tools_mentioned": [
    { "name": "exact tool name (e.g., Claude, ChatGPT, Cursor)", "proficiency": "beginner|intermediate|advanced", "categories": ["writing", "coding", etc.] }
  ],
  "sentiment": "positive|neutral|negative|mixed",
  "topics": ["topic1", "topic2"]
}

Rules:
${extraction.factsRule}
- Only extract commitments the USER explicitly agreed to or stated they would do.
- supersedes: when the user's new statement REVISES, REPLACES, or REFINES one of the EXISTING ACTIVE COMMITMENTS above (the plan evolved — a new deadline, a changed approach, a more specific version of the same intent), return that commitment's id in "supersedes" instead of leaving a parallel duplicate. If the new commitment is genuinely separate work, supersedes is null. Never return more than one commitment for the same underlying intent in a single response.
- due_date: when the USER named a time, resolve it to a concrete date using TODAY above — "tonight"/"today" → today's date; "tomorrow" → the next day; "this weekend" → the upcoming Saturday; "by Friday"/"next week" → that concrete date. If the user named NO time, leave due_date null. NEVER invent a deadline the user didn't state.
- Don't extract coaching questions or the coach's observations as facts.
- Importance: 0.1-0.3 = minor detail, 0.4-0.6 = useful context, 0.7-0.9 = core to coaching, 1.0 = critical.
- challenge_detected.is_new: set to true ONLY if the user described a new challenge, problem, or goal that isn't just a follow-up to an existing conversation thread.
${extraction.aiToolsRule}
- If nothing to extract, return empty arrays and is_new: false.

Also analyze the USER's behavioral signals for coaching style adaptation:
  "profile_signals": {
    "directness_preference": "direct" | "diplomatic" | null,
    "emotional_state": "positive" | "stressed" | "vulnerable" | "neutral",
    "engagement_level": "high" | "medium" | "low",
    "response_to_challenge": "welcomed" | "deflected" | "resisted" | null,
    "preferred_depth": "surface" | "moderate" | "deep",
    "action_orientation": "wants_action" | "wants_reflection" | "balanced" | null
  }

Profile signals rules:
- directness_preference: "direct" if user writes concisely and asks for specifics. "diplomatic" if user hedges, adds qualifiers, or seems to avoid direct answers. null if unclear.
- emotional_state: based on the user's tone and language.
- engagement_level: "high" = long messages, follow-up questions, active engagement. "low" = short/dismissive responses. "medium" = normal.
- response_to_challenge: how the user responds when the coach pushes them. "welcomed" = leans in. "resisted" = pushes back or shuts down. "deflected" = changes subject. null if no challenge was presented.
- preferred_depth: "deep" = user explores underlying causes, values, emotions. "surface" = user stays practical and tactical. "moderate" = balanced.
- action_orientation: "wants_action" = user asks for specific steps, deadlines, tools. "wants_reflection" = user wants to explore and think. "balanced" or null if unclear.

Return ONLY valid JSON, no other text.`;

  return extractionPrompt;
}

// ─── POST-PROCESSING ───────────────────────────────────────────────────

/**
 * Extracts facts and commitments from the conversation exchange.
 * Uses GPT-4o-mini for cost efficiency (async, not blocking response).
 */
export async function postProcess(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  conversationId: string,
  userMessage: string,
  coachResponse: string,
  coachMessageId: string,
  // PC3.4: resolved program ("relationship" | "general" | null). Callers that
  // have no program context (channel-router) omit it → executive behavior.
  program: string | null = null
): Promise<void> {
  // PC4.3: the pack owns the extraction schema, memory taxonomy, and the
  // side-effect gates (framework challenges, AI-tool harvesting).
  const pack = resolvePack(program);
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.warn(
        "[post-process] OPENAI_API_KEY not set, skipping extraction"
      );
      return;
    }

    // PC3.9: give the extractor a clock. Without today's date the model cannot
    // resolve "tonight" / "by Friday", so every commitment landed with
    // due_date=null — and the accountability cron only follows up on
    // commitments WITH a due date. The coach's "I'll follow up" was unfunded.
    const { data: tzRow } = await supabase
      .from("users")
      .select("timezone")
      .eq("id", userId)
      .single();
    const tz = tzRow?.timezone || "UTC";
    const now = new Date();
    const todayLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now); // YYYY-MM-DD
    const weekdayLocal = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "long",
    }).format(now);

    // ── PC6.1: the extractor sees this conversation's existing ACTIVE
    // commitments so it can judge "the plan evolved" and supersede instead of
    // duplicating. Scoped to the conversation via source_message_id → messages.
    let existingCommitments: ActiveCommitmentRef[] = [];
    try {
      const { data: existingRows } = await supabase
        .from("commitments")
        .select(
          "id, description, due_date, created_at, messages!commitments_source_message_id_fkey!inner(conversation_id)"
        )
        .eq("user_id", userId)
        // Program-scoped as of 2026-07-20 (the conversation join already
        // implies it; explicit for the tenancy gate + belt-and-suspenders).
        .eq("program", programScope(program))
        .eq("status", "active")
        .eq("messages.conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(15);
      existingCommitments = ((existingRows ?? []) as unknown as ActiveCommitmentRef[]).map(
        (c) => ({ id: c.id, description: c.description, due_date: c.due_date, created_at: c.created_at })
      );
    } catch (e) {
      console.warn("[post-process] Failed to load existing commitments:", (e as Error).message);
    }

    const fullPrompt = buildExtractionPrompt({
      userMessage,
      coachResponse,
      todayLocal,
      weekdayLocal,
      tz,
      existingCommitments,
      extraction: pack.extraction,
    });

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: fullPrompt }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      console.error("[post-process] OpenAI error:", await response.text());
      return;
    }

    const data = await response.json();
    const extracted = JSON.parse(data.choices[0].message.content);

    // I3.1 — THE MEMORY-WRITE FILTER, before anything is embedded or stored.
    //
    // Runs here rather than in the prompt because the prompt is a request and
    // this is a guarantee. §3/I3.4 is explicit that the primary model's
    // restraint is not a control, and memory is the one surface where a single
    // bad write compounds: a fact stored today is read back into the prompt for
    // months, and the model treats its own stored facts as settled background.
    //
    // Ordering matters twice over. It runs BEFORE the embedding call so the
    // `factEmbeddings[i]` mapping below stays aligned with the surviving facts
    // (filtering afterwards would silently pair each fact with its neighbour's
    // vector), and it runs before the insert so a dropped fact costs an OpenAI
    // call rather than a row.
    //
    // Integration only. The shipped verticals' extraction is untouched.
    if (programScope(program) === "integration" && extracted.facts?.length > 0) {
      const filtered = filterMemoryWrites(extracted.facts, {
        userMessage,
        coachResponse,
      });
      if (filtered.dropped.length > 0) {
        // Logged as counts by reason, never content — an internal log carrying
        // somebody's account of their experience is the same disclosure the
        // 92d221d rule bans from internal email (I11.9).
        const byReason = filtered.dropped.reduce<Record<string, number>>((acc, d) => {
          acc[d.reason] = (acc[d.reason] ?? 0) + 1;
          return acc;
        }, {});
        console.log(
          `[post-process] memory filter dropped ${filtered.dropped.length} fact(s):`,
          JSON.stringify(byReason),
        );
      }
      extracted.facts = filtered.kept;
    }

    // Store facts + generate embeddings
    if (extracted.facts?.length > 0) {
      const factTexts = extracted.facts.map(
        (f: { subject: string; content: string }) =>
          `${f.subject}: ${f.content}`
      );

      let factEmbeddings: number[][] = [];
      try {
        factEmbeddings = await generateEmbeddings(factTexts);
        await logEmbeddingCost(userId, "embed-facts", factTexts, program);
      } catch (e) {
        console.warn(
          "[post-process] Failed to embed facts:",
          (e as Error).message
        );
      }

      // Clamp categories to the pack's declared set — one rogue category would
      // fail the memory_facts_category_check and kill the whole batch insert.
      const allowedCategories = new Set(pack.extraction.factCategories.split("|"));

      const factsToInsert = extracted.facts.map(
        (
          f: {
            category: string;
            subject: string;
            content: string;
            importance: number;
          },
          i: number
        ) => ({
          user_id: userId,
          category: allowedCategories.has(f.category) ? f.category : "personal",
          subject: f.subject,
          content: f.content,
          importance: f.importance,
          source_message_id: coachMessageId,
          is_confirmed: false,
          program: programScope(program), // PC2.2: a fact belongs to the vertical it was learned in
          embedding: factEmbeddings[i]
            ? JSON.stringify(factEmbeddings[i])
            : null,
        })
      );
      await supabase.from("memory_facts").insert(factsToInsert);
    }

    // Store commitments (PC6.1: per-row so a supersede can point at the new id)
    if (extracted.commitments?.length > 0) {
      const validSupersedeIds = new Set(existingCommitments.map((c) => c.id));
      const superseded = new Set<string>();
      const insertedNew: { id: string; description: string }[] = [];

      for (const c of extracted.commitments as Array<{
        type: string;
        description: string;
        due_date: string | null;
        context_note?: string | null;
        supersedes?: string | null;
      }>) {
        const { data: newRow, error: insertErr } = await supabase
          .from("commitments")
          .insert({
            user_id: userId,
            // A commitment belongs to the vertical it was made in (2026-07-20 —
            // the money dashboard was listing executive commitments).
            program: programScope(program),
            type: c.type,
            description: c.description,
            due_date: c.due_date || null,
            context_note: c.context_note || null,
            status: "active",
            source_message_id: coachMessageId,
          })
          .select("id")
          .single();
        if (insertErr || !newRow) {
          console.error("[post-process] Commitment insert failed:", insertErr?.message);
          continue;
        }
        insertedNew.push({ id: newRow.id, description: c.description });

        // Extractor judgment — only ids we actually offered it are honored.
        if (c.supersedes && validSupersedeIds.has(c.supersedes) && !superseded.has(c.supersedes)) {
          const { error: supErr } = await supabase
            .from("commitments")
            .update({ status: "superseded", superseded_by: newRow.id })
            .eq("id", c.supersedes)
            .eq("user_id", userId)
            .eq("status", "active");
          if (!supErr) {
            superseded.add(c.supersedes);
            console.log(
              `[post-process] Commitment ${c.supersedes} superseded by ${newRow.id} (extractor judgment)`
            );
          }
        }
      }

      // ── Embedding backstop for extractor misses: same conversation, older
      // row created <30 min ago, similarity above threshold → the plan evolved
      // even if the extractor didn't say so. Older row loses; audit preserved.
      const backstopCandidates = existingCommitments.filter(
        (c) =>
          !superseded.has(c.id) &&
          Date.now() - new Date(c.created_at).getTime() < SUPERSEDE_WINDOW_MS
      );
      if (insertedNew.length > 0 && backstopCandidates.length > 0) {
        try {
          const texts = [
            ...insertedNew.map((n) => n.description),
            ...backstopCandidates.map((c) => c.description),
          ];
          const embeddings = await generateEmbeddings(texts);
          await logEmbeddingCost(userId, "supersede-backstop", texts, program);
          for (let i = 0; i < insertedNew.length; i++) {
            for (let j = 0; j < backstopCandidates.length; j++) {
              const candidate = backstopCandidates[j];
              if (superseded.has(candidate.id)) continue;
              const sim = cosineSim(embeddings[i], embeddings[insertedNew.length + j]);
              if (sim > SUPERSEDE_SIMILARITY) {
                const { error: supErr } = await supabase
                  .from("commitments")
                  .update({ status: "superseded", superseded_by: insertedNew[i].id })
                  .eq("id", candidate.id)
                  .eq("user_id", userId)
                  .eq("status", "active");
                if (!supErr) {
                  superseded.add(candidate.id);
                  console.log(
                    `[post-process] Commitment ${candidate.id} superseded by ${insertedNew[i].id} (backstop, sim=${sim.toFixed(3)})`
                  );
                }
              }
            }
          }
        } catch (e) {
          console.warn("[post-process] Supersede backstop failed:", (e as Error).message);
        }
      }
    }

    // Update message metadata with sentiment + topics
    if (extracted.sentiment || extracted.topics) {
      await supabase
        .from("messages")
        .update({
          metadata: {
            sentiment: extracted.sentiment,
            topics: extracted.topics,
          },
        })
        .eq("id", coachMessageId);
    }

    // Log post-processor cost
    const ppTokensIn = data.usage?.prompt_tokens ?? 0;
    const ppTokensOut = data.usage?.completion_tokens ?? 0;
    const ppCost =
      (ppTokensIn / 1_000_000) * 0.15 +
      (ppTokensOut / 1_000_000) * 0.6;

    await supabase.from("cost_tracking").insert({
      user_id: userId,
      purpose: "post-processor",
      model: "gpt-4o-mini",
      tokens_in: ppTokensIn,
      tokens_out: ppTokensOut,
      cost_usd: ppCost,
      // PC5.5: per-brand cost attribution at write time.
      metadata: { program },
    });

    // Challenge Detection + Framework Assignment (S2.3)
    // Gates (PC3.4, pack-owned since PC4.3):
    // - pack.extraction.frameworkChallenges: relationship coaching is
    //   stance-based with `frameworks: none` (audit §8) — the executive
    //   library (MI/OSKAR/GROW) mis-fired on grief convos.
    // - Executive: a challenge needs to PERSIST before it's promoted. One
    //   opening message used to birth a framework-assigned challenge, and the
    //   next prompt then doubled down on that framework's phase. Require at
    //   least 3 user messages in the conversation first.
    let challengeGateOpen = pack.extraction.frameworkChallenges;
    if (
      challengeGateOpen &&
      extracted.challenge_detected?.is_new &&
      extracted.challenge_detected?.title
    ) {
      const { count: convUserMsgCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("role", "user");
      if ((convUserMsgCount ?? 0) < 3) {
        challengeGateOpen = false;
        console.log(
          `[post-process] Challenge candidate "${extracted.challenge_detected.title}" not promoted — only ${convUserMsgCount ?? 0} user message(s) in conversation (need 3)`
        );
      }
    }
    if (
      challengeGateOpen &&
      extracted.challenge_detected?.is_new &&
      extracted.challenge_detected?.title
    ) {
      const challenge = extracted.challenge_detected;

      const { data: coachProfile } = await supabase
        .from("coach_profiles")
        .select("trust_level, framework_affinity")
        .eq("user_id", userId)
        .eq("program", programScope(program)) // PC2.2
        .maybeSingle();

      const trustLevel = coachProfile?.trust_level ?? 1;

      const framework = await assignFramework(
        supabase,
        challenge.category,
        trustLevel,
        coachProfile?.framework_affinity
      );

      // Check for duplicate challenges
      const { data: existingChallenges } = await supabase
        .from("coaching_challenges")
        .select("id, title")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(10);

      const isDuplicate = (existingChallenges ?? []).some(
        (c: { title: string }) =>
          c.title
            .toLowerCase()
            .includes(challenge.title.toLowerCase().slice(0, 20)) ||
          challenge.title
            .toLowerCase()
            .includes(c.title.toLowerCase().slice(0, 20))
      );

      if (!isDuplicate) {
        const { data: newChallenge } = await supabase
          .from("coaching_challenges")
          .insert({
            user_id: userId,
            title: challenge.title,
            description: challenge.description || null,
            framework: framework.name,
            framework_phase: framework.firstPhase,
            status: "active",
          })
          .select("id")
          .single();

        if (newChallenge) {
          await supabase.from("framework_usage").insert({
            user_id: userId,
            framework: framework.name,
            message_id: coachMessageId,
            engagement_signal: null,
            action_taken: false,
          });
        }

        console.log(
          `[post-process] New challenge: "${challenge.title}" → ${framework.name} (${framework.firstPhase}) for user ${userId}`
        );
      }
    }

    // AI Tool Discovery (S6.6) — persist discovered tools to users.ai_tools.
    // Pack-gated (PC4.3): tool discovery is noise for relationship coaching
    // (the audit's "org_sop memory for a grieving spouse" class of problem).
    if (pack.extraction.extractAiTools && extracted.ai_tools_mentioned?.length > 0) {
      try {
        // Load current user tools
        const { data: userData } = await supabase
          .from("users")
          .select("ai_tools")
          .eq("id", userId)
          .single();

        const existingTools: Array<{ name: string; proficiency?: string; categories?: string[] }> =
          Array.isArray(userData?.ai_tools) ? userData.ai_tools : [];

        const existingNames = new Set(existingTools.map((t) => t.name.toLowerCase()));

        // Merge new tools (upsert by name)
        let changed = false;
        for (const newTool of extracted.ai_tools_mentioned) {
          if (!newTool.name) continue;
          const normalizedName = newTool.name.toLowerCase();
          if (existingNames.has(normalizedName)) {
            // Update proficiency if we have new info
            const idx = existingTools.findIndex((t) => t.name.toLowerCase() === normalizedName);
            if (idx >= 0 && newTool.proficiency) {
              existingTools[idx].proficiency = newTool.proficiency;
              changed = true;
            }
          } else {
            existingTools.push({
              name: newTool.name,
              proficiency: newTool.proficiency || undefined,
              categories: newTool.categories || undefined,
            });
            changed = true;
          }
        }

        if (changed) {
          await supabase
            .from("users")
            .update({ ai_tools: existingTools })
            .eq("id", userId);
          console.log(
            `[post-process] Updated user AI tools: ${existingTools.map((t) => t.name).join(", ")}`
          );
        }
      } catch (toolErr) {
        console.warn("[post-process] AI tool discovery error:", (toolErr as Error).message);
      }
    }

    console.log(
      `[post-process] Extracted ${extracted.facts?.length ?? 0} facts, ${extracted.commitments?.length ?? 0} commitments for user ${userId}`
    );

    // ── Profile Auto-Update ──
    // Run after all other processing to avoid blocking fact/commitment storage
    if (extracted.profile_signals) {
      try {
        // Get total message count for threshold gating
        const { count: msgCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("role", "user");

        const profileResult = await updateCoachProfile(
          userId,
          extracted.profile_signals as ProfileSignals,
          msgCount ?? 0,
          program
        );

        if (profileResult.applied) {
          console.log(
            `[post-process] Profile updated for user ${userId}: ${profileResult.reason}, ` +
            `changed: ${Object.keys(profileResult.deltas).join(", ")}`
          );
        }
      } catch (profileErr) {
        // Profile update failure should never block post-processing
        console.warn("[post-process] Profile update error:", (profileErr as Error).message);
      }
    }
  } catch (error) {
    // Post-processing failure should never block the user
    console.error("[post-process] Error:", (error as Error).message);
    await logError("post-processor", error as Error, userId);
  }
}
