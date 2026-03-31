import Link from "next/link";

export default function CoachAppPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[700px] w-[700px] rounded-full bg-accent-500/4 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 ring-1 ring-brand-500/20">
            <span className="text-sm font-bold text-brand-400">M</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Mastery Coach</span>
        </div>
        <Link
          href="/coachapp/login"
          className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-xs font-medium text-brand-400">Early Access — AI Coaching</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          An AI coach that{" "}
          <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            actually knows you
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-lg text-text-secondary leading-relaxed">
          Mastery Coach learns how you think, adapts to your style, and drives your agenda forward — across chat, email, and Telegram.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/coachapp/login"
            className="rounded-lg bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400 transition-all"
          >
            Start Free Trial
          </Link>
          <a
            href="#features"
            className="rounded-lg border border-surface-300 px-8 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-100 transition-all"
          >
            Learn More
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-surface-300 px-6 py-8 lg:px-12">
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
