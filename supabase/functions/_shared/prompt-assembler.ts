/**
 * Dynamic Prompt Assembler — The 11-Layer Brain
 *
 * This is the core IP of Mastery Coach. It assembles a complete system prompt
 * for Claude by layering coaching context from multiple sources.
 *
 * Architecture: ARCHITECTURE.md §5.2, COACHING_BRAIN.md §6
 * Guardrails: COACHING_GUARDRAILS.md §1-§4
 *
 * PC4.2 (Coach Pack seam): this orchestrator is vertical-BLIND. It loads data,
 * pre-renders the shared context layers (Decoded profile, dyad/relationship,
 * mediator), and hands a PackPromptContext to the resolved CoachPack — the
 * pack owns the persona, the guardrails, and which layers render. Vertical
 * differences live in _shared/packs/*; shared layer builders live in
 * _shared/prompt-layers.ts. Do not add `program` checks here — extend the
 * pack contract instead.
 *
 * Layer 4.5 (Decoded Profile) — Sprint 0.4: When a user has completed
 * a Decoded personality assessment, their full profile is injected here
 * so the coach starts with deep knowledge of the user.
 */

import { createSupabaseClient } from "./supabase.ts";
import { generateEmbedding, searchMemoryFacts } from "./embeddings.ts";
import {
  resolveDyadContext,
  buildDyadCoachLayer,
  buildMediatorPersona,
  loadRelationshipStyle,
  renderCompatibilityDigest,
  type DyadContext,
} from "./dyad-context.ts";
import type { PromptDebugTrace } from "./debug-types.ts";
import {
  type ActiveChallenge,
  type AIToolRecord,
  type CoachingAgenda,
  type CoachProfile,
  type ConversationSummary,
  type MemoryFact,
  type Message,
  type UserAITool,
  type UserProfile,
  buildDeliveryStyle,
} from "./prompt-layers.ts";
import { resolvePack, programScope } from "./packs/index.ts";

// Re-export for consumers that need the trace type
export type { PromptDebugTrace };

// ─── ORCHESTRATOR: assemblePrompt ───────────────────────────────────────

/**
 * Assembles the complete system prompt from all 11 layers.
 * This is the brain of the coaching engine.
 *
 * @param includeDebugTrace When true, captures structured metadata about each layer.
 *        Only enable for admin debug mode — adds minor overhead.
 * @returns system prompt (string) + conversation messages for Claude + optional debug trace
 */
export async function assemblePrompt(
  userId: string,
  userMessage: string,
  includeDebugTrace = false,
  engagementId: string | null = null,
  mode: string | null = null,
  program: string | null = null,
  conversationId: string | null = null
): Promise<{
  system: string;
  /**
   * The leading slice of `system` that holds still for the conversation, as
   * declared by the pack's `cacheableLayerCount`. Always a byte-exact prefix of
   * `system` — the caller sends it as a cached block and the remainder plain.
   */
  systemCachePrefix: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  metadata: {
    activeChallenges: ActiveChallenge[];
    factCount: number;
    messageCount: number;
    /** Retrieved facts as `subject: content` — see the note at the return. */
    factTexts: string[];
    /** The person's own name, for the draft audit — see the note at the return. */
    userName: string | null;
  };
  debugTrace: PromptDebugTrace | null;
}> {
  const supabase = createSupabaseClient();

  // The pack owns every vertical-specific decision from here on.
  const pack = resolvePack(program);

  // ── Resolve latest assessment ID first (needed for score query) ──
  // PROGRAM-SCOPED (PC2.1e). This took the latest completed assessment across
  // ALL programs while `program` sat in scope two lines up: a dual-brand user
  // chatting on relatti.com whose MasteryTV assessment was newer got their
  // executive Big Five + archetype injected into the relationship prompt. Same
  // class as the conversation bleed that 20260715120000 fixed — the pack was
  // right, the data underneath it wasn't.
  const latestAssessmentResult = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("program", programScope(program))
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestAssessmentId = latestAssessmentResult.data?.id ?? null;

  // Recent messages for short-term context, scoped per the pack:
  // "conversation" (E14 — a "New conversation" truly starts fresh) vs
  // "engagement" (executive — cross-session continuity in-prompt).
  const baseRecentMessages = supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("user_id", userId);
  const scopedRecentMessages =
    pack.recentMessageScope === "conversation" && conversationId
      ? baseRecentMessages.eq("conversation_id", conversationId)
      : engagementId
      ? baseRecentMessages.eq("engagement_id", engagementId)
      : baseRecentMessages.is("engagement_id", null);
  const recentMessagesQuery = scopedRecentMessages
    .order("created_at", { ascending: false })
    .limit(20);

  // ── Parallel data loading (minimize latency) ──
  const [
    userResult,
    profileResult,
    challengesResult,
    messagesResult,
    factsResult,
    agendaResult,
    summariesResult,
    aiToolsResult,
    decodedScoresResult,
    decodedReportResult,
  ] = await Promise.all([
    // User profile
    supabase.from("users").select("*").eq("id", userId).single(),
    // Coach profile (communication dimensions) — PER PROGRAM (PC2.2): the
    // relationship coach must not inherit the executive coach's learned dials.
    // maybeSingle: a user new to THIS vertical has no profile yet (defaults apply).
    supabase.from("coach_profiles").select("*")
      .eq("user_id", userId).eq("program", programScope(program)).maybeSingle(),
    // Active challenges with frameworks
    supabase
      .from("coaching_challenges")
      .select("id, title, framework, framework_phase, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    // Recent messages (short-term memory — last 20), scoped to the thread
    recentMessagesQuery,
    // Memory facts — hybrid approach:
    // 1. Top facts by importance (always relevant)
    // 2. Semantically similar facts (contextually relevant to this message)
    supabase
      .from("memory_facts")
      .select("category, subject, content, importance")
      .eq("user_id", userId)
      .eq("program", programScope(program)) // PC2.2: memory never crosses verticals
      .order("importance", { ascending: false })
      .limit(10),
    // Coaching agenda (latest)
    supabase
      .from("coaching_agenda")
      .select("priority_topic, coaching_questions")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Session summaries — medium-term memory (S6.12). OVER-FETCHED here with
    // the parent conversation id, then scoped to THIS vertical after the
    // parallel block (child-scoped tenancy — see the sessionSummaries filter
    // below; the table has no program column of its own).
    supabase
      .from("conversation_summaries")
      .select("summary, key_topics, framework_used, message_count, first_message_at, last_message_at, conversation_id")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(15),
    // AI tools knowledge base (S6.6 — non-flagged, active tools)
    supabase
      .from("ai_tools")
      .select("name, category, cost_model, description, strengths, when_to_recommend")
      .eq("auto_flagged", false),
    // Decoded assessment scores (S0.4 — Coach Handoff)
    // IMPORTANT: Only load from the LATEST completed assessment.
    // Without this filter, scores from multiple assessments get mixed,
    // and the Map constructor in buildAssessmentProfile keeps the wrong values.
    latestAssessmentId
      ? supabase
          .from("assessment_scores")
          .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
          .eq("assessment_id", latestAssessmentId)
      : Promise.resolve({ data: [], error: null }),
    // Decoded assessment report (archetype data — same assessment as scores)
    latestAssessmentId
      ? supabase
          .from("assessment_reports")
          .select("archetype_base, archetype_sublabel, archetype_tagline, generated_at, sections")
          .eq("assessment_id", latestAssessmentId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const user = userResult.data as UserProfile | null;
  const profile = profileResult.data as CoachProfile | null;
  const challenges = (challengesResult.data ?? []) as ActiveChallenge[];
  const messages = (messagesResult.data ?? []) as Message[];
  const importantFacts = (factsResult.data ?? []) as MemoryFact[];
  const agenda = agendaResult.data as CoachingAgenda | null;
  // Session summaries are CHILD-SCOPED through their parent conversation (no
  // program column of its own, and no conversation FK PostgREST could embed) —
  // resolve each summary's vertical via its parent and keep only THIS
  // program's. Reading by user_id alone leaked the executive session summary
  // into the money coach's Layer 7 (2026-07-20: the MoneyTraits coach greeted
  // a user with the executive session's Relatti recruiting plans). Legacy
  // parents with a NULL program count as the executive coach's ('general').
  let sessionSummaries: ConversationSummary[] = [];
  {
    const rawSummaries = (summariesResult.data ?? []) as Array<
      ConversationSummary & { conversation_id?: string | null }
    >;
    if (rawSummaries.length > 0) {
      const parentIds = [
        ...new Set(rawSummaries.map((s) => s.conversation_id).filter(Boolean)),
      ] as string[];
      const { data: parents } = parentIds.length
        ? await supabase.from("conversations").select("id, program").in("id", parentIds)
        : { data: [] as Array<{ id: string; program: string | null }> };
      const parentProgram = new Map(
        ((parents ?? []) as Array<{ id: string; program: string | null }>).map(
          (p) => [p.id, p.program],
        ),
      );
      const summaryScope = programScope(program);
      sessionSummaries = rawSummaries
        .filter(
          (s) =>
            ((s.conversation_id ? parentProgram.get(s.conversation_id) : null) ??
              "general") === summaryScope,
        )
        .slice(0, 5)
        .map(({ conversation_id: _cid, ...rest }) => rest as ConversationSummary);
    }
  }
  const availableAITools = (aiToolsResult.data ?? []) as AIToolRecord[];
  const userTools: UserAITool[] = Array.isArray(user?.ai_tools) ? user.ai_tools as UserAITool[] : [];
  const decodedScores = (decodedScoresResult.data ?? []) as Array<{
    instrument_id: string;
    total_score?: number;
    subscale_scores?: Record<string, number>;
    percentile_scores?: Record<string, number>;
    interpretation?: Record<string, unknown>;
  }>;
  const decodedReport = decodedReportResult.data as {
    archetype_base: string | null;
    archetype_sublabel: string | null;
    archetype_tagline: string | null;
    generated_at: string | null;
    sections: Record<string, unknown> | null;
  } | null;

  // Semantic memory retrieval — embed user message and search for relevant facts
  let semanticFacts: MemoryFact[] = [];
  let semanticResults: Array<{ category: string; subject: string; content: string; importance: number; similarity: number }> = [];
  try {
    console.log(`[prompt-assembler] Generating embedding for query: "${userMessage.slice(0, 60)}..."`);
    const queryEmbedding = await generateEmbedding(userMessage);
    console.log(`[prompt-assembler] Embedding generated (${queryEmbedding.length} dims), searching facts for user ${userId}...`);
    semanticResults = await searchMemoryFacts(userId, queryEmbedding, 8, programScope(program));
    console.log(`[prompt-assembler] Semantic search returned ${semanticResults.length} results`);
    semanticFacts = semanticResults.map((r) => ({
      category: r.category,
      subject: r.subject,
      content: r.content,
      importance: r.importance,
    }));
  } catch (e) {
    // Semantic search failure shouldn't break the coach
    console.error("[prompt-assembler] Semantic search FAILED:", (e as Error).message, (e as Error).stack);
  }

  // Merge: deduplicate by subject+content, prefer semantic matches
  const factKey = (f: MemoryFact) => `${f.subject}::${f.content}`;
  const seenFacts = new Set<string>();
  const mergedFacts: MemoryFact[] = [];

  // Semantic facts first (most contextually relevant)
  for (const f of semanticFacts) {
    const key = factKey(f);
    if (!seenFacts.has(key)) {
      seenFacts.add(key);
      mergedFacts.push(f);
    }
  }
  // Then high-importance facts
  for (const f of importantFacts) {
    const key = factKey(f);
    if (!seenFacts.has(key)) {
      seenFacts.add(key);
      mergedFacts.push(f);
    }
  }

  // Cap at 15 to avoid prompt bloat
  const facts = mergedFacts.slice(0, 15);

  // Enrich challenges with framework phase info
  if (challenges.length > 0) {
    const frameworkNames = [...new Set(challenges.map((c) => c.framework))];
    const { data: frameworks } = await supabase
      .from("framework_config")
      .select("name, phases")
      .in("name", frameworkNames);

    const frameworkMap = new Map(
      (frameworks ?? []).map((f: { name: string; phases: string[] }) => [f.name, f.phases])
    );
    for (const c of challenges) {
      c.phases = frameworkMap.get(c.framework) ?? [];
    }
  }

  // Delivery style — the executive pack renders it as Layer 6; computed here
  // as well for the debug trace (pure function, negligible cost).
  const deliveryResult = buildDeliveryStyle(profile);

  // ── Coach-visibility axis (Relatti): how much of the user's OWN profile their
  // coach may use. Per-person (participant.coach_share_level); default 'full' —
  // which is also the effective default for non-Relatti users, who have no
  // participant row (so the executive coach is unchanged). 'none' hides the
  // self-profile; 'type_compatibility' trims it to archetype + attachment only.
  let coachShareLevel = "full";
  try {
    const { data: myParts } = await supabase
      .from("participant")
      .select("coach_share_level")
      .eq("user_id", userId);
    if (myParts && myParts.length > 0) {
      const rank: Record<string, number> = { none: 0, type_compatibility: 1, full: 2 };
      // Most permissive across the user's dyads — it's their own profile.
      coachShareLevel = myParts.reduce(
        (acc: string, p: { coach_share_level: string }) =>
          (rank[p.coach_share_level] ?? 2) > (rank[acc] ?? 0) ? p.coach_share_level : acc,
        "none",
      );
    }
  } catch (_e) {
    /* default 'full' */
  }

  // ── Build Decoded profile layer (Layer 4.5 — S0.4), gated by the coach axis ──
  let decodedLayer = "";
  if (coachShareLevel !== "none" && decodedReport?.sections?.["money_map"]) {
    // A money assessment's report carries a `money_map` bundle under
    // sections.money_map — render THAT profile (Layer 4.5), not the Big-Five
    // one. DATA-DRIVEN, not a `program` check: the assembler stays vertical-
    // blind (see the header note), and a money report can never fall through to
    // the Big-Five renderer even if it also carries score rows. Renders "" until
    // the money write path stores a bundle, so there's no wrong-vertical bleed. (T2)
    try {
      const { buildMoneyMapProfileLayer } = await import("./money-map-profile.ts");
      decodedLayer = buildMoneyMapProfileLayer(decodedReport);
    } catch (e) {
      console.error("[prompt-assembler] trait profile build failed:", (e as Error).message);
    }
  } else if (coachShareLevel !== "none" && decodedScores.length > 0 && decodedReport) {
    try {
      // Dynamic import to avoid loading Decoded code when not needed
      // These modules live in _shared/decoded/ alongside the prompt assembler
      const { buildAssessmentProfile } = await import("./decoded/assessment-profile.ts");
      const assessmentProfile = buildAssessmentProfile(decodedScores, decodedReport);
      if (coachShareLevel === "full") {
        const { buildDecodedProfileLayer, buildReportVocabularyBlock } = await import("./decoded/prompt-layer.ts");
        decodedLayer = buildDecodedProfileLayer(assessmentProfile);
        // The report's own names for strengths/edges/patterns — the coach and
        // the report page must speak the same language (founder, 2026-07-16).
        const vocabulary = buildReportVocabularyBlock(decodedReport.sections);
        if (vocabulary) decodedLayer = `${decodedLayer}\n\n${vocabulary}`;
      } else {
        // 'type_compatibility' — the user limited coaching to archetype + style.
        const arch = assessmentProfile.archetype;
        const att = assessmentProfile.attachment;
        const parts = [
          "DECODED PROFILE (the user limited what their coach may use to their archetype + relationship style only):",
        ];
        if (arch?.base && arch.base !== "Unknown") parts.push(`Archetype: "${arch.sublabel}" (${arch.base}).`);
        if (att?.style) parts.push(`Relationship style: ${att.style} — speak to how they connect, not to raw scores.`);
        parts.push("Do NOT cite Big Five percentiles, subscales, or detailed assessment numbers.");
        decodedLayer = parts.join("\n");
      }
      console.log(`[prompt-assembler] Decoded profile loaded (coach share: ${coachShareLevel})`);
    } catch (e) {
      // Decoded profile failure shouldn't break the coach
      console.error("[prompt-assembler] Decoded profile build failed:", (e as Error).message);
    }
  } else if (coachShareLevel === "none") {
    console.log("[prompt-assembler] Decoded self-profile hidden by coach-visibility = none");
  }

  // ── Build Relationship Dyad layer (Layer 4.6) ──
  // E4: prefer the engagement spine (flagged); else legacy decoded_invites fan-out.
  let relationshipLayer = "";
  let mediatorPersona = "";
  let dyad: DyadContext | null = null;
  if ((Deno.env.get("RELATTI_DYAD_ENGINE") ?? "off").toLowerCase() === "on") {
    try {
      dyad = await resolveDyadContext(userId);
    } catch (e) {
      console.error("[prompt-assembler] Dyad context resolve failed:", (e as Error).message);
    }
  }
  if (dyad) {
    relationshipLayer = buildDyadCoachLayer(dyad);
    mediatorPersona = buildMediatorPersona(dyad);
    console.log(`[prompt-assembler] Dyad engine ON — engagement ${dyad.engagementId} (partner share: ${dyad.partnerShareLevel})`);
  } else {
  try {
    // Load invites where someone shared with THIS user's coach
    // Case 1: User is the inviter and recipient shared with inviter's coach
    // Case 2: User is the recipient and inviter shared... (future: bidirectional)
    const { data: sharedInvites } = await supabase
      .from("decoded_invites")
      .select("inviter_id, recipient_id, inviter_name, recipient_email, share_with_human, compatibility_report")
      .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`)
      .neq("share_with_human", "none")
      .in("status", ["consented", "connected"]);

    if (sharedInvites && sharedInvites.length > 0) {
      const relationshipParts: string[] = [];

      for (const inv of sharedInvites) {
        const isInviter = inv.inviter_id === userId;
        const shareLevel = inv.share_with_human;

        let partnerContext = "";

        // Load partner's report based on share level
        const partnerId = isInviter ? inv.recipient_id : inv.inviter_id;

        // Partner name: account name first (email prefixes read like
        // usernames and made the coach ask "what's their name?").
        let partnerName = isInviter
          ? (inv.recipient_email?.split("@")[0] || "Partner")
          : (inv.inviter_name || "Partner");
        if (partnerId) {
          const { data: pu } = await supabase
            .from("users")
            .select("name")
            .eq("id", partnerId)
            .maybeSingle();
          if (pu?.name) partnerName = pu.name;
        }
        if (partnerId && (shareLevel === "type_compatibility" || shareLevel === "full")) {
          // The partner's RELATIONSHIP report, not whichever they finished last
          // — a dual-brand partner would otherwise hand the dyad coach their
          // executive profile. This branch only runs for a relationship dyad,
          // so the program is that of the coach reading it. (PC2.1e.)
          const { data: partnerReport } = await supabase
            .from("assessment_reports")
            .select("archetype_base, archetype_sublabel, sections")
            .eq("user_id", partnerId)
            .eq("program", programScope(program))
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (partnerReport) {
            if (shareLevel === "full") {
              partnerContext = `Archetype: ${partnerReport.archetype_base} (${partnerReport.archetype_sublabel || ""})
Full profile summary: ${JSON.stringify(partnerReport.sections?.S1?.content_markdown || "Not available")}`;
            } else {
              partnerContext = `Archetype: ${partnerReport.archetype_base} (${partnerReport.archetype_sublabel || ""})`;
            }
          }

          // Relationship style (attachment) — lets the coach speak to how the
          // partner reaches/protects, not just their personality archetype.
          const partnerStyle = await loadRelationshipStyle(supabase, partnerId);
          if (partnerStyle) {
            partnerContext += `\nRelationship style: ${partnerStyle.name} (need for reassurance: ${partnerStyle.needForReassurance}, need for space: ${partnerStyle.needForSpace}) — ${partnerStyle.summary}`;
          }
        }

        // Add compatibility report if available (shape-aware: legacy Decoded
        // fields OR the Relatti couples_report shape)
        let compatContext = "";
        if (inv.compatibility_report) {
          const digest = renderCompatibilityDigest(inv.compatibility_report);
          if (digest) compatContext = `\nCompatibility Report:\n${digest}`;
        }

        relationshipParts.push(`## Relationship with ${partnerName}
${partnerName} has consented to share their profile with your coach (share level: ${shareLevel}).
${partnerContext}
${compatContext}
You can discuss this relationship naturally. Ask about their dynamic, offer insights, and help them navigate their partnership.`);
      }

      if (relationshipParts.length > 0) {
        // The user's own relationship style — always available, anchors advice to
        // how THEY reach/protect alongside each partner's style above.
        const userStyle = await loadRelationshipStyle(supabase, userId);
        const userStyleLine = userStyle
          ? `\nThe user's own relationship style: ${userStyle.name} (need for reassurance: ${userStyle.needForReassurance}, need for space: ${userStyle.needForSpace}) — ${userStyle.summary}.\n`
          : "";
        relationshipLayer = `# LAYER 4.6 — SHARED RELATIONSHIP PROFILES
${userStyleLine}
The user has personality profile connections with the following people:

${relationshipParts.join("\n\n---\n\n")}

IMPORTANT ACCESS RULES:
- You have access to this data because the other person explicitly consented to share it.
- Respect the sharing level for each connection:
  * "type_compatibility" = You can see their archetype and the compatibility report. You do NOT have access to their full Decoded assessment. Do not claim knowledge of their detailed scores.
  * "full" = You can see their full profile, archetype, and compatibility analysis.
- Everything above is ALREADY in your context — never ask permission to "look up" these connections and never ask the user for a name you already have here.
- Use this data naturally in conversation — discuss their dynamic, offer relationship-specific coaching.
- Do NOT volunteer this data unprompted. Wait for the user to bring up the relationship, then enrich your responses.
- If the user asks about details you don't have access to at the current sharing level, say so: "I don't have access to that level of detail about [name]'s profile."`;
        console.log(`[prompt-assembler] Loaded ${relationshipParts.length} shared relationship profile(s)`);
      }
    }
  } catch (e) {
    console.error("[prompt-assembler] Relationship profiles load failed:", (e as Error).message);
  }
  }

  // ── Assemble system prompt — the pack owns the layer stack ──
  const rawLayers: string[] = pack.buildLayers({
    mode,
    user,
    profile,
    challenges,
    messages,
    facts,
    sessionSummaries,
    agenda,
    userTools,
    availableAITools,
    decodedLayer,
    relationshipLayer,
    mediatorPersona,
  });

  // Prompt-cache split. The pack declares how many leading layers hold still
  // for the length of a conversation (`cacheableLayerCount`); those become an
  // Anthropic `cache_control` block in _shared/anthropic.ts, and the rest is
  // sent uncached. `.filter(Boolean)` runs on each half separately so empty
  // conditional layers drop out exactly as they did before — which is what
  // keeps `system` byte-identical to the pre-caching prompt. That byte
  // equality is the whole safety argument for this change: the model reads the
  // same prompt it read yesterday, so no golden moves and no coach voice
  // shifts. If you edit this, re-run the goldens rather than eyeballing it.
  const LAYER_SEP = "\n\n---\n\n";
  const layers = rawLayers.filter(Boolean);
  const systemCachePrefix = rawLayers
    .slice(0, pack.cacheableLayerCount)
    .filter(Boolean)
    .join(LAYER_SEP);
  const system = layers.join(LAYER_SEP);

  // ── Build conversation history (reversed to chronological) ──
  const conversationHistory = messages
    .slice()
    .reverse()
    .map((m) => ({
      role: (m.role === "coach" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));

  // ── Build debug trace (only when requested by admin) ──
  let debugTrace: PromptDebugTrace | null = null;
  if (includeDebugTrace) {
    const autonomy = profile?.autonomy ?? 5;
    const challengeLevel = profile?.challenge_level ?? 3;

    // Build category map from AI tools
    const catalogCategories = new Set<string>();
    for (const tool of availableAITools) {
      for (const cat of tool.category ?? []) {
        catalogCategories.add(cat);
      }
    }

    debugTrace = {
      layers: {
        base_persona: "static",
        challenges: challenges.map((c) => {
          const phaseIndex = c.phases?.indexOf(c.framework_phase) ?? 0;
          return {
            title: c.title,
            framework: c.framework,
            phase: c.framework_phase ?? "unknown",
            progress: c.phases ? `${phaseIndex + 1}/${c.phases.length}` : "?",
          };
        }),
        intervention_bias: {
          autonomy,
          autonomy_label: autonomy >= 7 ? "HIGH" : autonomy <= 3 ? "LOW" : "MODERATE",
          challenge_level: challengeLevel,
          challenge_label: challengeLevel >= 7 ? "HIGH" : challengeLevel <= 3 ? "LOW" : "MODERATE",
          trust_level: profile?.trust_level ?? 1,
        },
        user_profile: user
          ? { name: user.name || "Not set", timezone: user.timezone, tier: user.subscription_tier }
          : null,
        entities: "stub",
        delivery_style: deliveryResult.instructions,
        memory: {
          semantic_facts: semanticResults.map((r) => ({
            subject: r.subject,
            content: r.content,
            category: r.category,
            similarity: r.similarity,
          })),
          importance_facts: importantFacts.map((f) => ({
            subject: f.subject,
            content: f.content,
            category: f.category,
            importance: f.importance,
          })),
          merged_count: facts.length,
          session_summaries_count: sessionSummaries.length,
          session_summaries: sessionSummaries.map((s) => ({
            date: new Date(s.last_message_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            topics: s.key_topics ?? [],
            framework: s.framework_used,
            summary_preview: s.summary.slice(0, 100),
          })),
        },
        agenda: agenda?.priority_topic
          ? {
              priority_topic: agenda.priority_topic,
              questions: agenda.coaching_questions ?? [],
            }
          : null,
        ai_tools: {
          user_tools: userTools.map((t) => t.name),
          catalog_categories: [...catalogCategories],
        },
        guardrails: "static",
        safety: "static",
      },
      system_prompt_chars: system.length,
      system_prompt_tokens_est: Math.ceil(system.length / 4),
      conversation_history_count: conversationHistory.length,
    };
  }

  return {
    system,
    systemCachePrefix,
    conversationHistory,
    metadata: {
      activeChallenges: challenges,
      factCount: facts.length,
      messageCount: messages.length,
      /**
       * The person's own name, for the same audit. 🔥 Measured 2026-08-12: the
       * mirroring index counted "Dana" as a coinage, because a person does not
       * type their own name at the coach and the index only knows what they
       * wrote. Addressing somebody by name is the most ordinary thing this
       * coach does — the live run's very first reply opened with it — so
       * without this the auditor blocks the warmest sentence in the vertical.
       * Additive, like `factTexts`: nothing renders it, so no golden moves.
       */
      userName: user?.name ?? null,
      /**
       * The retrieved facts as `subject: content`, for the buffered draft audit
       * (`_shared/draft-audit.ts` → `buildUserTextForAudit`). 🔥 The mirroring
       * index treats any proper noun the person has not used as a coach coinage
       * and blocks it, so a name they gave weeks ago — which lives in
       * `memory_facts`, quoted, and not in this conversation's window — would
       * make the coach unable to say their own word for their own experience.
       * Additive: nothing renders it, so no prompt golden moves, and no caller
       * writes it to a row.
       */
      factTexts: facts.map((f) => `${f.subject}: ${f.content}`),
    },
    debugTrace,
  };
}
