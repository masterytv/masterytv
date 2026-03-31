'use client';

import { useState, FormEvent } from 'react';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type FormState = 'idle' | 'loading' | 'error';

interface FormData {
    firstName: string;
    email: string;
    challenge: string;
    dream: string;
    legacyWish: string;
    builtFor: string;
    stopWorrying: string;
}

const QUESTIONS: Record<Step, { field: keyof FormData; label: string; placeholder: string; type?: string }> = {
    1: {
        field: 'firstName',
        label: 'Your first name',
        placeholder: 'Just your first name',
    },
    2: {
        field: 'email',
        label: 'Your email',
        placeholder: 'Where we\'ll deliver your letter',
        type: 'email',
    },
    3: {
        field: 'challenge',
        label: 'What\'s the one thing keeping you up at night right now?',
        placeholder: 'The obstacle, the doubt, the fear…',
    },
    4: {
        field: 'dream',
        label: 'If everything went perfectly for the next 20 years, what does your life look like?',
        placeholder: 'Paint the picture. Be specific.',
    },
    5: {
        field: 'legacyWish',
        label: 'When people talk about you 50 years from now, what do you want them to say?',
        placeholder: 'Your legacy in one or two sentences.',
    },
    6: {
        field: 'builtFor',
        label: 'One person you\'re building this for',
        placeholder: 'A name. Someone who matters.',
    },
};

export default function LegacyForm() {
    const [step, setStep] = useState<Step>(1);
    const [state, setState] = useState<FormState>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [data, setData] = useState<FormData>({
        firstName: '',
        email: '',
        challenge: '',
        dream: '',
        legacyWish: '',
        builtFor: '',
        stopWorrying: '',
    });

    const q = QUESTIONS[step];
    const isLastStep = step === 6;
    const totalSteps = 6;

    function updateField(value: string) {
        setData((prev) => ({ ...prev, [q.field]: value }));
    }

    function canProceed(): boolean {
        const val = data[q.field].trim();
        if (!val) return false;
        if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return false;
        return true;
    }

    async function handleNext(e: FormEvent) {
        e.preventDefault();
        if (!canProceed()) return;

        if (!isLastStep) {
            setStep((s) => Math.min(s + 1, 6) as Step);
            return;
        }

        // Last step — submit to API
        setState('loading');
        setErrorMsg('');

        try {
            const res = await fetch('/api/legacy/generate-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                setState('error');
                setErrorMsg(result.error || 'Something went wrong.');
                return;
            }

            // Store preview data for the preview page to read immediately
            sessionStorage.setItem('legacyPreview', JSON.stringify({
                previewText: result.previewText,
                firstName: data.firstName,
            }));

            // Redirect to preview page
            window.location.href = `/legacy/preview?orderId=${result.orderId}`;
        } catch {
            setState('error');
            setErrorMsg('Connection failed. Please try again.');
        }
    }

    function handleBack() {
        if (step > 1) setStep((s) => Math.max(s - 1, 1) as Step);
    }

    // Use textarea for longer answer fields
    const isTextarea = ['challenge', 'dream', 'legacyWish'].includes(q.field);

    return (
        <form className="legacy-form" onSubmit={handleNext}>
            {/* Progress indicator */}
            <div className="legacy-progress">
                {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                        key={i}
                        className={`legacy-progress-dot ${i + 1 <= step ? 'active' : ''}`}
                    />
                ))}
            </div>

            {/* Question */}
            <div className="legacy-question" key={step}>
                <label className="legacy-label">{q.label}</label>
                {isTextarea ? (
                    <textarea
                        className="legacy-textarea"
                        placeholder={q.placeholder}
                        value={data[q.field]}
                        onChange={(e) => updateField(e.target.value)}
                        rows={3}
                        disabled={state === 'loading'}
                        autoFocus
                    />
                ) : (
                    <input
                        type={q.type || 'text'}
                        className="legacy-input"
                        placeholder={q.placeholder}
                        value={data[q.field]}
                        onChange={(e) => updateField(e.target.value)}
                        disabled={state === 'loading'}
                        autoFocus
                    />
                )}
            </div>

            {/* Optional "stop worrying" field on step 6 */}
            {step === 6 && (
                <div className="legacy-question legacy-bonus-q">
                    <label className="legacy-label legacy-label-small">
                        What would you tell yourself to stop worrying about?
                    </label>
                    <input
                        type="text"
                        className="legacy-input"
                        placeholder="The thing you know, deep down, will be fine."
                        value={data.stopWorrying}
                        onChange={(e) => setData((prev) => ({ ...prev, stopWorrying: e.target.value }))}
                        disabled={state === 'loading'}
                    />
                </div>
            )}

            {/* Navigation */}
            <div className="legacy-nav">
                {step > 1 && (
                    <button
                        type="button"
                        className="legacy-btn legacy-btn-back"
                        onClick={handleBack}
                        disabled={state === 'loading'}
                    >
                        ← Back
                    </button>
                )}
                <button
                    type="submit"
                    className="legacy-btn legacy-btn-next"
                    disabled={!canProceed() || state === 'loading'}
                >
                    {state === 'loading'
                        ? 'Your future self is writing...'
                        : isLastStep
                            ? 'Read My Letter →'
                            : 'Continue →'}
                </button>
            </div>

            {state === 'error' && (
                <p className="legacy-error">{errorMsg}</p>
            )}
        </form>
    );
}
