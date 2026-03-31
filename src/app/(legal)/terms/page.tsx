import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Mastery Coach",
  description:
    "Terms and conditions for using the Mastery Coach AI coaching platform.",
};

/**
 * Terms of Service — Required for LinkedIn API access (LinkdAPI)
 * and general legal compliance. Covers service description,
 * AI coaching limitations, acceptable use, billing, and liability.
 */
export default function TermsPage() {
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Last updated: March 31, 2026
      </p>

      <div className="mt-10 space-y-10 text-text-secondary leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            1. Agreement to Terms
          </h2>
          <p className="mt-3">
            These Terms of Service (&quot;Terms&quot;) govern your access to
            and use of the Mastery Coach AI coaching platform (the
            &quot;Service&quot;) operated by MasteryTV LLC (&quot;we,&quot;
            &quot;our,&quot; or &quot;us&quot;). By creating an account or
            using the Service, you agree to be bound by these Terms.
          </p>
          <p className="mt-3">
            If you do not agree to these Terms, you may not access or use
            the Service. We reserve the right to modify these Terms at any
            time, with notice provided through the Service or via email.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            2. Description of Service
          </h2>
          <p className="mt-3">
            Mastery Coach is an AI-powered coaching platform that provides
            personalized business and executive coaching through multiple
            channels including web chat, email, and messaging platforms.
            The Service includes:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>AI-generated coaching conversations and feedback</li>
            <li>
              Personalized onboarding with research-based context building
            </li>
            <li>Goal and commitment tracking</li>
            <li>Proactive coaching outreach (briefings, check-ins)</li>
            <li>Communication style adaptation over time</li>
          </ul>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            3. Important Disclaimers About AI Coaching
          </h2>
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="font-medium text-text-primary">
              Please read this section carefully.
            </p>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Not a Licensed Professional:</strong> Mastery Coach is
              an AI assistant, not a licensed therapist, lawyer, accountant,
              financial advisor, or medical professional. The Service does
              not provide and should not be construed as professional advice
              in any licensed domain.
            </li>
            <li>
              <strong>Not a Substitute for Professional Help:</strong> If
              you are experiencing a mental health crisis, legal issue,
              medical concern, or financial emergency, please contact a
              qualified professional. In case of emergency, call 911 or
              your local emergency number. For mental health crises, contact
              the 988 Suicide &amp; Crisis Lifeline.
            </li>
            <li>
              <strong>AI Limitations:</strong> The AI coach may occasionally
              provide inaccurate, incomplete, or inappropriate responses.
              While we continuously improve the Service, AI-generated
              content should be evaluated with your own judgment and
              professional advice where appropriate.
            </li>
            <li>
              <strong>No Guarantee of Results:</strong> Coaching outcomes
              depend on many factors including your engagement, context, and
              actions. We make no guarantees about specific business,
              personal, or professional outcomes.
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            4. Accounts & Eligibility
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              You must be at least 18 years old to use the Service.
            </li>
            <li>
              You are responsible for maintaining the confidentiality of
              your account credentials and for all activities under your
              account.
            </li>
            <li>
              You must provide accurate, current information when creating
              your account.
            </li>
            <li>
              One person may maintain one account. Company accounts may be
              available under enterprise plans.
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            5. Acceptable Use
          </h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Use the Service for any unlawful purpose or in violation of
              any applicable law or regulation.
            </li>
            <li>
              Attempt to manipulate the AI coach into providing professional
              advice in prohibited domains (legal, medical, financial, tax).
            </li>
            <li>
              Share your account access with others or create accounts on
              behalf of others without authorization.
            </li>
            <li>
              Use automated tools, bots, or scripts to interact with the
              Service (except through approved API integrations).
            </li>
            <li>
              Reverse engineer, decompile, or attempt to extract the
              coaching algorithms or system prompts.
            </li>
            <li>
              Use the Service to harass, abuse, or harm others, or to
              generate harmful, hateful, or discriminatory content.
            </li>
            <li>
              Exceed reasonable usage limits designed to prevent abuse and
              ensure fair access.
            </li>
          </ul>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            6. Subscriptions & Billing
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Free Tier:</strong> Limited to 5 messages per day.
              Includes basic coaching functionality.
            </li>
            <li>
              <strong>Core ($99/month):</strong> Unlimited messages,
              multi-channel coaching, proactive outreach, and full feature
              access.
            </li>
            <li>
              <strong>Billing:</strong> Subscriptions are billed in advance
              on a monthly or annual basis through Stripe. Annual plans
              receive a discount.
            </li>
            <li>
              <strong>Cancellation:</strong> You may cancel your
              subscription at any time through the Settings page or Stripe
              Customer Portal. Cancellation takes effect at the end of the
              current billing period. No refunds are provided for partial
              periods.
            </li>
            <li>
              <strong>Price Changes:</strong> We may change pricing with 30
              days&apos; notice. Existing subscribers will be grandfathered
              at their current rate for at least one billing cycle.
            </li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            7. Intellectual Property
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Your Content:</strong> You retain ownership of all
              content you provide to the Service, including messages, goals,
              and business information.
            </li>
            <li>
              <strong>License to Us:</strong> By using the Service, you
              grant us a limited, non-exclusive license to process your
              content solely for the purpose of providing the coaching
              service.
            </li>
            <li>
              <strong>Our Content:</strong> The Service, coaching
              methodologies, algorithms, and branding are the intellectual
              property of MasteryTV LLC. You may not copy, modify, or
              distribute our proprietary content.
            </li>
            <li>
              <strong>AI-Generated Responses:</strong> Coaching responses
              generated by the AI are provided for your personal use. You
              may use insights from coaching conversations in your business
              activities.
            </li>
          </ul>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Third-Party Services & Data
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              The Service integrates with third-party platforms including
              LinkedIn (for profile data during onboarding), Telegram (for
              messaging), Stripe (for payments), and AI providers
              (Anthropic, OpenAI, Perplexity).
            </li>
            <li>
              Your use of LinkedIn data through our Service is subject to
              LinkedIn&apos;s terms of service. We access only publicly
              available profile information that you explicitly authorize
              during onboarding.
            </li>
            <li>
              We are not responsible for the availability, accuracy, or
              policies of third-party services.
            </li>
          </ul>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. Privacy
          </h2>
          <p className="mt-3">
            Your use of the Service is also governed by our{" "}
            <a
              href="/privacy"
              className="text-brand-400 underline underline-offset-2 hover:text-brand-300 transition-colors"
            >
              Privacy Policy
            </a>
            , which describes how we collect, use, and protect your
            information.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Limitation of Liability
          </h2>
          <p className="mt-3">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MASTERYTV LLC SHALL NOT
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF
            PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE
            OF THE SERVICE.
          </p>
          <p className="mt-3">
            OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE
            SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE
            (12) MONTHS PRECEDING THE CLAIM.
          </p>
          <p className="mt-3">
            YOU EXPRESSLY ACKNOWLEDGE THAT THE SERVICE PROVIDES AI-GENERATED
            COACHING AND NOT PROFESSIONAL ADVICE. ANY ACTIONS YOU TAKE BASED
            ON THE SERVICE&apos;S OUTPUT ARE AT YOUR OWN RISK AND
            DISCRETION.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Indemnification
          </h2>
          <p className="mt-3">
            You agree to indemnify and hold harmless MasteryTV LLC, its
            officers, directors, and employees from any claims, damages, or
            expenses arising from your use of the Service, your violation of
            these Terms, or your violation of any rights of another.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            12. Termination
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              You may terminate your account at any time by contacting
              support@masterytv.com.
            </li>
            <li>
              We may suspend or terminate your account if you violate these
              Terms, engage in abusive behavior, or for any reason with
              reasonable notice.
            </li>
            <li>
              Upon termination, your right to use the Service ceases
              immediately. Data deletion follows our{" "}
              <a
                href="/privacy"
                className="text-brand-400 underline underline-offset-2 hover:text-brand-300 transition-colors"
              >
                Privacy Policy
              </a>{" "}
              retention schedule.
            </li>
          </ul>
        </section>

        {/* 13 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            13. Governing Law
          </h2>
          <p className="mt-3">
            These Terms shall be governed by and construed in accordance
            with the laws of the State of Florida, United States, without
            regard to conflict of law principles. Any disputes shall be
            resolved in the courts of Florida.
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            14. Contact
          </h2>
          <p className="mt-3">
            Questions about these Terms? Contact us:
          </p>
          <div className="mt-3 rounded-lg border border-surface-300 bg-surface-50 p-4">
            <p>
              <strong>MasteryTV LLC</strong>
            </p>
            <p>Email: support@masterytv.com</p>
            <p>Website: masterytv.com</p>
          </div>
        </section>
      </div>
    </article>
  );
}
