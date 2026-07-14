/**
 * Channel Delivery — Proactive message delivery via the user's preferred channel.
 *
 * TD-004: Centralizes channel routing for proactive outreach.
 * All cron Edge Functions import this instead of duplicating delivery logic.
 *
 * Channel resolution order:
 * 1. users.preferred_channel (if connected)
 * 2. Last channel the user interacted on
 * 3. Email fallback (always available)
 *
 * Architecture: SPRINT.md §13 TD-004
 */

import { createSupabaseClient } from "./supabase.ts";
import { sendEmail, buildCoachingEmailHtml, buildThreadHeaders } from "./resend.ts";
import { sendMessage as sendTelegramMessage, formatCoachResponseForTelegram } from "./telegram.ts";

type Channel = "email" | "telegram" | "web";

export interface ProactiveDeliveryOptions {
  /** Vertical the message belongs to — picks the email chrome + from-domain. */
  brand?: "relatti" | "masterytv";
  /** Deep link to the source conversation, rendered as a CTA in the email. */
  conversationUrl?: string;
}

export interface DeliveryResult {
  channel: Channel;
  success: boolean;
  error?: string;
  emailId?: string;
}

interface UserDeliveryInfo {
  id: string;
  email: string;
  name: string;
  preferred_channel: Channel;
  telegram_chat_id: string | null;
}

// ─── CHANNEL RESOLUTION ─────────────────────────────────────────────────

/**
 * Resolve which channel to use for proactive delivery.
 *
 * Logic:
 * 1. Check preferred_channel — but only if it's actually connected
 *    (e.g., telegram requires telegram_chat_id to exist)
 * 2. Fallback to last channel the user interacted on
 * 3. Ultimate fallback: email (we always have their email)
 */
export async function resolveDeliveryChannel(
  supabase: ReturnType<typeof createSupabaseClient>,
  user: UserDeliveryInfo
): Promise<Channel> {
  const preferred = user.preferred_channel;

  // Check if preferred channel is actually usable
  if (preferred === "telegram" && user.telegram_chat_id) {
    return "telegram";
  }
  if (preferred === "email") {
    return "email";
  }
  // "web" as preferred means nothing for proactive outreach — need a push channel

  // Fallback: find the last channel the user sent a message on
  const { data: lastMsg } = await supabase
    .from("messages")
    .select("channel")
    .eq("user_id", user.id)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMsg?.channel === "telegram" && user.telegram_chat_id) {
    return "telegram";
  }

  // Ultimate fallback: email (always available since we have their email)
  return "email";
}

// ─── DELIVERY ───────────────────────────────────────────────────────────

/**
 * Deliver a proactive coaching message to a user via the best channel.
 *
 * Used by all cron Edge Functions:
 * - cron-morning-briefings
 * - cron-process-scheduled
 * - cron-session-planner
 * - cron-arc-strategist
 */
export async function deliverProactiveMessage(
  supabase: ReturnType<typeof createSupabaseClient>,
  user: UserDeliveryInfo,
  content: string,
  subject: string,
  conversationId?: string,
  options: ProactiveDeliveryOptions = {}
): Promise<DeliveryResult> {
  const channel = await resolveDeliveryChannel(supabase, user);

  try {
    switch (channel) {
      case "telegram": {
        const htmlContent = formatCoachResponseForTelegram(content);
        const result = await sendTelegramMessage({
          chat_id: user.telegram_chat_id!,
          text: htmlContent,
          parse_mode: "HTML",
        });

        if (!result.ok) {
          // Telegram failed — fallback to email
          console.warn(
            `[channel-delivery] Telegram send failed for ${user.id}, falling back to email`
          );
          return deliverViaEmail(user, content, subject, conversationId, options);
        }

        return { channel: "telegram", success: true };
      }

      case "email": {
        return deliverViaEmail(user, content, subject, conversationId, options);
      }

      default: {
        // Shouldn't happen, but fallback to email
        return deliverViaEmail(user, content, subject, conversationId, options);
      }
    }
  } catch (error) {
    console.error(
      `[channel-delivery] Delivery failed for user ${user.id} via ${channel}:`,
      (error as Error).message
    );

    // If primary channel failed and it wasn't email, try email
    if (channel !== "email") {
      try {
        return deliverViaEmail(user, content, subject, conversationId, options);
      } catch (emailError) {
        return {
          channel: "email",
          success: false,
          error: (emailError as Error).message,
        };
      }
    }

    return {
      channel,
      success: false,
      error: (error as Error).message,
    };
  }
}

// ─── EMAIL DELIVERY (INTERNAL) ──────────────────────────────────────────

async function deliverViaEmail(
  user: UserDeliveryInfo,
  content: string,
  subject: string,
  conversationId?: string,
  options: ProactiveDeliveryOptions = {}
): Promise<DeliveryResult> {
  const brand = options.brand ?? "masterytv";
  const html = buildCoachingEmailHtml(content, user.name, conversationId ?? "proactive", {
    brand,
    conversationUrl: options.conversationUrl,
  });
  const headers = conversationId
    ? buildThreadHeaders(conversationId)
    : {};

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    headers,
    brand,
    // Inbound email processing only exists on mail.masterytv.com today, so
    // Relatti-branded sends route replies there to keep "just reply" true.
    // Drop this once coach@mail.relatti.com has an inbound webhook.
    replyTo: brand === "relatti" ? "Relatti Coach <coach@mail.masterytv.com>" : undefined,
  });

  return {
    channel: "email",
    success: true,
    emailId: result.id,
  };
}

// ─── STORE OUTBOUND MESSAGE ─────────────────────────────────────────────

/**
 * Store a proactive outbound message in the messages table.
 * This ensures the coaching engine has full context of what was sent.
 */
export async function storeOutboundMessage(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  channel: Channel,
  content: string,
  conversationId: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      channel,
      role: "coach",
      content,
      metadata: {
        ...metadata,
        proactive: true,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      `[channel-delivery] Failed to store outbound message:`,
      error.message
    );
    return null;
  }

  return data?.id ?? null;
}
