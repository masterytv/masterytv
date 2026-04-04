/**
 * Telegram Connect — Generates deep-link tokens for account linking.
 *
 * POST /functions/v1/telegram-connect
 * Auth: JWT required (authenticated user)
 * Body: { action: "generate" | "disconnect" }
 *
 * Flow:
 * 1. User clicks "Connect Telegram" on dashboard
 * 2. This function generates a short-lived token
 * 3. Returns a deep link: https://t.me/Mastery_Coach_Bot?start=<token>
 * 4. User opens link → Telegram bot receives /start → validates token → links account
 *
 * Architecture: SPRINT.md S3.6
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse } from "../_shared/errors.ts";

const FUNCTION_NAME = "telegram-connect";
const BOT_USERNAME = "Mastery_Coach_Bot";
const TOKEN_TTL_MINUTES = 15;

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  let userId: string | undefined;

  try {
    // ── 1. Authenticate ──
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    const body = await req.json();
    const action = body.action || "generate";

    if (action === "disconnect") {
      return await handleDisconnect(userId);
    }

    // ── 2. Check if already connected ──
    const supabase = createSupabaseClient();
    const { data: existingUser } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .eq("id", userId)
      .single();

    if (existingUser?.telegram_chat_id) {
      return new Response(
        JSON.stringify({
          connected: true,
          message: "Telegram is already connected.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 3. Clean up any existing tokens for this user ──
    await supabase
      .from("telegram_connect_tokens")
      .delete()
      .eq("user_id", userId);

    // ── 4. Generate new token ──
    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_MINUTES * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabase
      .from("telegram_connect_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt,
      });

    if (insertError) {
      throw new Error(`Failed to create connect token: ${insertError.message}`);
    }

    // ── 5. Return deep link ──
    const deepLink = `https://t.me/${BOT_USERNAME}?start=${token}`;

    return new Response(
      JSON.stringify({
        connected: false,
        deep_link: deepLink,
        expires_in_minutes: TOKEN_TTL_MINUTES,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    await logError(FUNCTION_NAME, error as Error, userId);
    console.error(`[${FUNCTION_NAME}]`, (error as Error).message);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to generate Telegram connection link.",
      500,
      corsHeaders
    );
  }
});

// ─── DISCONNECT ──────────────────────────────────────────────────────────

async function handleDisconnect(userId: string): Promise<Response> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("users")
    .update({ telegram_chat_id: null })
    .eq("id", userId);

  if (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to disconnect Telegram.",
      500,
      corsHeaders
    );
  }

  return new Response(
    JSON.stringify({
      connected: false,
      message: "Telegram disconnected successfully.",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * URL-safe base64, 32 bytes = 43 chars.
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
