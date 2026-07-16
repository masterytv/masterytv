/**
 * Onboarding Confirm Edge Function
 * 
 * POST /functions/v1/onboarding-confirm
 * Body: { confirmed_research: ResearchResults }
 * Auth: JWT required
 * 
 * Stores confirmed research as memory_facts with embeddings
 * and initializes user_entities from research data.
 * 
 * Architecture: SPRINT.md S3.4
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { generateEmbeddings, logEmbeddingCost } from "../_shared/embeddings.ts";

const FUNCTION_NAME = "onboarding-confirm";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  let userId: string | undefined;

  try {
    // Authenticate
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    const body = await req.json();
    const research = body.confirmed_research;

    if (!research) {
      return errorResponse("BAD_REQUEST", "confirmed_research is required", 400, corsHeaders);
    }

    const supabase = createSupabaseClient();

    // ── Build facts from research ──
    const facts: Array<{ category: string; subject: string; content: string; importance: number }> = [];

    if (research.company_name) {
      facts.push({
        category: "business",
        subject: "Company",
        content: `Works at/founded ${research.company_name}${research.company_description ? ` — ${research.company_description}` : ""}`,
        importance: 0.9,
      });
    }

    if (research.industry) {
      facts.push({ category: "business", subject: "Industry", content: research.industry, importance: 0.7 });
    }

    if (research.stage) {
      facts.push({ category: "business", subject: "Company Stage", content: research.stage, importance: 0.8 });
    }

    if (research.user_role) {
      facts.push({ category: "business", subject: "Role", content: research.user_role, importance: 0.8 });
    }

    if (research.user_background) {
      facts.push({ category: "personal", subject: "Background", content: research.user_background, importance: 0.8 });
    }

    if (research.linkedin_headline) {
      facts.push({ category: "personal", subject: "LinkedIn Headline", content: research.linkedin_headline, importance: 0.6 });
    }

    // Add detected challenges as facts
    if (research.challenges_detected?.length > 0) {
      for (const challenge of research.challenges_detected) {
        facts.push({ category: "challenge", subject: "Detected Challenge", content: challenge, importance: 0.7 });
      }
    }

    // Add key people
    if (research.key_people?.length > 0) {
      for (const person of research.key_people) {
        facts.push({ category: "person", subject: "Key Person", content: person, importance: 0.5 });
      }
    }

    // ── Generate embeddings in batch ──
    const factTexts = facts.map((f) => `${f.subject}: ${f.content}`);
    let embeddings: number[][] = [];
    try {
      if (factTexts.length > 0) {
        embeddings = await generateEmbeddings(factTexts);
        await logEmbeddingCost(userId, "onboarding-confirm", factTexts);
      }
    } catch (e) {
      console.warn(`[${FUNCTION_NAME}] Embedding generation failed:`, (e as Error).message);
    }

    // ── Store as confirmed memory facts ──
    const factsToInsert = facts.map((f, i) => ({
      user_id: userId!,
      category: f.category,
      subject: f.subject,
      content: f.content,
      importance: f.importance,
      is_confirmed: true,
      program: "general", // PC2.2: this onboarding is the executive intake
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }));

    if (factsToInsert.length > 0) {
      await supabase.from("memory_facts").insert(factsToInsert);
    }

    // ── Initialize user_entities ──
    const entities: Array<{ user_id: string; entity_type: string; name: string; description: string | null }> = [];

    if (research.company_name) {
      entities.push({
        user_id: userId,
        entity_type: "goal", // Company is a recurring context
        name: research.company_name,
        description: research.company_description || null,
      });
    }

    if (research.key_people?.length > 0) {
      for (const person of research.key_people) {
        entities.push({
          user_id: userId,
          entity_type: "person",
          name: person,
          description: null,
        });
      }
    }

    if (entities.length > 0) {
      await supabase.from("user_entities").insert(entities);
    }

    // ── Set psychological orientation from starting point choice ──
    const startingPointType = body.starting_point_type;
    if (startingPointType && userId) {
      // Map choice to Regulatory Focus Theory dimensions
      const focusMap: Record<string, { promotion: number; prevention: number }> = {
        challenge: { promotion: 0.3, prevention: 0.7 },  // Pain avoidance orientation
        goal:      { promotion: 0.8, prevention: 0.2 },  // Goal pursuit orientation
        systematic:{ promotion: 0.5, prevention: 0.5 },  // Balanced/systems orientation
      };
      const focus = focusMap[startingPointType] || focusMap.systematic;

      await supabase
        .from("coach_profiles")
        .upsert({
          user_id: userId,
          program: "general", // PC2.2: executive onboarding seeds the general profile
          promotion_focus: focus.promotion,
          prevention_focus: focus.prevention,
          source: "self_reported",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,program" });
    }

    // Update onboarding state
    await supabase
      .from("onboarding_state")
      .update({
        current_step: "coaching_letter",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return jsonResponse(
      { success: true, facts_stored: factsToInsert.length, entities_created: entities.length },
      200,
      corsHeaders
    );
  } catch (error) {
    await logError(FUNCTION_NAME, error as Error, userId);
    console.error(`[${FUNCTION_NAME}]`, (error as Error).message);
    return errorResponse("INTERNAL_ERROR", "Failed to confirm research.", 500, corsHeaders);
  }
});
