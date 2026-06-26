"use server";

/**
 * Daily connection ritual — server actions (RELATTI_EXPERIENCE.md §5.9).
 *
 * Thin wrappers over the ritual_submit_response / ritual_settings primitives,
 * run under the user's authed client. The blind-reveal gate and the shared
 * streak write live in the SECURITY DEFINER RPC; cadence is a plain RLS-scoped
 * upsert on the user's own row.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RitualCadence } from "./ritual";

export interface RitualActionResult {
  ok: boolean;
  error?: string;
}

/** Submit the user's answer to a prompt (+ feed the dyad streak when in a dyad). */
export async function submitRitualResponse(
  promptId: string,
  answer: string,
  engagementId: string | null
): Promise<RitualActionResult> {
  const trimmed = answer.trim();
  if (!trimmed) return { ok: false, error: "Write a short answer first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase.rpc("ritual_submit_response", {
    p_prompt_id: promptId,
    p_answer: trimmed,
    p_engagement_id: engagementId,
  });

  if (error) {
    console.error("[ritual] submit error:", error.message);
    return { ok: false, error: "Couldn't save your answer. Please try again." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Switch the user's cadence between 3×/week (default) and daily. */
export async function setRitualCadence(cadence: RitualCadence): Promise<RitualActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("ritual_settings")
    .upsert(
      { user_id: user.id, cadence, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[ritual] cadence error:", error.message);
    return { ok: false, error: "Couldn't update your cadence." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
