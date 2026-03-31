'use client';

import { useState } from 'react';

interface PricingCardsProps {
    orderId: string;
}

export default function PricingCards({ orderId }: PricingCardsProps) {
    const [loading, setLoading] = useState<'letter' | 'protocol' | null>(null);
    const [error, setError] = useState('');

    async function handleCheckout(tier: 'letter' | 'protocol') {
        setLoading(tier);
        setError('');

        try {
            const res = await fetch('/api/legacy/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, tier }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong.');
                setLoading(null);
                return;
            }

            window.location.href = data.checkoutUrl;
        } catch {
            setError('Connection failed. Please try again.');
            setLoading(null);
        }
    }

    return (
        <div className="pricing-container">
            {/* Tier 1: Letter Only */}
            <div className="pricing-card">
                <div className="pricing-tier">The Legacy Letter</div>
                <div className="pricing-price">$17</div>
                <ul className="pricing-features">
                    <li>Full 600-word letter from your future self</li>
                    <li>Premium PDF — aged parchment design</li>
                    <li>Printable Legacy Statement 1-pager</li>
                </ul>
                <button
                    className="pricing-btn"
                    onClick={() => handleCheckout('letter')}
                    disabled={loading !== null}
                >
                    {loading === 'letter' ? 'Redirecting...' : 'Get My Letter'}
                </button>
            </div>

            {/* Tier 2: Letter + Protocol */}
            <div className="pricing-card pricing-card-featured">
                <div className="pricing-badge">Most Popular</div>
                <div className="pricing-tier">Letter + Legacy Protocol</div>
                <div className="pricing-price">$27</div>
                <ul className="pricing-features">
                    <li>Everything in The Legacy Letter</li>
                    <li>90-day Legacy Builder coaching plan</li>
                    <li>12 weekly focus areas</li>
                    <li>Daily 5-minute reflection prompts</li>
                </ul>
                <button
                    className="pricing-btn pricing-btn-featured"
                    onClick={() => handleCheckout('protocol')}
                    disabled={loading !== null}
                >
                    {loading === 'protocol' ? 'Redirecting...' : 'Get Letter + Protocol →'}
                </button>
            </div>

            {error && <p className="pricing-error">{error}</p>}
        </div>
    );
}
