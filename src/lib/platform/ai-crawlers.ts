/**
 * AI crawlers we turn away (founder decision 2026-10-27, after the Vercel
 * Hobby team hit 100% of its included Active CPU).
 *
 * Two layers use this one list so they can never drift apart:
 * - robots.txt asks each of these bots to stay off every page (the polite ask,
 *   which the big AI vendors honour).
 * - middleware answers 403 to any request whose User-Agent names one of them,
 *   before the Supabase session check runs, so a bot that ignores robots.txt
 *   still costs almost nothing.
 *
 * This reverses the earlier AEO stance (robots.txt used to welcome GPTBot,
 * ClaudeBot, PerplexityBot and Google-Extended). Remove a name here to let
 * that bot back in on both layers.
 *
 * Tokens are matched case-insensitively as substrings of the User-Agent.
 * Google-Extended and Applebot-Extended are robots.txt-only tokens (those
 * vendors crawl with their ordinary bots and read the token from robots.txt),
 * so they appear in robots.txt but never match a User-Agent.
 */
export const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Claude-Web",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google / Apple training opt-outs (robots.txt tokens only)
  "Google-Extended",
  "Applebot-Extended",
  // Others
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Diffbot",
  "YouBot",
  "DuckAssistBot",
  "MistralAI-User",
  "ImagesiftBot",
  "Timpibot",
  "omgili",
  "omgilibot",
  "PetalBot",
] as const;

const ROBOTS_ONLY = new Set<string>(["Google-Extended", "Applebot-Extended"]);

const UA_TOKENS = AI_CRAWLERS.filter((bot) => !ROBOTS_ONLY.has(bot)).map((bot) =>
  bot.toLowerCase()
);

/** True when the User-Agent belongs to one of the AI crawlers above. */
export function isAiCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return UA_TOKENS.some((token) => ua.includes(token));
}
