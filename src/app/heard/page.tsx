import type { Metadata } from "next";
import { heardPageMetadata } from "@/lib/platform/brand-metadata";
import TellItBox from "./TellItBox";

/**
 * The HEARD door — INTEGRATION_SPRINT.md I5.1, EXPERIENCE §5.1 + §5.2.
 *
 * ─── WHY THIS PAGE IS ALMOST EMPTY ───────────────────────────────────────
 *
 * Every other brand's landing page sells: hero, proof, features, testimonials,
 * a CTA that opens a funnel. This one has a pledge and a box, and the restraint
 * is the product decision rather than an unfinished page.
 *
 * §0 inverts the engine's assess → report → coach into **tell → be met → be
 * placed → then measure**, because the strongest empirical finding in the whole
 * field is that the reaction of the FIRST person told predicts the outcome
 * (Pehlivanova 2025, n=167: 85% felt a strong need to talk, 55% were afraid
 * to). So the first response is a load-bearing product surface, not an
 * onboarding step, and everything between the visitor and saying the thing is
 * cost. No signup wall, no email field, no age gate, no assessment, no
 * scaffolding questions, no character minimum. The 18+ gate and the consent
 * screen land before turn TWO (I5.5, already built and enforced server-side).
 *
 * ─── COPY DISCIPLINE, ENFORCED ───────────────────────────────────────────
 *
 * This file sits under a `heard/` path segment, so the integration deny-list
 * scans **every line of it**, comments included, for the licensed-care
 * vocabulary I11.1 bans. The list itself lives in
 * `scripts/check-integration-deny-list.mjs` and is deliberately NOT restated
 * here: writing those words out, even to explain that they are banned, trips
 * the gate on the file explaining it. (It bit this comment on the first run.
 * Describe the shape, never reproduce it — the same rule BRAND.md §14.6 gives
 * for copy tells.) The doors are the vertical's highest-risk copy, Illinois has
 * no compliance path for an AI, and marketing language is the likeliest cause
 * of a first enforcement action.
 *
 * §5.1 bans the field's own vocabulary in both directions too: the woo register
 * (spiritual emergency, awakening, sacred, starseed, high vibration) and the
 * medical one (anomalous, symptoms, disorder). "Anomalous" means deviation from
 * correct, which is a quiet verdict.
 *
 * The neutrality pledge below is quoted **verbatim** from §5.1 and is required
 * above the fold on every door. Do not paraphrase it. Its last line is where
 * the whole positioning lives: the experience is a fact about a life, and the
 * work is the life.
 */
export const metadata: Metadata = heardPageMetadata({
  title: "HEARD",
  description:
    "Say the thing you have not been able to say. Nobody here will tell you what it was.",
  canonical: "/",
});

export default function HeardDoorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-display-sm text-text-primary">HEARD</h1>

      {/* The neutrality pledge. Verbatim per §5.1, above the fold, and load
          bearing: this population's defining injury is being explained away,
          and every competing brand in the space opens on transformation. */}
      <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary">
        We will not tell you what it was. We are not going to say it was God, or
        aliens, or your brain. That question is yours. Our work is what you do
        with your Tuesday.
      </p>

      <TellItBox />
    </main>
  );
}
