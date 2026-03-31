import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrder, updateOrder, uploadPDF, scheduleFollowups } from '@/lib/legacy/supabase';
import { generateLetter, generateProtocol, extractSnippet } from '@/lib/legacy/openai';
import { renderLegacyPDF } from '@/lib/legacy/pdf';

/**
 * POST /api/legacy/webhook
 *
 * Stripe webhook handler for checkout.session.completed.
 * Orchestrates the full post-payment pipeline:
 *   1. Mark order as paid
 *   2. Generate full letter (+ protocol if $27 tier)
 *   3. Extract shareable snippet
 *   4. Generate PDF
 *   5. Upload to Supabase Storage
 *   6. Send delivery email via Resend
 *   7. Schedule follow-up emails
 */
export async function POST(req: NextRequest) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
        console.error('[legacy/webhook] Missing Stripe keys');
        return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error('[legacy/webhook] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
        // Acknowledge but ignore other events
        return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const tier = session.metadata?.tier as 'letter' | 'protocol';

    if (!orderId) {
        console.error('[legacy/webhook] No orderId in session metadata');
        return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    try {
        // 1. Mark as paid
        await updateOrder(orderId, {
            status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent as string,
        });

        // 2. Fetch order data for AI generation
        const order = await getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found after payment`);

        await updateOrder(orderId, { status: 'generating' });

        const inputs = {
            firstName: order.first_name,
            challenge: order.challenge,
            dream: order.dream,
            legacyWish: order.legacy_wish,
            builtFor: order.built_for,
            stopWorrying: order.stop_worrying || undefined,
        };

        // 3. Generate the full letter
        const letterText = await generateLetter(inputs);

        // 4. Generate the protocol (if $27 tier)
        let protocolText: string | undefined;
        if (tier === 'protocol') {
            protocolText = await generateProtocol(inputs);
        }

        // 5. Extract the shareable snippet
        const snippetLine = await extractSnippet(letterText);

        // 6. Generate the PDF
        const pdfBuffer = await renderLegacyPDF({
            firstName: order.first_name,
            letterText,
            protocolText,
        });

        // 7. Upload PDF to Supabase Storage
        const pdfPath = await uploadPDF(orderId, pdfBuffer);

        // 8. Update order with generated content
        await updateOrder(orderId, {
            letter_text: letterText,
            protocol_text: protocolText || null,
            snippet_line: snippetLine,
            pdf_path: pdfPath,
            status: 'completed',
        } as Record<string, unknown>);

        // 9. Send delivery email
        await sendDeliveryEmail(order.email, order.first_name, orderId);

        // 10. Schedule follow-ups
        await scheduleFollowups(orderId);

        return NextResponse.json({ received: true, orderId });
    } catch (error) {
        console.error('[legacy/webhook] Generation pipeline failed:', error);
        await updateOrder(orderId, { status: 'failed' });
        // Still return 200 so Stripe doesn't retry endlessly
        return NextResponse.json({ received: true, error: 'generation_failed' });
    }
}

/** Send the delivery email with download link via Resend */
async function sendDeliveryEmail(email: string, firstName: string, orderId: string) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        console.error('[legacy/webhook] RESEND_API_KEY not set, skipping email');
        return;
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://masterytv.com';
    const downloadUrl = `${origin}/legacy/thank-you?orderId=${orderId}`;

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
                subject: `Your Legacy Letter is Ready, ${firstName}`,
                html: `
          <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; color: #2d2d2d; background: #faf8f5;">
            <h1 style="font-size: 28px; color: #1a1a1a; margin-bottom: 8px; font-weight: 400;">
              ${firstName},
            </h1>
            <p style="font-size: 17px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px;">
              Your future self has written you a letter. It's ready.
            </p>
            <p style="font-size: 17px; line-height: 1.7; color: #4a4a4a; margin-bottom: 32px;">
              This isn't a generic motivational piece — it's deeply personal, written from your answers, 
              from the version of you who made it through everything you're facing right now.
            </p>
            <a href="${downloadUrl}" 
               style="display: inline-block; padding: 14px 32px; background: #1a1a1a; color: #ffffff; 
                      text-decoration: none; font-size: 15px; letter-spacing: 0.05em; border-radius: 4px;">
              Read Your Letter →
            </a>
            <p style="font-size: 14px; color: #999; margin-top: 40px; line-height: 1.5;">
              Know someone who needs to hear from their future self?<br/>
              Share this: <a href="https://masterytv.com/legacy" style="color: #666;">masterytv.com/legacy</a>
            </p>
            <p style="font-size: 12px; color: #ccc; margin-top: 32px;">
              © ${new Date().getFullYear()} MasteryTV. All rights reserved.
            </p>
          </div>
        `,
            }),
        });
    } catch (err) {
        console.error('[legacy/webhook] Email send failed:', err);
    }
}
