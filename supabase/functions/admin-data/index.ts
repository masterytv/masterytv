/**
 * Admin Data — Unified admin API endpoint.
 *
 * S6.8–S6.10: Handles all admin queries and mutations.
 * Admin gate: verifies JWT user has is_admin = true before any action.
 * Uses service role to bypass RLS for cross-user aggregate queries.
 *
 * Routes (via ?action= query param):
 *   - metrics     → Aggregate dashboard metrics
 *   - crisis-flags → Crisis flag records
 *   - frameworks  → Framework config + usage stats
 *   - resolve-crisis → Mark a crisis flag as resolved
 *   - update-framework → Toggle active / update weight
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // ── Auth gate: verify admin ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Create a user-scoped client to get the authenticated user
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user: authUser } } = await userClient.auth.getUser();
  if (!authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Service role client for cross-user queries
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check is_admin
  const { data: adminUser } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", authUser.id)
    .single();

  if (!adminUser?.is_admin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // ── Route by action ──
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    let result: unknown;

    switch (action) {
      case "metrics":
        result = await getMetrics(supabase);
        break;
      case "crisis-flags":
        result = await getCrisisFlags(supabase);
        break;
      case "frameworks":
        result = await getFrameworks(supabase);
        break;
      case "resolve-crisis": {
        const body = await req.json();
        result = await resolveCrisis(supabase, body.flag_id);
        break;
      }
      case "update-framework": {
        const body = await req.json();
        result = await updateFramework(supabase, body);
        break;
      }
      case "debug-trace": {
        const messageId = url.searchParams.get("message_id");
        if (!messageId) {
          return new Response(
            JSON.stringify({ error: "message_id query param required" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }
        result = await getDebugTrace(supabase, messageId);
        break;
      }
      case "coach-profile": {
        const targetUserId = url.searchParams.get("user_id");
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: "user_id query param required" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }
        result = await getCoachProfile(supabase, targetUserId);
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[admin-data] Error in action=${action}:`, (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});


// ═══════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════

type SupabaseClient = ReturnType<typeof createClient>;

async function getMetrics(supabase: SupabaseClient) {
  // ── Users by tier ──
  const { data: users } = await supabase
    .from("users")
    .select("id, subscription_tier, created_at");

  const total = users?.length ?? 0;
  const free = users?.filter(u => u.subscription_tier === "free").length ?? 0;
  const core = users?.filter(u => u.subscription_tier === "core").length ?? 0;
  const premium = users?.filter(u => u.subscription_tier === "premium").length ?? 0;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const newThisWeek = users?.filter(u => u.created_at >= oneWeekAgo).length ?? 0;

  // ── Engagement (last 7 days) ──
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dauCount } = await supabase
    .from("messages")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", oneDayAgo);

  const { data: msgStats } = await supabase
    .from("messages")
    .select("user_id")
    .eq("role", "user")
    .gte("created_at", oneWeekAgo);

  const userMsgCounts: Record<string, number> = {};
  msgStats?.forEach(m => {
    userMsgCounts[m.user_id] = (userMsgCounts[m.user_id] || 0) + 1;
  });
  const activeUserCount = Object.keys(userMsgCounts).length;
  const avgMsgsPerUser = activeUserCount > 0
    ? Math.round((msgStats?.length ?? 0) / activeUserCount * 10) / 10
    : 0;

  // ── Revenue ──
  const tierPrices: Record<string, number> = { free: 0, core: 99, premium: 199 };
  const mrr = (users ?? []).reduce((sum, u) => sum + (tierPrices[u.subscription_tier] || 0), 0);
  const conversionRate = total > 0
    ? Math.round(((core + premium) / total) * 100)
    : 0;

  // ── Costs (last 30 days) ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: costs } = await supabase
    .from("cost_tracking")
    .select("cost_usd, model, purpose")
    .gte("created_at", thirtyDaysAgo);

  const totalCost = costs?.reduce((sum, c) => sum + Number(c.cost_usd), 0) ?? 0;
  const avgCostPerUser = total > 0 ? Math.round(totalCost / total * 100) / 100 : 0;

  // Cost by model
  const costByModel: Record<string, number> = {};
  costs?.forEach(c => {
    costByModel[c.model] = (costByModel[c.model] || 0) + Number(c.cost_usd);
  });

  // ── Crisis flags (unresolved) ──
  const { count: unresolvedCrisis } = await supabase
    .from("crisis_flags")
    .select("id", { count: "exact", head: true })
    .eq("reviewed", false);

  return {
    users: { total, free, core, premium, newThisWeek },
    engagement: {
      dau: dauCount ?? 0,
      avgMessagesPerUser: avgMsgsPerUser,
      activeUsers7d: activeUserCount,
    },
    revenue: { mrr, conversionRate },
    costs: {
      total30d: Math.round(totalCost * 100) / 100,
      avgPerUser: avgCostPerUser,
      byModel: costByModel,
    },
    crisisFlags: unresolvedCrisis ?? 0,
  };
}


async function getCrisisFlags(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("crisis_flags")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return { flags: data ?? [] };
}


async function getFrameworks(supabase: SupabaseClient) {
  // Get frameworks
  const { data: frameworks, error } = await supabase
    .from("framework_config")
    .select("id, name, tier, category, description, is_active, selection_weight, requires_trust_level")
    .order("tier", { ascending: true });

  if (error) throw error;

  // Get usage counts
  const { data: usageCounts } = await supabase
    .from("framework_usage")
    .select("framework");

  const counts: Record<string, number> = {};
  usageCounts?.forEach(u => {
    counts[u.framework] = (counts[u.framework] || 0) + 1;
  });

  const enriched = (frameworks ?? []).map(f => ({
    ...f,
    usage_count: counts[f.name] || 0,
  }));

  return { frameworks: enriched };
}


async function resolveCrisis(supabase: SupabaseClient, flagId: string) {
  if (!flagId) throw new Error("flag_id is required");

  const { error } = await supabase
    .from("crisis_flags")
    .update({ reviewed: true, reviewed_at: new Date().toISOString() })
    .eq("id", flagId);

  if (error) throw error;
  return { success: true };
}


async function updateFramework(
  supabase: SupabaseClient,
  body: { framework_id: string; is_active?: boolean; selection_weight?: number }
) {
  if (!body.framework_id) throw new Error("framework_id is required");

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }
  if (typeof body.selection_weight === "number") {
    updates.selection_weight = Math.max(0, Math.min(2, body.selection_weight));
  }

  const { error } = await supabase
    .from("framework_config")
    .update(updates)
    .eq("id", body.framework_id);

  if (error) throw error;
  return { success: true };
}


async function getDebugTrace(supabase: SupabaseClient, messageId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, user_id, role, metadata, created_at")
    .eq("id", messageId)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Message not found");

  // Extract debug_trace from message metadata
  const metadata = data.metadata as Record<string, unknown> | null;
  const debugTrace = metadata?.debug_trace ?? null;

  return {
    message_id: data.id,
    user_id: data.user_id,
    role: data.role,
    created_at: data.created_at,
    debug_trace: debugTrace,
    has_trace: debugTrace !== null,
  };
}


async function getCoachProfile(supabase: SupabaseClient, userId: string) {
  // Fetch current profile
  const { data: profile, error: profileError } = await supabase
    .from("coach_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (profileError) throw profileError;

  // Fetch recent profile history (last 50 snapshots)
  const { data: history, error: historyError } = await supabase
    .from("coach_profile_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // History table may not exist yet — don't throw
  if (historyError) {
    console.warn("[admin-data] Coach profile history query failed:", historyError.message);
  }

  return {
    profile: profile ?? null,
    history: history ?? [],
  };
}
