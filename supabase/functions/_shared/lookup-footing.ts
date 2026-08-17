/**
 * `lookup_footing` — INTEGRATION_SPRINT.md §3 / I4.4.
 *
 * The Footing check (I7) is fifteen items: the Shake (Core Beliefs Inventory),
 * Fit and Footing (ISLES-SF), and PHQ-4. This is how the coach reads the result
 * back without asking the person for it.
 *
 * ─── TWO PROPERTIES THAT ARE THE WHOLE POINT ──────────────────────────────
 *
 * 1. NO REQUIRED PARAMETERS. I4.4's rule, learned twice on earlier verticals: a
 *    parameter the model cannot fill from context becomes the model
 *    interrogating the user for it. Here that would mean asking somebody to
 *    recite scores the product already holds.
 *
 * 2. 🔑 THE PHQ-4 NEVER LEAVES THIS FILE. EXPERIENCE §5.5 makes it private and
 *    never displayed: it is a routing signal, not a result, and there is no
 *    score, band or label for it anywhere the person can see. A model is a
 *    display surface — anything handed to it can be said out loud, asked about,
 *    or repeated back in a summary. So the projection is an ALLOW-LIST of the
 *    three visible dials rather than a deny-list of the private one. A new dial
 *    added to the stored bundle is invisible here until somebody decides it
 *    should be visible, which is the correct default for this instrument.
 *
 * Returns a plain "nothing on file" until I7 ships the check and writes
 * `sections.footing`. That is deliberately the same shape
 * `lookup_relationship` uses for a user with no connections: the model reads
 * the absence as data and carries on, instead of announcing a broken tool.
 */

import type { AnthropicTool } from "./anthropic.ts";
import { createSupabaseClient } from "./supabase.ts";

// ─── TOOL DEFINITION ────────────────────────────────────────────────────

export const LOOKUP_FOOTING_TOOL: AnthropicTool = {
  name: "lookup_footing",
  description:
    "Look up this person's Footing check: how much the event shook what they believed (the Shake), " +
    "how much it fits a story that makes sense to them (Fit), and how much of ordinary life is back " +
    "under them (Footing). Takes no arguments. IMPORTANT: if your context already contains a FOOTING " +
    "CHECK section, that data is current and complete — answer from it and do not call this. Call it " +
    "silently, and NEVER ask the person for their scores or ask them to take the check to fill this " +
    "in: if they have not done it, this returns that fact and you carry on without it.\n\n" +
    // Measured, August 12, 2026: on the turn somebody's account arrived, the
    // model replied with one short line and called this tool. Nothing here is
    // urgent, most people have not done the check, and reaching for a lookup
    // while somebody is telling you the strangest hour of their life is the
    // same failure the corpus tool's timing rule exists for.
    "WHEN NOT TO CALL IT. Not while they are telling you what happened, and not in the opening turns " +
    "of a conversation. Nothing here is urgent, and if no FOOTING CHECK section is in your context " +
    "they have almost certainly not done it, so calling this returns nothing and costs the moment. " +
    "Call it when the conversation has turned to how ordinary life is going and you need the reading " +
    "to work from.",
  input_schema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

// ─── THE VISIBLE DIALS ──────────────────────────────────────────────────

/**
 * The only keys that may reach the model. `phq4` is absent on purpose and must
 * stay absent: see the header. Adding a key here is a product decision about
 * what a person may be told about themselves.
 */
const VISIBLE_DIALS = ["shake", "fit", "footing"] as const;

export interface FootingLookupResult {
  found: boolean;
  data: unknown;
}

/**
 * Project the stored bundle down to the visible dials. Pure, so the gate can
 * prove what the coach is and is not handed.
 */
export function projectFooting(stored: unknown): Record<string, unknown> | null {
  if (!stored || typeof stored !== "object") return null;
  const bundle = stored as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of VISIBLE_DIALS) {
    if (bundle[key] !== undefined) out[key] = bundle[key];
  }
  return Object.keys(out).length > 0 ? out : null;
}

// ─── TOOL HANDLER ───────────────────────────────────────────────────────

export async function handleLookupFooting(userId: string): Promise<FootingLookupResult> {
  const supabase = createSupabaseClient();

  // ⚠️ ONE string literal (ORIENT §7): a `+` concatenation types every returned
  // row as GenericStringError and the errors propagate to every importer.
  // Program-scoped by hand — assessment_reports carries `program`, and a
  // user_id-only read is the child-scoped blind spot that leaked one vertical's
  // context into another's coach in July.
  const { data: report } = await supabase
    .from("assessment_reports")
    .select("sections, generated_at")
    .eq("user_id", userId)
    .eq("program", "integration")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sections = (report?.sections ?? null) as Record<string, unknown> | null;
  const dials = projectFooting(sections?.["footing"]);

  if (!dials) {
    return {
      found: false,
      data:
        "No Footing check on file. Do not ask them for scores and do not push them toward it — " +
        "work with what they have told you.",
    };
  }

  return {
    found: true,
    data: {
      taken_at: report?.generated_at ?? null,
      dials,
      reading_rule:
        "These are self-reflection readings, not a test and not a verdict. A high Shake means the " +
        "event forced a real re-examination of what they believed, which makes the difficulty " +
        "reasonable rather than a sign that something is wrong with them. Never band, threshold, " +
        "rank or percentile them, and never say what they mean about the person.",
    },
  };
}
