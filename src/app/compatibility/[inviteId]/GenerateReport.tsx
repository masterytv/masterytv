'use client';

/**
 * GenerateReport — Auto-triggers compatibility report generation via Edge Function.
 * Follows the same pattern as the coach client: calls the Supabase Edge Function
 * directly with the user's JWT, bypassing the Next.js API route.
 *
 * Architecture: Consistent with decoded-generate-report (Edge Function does the work).
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolveBrandClient } from '@/hooks/useBrand';
import { Loader2, RefreshCw } from 'lucide-react';
import './compatibility.css';

interface Props {
  inviteId: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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
      // Get the user's session token for Edge Function auth
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setErrorMsg('Not authenticated — please sign in again');
        setStatus('error');
        return;
      }

      // Call the Edge Function directly (same pattern as coach)
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/decoded-compatibility-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ invite_id: inviteId, program: resolveBrandClient().programSlug }),
        },
      );

      if (res.ok) {
        // Report generated — refresh the server component to show it
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || data.error || 'Generation failed');
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
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="compat-loading__text">
              Writing your couples report...
            </p>
            <p className="compat-loading__text" style={{ opacity: 0.5, maxWidth: '24rem', textAlign: 'center', lineHeight: 1.6 }}>
              We&apos;re reading both of your profiles closely to write something that actually sounds like the two of you. This takes a moment.
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
              className="flex items-center gap-2 rounded-lg bg-primary-container/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary-container/15 transition-colors"
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
