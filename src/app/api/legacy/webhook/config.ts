/**
 * Next.js route segment config for the Stripe webhook.
 * Stripe requires the raw request body for signature verification,
 * so we need to tell Next.js not to parse it.
 */
export const runtime = 'nodejs';
// Export from the route file itself — this config object is needed there.
// This file is a reminder: the webhook route.ts already reads req.text() directly.
