import { NextRequest, NextResponse } from 'next/server';
import { getOrder, getSignedPDFUrl } from '@/lib/legacy/supabase';

/**
 * GET /api/legacy/download?orderId=...
 *
 * Returns a time-limited signed URL for the PDF download.
 */
export async function GET(req: NextRequest) {
    try {
        const orderId = req.nextUrl.searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 });
        }

        const order = await getOrder(orderId);

        if (!order) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        if (order.status !== 'completed' || !order.pdf_path) {
            return NextResponse.json(
                { error: 'Your letter is still being generated. Please check back in a moment.' },
                { status: 202 }
            );
        }

        const signedUrl = await getSignedPDFUrl(order.pdf_path);

        return NextResponse.json({ downloadUrl: signedUrl });
    } catch (error) {
        console.error('[legacy/download] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate download link.' },
            { status: 500 }
        );
    }
}
