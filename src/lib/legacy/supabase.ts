/**
 * Legacy Letter AI — Supabase helpers
 *
 * Uses raw fetch() to Supabase REST API (same pattern as the subscribe route).
 * No SDK dependency needed.
 */

function getConfig() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('[legacy/supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return { url, key };
}

function headers(key: string) {
    return {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=representation',
    };
}

export interface LegacyOrder {
    id: string;
    email: string;
    first_name: string;
    challenge: string;
    dream: string;
    legacy_wish: string;
    built_for: string;
    stop_worrying?: string;
    tier: 'letter' | 'protocol';
    stripe_session_id?: string;
    stripe_payment_intent?: string;
    status: 'pending' | 'paid' | 'generating' | 'completed' | 'failed';
    preview_text?: string;
    letter_text?: string;
    protocol_text?: string;
    pdf_path?: string;
    snippet_line?: string;
    created_at: string;
    updated_at: string;
}

/** Create a new pending order with user's answers */
export async function createOrder(data: {
    email: string;
    firstName: string;
    challenge: string;
    dream: string;
    legacyWish: string;
    builtFor: string;
    stopWorrying?: string;
}): Promise<LegacyOrder> {
    const { url, key } = getConfig();
    const res = await fetch(`${url}/rest/v1/legacy_orders`, {
        method: 'POST',
        headers: headers(key),
        body: JSON.stringify({
            email: data.email,
            first_name: data.firstName,
            challenge: data.challenge,
            dream: data.dream,
            legacy_wish: data.legacyWish,
            built_for: data.builtFor,
            stop_worrying: data.stopWorrying || null,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[legacy/supabase] createOrder failed: ${err}`);
    }

    const rows = await res.json();
    return rows[0];
}

/** Get an order by ID */
export async function getOrder(orderId: string): Promise<LegacyOrder | null> {
    const { url, key } = getConfig();
    const res = await fetch(`${url}/rest/v1/legacy_orders?id=eq.${orderId}&select=*`, {
        method: 'GET',
        headers: headers(key),
    });

    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
}

/** Update an order with partial data */
export async function updateOrder(
    orderId: string,
    data: Partial<Omit<LegacyOrder, 'id' | 'created_at'>>
): Promise<LegacyOrder> {
    const { url, key } = getConfig();
    const res = await fetch(`${url}/rest/v1/legacy_orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: headers(key),
        body: JSON.stringify({
            ...data,
            updated_at: new Date().toISOString(),
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[legacy/supabase] updateOrder failed: ${err}`);
    }

    const rows = await res.json();
    return rows[0];
}

/** Upload a PDF buffer to Supabase Storage and return the path */
export async function uploadPDF(orderId: string, pdfBuffer: Buffer): Promise<string> {
    const { url, key } = getConfig();
    const path = `letters/${orderId}.pdf`;

    const res = await fetch(`${url}/storage/v1/object/legacy-pdfs/${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/pdf',
            // Upsert in case of retry
            'x-upsert': 'true',
        },
        body: new Uint8Array(pdfBuffer),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[legacy/supabase] uploadPDF failed: ${err}`);
    }

    return path;
}

/** Generate a signed URL for a PDF (1 hour expiry) */
export async function getSignedPDFUrl(pdfPath: string): Promise<string> {
    const { url, key } = getConfig();

    const res = await fetch(`${url}/storage/v1/object/sign/legacy-pdfs/${pdfPath}`, {
        method: 'POST',
        headers: {
            ...headers(key),
        },
        body: JSON.stringify({ expiresIn: 3600 }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[legacy/supabase] getSignedPDFUrl failed: ${err}`);
    }

    const data = await res.json();
    return `${url}/storage/v1${data.signedURL}`;
}

/** Insert follow-up email schedule rows */
export async function scheduleFollowups(orderId: string): Promise<void> {
    const { url, key } = getConfig();
    const now = new Date();

    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const res = await fetch(`${url}/rest/v1/legacy_followups`, {
        method: 'POST',
        headers: headers(key),
        body: JSON.stringify([
            { order_id: orderId, type: 'write_back_3d', scheduled_for: threeDays.toISOString() },
            { order_id: orderId, type: 'anniversary_1y', scheduled_for: oneYear.toISOString() },
        ]),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`[legacy/supabase] scheduleFollowups failed: ${err}`);
        // Non-critical — don't throw
    }
}
