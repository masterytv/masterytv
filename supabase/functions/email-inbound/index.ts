/**
 * Email Inbound — Receives coaching replies via Resend webhook.
 *
 * POST /functions/v1/email-inbound
 * Auth: Resend webhook signature (Svix)
 *
 * Flow:
 * 1. Receive `email.received` webhook from Resend
 * 2. Fetch full email content via Received Emails API
 * 3. Strip reply noise (signatures, quoted text)
 * 4. Match sender email → user record
 * 5. Process through coaching pipeline
 * 6. Send coaching response back via email
 *
 * Architecture: SPRINT.md S4.3
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { logError } from "../_shared/errors.ts";
import { timingSafeEqual } from "../_shared/timing-safe.ts";
import { brandForProgram } from "../_shared/brands.ts";
import {
  getReceivedEmail,
  sendEmail,
  stripEmailNoise,
  buildCoachingEmailHtml,
  buildThreadHeaders,
} from "../_shared/resend.ts";
import {
  processCoachMessage,
  COACHING_DISCLAIMER,
} from "../_shared/channel-router.ts";
import type { CoachMessage } from "../_shared/channel-router.ts";

const FUNCTION_NAME = "email-inbound";

Deno.serve(async (req: Request) => {
  // Only accept POST (webhook)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ── 0. Verify Svix webhook signature ──
    // Resend uses Svix infrastructure for webhook delivery.
    // All webhooks are signed with HMAC-SHA256 using these headers.
    const rawBody = await req.text();
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn(`[${FUNCTION_NAME}] Missing Svix headers — rejecting`);
      return new Response("Missing webhook signature", { status: 401 });
    }

    // Reject stale webhooks (> 5 min old) to prevent replay attacks
    const timestampSeconds = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampSeconds) > 300) {
      console.warn(`[${FUNCTION_NAME}] Webhook timestamp too old — rejecting`);
      return new Response("Timestamp too old", { status: 401 });
    }

    // Verify HMAC signature. FAIL CLOSED: an unset secret must reject every
    // webhook, never wave it through. email-inbound is deployed --no-verify-jwt
    // (Resend sends no Authorization header — see webhook-fns-no-verify-jwt), so
    // this signature check is the ONLY gate; skipping it would let anyone who
    // learns the URL POST a forged `email.received` and drive the coach as any
    // user.
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error(
        `[${FUNCTION_NAME}] RESEND_WEBHOOK_SECRET not set — rejecting (fail closed)`
      );
      return new Response("Server misconfigured", { status: 500 });
    }
    const isValid = await verifySvixSignature(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
      webhookSecret
    );
    if (!isValid) {
      console.warn(`[${FUNCTION_NAME}] Invalid Svix signature — rejecting`);
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // ── 1. Validate webhook event type ──
    if (body.type !== "email.received") {
      console.log(`[${FUNCTION_NAME}] Ignoring event: ${body.type}`);
      return new Response("OK", { status: 200 });
    }

    const emailId = body.data?.email_id;
    if (!emailId) {
      console.error(`[${FUNCTION_NAME}] No email_id in webhook payload`);
      return new Response("Missing email_id", { status: 400 });
    }

    console.log(`[${FUNCTION_NAME}] Processing received email: ${emailId}`);

    // ── 2. Fetch full email content from Resend API ──
    const email = await getReceivedEmail(emailId);

    if (!email.from || !email.text) {
      console.error(`[${FUNCTION_NAME}] Email missing from or text body`);
      return new Response("OK", { status: 200 });
    }

    // ── 3. Strip reply noise ──
    const cleanContent = stripEmailNoise(email.text);
    if (!cleanContent || cleanContent.length < 2) {
      console.log(`[${FUNCTION_NAME}] Empty message after stripping noise`);
      return new Response("OK", { status: 200 });
    }

    // ── 4. Match sender to user ──
    // Extract email address from "Name <email@domain.com>" format.
    //
    // Threat note (security-review-2026-07-19): Resend's inbound webhook and
    // Received Emails API expose no SPF/DKIM/DMARC result, so we can't verify in
    // code that `email.from` wasn't spoofed. Two things bound the blast radius
    // regardless: (a) we only match a VERIFIED account email, and (b) the reply
    // below always goes to `user.email` (the account on file), never the raw
    // inbound From — so a spoofed sender can never receive another user's coach
    // output. The residual (a spoofed From injecting a message into that user's
    // history) is controlled by Resend's inbound SPF/DKIM rejection policy,
    // which must be confirmed in the Resend dashboard — it is not enforceable
    // here.
    const senderEmail = extractEmailAddress(email.from);
    if (!senderEmail) {
      console.error(`[${FUNCTION_NAME}] Could not parse sender: ${email.from}`);
      return new Response("OK", { status: 200 });
    }

    const supabase = createSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email, preferred_channel")
      .eq("email", senderEmail.toLowerCase())
      .single();

    if (userError || !user) {
      console.log(
        `[${FUNCTION_NAME}] Unknown sender: ${senderEmail} — ignoring`
      );
      // Don't send an error reply to prevent spam loops
      return new Response("OK", { status: 200 });
    }

    console.log(
      `[${FUNCTION_NAME}] Matched user ${user.id} (${user.name}) from ${senderEmail}`
    );

    // ── 4.5 Thread targeting: a reply lands in the conversation it answers ──
    // Outbound coaching emails encode the conversation two ways: the
    // Message-ID (`coach-<uuid>@…`, echoed back in In-Reply-To/References)
    // and the /dashboard/chat?c=<uuid> deep link quoted in the reply body.
    // Either beats channel-router's timeout-reuse heuristic (which starts a
    // NEW conversation when the reply comes >4h later). Ownership is verified
    // before trusting the id — a forwarded/crafted email can't steer someone
    // else's thread.
    const threadConversationId = await resolveThreadedConversation(
      supabase,
      user.id,
      body,
      email
    );
    if (threadConversationId) {
      console.log(
        `[${FUNCTION_NAME}] Reply threads into conversation ${threadConversationId}`
      );
    }

    // ── 5. Process through coaching pipeline ──
    const coachMessage: CoachMessage = {
      user_id: user.id,
      channel: "email",
      content: cleanContent,
      conversation_id: threadConversationId ?? undefined,
      metadata: {
        email_message_id: emailId,
        email_subject: email.subject,
      },
    };

    const result = await processCoachMessage(coachMessage);

    // ── 6. Send coaching response back via email ──
    // Brand follows the conversation's resolved program (channel-router 2.5) —
    // a Relatti conversation replies as Relatti, from mail.relatti.com.
    // reply-to stays coach@mail.masterytv.com: the only inbound domain.
    const edgeBrand = brandForProgram(result.program);
    const brand = edgeBrand.id;
    const brandName = edgeBrand.coachName;
    const subject = email.subject?.startsWith("Re:")
      ? email.subject
      : `Re: ${email.subject || brandName}`;

    // Build response with optional disclaimer
    let responseText = result.response;
    if (result.disclaimerShown) {
      responseText = `${COACHING_DISCLAIMER}\n\n---\n\n${responseText}`;
    }

    const html = buildCoachingEmailHtml(
      responseText,
      user.name || "there",
      result.conversationId,
      { brand }
    );

    const threadHeaders = buildThreadHeaders(
      result.conversationId,
      emailId // Reply-To the received email
    );

    await sendEmail({
      // Deliberately the verified account email, NEVER the inbound From — a
      // spoofed sender must not be able to receive this reply (see §4 note).
      to: user.email,
      subject,
      html,
      text: responseText,
      brand,
      replyTo: "coach@mail.masterytv.com",
      headers: threadHeaders,
    });

    console.log(
      `[${FUNCTION_NAME}] Sent coaching response to ${user.email} (conversation: ${result.conversationId})`
    );

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Error:`, (error as Error).message);
    await logError(FUNCTION_NAME, error as Error);
    // Always return 200 to Resend to prevent retries on our errors
    return new Response("OK", { status: 200 });
  }
});

// ─── HELPERS ────────────────────────────────────────────────────────────

/**
 * Find the conversation an email reply belongs to, from the threading
 * signals the outbound mail carried (Message-ID `coach-<uuid>` in
 * In-Reply-To/References, or the quoted `chat?c=<uuid>` deep link). Scans the
 * whole webhook payload + fetched email so it works regardless of which
 * fields Resend surfaces headers in. Returns the id only if the conversation
 * verifiably belongs to this user.
 */
async function resolveThreadedConversation(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  webhookBody: unknown,
  email: unknown
): Promise<string | null> {
  const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const haystack = `${JSON.stringify(webhookBody)}\n${JSON.stringify(email)}`;
  const match =
    haystack.match(new RegExp(`coach-(${UUID})`, "i")) ??
    haystack.match(new RegExp(`chat\\?c=(${UUID})`, "i"));
  if (!match) return null;
  const conversationId = match[1].toLowerCase();

  // Ownership check — conversations row first, then (for email-originated
  // threads that may have no row) any message in that conversation.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (conv) return conversationId;

  const { data: msg } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return msg ? conversationId : null;
}

/**
 * Extract bare email address from RFC 822 format.
 * "John Doe <john@example.com>" → "john@example.com"
 * "john@example.com" → "john@example.com"
 */
function extractEmailAddress(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  // Bare email address
  if (from.includes("@")) return from.trim().toLowerCase();
  return null;
}

/**
 * Verify Svix webhook signature (used by Resend).
 *
 * Svix signs webhooks with HMAC-SHA256:
 *   signature = HMAC-SHA256(secret, "${svixId}.${svixTimestamp}.${body}")
 *
 * The svix-signature header contains comma-separated versioned signatures
 * like "v1,base64sig1 v1,base64sig2". We check if any v1 signature matches.
 *
 * Svix webhook secrets start with "whsec_" followed by base64-encoded key.
 */
async function verifySvixSignature(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): Promise<boolean> {
  try {
    // Strip "whsec_" prefix and decode the base64 key
    const secretKey = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes = Uint8Array.from(atob(secretKey), (c) => c.charCodeAt(0));

    // Import the key for HMAC
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign: "${svixId}.${svixTimestamp}.${body}"
    const signPayload = new TextEncoder().encode(
      `${svixId}.${svixTimestamp}.${body}`
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, signPayload);
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // Compare against each versioned signature in the header
    // Format: "v1,base64sig v1,base64sig2"
    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const [version, value] = sig.split(",");
      // Constant-time compare so signature verification can't be timed to
      // recover the expected HMAC byte-by-byte.
      if (version === "v1" && value && timingSafeEqual(value, expectedSig)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Svix verification error:`, (error as Error).message);
    return false;
  }
}
