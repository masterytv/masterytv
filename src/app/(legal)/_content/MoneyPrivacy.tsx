import { LEGAL_CONTACT, LEGAL_LAST_UPDATED, LEGAL_VERSION } from "@/lib/platform/legal";
import { DocMeta, LegalLink } from "./shared";

/**
 * Money Maps Privacy Policy (DRAFT — attorney review pending, E15.6, deferred
 * with the other verticals). Money's data posture is deliberately LIGHTER than a
 * budgeting app's: we work on the psychology of money and never link to or store
 * bank / financial-account data. Do NOT treat as final published terms — or
 * expose money publicly — until the E15.6 review lands and the public brand name
 * is locked. Emails are interim (route to the operating entity) per legal.ts.
 */
export default function MoneyPrivacy() {
  const c = LEGAL_CONTACT.money;
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <DocMeta lastUpdated={LEGAL_LAST_UPDATED} version={LEGAL_VERSION} />

      <div className="mt-10 space-y-10 text-text-secondary leading-relaxed">
        <section>
          <p>
            This policy explains what {c.product} collects, how we use it, and the
            choices you have. {c.product} is an AI money coach: we work on the
            psychology underneath your money decisions, not your finances
            themselves.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            What we collect
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Account information</strong> — your name and email, so you
              can sign in and we can reach you.
            </li>
            <li>
              <strong>Your Money Maps responses</strong> — the answers you give in
              the assessment, which produce your Money Map.
            </li>
            <li>
              <strong>Coaching conversations</strong> — what you tell the coach, so
              it can understand you and remember what matters across sessions.
            </li>
          </ul>
          <p className="mt-3">
            <strong>What we do not collect:</strong> we do <strong>not</strong>{" "}
            link to, access, or store your bank accounts, card numbers, balances,
            holdings, or any financial-account data. There is no bank linking in
            {" "}
            {c.product}. Please don&apos;t paste account numbers or passwords into
            the coach — it doesn&apos;t need them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            How we use it
          </h2>
          <p className="mt-3">
            We use what you share to generate your Money Map, personalize your
            coaching, and — with your permission — remember context between
            sessions. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            AI processing and storage
          </h2>
          <p className="mt-3">
            Your messages are processed by third-party AI providers to generate
            responses, and stored securely by us. No person reads them as part of
            operating the service, but they exist on our systems and can be
            disclosed if the law requires it — so we will never tell you that
            &quot;no one could ever see this.&quot; We direct our AI providers not
            to use your content to train their models.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Sharing
          </h2>
          <p className="mt-3">
            Your Money Map and conversations are private to you. If you choose to
            compare with someone (for example, a cofounder), nothing is shared
            until both of you explicitly agree, and you can revoke that at any
            time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Your choices
          </h2>
          <p className="mt-3">
            You can access or delete your data at any time. To make a request,
            contact us at{" "}
            <LegalLink href={`mailto:${c.privacyEmail}`} external>
              {c.privacyEmail}
            </LegalLink>
            .
          </p>
        </section>

        <section>
          <div className="rounded-lg bg-surface-100 p-4">
            <p>
              <strong>{c.entity}</strong> ({c.product})
            </p>
            <p>
              Privacy requests:{" "}
              <LegalLink href={`mailto:${c.privacyEmail}`} external>
                {c.privacyEmail}
              </LegalLink>
            </p>
            <p>Website: {c.site}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
