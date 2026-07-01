import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared primitives for the (legal) document set (E15.5).
 *
 * Keeps the brand-primary link colour and the crisis-resources block identical
 * across the Privacy Policy, Terms, and Disclaimer. Colours come from CSS
 * variables (var(--color-primary)) and semantic tokens so every doc themes
 * automatically (rose for Relatti, indigo for MasteryTV) and renders in both
 * light and dark mode — no hardcoded hex (BRAND.md §2, §14).
 */

/** Inline link in the brand primary colour. Internal by default; set `external`. */
export function LegalLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const className =
    "underline underline-offset-2 transition-opacity hover:opacity-80";
  const style = { color: "var(--color-primary)" };
  if (external) {
    return (
      <a
        href={href}
        className={className}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

/** The "Last updated … · v…" line shown under each document title. */
export function DocMeta({
  lastUpdated,
  version,
}: {
  lastUpdated: string;
  version: string;
}) {
  return (
    <p className="mt-2 text-sm text-text-muted">
      Last updated: {lastUpdated} &middot; Version {version}
    </p>
  );
}

/**
 * Standing crisis-resources block. Relatti is not a crisis service; whenever a
 * document touches safety it must route the reader to real help (matches the
 * in-product coach behaviour and directives/SAFETY_ESCALATION_PROTOCOL.md §2).
 */
export function EmergencyResources() {
  return (
    <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
      <p className="font-medium text-text-primary">
        If you or someone else is in immediate danger, this service cannot help
        — contact emergency services now.
      </p>
      <ul className="mt-3 space-y-1.5 text-text-secondary">
        <li>
          <strong className="text-text-primary">Emergency:</strong> call 911
          (US) or your local emergency number.
        </li>
        <li>
          <strong className="text-text-primary">
            Suicide &amp; mental-health crisis:
          </strong>{" "}
          call or text 988 (988 Suicide &amp; Crisis Lifeline), or text HOME to
          741741 (Crisis Text Line).
        </li>
        <li>
          <strong className="text-text-primary">
            Domestic violence / abuse:
          </strong>{" "}
          call 1-800-799-7233, or text START to 88788 (National Domestic
          Violence Hotline).
        </li>
      </ul>
    </div>
  );
}
