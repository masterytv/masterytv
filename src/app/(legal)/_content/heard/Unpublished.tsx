import { LEGAL_CONTACT } from "@/lib/platform/legal";
import { LegalLink } from "../shared";

/**
 * HEARD legal placeholder — stands in for the Privacy Policy, Terms and AI
 * Disclaimer until I11 publishes them.
 *
 * 🔑 Why this exists instead of rendering another vertical's documents under
 * the HEARD wordmark: the other three verticals' documents do not cover what
 * this one does. INTEGRATION_SPRINT.md I11 owes an Illinois WOPR position (no
 * compliance path for an AI, so a geofence), an 18+ gate, a standalone
 * versioned consent record (a ToS checkbox is statutorily not consent in
 * Illinois, which is why `coaching_consents` exists and fails closed), and
 * Utah §58-60-118's licensed-involvement requirement. Publishing Mastery's or
 * Relatti's text here would state terms that do not describe the service, on
 * the vertical with the most legal exposure. Refusing is the safe direction,
 * and it matches how I2 handled the report renderer.
 *
 * 📁 Directory, not filename: the integration deny-list scopes on a path
 * SEGMENT (`(^|/)heard([/.-]|$)`), so `_content/heard/Unpublished.tsx` is
 * scanned and a PascalCase `HeardUnpublished.tsx` in the shared folder would
 * not be. Put every HEARD content file in a `heard/` directory for that reason.
 */
export default function HeardUnpublished({ doc }: { doc: string }) {
  const c = LEGAL_CONTACT.heard;
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{doc}</h1>
      <div className="mt-10 space-y-6 text-text-secondary leading-relaxed">
        <p>
          This document is not published yet, and {c.product} is not open to the
          public.
        </p>
        <p>
          The documents for this service are being written specifically for it.
          Nothing here is carried over from the other services run by{" "}
          {c.entity}, because the obligations are different and borrowed text
          would describe something you are not using.
        </p>
        <p>
          If you are reading this, you were invited directly. Questions go to{" "}
          <LegalLink href={`mailto:${c.supportEmail}`} external>
            {c.supportEmail}
          </LegalLink>
          .
        </p>
      </div>
    </article>
  );
}
