'use client';

/**
 * Admin utility page to backfill a report with v2 structured sections.
 * Navigate to /decoded/admin/backfill-v2?id=<report_id>
 * 
 * This is a developer tool, not user-facing.
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function BackfillV2Page() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id') ?? '';
  const [status, setStatus] = useState<string>('Ready');
  const [isRunning, setIsRunning] = useState(false);

  const runBackfill = async () => {
    if (!reportId) {
      setStatus('Error: No report ID provided. Add ?id=<report_id> to the URL.');
      return;
    }

    setIsRunning(true);
    setStatus('Starting backfill... This takes 1-2 minutes for 8 sections.');

    try {
      const res = await fetch('/api/decoded/backfill-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus(`✅ Backfill complete! ${data.completed}/${data.total} sections generated. Refresh the report page.`);
        if (data.errors) {
          setStatus(prev => prev + '\n\nPartial failures:\n' + data.errors.map((e: { section: string; error: string }) => `• ${e.section}: ${e.error}`).join('\n'));
        }
      } else {
        setStatus(`❌ Error: ${data.error}${data.detail ? ` (${data.detail})` : ''}${data.errors ? '\n\n' + JSON.stringify(data.errors, null, 2) : ''}`);
      }
    } catch (err) {
      setStatus(`❌ Network error: ${(err as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '4rem auto',
      padding: '2rem',
      fontFamily: 'system-ui',
      color: '#e8e9f0',
      background: '#0e1525',
      borderRadius: '12px',
    }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Backfill Report → v2</h1>
      <p style={{ color: '#a0a3b8', marginBottom: '1rem' }}>
        Report ID: <code style={{ color: '#b4c5ff' }}>{reportId || '(none)'}</code>
      </p>
      <p style={{ color: '#a0a3b8', marginBottom: '2rem', fontSize: '0.875rem' }}>
        This will regenerate all sections using v2 structured templates (S1-S8) and set report_version=2. 
        Existing sections will be overwritten.
      </p>

      <button
        onClick={runBackfill}
        disabled={isRunning || !reportId}
        style={{
          background: isRunning ? '#333' : 'linear-gradient(135deg, #a3a6ff, #6063ee)',
          color: 'white',
          padding: '0.75rem 2rem',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
        }}
      >
        {isRunning ? 'Generating...' : 'Run Backfill'}
      </button>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '8px',
        fontSize: '0.875rem',
        whiteSpace: 'pre-wrap',
        color: status.startsWith('✅') ? '#4edea3' : status.startsWith('❌') ? '#ef5350' : '#a0a3b8',
      }}>
        {status}
      </div>
    </div>
  );
}
