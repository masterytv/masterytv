import Link from "next/link";
import { Heart, Fingerprint } from "lucide-react";
import { getBrand } from "@/lib/platform/brand.server";
import { LEGAL_CONTACT } from "@/lib/platform/legal";

/**
 * Legal pages layout — minimal, professional, brand-aware (E15.5).
 *
 * Header mark, product name, footer entity, and accent all resolve from the
 * current brand (rose Relatti / indigo MasteryTV) via CSS variables, so the
 * /privacy, /terms, and /disclaimer routes match the brand whose domain served
 * them. Brand comes from host / cookie (getBrand); the pages themselves also
 * honor ?brand= for preview.
 */
export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getBrand();
  const contact = LEGAL_CONTACT[brand.id];
  const BrandIcon = brand.id === "relatti" ? Heart : Fingerprint;
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Background gradient — themed to the brand primary, subtle */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-1/3 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full blur-[150px]"
          style={{
            background:
              "color-mix(in oklch, var(--color-primary) 6%, transparent)",
          }}
        />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 py-4 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background:
                "color-mix(in oklch, var(--color-primary) 12%, transparent)",
            }}
          >
            <BrandIcon
              className="h-4 w-4"
              style={{ color: "var(--color-primary)" }}
              strokeWidth={1.75}
            />
          </span>
          <span className="text-xl font-semibold tracking-tight text-text-primary">
            {brand.name}
          </span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg px-5 py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
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
            © {year} {contact.entity}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Terms of Service
            </Link>
            <Link
              href="/disclaimer"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
