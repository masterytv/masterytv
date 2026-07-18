import Link from "next/link";
import { Compass } from "lucide-react";

/**
 * T1 PLACEHOLDER for money's /dashboard.
 *
 * The bespoke money primary surface — the Decision Room + the Money OS living
 * document (MONEY_EXPERIENCE.md §8/§9, ADR-P03) — is a surface LEAF. This exists
 * only so money's dashboard never silently renders the executive DashboardHome
 * (the wrong-surface leak the red-team caught: dashboard/page.tsx selected the
 * surface with a plain `if (brandId === "relatti")`, so money fell through to the
 * executive home). Replace with the real bespoke surface in the Money OS leaf.
 *
 * Semantic tokens only — money's [data-brand="money"] palette is a later leaf, so
 * these currently resolve to the default until it lands (money has no live surface).
 */
export default function MoneyDashboard({
  userName,
  hasAssessment,
}: {
  userName: string;
  hasAssessment: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <span
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
      >
        <Compass className="h-6 w-6" style={{ color: "var(--color-primary)" }} strokeWidth={1.75} />
      </span>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
        {hasAssessment ? `Welcome back, ${userName}` : `Welcome, ${userName}`}
      </h1>
      <p className="mt-3 max-w-md text-text-secondary">
        {hasAssessment
          ? "Your Decision Room and Money OS are on the way. In the meantime, your coach already has your Money Map — bring it a real decision."
          : "Your Decision Room and Money OS are on the way. Start with Money Maps — a 3-minute read on the psychology under your money decisions."}
      </p>
      <Link
        href={hasAssessment ? "/dashboard/chat" : "/assess"}
        className="mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
      >
        {hasAssessment ? "Talk to your coach" : "Take Money Maps"}
      </Link>
    </div>
  );
}
