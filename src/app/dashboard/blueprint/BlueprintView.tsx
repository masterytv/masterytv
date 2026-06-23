import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

/**
 * BlueprintView (PB3) — relationship-framed render of the shared Blueprint.
 *
 * Uses the "intimate" lens of the compatibility report (Relatti is about the
 * relationship, not work/friendship) plus the scored dimensions. BRAND.md:
 * Lucide only (no sparkles), semantic tokens, typographic hierarchy over
 * decorative icons, light + dark safe.
 */

interface Dimension {
  dimension?: string;
  score?: number;
  insight?: string;
}
interface Lens {
  chemistry?: string;
  friction?: string;
  superpower?: string;
  watch_out?: string;
  advice_for_reader?: string;
}
interface Report {
  headline?: string;
  intimate?: Lens;
  compatibility_dimensions?: Dimension[];
}

const DYNAMICS: { key: keyof Lens; label: string }[] = [
  { key: "chemistry", label: "Your chemistry" },
  { key: "friction", label: "Where you rub" },
  { key: "superpower", label: "Your superpower as a couple" },
  { key: "watch_out", label: "Watch out for" },
];

export default function BlueprintView({
  partnerName,
  report,
}: {
  partnerName: string;
  report: Report | null;
}) {
  const intimate = report?.intimate ?? {};
  const dimensions = report?.compatibility_dimensions ?? [];
  const hasContent = !!report?.headline || dimensions.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8 lg:py-12">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start gap-3">
          <span
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
          >
            <Heart className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
              Your Relationship Blueprint
            </p>
            <h1 className="font-display text-2xl font-bold leading-snug tracking-tight text-text-primary sm:text-3xl">
              {report?.headline || `You & ${partnerName}`}
            </h1>
          </div>
        </div>

        {!hasContent ? (
          <div className="rounded-2xl bg-surface-50 p-8 text-center">
            <p className="text-text-secondary">
              Your Blueprint will appear here once both you and {partnerName} have
              completed your assessments.
            </p>
            <Link
              href="/dashboard/chat"
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse"
              style={{ background: "var(--color-primary-container)" }}
            >
              Talk to your coach meanwhile
            </Link>
          </div>
        ) : (
          <>
            {/* Dynamics */}
            <div className="grid gap-4 sm:grid-cols-2">
              {DYNAMICS.map(({ key, label }) =>
                intimate[key] ? (
                  <div key={key} className="rounded-2xl bg-surface-50 p-5">
                    <h2
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {label}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {intimate[key]}
                    </p>
                  </div>
                ) : null
              )}
            </div>

            {/* Dimensions */}
            {dimensions.length > 0 && (
              <div className="mt-8 rounded-2xl bg-surface-50 p-6">
                <h2 className="font-display text-lg font-semibold text-text-primary">
                  How you score together
                </h2>
                <div className="mt-5 space-y-5">
                  {dimensions.map((d, i) => {
                    const score = Math.max(0, Math.min(10, Number(d.score ?? 0)));
                    return (
                      <div key={d.dimension ?? i}>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-medium text-text-primary">
                            {d.dimension}
                          </span>
                          <span className="text-sm text-text-muted">{score}/10</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${score * 10}%`, background: "var(--color-primary)" }}
                          />
                        </div>
                        {d.insight && (
                          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                            {d.insight}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advice */}
            {intimate.advice_for_reader && (
              <div
                className="mt-8 rounded-2xl p-6"
                style={{ background: "color-mix(in oklch, var(--color-primary-container) 8%, transparent)" }}
              >
                <h2
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-primary)" }}
                >
                  For you
                </h2>
                <p className="mt-2 leading-relaxed text-text-primary">
                  {intimate.advice_for_reader}
                </p>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link
                href="/dashboard/chat"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--color-primary-container)" }}
              >
                Talk through this with your coach
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
