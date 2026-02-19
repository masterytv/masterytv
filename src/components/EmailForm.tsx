'use client';

import { useState, FormEvent } from 'react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function EmailForm() {
    const [email, setEmail] = useState('');
    const [state, setState] = useState<FormState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        setState('loading');
        setErrorMsg('');

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setState('error');
                setErrorMsg(data.error || 'Something went wrong.');
                return;
            }

            setState('success');
        } catch {
            setState('error');
            setErrorMsg('Connection failed. Please try again.');
        }
    }

    if (state === 'success') {
        return (
            <div className="form-container">
                <p className="form-success">You&apos;re on the list ✦</p>
            </div>
        );
    }

    return (
        <form className="form-container" onSubmit={handleSubmit}>
            <p className="form-label">Be the first to know</p>
            <div className="form-row">
                <input
                    type="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={state === 'loading'}
                    aria-label="Email address"
                />
                <button
                    type="submit"
                    className="form-button"
                    disabled={state === 'loading'}
                >
                    {state === 'loading' ? '...' : 'Notify Me'}
                </button>
            </div>
            {state === 'error' && (
                <p className="form-error">{errorMsg}</p>
            )}
        </form>
    );
}
