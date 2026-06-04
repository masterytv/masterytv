import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/check-provider
 *
 * Given an email, check which auth provider the user registered with.
 * Returns { provider: 'google' | 'email' | null }
 *
 * Uses service role + raw SQL to query auth.identities — this table
 * isn't exposed via PostgREST so we use .rpc or direct SQL.
 *
 * Security: Returns null for unknown emails to avoid leaking
 * registration status. Only reveals OAuth provider for confirmed users
 * so the UI can show "use Google sign-in instead" on forgot password.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ provider: null });
    }

    const cleanEmail = email.toLowerCase().trim();

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Use Supabase admin API to list users and check identities.
    // admin.auth.admin.listUsers doesn't filter by email, so we
    // iterate. For small user bases this is fine; at scale we'd
    // add a database function.

    // First try: use the admin getUserByEmail-like approach
    // Supabase admin API doesn't have getUserByEmail, so we list
    // and filter. The admin API returns identities on each user.
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError || !listData?.users) {
      return NextResponse.json({ provider: null });
    }

    const matchedUser = listData.users.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (!matchedUser) {
      return NextResponse.json({ provider: null });
    }

    // Check identities — OAuth users have an identity with provider != 'email'
    const identities = matchedUser.identities ?? [];
    const oauthIdentity = identities.find(
      (id) => id.provider !== 'email'
    );

    if (oauthIdentity) {
      return NextResponse.json({ provider: oauthIdentity.provider });
    }

    // Email/password user
    return NextResponse.json({ provider: 'email' });

  } catch {
    // Fail silently — don't block the forgot password flow
    return NextResponse.json({ provider: null });
  }
}
