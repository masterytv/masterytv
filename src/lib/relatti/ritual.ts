/**
 * Daily connection ritual — server loader (RELATTI_EXPERIENCE.md §5.9).
 *
 * Resolves the single "Today's Question" view-model for the signed-in user from
 * the curated bank (ritual_prompts) + their own answers (ritual_responses, read
 * under RLS — own rows only). Blind-reveal of a partner's answer is enforced by
 * the ritual_dyad_reveal() SECURITY DEFINER RPC, never by direct reads here.
 *
 * Cadence (default 3×/week, toggle daily) gates when a NEW question unlocks; a
 * question already in flight is always answerable. Forgiving by design — we
 * never nag or surface a streak penalty here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardDyad } from "./dashboard-dyad";

export type RitualCadence = "daily" | "3x_week";

export type RitualState =
  | "answer" // an unlocked prompt the user hasn't answered yet
  | "waiting" // dyad: user answered, partner hasn't (the curiosity hook for the partner)
  | "reveal" // dyad: both answered — show both + coach hand-off
  | "solo_reflection" // solo: user answered — reflection + invite nudge
  | "resting" // nothing to do right now; next unlocks later
  | "empty"; // no active prompts in the bank

export interface RitualPrompt {
  id: string;
  text: string;
  depth: "light" | "medium" | "deep";
}

export interface RitualView {
  mode: "solo" | "dyad";
  cadence: RitualCadence;
  state: RitualState;
  prompt: RitualPrompt | null;
  myAnswer: string | null;
  partnerAnswer: string | null; // populated only in `reveal`
  partnerName: string;
  /** dyad `answer` state: partner already answered this prompt → "your turn" hook. */
  partnerAnsweredActive: boolean;
  /** Human label for when the next question unlocks (`resting`/`solo_reflection`). */
  nextUnlockLabel: string | null;
  engagementId: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Whether a NEW question is unlocked given the user's most recent answer time.
 * `daily` → not yet answered today; `3x_week` → ≥2 days since last answer
 * (roughly three touches a week, with slack).
 */
function isUnlocked(lastAnsweredAt: Date | null, cadence: RitualCadence): boolean {
  if (!lastAnsweredAt) return true;
  if (cadence === "daily") return utcDate(lastAnsweredAt) < utcDate(new Date());
  return Date.now() - lastAnsweredAt.getTime() >= 2 * DAY_MS;
}

function unlockLabel(cadence: RitualCadence): string {
  return cadence === "daily" ? "Tomorrow" : "In a couple of days";
}

interface RevealResult {
  partner_answered: boolean;
  both_answered: boolean;
  my_answer: string | null;
  partner_answer: string | null;
}

/**
 * Load the user's current ritual view-model. `dyad` is the already-resolved
 * active dyad (null for solo users — who get full value, never gated).
 */
export async function getTodaysRitual(
  supabase: SupabaseClient,
  userId: string,
  dyad: DashboardDyad | null
): Promise<RitualView> {
  const mode: "solo" | "dyad" = dyad ? "dyad" : "solo";
  const partnerName = dyad?.partnerName ?? "your partner";
  const engagementId = dyad?.engagementId ?? null;

  const base: RitualView = {
    mode,
    cadence: "3x_week",
    state: "empty",
    prompt: null,
    myAnswer: null,
    partnerAnswer: null,
    partnerName,
    partnerAnsweredActive: false,
    nextUnlockLabel: null,
    engagementId,
  };

  // Cadence setting (default 3×/week when no row yet).
  const { data: settings } = await supabase
    .from("ritual_settings")
    .select("cadence")
    .eq("user_id", userId)
    .maybeSingle();
  const cadence: RitualCadence = settings?.cadence === "daily" ? "daily" : "3x_week";
  base.cadence = cadence;

  // The active bank, in walk order.
  const { data: prompts } = await supabase
    .from("ritual_prompts")
    .select("id, text, depth, sort_order")
    .eq("program_slug", "relationship")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!prompts || prompts.length === 0) return base;

  // The user's own answers (RLS: own rows only).
  const { data: responses } = await supabase
    .from("ritual_responses")
    .select("prompt_id, answer, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const myByPrompt = new Map<string, { answer: string; created_at: string }>();
  for (const r of responses ?? []) {
    myByPrompt.set(r.prompt_id as string, {
      answer: r.answer as string,
      created_at: r.created_at as string,
    });
  }

  const lastAnsweredAt =
    responses && responses.length > 0 ? new Date(responses[0].created_at as string) : null;
  const unlocked = isUnlocked(lastAnsweredAt, cadence);

  const toPrompt = (p: (typeof prompts)[number]): RitualPrompt => ({
    id: p.id as string,
    text: p.text as string,
    depth: (p.depth as RitualPrompt["depth"]) ?? "light",
  });

  // Next unanswered prompt in walk order, and the most recently answered one
  // (the card focuses on the answerable prompt, else the latest for reveal).
  const nextUnanswered = prompts.find((p) => !myByPrompt.has(p.id as string)) ?? null;
  const lastAnsweredPrompt =
    responses && responses.length > 0
      ? prompts.find((p) => p.id === responses[0].prompt_id) ?? null
      : null;

  const reveal = async (promptId: string): Promise<RevealResult | null> => {
    const { data } = await supabase.rpc("ritual_dyad_reveal", {
      p_engagement_id: engagementId,
      p_prompt_id: promptId,
    });
    return (data as RevealResult | null) ?? null;
  };

  // ── Solo path ────────────────────────────────────────────────────────
  if (mode === "solo") {
    const activePrompt = nextUnanswered && unlocked ? nextUnanswered : null;
    const focal = activePrompt ?? lastAnsweredPrompt;
    if (!focal) {
      base.state = "resting";
      base.nextUnlockLabel = unlockLabel(cadence);
      return base;
    }
    base.prompt = toPrompt(focal);
    base.myAnswer = myByPrompt.get(focal.id as string)?.answer ?? null;
    if (activePrompt) {
      base.state = "answer";
    } else {
      base.state = "solo_reflection";
      base.nextUnlockLabel = unlockLabel(cadence);
    }
    return base;
  }

  // ── Dyad path (blind reveal via RPC) ─────────────────────────────────
  // The active prompt is the next one the user can answer. Cadence paces NEW
  // questions, but a partner who has already answered overrides the pace — that
  // is the curiosity payoff (partner-initiated), not the app nagging.
  let activePrompt = nextUnanswered && unlocked ? nextUnanswered : null;
  let activeReveal: RevealResult | null = null;
  if (!activePrompt && nextUnanswered) {
    const r = await reveal(nextUnanswered.id as string);
    if (r?.partner_answered) {
      activePrompt = nextUnanswered;
      activeReveal = r;
    }
  }

  const focal = activePrompt ?? lastAnsweredPrompt;
  if (!focal) {
    base.state = "resting";
    base.nextUnlockLabel = unlockLabel(cadence);
    return base;
  }
  base.prompt = toPrompt(focal);
  base.myAnswer = myByPrompt.get(focal.id as string)?.answer ?? null;

  if (activePrompt) {
    // User hasn't answered the focal prompt yet.
    const r = activeReveal ?? (await reveal(focal.id as string));
    base.state = "answer";
    base.partnerAnsweredActive = r?.partner_answered ?? false;
    return base;
  }

  // User has answered the focal prompt; reveal once both have, else wait.
  const r = await reveal(focal.id as string);
  if (r?.both_answered) {
    base.state = "reveal";
    base.myAnswer = r.my_answer ?? base.myAnswer;
    base.partnerAnswer = r.partner_answer ?? null;
  } else {
    base.state = "waiting";
    base.nextUnlockLabel = unlockLabel(cadence);
  }
  return base;
}
