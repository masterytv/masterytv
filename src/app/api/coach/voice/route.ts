/**
 * POST /api/coach/voice — Update coach communication style
 *
 * Sets the coach's voice by updating coach_profiles dimensions
 * to match the selected voice preset. Effect is immediate on
 * the next coach message (prompt assembler reads fresh dimensions).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VOICE_IDS, VOICE_TO_COACH_DIMENSIONS, type CoachVoiceId } from '@/lib/coach/voice-config';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const voiceId = body.voice_id as string;

    if (!voiceId || !VOICE_IDS.includes(voiceId as CoachVoiceId)) {
      return NextResponse.json(
        { error: `Invalid voice_id. Must be one of: ${VOICE_IDS.join(', ')}` },
        { status: 400 }
      );
    }

    const dimensions = VOICE_TO_COACH_DIMENSIONS[voiceId as CoachVoiceId];

    // Upsert coach_profiles with the new voice dimensions.
    // PC2.2: voices are a general-only module (modules.ts coach_voices), so
    // this writes the GENERAL profile; if another vertical ever enables
    // voices, resolve the program from the request instead.
    const { error } = await supabase
      .from('coach_profiles')
      .upsert(
        {
          user_id: user.id,
          program: 'general',
          ...dimensions,
          voice_id: voiceId,
          source: 'voice_override',
          confidence: 1.0, // User explicitly chose this
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,program' }
      );

    if (error) {
      console.error('[coach/voice] Failed to update profile:', error.message);
      return NextResponse.json({ error: `Failed to update voice: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, voice_id: voiceId });
  } catch (err) {
    console.error('[coach/voice] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
