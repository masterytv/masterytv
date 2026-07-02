import { LEGAL_CONTACT } from "@/lib/platform/legal";
import { EmergencyResources, LegalLink } from "./shared";

/**
 * "Why an AI coach?" — the honest objection-handling page for people wary of
 * AI. Tone rule (from the founder): we are NOT trying to convince everyone —
 * we respect the skepticism, answer the real objections truthfully, admit
 * limits plainly, and let people decide. Confidentiality wording must match
 * the coach's own honesty script (partner-privacy is the only absolute —
 * PRIVACY_TERMS_LIABILITY_PLAN §4).
 */
export default function RelattiWhyAI() {
  const c = LEGAL_CONTACT.relatti;
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Why an AI coach?
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Fair question. This page answers the real objections — honestly,
        including the parts where the honest answer is &ldquo;it can&apos;t do
        that.&rdquo;
      </p>

      <div className="mt-10 space-y-12 text-text-secondary leading-relaxed">
        <section>
          <p>
            Some people are uneasy about bringing AI anywhere near their
            relationship. We&apos;re not going to try to talk everyone out of
            that — skepticism about new technology in intimate spaces is
            healthy. What we can do is answer the questions people actually
            ask, plainly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;Shouldn&apos;t we just see a couples therapist?&rdquo;
          </h2>
          <p className="mt-3">
            If you can, and you want to —{" "}
            <strong className="text-text-primary">yes. Go.</strong> Relatti is
            not therapy and doesn&apos;t pretend to be. But here&apos;s the
            reality that shaped this product: couples therapy runs roughly
            $150–250 a session, therapists have waitlists, and researchers
            estimate the average couple lives with a problem for years before
            seeking any help at all. The realistic alternative to an AI coach
            at 11pm on a Tuesday usually isn&apos;t a therapist — it&apos;s
            nothing, or another round of the same fight.
          </p>
          <p className="mt-3">
            Our stance is <em>and, not instead</em>. Relatti works the everyday
            layer — understanding your patterns, small skills, the conversation
            you need to have tonight — and when something needs a licensed
            professional, the coach says so and points you there. For plenty of
            couples, an app like this is the on-ramp that gets them to therapy
            earlier, not a reason to skip it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;Can an AI actually understand a relationship?&rdquo;
          </h2>
          <p className="mt-3">
            Partly. Be suspicious of anyone who claims more. What it genuinely
            does well: it remembers everything you&apos;ve told it, months
            later. With consent, it knows <em>both</em> partners&apos; measured
            relationship styles — something no individual therapist gets from a
            50-minute intake. It has infinite patience, no eye-rolls, and no
            judgment, and research on self-disclosure consistently finds people
            open up more when they don&apos;t fear being judged. And it&apos;s
            there in the exact moment things go sideways, not next Thursday at
            3pm.
          </p>
          <p className="mt-3">
            What it can&apos;t do: it has never been married, never repaired a
            rupture of its own, can&apos;t read your body language, and has no
            clinical judgment. It is a skilled, tireless conversational tool
            grounded in good research — not a wise human. We build the product,
            and the coach itself, to be honest about that line.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;What if it gives us terrible advice?&rdquo;
          </h2>
          <p className="mt-3">
            The best answer is structural: Relatti&apos;s coach mostly{" "}
            <strong className="text-text-primary">
              doesn&apos;t give advice
            </strong>
            . Its stance — the one that performed in the only published
            randomized trial of a relationship chatbot (see{" "}
            <LegalLink href="/science">the science</LegalLink>) — is to help
            you understand what&apos;s actually going on first: validate,
            reflect what&apos;s underneath, ask one good question. Suggestions
            come late, small, and with permission (&ldquo;Want a thought?&rdquo;).
            And there are hard lines it will not cross: it never diagnoses you
            or your partner, never takes sides, and never tells anyone to stay
            in or leave a relationship — that decision is yours, not a
            machine&apos;s.
          </p>
          <p className="mt-3">
            Can an AI still get things wrong? Yes, and the{" "}
            <LegalLink href="/disclaimer">disclaimer</LegalLink> says so
            without hedging. That&apos;s also why the format is questions and
            reflections rather than prescriptions — a wrong question wastes a
            minute; a wrong prescription does damage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;Is it safe when things are really bad?&rdquo;
          </h2>
          <p className="mt-3">
            This is the objection we take most seriously, because the research
            on AI chat systems shows their worst failure is missing a quiet
            cry for help. So Relatti doesn&apos;t leave safety to the
            conversational model&apos;s judgment. Every message passes an
            immediate safety check, and a second, independent layer reviews
            conversations in context for the subtler signals — including risk
            to someone <em>other</em> than the person typing. When these fire,
            the coach stops coaching and routes to trained humans. If there are
            signs of violence or coercive control, it will not offer
            &ldquo;communication tips&rdquo; — couples work in an unsafe
            relationship causes harm — it connects you with specialists.
            High-severity safety flags are reviewed by a human on our team.
          </p>
          <p className="mt-3">
            And to be equally clear about the limit: Relatti is{" "}
            <strong className="text-text-primary">not a crisis service</strong>{" "}
            and is not monitored in real time.
          </p>
          <EmergencyResources />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;Where does what I share actually go?&rdquo;
          </h2>
          <p className="mt-3">
            The one absolute promise:{" "}
            <strong className="text-text-primary">
              your partner cannot see your conversations.
            </strong>{" "}
            Coaching is private per person, enforced in how the system is
            built. The only thing that ever crosses to your partner is
            assessment-profile information you explicitly consent to share —
            and you can lower or revoke that at any time.
          </p>
          <p className="mt-3">
            Beyond that, we tell you the truth rather than a comforting
            absolute: your messages are processed by AI providers under
            business terms that do not allow training on your data, stored
            securely by us, and a small team may review conversations flagged
            for safety. You can delete your account and data whenever you want.
            The details live in the{" "}
            <LegalLink href="/privacy">Privacy Policy</LegalLink> — the coach
            itself is instructed to give you this same honest answer if you ask
            it directly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;Won&apos;t this replace human connection?&rdquo;
          </h2>
          <p className="mt-3">
            It&apos;s designed to do the opposite, and you can judge the design
            for yourself: the shared questions are answered separately and
            revealed <em>together</em> — the point is the conversation they
            start between you two, off the screen. The coach&apos;s job is to
            help you understand your pattern and then turn you back toward each
            other. Our honest win condition is more minutes with your partner,
            not more minutes in the app. A relationship product that makes
            itself the relationship has failed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            &ldquo;Isn&apos;t AI therapy being banned?&rdquo;
          </h2>
          <p className="mt-3">
            Several US states regulated AI <em>therapy</em> in 2025 — and we
            think those laws are broadly right. Relatti was built after them
            and deliberately on the other side of the line they draw: it
            provides relationship education and coaching, discloses at every
            step that it is an AI and not a therapist or a human, and routes
            clinical needs to licensed professionals rather than attempting
            treatment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Still unsure?
          </h2>
          <p className="mt-3">
            Good — that&apos;s the right way to approach anything new in this
            part of your life. Read{" "}
            <LegalLink href="/science">what the coaching is built on</LegalLink>
            , read the <LegalLink href="/privacy">Privacy Policy</LegalLink>,
            and if a question isn&apos;t answered anywhere, ask us directly:{" "}
            <LegalLink href={`mailto:${c.supportEmail}`} external>
              {c.supportEmail}
            </LegalLink>
            . The free version exists so you can judge the real thing instead
            of our claims about it.
          </p>
        </section>
      </div>
    </article>
  );
}
