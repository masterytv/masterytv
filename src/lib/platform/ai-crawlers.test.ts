import { describe, expect, it } from "vitest";
import { AI_CRAWLERS, isAiCrawler } from "./ai-crawlers";

describe("isAiCrawler", () => {
  it("matches the AI crawlers' real User-Agent strings", () => {
    for (const ua of [
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
      "CCBot/2.0 (https://commoncrawl.org/faq/)",
      "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    ]) {
      expect(isAiCrawler(ua), ua).toBe(true);
    }
  });

  it("lets people, search engines and link previews through", () => {
    for (const ua of [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "WhatsApp/2.23.20.0",
    ]) {
      expect(isAiCrawler(ua), ua).toBe(false);
    }
    expect(isAiCrawler(null)).toBe(false);
    expect(isAiCrawler("")).toBe(false);
  });

  it("never matches on the robots.txt-only opt-out tokens", () => {
    expect(AI_CRAWLERS).toContain("Google-Extended");
    expect(isAiCrawler("Google-Extended")).toBe(false);
  });
});
