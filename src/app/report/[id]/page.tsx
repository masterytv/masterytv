import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import ReportViewer from './ReportViewer';
import { getBrand } from '@/lib/platform/brand.server';
import { getOrCreateBroadcastInviteUrl } from '@/lib/relatti/broadcast-invite';
import { originFromHeaders } from '@/lib/platform/origin';
import { headers } from 'next/headers';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shared?: string }>;
}

/**
 * Dynamic OG metadata — generates a personalized card image for social sharing.
 * Uses the /api/decoded/card route to composite the archetype illustration
 * with the user's sublabel, tagline, and name.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  // Brand-aware: title/description must not leak "Decoded" on a relationship
  // domain. Resolved by domain (relatti.com → Relatti), matching every other
  // brand-aware surface. brand.name drives the suffix so it's generic for any
  // future vertical.
  const brand = await getBrand();
  const isRelationship = brand.programSlug === 'relationship';

  // Try to load the report for metadata (using admin to bypass RLS)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: report } = await admin
    .from('assessment_reports')
    .select('archetype_base, archetype_sublabel, archetype_tagline, user_id')
    .eq('id', id)
    .single();

  if (!report?.archetype_base) {
    return isRelationship
      ? {
          title: `Your Relationship Profile | ${brand.name}`,
          description: 'Your attachment style, how you love and connect, and what you need to feel close.',
        }
      : {
          title: 'Your Decoded Report | Mastery',
          description: 'Your personalized personality report powered by 13 validated instruments.',
        };
  }

  // Get display name for the OG card
  let displayName = '';
  const { data: profile } = await admin
    .from('decoded_profiles')
    .select('display_name')
    .eq('user_id', report.user_id)
    .single();
  if (profile?.display_name) displayName = profile.display_name;

  const slug = report.archetype_base.toLowerCase().replace(/^the\s+/, '');
  const ogParams = new URLSearchParams({
    archetype: slug,
    style: 'animal',
    format: 'og',
  });
  if (displayName) ogParams.set('name', displayName);
  if (report.archetype_sublabel) ogParams.set('sublabel', report.archetype_sublabel);
  if (report.archetype_tagline) ogParams.set('tagline', report.archetype_tagline);

  const title = isRelationship
    ? `Your Relationship Profile | ${brand.name}`
    : report.archetype_sublabel
      ? `The ${report.archetype_base} — ${report.archetype_sublabel} | Decoded`
      : `The ${report.archetype_base} | Decoded`;

  const description = isRelationship
    ? 'Your attachment style, how you love and connect, and what you need to feel close.'
    : (report.archetype_tagline ?? 'Your personalized personality report powered by 13 validated instruments.');

  const ogDescription = isRelationship
    ? `${displayName ? `${displayName}’s` : 'A'} relationship profile on ${brand.name}.`
    : (report.archetype_tagline ?? 'Decoded by MasteryTV — personality assessment');

  return {
    title,
    description,
    openGraph: {
      title,
      description: ogDescription,
      images: [{
        url: `/api/decoded/card?${ogParams.toString()}`,
        width: 1200,
        height: 630,
        alt: isRelationship
          ? `${report.archetype_base} — relationship type card`
          : `The ${report.archetype_base} personality card`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
      images: [`/api/decoded/card?${ogParams.toString()}`],
    },
  };
}

/**
 * Verify that a user has shared access to another user's report.
 * Returns the report data if access is granted, null otherwise.
 * 
 * Access is granted when:
 * - A decoded_invite exists between the viewer and the report owner
 * - The invite has share_with_human === 'full'
 * - The invite is in 'consented' or 'connected' status
 */
async function verifySharedAccess(viewerId: string, reportId: string) {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the report to get the owner ID
  const { data: report } = await admin
    .from('assessment_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (!report) return null;

  const ownerId = report.user_id;

  // Check if there's a valid invite with full sharing between these two users
  const { data: invite } = await admin
    .from('decoded_invites')
    .select('id, share_with_human, status')
    .or(`and(inviter_id.eq.${viewerId},recipient_id.eq.${ownerId}),and(inviter_id.eq.${ownerId},recipient_id.eq.${viewerId})`)
    .in('status', ['consented', 'connected'])
    .eq('share_with_human', 'full')
    .limit(1)
    .single();

  if (!invite) return null;

  // Also load scores (using admin — bypasses RLS for shared access)
  const { data: scores } = await admin
    .from('assessment_scores')
    .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
    .eq('assessment_id', report.assessment_id);

  return { report, scores: scores ?? [] };
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { shared } = await searchParams;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/decoded/auth');
  }

  // Standard path: user viewing their own report (RLS enforces ownership)
  const { data: ownReport } = await supabase
    .from('assessment_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (ownReport) {
    // User owns this report — standard rendering
    const { data: scores } = await supabase
      .from('assessment_scores')
      .select('instrument_id, total_score, subscale_scores, percentile_scores, interpretation')
      .eq('assessment_id', ownReport.assessment_id);

    // Relationship profiles get a real Relatti partner-invite (not the Decoded
    // share-to-unlock gate). The owner needs their stable broadcast invite link
    // for the modal's copy-link path; the email path is brand-aware server-side.
    const brand = await getBrand();
    const isRelationship = brand.programSlug === 'relationship';
    const inviteUrl = isRelationship
      ? await getOrCreateBroadcastInviteUrl(
          supabase,
          user,
          originFromHeaders(await headers()),
          ownReport.id,
        )
      : undefined;

    return (
      <ReportViewer
        report={ownReport}
        scores={scores ?? []}
        inviteUrl={inviteUrl}
      />
    );
  }

  // Shared path: user viewing someone else's report via compatibility sharing
  if (shared === 'true') {
    const result = await verifySharedAccess(user.id, id);
    if (result) {
      // Look up owner's display name or email for the banner
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const ownerId = result.report.user_id;
      let ownerName = 'Someone';

      // Try decoded_profiles first (has display name)
      const { data: profile } = await admin
        .from('decoded_profiles')
        .select('display_name')
        .eq('user_id', ownerId)
        .single();

      if (profile?.display_name) {
        ownerName = profile.display_name;
      } else {
        // Fall back to auth user email
        const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(ownerId);
        ownerName = ownerUser?.email ?? 'Someone';
      }

      return (
        <ReportViewer
          report={result.report}
          scores={result.scores}
          sharedOwnerName={ownerName}
        />
      );
    }
  }

  // No access
  notFound();
}
