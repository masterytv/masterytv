import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/check-provider
 *
 * Given an email, check which auth provider the user registered with.
 * Returns { provider: 'google' | 'email' | null }
 *
 * Uses a SECURITY DEFINER function (get_auth_provider_for_email) that
 * queries auth.identities. Only callable by service_role — anon and
 * authenticated roles are revoked.
 *
 * Returns null for:
 * - Unknown emails (avoids leaking registration status)
 * - Email-only users (provider = 'email' is excluded by the function)
 * - Any error (fail open — don't block forgot password)
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ provider: null });
    }

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Call the DB function — returns the OAuth provider name or null
    const { data, error } = await admin.rpc('get_auth_provider_for_email', {
      lookup_email: email.trim(),
    });

    if (error) {
      console.error('[check-provider] RPC error:', error.message);
      return NextResponse.json({ provider: null });
    }

    // RPC returns the provider string directly (e.g., 'google') or null
    return NextResponse.json({ provider: data ?? null });

  } catch (err) {
    console.error('[check-provider] Unexpected error:', err);
    return NextResponse.json({ provider: null });
  }
}
