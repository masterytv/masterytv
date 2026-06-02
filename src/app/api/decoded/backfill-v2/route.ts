/**
 * Decoded Report — v2 Backfill API
 *
 * POST /api/decoded/backfill-v2
 * Body: { report_id: string }
 *
 * Regenerates a report using v2 structured templates.
 * Updates sections in-place and sets report_version = 2.
 *
 * Auth: requires logged-in user who owns the report.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { V2_REPORT_PROMPTS, getV2SectionIds, buildV2SectionPromptWithVoice } from '@/lib/decoded/report/prompts/templates-v2';
import OpenAI from 'openai';

// Allow up to 5 minutes for 8 sequential GPT-4o calls
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const errors: Array<{ section: string; error: string }> = [];

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { report_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { report_id } = body;
  if (!report_id) {
    return NextResponse.json({ error: 'report_id required' }, { status: 400 });
  }

  // Fetch report + verify ownership
  const { data: report, error: reportErr } = await supabase
    .from('assessment_reports')
    .select('id, assessment_id, user_id, archetype_base, archetype_sublabel, archetype_tagline')
    .eq('id', report_id)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: 'Report not found', detail: reportErr?.message }, { status: 404 });
  }
  if (report.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your report' }, { status: 403 });
  }

  // Fetch all scores for this assessment
  const { data: scoreRows, error: scoresErr } = await supabase
    .from('assessment_scores')
    .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
    .eq('assessment_id', report.assessment_id);

  if (scoresErr || !scoreRows || scoreRows.length === 0) {
    return NextResponse.json({
      error: 'No scores found',
      detail: scoresErr?.message,
      assessment_id: report.assessment_id,
    }, { status: 404 });
  }

  // Validate OpenAI key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });

  // Build context JSON strings for prompts
  const archetypeJson = JSON.stringify({
    base: report.archetype_base,
    sublabel: report.archetype_sublabel,
    tagline: report.archetype_tagline,
  });

  const ipip = scoreRows.find(s => s.instrument_id === 'ipip50');
  const bigFiveJson = JSON.stringify(ipip?.percentile_scores ?? {});
  const allScoresJson = JSON.stringify(scoreRows);

  console.log(`[backfill-v2] Starting. Report=${report_id}, Scores=${scoreRows.length} instruments`);
  console.log(`[backfill-v2] Archetype: ${report.archetype_base}`);
  console.log(`[backfill-v2] Instruments: ${scoreRows.map(s => s.instrument_id).join(', ')}`);

  // Generate each v2 section sequentially
  const sectionIds = getV2SectionIds();
  const sections: Record<string, unknown> = {};
  let completedCount = 0;

  for (const sectionId of sectionIds) {
    try {
      const template = V2_REPORT_PROMPTS[sectionId];
      if (!template) {
        throw new Error(`No template found for ${sectionId}`);
      }

      const { system, user: userPrompt } = buildV2SectionPromptWithVoice(
        sectionId, allScoresJson, archetypeJson, bigFiveJson,
      );

      console.log(`[backfill-v2] Generating ${sectionId} (${template.title})...`);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';

      // Validate that it's valid JSON
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        throw new Error(`GPT returned invalid JSON: ${raw.substring(0, 200)}`);
      }

      sections[sectionId] = {
        title: template.title,
        content_markdown: JSON.stringify(parsed),
        coach_question: parsed.coach_question ?? null,
        min_tier: template.minTier,
      };

      completedCount++;

      // Progressive save after each section
      await supabase
        .from('assessment_reports')
        .update({
          sections,
          report_version: 2,
        })
        .eq('id', report_id);

      console.log(`[backfill-v2] ✅ ${sectionId} complete (${completedCount}/${sectionIds.length})`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[backfill-v2] ❌ ${sectionId} failed:`, errorMsg);
      errors.push({ section: sectionId, error: errorMsg });

      sections[sectionId] = {
        title: V2_REPORT_PROMPTS[sectionId]?.title ?? sectionId,
        content_markdown: '_This section could not be generated. Please try again._',
        coach_question: null,
        min_tier: V2_REPORT_PROMPTS[sectionId]?.minTier ?? 'free',
      };
    }
  }

  // Final save
  await supabase
    .from('assessment_reports')
    .update({
      sections,
      report_version: 2,
    })
    .eq('id', report_id);

  console.log(`[backfill-v2] Done. ${completedCount}/${sectionIds.length} succeeded.`);

  return NextResponse.json({
    success: completedCount > 0,
    completed: completedCount,
    total: sectionIds.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
