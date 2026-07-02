import { LEGAL_CONTACT } from "@/lib/platform/legal";
import { LegalLink } from "./shared";

/**
 * "The science" — the evidence page for skeptics, therapists, and researchers.
 *
 * Written for a professional reader: every load-bearing claim is either cited
 * (references at the bottom) or explicitly labeled as a design choice / open
 * question. The honesty rules from the coach apply here too — no claim the
 * product can't keep, including about evidence. Grounded in
 * directives/RELATTI_EXPERIENCE.md §2 (the research foundation) and the E14
 * stance decision record.
 */
export default function RelattiScience() {
  const c = LEGAL_CONTACT.relatti;
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        The science behind Relatti
      </h1>

      <div className="mt-10 space-y-12 text-text-secondary leading-relaxed">
        <section>
          <p>
            Relatti is an AI relationship <strong>coach</strong> — education
            and skills practice, not therapy. We built it on published
            relationship science rather than invented advice, and this page
            lays out exactly what that means: which instruments we use, which
            research traditions shape how the coach talks, what evidence exists
            for this kind of tool, and — just as important —{" "}
            <strong className="text-text-primary">
              what the evidence doesn&apos;t yet show
            </strong>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            The assessment uses validated instruments, not a personality quiz
          </h2>
          <p className="mt-3">
            When you join, Relatti measures how you connect using instruments
            from the published literature, with their canonical item wording
            and published scoring keys:
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <strong className="text-text-primary">
                Attachment — ECR-R (short form).
              </strong>{" "}
              The Experiences in Close Relationships–Revised scale measures
              attachment anxiety and avoidance — the two dimensions that best
              predict how adults reach for and protect themselves from a
              partner (Fraley, Waller &amp; Brennan, 2000). This is the core of
              how the coach calibrates to each person.
            </li>
            <li>
              <strong className="text-text-primary">
                Personality — IPIP Big Five.
              </strong>{" "}
              The public-domain, extensively validated five-factor markers
              (Goldberg, 1992) — used to tune register and delivery, not to
              label anyone.
            </li>
            <li>
              <strong className="text-text-primary">
                Relationship satisfaction — CSI-4.
              </strong>{" "}
              The Couples Satisfaction Index (Funk &amp; Rogge, 2007),
              developed with item-response theory specifically to outperform
              older marital-adjustment scales.
            </li>
            <li>
              <strong className="text-text-primary">
                Emotion regulation — DERS-16.
              </strong>{" "}
              The brief Difficulties in Emotion Regulation Scale (Bjureberg et
              al., 2016) — relevant because regulation, not conflict frequency,
              shapes how fights go.
            </li>
          </ul>
          <p className="mt-4">
            One honest caveat: the friendly &ldquo;relationship style&rdquo;
            names you&apos;ll see in the product are a{" "}
            <em>communication layer</em> we wrote on top of these validated
            scores. The measurement is published science; the labels are ours,
            chosen to be warm and non-pathologizing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            The coaching model draws on the best-evidenced couples research
          </h2>
          <ul className="mt-4 space-y-3">
            <li>
              <strong className="text-text-primary">
                Emotionally Focused Therapy (EFT) — the spine.
              </strong>{" "}
              EFT (Johnson) is among the best-validated approaches in couples
              work, with a substantial outcome literature. Relatti borrows its
              central moves: slow the moment down, find the attachment need
              under the complaint, and treat the negative <em>cycle</em> — not
              the partner — as the problem. To be precise: Relatti is{" "}
              <em>informed by</em> EFT&apos;s stance; it does not deliver EFT,
              which is a therapy provided by trained clinicians.
            </li>
            <li>
              <strong className="text-text-primary">
                The Gottman research program.
              </strong>{" "}
              Four decades of observational studies on what predicts
              relationship success: bids for connection and &ldquo;turning
              toward,&rdquo; the Four Horsemen (criticism, contempt,
              defensiveness, stonewalling) and their antidotes, and the
              centrality of repair attempts. These findings shape what the
              coach listens for and the small skills it teaches.
            </li>
            <li>
              <strong className="text-text-primary">
                Self-Determination Theory.
              </strong>{" "}
              Durable behavior change runs on autonomy, competence, and
              relatedness (Ryan &amp; Deci, 2000) — which is why the coach
              offers rather than prescribes, never shames a missed day, and
              keeps every suggested step small and chosen.
            </li>
            <li>
              <strong className="text-text-primary">
                Behavior design.
              </strong>{" "}
              The shared rituals are built on tiny-habit principles: two-minute
              actions, prompted, celebrated — because ability, not motivation,
              is usually the limiting factor.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            How the coach talks — and the trial that shaped it
          </h2>
          <p className="mt-3">
            Relatti&apos;s coach follows a deliberate conversational stance:
            validate first, reflect what&apos;s underneath, ask one open
            question at a time — and withhold advice until it&apos;s genuinely
            earned, then offer one small thing with permission. It never
            diagnoses, never takes sides, and never tells anyone to stay in or
            leave a relationship.
          </p>
          <p className="mt-3">
            That stance isn&apos;t a style preference. In the first published
            randomized controlled trial of a GPT-class relationship chatbot
            (&ldquo;Amanda,&rdquo; 2025, n=258), a system instructed to do
            exactly this — reflect, validate, one question at a time, advice
            withheld — matched an evidence-based active control on 13 of 14
            relationship outcomes and outperformed it on reducing
            demand/withdraw patterns. The same trial&apos;s clearest failure
            mode was <em>missed safety cues</em>, which is why Relatti runs a
            dedicated, always-on safety layer rather than trusting the
            conversational model to catch risk (more below).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Built for two — because one-sided use doesn&apos;t work
          </h2>
          <p className="mt-3">
            A 2025 mixed-methods evaluation of a leading couples app found that
            usage improved emotional intimacy{" "}
            <strong className="text-text-primary">
              only when both partners actively participated
            </strong>{" "}
            — one-sided use showed no significant benefit — and that frequent,
            light engagement beat intensive-but-rare use. Relatti&apos;s core
            mechanics follow that evidence: both partners get their own
            profile, shared questions use a blind reveal (answer independently,
            see both together), and the app plays the neutral third voice that
            raises hard topics so neither partner has to be &ldquo;the one
            pushing.&rdquo; Solo users still get the full coach — often one
            partner starts alone — but the product is honest that the biggest
            gains come when both are in.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Safety is a system, not a prompt
          </h2>
          <p className="mt-3">
            Couples work is contraindicated where there is intimate-partner
            violence or coercive control — &ldquo;communication tips&rdquo; in
            an unsafe relationship cause harm. Relatti screens for abuse,
            crisis, and self-harm signals on two independent layers (an
            immediate check on every message, plus a contextual review that
            reads the recent conversation), stops coaching when they fire,
            routes to specialist human resources (988, the National Domestic
            Violence Hotline), and flags high-severity events for human review.
            The coach also never promises confidentiality the system
            doesn&apos;t keep — see the{" "}
            <LegalLink href="/privacy">Privacy Policy</LegalLink> and{" "}
            <LegalLink href="/disclaimer">Disclaimer</LegalLink>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            What the evidence does not show (yet)
          </h2>
          <p className="mt-3">
            In the spirit of this page: no randomized trial of{" "}
            <em>Relatti itself</em> exists. The AI-coaching literature is
            young; one good RCT of a similar stance is promising, not proof.
            Coaching is not therapy, and nothing here should delay anyone who
            needs clinical care from getting it. We measure outcomes as we go,
            and where a licensed professional is the right tool — entrenched
            distress, trauma, safety, individual mental health — the coach says
            so and points there.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            For clinicians and researchers
          </h2>
          <p className="mt-3">
            Our stance is <em>and, not instead</em>: Relatti works the
            day-to-day layer — bids, repair, tiny habits, the conversation at
            11pm — and refers out for the clinical layer. If you&apos;re a
            couples therapist or researcher and you see something here
            that&apos;s wrong, overstated, or missing, we genuinely want to
            hear it:{" "}
            <LegalLink href={`mailto:${c.supportEmail}`} external>
              {c.supportEmail}
            </LegalLink>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            Selected references
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              Fraley, R. C., Waller, N. G., &amp; Brennan, K. A. (2000). An
              item response theory analysis of self-report measures of adult
              attachment. <em>JPSP, 78</em>(2), 350–365.{" "}
              <LegalLink
                href="https://doi.org/10.1037/0022-3514.78.2.350"
                external
              >
                doi:10.1037/0022-3514.78.2.350
              </LegalLink>
            </li>
            <li>
              Goldberg, L. R. (1992). The development of markers for the
              Big-Five factor structure. <em>Psychological Assessment, 4</em>
              (1), 26–42. See also the{" "}
              <LegalLink href="https://ipip.ori.org/" external>
                International Personality Item Pool
              </LegalLink>
              .
            </li>
            <li>
              Funk, J. L., &amp; Rogge, R. D. (2007). Testing the ruler with
              item response theory: The Couples Satisfaction Index.{" "}
              <em>Journal of Family Psychology, 21</em>(4), 572–583.{" "}
              <LegalLink href="https://doi.org/10.1037/0893-3200.21.4.572" external>
                doi:10.1037/0893-3200.21.4.572
              </LegalLink>
            </li>
            <li>
              Bjureberg, J., et al. (2016). Development and validation of a
              brief version of the Difficulties in Emotion Regulation Scale
              (DERS-16). <em>J Psychopathol Behav Assess, 38</em>, 284–296.{" "}
              <LegalLink href="https://doi.org/10.1007/s10862-015-9514-x" external>
                doi:10.1007/s10862-015-9514-x
              </LegalLink>
            </li>
            <li>
              Johnson, S. M. — Emotionally Focused Therapy outcome research,
              collected by ICEEFT:{" "}
              <LegalLink href="https://iceeft.com/eft-research/" external>
                iceeft.com/eft-research
              </LegalLink>
            </li>
            <li>
              The Gottman research program — four decades of observational
              couples studies:{" "}
              <LegalLink href="https://www.gottman.com/about/research/" external>
                gottman.com/about/research
              </LegalLink>
            </li>
            <li>
              Ryan, R. M., &amp; Deci, E. L. (2000). Self-determination theory
              and the facilitation of intrinsic motivation, social development,
              and well-being. <em>American Psychologist, 55</em>(1), 68–78.{" "}
              <LegalLink href="https://doi.org/10.1037/0003-066X.55.1.68" external>
                doi:10.1037/0003-066X.55.1.68
              </LegalLink>
            </li>
            <li>
              Randomized controlled trial of a GPT-4o relationship chatbot
              (&ldquo;Amanda,&rdquo; 2025, n=258):{" "}
              <LegalLink
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12798473/"
                external
              >
                PMC12798473
              </LegalLink>
            </li>
            <li>
              Mixed-methods evaluation of a couples app (both-partner
              engagement, frequency effects), 2025:{" "}
              <LegalLink
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12001865/"
                external
              >
                PMC12001865
              </LegalLink>
            </li>
          </ul>
        </section>

        <section>
          <p className="text-sm text-text-muted">
            Wondering about the AI itself rather than the psychology? Read{" "}
            <LegalLink href="/why-ai">Why an AI coach?</LegalLink>
          </p>
        </section>
      </div>
    </article>
  );
}
