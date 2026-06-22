import Link from "next/link";

/**
 * Legal pages layout — minimal, professional header + footer.
 * Used by /privacy and /terms routes.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Background gradient (same as landing) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(96,99,238,0.05)] blur-[150px]" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 py-4 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(96,99,238,0.12)]">
            <span className="text-sm font-bold text-[#a3a6ff]">M</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Mastery Coach</span>
        </Link>
        <Link
          href="/decoded"
          className="rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Get Started
        </Link>
      </nav>

      {/* Content */}
      <main className="relative mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative bg-surface-50 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} MasteryTV LLC. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
