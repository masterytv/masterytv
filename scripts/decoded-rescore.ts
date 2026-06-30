/**
 * Decoded/Relatti — re-score completed assessments from stored raw answers.
 *
 * Reuses the SAME scoring engine the app uses (no duplicated logic): reads each
 * completed assessment's raw item answers out of assessment_progress.responses,
 * runs scoreAllInstruments + deriveCoachingFlags, and (with --apply) upserts
 * assessment_scores + updates assessments.coaching_flags. Raw answers survive in
 * the JSONB blob, so this corrects scoring-logic fixes WITHOUT retakes.
 *
 *   DRY-RUN (default): npx tsx scripts/decoded-rescore.ts
 *   APPLY:             npx tsx scripts/decoded-rescore.ts --apply
 *
 * Reads Supabase creds from .env.local (service role). Never logs secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import {
  scoreAllInstruments,
  deriveCoachingFlags,
} from "../src/lib/decoded/scoring/engine";
import type { InstrumentScore } from "../src/lib/decoded/scoring/types";

// ── env (.env.local) — used only to build the client, never printed ──────────
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");

const APPLY = process.argv.includes("--apply");
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

const round = (v: unknown): unknown =>
  typeof v === "number" ? Math.round(v * 1000) / 1000 : v;

/** Compact field-level diff of two score objects → ["sdi: 12→18", ...] */
function diffScore(oldRow: Record<string, unknown> | undefined, next: InstrumentScore): string[] {
  const out: string[] = [];
  const oTotal = oldRow?.total_score ?? null;
  const nTotal = next.totalScore ?? null;
  if (round(oTotal) !== round(nTotal)) out.push(`total: ${oTotal}→${nTotal}`);

  const oSub = (oldRow?.subscale_scores ?? {}) as Record<string, unknown>;
  const nSub = next.subscaleScores ?? {};
  for (const k of new Set([...Object.keys(oSub), ...Object.keys(nSub)])) {
    if (round(oSub[k]) !== round((nSub as Record<string, number>)[k])) {
      out.push(`${k}: ${oSub[k] ?? "—"}→${(nSub as Record<string, number>)[k] ?? "—"}`);
    }
  }
  const oInt = (oldRow?.interpretation ?? {}) as Record<string, unknown>;
  const nInt = next.interpretation ?? {};
  for (const k of new Set([...Object.keys(oInt), ...Object.keys(nInt)])) {
    if (round(oInt[k]) !== round((nInt as Record<string, unknown>)[k])) {
      out.push(`${k}: ${oInt[k] ?? "—"}→${(nInt as Record<string, unknown>)[k] ?? "—"}`);
    }
  }
  return out;
}

async function main() {
  console.log(`\n=== Decoded re-score (${APPLY ? "APPLY — will write" : "DRY-RUN — read only"}) ===\n`);

  const { data: assessments, error } = await sb
    .from("assessments")
    .select("id, user_id, coaching_flags")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: true });
  if (error) throw error;

  let changedAssessments = 0;
  const instrumentChangeCounts: Record<string, number> = {};
  let styleChanges = 0;

  for (const a of assessments ?? []) {
    const { data: progress } = await sb
      .from("assessment_progress")
      .select("responses")
      .eq("assessment_id", a.id)
      .single();
    const responses = progress?.responses as Record<string, Record<string, number>> | undefined;
    if (!responses) {
      console.log(`! ${a.id} — no progress blob, skipping`);
      continue;
    }

    const scores = scoreAllInstruments(responses);
    const flags = deriveCoachingFlags(scores);

    const { data: storedRows } = await sb
      .from("assessment_scores")
      .select("instrument_id, total_score, subscale_scores, interpretation")
      .eq("assessment_id", a.id);
    const stored = new Map((storedRows ?? []).map((r) => [r.instrument_id, r]));

    const lines: string[] = [];
    for (const s of scores) {
      const d = diffScore(stored.get(s.instrumentId), s);
      if (d.length) {
        lines.push(`    ${s.instrumentId}: ${d.join(", ")}`);
        instrumentChangeCounts[s.instrumentId] = (instrumentChangeCounts[s.instrumentId] ?? 0) + 1;
        if (s.instrumentId === "ecr_r_short" && d.some((x) => x.startsWith("attachmentStyle"))) styleChanges++;
      }
    }
    if (lines.length) {
      changedAssessments++;
      console.log(`  ${a.id} (user ${a.user_id})`);
      console.log(lines.join("\n"));
    }

    if (APPLY) {
      const rows = scores.map((score) => ({
        assessment_id: a.id,
        user_id: a.user_id,
        instrument_id: score.instrumentId,
        total_score: score.totalScore ?? null,
        subscale_scores: score.subscaleScores ?? {},
        percentile_scores: score.percentileScores ?? {},
        interpretation: score.interpretation ?? {},
        raw_score_details: score.rawScoreDetails ?? {},
      }));
      const { error: upErr } = await sb
        .from("assessment_scores")
        .upsert(rows, { onConflict: "assessment_id,instrument_id" });
      if (upErr) console.error(`  ! upsert failed for ${a.id}:`, upErr.message);
      const { error: flagErr } = await sb
        .from("assessments")
        .update({ coaching_flags: flags })
        .eq("id", a.id);
      if (flagErr) console.error(`  ! coaching_flags update failed for ${a.id}:`, flagErr.message);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Completed assessments scanned: ${assessments?.length ?? 0}`);
  console.log(`Assessments with score changes: ${changedAssessments}`);
  console.log(`Per-instrument change counts:`, instrumentChangeCounts);
  console.log(`ECR-R attachment-style changes: ${styleChanges}`);
  console.log(APPLY ? `\nWrote updated scores + coaching_flags.` : `\nDRY-RUN — no writes. Re-run with --apply to persist.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
