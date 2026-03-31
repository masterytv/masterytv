import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/legacy/supabase';
import { generatePreview } from '@/lib/legacy/openai';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/legacy/generate-preview
 *
 * Accepts the user's 6 answers, saves as a pending order,
 * generates a 2-sentence emotional teaser via OpenAI,
 * and returns the preview + order ID.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const firstName = body.firstName?.trim();
        const email = body.email?.trim().toLowerCase();
        const challenge = body.challenge?.trim();
        const dream = body.dream?.trim();
        const legacyWish = body.legacyWish?.trim();
        const builtFor = body.builtFor?.trim();
        const stopWorrying = body.stopWorrying?.trim() || '';

        // Validate required fields
        if (!firstName || !email || !challenge || !dream || !legacyWish || !builtFor) {
            return NextResponse.json(
                { error: 'All fields are required.' },
                { status: 400 }
            );
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address.' },
                { status: 400 }
            );
        }

        // 1. Save order to Supabase
        const order = await createOrder({
            email,
            firstName,
            challenge,
            dream,
            legacyWish,
            builtFor,
            stopWorrying,
        });

        // 2. Generate the 2-sentence preview via OpenAI
        const previewText = await generatePreview({ firstName, challenge, dream });

        // 3. Update order with preview text
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        await fetch(`${supabaseUrl}/rest/v1/legacy_orders?id=eq.${order.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({ preview_text: previewText }),
        });

        return NextResponse.json({
            orderId: order.id,
            previewText,
        });
    } catch (error) {
        console.error('[legacy/generate-preview] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate your preview. Please try again.' },
            { status: 500 }
        );
    }
}
