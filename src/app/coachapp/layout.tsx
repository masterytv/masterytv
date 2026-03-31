import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mastery Coach — AI Coaching for High-Performers",
  description:
    "Your AI coaching partner that learns how you think, adapts to your style, and proactively drives your agenda forward.",
};

/**
 * Coach App layout — wraps all /coachapp routes with the coach design system.
 * Provides the Inter font, dark premium aesthetic, and coach-specific nav.
 */
export default function CoachAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
