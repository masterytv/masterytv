import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrder, updateOrder } from '@/lib/legacy/supabase';

/**
 * POST /api/legacy/create-checkout
 *
 * Creates a Stripe Checkout Session for the selected tier.
 * Returns the checkout URL for client-side redirect.
 */
export async function POST(req: NextRequest) {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            console.error('[legacy/create-checkout] STRIPE_SECRET_KEY not set');
            return NextResponse.json({ error: 'Payment system not configured.' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey);
        const body = await req.json();
        const { orderId, tier } = body;

        if (!orderId || !tier || !['letter', 'protocol'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
        }

        // Verify the order exists
        const order = await getOrder(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        // Update tier on the order
        await updateOrder(orderId, { tier });

        const origin = req.headers.get('origin') || 'https://masterytv.com';

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: order.email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: tier === 'protocol'
                                ? 'Legacy Letter + 90-Day Protocol'
                                : 'The Legacy Letter',
                            description: tier === 'protocol'
                                ? 'A personalized letter from your future self + 90-day Legacy Builder coaching plan'
                                : 'A personalized 600-word letter from your future self, delivered as a premium PDF',
                        },
                        unit_amount: tier === 'protocol' ? 2700 : 1700, // cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                orderId,
                tier,
            },
            success_url: `${origin}/legacy/thank-you?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/legacy/preview?orderId=${orderId}`,
        });

        return NextResponse.json({ checkoutUrl: session.url });
    } catch (error) {
        console.error('[legacy/create-checkout] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session.' },
            { status: 500 }
        );
    }
}
