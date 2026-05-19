'use client';

/**
 * Decoded Nav Bar — Lightweight header for the Decoded assessment section.
 * Shows branding, dashboard link, and logout.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, LayoutDashboard, ChevronLeft } from 'lucide-react';

interface DecodedNavProps {
  /** Show a back link to a specific page */
  backHref?: string;
  backLabel?: string;
}

export default function DecodedNav({ backHref, backLabel }: DecodedNavProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/decoded');
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--ghost-border)',
        background: 'var(--color-surface-0)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Back link or brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {backHref ? (
          <Link
            href={backHref}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.875rem', color: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
            {backLabel ?? 'Back'}
          </Link>
        ) : (
          <Link
            href="/decoded/assess"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-heading)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Decoded
          </Link>
        )}
      </div>

      {/* Right: Dashboard + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link
          href="/decoded/assess"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.75rem', color: 'var(--text-label)',
            textDecoration: 'none',
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--ghost-border)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--text-body)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ghost-border)'; e.currentTarget.style.color = 'var(--text-label)'; }}
        >
          <LayoutDashboard style={{ width: 14, height: 14 }} />
          Dashboard
        </Link>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.75rem', color: 'var(--text-label)',
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--ghost-border)',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ghost-border)'; e.currentTarget.style.color = 'var(--text-label)'; }}
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Logout
        </button>
      </div>
    </nav>
  );
}
