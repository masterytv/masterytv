'use client';

/**
 * GenerateButton — Auto-triggers compatibility report generation
 * when the page loads, with a manual retry button if it fails.
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import './compatibility.css';

interface Props {
  inviteId: string;
}

export default function GenerateReport({ inviteId }: Props) {
  const [status, setStatus] = useState<'generating' | 'error'>('generating');
  const [errorMsg, setErrorMsg] = useState('');
  const triggered = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    triggerGeneration();
  }, []);

  async function triggerGeneration() {
    setStatus('generating');
    setErrorMsg('');

    try {
      const res = await fetch('/api/decoded/compatibility-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });

      if (res.ok) {
        // Report generated — refresh the server component to show it
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Generation failed');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error — please try again');
      setStatus('error');
    }
  }

  return (
    <div className="compat-container">
      <div className="compat-loading">
        {status === 'generating' ? (
          <>
            <Loader2 className="h-8 w-8 text-[#a3a6ff] animate-spin" />
            <p className="compat-loading__text">
              Generating your compatibility report...
            </p>
            <p className="compat-loading__text" style={{ opacity: 0.5 }}>
              This usually takes 15–30 seconds.
            </p>
          </>
        ) : (
          <>
            <p className="compat-loading__text">{errorMsg}</p>
            <button
              onClick={() => {
                triggered.current = false;
                triggerGeneration();
              }}
              className="flex items-center gap-2 rounded-lg bg-[rgba(96,99,238,0.1)] px-4 py-2.5 text-sm font-medium text-[#a3a6ff] hover:bg-[rgba(96,99,238,0.15)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
