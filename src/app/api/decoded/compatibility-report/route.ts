import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { VOICE_PROFILES, ARCHETYPE_VOICE_MAP, FALLBACK_VOICE, GLOBAL_VOICE_RULES } from '@/lib/decoded/report/voice';
import type { VoiceId } from '@/lib/decoded/report/voice';
import type { ArchetypeName } from '@/lib/decoded/archetypes/types';

/**
 * POST /api/decoded/compatibility-report
 * Generate per-user compatibility reports written in each person's narrative voice.
 * 
 * Each user gets a personalized version where:
 * - "Advice for you" / "Advice for {otherName}" is reader-oriented
 * - The prose style matches their Decoded voice (Connector, Adventurer, etc.)
 * - The perspective is framed around the reader's personality
 * 
 * Uses service-role client to read BOTH users' reports (RLS restricts reads to own data).
 * Safe because we verify the caller is part of the invite and consent was given.
 */

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Resolve a user's narrative voice from their archetype.
 * Returns the voice profile's promptBlock for injection into the system message.
 */
function resolveVoice(archetype: string | null | undefined): { voiceId: VoiceId; voiceBlock: string } {
  const voiceId = archetype
    ? (ARCHETYPE_VOICE_MAP[archetype as ArchetypeName] ?? FALLBACK_VOICE)
    : FALLBACK_VOICE;
  const profile = VOICE_PROFILES[voiceId];
  return { voiceId, voiceBlock: profile.promptBlock };
}

/**
 * Build the system prompt for a per-user compatibility report.
 * The voice block personalizes the writing style; the structure is identical.
 */
function buildSystemPrompt(
  readerName: string,
  otherName: string,
  voiceBlock: string,
): string {
  return `You are a personality compatibility analyst for Decoded by MasteryTV. 
You produce PUNCHY, insightful compatibility reports between two people across THREE relationship contexts.

${GLOBAL_VOICE_RULES}

${voiceBlock}

IMPORTANT PERSPECTIVE RULES:
- You are writing FOR ${readerName}. They are "you" throughout.
- ${otherName} is the other person — refer to them by name.
- "advice_for_reader" = advice directed at ${readerName} (use "you")
- "advice_for_other" = advice about how ${readerName} should understand ${otherName}
- Frame everything from ${readerName}'s perspective — what THEY should know about this relationship.
- Each field: 2-3 sentences MAX.
- No generic "communication is key" advice. Be specific to their actual profiles.
- Each context should feel DIFFERENT — what works romantically may not work at work.

Return JSON with this structure:
{
  "headline": "A one-line summary of the dynamic, framed for ${readerName} (e.g., 'Your fire meets their earth')",
  "intimate": {
    "label": "Intimate / Partnership",
    "chemistry": "What naturally clicks between you and ${otherName} as romantic partners (2-3 sentences)",
    "friction": "Where you'll clash in a relationship and why (2-3 sentences)",
    "superpower": "What makes you powerful as a couple (2 sentences)",
    "watch_out": "The pattern that could quietly erode this relationship (2 sentences)",
    "advice_for_reader": "Specific advice for you as a partner (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about how ${otherName} operates as a partner (1-2 sentences)"
  },
  "family_friendship": {
    "label": "Family / Friendship",
    "chemistry": "Why you'd naturally enjoy ${otherName}'s company as friends or family (2-3 sentences)",
    "friction": "The recurring tension point in this friendship/family dynamic (2-3 sentences)",
    "superpower": "What this friendship or family bond brings out in both of you (2 sentences)",
    "watch_out": "The habit that could create distance between you (2 sentences)",
    "advice_for_reader": "Specific advice for you as a friend/family member (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about how ${otherName} operates as a friend (1-2 sentences)"
  },
  "work": {
    "label": "Working Relationship",
    "chemistry": "Why you and ${otherName} would work well together professionally (2-3 sentences)",
    "friction": "Where professional tension will show up between you (2-3 sentences)",
    "superpower": "What you can accomplish together that neither could alone (2 sentences)",
    "watch_out": "The dynamic that could undermine your professional relationship (2 sentences)",
    "advice_for_reader": "Specific advice for you as a colleague (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about working with ${otherName} (1-2 sentences)"
  },
  "compatibility_dimensions": [
    { "dimension": "Communication", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Emotional Connection", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Conflict Style", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Growth Alignment", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Values Match", "score": 1-10, "insight": "one sentence" }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteId, forceRegenerate } = await req.json();

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
    }

    // Load the invite with both report IDs
    const { data: invite, error: inviteError } = await supabase
      .from('decoded_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Ensure the requesting user is part of this invite
    if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Only generate if consented
    if (invite.status !== 'consented' && invite.status !== 'connected') {
      return NextResponse.json({ error: 'Both users must consent first' }, { status: 400 });
    }

    const isInviter = invite.inviter_id === user.id;

    // Return cached per-user report if it exists (unless forceRegenerate is true)
    if (!forceRegenerate) {
      const cachedReport = isInviter
        ? invite.compatibility_report_inviter
        : invite.compatibility_report_recipient;

      if (cachedReport) {
        return NextResponse.json({
          success: true,
          report: cachedReport,
        });
      }

      // Fallback: legacy shared report
      if (invite.compatibility_report) {
        return NextResponse.json({
          success: true,
          report: invite.compatibility_report,
        });
      }
    }

    // Service-role client bypasses RLS to read both users' reports
    const admin = getAdmin();

    // Load both reports (needs service role — RLS restricts reads to own user)
    const [inviterReport, recipientReport] = await Promise.all([
      invite.inviter_report_id
        ? admin.from('assessment_reports').select('sections, archetype_base, voice_profile').eq('id', invite.inviter_report_id).single()
        : null,
      invite.recipient_report_id
        ? admin.from('assessment_reports').select('sections, archetype_base, voice_profile').eq('id', invite.recipient_report_id).single()
        : null,
    ]);

    if (!inviterReport?.data || !recipientReport?.data) {
      return NextResponse.json({ error: 'Both users must have completed reports' }, { status: 400 });
    }

    // Extract key data for the prompt
    const inviterS1 = inviterReport.data.sections?.S1;
    const recipientS1 = recipientReport.data.sections?.S1;
    const inviterArchetype = inviterReport.data.archetype_base;
    const recipientArchetype = recipientReport.data.archetype_base;

    // Resolve names — use stored name, then metadata, then email prefix
    const inviterName = invite.inviter_name || 'Person A';
    const recipientName = invite.recipient_email?.split('@')[0] || 'Person B';

    // Resolve voice for each user
    const inviterVoice = resolveVoice(inviterArchetype);
    const recipientVoice = resolveVoice(recipientArchetype);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build user data payload (shared between both calls — same data, different perspective)
    const userDataPayload = `## ${inviterName}
Archetype: ${inviterArchetype || 'Unknown'}
Profile Summary: ${JSON.stringify(inviterS1?.content_markdown || inviterS1 || 'No profile data')}

## ${recipientName}
Archetype: ${recipientArchetype || 'Unknown'}
Profile Summary: ${JSON.stringify(recipientS1?.content_markdown || recipientS1 || 'No profile data')}`;

    // Generate both reports in parallel — each in their own voice
    const [inviterResponse, recipientResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(inviterName, recipientName, inviterVoice.voiceBlock),
          },
          {
            role: 'user',
            content: `Generate a compatibility report for ${inviterName}, written in your assigned voice.\n\n${userDataPayload}`,
          },
        ],
      }),
      openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(recipientName, inviterName, recipientVoice.voiceBlock),
          },
          {
            role: 'user',
            content: `Generate a compatibility report for ${recipientName}, written in your assigned voice.\n\n${userDataPayload}`,
          },
        ],
      }),
    ]);

    const inviterContent = inviterResponse.choices[0]?.message?.content;
    const recipientContent = recipientResponse.choices[0]?.message?.content;

    if (!inviterContent || !recipientContent) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const inviterCompatReport = JSON.parse(inviterContent);
    const recipientCompatReport = JSON.parse(recipientContent);

    // Store both per-user reports and update status
    const { error: updateError } = await admin
      .from('decoded_invites')
      .update({
        compatibility_report_inviter: inviterCompatReport,
        compatibility_report_recipient: recipientCompatReport,
        // Backward compat: store inviter version as the shared report
        compatibility_report: inviterCompatReport,
        status: 'connected',
      })
      .eq('id', inviteId);

    if (updateError) {
      console.error('[compatibility-report] Failed to save reports:', updateError.message);
      return NextResponse.json({ error: 'Failed to save reports' }, { status: 500 });
    }

    // Return the report for the requesting user
    const callerReport = isInviter ? inviterCompatReport : recipientCompatReport;

    return NextResponse.json({
      success: true,
      report: callerReport,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[compatibility-report] Error:', errMsg, error);
    return NextResponse.json(
      { error: `Failed to generate compatibility report: ${errMsg}` },
      { status: 500 },
    );
  }
}

/**
 * GET /api/decoded/compatibility-report?inviteId=...
 * Retrieve a cached compatibility report (per-user version).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const inviteId = req.nextUrl.searchParams.get('inviteId');
  if (!inviteId) {
    return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
  }

  const { data: invite } = await supabase
    .from('decoded_invites')
    .select('compatibility_report, compatibility_report_inviter, compatibility_report_recipient, inviter_id, recipient_id, inviter_name, recipient_email, status')
    .eq('id', inviteId)
    .single();

  if (!invite || (invite.inviter_id !== user.id && invite.recipient_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isInviter = invite.inviter_id === user.id;

  // Per-user report with fallback to shared
  const report = isInviter
    ? (invite.compatibility_report_inviter ?? invite.compatibility_report)
    : (invite.compatibility_report_recipient ?? invite.compatibility_report);

  return NextResponse.json({
    report,
    status: invite.status,
    inviterName: invite.inviter_name,
    recipientEmail: invite.recipient_email,
  });
}
