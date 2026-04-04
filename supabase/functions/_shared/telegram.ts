/**
 * Telegram Bot API Client — Shared utilities for Telegram channel.
 *
 * S4.4: Wraps the Telegram Bot API for webhook processing,
 * message sending, and formatting.
 *
 * Architecture: ARCHITECTURE.md §5.7
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Get the Bot API URL for a given method.
 */
function botUrl(method: string): string {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return `${TELEGRAM_API_BASE}/bot${token}/${method}`;
}

// ─── SEND MESSAGE ───────────────────────────────────────────────────────

interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: "HTML" | "MarkdownV2";
  reply_to_message_id?: number;
}

interface TelegramApiResult {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Send a text message to a Telegram chat.
 * Uses HTML parse mode by default (easier to manage than MarkdownV2 escaping).
 */
export async function sendMessage(
  params: SendMessageParams
): Promise<TelegramApiResult> {
  const response = await fetch(botUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: params.chat_id,
      text: params.text,
      parse_mode: params.parse_mode ?? "HTML",
      reply_to_message_id: params.reply_to_message_id,
    }),
  });

  const result: TelegramApiResult = await response.json();

  if (!result.ok) {
    console.error("[telegram] sendMessage failed:", result.description);

    // If HTML parsing fails, retry as plain text
    if (
      result.description?.includes("can't parse entities") &&
      params.parse_mode
    ) {
      console.log("[telegram] Retrying without parse_mode...");
      const retryResponse = await fetch(botUrl("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: params.chat_id,
          text: stripHtmlTags(params.text),
        }),
      });
      return await retryResponse.json();
    }
  }

  return result;
}

// ─── CHAT ACTIONS ───────────────────────────────────────────────────────

/**
 * Send a chat action (e.g., "typing...") to indicate the bot is working.
 * This auto-expires after 5 seconds or when a message is sent.
 */
export async function sendChatAction(
  chatId: number | string,
  action: "typing" | "upload_photo" | "upload_document" = "typing"
): Promise<void> {
  await fetch(botUrl("sendChatAction"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action,
    }),
  });
}

// ─── WEBHOOK MANAGEMENT ────────────────────────────────────────────────

/**
 * Register the webhook URL with Telegram.
 * Called once during deployment setup.
 */
export async function setWebhook(
  url: string,
  secretToken: string
): Promise<TelegramApiResult> {
  const response = await fetch(botUrl("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: ["message"], // Only receive message updates
      max_connections: 40,
    }),
  });

  return await response.json();
}

/**
 * Verify the X-Telegram-Bot-Api-Secret-Token header.
 */
export function verifyWebhookSecret(request: Request): boolean {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[telegram] TELEGRAM_WEBHOOK_SECRET not set");
    return false;
  }

  const headerSecret = request.headers.get(
    "x-telegram-bot-api-secret-token"
  );
  return headerSecret === secret;
}

// ─── FORMATTING ─────────────────────────────────────────────────────────

/**
 * Convert coach markdown response to Telegram HTML.
 * HTML is more reliable than MarkdownV2 (no escaping headaches).
 *
 * Maps:
 * - **bold** → <b>bold</b>
 * - *italic* → <i>italic</i>
 * - `code` → <code>code</code>
 * - [URL](link) → <a href="link">URL</a>
 * - 🆘 etc → kept as-is (Telegram supports emoji natively)
 */
export function formatCoachResponseForTelegram(text: string): string {
  return (
    text
      // Bold: **text** → <b>text</b>
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      // Italic: *text* → <i>text</i> (but not inside HTML tags)
      .replace(/(?<![<\/])\*(?!\*)(.*?)(?<!\*)\*(?![\*>])/g, "<i>$1</i>")
      // Inline code: `text` → <code>text</code>
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Links: [text](url) → <a href="url">text</a>
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2">$1</a>'
      )
      // Strip markdown headings (# ## ###)
      .replace(/^#{1,3}\s+(.+)$/gm, "<b>$1</b>")
  );
}

/**
 * Strip HTML tags for plain text fallback.
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

// ─── UPDATE PARSING ─────────────────────────────────────────────────────

/**
 * Telegram Update object (simplified — only what we need).
 */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: "private" | "group" | "supergroup" | "channel";
    };
    date: number;
    text?: string;
  };
}

/**
 * Parse the /start deep link payload.
 * Format: /start <auth_token>
 * Returns the auth token, or null if this isn't a /start command.
 */
export function parseStartCommand(
  text: string | undefined
): string | null {
  if (!text) return null;
  const match = text.match(/^\/start\s+(.+)$/);
  return match ? match[1].trim() : null;
}
