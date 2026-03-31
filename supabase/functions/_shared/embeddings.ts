/**
 * Shared Embedding Module — Semantic Memory for Mastery Coach
 * 
 * Provides embedding generation (OpenAI text-embedding-3-small) and
 * pgvector-powered semantic search across messages, memory_facts, and user_entities.
 * 
 * Architecture: SPRINT.md S2.6
 */

import { createSupabaseClient } from "./supabase.ts";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

// Cost per million tokens for text-embedding-3-small
const EMBEDDING_COST_PER_M_TOKENS = 0.02;

// ─── EMBEDDING GENERATION ────────────────────────────────────────────────

/**
 * Generate an embedding vector for a text string.
 * Uses OpenAI text-embedding-3-small (1536 dims).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  // Truncate to ~8000 tokens (~32k chars) to stay within model limits
  const truncated = text.slice(0, 32000);

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncated,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

/**
 * Generate embeddings for multiple texts in a single API call (batch).
 * More efficient than calling generateEmbedding() in a loop.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  if (texts.length === 0) return [];

  const truncated = texts.map((t) => t.slice(0, 32000));

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncated,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();

  // Sort by index to maintain order (OpenAI may return in different order)
  const sorted = data.data.sort(
    (a: { index: number }, b: { index: number }) => a.index - b.index
  );

  return sorted.map((d: { embedding: number[] }) => d.embedding);
}

// ─── SEMANTIC SEARCH ────────────────────────────────────────────────────

/**
 * Search memory_facts by semantic similarity using pgvector.
 * Returns top-K facts most similar to the query embedding.
 */
export async function searchMemoryFacts(
  userId: string,
  queryEmbedding: number[],
  topK = 10
): Promise<
  {
    id: string;
    category: string;
    subject: string;
    content: string;
    importance: number;
    similarity: number;
  }[]
> {
  const supabase = createSupabaseClient();

  // Use pgvector's cosine distance operator (<=>)
  // Lower distance = more similar, so we order ascending
  const { data, error } = await supabase.rpc("match_memory_facts", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_user_id: userId,
    match_count: topK,
    match_threshold: 0.3, // Minimum similarity (1 - cosine_distance)
  });

  if (error) {
    console.error("[embeddings] Semantic search error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Search messages by semantic similarity using pgvector.
 * Useful for finding past conversations related to a topic.
 */
export async function searchMessages(
  userId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<
  {
    id: string;
    role: string;
    content: string;
    created_at: string;
    similarity: number;
  }[]
> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("match_messages", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_user_id: userId,
    match_count: topK,
    match_threshold: 0.3,
  });

  if (error) {
    console.error("[embeddings] Message search error:", error.message);
    return [];
  }

  return data ?? [];
}

// ─── COST TRACKING ──────────────────────────────────────────────────────

/**
 * Calculate embedding generation cost.
 * text-embedding-3-small: $0.02 per 1M tokens
 * Rough estimate: 1 token ≈ 4 characters
 */
export function estimateEmbeddingCost(texts: string[]): number {
  const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);
  return (estimatedTokens / 1_000_000) * EMBEDDING_COST_PER_M_TOKENS;
}

/**
 * Log embedding cost to the cost_tracking table.
 */
export async function logEmbeddingCost(
  userId: string,
  purpose: string,
  texts: string[]
): Promise<void> {
  const supabase = createSupabaseClient();
  const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);
  const cost = estimateEmbeddingCost(texts);

  await supabase.from("cost_tracking").insert({
    user_id: userId,
    purpose,
    model: EMBEDDING_MODEL,
    tokens_in: estimatedTokens,
    tokens_out: 0,
    cost_usd: cost,
  });
}
