import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReportViewer from './ReportViewer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Decoded Report | Mastery',
  description: 'Your personalized personality report powered by 13 validated instruments.',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/decoded/auth');
  }

  // Fetch report (RLS enforces ownership)
  const { data: report, error } = await supabase
    .from('assessment_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !report) {
    redirect('/decoded');
  }

  // Fetch scores for instant data visualizations
  const { data: scores } = await supabase
    .from('assessment_scores')
    .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
    .eq('assessment_id', report.assessment_id);

  return (
    <ReportViewer
      report={report}
      scores={scores ?? []}
    />
  );
}
