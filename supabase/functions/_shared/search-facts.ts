/**
 * Search Facts — Factual grounding for Informative interventions.
 *
 * S5.5c: Full implementation with Perplexity Sonar API + fact_cache.
 * Replaces the stub from S3.9.
 *
 * Architecture: COACHING_GUARDRAILS.md §2.4, ARCHITECTURE.md §5.5
 *
 * Flow:
 * 1. Hash query → check fact_cache table
 * 2. Cache hit + not expired → return cached result
 * 3. Cache miss → call Perplexity Sonar API
 * 4. Store result in fact_cache (24h TTL)
 * 5. Return grounded answer + sources to Claude
 *
 * Cost: ~$5-6/1K requests → ~$8-10/month at 100 users
 */

import type { AnthropicTool } from "./anthropic.ts";
import { createSupabaseClient } from "./supabase.ts";

// ─── TOOL DEFINITION ────────────────────────────────────────────────────

/**
 * Claude tool definition for search_facts.
 * Exposed to the coaching LLM so it can request factual grounding
 * when responding with statistics, market data, or time-sensitive info.
 */
export const SEARCH_FACTS_TOOL: AnthropicTool = {
  name: "search_facts",
  description:
    "Search for current, verified factual information when your response would include specific statistics, market data, pricing, regulatory facts, tool capabilities, or time-sensitive information. Returns grounded answers with source citations. Use this instead of stating facts from memory that could be outdated or inaccurate.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The specific factual question to search for. Be precise. Example: 'What is the average SaaS free trial conversion rate in 2025?'",
      },
    },
    required: ["query"],
  },
};

// ─── TYPES ──────────────────────────────────────────────────────────────

export interface SearchFactsResult {
  answer: string;
  sources: { title: string; url: string }[];
  confidence: "high" | "medium" | "low";
  cached: boolean;
  stub: boolean;
}

// ─── TOOL HANDLER ───────────────────────────────────────────────────────

/**
 * Handles a search_facts tool call from Claude.
 * Full implementation with Perplexity Sonar API + fact_cache.
 */
export async function handleSearchFacts(
  query: string,
  // PC5.5: per-brand cost attribution. Callers without program context omit it.
  program: string | null = null
): Promise<SearchFactsResult> {
  const supabase = createSupabaseClient();
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

  // If no API key, fall back to graceful degradation (like the stub)
  if (!perplexityKey) {
    console.warn("[search-facts] PERPLEXITY_API_KEY not set, using stub response");
    return {
      answer: `Factual grounding is not yet available. When responding, do NOT fabricate a specific number or source. Instead, acknowledge that you don't have verified current data and suggest the user check a relevant authoritative source for: "${query}"`,
      sources: [],
      confidence: "low",
      cached: false,
      stub: true,
    };
  }

  // ── 1. Hash query for cache lookup ──
  const normalizedQuery = query.toLowerCase().trim();
  const queryHash = await sha256(normalizedQuery);

  // ── 2. Check cache ──
  const { data: cached } = await supabase
    .from("fact_cache")
    .select("answer, sources, confidence")
    .eq("query_hash", queryHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    console.log(`[search-facts] Cache hit for: "${query}"`);
    return {
      answer: cached.answer,
      sources: cached.sources as { title: string; url: string }[],
      confidence: cached.confidence as "high" | "medium" | "low",
      cached: true,
      stub: false,
    };
  }

  // ── 3. Call Perplexity Sonar ──
  console.log(`[search-facts] Cache miss, calling Perplexity for: "${query}"`);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content:
              "You are a factual research assistant. Provide accurate, current data with source attribution. Be specific with numbers, dates, and sources. If data is uncertain, say so.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[search-facts] Perplexity API error (${response.status}):`,
        errorText
      );

      return {
        answer: `I was unable to verify this information. Please check a relevant authoritative source for: "${query}"`,
        sources: [],
        confidence: "low",
        cached: false,
        stub: false,
      };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];

    // ── 4. Extract sources ──
    const sources = citations.map((url: string, i: number) => ({
      title: `Source ${i + 1}`,
      url,
    }));

    // Determine confidence based on source count and response quality
    const confidence: "high" | "medium" | "low" =
      sources.length >= 3 ? "high" : sources.length >= 1 ? "medium" : "low";

    // ── 5. Cache result (24h TTL) ──
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("fact_cache").insert({
      query_hash: queryHash,
      query: normalizedQuery,
      answer,
      sources,
      confidence,
      expires_at: expiresAt,
    });

    // ── 6. Log cost ──
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    // Perplexity Sonar pricing: ~$5/1M tokens (approx)
    const costUsd =
      (tokensIn / 1_000_000) * 1.0 + (tokensOut / 1_000_000) * 5.0;

    await supabase.from("cost_tracking").insert({
      purpose: "search-facts",
      model: "perplexity-sonar",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      metadata: { program },
    });

    console.log(
      `[search-facts] Perplexity returned ${answer.length} chars, ${sources.length} sources, confidence: ${confidence}`
    );

    return {
      answer,
      sources,
      confidence,
      cached: false,
      stub: false,
    };
  } catch (error) {
    console.error(
      "[search-facts] Perplexity call failed:",
      (error as Error).message
    );

    return {
      answer: `I was unable to verify this information due to a service error. Please check a relevant authoritative source for: "${query}"`,
      sources: [],
      confidence: "low",
      cached: false,
      stub: false,
    };
  }
}

// ─── CRYPTO HELPER ──────────────────────────────────────────────────────

/**
 * SHA-256 hash of a string, returned as hex.
 */
async function sha256(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

