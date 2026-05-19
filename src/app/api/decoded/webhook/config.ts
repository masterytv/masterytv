/**
 * Next.js route segment config for the Decoded Stripe webhook.
 * Stripe requires the raw request body for signature verification,
 * so we disable Next.js automatic body parsing.
 */
export const dynamic = 'force-dynamic';

export const fetchCache = 'force-no-store';
