import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Mastery Coach",
  description:
    "How Mastery Coach collects, uses, and protects your personal information.",
};

/**
 * Privacy Policy — Required for LinkedIn API access (LinkdAPI) and
 * general legal compliance. Covers data collection, AI processing,
 * third-party integrations, and user rights.
 */
export default function PrivacyPage() {
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Last updated: March 31, 2026
      </p>

      <div className="mt-10 space-y-10 text-text-secondary leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            1. Introduction
          </h2>
          <p className="mt-3">
            MasteryTV LLC (&quot;Mastery Coach,&quot; &quot;we,&quot;
            &quot;our,&quot; or &quot;us&quot;) operates the Mastery Coach
            AI coaching platform available at masterycoach.ai and
            masterytv.com (the &quot;Service&quot;). This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our Service.
          </p>
          <p className="mt-3">
            By using the Service, you agree to the collection and use of
            information in accordance with this policy. If you do not agree
            with the terms of this policy, please do not access the Service.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            2. Information We Collect
          </h2>

          <h3 className="mt-4 text-lg font-medium text-text-primary">
            2.1 Information You Provide
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Account Information:</strong> Name, email address,
              timezone, and communication preferences when you create an
              account.
            </li>
            <li>
              <strong>Onboarding Data:</strong> Website URL and LinkedIn
              profile URL you provide during onboarding to personalize your
              coaching experience.
            </li>
            <li>
              <strong>Coaching Conversations:</strong> Messages you send to
              and receive from the AI coach, including text content across
              all channels (web chat, email, Telegram).
            </li>
            <li>
              <strong>Profile Corrections:</strong> Edits and corrections you
              make to research findings during onboarding.
            </li>
            <li>
              <strong>Payment Information:</strong> Billing details processed
              securely through Stripe. We do not store credit card numbers on
              our servers.
            </li>
          </ul>

          <h3 className="mt-4 text-lg font-medium text-text-primary">
            2.2 Information Collected Automatically
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Usage Data:</strong> Message timestamps, channel
              preferences, conversation patterns, and engagement metrics used
              to improve coaching quality.
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, IP address,
              and device identifiers for security and service optimization.
            </li>
          </ul>

          <h3 className="mt-4 text-lg font-medium text-text-primary">
            2.3 Information from Third-Party Sources
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>LinkedIn Data:</strong> When you provide your LinkedIn
              URL during onboarding, we retrieve publicly available profile
              information (name, headline, experience, education) through
              authorized API services to personalize your coaching
              experience. This data is only accessed with your explicit
              consent.
            </li>
            <li>
              <strong>Website Data:</strong> When you provide your company
              website URL, we extract publicly available business information
              to understand your context. This is done through web scraping
              of publicly accessible pages only.
            </li>
            <li>
              <strong>Google OAuth:</strong> If you sign in with Google, we
              receive your name and email address from your Google account.
            </li>
          </ul>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            3. How We Use Your Information
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Personalized Coaching:</strong> Your conversations,
              goals, challenges, and profile information are used by our AI
              coaching engine to provide tailored, contextual coaching
              responses.
            </li>
            <li>
              <strong>Memory & Context:</strong> We extract and store facts,
              commitments, and patterns from your coaching conversations to
              maintain continuity across sessions and channels.
            </li>
            <li>
              <strong>Communication Profile:</strong> We build a
              communication style profile (e.g., directness preference,
              warmth level) based on your interactions to adapt how the coach
              communicates with you.
            </li>
            <li>
              <strong>Proactive Outreach:</strong> We use your data to
              generate personalized morning briefings, accountability
              check-ins, and coaching sessions via your preferred channel.
            </li>
            <li>
              <strong>Service Improvement:</strong> Aggregated, anonymized
              usage data helps us improve coaching quality and Service
              features.
            </li>
            <li>
              <strong>Safety:</strong> We monitor conversations for crisis
              signals (e.g., expressions of self-harm) solely to provide
              appropriate safety resources.
            </li>
            <li>
              <strong>Billing:</strong> To process payments and manage
              subscriptions.
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            4. AI Processing & Third-Party AI Services
          </h2>
          <p className="mt-3">
            Our Service uses third-party AI models to power the coaching
            experience:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Anthropic (Claude):</strong> Processes your messages to
              generate coaching responses. Your messages are sent to
              Anthropic&apos;s API for processing. Anthropic&apos;s data
              retention policies apply to data processed through their API.
            </li>
            <li>
              <strong>OpenAI (GPT-4o-mini):</strong> Used for asynchronous
              processing including fact extraction, commitment tracking, and
              summarization. OpenAI&apos;s API data policies apply.
            </li>
            <li>
              <strong>OpenAI (Embeddings):</strong> Your messages are
              converted to mathematical representations (embeddings) for
              semantic search and memory retrieval.
            </li>
            <li>
              <strong>Perplexity (Sonar):</strong> Used to verify factual
              claims and provide grounded information during coaching. Only
              the specific factual question is sent, not your full
              conversation.
            </li>
          </ul>
          <p className="mt-3">
            We use business API tiers of these services, which do not use your
            data to train their models. Your coaching conversations are
            processed for your benefit only and are not shared with other
            users.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            5. Data Storage & Security
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Your data is stored in Supabase (hosted on AWS) with
              Row-Level Security (RLS) ensuring that each user can only
              access their own data.
            </li>
            <li>
              All data is encrypted in transit (TLS 1.2+) and at rest
              (AES-256).
            </li>
            <li>
              Payment processing is handled entirely by Stripe; we never
              store or process credit card numbers directly.
            </li>
            <li>
              Access to user data is restricted to authorized personnel
              (currently the founder only) and is used solely for service
              operation.
            </li>
          </ul>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            6. Data Sharing
          </h2>
          <p className="mt-3">
            We do not sell your personal information. We share data only in
            the following circumstances:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>AI Service Providers:</strong> As described in Section 4,
              message content is processed by AI providers to deliver the
              coaching service.
            </li>
            <li>
              <strong>Payment Processor:</strong> Stripe processes billing
              information for subscription management.
            </li>
            <li>
              <strong>Email Delivery:</strong> Resend processes email content
              for coaching messages delivered via email.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose information
              if required by law, subpoena, or to protect safety.
            </li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            7. Your Rights
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Access:</strong> You can view your coaching data,
              memory facts, and communication profile at any time through
              the dashboard.
            </li>
            <li>
              <strong>Correction:</strong> You can edit facts the coach has
              learned about you through the coaching letter page.
            </li>
            <li>
              <strong>Deletion:</strong> You can request complete deletion of
              your account and all associated data by contacting
              support@masterytv.com.
            </li>
            <li>
              <strong>Export:</strong> You can request an export of your
              coaching data in a machine-readable format.
            </li>
            <li>
              <strong>Opt-Out:</strong> You can pause proactive outreach at
              any time by telling the coach &quot;pause&quot; or through
              settings.
            </li>
          </ul>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Data Retention
          </h2>
          <p className="mt-3">
            We retain your coaching data for as long as your account is
            active. If you delete your account, all personal data is
            permanently removed within 30 days. Aggregated, anonymized data
            may be retained for service improvement.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. Children&apos;s Privacy
          </h2>
          <p className="mt-3">
            The Service is not intended for individuals under the age of 18.
            We do not knowingly collect personal information from children.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Changes to This Policy
          </h2>
          <p className="mt-3">
            We may update this Privacy Policy from time to time. We will
            notify you of changes by posting the new policy on this page and
            updating the &quot;Last updated&quot; date. Continued use of the
            Service after changes constitutes acceptance.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Contact Us
          </h2>
          <p className="mt-3">
            If you have questions about this Privacy Policy or your data,
            contact us at:
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
