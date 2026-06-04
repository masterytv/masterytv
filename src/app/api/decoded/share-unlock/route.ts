import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_METHODS = ['x', 'facebook', 'linkedin', 'whatsapp', 'reddit', 'copy_link'] as const;

/**
 * POST /api/decoded/share-unlock
 * Records a social share action and unlocks S5 (Your Relationships).
 * Called fire-and-forget when user clicks a social share button.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { method } = await req.json();

    if (!method || !VALID_METHODS.includes(method)) {
      return NextResponse.json(
        { error: 'Invalid share method' },
        { status: 400 }
      );
    }

    // Record the share unlock
    const { error } = await supabase.from('share_unlocks').insert({
      user_id: user.id,
      method,
      section_unlocked: 'S5',
    });

    if (error) {
      console.error('[share-unlock] Insert error:', error.message);
      return NextResponse.json({ error: 'Failed to record share' }, { status: 500 });
    }

    // S0.5.3k: Log viral funnel event
    await supabase.from('viral_events').insert({
      user_id: user.id,
      event_type: 'social_share',
      metadata: { method, section_unlocked: 'S5' },
    });

    return NextResponse.json({ success: true, unlocked: 'S5' });
  } catch (error) {
    console.error('[share-unlock] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
