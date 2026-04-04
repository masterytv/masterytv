/**
 * Export User Data — TD-006
 *
 * POST /functions/v1/export-user-data
 * Auth: JWT required (user can only export their own data)
 *
 * Generates a complete JSON export of all user data:
 * - Profile (name, email, timezone, preferences)
 * - Messages (all conversations)
 * - Memory facts (what the coach knows about them)
 * - Entities (people, projects, etc.)
 * - Commitments (goals and accountability items)
 * - Coach profile (personalization dimensions)
 * - Coaching challenges (active/completed)
 * - Conversation summaries
 *
 * Returns the export as a JSON download.
 *
 * Architecture: ARCHITECTURE.md §7 (Data Governance)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { errorResponse, logError } from "../_shared/errors.ts";

const FUNCTION_NAME = "export-user-data";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  let userId: string | undefined;

  try {
    // ── 1. Authenticate ──
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    // ── 2. Use service role for full data access ──
    const supabase = createSupabaseClient();

    console.log(`[${FUNCTION_NAME}] Exporting data for user ${userId}`);

    // ── 3. Fetch all user data ──
    const [
      profileResult,
      messagesResult,
      factsResult,
      entitiesResult,
      commitmentsResult,
      coachProfileResult,
      challengesResult,
      summariesResult,
      onboardingResult,
      agendaResult,
    ] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase.from("messages").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("memory_facts").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("user_entities").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("commitments").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("coach_profiles").select("*").eq("user_id", userId).single(),
      supabase.from("coaching_challenges").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("conversation_summaries").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("onboarding_state").select("*").eq("user_id", userId).single(),
      supabase.from("coaching_agenda").select("*").eq("user_id", userId).order("created_at"),
    ]);

    // ── 4. Assemble export ──
    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        format_version: "1.0",
        service: "Mastery Coach by Google Antigravity",
      },
      profile: profileResult.data
        ? {
            name: profileResult.data.name,
            email: profileResult.data.email,
            timezone: profileResult.data.timezone,
            preferred_channel: profileResult.data.preferred_channel,
            morning_briefing_time: profileResult.data.morning_briefing_time,
            subscription_tier: profileResult.data.subscription_tier,
            created_at: profileResult.data.created_at,
          }
        : null,
      coach_profile: coachProfileResult.data
        ? {
            directness: coachProfileResult.data.directness,
            framing: coachProfileResult.data.framing,
            warmth: coachProfileResult.data.warmth,
            autonomy: coachProfileResult.data.autonomy,
            pacing: coachProfileResult.data.pacing,
            evidence_style: coachProfileResult.data.evidence_style,
            accountability: coachProfileResult.data.accountability,
            challenge_level: coachProfileResult.data.challenge_level,
            source: coachProfileResult.data.source,
            confidence: coachProfileResult.data.confidence,
          }
        : null,
      onboarding: onboardingResult.data
        ? {
            status: onboardingResult.data.status,
            starting_point: onboardingResult.data.starting_point,
            linkedin_data: onboardingResult.data.linkedin_data,
            research_summary: onboardingResult.data.research_summary,
          }
        : null,
      messages: (messagesResult.data ?? []).map((m) => ({
        role: m.role,
        channel: m.channel,
        content: m.content,
        conversation_id: m.conversation_id,
        created_at: m.created_at,
      })),
      memory_facts: (factsResult.data ?? []).map((f) => ({
        category: f.category,
        fact: f.fact,
        confidence: f.confidence,
        source: f.source,
        created_at: f.created_at,
      })),
      entities: (entitiesResult.data ?? []).map((e) => ({
        name: e.name,
        type: e.type,
        attributes: e.attributes,
        created_at: e.created_at,
      })),
      commitments: (commitmentsResult.data ?? []).map((c) => ({
        description: c.description,
        type: c.type,
        status: c.status,
        due_date: c.due_date,
        created_at: c.created_at,
        completed_at: c.completed_at,
      })),
      coaching_challenges: (challengesResult.data ?? []).map((c) => ({
        title: c.title,
        context: c.context,
        framework: c.framework,
        framework_phase: c.framework_phase,
        status: c.status,
        created_at: c.created_at,
      })),
      conversation_summaries: (summariesResult.data ?? []).map((s) => ({
        summary: s.summary,
        key_topics: s.key_topics,
        framework_used: s.framework_used,
        message_count: s.message_count,
        created_at: s.created_at,
      })),
      coaching_agenda: (agendaResult.data ?? []).map((a) => ({
        type: a.type,
        content: a.content,
        status: a.status,
        created_at: a.created_at,
      })),
    };

    const totalRecords =
      exportData.messages.length +
      exportData.memory_facts.length +
      exportData.entities.length +
      exportData.commitments.length +
      exportData.coaching_challenges.length +
      exportData.conversation_summaries.length;

    console.log(
      `[${FUNCTION_NAME}] Export complete. ${totalRecords} records exported.`
    );

    // ── 5. Return as downloadable JSON ──
    const filename = `mastery-coach-export-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[${FUNCTION_NAME}] Fatal error:`, err.message);
    await logError(FUNCTION_NAME, err, userId);
    return errorResponse("INTERNAL_ERROR", "Failed to export data.", 500, corsHeaders);
  }
});
