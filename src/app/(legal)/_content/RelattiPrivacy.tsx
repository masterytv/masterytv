import { LEGAL_CONTACT, LEGAL_LAST_UPDATED, LEGAL_VERSION } from "@/lib/platform/legal";
import { DocMeta, EmergencyResources, LegalLink } from "./shared";

/**
 * Relatti Privacy Policy (E15.5 DRAFT — attorney review pending, E15.6).
 *
 * Grounded in directives/PRIVACY_TERMS_LIABILITY_PLAN.md §5/§6 and
 * directives/SAFETY_ESCALATION_PROTOCOL.md. Folds the "rock-solid" §5 doc set
 * into a single policy: safety monitoring & escalation, couples data-sharing &
 * consent, third-party (partner/child) data, retention/deletion, and
 * subpoena / law-enforcement response are all covered as sections here.
 *
 * The honest confidentiality posture must match the coach's own words
 * (prompt-assembler.ts buildRelationshipGuardrails) — private *from the
 * partner*, but processed/stored by us; safety screening is automated and
 * LOG-ONLY (founder decision 2026-07-15 — no human review, no alerts).
 */
export default function RelattiPrivacy() {
  const c = LEGAL_CONTACT.relatti;
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <DocMeta lastUpdated={LEGAL_LAST_UPDATED} version={LEGAL_VERSION} />

      <div className="mt-10 space-y-10 text-text-secondary leading-relaxed">
        {/* Intro + sensitivity notice */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            1. Introduction
          </h2>
          <p className="mt-3">
            {c.entity} (&quot;Relatti,&quot; &quot;we,&quot; &quot;our,&quot; or
            &quot;us&quot;) operates the Relatti relationship-coaching service at{" "}
            {c.site} (the &quot;Service&quot;). This Privacy Policy explains what
            information we collect, how we use it, who we share it with, and the
            choices and rights you have.
          </p>
          <p className="mt-3">
            Relatti is designed for intimate-relationship coaching, so the
            things you tell it are often <strong>sensitive</strong> — how you
            feel about your partner, results from psychological assessments, and
            sometimes disclosures about conflict, safety, or other people in
            your life. We treat this data with corresponding care, and this
            policy is written to be specific about it rather than vague.
          </p>
          <p className="mt-3">
            By creating an account or using the Service, you agree to this
            Policy. If you do not agree, please do not use the Service.
          </p>
        </section>

        {/* What we collect */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            2. Information We Collect
          </h2>

          <h3 className="mt-4 text-lg font-medium text-text-primary">
            2.1 Information you provide
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Account information:</strong> your name, email address,
              password (stored only as a secure hash), and communication
              preferences.
            </li>
            <li>
              <strong>Assessment responses:</strong> your answers to
              psychological instruments (for example, attachment style,
              personality, and relationship-satisfaction measures) and the
              scores and reports derived from them. This is sensitive personal
              data about your inner life.
            </li>
            <li>
              <strong>Coaching conversations:</strong> the messages you exchange
              with the AI coach across every channel (web chat and, where you
              enable them, email or messaging apps).
            </li>
            <li>
              <strong>Relationship &amp; connection data:</strong> invitations
              you send or accept, who your connected partner is, what you choose
              to share with them, and your responses to daily connection
              prompts (&quot;rituals&quot;).
            </li>
            <li>
              <strong>Information about other people:</strong> because this is
              relationship coaching, you may tell the coach things about your
              partner, children, family, or others. See Section 7.
            </li>
            <li>
              <strong>Feedback and support messages</strong> you send us,
              including beta feedback.
            </li>
            <li>
              <strong>Payment information</strong> (if and when paid plans
              launch), processed by our payment processor. We do not store card
              numbers on our servers.
            </li>
          </ul>

          <h3 className="mt-4 text-lg font-medium text-text-primary">
            2.2 Information collected automatically
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Usage data:</strong> message timestamps, feature usage,
              streaks, and engagement metrics used to operate and improve the
              Service.
            </li>
            <li>
              <strong>Device &amp; log data:</strong> browser type, IP address,
              and device identifiers, used for security and reliability.
            </li>
          </ul>

          <h3 className="mt-4 text-lg font-medium text-text-primary">
            2.3 Information from third parties
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Your partner:</strong> if a partner connects with you and
              consents to share their assessment results, we process that shared
              data to build your compatibility and couples reports. We never
              share your private coaching conversations with your partner (see
              Section 6).
            </li>
            <li>
              <strong>Google Sign-In:</strong> if you sign in with Google, we
              receive your name and email address from your Google account.
            </li>
          </ul>
        </section>

        {/* How we use it */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            3. How We Use Your Information
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>To provide coaching:</strong> your assessment profile,
              conversations, and connection data are used by our AI coaching
              engine to give you personalized, contextual coaching.
            </li>
            <li>
              <strong>Memory &amp; continuity:</strong> we extract and store
              facts, themes, and commitments from your conversations so the
              coach remembers your context across sessions.
            </li>
            <li>
              <strong>Couples features:</strong> to generate compatibility and
              couples reports and shared rituals from data you and your partner
              have each consented to share.
            </li>
            <li>
              <strong>Proactive outreach:</strong> to send reminders, check-ins,
              and nudges through channels you have enabled. You can turn these
              off at any time.
            </li>
            <li>
              <strong>Safety:</strong> to detect and respond to signals of
              crisis or harm, as described in Section 5.
            </li>
            <li>
              <strong>Service improvement:</strong> to understand and improve
              the Service, using aggregated or de-identified data wherever
              practical.
            </li>
            <li>
              <strong>Security, legal &amp; billing:</strong> to secure the
              Service, comply with law, and (for paid plans) process payments.
            </li>
          </ul>
        </section>

        {/* AI processing + subprocessors */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            4. AI Processing &amp; Service Providers (Subprocessors)
          </h2>
          <p className="mt-3">
            Relatti is powered by AI models and infrastructure operated by other
            companies. To deliver the Service, your content is processed by:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Anthropic (Claude):</strong> processes your coaching
              messages to generate the coach&apos;s responses and to run
              safety checks.
            </li>
            <li>
              <strong>OpenAI:</strong> used for background processing such as
              extracting memory facts, summarization, and converting text into
              embeddings (mathematical representations) for search and memory.
            </li>
            <li>
              <strong>Supabase (hosted on AWS):</strong> our database and
              authentication provider, where your data is stored.
            </li>
            <li>
              <strong>Resend:</strong> delivers transactional and coaching
              emails.
            </li>
            <li>
              <strong>Vercel:</strong> hosts and serves the application.
            </li>
            <li>
              <strong>Messaging / SMS providers</strong> (only if you enable a
              messaging channel), to deliver messages you opt into.
            </li>
          </ul>
          <p className="mt-3">
            {/* E15.2 GATE: this sentence may only stand once zero-retention /
                no-training is confirmed in writing (DPAs) with each AI provider.
                Do not soften or remove the qualifier until then. */}
            We use the business/enterprise API tiers of our AI providers under
            terms that require that your content is{" "}
            <strong>not used to train their models</strong>, and we are
            finalizing data-processing agreements (including zero-retention
            settings where available) with each provider before public launch.
            Your conversations are processed to serve you — they are never sold,
            and they are not used to train models for others&apos; benefit.
          </p>
        </section>

        {/* Safety monitoring + escalation — the honest section */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            5. Safety Monitoring &amp; Escalation
          </h2>
          <p className="mt-3">
            Because people sometimes disclose crises during coaching, the
            Service automatically screens messages for signals of{" "}
            <strong>
              self-harm, abuse or coercive control, acute distress, and risk to
              others (including children)
            </strong>
            . This is core to how the Service works, and it is why we cannot
            promise absolute confidentiality:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              When a safety signal is detected, the coach immediately shows you
              real crisis resources (see below).
            </li>
            <li>
              A safety record is logged for audit purposes.{" "}
              <strong>
                This screening is automated: no person reads your conversations
                as part of operating the Service, and safety flags do not send
                your conversation content to anyone
              </strong>
              .
            </li>
            <li>
              Our honesty about privacy still stands: the coach will tell you
              your conversation is private from your partner, but it will never
              tell you &quot;no one could ever see this&quot; — your
              conversations exist on our systems, and stored data can be
              disclosed where Section 9 applies (for example, if the law
              requires it).
            </li>
          </ul>
          <p className="mt-4">
            <strong>What we do not do.</strong> Relatti is{" "}
            <strong>not a crisis service</strong>. We do not provide human
            monitoring, review, 24/7 supervision, or emergency response; we do
            not guarantee that anyone will see a safety flag or contact you
            after one; and we do not notify your partner, family, employer, or
            the authorities from within the product. Safety flags are an
            automated audit record, not a promise of intervention. If you or
            someone you know is in danger, use the resources below — they reach
            real people; this product does not. For how we handle disclosures
            involving children or other third parties, see Section 7.
          </p>
          <EmergencyResources />
        </section>

        {/* Couples data sharing + consent */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            6. Couples Data-Sharing &amp; Consent
          </h2>
          <p className="mt-3">
            Relatti coaches individuals inside a shared relationship, so we are
            deliberate about what crosses between partners:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>
                Your one-on-one coaching conversations are private from your
                partner.
              </strong>{" "}
              Your partner cannot read your coaching messages, the memory the
              coach forms about you, or your conversation summaries. This is
              enforced technically, per-account.
            </li>
            <li>
              <strong>Only what you consent to share is shared.</strong> When
              you connect with a partner, you choose whether to share your
              assessment results so the two of you can see a compatibility or
              couples report. That sharing is opt-in.
            </li>
            <li>
              <strong>You can change your mind.</strong> You can adjust or
              withdraw what you share going forward through your settings or by
              contacting us. Reports already generated from previously shared
              data may persist until regenerated or deleted.
            </li>
          </ul>
        </section>

        {/* Third-party (partner/child) data */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            7. Information About Other People
          </h2>
          <p className="mt-3">
            When you talk to the coach about your partner, your children, or
            other people, you may share sensitive information about individuals
            who are not Relatti users and have not consented. We process this
            information only to provide coaching to you, and we do not
            independently verify it or act on it against anyone.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              You are responsible for the information you choose to share about
              others, and for doing so lawfully.
            </li>
            <li>
              We apply the same security and the same strict partner-isolation
              controls (Section 6) to this information — it is not exposed to
              your partner or anyone else through the product.
            </li>
            <li>
              Where a disclosure suggests a child or other person may be at
              risk, the automated safety screening logs a flag and the coach
              points you to appropriate resources (Section 5) — no person is
              alerted. As an AI coaching product we are not a mandated reporter
              and we do not contact authorities or third parties on your
              behalf.
            </li>
            <li>
              If you believe someone has shared information about you through the
              Service and you want to understand your rights, contact us at{" "}
              <LegalLink href={`mailto:${c.privacyEmail}`} external>
                {c.privacyEmail}
              </LegalLink>
              .
            </li>
          </ul>
        </section>

        {/* Storage + security */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Data Storage &amp; Security
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Data is stored in Supabase (hosted on AWS) with row-level security
              so that each account can only access its own data.
            </li>
            <li>
              Data is encrypted in transit (TLS) and at rest (AES-256).
            </li>
            <li>
              Access to user data by our team is restricted to authorized
              personnel, limited to what is needed to operate the Service and
              respond to safety concerns, and is being brought under
              access-logging.
            </li>
            <li>
              No method of transmission or storage is perfectly secure; we
              cannot guarantee absolute security, but we work to protect your
              information and to notify you of a material breach as required by
              law.
            </li>
          </ul>
        </section>

        {/* Disclosure / legal process */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. How We Share &amp; Disclose Information
          </h2>
          <p className="mt-3">
            <strong>We do not sell your personal information.</strong> We share
            it only as follows:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Service providers (subprocessors):</strong> as described
              in Section 4, to operate the Service.
            </li>
            <li>
              <strong>With your direction:</strong> the consented couples data
              you choose to share with a connected partner (Section 6).
            </li>
            <li>
              <strong>Legal process &amp; law enforcement:</strong> we may
              disclose information if required by law, subpoena, court order, or
              valid legal request, or to protect the rights, safety, or property
              of users or the public. Relationship-coaching records can be
              sought in family-law disputes; where we are legally permitted, we
              will aim to notify you of a request before responding, and we
              practice data minimization to limit what we retain and could be
              compelled to produce.
            </li>
            <li>
              <strong>Business transfer:</strong> if the Service is involved in a
              merger, acquisition, or asset sale, data may transfer subject to
              this Policy.
            </li>
          </ul>
        </section>

        {/* Retention + deletion */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Data Retention &amp; Deletion
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              We retain your data for as long as your account is active.
            </li>
            <li>
              You can request deletion of your account and associated content;
              on deletion we remove your personal content — including coaching
              messages, memory, summaries, assessment responses, and
              connection data — within 30 days from our production systems.
            </li>
            <li>
              We may retain limited records where the law requires it, or a
              minimal safety record where a serious safety concern was flagged;
              where we do, we keep only what is necessary and disclose it here.
            </li>
            <li>
              Backups are rotated on a schedule; residual copies age out of
              backups after deletion.
            </li>
          </ul>
        </section>

        {/* Rights */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Your Rights &amp; Choices
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Access &amp; export:</strong> you can view your data in the
              app and request an export in a machine-readable format.
            </li>
            <li>
              <strong>Correction:</strong> you can correct account details and
              facts the coach has learned about you.
            </li>
            <li>
              <strong>Deletion:</strong> you can request deletion as described in
              Section 10.
            </li>
            <li>
              <strong>Opt-out of outreach:</strong> you can pause or stop
              proactive messages at any time.
            </li>
            <li>
              <strong>Regional rights:</strong> depending on where you live (for
              example, under the GDPR or California&apos;s CCPA/CPRA), you may
              have additional rights, including to object to or restrict certain
              processing and to lodge a complaint with a regulator. We honor
              these rights; contact us to exercise them.
            </li>
          </ul>
        </section>

        {/* Children */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            12. Children&apos;s Privacy
          </h2>
          <p className="mt-3">
            The Service is intended only for adults aged 18 and older. We do not
            knowingly allow anyone under 18 to create an account or knowingly
            collect personal information from children as users. Adults may
            discuss their children with the coach; that information is treated as
            third-party data under Section 7. If you believe a minor has created
            an account, contact us and we will remove it.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            13. Changes to This Policy
          </h2>
          <p className="mt-3">
            We may update this Policy. When we make material changes we will
            update the version and &quot;Last updated&quot; date above and, where
            appropriate, ask you to review and re-accept. Continued use after an
            update means you accept the revised Policy.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            14. Contact Us
          </h2>
          <p className="mt-3">
            Questions about this Policy or your data? See also our{" "}
            <LegalLink href="/terms">Terms of Service</LegalLink> and{" "}
            <LegalLink href="/disclaimer">AI &amp; Coaching Disclaimer</LegalLink>
            .
          </p>
          <div className="mt-3 rounded-lg bg-surface-100 p-4">
            <p>
              <strong>{c.entity}</strong> (Relatti)
            </p>
            <p>
              Privacy:{" "}
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
