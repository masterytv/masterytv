/**
 * Health Check — S6.13
 *
 * Monitors system health by checking for recent activity.
 * Alerts admin (via error_log + optional email) if no messages
 * have been processed in 15 minutes during business hours.
 *
 * Triggered by pg_cron every 15 minutes.
 *
 * Checks:
 * 1. Recent messages processed (last 15 min)
 * 2. Failed scheduled messages accumulating
 * 3. Error log spike detection
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FUNCTION_NAME = "cron-health-check";
const ALERT_WINDOW_MINUTES = 15;
const ERROR_SPIKE_THRESHOLD = 10; // 10+ errors in 15 min = alert
const FAILED_MSG_THRESHOLD = 5; // 5+ failed scheduled messages = alert

function createSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

interface HealthAlert {
  type: "no_activity" | "error_spike" | "failed_messages" | "llm_fallback";
  severity: "warning" | "critical";
  message: string;
  details: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createSupabaseClient();
  const alerts: HealthAlert[] = [];
  const windowStart = new Date(
    Date.now() - ALERT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  try {
    // ── 1. Check for recent message activity ──
    const { count: recentMessages } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart);

    // Only alert on no activity during business hours (8am-10pm UTC)
    const currentHour = new Date().getUTCHours();
    const isBusinessHours = currentHour >= 8 && currentHour <= 22;

    if ((recentMessages ?? 0) === 0 && isBusinessHours) {
      // Check if there are ANY users active (don't alert if nobody is using the app)
      const { count: totalUsers } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true });

      if ((totalUsers ?? 0) > 5) {
        // Only alert if we have enough users where zero activity is suspicious
        alerts.push({
          type: "no_activity",
          severity: "warning",
          message: `No messages processed in the last ${ALERT_WINDOW_MINUTES} minutes during business hours`,
          details: { recent_messages: 0, total_users: totalUsers },
        });
      }
    }

    // ── 2. Check for error spikes ──
    const { count: recentErrors } = await supabase
      .from("error_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart);

    if ((recentErrors ?? 0) >= ERROR_SPIKE_THRESHOLD) {
      // Get the most common error
      const { data: topErrors } = await supabase
        .from("error_log")
        .select("function_name, error_message")
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(5);

      alerts.push({
        type: "error_spike",
        severity: "critical",
        message: `${recentErrors} errors in the last ${ALERT_WINDOW_MINUTES} minutes`,
        details: {
          error_count: recentErrors,
          top_errors: topErrors ?? [],
        },
      });
    }

    // ── 3. Check for failed scheduled messages ──
    const { count: failedMessages } = await supabase
      .from("scheduled_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");

    if ((failedMessages ?? 0) >= FAILED_MSG_THRESHOLD) {
      alerts.push({
        type: "failed_messages",
        severity: "warning",
        message: `${failedMessages} scheduled messages have permanently failed (max retries exceeded)`,
        details: { failed_count: failedMessages },
      });
    }

    // ── 4. Check for LLM fallback usage (S6.13) ──
    const { count: fallbackCount } = await supabase
      .from("cost_tracking")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart)
      .eq("model", "gpt-4o")
      .like("purpose", "coach-%");

    if ((fallbackCount ?? 0) > 0) {
      alerts.push({
        type: "llm_fallback",
        severity: "warning",
        message: `${fallbackCount} coaching responses served via GPT-4o fallback (Claude may be down)`,
        details: { fallback_count: fallbackCount },
      });
    }

    // ── 5. Store alerts ──
    if (alerts.length > 0) {
      // Log to error_log for admin dashboard visibility
      for (const alert of alerts) {
        await supabase.from("error_log").insert({
          function_name: FUNCTION_NAME,
          error_message: `[${alert.severity.toUpperCase()}] ${alert.message}`,
          metadata: alert.details,
        });
      }

      console.warn(
        `[${FUNCTION_NAME}] ${alerts.length} alerts generated:`,
        alerts.map((a) => a.message)
      );

      // TODO: Send email to admin via Resend when alerts are critical
      // Future: integrate with PagerDuty / Slack for real alerting
    } else {
      console.log(`[${FUNCTION_NAME}] All checks passed ✓`);
    }

    return new Response(
      JSON.stringify({
        status: alerts.length === 0 ? "healthy" : "degraded",
        alerts,
        checks: {
          recent_messages: recentMessages ?? 0,
          recent_errors: recentErrors ?? 0,
          failed_scheduled: failedMessages ?? 0,
          llm_fallbacks: fallbackCount ?? 0,
        },
        timestamp: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Fatal error:`, (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
