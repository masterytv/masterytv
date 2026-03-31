"use client";

/**
 * useOnboarding Hook — XState + Supabase Persistence
 * 
 * Wraps the XState onboarding machine with:
 * 1. Rehydration from onboarding_state table on mount
 * 2. Persistence on every state transition
 * 3. Edge Function calls for research + coaching letter
 * 
 * Architecture: SPRINT.md S3.1
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  onboardingMachine,
  initialContext,
  STEP_MAP,
  type OnboardingContext,
  type OnboardingEvent,
  type ResearchResults,
} from "@/lib/onboarding/machine";
import { createActor } from "xstate";

// ─── TYPES ──────────────────────────────────────────────────────────────

interface UseOnboardingReturn {
  /** Current step name (e.g. "starting_point", "research_pending") */
  currentStep: string;
  /** Numeric step index for progress bar */
  stepIndex: number;
  /** Full context (user inputs, research, letter) */
  context: OnboardingContext;
  /** Whether we're still loading from the DB */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Send an event to the state machine */
  send: (event: OnboardingEvent) => void;
  /** Submit starting point and trigger research */
  submitStartingPoint: (data: {
    type: "challenge" | "goal" | "systematic";
    input: string;
    linkedinUrl: string;
    websiteUrl: string;
  }) => Promise<void>;
  /** Confirm research and trigger coaching letter generation */
  confirmResearch: (edited: ResearchResults) => Promise<void>;
  /** Complete onboarding */
  completeOnboarding: () => void;
}

// ─── HOOK ───────────────────────────────────────────────────────────────

export function useOnboarding(): UseOnboardingReturn {
  const [currentStep, setCurrentStep] = useState("signup");
  const [stepIndex, setStepIndex] = useState(0);
  const [context, setContext] = useState<OnboardingContext>(initialContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const actorRef = useRef<ReturnType<typeof createActor<typeof onboardingMachine>> | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Initialize: rehydrate from DB ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Load saved onboarding state
        const { data: saved } = await supabase
          .from("onboarding_state")
          .select("current_step, data, research_results, coaching_letter")
          .eq("user_id", user.id)
          .single();

        // Determine initial state
        const initialState = saved?.current_step || "signup";
        const savedData = (saved?.data || {}) as Partial<OnboardingContext>;

        // Create actor fresh — we'll manually manage state
        const restoredContext: OnboardingContext = {
          ...initialContext,
          ...savedData,
          userId: user.id,
          researchResults: saved?.research_results || null,
          coachingLetter: saved?.coaching_letter || null,
        };

        const actor = createActor(onboardingMachine, {
          input: restoredContext,
        });

        actor.subscribe((snapshot) => {
          if (cancelled) return;
          const stateValue =
            typeof snapshot.value === "string"
              ? snapshot.value
              : Object.keys(snapshot.value)[0];
          setCurrentStep(stateValue);
          setStepIndex(STEP_MAP[stateValue] ?? 0);
          setContext(snapshot.context);
        });

        actor.start();
        actorRef.current = actor;

        // Set initial values
        const snap = actor.getSnapshot();
        const stateValue =
          typeof snap.value === "string"
            ? snap.value
            : Object.keys(snap.value)[0];
        setCurrentStep(stateValue);
        setStepIndex(STEP_MAP[stateValue] ?? 0);
        setContext(snap.context);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      actorRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist state to DB on every transition ──
  const persistState = useCallback(
    async (
      step: string,
      ctx: OnboardingContext,
      extras?: { research_results?: unknown; coaching_letter?: string }
    ) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Serialize context (strip non-serializable parts)
        const { userId: _uid, researchResults: _rr, coachingLetter: _cl, ...serializableCtx } = ctx;

        await supabase.from("onboarding_state").upsert(
          {
            user_id: user.id,
            current_step: step,
            data: serializableCtx,
            ...(extras?.research_results !== undefined && {
              research_results: extras.research_results,
            }),
            ...(extras?.coaching_letter !== undefined && {
              coaching_letter: extras.coaching_letter,
            }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch (e) {
        console.error("[useOnboarding] Failed to persist:", (e as Error).message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Actions ──

  const send = useCallback(
    (event: OnboardingEvent) => {
      actorRef.current?.send(event);
      // Persist after transition
      const snap = actorRef.current?.getSnapshot();
      if (snap) {
        const stateValue =
          typeof snap.value === "string"
            ? snap.value
            : Object.keys(snap.value)[0];
        persistState(stateValue, snap.context);
      }
    },
    [persistState]
  );

  const submitStartingPoint = useCallback(
    async (data: {
      type: "challenge" | "goal" | "systematic";
      input: string;
      linkedinUrl: string;
      websiteUrl: string;
    }) => {
      // Transition to starting_point → research_pending
      send({
        type: "SUBMIT_STARTING_POINT",
        startingPointType: data.type,
        startingPointInput: data.input,
        linkedinUrl: data.linkedinUrl,
        websiteUrl: data.websiteUrl,
      });

      // Persist with URLs
      const snap = actorRef.current?.getSnapshot();
      if (snap) {
        await persistState("research_pending", snap.context);

        // Also save LinkedIn + website to user record
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("users")
            .update({
              linkedin_url: data.linkedinUrl || null,
              website_url: data.websiteUrl || null,
            })
            .eq("id", user.id);
        }
      }

      // Trigger background research edge function
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-research`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              linkedin_url: data.linkedinUrl,
              website_url: data.websiteUrl,
              starting_point_type: data.type,
              starting_point_input: data.input,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          send({ type: "RESEARCH_FAILED", error: err.message || "Research failed" });
          return;
        }

        const results = await res.json();
        send({ type: "RESEARCH_COMPLETE", results: results as ResearchResults });

        // Persist research results
        const snap2 = actorRef.current?.getSnapshot();
        if (snap2) {
          await persistState("research_confirm", snap2.context, {
            research_results: results,
          });
        }
      } catch (e) {
        send({ type: "RESEARCH_FAILED", error: (e as Error).message });
      }
    },
    [send, persistState, supabase]
  );

  const confirmResearch = useCallback(
    async (edited: ResearchResults) => {
      send({ type: "CONFIRM_RESEARCH", confirmedResults: edited });

      // Call confirm endpoint
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-confirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ confirmed_research: edited }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          setContext((prev) => ({ ...prev, factsStored: data.facts_stored || 0 }));
        }
      } catch (e) {
        console.error("[useOnboarding] Confirm error:", (e as Error).message);
      }

      // Trigger coaching letter generation
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const snap = actorRef.current?.getSnapshot();

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-letter`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              starting_point: snap?.context.startingPointType,
              user_input: snap?.context.startingPointInput,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          send({ type: "LETTER_GENERATED", letter: data.letter });

          const snap2 = actorRef.current?.getSnapshot();
          if (snap2) {
            await persistState("coaching_letter", snap2.context, {
              coaching_letter: data.letter,
            });
          }
        }
      } catch (e) {
        console.error("[useOnboarding] Letter error:", (e as Error).message);
      }
    },
    [send, persistState, supabase]
  );

  const completeOnboarding = useCallback(() => {
    send({ type: "COMPLETE" });
    persistState("complete", context);
  }, [send, persistState, context]);

  return {
    currentStep,
    stepIndex,
    context,
    loading,
    error,
    send,
    submitStartingPoint,
    confirmResearch,
    completeOnboarding,
  };
}
