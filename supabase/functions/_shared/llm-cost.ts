/**
 * One place to price an LLM call, and one place to record it.
 *
 * 🔥 Why this module exists. `cost_tracking` was read on 2026-08-17 to size a
 * month's Anthropic spend and came back with ~$2. The real figure on the same
 * key was $23.90. Every row in the table was accurate; the table was simply
 * incomplete. Several callers reached an LLM and wrote nothing, so what looked
 * like the bill was only the web coach's share of it. A cost table nobody can
 * trust is worse than no cost table, because it gets believed.
 *
 * Two rules follow, and `scripts/check-cost-logging.mjs` enforces the second:
 *
 *   1. Rates live HERE and nowhere else. The duplicated-constant failure has
 *      already happened once in this repo — coach/index.ts carried its own
 *      gpt-vs-claude branch and billed every Relatti turn at gpt-4o-mini rates,
 *      ~20x under, for months.
 *   2. Every module that calls an LLM logs the call. Not "every module that
 *      remembered to".
 *
 * The logger never throws. A cost row is bookkeeping, and losing one must never
 * take down a coach turn or a safety sweep.
 */

import type { createSupabaseClient } from "./supabase.ts";

/** USD per MILLION tokens. The single source of truth for LLM pricing. */
export const MODEL_RATES: Record<string, { in: number; out: number }> = {
  // Anthropic
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  // OpenAI
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-2024-08-06": { in: 2.5, out: 10 },
  "text-embedding-3-small": { in: 0.02, out: 0 },
  // Perplexity
  "perplexity-sonar": { in: 1, out: 1 },
};

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
  /** Anthropic prompt cache. Billed at 1.25x base input. */
  cache_creation_input_tokens?: number;
  /** Anthropic prompt cache. Billed at 0.1x base input. */
  cache_read_input_tokens?: number;
}

/**
 * Prices one call in USD.
 *
 * An unknown model prices at 0 rather than throwing — a missing rate must not
 * break a coach turn. It still gets LOGGED with its real model string and token
 * counts, so a $0.00 row against a named model is the signal to add a rate here
 * rather than a silently absent row.
 */
export function priceLlmCall(model: string, usage: LlmUsage): number {
  const rate = MODEL_RATES[model];
  if (!rate) return 0;
  const perInputToken = rate.in / 1_000_000;
  return (
    usage.input_tokens * perInputToken +
    (usage.cache_creation_input_tokens ?? 0) * perInputToken * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * perInputToken * 0.1 +
    (usage.output_tokens * rate.out) / 1_000_000
  );
}

/**
 * Records one LLM call in `cost_tracking`.
 *
 * `tokens_in` carries the TOTAL prompt tokens including cached ones. Anthropic
 * subtracts a cached prefix from `input_tokens` and reports it separately, so
 * logging `input_tokens` alone would read as a collapse in usage on the day
 * prompt caching was switched on rather than a fall in price.
 *
 * `userId` is nullable by design: system-level work (safety sweeps, crons) has
 * no user to attribute to, and an unattributed row still beats no row.
 */
export async function logLlmCost(
  supabase: ReturnType<typeof createSupabaseClient>,
  entry: {
    userId?: string | null;
    purpose: string;
    model: string;
    usage: LlmUsage;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const cacheWrite = entry.usage.cache_creation_input_tokens ?? 0;
    const cacheRead = entry.usage.cache_read_input_tokens ?? 0;
    await supabase.from("cost_tracking").insert({
      user_id: entry.userId ?? null,
      purpose: entry.purpose,
      model: entry.model,
      tokens_in: entry.usage.input_tokens + cacheWrite + cacheRead,
      tokens_out: entry.usage.output_tokens,
      cost_usd: priceLlmCall(entry.model, entry.usage),
      metadata: {
        ...(entry.metadata ?? {}),
        ...(cacheWrite || cacheRead
          ? { cache_write_tokens: cacheWrite, cache_read_tokens: cacheRead }
          : {}),
      },
    });
  } catch (e) {
    console.warn(`[llm-cost] failed to log ${entry.purpose}/${entry.model}: ${(e as Error).message}`);
  }
}
