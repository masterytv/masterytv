/**
 * Decoded — regenerate stale assessment_reports after a re-score.
 *
 * assessment_reports are LLM snapshots taken at generation time; a scoring fix
 * does NOT update them. This regenerates them from the CORRECTED scores, reusing
 * the app's own logic:
 *   • archetype: src classifyArchetype (recomputed from corrected IPIP-50 — the
 *     canonical generator + the backfill-v2 route both SKIP this when an archetype
 *     is already set, which is exactly why these went stale)
 *   • sections: src V2 templates (buildV2SectionPromptWithVoice) — the same path
 *     the in-app /api/decoded/backfill-v2 regen route uses (default voice)
 *   • sublabel/tagline: the canonical generator's prompt, only when the base changes
 *
 *   DRY-RUN (default): npx tsx scripts/decoded-regen-reports.ts          (no LLM, no writes)
 *   APPLY:             npx tsx scripts/decoded-regen-reports.ts --apply  [--limit=N]
 *
 * Reads creds from .env.local (service role + OPENAI_API_KEY). Never logs secrets.
 */
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { classifyArchetype } from "../src/lib/decoded/archetypes/classifier";
import {
  getV2SectionIds,
  V2_REPORT_PROMPTS,
  buildV2SectionPromptWithVoice,
} from "../src/lib/decoded/report/prompts/templates-v2";
import type { IPIP50Score } from "../src/lib/decoded/scoring/types";

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
const OPENAI_KEY = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
if (!URL_ || !KEY) throw new Error("Missing Supabase creds in .env.local");

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0");
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

async function callJSON(system: string, user: string): Promise<Record<string, unknown>> {
  if (!openai) throw new Error("OPENAI_API_KEY missing");
  const c = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });
  return JSON.parse(c.choices[0]?.message?.content ?? "{}");
}

async function main() {
  console.log(`\n=== Regenerate Decoded reports (${APPLY ? "APPLY" : "DRY-RUN — no LLM, no writes"}) ===\n`);

  let { data: reports, error } = await sb
    .from("assessment_reports")
    .select("id, assessment_id, user_id, archetype_base, archetype_sublabel, archetype_tagline")
    .order("generated_at", { ascending: false });
  if (error) throw error;
  if (LIMIT > 0) reports = (reports ?? []).slice(0, LIMIT);

  let baseChanges = 0;
  let regenerated = 0;

  for (const report of reports ?? []) {
    const { data: scoreRows } = await sb
      .from("assessment_scores")
      .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
      .eq("assessment_id", report.assessment_id);
    const ipipRow = (scoreRows ?? []).find((s) => s.instrument_id === "ipip50");
    if (!ipipRow?.subscale_scores) {
      console.log(`! ${report.id} — no IPIP-50 scores, skipping`);
      continue;
    }

    const ipip50 = {
      instrumentId: "ipip50",
      subscaleScores: ipipRow.subscale_scores,
      percentileScores: ipipRow.percentile_scores ?? {},
      rawScoreDetails: {},
    } as IPIP50Score;
    const classification = classifyArchetype(ipip50);
    const newBase = classification.primary.name;
    const baseChanged = newBase !== report.archetype_base;
    if (baseChanged) baseChanges++;

    console.log(
      `${report.id} (assess ${report.assessment_id.slice(0, 8)}): ` +
        `${report.archetype_base} → ${newBase}${baseChanged ? "   ⬅ CHANGED" : ""}`,
    );

    if (!APPLY) continue;

    let sublabel = report.archetype_sublabel;
    let tagline = report.archetype_tagline;
    if (baseChanged) {
      try {
        const r = await callJSON(
          `You are a personality coach. Generate a creative, personal sublabel for someone classified as "The ${newBase}" archetype. Return JSON: { "sublabel": "The [Creative 2-3 word descriptor]", "tagline": "One short sentence about their essence" }`,
          `Archetype: ${newBase}\nBig Five z-scores: ${JSON.stringify(classification.zScores)}\n\nCreate a unique, memorable sublabel that captures what makes THIS variant of the ${newBase} special.`,
        );
        sublabel = (r.sublabel as string) ?? sublabel;
        tagline = (r.tagline as string) ?? tagline;
      } catch (e) {
        console.warn(`  sublabel gen failed: ${(e as Error).message}`);
      }
    }

    const archetypeJson = JSON.stringify({ base: newBase, sublabel, tagline });
    const bigFiveJson = JSON.stringify(ipipRow.percentile_scores ?? {});
    const allScoresJson = JSON.stringify(scoreRows);

    const sections: Record<string, unknown> = {};
    for (const sectionId of getV2SectionIds()) {
      const template = V2_REPORT_PROMPTS[sectionId];
      try {
        const { system, user } = buildV2SectionPromptWithVoice(sectionId, allScoresJson, archetypeJson, bigFiveJson);
        const parsed = await callJSON(system, user);
        sections[sectionId] = {
          title: template.title,
          content_markdown: JSON.stringify(parsed),
          coach_question: parsed.coach_question ?? null,
          min_tier: template.minTier,
        };
      } catch (e) {
        console.error(`  ✗ section ${sectionId} failed: ${(e as Error).message}`);
        sections[sectionId] = {
          title: template.title,
          content_markdown: "_This section could not be generated. Please try again._",
          coach_question: null,
          min_tier: template.minTier,
        };
      }
    }

    const { error: upErr } = await sb
      .from("assessment_reports")
      .update({
        archetype_base: newBase,
        archetype_sublabel: sublabel,
        archetype_tagline: tagline,
        sections,
        report_version: 2,
        generation_model: "gpt-4o",
        generated_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    if (upErr) console.error(`  ✗ DB update failed: ${upErr.message}`);
    else {
      regenerated++;
      console.log(`  ✓ ${Object.keys(sections).length} sections written (sublabel: ${sublabel ?? "—"})`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Reports scanned: ${reports?.length ?? 0}`);
  console.log(`Archetype base changes: ${baseChanges}`);
  if (APPLY) console.log(`Reports regenerated: ${regenerated}`);
  else console.log(`DRY-RUN — re-run with --apply to regenerate narratives (gpt-4o).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
