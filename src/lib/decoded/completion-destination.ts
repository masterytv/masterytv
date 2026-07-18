import type { ProgramId } from "@/lib/platform/brand";

/**
 * What happens the instant a user's assessment finishes, keyed by program.
 *
 * WHY THIS EXISTS: the Decoded report viewer (`/report/[id]`) renders the
 * Big-Five LLM sections (S1–S8). A money assessment's report row carries a
 * `sections.money_map` bundle instead, so sending money to `/report/[id]`
 * renders a blank page (the SHARP GAP the write-path exposed). Money's result
 * is the coach's REVEAL, delivered in chat off Layer 4.5 — so money lands in
 * the reveal chat, never the report viewer.
 *
 * `Record<ProgramId, …>` is exhaustive: a new vertical compile-fails here until
 * it declares its completion plan, rather than silently inheriting the
 * executive report viewer. This is also why the branch lives in a typed map
 * and not a `program === "money" ? …` ternary in the component (which the
 * brand-ternary gate bans, and which would hand every future vertical the
 * report viewer by default).
 */
export interface CompletionPlan {
  /** Where the finished assessment lands (reportId is null if generation failed). */
  href: (reportId: string | null) => string;
  /**
   * Push there automatically the moment the report is ready — money's reveal is
   * the payoff, so don't make the user click into it. Report-viewer verticals
   * keep the existing click-through so the reader opens it at their own pace.
   */
  autoNavigate: boolean;
  /** CTA label on the completion screen's button. */
  cta: string;
  /** The "your result is ready" line on the completion screen. */
  ready: string;
  /** Heading on the transient "navigating away" screen. */
  opening: string;
}

const COMPLETION: Record<ProgramId, CompletionPlan> = {
  // Executive + relationship: the Decoded/Relatti report viewer (unchanged).
  general: {
    href: (reportId) => (reportId ? `/report/${reportId}` : "/dashboard"),
    autoNavigate: false,
    cta: "View Report",
    ready: "Your personalized report is ready.",
    opening: "Opening your report…",
  },
  relationship: {
    href: (reportId) => (reportId ? `/report/${reportId}` : "/dashboard"),
    autoNavigate: false,
    cta: "View Report",
    ready: "Your personalized report is ready.",
    opening: "Opening your report…",
  },
  // Money: the reveal chat. `context=money_reveal` seeds the coach's Rung-1
  // reveal (MONEY_EXPERIENCE.md §6) off the just-written Money Map. reportId only
  // gates the fallback — the profile itself is loaded server-side at Layer 4.5.
  money: {
    href: (reportId) => (reportId ? "/dashboard/chat?context=money_reveal" : "/dashboard"),
    autoNavigate: true,
    cta: "Meet your money coach",
    ready: "Your Money Map is ready — your coach already has the read.",
    opening: "Opening your coach…",
  },
};

/**
 * Resolve the completion plan for a program. Unknown/legacy program strings fall
 * back to the incumbent report-viewer behavior (never money's chat) so a
 * mis-stamped row can't misroute.
 */
export function completionPlan(program: string | null | undefined): CompletionPlan {
  return (program ? COMPLETION[program as ProgramId] : undefined) ?? COMPLETION.general;
}
