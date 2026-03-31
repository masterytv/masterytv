'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ThankYouPage() {
    return (
        <Suspense fallback={<div className="legacy-page"><p>Loading...</p></div>}>
            <ThankYouContent />
        </Suspense>
    );
}

function ThankYouContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId') || searchParams.get('session_id') || '';
    const [downloadUrl, setDownloadUrl] = useState('');
    const [checking, setChecking] = useState(true);
    const [snippetLine, setSnippetLine] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!orderId) return;

        let attempts = 0;
        const maxAttempts = 20; // ~60 seconds of polling

        async function pollForDownload() {
            try {
                const res = await fetch(`/api/legacy/download?orderId=${orderId}`);
                const data = await res.json();

                if (res.ok && data.downloadUrl) {
                    setDownloadUrl(data.downloadUrl);
                    setChecking(false);
                    return;
                }

                // If still generating, poll again
                if (res.status === 202 && attempts < maxAttempts) {
                    attempts++;
                    setTimeout(pollForDownload, 3000);
                    return;
                }

                setChecking(false);
            } catch {
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(pollForDownload, 3000);
                } else {
                    setChecking(false);
                }
            }
        }

        pollForDownload();
    }, [orderId]);

    const shareText = "I just read a letter from my future self. It broke me open in the best way. Get yours →";
    const shareUrl = "https://masterytv.com/legacy";

    function copyShareLink() {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <main className="legacy-page">
            <div className="legacy-bg" aria-hidden="true"><div className="legacy-bg-grain" /></div>

            <section className="thankyou-section">
                <div className="thankyou-icon" aria-hidden="true">✦</div>
                <h1 className="thankyou-headline">Your Letter is Being Crafted</h1>
                <p className="thankyou-subline">
                    Your future self is reaching back across time.
                    <br />
                    This takes about 30 seconds.
                </p>

                {/* Download state */}
                <div className="thankyou-download">
                    {checking ? (
                        <div className="thankyou-generating">
                            <div className="thankyou-spinner" />
                            <p>Writing your letter...</p>
                        </div>
                    ) : downloadUrl ? (
                        <a
                            href={downloadUrl}
                            className="thankyou-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Download Your Legacy Letter (PDF) ↓
                        </a>
                    ) : (
                        <div className="thankyou-fallback">
                            <p>
                                Your letter is on its way to your inbox.
                                <br />
                                Check your email in the next few minutes.
                            </p>
                        </div>
                    )}
                </div>

                {/* Snippet card */}
                {snippetLine && (
                    <div className="snippet-card">
                        <p className="snippet-text">&ldquo;{snippetLine}&rdquo;</p>
                        <p className="snippet-brand">MasteryTV · masterytv.com/legacy</p>
                    </div>
                )}
            </section>

            {/* Share prompt */}
            <section className="share-section">
                <h2 className="share-headline">Know someone who needs this?</h2>
                <p className="share-text">
                    &ldquo;{shareText}&rdquo;
                </p>
                <div className="share-actions">
                    <button className="share-btn" onClick={copyShareLink}>
                        {copied ? 'Copied ✓' : 'Copy Share Link'}
                    </button>
                    <a
                        className="share-btn share-btn-x"
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Share on X
                    </a>
                    <a
                        className="share-btn share-btn-li"
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Share on LinkedIn
                    </a>
                </div>
            </section>

            <footer className="legacy-footer">
                <p>© {new Date().getFullYear()} MasteryTV. All rights reserved.</p>
            </footer>
        </main>
    );
}
