/**
 * Telegram Webhook — Receives and processes Telegram messages.
 *
 * POST /functions/v1/telegram-webhook
 * Auth: X-Telegram-Bot-Api-Secret-Token header
 *
 * Flow:
 * 1. Verify webhook secret
 * 2. Parse Telegram Update
 * 3. Handle /start command (deep-link auth) 
 * 4. Match chat_id → user record
 * 5. Send "typing..." indicator
 * 6. Process through coaching pipeline
 * 7. Send formatted response
 *
 * Architecture: SPRINT.md S4.4
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { logError } from "../_shared/errors.ts";
import {
  verifyWebhookSecret,
  sendMessage,
  sendChatAction,
  formatCoachResponseForTelegram,
  parseStartCommand,
} from "../_shared/telegram.ts";
import type { TelegramUpdate } from "../_shared/telegram.ts";
import {
  processCoachMessage,
  COACHING_DISCLAIMER,
} from "../_shared/channel-router.ts";
import type { CoachMessage } from "../_shared/channel-router.ts";

const FUNCTION_NAME = "telegram-webhook";

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ── 1. Verify webhook secret ──
    if (!verifyWebhookSecret(req)) {
      console.error(`[${FUNCTION_NAME}] Invalid webhook secret`);
      return new Response("Unauthorized", { status: 401 });
    }

    const update: TelegramUpdate = await req.json();

    // ── 2. Validate update ──
    if (!update.message?.text || !update.message?.chat) {
      // Non-text updates (photos, stickers, etc.) — ignore silently
      return new Response("OK", { status: 200 });
    }

    // Only handle private chats
    if (update.message.chat.type !== "private") {
      return new Response("OK", { status: 200 });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const firstName = update.message.from.first_name;

    console.log(
      `[${FUNCTION_NAME}] Message from chat ${chatId} (${firstName}): "${text.slice(0, 50)}..."`
    );

    // ── 3. Handle /start command (deep-link auth) ──
    const startPayload = parseStartCommand(text);
    if (startPayload) {
      await handleStartCommand(chatId, startPayload, firstName);
      return new Response("OK", { status: 200 });
    }

    // Handle /help command
    if (text.trim() === "/help") {
      await sendMessage({
        chat_id: chatId,
        text: `<b>Mastery Coach</b> 🎯\n\nI'm your AI coaching partner. Just send me a message to start a conversation about:\n\n• Business strategy & growth\n• Leadership & management\n• Personal development\n• Goal-setting & accountability\n• Communication & relationships\n\n<b>Commands:</b>\n/help — Show this message\n/status — Check your account connection\n\n💬 Just type your question or thought to get started!`,
      });
      return new Response("OK", { status: 200 });
    }

    // Handle /status command
    if (text.trim() === "/status") {
      await handleStatusCommand(chatId);
      return new Response("OK", { status: 200 });
    }

    // ── 4. Match chat_id to user ──
    const supabase = createSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("telegram_chat_id", chatId.toString())
      .single();

    if (userError || !user) {
      await sendMessage({
        chat_id: chatId,
        text: `👋 Hi ${firstName}! I'd love to coach you, but your Telegram isn't connected to a Mastery Coach account yet.\n\n<b>To connect:</b>\n1. Go to <a href="https://masterytv.com/coachapp/settings">masterytv.com/coachapp/settings</a>\n2. Click "Connect Telegram"\n3. Follow the link back here\n\nOnce connected, you can chat with me right here in Telegram! 🚀`,
      });
      return new Response("OK", { status: 200 });
    }

    console.log(
      `[${FUNCTION_NAME}] Matched user ${user.id} (${user.name}) from chat ${chatId}`
    );

    // ── 5. Send typing indicator ──
    // Fire-and-forget — don't await
    sendChatAction(chatId).catch(() => {});

    // Keep typing indicator alive during processing
    const typingInterval = setInterval(() => {
      sendChatAction(chatId).catch(() => {});
    }, 4000);

    try {
      // ── 6. Process through coaching pipeline ──
      const coachMessage: CoachMessage = {
        user_id: user.id,
        channel: "telegram",
        content: text,
        metadata: {
          telegram_chat_id: chatId.toString(),
        },
      };

      const result = await processCoachMessage(coachMessage);

      // ── 7. Send formatted response ──
      let responseText = result.response;
      if (result.disclaimerShown) {
        responseText += `\n\n—\n<i>I am an AI coaching assistant · Not a licensed professional. This legal notice is sent once every 30 days.</i>`;
      }

      const formattedResponse = formatCoachResponseForTelegram(responseText);

      // Telegram has a 4096 char limit per message
      if (formattedResponse.length <= 4096) {
        await sendMessage({
          chat_id: chatId,
          text: formattedResponse,
        });
      } else {
        // Split into chunks at paragraph boundaries
        const chunks = splitMessage(formattedResponse, 4000);
        for (const chunk of chunks) {
          await sendMessage({ chat_id: chatId, text: chunk });
          // Brief delay between chunks to maintain order
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      console.log(
        `[${FUNCTION_NAME}] Sent response to ${user.name} (conversation: ${result.conversationId})`
      );
    } finally {
      clearInterval(typingInterval);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Error:`, (error as Error).message);
    await logError(FUNCTION_NAME, error as Error);
    // Return 200 to prevent Telegram retries
    return new Response("OK", { status: 200 });
  }
});

// ─── COMMAND HANDLERS ───────────────────────────────────────────────────

/**
 * Handle /start <auth_token> deep-link for account connection.
 */
async function handleStartCommand(
  chatId: number,
  authToken: string,
  firstName: string
): Promise<void> {
  const supabase = createSupabaseClient();

  // Look up the auth token in telegram_connect_tokens table
  const { data: tokenRecord, error: tokenError } = await supabase
    .from("telegram_connect_tokens")
    .select("user_id, expires_at")
    .eq("token", authToken)
    .single();

  if (tokenError || !tokenRecord) {
    await sendMessage({
      chat_id: chatId,
      text: `❌ Invalid or expired connection link. Please try again from your <a href="https://masterytv.com/coachapp/settings">Mastery Coach settings</a>.`,
    });
    return;
  }

  // Check expiration
  if (new Date(tokenRecord.expires_at) < new Date()) {
    await sendMessage({
      chat_id: chatId,
      text: `⏰ This connection link has expired. Please generate a new one from your <a href="https://masterytv.com/coachapp/settings">settings page</a>.`,
    });

    // Clean up expired token
    await supabase
      .from("telegram_connect_tokens")
      .delete()
      .eq("token", authToken);
    return;
  }

  // Link Telegram chat to user account
  const { error: updateError } = await supabase
    .from("users")
    .update({ telegram_chat_id: chatId.toString() })
    .eq("id", tokenRecord.user_id);

  if (updateError) {
    console.error(
      `[telegram-webhook] Failed to link Telegram:`,
      updateError.message
    );
    await sendMessage({
      chat_id: chatId,
      text: `❌ Something went wrong connecting your account. Please try again or contact support.`,
    });
    return;
  }

  // Clean up used token
  await supabase
    .from("telegram_connect_tokens")
    .delete()
    .eq("token", authToken);

  // Get user's name for the welcome message
  const { data: user } = await supabase
    .from("users")
    .select("name")
    .eq("id", tokenRecord.user_id)
    .single();

  const userName = user?.name || firstName;

  await sendMessage({
    chat_id: chatId,
    text: `✅ <b>Connected!</b> Welcome, ${userName}! 🎉\n\nYour Telegram is now linked to your Mastery Coach account. You can chat with me right here anytime.\n\nAll your conversations, goals, and context are shared across web, email, and Telegram — so we can pick up wherever you left off.\n\nWhat's on your mind today? 💬`,
  });
}

/**
 * Handle /status command — show connection info.
 */
async function handleStatusCommand(chatId: number): Promise<void> {
  const supabase = createSupabaseClient();
  const { data: user } = await supabase
    .from("users")
    .select("name, email, subscription_tier")
    .eq("telegram_chat_id", chatId.toString())
    .single();

  if (!user) {
    await sendMessage({
      chat_id: chatId,
      text: `❌ Your Telegram is not connected to a Mastery Coach account.\n\nConnect at <a href="https://masterytv.com/coachapp/settings">masterytv.com/coachapp/settings</a>`,
    });
    return;
  }

  await sendMessage({
    chat_id: chatId,
    text: `✅ <b>Account Connected</b>\n\n👤 ${user.name}\n📧 ${user.email}\n⭐ ${user.subscription_tier} plan\n\nAll your conversations sync across web, email, and Telegram.`,
  });
}

// ─── HELPERS ────────────────────────────────────────────────────────────

/**
 * Split a long message into chunks at paragraph boundaries.
 * Telegram limits messages to 4096 characters.
 */
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at paragraph boundary
    let splitAt = remaining.lastIndexOf("\n\n", maxLength);
    if (splitAt === -1 || splitAt < maxLength / 2) {
      // Try at line break
      splitAt = remaining.lastIndexOf("\n", maxLength);
    }
    if (splitAt === -1 || splitAt < maxLength / 2) {
      // Hard split at space
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitAt === -1) {
      splitAt = maxLength;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}
