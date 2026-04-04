/**
 * Onboarding Research Edge Function
 * 
 * POST /functions/v1/onboarding-research
 * Body: { linkedin_url: string, website_url: string, starting_point_type: string, starting_point_input: string }
 * Auth: JWT required
 * 
 * Calls Firecrawl + LinkdAPI to gather background research on the user,
 * then synthesizes via GPT-4o-mini into structured research results.
 * 
 * Architecture: SPRINT.md S3.3
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse, jsonResponse } from "../_shared/errors.ts";

const FUNCTION_NAME = "onboarding-research";

// ─── FIRECRAWL INTEGRATION ─────────────────────────────────────────────

async function scrapeWebsite(websiteUrl: string): Promise<Record<string, unknown> | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey || !websiteUrl) return null;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ["extract"],
        extract: {
          schema: {
            type: "object",
            properties: {
              company_name: { type: "string" },
              company_description: { type: "string" },
              industry: { type: "string" },
              products_services: { type: "array", items: { type: "string" } },
              team_size_hint: { type: "string" },
              recent_news: { type: "array", items: { type: "string" } },
              target_market: { type: "string" },
              stage: {
                type: "string",
                enum: ["pre-revenue", "early-stage", "growth", "scale-up", "enterprise", "unknown"],
              },
            },
          },
          prompt: "Extract company information from this website. Focus on what the company does, its industry, stage, and any recent updates.",
        },
      }),
    });

    if (!response.ok) {
      console.error(`[${FUNCTION_NAME}] Firecrawl error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.extract || null;
  } catch (e) {
    console.error(`[${FUNCTION_NAME}] Firecrawl exception:`, (e as Error).message);
    return null;
  }
}

// ─── LINKDAPI INTEGRATION ──────────────────────────────────────────────

async function getLinkedInProfile(linkedinUrl: string): Promise<Record<string, unknown> | null> {
  const apiKey = Deno.env.get("LINKDAPI_API_KEY");
  if (!apiKey || !linkedinUrl) return null;

  try {
    // Extract username from URL
    // Handles: linkedin.com/in/username, linkedin.com/in/username/, etc.
    const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    if (!match) {
      console.error(`[${FUNCTION_NAME}] Could not extract LinkedIn username from URL`);
      return null;
    }
    const username = match[1];

    const response = await fetch(
      `https://api.linkdapi.com/get_full_profile?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "X-linkdapi-apikey": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`[${FUNCTION_NAME}] LinkdAPI error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error(`[${FUNCTION_NAME}] LinkdAPI exception:`, (e as Error).message);
    return null;
  }
}

// ─── GPT-4o-mini SYNTHESIS ─────────────────────────────────────────────

async function synthesizeResearch(
  websiteData: Record<string, unknown> | null,
  linkedinData: Record<string, unknown> | null,
  startingPointType: string,
  startingPointInput: string
): Promise<Record<string, unknown>> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const prompt = `You are synthesizing background research for a coaching onboarding process.

WEBSITE DATA (may be null if unavailable):
${websiteData ? JSON.stringify(websiteData, null, 2) : "Not available — no website provided or scraping failed."}

LINKEDIN PROFILE DATA (may be null if unavailable):
${linkedinData ? JSON.stringify(linkedinData, null, 2) : "Not available — no LinkedIn URL provided or API failed."}

USER'S STARTING POINT:
- Type: ${startingPointType} (challenge = specific problem, goal = aspiration, systematic = review everything)
- What they said: "${startingPointInput}"

Synthesize this into a structured research summary. Return ONLY valid JSON with this schema:
{
  "company_name": "string or null",
  "company_description": "1-2 sentence summary or null",
  "industry": "string or null",
  "stage": "pre-revenue|early-stage|growth|scale-up|enterprise|unknown",
  "user_background": "1-2 sentence summary of who this person is professionally",
  "user_role": "their current role/title or null",
  "key_people": ["names of people mentioned in their profile/company"],
  "recent_news": ["any recent developments from website or LinkedIn"],
  "challenges_detected": ["potential coaching challenges inferred from their context"],
  "linkedin_headline": "their LinkedIn headline or null",
  "linkedin_summary": "their LinkedIn about/summary or null",
  "experience": [{"title": "Job Title", "company": "Company Name", "duration": "2 years"}]
}

Rules:
- Use available data. If both sources are null, still generate what you can from the user's input.
- challenges_detected: infer 2-4 potential coaching topics based on their role, stage, and stated starting point.
- IMPORTANT: In "user_background", write in second person ("You are an entrepreneur...") not third person ("The user is..."). This text will be shown directly to the person.
- Be concise. This data feeds into a coaching letter.
- Return ONLY valid JSON.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT-4o-mini error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Log cost
  const supabase = createSupabaseClient();
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;
  const cost = (tokensIn / 1_000_000) * 0.15 + (tokensOut / 1_000_000) * 0.6;

  await supabase.from("cost_tracking").insert({
    purpose: FUNCTION_NAME,
    model: "gpt-4o-mini",
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: cost,
  });

  return result;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────

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
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    // Parse request
    const body = await req.json();
    const { linkedin_url, website_url, starting_point_type, starting_point_input } = body;

    if (!starting_point_type || !starting_point_input) {
      return errorResponse("BAD_REQUEST", "starting_point_type and starting_point_input are required", 400, corsHeaders);
    }

    // Run research in parallel
    const [websiteData, linkedinData] = await Promise.all([
      website_url ? scrapeWebsite(website_url) : Promise.resolve(null),
      linkedin_url ? getLinkedInProfile(linkedin_url) : Promise.resolve(null),
    ]);

    // Synthesize with GPT-4o-mini
    const results = await synthesizeResearch(
      websiteData,
      linkedinData,
      starting_point_type,
      starting_point_input
    );

    // Store raw results in onboarding_state
    const supabase = createSupabaseClient();
    await supabase
      .from("onboarding_state")
      .update({
        research_results: results,
        current_step: "research_confirm",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Also update user record with URLs
    await supabase
      .from("users")
      .update({
        linkedin_url: linkedin_url || null,
        website_url: website_url || null,
      })
      .eq("id", userId);

    return jsonResponse(results, 200, corsHeaders);
  } catch (error) {
    await logError(FUNCTION_NAME, error as Error, userId);
    console.error(`[${FUNCTION_NAME}]`, (error as Error).message);
    return errorResponse("INTERNAL_ERROR", "Research failed. Please try again.", 500, corsHeaders);
  }
});
