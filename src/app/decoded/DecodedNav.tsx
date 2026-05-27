'use client';

/**
 * Decoded Nav Bar — Lightweight header for the Decoded assessment section.
 * Shows branding, dashboard link, theme toggle, and logout.
 * Dual-theme compliant — uses CSS custom properties that adapt to light/dark.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, LayoutDashboard, ChevronLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

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
    <nav className="decoded-nav">
      {/* Left: Back link or brand */}
      <div className="decoded-nav__left">
        {backHref ? (
          <Link href={backHref} className="decoded-nav__back">
            <ChevronLeft className="decoded-nav__icon" />
            {backLabel ?? 'Back'}
          </Link>
        ) : (
          <Link href="/dashboard" className="decoded-nav__brand">
            Decoded
          </Link>
        )}
      </div>

      {/* Right: Theme toggle + Dashboard + Logout */}
      <div className="decoded-nav__right">
        <ThemeToggle />
        <Link href="/dashboard" className="decoded-nav__btn">
          <LayoutDashboard className="decoded-nav__icon" />
          Dashboard
        </Link>
        <button onClick={handleLogout} className="decoded-nav__btn decoded-nav__btn--danger">
          <LogOut className="decoded-nav__icon" />
          Logout
        </button>
      </div>
    </nav>
  );
}
