/**
 * Coaching Letter Edge Function
 * 
 * POST /functions/v1/onboarding-letter
 * Body: { starting_point: string, user_input: string }
 * Auth: JWT required
 * 
 * Generates a personalized coaching letter using Claude, referencing
 * confirmed research from memory_facts.
 * 
 * Architecture: SPRINT.md S3.5, PRD §3.1
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { callClaude, extractText, calculateCost } from "../_shared/anthropic.ts";

const FUNCTION_NAME = "onboarding-letter";

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
    const { starting_point, user_input } = body;

    const supabase = createSupabaseClient();

    // Load confirmed research facts
    const { data: facts } = await supabase
      .from("memory_facts")
      .select("category, subject, content")
      .eq("user_id", userId)
      .eq("is_confirmed", true)
      .order("importance", { ascending: false })
      .limit(20);

    // Load user profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    // Build facts context
    const factsContext = (facts ?? [])
      .map((f: { category: string; subject: string; content: string }) => 
        `- [${f.category}] ${f.subject}: ${f.content}`
      )
      .join("\n");

    const userName = userProfile?.name || "there";

    // Generate coaching letter via Claude
    const systemPrompt = `You are writing a coaching letter as Coach, the Mastery Coach AI. This letter is the first interaction between you and a new client. It must be warm, insightful, and demonstrate that you've done your homework.

LETTER STRUCTURE (follow this exactly):
1. **Personal greeting** — Use their name, reference something specific from their background
2. **What I understand** — Summarize what you know about them (from research facts). Be specific, not generic.
3. **Your starting point** — Reflect back their stated challenge/goal and why it matters
4. **My proposed approach** — Suggest 2-3 coaching frameworks or methods that fit their situation. Explain WHY each fits.
5. **How we'll work together** — Set expectations: daily check-ins possible, web chat + email + Telegram, accountability tracking
6. **Why responding matters** — Explain that the coaching gets better with every interaction (learning their style, building memory)
7. **What happens next** — Clear next step (start chatting, set up morning briefings, etc.)
8. **Sign-off** — Warm, forward-looking

TONE: Professional but warm. Like a letter from a mentor who genuinely cares and has already invested time understanding you. Use contractions. Be concise — 400-600 words max.

FORMAT: Markdown with headers for each section. Use bold for emphasis sparingly.`;

    const userMessage = `Write a coaching letter for this new client:

NAME: ${userName}

STARTING POINT TYPE: ${starting_point || "challenge"}
WHAT THEY SAID: "${user_input || "I want to grow as a leader and entrepreneur"}"

CONFIRMED RESEARCH:
${factsContext || "No research available — use their stated starting point to personalize."}`;

    const response = await callClaude({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1500,
    });

    const letter = extractText(response);

    // Log cost
    const cost = calculateCost(response.usage);
    await supabase.from("cost_tracking").insert({
      user_id: userId,
      purpose: FUNCTION_NAME,
      model: response.model,
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
      cost_usd: cost,
    });

    // Store letter in onboarding state
    await supabase
      .from("onboarding_state")
      .update({
        coaching_letter: letter,
        current_step: "coaching_letter",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return jsonResponse({ letter }, 200, corsHeaders);
  } catch (error) {
    await logError(FUNCTION_NAME, error as Error, userId);
    console.error(`[${FUNCTION_NAME}]`, (error as Error).message);
    return errorResponse("INTERNAL_ERROR", "Failed to generate coaching letter.", 500, corsHeaders);
  }
});
