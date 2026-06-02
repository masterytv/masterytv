/**
 * Edge Function: decoded-rewrite-voice
 *
 * Regenerates a Decoded report in a user-selected narrative voice.
 * Stores the result in assessment_report_versions (not on the main report).
 *
 * Request body:
 *   { report_id: string, voice_id: string }
 *
 * Flow:
 *   1. Validate auth + ownership
 *   2. Check for existing version (idempotent — return if already complete)
 *   3. Load original report's scores + archetype from assessment data
 *   4. Run buildRewritePipeline() with the requested voice
 *   5. Call GPT-4o for each section sequentially, updating progress
 *   6. Mark version as complete
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.3
 * PRD: NVR20–NVR23
 *
 * Deploy with verify_jwt: false (user JWT verified manually via supabase.auth.getUser())
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { handleCors, getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse, jsonResponse, logError, withRetry, isRetryableError } from "../_shared/errors.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";
const MAX_TOKENS_PER_SECTION = 2048;

// Valid voice IDs — must match src/lib/decoded/report/voice/types.ts
const VALID_VOICE_IDS = [
  "intellectual",
  "adventurer",
  "connector",
  "steward",
  "challenger",
  "sensitive",
] as const;

type VoiceId = (typeof VALID_VOICE_IDS)[number];

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getCorsHeaders(req);

  try {
    // 1. Validate request
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, headers);
    }

    const body = await req.json();
    const { report_id, voice_id } = body;

    if (!report_id || typeof report_id !== "string") {
      return errorResponse("INVALID_INPUT", "report_id is required", 400, headers);
    }
    if (!voice_id || !VALID_VOICE_IDS.includes(voice_id)) {
      return errorResponse(
        "INVALID_VOICE",
        `voice_id must be one of: ${VALID_VOICE_IDS.join(", ")}`,
        400,
        headers,
      );
    }

    // 2. Auth check
    const userClient = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401, headers);
    }

    const serviceClient = createSupabaseClient();

    // 3. Verify report ownership
    const { data: report, error: reportError } = await serviceClient
      .from("assessment_reports")
      .select("id, assessment_id, user_id, sections, voice_profile, archetype_base, report_version")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      return errorResponse("NOT_FOUND", "Report not found", 404, headers);
    }

    if (report.user_id !== user.id) {
      return errorResponse("FORBIDDEN", "Not your report", 403, headers);
    }

    // 4. Check for existing version (idempotent)
    const { data: existingVersion } = await serviceClient
      .from("assessment_report_versions")
      .select("id, status, sections")
      .eq("report_id", report_id)
      .eq("voice_id", voice_id)
      .single();

    if (existingVersion) {
      if (existingVersion.status === "complete") {
        // Already done — return cached
        return jsonResponse(
          {
            version_id: existingVersion.id,
            voice_id,
            status: "complete",
            sections: existingVersion.sections,
          },
          200,
          headers,
        );
      }
      if (existingVersion.status === "generating") {
        // In progress — return status for polling
        return jsonResponse(
          {
            version_id: existingVersion.id,
            voice_id,
            status: "generating",
          },
          202,
          headers,
        );
      }
      // Failed — delete and retry
      await serviceClient
        .from("assessment_report_versions")
        .delete()
        .eq("id", existingVersion.id);
    }

    // 5. Load scores from assessment_scores table
    const { data: scoreRows, error: scoresError } = await serviceClient
      .from("assessment_scores")
      .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
      .eq("assessment_id", report.assessment_id);

    if (scoresError || !scoreRows || scoreRows.length === 0) {
      return errorResponse("NOT_FOUND", "Assessment scores not found", 404, headers);
    }

    // 6. Create version row (status: generating)
    const { data: version, error: insertError } = await serviceClient
      .from("assessment_report_versions")
      .insert({
        report_id,
        user_id: user.id,
        voice_id,
        sections: {},
        status: "generating",
        sections_completed: 0,
        total_sections: (report.report_version ?? 1) === 2 ? 8 : 12,
      })
      .select("id")
      .single();

    if (insertError || !version) {
      await logError("decoded-rewrite-voice", new Error(insertError?.message ?? "Insert failed"), user.id);
      return errorResponse("DB_ERROR", "Failed to create version", 500, headers);
    }

    // 7. Return immediately with 202 — generation happens async below
    //    The client polls GET /assessment_report_versions?id=xxx for progress.
    const responsePromise = jsonResponse(
      {
        version_id: version.id,
        voice_id,
        status: "generating",
      },
      202,
      headers,
    );

    // 8. Fire-and-forget: generate sections in background
    // EdgeRuntime.waitUntil keeps the function alive after response is sent
    const generatePromise = generateSections(
      serviceClient,
      version.id,
      voice_id as VoiceId,
      scoreRows,
      report,
      user.id,
    );

    // Use EdgeRuntime.waitUntil if available (Supabase Edge Runtime),
    // otherwise just fire and forget
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generatePromise);
    } else {
      generatePromise.catch((err) => {
        console.error("[decoded-rewrite-voice] Background generation failed:", err);
      });
    }

    return responsePromise;
  } catch (error) {
    const err = error as Error;
    console.error("[decoded-rewrite-voice] Unhandled error:", err.message);
    await logError("decoded-rewrite-voice", err);
    return errorResponse("INTERNAL_ERROR", "Internal server error", 500, headers);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Background Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate all 12 report sections with the requested voice.
 * Runs in the background after the 202 response is sent.
 *
 * Each section is generated sequentially (not parallel) to avoid
 * rate limits and to provide meaningful progress updates.
 */
async function generateSections(
  supabase: ReturnType<typeof createSupabaseClient>,
  versionId: string,
  voiceId: VoiceId,
  scoreRows: Array<{
    instrument_id: string;
    total_score: number | null;
    subscale_scores: Record<string, number> | null;
    percentile_scores: Record<string, number> | null;
    interpretation: Record<string, unknown> | null;
  }>,
  report: { id: string; sections: unknown; voice_profile: unknown; archetype_base?: string; report_version?: number },
  userId: string,
): Promise<void> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    await markFailed(supabase, versionId, "OPENAI_API_KEY not set");
    return;
  }

  // Build archetype context from the report's stored archetype
  const archetypeName = report.archetype_base ?? "Unknown";
  const archetypeResult = { primary: { name: archetypeName } };

  // Build voice-aware prompts using the pipeline
  // Since Edge Functions can't import from src/lib directly,
  // we inline the prompt assembly logic here using the stored data.
  //
  // The voice prompt blocks are stored in the config and are deterministic,
  // so we use a simplified approach: fetch the original report's section prompts
  // and swap the voice block.

  // Select section IDs based on report version
  const reportVersion = report.report_version ?? 1;
  const sectionIds = reportVersion === 2
    ? ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]
    : [
        "RS01", "RS02", "RS03", "RS04", "RS05", "RS06",
        "RS07", "RS08", "RS09", "RS10", "RS11", "RS12",
      ];

  const generatedSections: Record<string, unknown> = {};
  let completedCount = 0;

  for (const sectionId of sectionIds) {
    try {
      let sectionContent: Record<string, unknown>;

      if (reportVersion === 2) {
        // v2: rewrite structured JSON, preserving structure but changing voice
        const originalSections = (report.sections ?? {}) as Record<string, { content_markdown?: string; title?: string }>;
        const originalSection = originalSections[sectionId];
        sectionContent = await withRetry(
          () => generateV2Section(
            openaiKey,
            sectionId,
            voiceId,
            scoreRows,
            archetypeResult,
            originalSection?.content_markdown ?? '{}',
            originalSection?.title ?? sectionId,
          ),
          {
            maxRetries: 2,
            baseDelay: 2000,
            functionName: `decoded-rewrite-voice/v2/${sectionId}`,
            shouldRetry: isRetryableError,
          },
        );
      } else {
        // v1: generate free-form markdown in the new voice
        sectionContent = await withRetry(
          () => generateSingleSection(
            openaiKey,
            sectionId,
            voiceId,
            scoreRows,
            archetypeResult,
          ),
          {
            maxRetries: 2,
            baseDelay: 2000,
            functionName: `decoded-rewrite-voice/${sectionId}`,
            shouldRetry: isRetryableError,
          },
        );
      }

      generatedSections[sectionId] = sectionContent;
      completedCount++;

      // Update progress
      await supabase
        .from("assessment_report_versions")
        .update({
          sections: generatedSections,
          sections_completed: completedCount,
        })
        .eq("id", versionId);
    } catch (error) {
      const err = error as Error;
      console.error(`[decoded-rewrite-voice] Section ${sectionId} failed:`, err.message);
      await logError("decoded-rewrite-voice", err, userId, {
        section_id: sectionId,
        voice_id: voiceId,
        version_id: versionId,
      });

      // Continue to next section — partial results are still useful
      generatedSections[sectionId] = {
        title: sectionId,
        content_markdown: "_This section could not be generated. Please try again._",
        coach_question: "",
        word_count: 0,
        error: err.message,
      };
      completedCount++;
    }
  }

  // Mark complete
  await supabase
    .from("assessment_report_versions")
    .update({
      sections: generatedSections,
      sections_completed: completedCount,
      status: "complete",
      completed_at: new Date().toISOString(),
    })
    .eq("id", versionId);

  console.log(
    `[decoded-rewrite-voice] Complete: ${completedCount}/${sectionIds.length} sections for voice=${voiceId}, version=${versionId}`,
  );
}

/**
 * Generate a single report section using GPT-4o.
 *
 * This is a simplified version of the pipeline for Edge Functions.
 * The full pipeline runs in src/lib and produces the system+user prompts.
 * Here we construct a minimal voice-aware prompt directly.
 */
async function generateSingleSection(
  apiKey: string,
  sectionId: string,
  voiceId: VoiceId,
  scoreRows: Array<Record<string, unknown>>,
  archetypeResult: { primary: { name: string } },
): Promise<Record<string, unknown>> {
  // Build the voice instruction block based on voiceId
  const voiceInstruction = getVoiceInstruction(voiceId);

  const systemPrompt = `You are a senior personality coach writing a section of a premium personality report for Decoded (mastery.tv/decoded).

${voiceInstruction}

CRITICAL RULES:
- Never use diagnostic language ("you have", "you suffer from", "disorder", "condition")
- Frame all findings as patterns, not pathologies
- Always use growth-oriented framing ("an area for exploration", not "a problem")
- Never expose raw numerical scores in the narrative (use "above average", "notably high", etc.)
- End every section with agency: what the user CAN do, not what's wrong
- If scores indicate clinical-level distress, recommend professional support gently
- The coaching question at the end must be specific to THIS person's data, not generic

WRITING RULES (apply to every voice):
- Separate clauses with commas, colons, semicolons, or parentheses. Do not use em dashes.
- Express contrasts as progressions: "less about distance and more about freedom."
- Create emphasis with short standalone sentences rather than dramatic punctuation.
- Vary sentence openings across each paragraph. Avoid starting consecutive sentences with "You" or "Your."
- Choose specific language over vague intensifiers.
- Write in a natural, human cadence. Avoid formulaic AI patterns.

OUTPUT FORMAT:
Return valid JSON with exactly these fields:
{
  "title": "Section Title",
  "content_markdown": "## Section Title\\n\\n...", 
  "coach_question": "A specific, thought-provoking question for this person",
  "data_viz": null
}

You are writing section ${sectionId}. Word count: 500-850.`;

  const userPrompt = `Here is the assessment data for this person:

ARCHETYPE: ${archetypeResult.primary.name}
SCORES: ${JSON.stringify(scoreRows)}

Write section ${sectionId} in the ${voiceId} voice.`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: MAX_TOKENS_PER_SECTION,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000), // 60s per section
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content);

  // Ensure required fields exist
  return {
    title: parsed.title ?? sectionId,
    content_markdown: parsed.content_markdown ?? "",
    coach_question: parsed.coach_question ?? "",
    data_viz: parsed.data_viz ?? null,
    word_count: (parsed.content_markdown ?? "").split(/\s+/).length,
    generated_at: new Date().toISOString(),
    voice_id: voiceId,
    min_tier: getSectionTier(sectionId),
  };
}

/**
 * Generate a v2 structured section using GPT-4o.
 *
 * Takes the original structured JSON and rewrites all prose fields
 * (narratives, descriptions, tldr, etc.) in the requested voice,
 * while preserving the data structure (scores, labels, arrays).
 */
async function generateV2Section(
  apiKey: string,
  sectionId: string,
  voiceId: VoiceId,
  scoreRows: Array<Record<string, unknown>>,
  archetypeResult: { primary: { name: string } },
  originalContentJson: string,
  originalTitle: string,
): Promise<Record<string, unknown>> {
  const voiceInstruction = getVoiceInstruction(voiceId);

  const systemPrompt = `You are a senior personality coach rewriting a section of a premium personality report in a specific narrative voice.

${voiceInstruction}

CRITICAL RULES:
- Never use diagnostic language ("you have", "you suffer from", "disorder", "condition")
- Frame all findings as patterns, not pathologies
- Always use growth-oriented framing
- Never expose raw numerical scores
- End every section with agency

WRITING RULES (apply to every voice):
- Separate clauses with commas, colons, semicolons, or parentheses. Do not use em dashes.
- Express contrasts as progressions.
- Create emphasis with short standalone sentences.
- Vary sentence openings. Avoid starting consecutive sentences with "You" or "Your."
- Choose specific language over vague intensifiers.
- Write in a natural, human cadence.

TASK:
You are rewriting section ${sectionId} ("${originalTitle}") in the ${voiceId} voice.
The original section is provided as structured JSON below.

You MUST return valid JSON with the EXACT SAME structure and field names as the original.
Rewrite all prose/narrative text fields in the ${voiceId} voice.
Preserve all data fields (numbers, percentiles, arrays of labels, stage numbers, priority numbers).
Keep the same number of items in arrays.

Fields that contain prose to rewrite: tldr, summary (in summary_table rows), description, narrative, role, cost, vulnerability_themes, coping_style, interpretation, self_compassion, how_you_love, motivation_type, life_satisfaction, finding, recommendation, why, phrase, thirty_day_challenge, actions, coach_question.
Fields to preserve as-is: dimension, label, name, title, trait_name, percentile, stage_number, priority, area, score, score_label, gifts, challenges (rewrite text but keep same count).`;

  const userPrompt = `ORIGINAL SECTION JSON:
${originalContentJson}

ASSESSMENT DATA:
ARCHETYPE: ${archetypeResult.primary.name}
SCORES: ${JSON.stringify(scoreRows)}

Rewrite this section in the ${voiceId} voice. Return the same JSON structure with rewritten prose.`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: MAX_TOKENS_PER_SECTION,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content);

  return {
    title: originalTitle,
    content_markdown: JSON.stringify(parsed),
    coach_question: parsed.coach_question ?? "",
    generated_at: new Date().toISOString(),
    voice_id: voiceId,
    min_tier: getSectionTier(sectionId),
  };
}

/**
 * Returns a compact voice instruction block for the given voice ID.
 * These mirror the full prompt blocks from config.ts but are trimmed
 * for Edge Function use (no example phrases, shorter descriptions).
 */
function getVoiceInstruction(voiceId: VoiceId): string {
  const instructions: Record<VoiceId, string> = {
    intellectual: `VOICE & TONE: THE INTELLECTUAL
Write for someone who thinks in systems, patterns, and frameworks. They value precision over platitudes.
- Use complex, multi-clause sentences that show how ideas connect
- Lead with the insight, then provide evidence
- Use frameworks when they illuminate. Be assertive and clear
- Aim for "respected colleague sharing a research finding"`,

    adventurer: `VOICE & TONE: THE ADVENTURER
Write for someone who lives in motion. They crave actionable insight and respect honesty over comfort.
- Short, punchy sentences. Momentum over explanation
- Use vivid metaphors and concrete imagery. Be bold and direct
- Challenge them. Point out contradictions, dare them to act
- Aim for "trail guide who's done this route before"`,

    connector: `VOICE & TONE: THE CONNECTOR
Write for someone who understands the world through relationships. They value being seen, not just analyzed.
- Write conversationally, like the first hour of a deep friendship
- Use relational metaphors: bridges, circles, conversations
- Connect traits to relationships. Give spacious pacing
- Aim for "trusted friend who happens to be a therapist"`,

    steward: `VOICE & TONE: THE STEWARD
Write for someone who values reliability, evidence, and clear structure. They trust data over dramatic language.
- Clear, well-structured sentences with no unnecessary flourishes
- Lead with evidence, then interpretation
- Be reassuring without being patronizing. Use concrete examples
- Aim for "trusted family doctor reading lab results"`,

    challenger: `VOICE & TONE: THE CHALLENGER
Write for someone who leads, decides, and acts. Zero patience for vagueness.
- Short, declarative sentences. Say it once. Say it well
- No hedging. Use strategic metaphors: chess moves, architecture, leverage
- Point out blind spots without apologizing. Be action-oriented
- Aim for "executive coach who charges $500/hour"`,

    sensitive: `VOICE & TONE: THE SENSITIVE
Write for someone who experiences the world at high resolution. They need to feel safe before hearing difficult truths.
- Spacious, flowing prose. Give them room to breathe between insights
- Rich metaphors and sensory language. Approach difficult findings gently
- Honor their depth. Never label them as "too sensitive"
- Aim for "poet-therapist who truly sees you"`,
  };

  return instructions[voiceId];
}

/**
 * Map section IDs to tier requirements.
 */
function getSectionTier(sectionId: string): string {
  const tiers: Record<string, string> = {
    // v1 (RS01-RS12)
    RS01: "free", RS02: "free", RS03: "free", RS04: "free",
    RS05: "free", RS06: "free", RS07: "free",
    RS08: "insight", RS09: "insight",
    RS10: "growth", RS11: "growth",
    RS12: "mastery",
    // v2 (S1-S8)
    S1: "free", S2: "free", S3: "free", S4: "free",
    S5: "insight", S6: "insight",
    S7: "growth",
    S8: "mastery",
  };
  return tiers[sectionId] ?? "free";
}

/**
 * Mark a version as failed.
 */
async function markFailed(
  supabase: ReturnType<typeof createSupabaseClient>,
  versionId: string,
  reason: string,
): Promise<void> {
  console.error(`[decoded-rewrite-voice] Failed: ${reason}`);
  await supabase
    .from("assessment_report_versions")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", versionId);
}
