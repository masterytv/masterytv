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

// ─── POST-PROCESSING ───────────────────────────────────────────────────

/**
 * Extracts facts and commitments from the conversation exchange.
 * Uses GPT-4o-mini for cost efficiency (async, not blocking response).
 */
export async function postProcess(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  _conversationId: string,
  userMessage: string,
  coachResponse: string,
  coachMessageId: string
): Promise<void> {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.warn(
        "[post-process] OPENAI_API_KEY not set, skipping extraction"
      );
      return;
    }

    const extractionPrompt = `Analyze this coaching conversation exchange and extract structured data.

USER MESSAGE: ${userMessage}

COACH RESPONSE: ${coachResponse}

Extract the following as JSON:
{
  "facts": [
    { "category": "business|personal|preference|goal|challenge|win|pattern|org_sop", "subject": "brief label", "content": "the fact", "importance": 0.1-1.0 }
  ],
  "commitments": [
    { "type": "goal|action_item|habit", "description": "what the user committed to", "due_date": "YYYY-MM-DD or null" }
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
- Only extract facts the USER stated about themselves, their business, or their situation.
- Only extract commitments the USER explicitly agreed to or stated they would do.
- Don't extract coaching questions or the coach's observations as facts.
- Importance: 0.1-0.3 = minor detail, 0.4-0.6 = useful context, 0.7-0.9 = core to coaching, 1.0 = critical.
- challenge_detected.is_new: set to true ONLY if the user described a new challenge, problem, or goal that isn't just a follow-up to an existing conversation thread.
- ai_tools_mentioned: extract when the USER mentions using, having, or relying on ANY tool, platform, device, or software in their workflow. This includes:
  • AI tools: Claude, ChatGPT, Cursor, Midjourney, Copilot
  • Productivity: Notion, Trello, Asana, Todoist, Google Docs, Obsidian
  • Communication: Slack, Discord, LinkedIn, Zoom, Teams, WhatsApp
  • Business: HubSpot, Salesforce, Zapier, Stripe, QuickBooks, Mailchimp
  • Development: GitHub, VS Code, Figma, Vercel, AWS
  • Platforms/OS: Mac, Windows, iPhone, Android, iPad, Chrome
  Only extract when the USER says THEY use it (e.g., "I use Notion", "I'm on a Mac", "we communicate via Slack"). Don't extract tools the coach recommends.
- If nothing to extract, return empty arrays and is_new: false.

Return ONLY valid JSON, no other text.`;

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
          messages: [{ role: "user", content: extractionPrompt }],
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

    // Store facts + generate embeddings
    if (extracted.facts?.length > 0) {
      const factTexts = extracted.facts.map(
        (f: { subject: string; content: string }) =>
          `${f.subject}: ${f.content}`
      );

      let factEmbeddings: number[][] = [];
      try {
        factEmbeddings = await generateEmbeddings(factTexts);
        await logEmbeddingCost(userId, "embed-facts", factTexts);
      } catch (e) {
        console.warn(
          "[post-process] Failed to embed facts:",
          (e as Error).message
        );
      }

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
          category: f.category,
          subject: f.subject,
          content: f.content,
          importance: f.importance,
          source_message_id: coachMessageId,
          is_confirmed: false,
          embedding: factEmbeddings[i]
            ? JSON.stringify(factEmbeddings[i])
            : null,
        })
      );
      await supabase.from("memory_facts").insert(factsToInsert);
    }

    // Store commitments
    if (extracted.commitments?.length > 0) {
      const commitmentsToInsert = extracted.commitments.map(
        (c: {
          type: string;
          description: string;
          due_date: string | null;
        }) => ({
          user_id: userId,
          type: c.type,
          description: c.description,
          due_date: c.due_date || null,
          status: "active",
          source_message_id: coachMessageId,
        })
      );
      await supabase.from("commitments").insert(commitmentsToInsert);
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
    });

    // Challenge Detection + Framework Assignment (S2.3)
    if (
      extracted.challenge_detected?.is_new &&
      extracted.challenge_detected?.title
    ) {
      const challenge = extracted.challenge_detected;

      const { data: coachProfile } = await supabase
        .from("coach_profiles")
        .select("trust_level, framework_affinity")
        .eq("user_id", userId)
        .single();

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

    // AI Tool Discovery (S6.6) — persist discovered tools to users.ai_tools
    if (extracted.ai_tools_mentioned?.length > 0) {
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
  } catch (error) {
    // Post-processing failure should never block the user
    console.error("[post-process] Error:", (error as Error).message);
    await logError("post-processor", error as Error, userId);
  }
}
