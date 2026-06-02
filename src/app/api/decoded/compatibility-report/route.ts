import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

/**
 * POST /api/decoded/compatibility-report
 * Generate a compatibility report between two users who have consented to share.
 * 
 * Uses service-role client to read BOTH users' reports (RLS restricts reads to own data).
 * Safe because we verify the caller is part of the invite and consent was given.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteId } = await req.json();

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

    // If already generated, return cached
    if (invite.compatibility_report) {
      return NextResponse.json({ 
        success: true, 
        report: invite.compatibility_report,
      });
    }

    // Service-role client bypasses RLS to read both users' reports
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Load both reports (needs service role — RLS restricts reads to own user)
    const [inviterReport, recipientReport] = await Promise.all([
      invite.inviter_report_id
        ? admin.from('assessment_reports').select('sections, archetype_base').eq('id', invite.inviter_report_id).single()
        : null,
      invite.recipient_report_id
        ? admin.from('assessment_reports').select('sections, archetype_base').eq('id', invite.recipient_report_id).single()
        : null,
    ]);

    if (!inviterReport?.data || !recipientReport?.data) {
      return NextResponse.json({ error: 'Both users must have completed reports' }, { status: 400 });
    }

    // Extract key data for the prompt — we don't send everything, just what matters for compatibility
    const inviterS1 = inviterReport.data.sections?.S1;
    const recipientS1 = recipientReport.data.sections?.S1;
    const inviterArchetype = inviterReport.data.archetype_base;
    const recipientArchetype = recipientReport.data.archetype_base;

    // Get names
    const inviterName = invite.inviter_name || 'Person A';
    const recipientName = invite.recipient_email?.split('@')[0] || 'Person B';

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a personality compatibility analyst for Decoded by MasteryTV. 
You produce PUNCHY, insightful compatibility reports between two people across THREE relationship contexts.

STYLE RULES:
- Short sentences. No fluff.
- Hit insights hard — like a coach who sees through both people.
- Use "you" and their first name naturally. 
- Each field: 2-3 sentences MAX.
- No generic "communication is key" advice. Be specific to their actual profiles.
- Tone: warm but honest. Like a wise friend who knows both people.
- Each context should feel DIFFERENT — what works romantically may not work at work.

Return JSON with this structure:
{
  "headline": "A one-line summary of the overall dynamic (e.g., 'Fire meets Earth')",
  "intimate": {
    "label": "Intimate / Partnership",
    "chemistry": "What naturally clicks between them as romantic partners (2-3 sentences)",
    "friction": "Where they'll clash in a relationship and why (2-3 sentences)",
    "superpower": "What makes them powerful as a couple (2 sentences)",
    "watch_out": "The pattern that could quietly erode this relationship (2 sentences)",
    "advice_for_a": "Specific advice for ${inviterName} as a partner (1-2 sentences)",
    "advice_for_b": "Specific advice for ${recipientName} as a partner (1-2 sentences)"
  },
  "family_friendship": {
    "label": "Family / Friendship",
    "chemistry": "Why they'd naturally enjoy each other's company as friends or family (2-3 sentences)",
    "friction": "The recurring tension point in this friendship/family dynamic (2-3 sentences)",
    "superpower": "What this friendship or family bond brings out in both (2 sentences)",
    "watch_out": "The habit that could create distance between them (2 sentences)",
    "advice_for_a": "Specific advice for ${inviterName} as a friend/family member (1-2 sentences)",
    "advice_for_b": "Specific advice for ${recipientName} as a friend/family member (1-2 sentences)"
  },
  "work": {
    "label": "Working Relationship",
    "chemistry": "Why they'd work well together professionally (2-3 sentences)",
    "friction": "Where professional tension will show up (2-3 sentences)",
    "superpower": "What this team can accomplish that neither could alone (2 sentences)",
    "watch_out": "The dynamic that could undermine their professional relationship (2 sentences)",
    "advice_for_a": "Specific advice for ${inviterName} as a colleague (1-2 sentences)",
    "advice_for_b": "Specific advice for ${recipientName} as a colleague (1-2 sentences)"
  },
  "compatibility_dimensions": [
    { "dimension": "Communication", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Emotional Connection", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Conflict Style", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Growth Alignment", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Values Match", "score": 1-10, "insight": "one sentence" }
  ]
}`
        },
        {
          role: 'user',
          content: `Generate a compatibility report for these two people across intimate, friendship, and work contexts:

## ${inviterName}
Archetype: ${inviterArchetype || 'Unknown'}
Profile Summary: ${JSON.stringify(inviterS1?.content_markdown || inviterS1 || 'No profile data')}

## ${recipientName}
Archetype: ${recipientArchetype || 'Unknown'}
Profile Summary: ${JSON.stringify(recipientS1?.content_markdown || recipientS1 || 'No profile data')}`
        }
      ]
    });

    const reportContent = response.choices[0]?.message?.content;
    if (!reportContent) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const compatibilityReport = JSON.parse(reportContent);

    // Store the report and update status (admin — either party may trigger this)
    await admin
      .from('decoded_invites')
      .update({
        compatibility_report: compatibilityReport,
        status: 'connected',
      })
      .eq('id', inviteId);

    return NextResponse.json({ 
      success: true, 
      report: compatibilityReport,
    });
  } catch (error) {
    console.error('[compatibility-report] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate compatibility report' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/decoded/compatibility-report?inviteId=...
 * Retrieve a cached compatibility report.
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
    .select('compatibility_report, inviter_id, recipient_id, inviter_name, recipient_email, status')
    .eq('id', inviteId)
    .single();

  if (!invite || (invite.inviter_id !== user.id && invite.recipient_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    report: invite.compatibility_report,
    status: invite.status,
    inviterName: invite.inviter_name,
    recipientEmail: invite.recipient_email,
  });
}
