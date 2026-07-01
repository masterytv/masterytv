import { EmergencyResources } from "./shared";

/**
 * Mastery Coach AI Disclaimer (E15.5). A concise standing disclaimer so the
 * brand-aware /disclaimer route resolves for both brands; the fuller executive
 * disclaimers live in the Terms (Section 3).
 */
export default function MasteryDisclaimer() {
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        AI &amp; Coaching Disclaimer
      </h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: March 31, 2026</p>

      <div className="mt-10 space-y-10 text-text-secondary leading-relaxed">
        <section>
          <p>
            Mastery Coach is an <strong>AI coaching assistant</strong> — not a
            human, and not a licensed therapist, physician, attorney, accountant,
            or financial advisor. It provides business and executive coaching for
            educational purposes and does not provide professional advice in any
            licensed domain.
          </p>
          <p className="mt-3">
            AI-generated responses can be inaccurate or incomplete. Evaluate them
            with your own judgment and seek qualified professional advice where
            appropriate. We make no guarantee of specific outcomes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Not for emergencies
          </h2>
          <p className="mt-3">
            Mastery Coach is not a crisis service and is not monitored in real
            time. If you may be in danger, use the resources below.
          </p>
          <EmergencyResources />
        </section>
      </div>
    </article>
  );
}
