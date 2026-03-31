'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PricingCards from '@/components/legacy/PricingCards';

export default function PreviewPage() {
    return (
        <Suspense fallback={<div className="legacy-page"><p>Loading...</p></div>}>
            <PreviewContent />
        </Suspense>
    );
}

function PreviewContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId') || '';
    const [preview, setPreview] = useState('');
    const [firstName, setFirstName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) return;

        // Fetch the preview text from the order
        async function fetchPreview() {
            try {
                const res = await fetch(`/api/legacy/download?orderId=${orderId}`);
                // The download endpoint returns 202 for pending orders.
                // For preview, we use a different approach — check the order directly.
                // Actually, the preview text was already stored. Let's fetch it via a simple endpoint.
                // For MVP, we'll pass preview via URL params or sessionStorage.
            } catch {
                // Fallback
            }
        }

        // Check sessionStorage first (set by the form before redirect)
        const stored = sessionStorage.getItem('legacyPreview');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPreview(parsed.previewText || '');
                setFirstName(parsed.firstName || '');
            } catch { /* ignore */ }
        }
        setLoading(false);
        fetchPreview();
    }, [orderId]);

    if (!orderId) {
        return (
            <main className="legacy-page">
                <div className="legacy-bg" aria-hidden="true"><div className="legacy-bg-grain" /></div>
                <section className="legacy-hero">
                    <h1 className="legacy-headline">Start Your Legacy Letter</h1>
                    <p className="legacy-subline">
                        <a href="/legacy" className="legacy-link">Answer 6 questions →</a>
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className="legacy-page">
            <div className="legacy-bg" aria-hidden="true"><div className="legacy-bg-grain" /></div>

            {/* Preview teaser */}
            <section className="preview-section">
                <p className="preview-label">Your future self wrote this:</p>
                <div className="preview-card">
                    {loading ? (
                        <p className="preview-loading">Reaching across time...</p>
                    ) : preview ? (
                        <p className="preview-text">&ldquo;{preview}&rdquo;</p>
                    ) : (
                        <p className="preview-text preview-fallback">
                            &ldquo;Your letter is waiting. 600 words from the person you&apos;ll become.&rdquo;
                        </p>
                    )}
                </div>
                {firstName && (
                    <p className="preview-signature">— {firstName}, age 65</p>
                )}
            </section>

            {/* Lock message */}
            <section className="preview-lock">
                <p className="preview-lock-text">
                    Your full letter is ready — 600 words from the person you&apos;ll become.
                    <br />
                    Choose your experience:
                </p>
            </section>

            {/* Pricing */}
            <section className="legacy-form-section">
                <PricingCards orderId={orderId} />
            </section>

            <footer className="legacy-footer">
                <p>© {new Date().getFullYear()} MasteryTV. All rights reserved.</p>
            </footer>
        </main>
    );
}
