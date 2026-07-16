import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { brandPageMetadata } from '@/lib/platform/brand-metadata';
import InviteLanding from './InviteLanding';
import { getBrand } from '@/lib/platform/brand.server';
import './invite-landing.css';

interface PageProps {
  params: Promise<{ code: string }>;
}

/** "The Architect" → "architect" */
function normalizeSlug(archetype: string): string {
  return archetype.toLowerCase().replace(/^the\s+/, '').trim();
}

/**
 * Dynamic OG metadata — brand-aware. Relatti previews relationship copy; the
 * MasteryTV invite previews the inviter's archetype card.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const brand = await getBrand();
  const isRelatti = brand.id === 'relatti';

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite } = await admin
    .from('decoded_invites')
    .select('inviter_name, inviter_report_id')
    .eq('id', code)
    .single();

  const inviter = invite?.inviter_name || 'Someone';

  if (isRelatti) {
    const title = `${inviter} invited you to understand your relationship together`;
    const description = 'Take the Relatti relationship quiz so your coach can understand you both — your archetype, attachment, and where you click and clash.';
    return brandPageMetadata('relatti', { title, description });
  }

  // MasteryTV — archetype card preview
  let archetypeSlug = '';
  let sublabel = '';
  if (invite?.inviter_report_id) {
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

  const title = `${inviter} invited you to Decoded`;
  const description = 'Take a free personality assessment and discover your type. Compare results and unlock your compatibility insights.';
  const ogParams = new URLSearchParams({ archetype: archetypeSlug || 'architect', style: 'animal', format: 'og' });
  if (invite?.inviter_name) ogParams.set('name', invite.inviter_name);
  if (sublabel) ogParams.set('sublabel', sublabel);

  return {
    title,
    description,
    openGraph: {
      title, description,
      images: archetypeSlug ? [{ url: `/api/decoded/card?${ogParams.toString()}`, width: 1200, height: 630, alt: `${inviter}'s personality card` }] : undefined,
    },
    twitter: {
      card: 'summary_large_image', title, description,
      images: archetypeSlug ? [`/api/decoded/card?${ogParams.toString()}`] : undefined,
    },
  };
}

/**
 * /invite/[code] — public, brand-aware invite landing (relationship-framed for
 * Relatti, archetype-card for MasteryTV). No auth required (designed for
 * virality). Authed users who already have a report skip to the dashboard.
 */
export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const brand = await getBrand();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite, error } = await admin
    .from('decoded_invites')
    .select('id, inviter_name, inviter_report_id, status, program')
    .eq('id', code)
    .single();

  if (!invite || error) notFound();

  // "Already done" is judged against THIS INVITE's program, not "any report"
  // (PC2.1h §6.4): a Decoded-report holder opening a Relatti invite must reach
  // the relationship battery, not get bounced to /dashboard.
  if (user) {
    const { data: existingReport } = await supabase
      .from('assessment_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('program', invite.program)
      .limit(1)
      .maybeSingle();
    if (existingReport) redirect('/dashboard');
  }

  // Inviter's archetype (used by the MasteryTV variant only)
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
      brandId={brand.id}
      inviterName={invite.inviter_name || 'Someone'}
      archetypeName={archetypeName}
      archetypeSublabel={archetypeSublabel}
      archetypeSlug={archetypeSlug}
      inviteCode={code}
    />
  );
}
