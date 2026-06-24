/**
 * Edge Function: decoded-compatibility-report
 *
 * Generates per-user compatibility reports written in each person's narrative voice.
 * Follows the same architecture as decoded-generate-report:
 *   auth → data load → OpenAI → save.
 *
 * Request body:
 *   { invite_id: string, force_regenerate?: boolean }
 *
 * Flow:
 *   1. Validate auth + invite membership
 *   2. Return cached report if available
 *   3. Verify consent (status = consented|connected)
 *   4. Load both users' assessment reports via service-role
 *   5. Resolve narrative voices from archetypes
 *   6. Generate TWO reports in parallel (one per user, each in their voice)
 *   7. Save both to decoded_invites, update status to 'connected'
 *   8. Return the caller's personalized report
 *
 * Deploy with: supabase functions deploy decoded-compatibility-report --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { handleCors, getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse, jsonResponse, logError, withRetry, isRetryableError } from "../_shared/errors.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

// ─────────────────────────────────────────────────────────────────────────────
// Voice Configuration (mirrors decoded-generate-report/index.ts)
// Edge Functions can't import from src/ — must inline.
// ─────────────────────────────────────────────────────────────────────────────

type VoiceId = "intellectual" | "adventurer" | "connector" | "steward" | "challenger" | "sensitive";

/**
 * Archetype → Voice mapping (mirrors src/lib/decoded/report/voice/config.ts)
 * 16 archetypes → 6 voices. ADR-02: Simple map lookup.
 */
const ARCHETYPE_VOICE_MAP: Record<string, VoiceId> = {
  Architect: "intellectual",
  Sage: "intellectual",
  Strategist: "intellectual",
  Explorer: "adventurer",
  Catalyst: "adventurer",
  Maverick: "adventurer",
  Rebel: "adventurer",
  Advocate: "connector",
  Diplomat: "connector",
  Luminary: "connector",
  Sentinel: "steward",
  Guardian: "steward",
  Anchor: "steward",
  Commander: "challenger",
  Healer: "sensitive",
  Artist: "sensitive",
};

const FALLBACK_VOICE: VoiceId = "connector";

// ─────────────────────────────────────────────────────────────────────────────
// Voice Prompt Blocks (mirrors VOICE_PROFILES[id].promptBlock from config.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_PROMPT_BLOCKS: Record<VoiceId, string> = {
  intellectual: `VOICE & TONE: THE INTELLECTUAL
You are writing for someone who thinks in systems, patterns, and frameworks. They value precision over platitudes and insight over encouragement.

WRITING STYLE:
- Use complex, multi-clause sentences that show how ideas connect
- Lead with the insight, then provide evidence. Do not bury the point
- Use frameworks and models when they illuminate (e.g., "This creates a feedback loop between...")
- Be assertive and clear. Avoid hedging language: "might," "perhaps," "it seems"
- Structure matters: use logical progression, cause to effect, pattern to implication
- Occasional metaphors are fine, but only if they sharpen understanding. Never for decoration
- Aim for "respected colleague sharing a research finding": intellectually generous, not emotionally effusive

TONE ANCHORS:
- Professional respect rather than clinical distance
- Curiosity about their complexity rather than judgment of their contradictions
- Insight that makes them stop and think rather than feel-good affirmations`,

  adventurer: `VOICE & TONE: THE ADVENTURER
You are writing for someone who lives in motion. They get bored with theory and crave insight they can act on immediately. They respect honesty more than comfort.

WRITING STYLE:
- Short, punchy sentences. Momentum over explanation
- Use vivid metaphors and concrete imagery. Make abstract traits feel tangible
- Be bold and direct. They respect confrontation more than diplomacy
- Challenge them. Point out contradictions, dare them to act
- Use action verbs: "You charge into...", "You resist...", "You break through..."
- Vary rhythm: short declarative sentences followed by one longer one for emphasis
- Aim for "trail guide who's done this route before": confident, energetic, no hand-holding

TONE ANCHORS:
- Respect their independence. Never condescending
- Energy that matches theirs, not clinical or detached
- Challenge that says "you can handle the truth"`,

  connector: `VOICE & TONE: THE CONNECTOR
You are writing for someone who understands the world through relationships. They process insight through "how does this affect the people I care about?" They value being seen, not just analyzed.

WRITING STYLE:
- Write conversationally, like the first hour of a deep friendship
- Use relational metaphors: bridges, circles, conversations, rooms
- Balance honesty with gentleness. They can handle truth, but delivery matters
- Connect traits to relationships: "This shows up in how you argue, how you love, how you listen"
- Give them spacious pacing, room to feel what they're reading
- Use second person warmly: "You tend to..." not "Subjects with this profile..."
- Aim for "trusted friend who happens to be a therapist": intimate, specific, caring

TONE ANCHORS:
- Warmth that feels genuine rather than performative
- Insight that connects their inner world to their outer relationships
- Make them feel understood rather than categorized`,

  steward: `VOICE & TONE: THE STEWARD
You are writing for someone who values reliability, evidence, and clear structure. They trust data over dramatic language and want to understand exactly where they stand.

WRITING STYLE:
- Clear, well-structured sentences with no unnecessary flourishes
- Lead with evidence, then interpretation
- Be reassuring without being patronizing. They worry, so give them solid ground to stand on
- Use concrete examples over abstract metaphors
- Organize clearly: consistent patterns, logical flow, no surprises
- Acknowledge their conscientiousness. They've thought about this already
- Aim for "trusted family doctor reading lab results": competent, thorough, reassuring

TONE ANCHORS:
- Stability and groundedness in every paragraph
- Validation that their careful, structured approach is a strength
- Honest about challenges, but always with a clear path forward`,

  challenger: `VOICE & TONE: THE CHALLENGER
You are writing for someone who leads, decides, and acts. They have zero patience for vagueness and respect people who can match their intensity. Don't soften, don't hedge, don't ramble.

WRITING STYLE:
- Short, declarative sentences. Say it once. Say it well
- No hedging: replace "you might consider" with "do this"
- Use strategic metaphors: chess moves, architecture, leverage
- Point out blind spots without apologizing. They respect the mirror, even when it's unflattering
- Be action-oriented: every insight should end with an implication or a move
- Never repeat yourself. They got it the first time
- Aim for "executive coach who charges $500/hour": efficient, incisive, unapologetic

TONE ANCHORS:
- Respect their competence. Never explain the obvious
- Challenge at their level. They've heard the basics
- Treat weakness as untapped leverage rather than something to fix`,

  sensitive: `VOICE & TONE: THE SENSITIVE
You are writing for someone who experiences the world at high resolution. They feel everything: beauty, pain, nuance, contradiction. They need to feel safe before they can hear difficult truths.

WRITING STYLE:
- Spacious, flowing prose. Give them room to breathe between insights
- Rich metaphors and sensory language. They think in images and feelings
- Approach difficult findings gently. Lead with validation, then the observation
- Honor their depth: "Your sensitivity is how you access what most people miss"
- Use nature and art metaphors: "like turning a painting to see it in different light"
- Never label them as "too sensitive" or suggest they need to "toughen up"
- Aim for "poet-therapist who truly sees you": tender, specific, never dismissive

TONE ANCHORS:
- Safety first. They need to trust you before they'll open up
- Reverence for their inner world, which is rich and worthy of exploration
- Gentle honesty that honors their courage in taking this assessment`,
};

const GLOBAL_VOICE_RULES = `CRITICAL WRITING RULES (apply to every voice):
- Separate clauses with commas, colons, semicolons, or parentheses. Do not use em dashes.
- Express contrasts as progressions: "less about distance and more about freedom."
- Create emphasis with short standalone sentences rather than dramatic punctuation.
- Vary sentence openings across each paragraph. Avoid starting consecutive sentences with "You" or "Your."
- Choose specific language over vague intensifiers.
- Write in a natural, human cadence. Avoid formulaic AI patterns.`;

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(
  readerName: string,
  otherName: string,
  voiceBlock: string,
): string {
  return `You are a personality compatibility analyst for Decoded by MasteryTV. 
You produce PUNCHY, insightful compatibility reports between two people across THREE relationship contexts.

${GLOBAL_VOICE_RULES}

${voiceBlock}

IMPORTANT PERSPECTIVE RULES:
- You are writing FOR ${readerName}. They are "you" throughout.
- ${otherName} is the other person — refer to them by name.
- "advice_for_reader" = advice directed at ${readerName} (use "you")
- "advice_for_other" = advice about how ${readerName} should understand ${otherName}
- Frame everything from ${readerName}'s perspective — what THEY should know about this relationship.
- Each field: 2-3 sentences MAX.
- No generic "communication is key" advice. Be specific to their actual profiles.
- Each context should feel DIFFERENT — what works romantically may not work at work.

Return JSON with this structure:
{
  "headline": "A one-line summary of the dynamic, framed for ${readerName} (e.g., 'Your fire meets their earth')",
  "intimate": {
    "label": "Intimate / Partnership",
    "chemistry": "What naturally clicks between you and ${otherName} as romantic partners (2-3 sentences)",
    "friction": "Where you'll clash in a relationship and why (2-3 sentences)",
    "superpower": "What makes you powerful as a couple (2 sentences)",
    "watch_out": "The pattern that could quietly erode this relationship (2 sentences)",
    "advice_for_reader": "Specific advice for you as a partner (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about how ${otherName} operates as a partner (1-2 sentences)"
  },
  "family_friendship": {
    "label": "Family / Friendship",
    "chemistry": "Why you'd naturally enjoy ${otherName}'s company as friends or family (2-3 sentences)",
    "friction": "The recurring tension point in this friendship/family dynamic (2-3 sentences)",
    "superpower": "What this friendship or family bond brings out in both of you (2 sentences)",
    "watch_out": "The habit that could create distance between you (2 sentences)",
    "advice_for_reader": "Specific advice for you as a friend/family member (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about how ${otherName} operates as a friend (1-2 sentences)"
  },
  "work": {
    "label": "Working Relationship",
    "chemistry": "Why you and ${otherName} would work well together professionally (2-3 sentences)",
    "friction": "Where professional tension will show up between you (2-3 sentences)",
    "superpower": "What you can accomplish together that neither could alone (2 sentences)",
    "watch_out": "The dynamic that could undermine your professional relationship (2 sentences)",
    "advice_for_reader": "Specific advice for you as a colleague (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about working with ${otherName} (1-2 sentences)"
  },
  "compatibility_dimensions": [
    { "dimension": "Communication", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Emotional Connection", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Conflict Style", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Growth Alignment", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Values Match", "score": 1-10, "insight": "one sentence" }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Helper (raw fetch with retry — same pattern as decoded-generate-report)
// ─────────────────────────────────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured in Supabase secrets");

  const response = await withRetry(
    async () => {
      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${body}`);
      }

      return res;
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      functionName: "decoded-compatibility-report",
      shouldRetry: isRetryableError,
    },
  );

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return JSON.parse(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getCorsHeaders(req);

  try {
    // Health check
    if (req.method === "GET") {
      return jsonResponse(
        { status: "ok", function: "decoded-compatibility-report", version: 1 },
        200,
        headers,
      );
    }

    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, headers);
    }

    const body = await req.json();
    const { invite_id, force_regenerate } = body;

    if (!invite_id) {
      return errorResponse("INVALID_INPUT", "invite_id required", 400, headers);
    }

    // Auth — verify the caller is a real user
    const userClient = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401, headers);
    }

    // Service-role client bypasses RLS to read both users' data
    const admin = createSupabaseClient();

    // Load the invite
    const { data: invite, error: inviteError } = await admin
      .from("decoded_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      return errorResponse("NOT_FOUND", "Invite not found", 404, headers);
    }

    // Verify caller is part of this invite
    if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
      return errorResponse("FORBIDDEN", "Not authorized for this invite", 403, headers);
    }

    // Only generate if both parties have consented
    if (invite.status !== "consented" && invite.status !== "connected") {
      return errorResponse(
        "PRECONDITION_FAILED",
        "Both users must consent before generating a compatibility report",
        400,
        headers,
      );
    }

    const isInviter = invite.inviter_id === user.id;

    // ── Return cached per-user report if available ──
    if (!force_regenerate) {
      const cachedReport = isInviter
        ? invite.compatibility_report_inviter
        : invite.compatibility_report_recipient;

      if (cachedReport) {
        console.log(`[decoded-compatibility-report] Returning cached report for ${isInviter ? "inviter" : "recipient"}`);
        return jsonResponse({ success: true, report: cachedReport, cached: true }, 200, headers);
      }

      // Fallback: legacy shared report
      if (invite.compatibility_report) {
        return jsonResponse({ success: true, report: invite.compatibility_report, cached: true }, 200, headers);
      }
    }

    // ── Load both users' assessment reports ──
    const [inviterReportResult, recipientReportResult] = await Promise.all([
      invite.inviter_report_id
        ? admin.from("assessment_reports")
            .select("sections, archetype_base, voice_profile")
            .eq("id", invite.inviter_report_id)
            .single()
        : null,
      invite.recipient_report_id
        ? admin.from("assessment_reports")
            .select("sections, archetype_base, voice_profile")
            .eq("id", invite.recipient_report_id)
            .single()
        : null,
    ]);

    if (!inviterReportResult?.data || !recipientReportResult?.data) {
      const missing = [];
      if (!invite.inviter_report_id) missing.push("inviter_report_id is null");
      if (!invite.recipient_report_id) missing.push("recipient_report_id is null");
      if (invite.inviter_report_id && !inviterReportResult?.data) missing.push("inviter report not found");
      if (invite.recipient_report_id && !recipientReportResult?.data) missing.push("recipient report not found");

      console.error(`[decoded-compatibility-report] Missing reports: ${missing.join(", ")}`);
      return errorResponse(
        "PRECONDITION_FAILED",
        `Both users must have completed reports (${missing.join(", ")})`,
        400,
        headers,
      );
    }

    // ── Extract profile data ──
    const inviterSections = inviterReportResult.data.sections as Record<string, unknown> | null;
    const recipientSections = recipientReportResult.data.sections as Record<string, unknown> | null;
    const inviterS1 = inviterSections?.S1;
    const recipientS1 = recipientSections?.S1;
    const inviterArchetype = inviterReportResult.data.archetype_base as string | null;
    const recipientArchetype = recipientReportResult.data.archetype_base as string | null;

    // ── Resolve names ──
    const inviterName = invite.inviter_name || "Person A";
    const recipientName = invite.recipient_email?.split("@")[0] || "Person B";

    // ── Resolve narrative voices ──
    const inviterVoiceId = inviterArchetype
      ? (ARCHETYPE_VOICE_MAP[inviterArchetype] ?? FALLBACK_VOICE)
      : FALLBACK_VOICE;
    const recipientVoiceId = recipientArchetype
      ? (ARCHETYPE_VOICE_MAP[recipientArchetype] ?? FALLBACK_VOICE)
      : FALLBACK_VOICE;

    console.log(
      `[decoded-compatibility-report] Generating for invite ${invite_id}: ` +
      `${inviterName} (${inviterArchetype}/${inviterVoiceId}) ↔ ` +
      `${recipientName} (${recipientArchetype}/${recipientVoiceId})`,
    );

    // ── Build shared data payload ──
    const userDataPayload = `## ${inviterName}
Archetype: ${inviterArchetype || "Unknown"}
Profile Summary: ${JSON.stringify(inviterS1 || "No profile data")}

## ${recipientName}
Archetype: ${recipientArchetype || "Unknown"}
Profile Summary: ${JSON.stringify(recipientS1 || "No profile data")}`;

    // ── Generate both reports in parallel (each in their own voice) ──
    const [inviterCompatReport, recipientCompatReport] = await Promise.all([
      callOpenAI(
        buildSystemPrompt(inviterName, recipientName, VOICE_PROMPT_BLOCKS[inviterVoiceId]),
        `Generate a compatibility report for ${inviterName}, written in your assigned voice.\n\n${userDataPayload}`,
      ),
      callOpenAI(
        buildSystemPrompt(recipientName, inviterName, VOICE_PROMPT_BLOCKS[recipientVoiceId]),
        `Generate a compatibility report for ${recipientName}, written in your assigned voice.\n\n${userDataPayload}`,
      ),
    ]);

    // ── Save both per-user reports and update status ──
    const { error: updateError } = await admin
      .from("decoded_invites")
      .update({
        compatibility_report_inviter: inviterCompatReport,
        compatibility_report_recipient: recipientCompatReport,
        // Backward compat: store inviter version as the shared report
        compatibility_report: inviterCompatReport,
        status: "connected",
      })
      .eq("id", invite_id);

    if (updateError) {
      console.error("[decoded-compatibility-report] Failed to save:", updateError.message);
      return errorResponse("SAVE_FAILED", "Failed to save compatibility reports", 500, headers);
    }

    console.log(`[decoded-compatibility-report] ✓ Saved both reports for invite ${invite_id}`);

    // E3 dual-write: the dyad just connected + compat payload exists — sync the
    // engagement spine so its status flips to 'active' and the Blueprint artifact
    // is (re)built. Non-fatal: never block the report response on this.
    const { error: syncError } = await admin.rpc("relatti_sync_invite", { p_invite_id: invite_id });
    if (syncError) {
      console.error("[decoded-compatibility-report] spine sync failed:", syncError.message);
    }

    // Return the report for the requesting user
    const callerReport = isInviter ? inviterCompatReport : recipientCompatReport;
    return jsonResponse({ success: true, report: callerReport }, 200, headers);

  } catch (error) {
    const err = error as Error;
    console.error("[decoded-compatibility-report] Unhandled error:", err.message, err.stack);
    await logError("decoded-compatibility-report", err);
    return errorResponse("INTERNAL_ERROR", err.message, 500, headers);
  }
});
