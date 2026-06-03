import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import InviteLanding from './InviteLanding';
import './invite-landing.css';

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * Normalize archetype name to URL slug.
 * "The Architect" → "architect", "Architect" → "architect"
 */
function normalizeSlug(archetype: string): string {
  return archetype.toLowerCase().replace(/^the\s+/, '').trim();
}

/**
 * Dynamic OG metadata — personalized card image for social sharing.
 * When someone shares an invite link, the preview shows the inviter's
 * archetype card.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite } = await admin
    .from('decoded_invites')
    .select('inviter_name, inviter_report_id')
    .eq('id', code)
    .single();

  if (!invite) {
    return {
      title: 'You\'ve Been Invited — Decoded by MasteryTV',
      description: 'Take a free 30-minute personality assessment and compare results.',
    };
  }

  let archetypeSlug = '';
  let sublabel = '';
  if (invite.inviter_report_id) {
    const { data: report } = await admin
      .from('assessment_reports')
      .select('archetype_base, archetype_sublabel')
      .eq('id', invite.inviter_report_id)
      .single();

    if (report?.archetype_base) {
      archetypeSlug = normalizeSlug(report.archetype_base);
      sublabel = report.archetype_sublabel ?? '';
    }
  }

  const title = `${invite.inviter_name || 'Someone'} invited you to Decoded`;
  const description = 'Take a free personality assessment and discover your type. Compare results and unlock AI compatibility insights.';

  const ogParams = new URLSearchParams({ archetype: archetypeSlug || 'architect', style: 'animal', format: 'og' });
  if (invite.inviter_name) ogParams.set('name', invite.inviter_name);
  if (sublabel) ogParams.set('sublabel', sublabel);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: archetypeSlug ? [{
        url: `/api/decoded/card?${ogParams.toString()}`,
        width: 1200,
        height: 630,
        alt: `${invite.inviter_name}'s personality card`,
      }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: archetypeSlug ? [`/api/decoded/card?${ogParams.toString()}`] : undefined,
    },
  };
}

/**
 * /decoded/invite/[code] — Public invite landing page.
 *
 * Shows the inviter's archetype card + teaser + CTA to take the assessment.
 * No auth required — this is a public page designed for virality.
 * Authenticated users who already have a report are redirected to the dashboard.
 */
export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;

  // Check if user is already authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user already has a completed report, redirect to dashboard
  if (user) {
    const { data: existingReport } = await supabase
      .from('assessment_reports')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existingReport) {
      redirect('/dashboard');
    }
  }

  // Load invite data using admin client (no auth required for public page)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite, error } = await admin
    .from('decoded_invites')
    .select('id, inviter_name, inviter_report_id, status')
    .eq('id', code)
    .single();

  if (!invite || error) {
    notFound();
  }

  // Load inviter's archetype data from their report
  let archetypeName: string | null = null;
  let archetypeSublabel: string | null = null;
  let archetypeSlug: string | null = null;

  if (invite.inviter_report_id) {
    const { data: report } = await admin
      .from('assessment_reports')
      .select('archetype_base, archetype_sublabel')
      .eq('id', invite.inviter_report_id)
      .single();

    if (report?.archetype_base) {
      archetypeName = report.archetype_base;
      archetypeSublabel = report.archetype_sublabel ?? null;
      archetypeSlug = normalizeSlug(report.archetype_base);
    }
  }

  return (
    <InviteLanding
      inviterName={invite.inviter_name || 'Someone'}
      archetypeName={archetypeName}
      archetypeSublabel={archetypeSublabel}
      archetypeSlug={archetypeSlug}
      inviteCode={code}
    />
  );
}
