/**
 * Decoded Report — Generation Trigger
 *
 * Server-side function to initiate report generation.
 * Creates the assessment_reports row, then invokes the
 * Edge Function to generate sections asynchronously.
 */

'use server';

import { createClient } from '@/lib/supabase/server';

export interface GenerateReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

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

  // Verify the assessment belongs to this user and is completed
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('id, user_id, completed_at')
    .eq('id', assessmentId)
    .eq('user_id', user.id)
    .single();

  if (assessmentError || !assessment) {
    return { success: false, error: 'Assessment not found' };
  }

  if (!assessment.completed_at) {
    return { success: false, error: 'Assessment not yet completed' };
  }

  // Create the report row with empty sections
  const { data: report, error: insertError } = await supabase
    .from('assessment_reports')
    .insert({
      assessment_id: assessmentId,
      user_id: user.id,
      sections: {},
      generation_model: 'gpt-4o',
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
