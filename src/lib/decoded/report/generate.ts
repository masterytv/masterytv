/**
 * Decoded Report — Generation Trigger
 *
 * Server-side function to initiate report generation.
 * Creates the assessment_reports row, then invokes the
 * Edge Function to generate sections asynchronously.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProgramId } from '@/lib/platform/brand';
import { MONEY_MAPS } from '@/lib/decoded/instruments/money-maps';
import {
  scoreMoneyMaps,
  toStoredMoneyMap,
  type StoredMoneyMap,
} from '@/lib/decoded/scoring/money-maps';

export interface GenerateReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

/** How a program's report is produced (T2). */
type ReportKind = 'llm-sections' | 'money-map';

/**
 * Report-generation strategy per program. Record<ProgramId,…> ON PURPOSE
 * (TENANCY_AUDIT T2): a new vertical fails the typecheck here until it declares
 * how its report is built, instead of silently inheriting the LLM-sections path.
 * - 'llm-sections' — the incumbent path: an empty report row whose `sections`
 *   are filled asynchronously by the decoded-generate-report edge function.
 * - 'money-map' — a DETERMINISTIC scored bundle written Next-side
 *   (writeMoneyMapReport), no LLM, no edge function.
 */
const REPORT_KIND: Record<ProgramId, ReportKind> = {
  general: 'llm-sections',
  relationship: 'llm-sections',
  money: 'money-map',
};

/**
 * Trigger report generation for a completed assessment.
 * 
 * 1. Verify auth + assessment ownership
 * 2. Check if report already exists (return cached)
 * 3. Create empty assessment_reports row
 * 4. Invoke the Edge Function to generate sections async
 * 5. Return the report ID for routing
 */
export async function generateReport(assessmentId: string): Promise<GenerateReportResult> {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if report already exists for this assessment
  const { data: existing } = await supabase
    .from('assessment_reports')
    .select('id')
    .eq('assessment_id', assessmentId)
    .single();

  if (existing) {
    // Report already exists — return cached
    return { success: true, reportId: existing.id };
  }

  // Verify the assessment belongs to this user and is completed.
  // `program` comes along because the report inherits it — this is the ONLY
  // place reports are created, so it's the single writer of the denormalized
  // assessment_reports.program (PC2.1a part 2). Never take program from the
  // caller or the brand here: the assessment is the source of truth.
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('id, user_id, completed_at, program')
    .eq('id', assessmentId)
    .eq('user_id', user.id)
    .single();

  if (assessmentError || !assessment) {
    return { success: false, error: 'Assessment not found' };
  }

  if (!assessment.completed_at) {
    return { success: false, error: 'Assessment not yet completed' };
  }

  // Report generation is program-aware. Money's report is the DETERMINISTIC
  // Money Maps™ scored bundle the coach reveals off (T2 read contract) — not
  // LLM-narrated sections — so it takes its own writer and never fires the
  // decoded-generate-report edge function. Any other program keeps the
  // incumbent path below, byte-for-byte. (REPORT_KIND is exhaustive over
  // ProgramId, so a new vertical is forced to choose here rather than silently
  // inheriting one of these.)
  if (REPORT_KIND[assessment.program as ProgramId] === 'money-map') {
    return writeMoneyMapReport(supabase, assessmentId, user.id, assessment.program);
  }

  // Create the report row with empty sections
  const { data: report, error: insertError } = await supabase
    .from('assessment_reports')
    .insert({
      assessment_id: assessmentId,
      user_id: user.id,
      program: assessment.program,
      sections: {},
      generation_model: 'gpt-4o',
      report_version: 2,
    })
    .select('id')
    .single();

  if (insertError || !report) {
    console.error('[Decoded] Report creation error:', insertError);
    return { success: false, error: 'Failed to create report' };
  }

  // Fire-and-forget: invoke Edge Function without blocking the redirect.
  // The user sees the graphical dashboard immediately while sections generate.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  fetch(
    `${projectUrl}/functions/v1/decoded-generate-report`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        assessment_id: assessmentId,
        report_id: report.id,
      }),
    },
  ).catch((err) => {
    console.error('[Decoded] Edge Function invocation error:', err);
    // Non-fatal — report row exists for retry
  });

  return { success: true, reportId: report.id };
}

/**
 * Money (Money Maps™) report writer — the 'money-map' branch of generateReport.
 *
 * Two layers (founder decision 2026-07-20 — the long-form report supersedes the
 * card-only read of MONEY_EXPERIENCE.md §109):
 *   1. DETERMINISTIC, Next-side, synchronous: score the completed assessment and
 *      persist the bundle at assessment_reports.sections.money_map (T2 read
 *      contract — the coach's Layer 4.5 and the report page's card/charts).
 *   2. NARRATIVE, edge-side, fire-and-forget: the money-generate-report edge
 *      function writes the personalized long-form sections.money_narrative from
 *      the bundle + the user's profile + their own item answers. The report page
 *      renders the deterministic layer instantly and fills the narrative in as
 *      it lands (and re-fires the function itself if it ever finds it missing,
 *      so a lost invocation here self-heals on first view).
 *
 * Runs only after generateReport has already confirmed the report doesn't exist
 * and the assessment is the user's + complete.
 */
async function writeMoneyMapReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  userId: string,
  program: string | null,
): Promise<GenerateReportResult> {
  // Load the raw item responses (RLS scopes this to the owner, exactly as
  // scoreAssessment reads it). The blob is keyed by instrument id:
  // { money_maps: { '1': n, … '16': n } }.
  const { data: progress, error: progressError } = await supabase
    .from('assessment_progress')
    .select('responses')
    .eq('assessment_id', assessmentId)
    .single();

  if (progressError || !progress?.responses) {
    console.error('[Money] Responses not found for assessment', assessmentId, progressError);
    return { success: false, error: 'Money Maps responses not found' };
  }

  const allResponses = progress.responses as Record<string, Record<string, number>>;
  const moneyResponses = allResponses[MONEY_MAPS.id];
  if (!moneyResponses) {
    return { success: false, error: 'No Money Maps responses on this assessment' };
  }

  // Score deterministically. scoreMoneyMaps throws loudly on a missing/invalid
  // item — treat that as a failed generation, not a crash of the completion flow.
  let sections: { money_map: StoredMoneyMap };
  try {
    sections = { money_map: toStoredMoneyMap(scoreMoneyMaps(moneyResponses)) };
  } catch (err) {
    console.error('[Money] Scoring failed for assessment', assessmentId, err);
    return { success: false, error: 'Failed to score Money Maps assessment' };
  }

  const { data: report, error: insertError } = await supabase
    .from('assessment_reports')
    .insert({
      assessment_id: assessmentId,
      user_id: userId,
      // The assessment is the source of truth for program (mirrors the incumbent
      // path); never a hardcoded literal or the brand.
      program,
      sections,
      // Honest provenance for the deterministic layer; the edge function appends
      // the narrative model once it writes sections.money_narrative.
      generation_model: 'money-maps-scorer',
      report_version: 2,
    })
    .select('id')
    .single();

  if (insertError || !report) {
    console.error('[Money] Report creation error:', insertError);
    return { success: false, error: 'Failed to create report' };
  }

  // Fire-and-forget the narrative writer (mirrors the incumbent path's edge
  // invocation). Non-fatal on any failure: the deterministic report stands on
  // its own, and the report page re-fires this whenever the narrative is absent.
  await fireMoneyNarrative(report.id);

  return { success: true, reportId: report.id };
}

/**
 * Invoke the money-generate-report edge function for a report row, without
 * blocking on the generation. Shared by the completion write path (above) and
 * the report page's self-heal path (a report viewed with no stored narrative).
 * The function's own already_complete guard makes repeat fires free.
 *
 * 'use server' export: takes only the serializable reportId and builds its own
 * cookie-scoped client — the edge function re-verifies ownership from the
 * bearer token, so this can never generate for someone else's report.
 */
export async function fireMoneyNarrative(reportId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return;

    // Await the RESPONSE HEADERS only (the function 202s right after its auth +
    // already_complete guard, then generates via waitUntil) — a truly un-awaited
    // fetch can be torn down with the serverless invocation before it ever
    // reaches the edge. ~300ms, and the invocation is guaranteed delivered.
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    await fetch(`${projectUrl}/functions/v1/money-generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ report_id: reportId }),
    }).catch((err) => {
      console.error('[Money] Narrative edge invocation error:', err);
    });
  } catch (err) {
    console.error('[Money] Narrative trigger error:', err);
  }
}
