import { createClient } from "@/lib/supabase/server";

interface DayRow {
  day: string;
  model: string;
  purpose: string;
  requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: string;
}

interface UserRow {
  email: string;
  requests: number;
  total_cost_usd: string;
  avg_prompt_tokens: string;
}

interface ModelRow {
  model: string;
  purpose: string;
  requests: number;
  total_cost_usd: string;
  avg_tokens_in: string;
  avg_tokens_out: string;
}

export default async function CostDashboardPage() {
  const supabase = await createClient();

  const [dailyRes, userRes, modelRes, summaryRes] = await Promise.all([
    // Last 30 days by day
    supabase.rpc("exec_sql" as never, {
      sql: `SELECT DATE(created_at) AS day, model, purpose, COUNT(*) AS requests,
              SUM(tokens_in) AS total_tokens_in, SUM(tokens_out) AS total_tokens_out,
              ROUND(SUM(cost_usd)::numeric, 4) AS total_cost_usd
            FROM cost_tracking WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at), model, purpose ORDER BY day DESC, total_cost_usd DESC`,
    }),
    // Per-user (last 30 days)
    supabase.from("cost_tracking").select(`
      user_id, cost_usd, tokens_in, purpose
    `).gte("created_at", new Date(Date.now() - 30 * 86400 * 1000).toISOString()),
    // Model breakdown (+ metadata for the PC5.5 per-brand attribution)
    supabase.from("cost_tracking").select("model, purpose, cost_usd, tokens_in, tokens_out, metadata")
      .gte("created_at", new Date(Date.now() - 30 * 86400 * 1000).toISOString()),
    // Summary totals
    supabase.from("cost_tracking").select("cost_usd, created_at")
      .gte("created_at", new Date(Date.now() - 60 * 86400 * 1000).toISOString()),
  ]);

  // ── Compute summary cards ──
  const allRows = (summaryRes.data ?? []) as { cost_usd: number; created_at: string }[];
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
  const todayStart = new Date(now.toDateString()).toISOString();

  const thisMonth = allRows.filter(r => r.created_at >= thisMonthStart).reduce((s, r) => s + Number(r.cost_usd), 0);
  const lastMonth = allRows.filter(r => r.created_at >= lastMonthStart && r.created_at <= lastMonthEnd).reduce((s, r) => s + Number(r.cost_usd), 0);
  const today = allRows.filter(r => r.created_at >= todayStart).reduce((s, r) => s + Number(r.cost_usd), 0);
  const daysElapsed = now.getDate();
  const projected = daysElapsed > 0 ? (thisMonth / daysElapsed) * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : 0;
  const pctChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  // ── Daily aggregation for chart ──
  const rawDaily = (modelRes.data ?? []) as { model: string; purpose: string; cost_usd: number; tokens_in: number; tokens_out: number; created_at?: string; metadata?: { program?: string | null } | null }[];

  // ── PC5.5: per-brand spend (last 30 days) ──
  // Write paths stamp metadata.program at cost time (coach, channel-router,
  // post-processor, embeddings, search-facts). program "relationship" is
  // Relatti; any other stamp is the executive/MasteryTV engine. Rows without a
  // stamp (pre-2026-07-14, or system jobs with no conversation context) are
  // "unattributed" — deliberately not guessed, so the brand columns stay honest
  // and still sum to the platform total.
  const brandTotals = { relatti: 0, masterytv: 0, unattributed: 0 };
  rawDaily.forEach(r => {
    const program = r.metadata?.program ?? null;
    const bucket = !program ? "unattributed" : program === "relationship" ? "relatti" : "masterytv";
    brandTotals[bucket] += Number(r.cost_usd);
  });
  const brandTotal30d = brandTotals.relatti + brandTotals.masterytv + brandTotals.unattributed;

  // Group by day from cost_tracking directly
  const costByDay: Record<string, number> = {};
  const dailyCostRows = (summaryRes.data ?? []) as { cost_usd: number; created_at: string }[];
  dailyCostRows.forEach(r => {
    const d = r.created_at.slice(0, 10);
    costByDay[d] = (costByDay[d] ?? 0) + Number(r.cost_usd);
  });
  const dailyChart = Object.entries(costByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14); // last 14 days
  const chartMax = Math.max(...dailyChart.map(([, v]) => v), 0.01);

  // ── Per-user aggregation ──
  const userCostMap: Record<string, { cost: number; requests: number; tokensIn: number }> = {};
  const rawUserRows = (userRes.data ?? []) as { user_id: string; cost_usd: number; tokens_in: number; purpose: string }[];
  rawUserRows.forEach(r => {
    if (!userCostMap[r.user_id]) userCostMap[r.user_id] = { cost: 0, requests: 0, tokensIn: 0 };
    userCostMap[r.user_id].cost += Number(r.cost_usd);
    if (r.purpose === "coach") {
      userCostMap[r.user_id].requests++;
      userCostMap[r.user_id].tokensIn += r.tokens_in ?? 0;
    }
  });

  // Fetch emails for user IDs
  const userIds = Object.keys(userCostMap);
  const { data: userProfiles } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);
  const emailMap: Record<string, string> = {};
  (userProfiles ?? []).forEach((u: { id: string; email: string }) => { emailMap[u.id] = u.email; });

  const userTable = Object.entries(userCostMap)
    .map(([id, v]) => ({
      email: emailMap[id] ?? id.slice(0, 8) + "…",
      cost: v.cost,
      requests: v.requests,
      avgPrompt: v.requests > 0 ? Math.round(v.tokensIn / v.requests) : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  // ── Model breakdown ──
  const modelMap: Record<string, { cost: number; requests: number; tokensIn: number; tokensOut: number }> = {};
  rawDaily.forEach(r => {
    const k = `${r.model}::${r.purpose}`;
    if (!modelMap[k]) modelMap[k] = { cost: 0, requests: 0, tokensIn: 0, tokensOut: 0 };
    modelMap[k].cost += Number(r.cost_usd);
    modelMap[k].requests++;
    modelMap[k].tokensIn += r.tokens_in ?? 0;
    modelMap[k].tokensOut += r.tokens_out ?? 0;
  });
  const modelTable = Object.entries(modelMap)
    .map(([k, v]) => ({
      model: k.split("::")[0],
      purpose: k.split("::")[1],
      cost: v.cost,
      requests: v.requests,
      costPerReq: v.requests > 0 ? v.cost / v.requests : 0,
      avgIn: v.requests > 0 ? Math.round(v.tokensIn / v.requests) : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  const fmt = (n: number) => `$${n.toFixed(4)}`;
  const fmtShort = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-body)", marginBottom: "0.25rem" }}>
        Cost Dashboard
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-hint)", marginBottom: "2rem" }}>
        LLM API spend across all users · Last 30 days
      </p>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "This Month", value: fmtShort(thisMonth), sub: pctChange !== null ? `${pctChange > 0 ? "+" : ""}${pctChange.toFixed(0)}% vs last month` : "First month" },
          { label: "Today", value: fmtShort(today), sub: "UTC day" },
          { label: "Projected Month", value: fmtShort(projected), sub: `Based on ${daysElapsed}d elapsed` },
          { label: "Last Month", value: fmtShort(lastMonth), sub: "Full month actual" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--color-surface-100)", borderRadius: "12px", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-hint)", marginBottom: "0.4rem" }}>
              {card.label}
            </p>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-body)", marginBottom: "0.25rem" }}>
              {card.value}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-hint)" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── PC5.5: Spend by Brand ── */}
      <div style={{ background: "var(--color-surface-100)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-body)", marginBottom: "1rem" }}>
          Spend by Brand — Last 30 Days
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { key: "relatti", label: "Relatti", chip: "ad-brand-chip--relatti", value: brandTotals.relatti },
            { key: "masterytv", label: "MasteryTV", chip: "ad-brand-chip--masterytv", value: brandTotals.masterytv },
            { key: "unattributed", label: "Unattributed", chip: "ad-brand-chip--unattributed", value: brandTotals.unattributed },
            { key: "total", label: "Platform Total", chip: null, value: brandTotal30d },
          ].map(col => (
            <div key={col.key}>
              {col.chip ? (
                <span className={`ad-brand-chip ${col.chip}`} style={{ marginBottom: "0.4rem" }}>{col.label}</span>
              ) : (
                <p style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-hint)", marginBottom: "0.4rem" }}>{col.label}</p>
              )}
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-body)", marginTop: "0.35rem" }}>
                {fmt(col.value)}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-hint)", marginTop: "0.75rem" }}>
          Attribution comes from the program stamped on each cost row at write time.
          Unattributed = rows from before stamping shipped (2026-07-14) plus system jobs with no
          conversation context. Brand columns always sum to the platform total — nothing is guessed.
        </p>
      </div>

      {/* ── Daily Spend Chart ── */}
      <div style={{ background: "var(--color-surface-100)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-body)", marginBottom: "1rem" }}>
          Daily Spend — Last 14 Days
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
          {dailyChart.map(([day, cost]) => (
            <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "0.6rem", color: "var(--text-hint)" }}>{fmt(cost)}</span>
              <div
                title={`${day}: ${fmt(cost)}`}
                style={{
                  width: "100%",
                  height: `${Math.max((cost / chartMax) * 56, 3)}px`,
                  background: cost > 0.5 ? "#ef4444" : cost > 0.1 ? "#f59e0b" : "rgba(96,99,238,0.5)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <span style={{ fontSize: "0.55rem", color: "var(--text-hint)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                {day.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.7rem", color: "var(--text-hint)", marginTop: "0.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          {[
            { color: "rgba(96,99,238,0.5)", label: "under $0.10" },
            { color: "#f59e0b", label: "$0.10–$0.50" },
            { color: "#ef4444", label: "over $0.50" },
          ].map(l => (
            <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "9999px", background: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </p>
      </div>

      {/* ── Per-User Table ── */}
      <div style={{ background: "var(--color-surface-100)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-body)", marginBottom: "1rem" }}>
          Cost per User
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-surface-300)" }}>
              {["User", "Coach Requests", "Avg Prompt (tokens)", "Total Cost", "Cost/Request", "Flag"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-hint)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {userTable.map(u => {
              const bloated = u.avgPrompt > 12000;
              return (
                <tr key={u.email} style={{ borderBottom: "1px solid var(--color-surface-200)" }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-body)" }}>{u.email}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{u.requests}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: bloated ? "#f59e0b" : "var(--text-secondary)" }}>
                    {u.avgPrompt.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-body)", fontWeight: 600 }}>{fmt(u.cost)}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>
                    {u.requests > 0 ? fmt(u.cost / u.requests) : "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    {bloated && <span style={{ fontSize: "0.7rem", color: "#f59e0b" }}>Prompt bloat</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: "0.72rem", color: "var(--text-hint)", marginTop: "0.75rem" }}>
          &ldquo;Prompt bloat&rdquo; = avg prompt &gt;12K tokens — memory may need pruning (Sprint S-COST-11)
        </p>
      </div>

      {/* ── Model Breakdown ── */}
      <div style={{ background: "var(--color-surface-100)", borderRadius: "12px", padding: "1.5rem" }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-body)", marginBottom: "1rem" }}>
          Model Breakdown
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-surface-300)" }}>
              {["Model", "Purpose", "Requests", "Avg Input (tokens)", "Total Cost", "Cost / Request"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-hint)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelTable.map((m, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-surface-200)" }}>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-body)", fontFamily: "monospace", fontSize: "0.78rem" }}>{m.model}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{m.purpose}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{m.requests}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{m.avgIn.toLocaleString()}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-body)", fontWeight: 600 }}>{fmt(m.cost)}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{fmt(m.costPerReq)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
