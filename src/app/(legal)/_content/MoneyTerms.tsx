import { LEGAL_CONTACT, LEGAL_LAST_UPDATED, LEGAL_VERSION } from "@/lib/platform/legal";
import { DocMeta, LegalLink } from "./shared";

/**
 * MoneyTraits Terms of Service (DRAFT — attorney review pending, E15.6, deferred
 * with the other verticals). The load-bearing money-specific clauses: coaching &
 * education, NOT financial/investment/tax/legal advice; your decisions are yours;
 * no guaranteed outcomes (FTC). Do NOT treat as final published terms — or expose
 * money publicly — until the E15.6 review lands and the public brand name is locked.
 */
export default function MoneyTerms() {
  const c = LEGAL_CONTACT.money;
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <DocMeta lastUpdated={LEGAL_LAST_UPDATED} version={LEGAL_VERSION} />

      <div className="mt-10 space-y-10 text-text-secondary leading-relaxed">
        <section>
          <p>
            These Terms govern your use of {c.product}, an AI money coach operated
            by {c.entity}. By using the Service you agree to them. If you
            don&apos;t agree, please don&apos;t use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            What the Service is
          </h2>
          <p className="mt-3">
            {c.product} provides AI-generated coaching and education about the
            psychology of money — how you earn, spend, price, and decide. It is a
            tool for personal growth, not a licensed professional service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Not professional advice
          </h2>
          <p className="mt-3">
            {c.product} does <strong>not</strong> provide financial, investment,
            securities, tax, accounting, legal, medical, or mental-health advice,
            and nothing it says is a recommendation to buy, sell, or hold anything.
            For those decisions, consult an appropriately licensed professional.
            The coach is an AI and can be wrong.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Your decisions are your own
          </h2>
          <p className="mt-3">
            You are responsible for your own choices and their consequences. We
            make <strong>no guarantee</strong> of any financial or other outcome
            from using the Service. You must be at least 18 to use {c.product}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Acceptable use
          </h2>
          <p className="mt-3">
            Use the Service lawfully and for your own personal use. Don&apos;t
            misuse it, attempt to break or overload it, or use it to harm others.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Limitation of liability
          </h2>
          <p className="mt-3">
            To the fullest extent permitted by law, {c.entity} is not liable for
            any indirect, incidental, or consequential damages arising from your
            use of the Service, including any financial decision you make. The
            Service is provided &quot;as is,&quot; without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Changes and governing law
          </h2>
          <p className="mt-3">
            We may update these Terms; material changes will be reflected in the
            &quot;last updated&quot; date above. These Terms are governed by the
            laws of the {c.governingLaw}. See also our{" "}
            <LegalLink href="/privacy">Privacy Policy</LegalLink> and{" "}
            <LegalLink href="/disclaimer">AI &amp; Coaching Disclaimer</LegalLink>.
          </p>
        </section>

        <section>
          <div className="rounded-lg bg-surface-100 p-4">
            <p>
              <strong>{c.entity}</strong> ({c.product})
            </p>
            <p>
              Questions:{" "}
              <LegalLink href={`mailto:${c.supportEmail}`} external>
                {c.supportEmail}
              </LegalLink>
            </p>
            <p>Website: {c.site}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
