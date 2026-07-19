/**
 * Cron AI Tools Refresh — Weekly Perplexity-powered AI tool discovery.
 *
 * S6.5: Queries Perplexity API for new AI tools, parses results,
 * and inserts tools not already in the database with auto_flagged = true
 * for admin review.
 *
 * Schedule: Weekly (Sunday midnight UTC) via pg_cron.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

const FUNCTION_NAME = "cron-ai-tools-refresh";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createSupabaseClient();
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

  if (!perplexityKey) {
    console.error(`[${FUNCTION_NAME}] PERPLEXITY_API_KEY not set`);
    return new Response(
      JSON.stringify({ error: "Perplexity API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // ── 1. Get existing tool names to avoid duplicates ──
    const { data: existingTools } = await supabase
      .from("ai_tools")
      .select("name");

    const existingNames = new Set(
      (existingTools ?? []).map(t => t.name.toLowerCase())
    );

    console.log(
      `[${FUNCTION_NAME}] ${existingNames.size} existing tools in database`
    );

    // ── 2. Query Perplexity for new AI tools ──
    const searchQueries = [
      "New AI tools launched this month for business productivity, writing, coding, design, and research. List the top 10 newest tools with name, website, category, pricing, and a one-sentence description.",
      "Trending AI tools for entrepreneurs and small business owners in 2026. Focus on tools that help with content creation, sales automation, meeting notes, and workflow automation.",
    ];

    const allDiscovered: Array<{
      name: string;
      website: string;
      category: string[];
      cost_model: string;
      description: string;
    }> = [];

    for (const query of searchQueries) {
      try {
        const response = await fetch(PERPLEXITY_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content: `You are a research assistant that discovers new AI tools. 
Return ONLY valid JSON — an array of objects. No markdown, no explanation.
Each object must have exactly these fields:
- "name": string (tool name)
- "website": string (URL)
- "category": string[] (from: writing, coding, design, video, audio, research, productivity, marketing, sales)
- "cost_model": string (one of: free, freemium, paid)
- "description": string (1-2 sentences)`,
              },
              { role: "user", content: query },
            ],
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          console.error(
            `[${FUNCTION_NAME}] Perplexity API error: ${response.status}`
          );
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? "";

        // Parse JSON from response (handle potential markdown wrapping)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const tools = JSON.parse(jsonMatch[0]);
            if (Array.isArray(tools)) {
              allDiscovered.push(...tools);
            }
          } catch (parseErr) {
            console.warn(
              `[${FUNCTION_NAME}] Failed to parse tools JSON:`,
              (parseErr as Error).message
            );
          }
        }
      } catch (fetchErr) {
        console.error(
          `[${FUNCTION_NAME}] Query failed:`,
          (fetchErr as Error).message
        );
      }
    }

    console.log(
      `[${FUNCTION_NAME}] Discovered ${allDiscovered.length} tools from Perplexity`
    );

    // ── 3. Filter to new tools only ──
    const newTools = allDiscovered.filter(
      t => t.name && !existingNames.has(t.name.toLowerCase())
    );

    // Deduplicate by name
    const seen = new Set<string>();
    const uniqueNew = newTools.filter(t => {
      const key = t.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(
      `[${FUNCTION_NAME}] ${uniqueNew.length} genuinely new tools to insert`
    );

    // ── 4. Insert new tools with auto_flagged = true ──
    let inserted = 0;
    for (const tool of uniqueNew) {
      const { error } = await supabase.from("ai_tools").insert({
        name: tool.name,
        website: tool.website || null,
        category: Array.isArray(tool.category) ? tool.category : [tool.category],
        cost_model: tool.cost_model || "freemium",
        description: tool.description || null,
        auto_flagged: true, // Needs admin review
        last_verified_at: new Date().toISOString(),
      });

      if (error) {
        console.warn(
          `[${FUNCTION_NAME}] Failed to insert "${tool.name}":`,
          error.message
        );
      } else {
        inserted++;
      }
    }

    console.log(
      `[${FUNCTION_NAME}] Done: ${inserted} new tools inserted, ${allDiscovered.length - uniqueNew.length} duplicates skipped`
    );

    return new Response(
      JSON.stringify({
        discovered: allDiscovered.length,
        new: uniqueNew.length,
        inserted,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(
      `[${FUNCTION_NAME}] Fatal error:`,
      (error as Error).message
    );
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
