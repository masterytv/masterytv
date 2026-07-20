/**
 * Shared legal-document metadata (E15.5 — Trust, Privacy & Legal).
 *
 * One source of truth for the version string that the (legal) pages render and
 * that the signup acceptance gate records, so a stored consent record always
 * maps to a specific published revision. Bump LEGAL_VERSION whenever the Privacy
 * Policy / Terms / AI & Coaching Disclaimer change materially — existing users
 * can then be re-prompted to re-accept the new version.
 *
 * STATUS: these are pre-launch DRAFTS pending privacy/health-tech attorney,
 * AI-therapy-law specialist, and licensed-clinician review (epic E15.6). They
 * are wired and acceptance-gated on the (Vercel-protected) beta, but MUST NOT be
 * treated as final published legal terms — or the product opened to the public —
 * until that review lands. See directives/PRIVACY_TERMS_LIABILITY_PLAN.md.
 */
import type { BrandId } from "./brand";

/** Machine version recorded with each user's acceptance. ISO date of the revision. */
export const LEGAL_VERSION = "2026-07-01";

/** Human-readable "Last updated" shown on each document. */
export const LEGAL_LAST_UPDATED = "July 1, 2026";

export interface LegalContact {
  /** Legal entity that operates the service. */
  entity: string;
  /** Product / brand name used throughout the documents. */
  product: string;
  /** Canonical domain. */
  site: string;
  /** Address for privacy / data-rights requests. */
  privacyEmail: string;
  /** General support / account address. */
  supportEmail: string;
  /** Governing-law jurisdiction for the Terms. */
  governingLaw: string;
}

export const LEGAL_CONTACT: Record<BrandId, LegalContact> = {
  masterytv: {
    entity: "MasteryTV LLC",
    product: "Mastery Coach",
    site: "masterytv.com",
    privacyEmail: "support@masterytv.com",
    supportEmail: "support@masterytv.com",
    governingLaw: "State of Florida, United States",
  },
  relatti: {
    entity: "MasteryTV LLC",
    product: "Relatti",
    site: "relatti.com",
    // NOTE (founder to-do before launch): create/forward these relatti.com
    // inboxes. Until then they must at least forward to support@masterytv.com —
    // a bouncing address in a privacy policy is itself a compliance problem.
    privacyEmail: "privacy@relatti.com",
    supportEmail: "support@relatti.com",
    governingLaw: "State of Florida, United States",
  },
  // Money vertical. Same operating entity. Public brand locked 2026-07-20:
  // MoneyTraits on moneytraits.com. INTERIM emails route to the operating
  // entity's live inbox — money-domain inboxes are a §5.9 prod-config to-do, and
  // a bouncing address in a privacy policy is itself a compliance problem.
  money: {
    entity: "MasteryTV LLC",
    product: "MoneyTraits",
    site: "moneytraits.com",
    privacyEmail: "support@masterytv.com",
    supportEmail: "support@masterytv.com",
    governingLaw: "State of Florida, United States",
  },
};
