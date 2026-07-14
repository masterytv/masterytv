/**
 * PC6.1 acceptance — replay a real conversation through the extractor's
 * supersede flow, entirely IN MEMORY (zero DB writes).
 *
 *   deno run --allow-net --allow-env --allow-read \
 *     scripts/coach-lab/replay-supersede.ts [conversation_id]
 *
 * Default conversation: c5c9b3a1-6d34-4ab7-8db5-2812129bade2 — the 2026-07-13
 * 19:36–19:40 exchange where the plan evolved turn by turn and the extractor
 * created THREE overlapping commitments. Acceptance: the replay ends with
 * exactly ONE active commitment.
 *
 * Fidelity: uses the REAL buildExtractionPrompt() from _shared/post-processor
 * (the byte-identical prompt production runs), the real model + temperature,
 * and the real backstop constants (SUPERSEDE_SIMILARITY / WINDOW) with real
 * embeddings. Only the storage layer is simulated.
 */

import {
  buildExtractionPrompt,
  cosineSim,
  SUPERSEDE_SIMILARITY,
  SUPERSEDE_WINDOW_MS,
  type ActiveCommitmentRef,
} from "../../supabase/functions/_shared/post-processor.ts";

const CONVERSATION_ID = Deno.args[0] ?? "c5c9b3a1-6d34-4ab7-8db5-2812129bade2";

// ── env (from .env.local, like the other coach-lab harnesses) ──
const envText = await Deno.readTextFile(new URL("../../.env.local", import.meta.url));
const env = (k: string) => envText.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_KEY = env("OPENAI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error("Missing env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY)");
  Deno.exit(1);
}

// ── fetch the transcript (read-only) ──
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${CONVERSATION_ID}&select=role,content,created_at&order=created_at.asc`,
  { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
);
const messages: { role: string; content: string; created_at: string }[] = await res.json();
if (!Array.isArray(messages) || messages.length === 0) {
  console.error(`No messages for conversation ${CONVERSATION_ID}`);
  Deno.exit(1);
}

// Pair user → next coach reply, mirroring the production postProcess inputs.
const exchanges: { user: string; coach: string; at: string }[] = [];
for (let i = 0; i < messages.length; i++) {
  if (messages[i].role !== "user") continue;
  const coach = messages.slice(i + 1).find((m) => m.role === "coach");
  if (coach) exchanges.push({ user: messages[i].content, coach: coach.content, at: messages[i].created_at });
}
console.log(`Replaying ${exchanges.length} exchange(s) from ${CONVERSATION_ID}\n`);

// ── in-memory commitment store ──
interface SimCommitment extends ActiveCommitmentRef {
  status: "active" | "superseded";
  superseded_by?: string;
  via?: string;
}
const store: SimCommitment[] = [];
let nextId = 1;

async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  const d = await r.json();
  return d.data.map((e: { embedding: number[] }) => e.embedding);
}

for (const [n, ex] of exchanges.entries()) {
  const active = store.filter((c) => c.status === "active");
  const exchangeTime = new Date(ex.at).getTime();

  // Same clock context production computes (user tz America/New_York).
  const at = new Date(ex.at);
  const todayLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(at);
  const weekdayLocal = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "long",
  }).format(at);

  const prompt = buildExtractionPrompt({
    userMessage: ex.user,
    coachResponse: ex.coach,
    todayLocal,
    weekdayLocal,
    tz: "America/New_York",
    existingCommitments: active,
  });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  const data = await r.json();
  const extracted = JSON.parse(data.choices[0].message.content);
  const commitments: Array<{
    description: string; due_date: string | null; supersedes?: string | null;
  }> = extracted.commitments ?? [];

  console.log(`— Exchange ${n + 1} (${ex.at}): ${commitments.length} commitment(s) extracted`);

  const insertedNew: { id: string; description: string }[] = [];
  for (const c of commitments) {
    const id = `c${nextId++}`;
    store.push({
      id, description: c.description, due_date: c.due_date ?? null,
      created_at: ex.at, status: "active",
    });
    insertedNew.push({ id, description: c.description });
    console.log(`   + ${id}: "${c.description}"${c.supersedes ? ` (supersedes ${c.supersedes})` : ""}`);

    if (c.supersedes) {
      const target = store.find((s) => s.id === c.supersedes && s.status === "active");
      if (target) {
        target.status = "superseded";
        target.superseded_by = id;
        target.via = "extractor";
      }
    }
  }

  // Backstop — identical constants + logic shape to production.
  const candidates = store.filter(
    (c) =>
      c.status === "active" &&
      !insertedNew.some((n2) => n2.id === c.id) &&
      exchangeTime - new Date(c.created_at).getTime() < SUPERSEDE_WINDOW_MS,
  );
  if (insertedNew.length > 0 && candidates.length > 0) {
    const embeddings = await embed([
      ...insertedNew.map((x) => x.description),
      ...candidates.map((x) => x.description),
    ]);
    for (let i = 0; i < insertedNew.length; i++) {
      for (let j = 0; j < candidates.length; j++) {
        const cand = store.find((s) => s.id === candidates[j].id);
        if (!cand || cand.status !== "active") continue;
        const sim = cosineSim(embeddings[i], embeddings[insertedNew.length + j]);
        if (sim > SUPERSEDE_SIMILARITY) {
          cand.status = "superseded";
          cand.superseded_by = insertedNew[i].id;
          cand.via = `backstop sim=${sim.toFixed(3)}`;
          console.log(`   ⤷ backstop: ${cand.id} superseded by ${insertedNew[i].id} (sim=${sim.toFixed(3)})`);
        } else if (sim > 0.7) {
          console.log(`   · backstop checked ${cand.id} vs ${insertedNew[i].id}: sim=${sim.toFixed(3)} (below ${SUPERSEDE_SIMILARITY})`);
        }
      }
    }
  }
}

// ── verdict ──
console.log("\n═══ Final state ═══");
for (const c of store) {
  console.log(
    `${c.status === "active" ? "ACTIVE    " : "superseded"} ${c.id}: "${c.description}"` +
    (c.superseded_by ? ` → ${c.superseded_by} [${c.via}]` : ""),
  );
}
const activeCount = store.filter((c) => c.status === "active").length;
console.log(`\nActive commitments: ${activeCount}`);
if (activeCount === 1) {
  console.log("PASS — replay converges to ONE active commitment.");
} else {
  console.error(`FAIL — expected 1 active commitment, got ${activeCount}.`);
  Deno.exit(1);
}
