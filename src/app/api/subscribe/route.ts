import { NextRequest, NextResponse } from 'next/server';

// Simple email validation — catches most typos without over-engineering
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = body.email?.trim().toLowerCase();

        if (!email || !EMAIL_REGEX.test(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address.' },
                { status: 400 }
            );
        }

        // --- 1. Upsert into Supabase ---
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const dbResponse = await fetch(
            `${supabaseUrl}/rest/v1/contacts?on_conflict=email`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    Prefer: 'resolution=merge-duplicates,return=representation',
                },
                body: JSON.stringify({
                    email,
                    source: 'coming_soon',
                    status: 'subscribed',
                    updated_at: new Date().toISOString(),
                }),
            }
        );

        if (!dbResponse.ok) {
            const errorText = await dbResponse.text();
            console.error('[subscribe] Supabase error:', errorText);
            return NextResponse.json(
                { error: 'Something went wrong. Please try again.' },
                { status: 500 }
            );
        }

        // --- 2. Send welcome email via Resend ---
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${resendKey}`,
                    },
                    body: JSON.stringify({
                        from: 'MasteryTV <hello@masterytv.com>',
                        to: [email],
                        subject: 'Welcome to MasteryTV — Something Big is Coming',
                        html: `
              <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #e0e0e0; background: #0A0E27;">
                <h1 style="font-size: 24px; color: #ffffff; margin-bottom: 16px;">You're In.</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                  Thanks for joining the MasteryTV early list. We're building something special — 
                  a new platform at the intersection of personal development and entrepreneurship.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                  You'll be the first to know when we launch.
                </p>
                <p style="font-size: 14px; color: #666; margin-top: 32px;">
                  — The MasteryTV Team
                </p>
              </div>
            `,
                    }),
                });
            } catch (emailError) {
                // Log but don't fail the signup if email fails
                console.error('[subscribe] Resend error:', emailError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[subscribe] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
