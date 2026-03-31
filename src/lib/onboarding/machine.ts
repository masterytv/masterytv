/**
 * Onboarding State Machine — XState v5
 * 
 * Manages the multi-step onboarding flow for new Mastery Coach users.
 * States persist to the `onboarding_state` table via Supabase.
 * 
 * Architecture: SPRINT.md S3.1
 * 
 * Flow:
 * signup → starting_point → research_pending → research_confirm → coaching_letter → channel_connect → complete
 */

import { createMachine, assign } from "xstate";

// ─── TYPES ──────────────────────────────────────────────────────────────

export interface OnboardingContext {
  userId: string;
  // Step 1: Starting Point
  startingPointType: "challenge" | "goal" | "systematic" | null;
  startingPointInput: string;
  linkedinUrl: string;
  websiteUrl: string;
  // Step 2: Research
  researchResults: ResearchResults | null;
  researchError: string | null;
  // Step 3: Confirmed research (user edits)
  confirmedResearch: ResearchResults | null;
  factsStored: number;
  // Step 4: Coaching Letter
  coachingLetter: string | null;
  // Step 5: Channel Connect
  telegramConnected: boolean;
}

export interface ResearchResults {
  company_name: string | null;
  company_description: string | null;
  industry: string | null;
  stage: string | null;
  user_background: string | null;
  user_role: string | null;
  key_people: string[];
  recent_news: string[];
  challenges_detected: string[];
  linkedin_headline: string | null;
  linkedin_summary: string | null;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
}

// ─── EVENTS ─────────────────────────────────────────────────────────────

export type OnboardingEvent =
  | {
      type: "SUBMIT_STARTING_POINT";
      startingPointType: "challenge" | "goal" | "systematic";
      startingPointInput: string;
      linkedinUrl: string;
      websiteUrl: string;
    }
  | { type: "RESEARCH_COMPLETE"; results: ResearchResults }
  | { type: "RESEARCH_FAILED"; error: string }
  | { type: "RETRY_RESEARCH" }
  | { type: "CONFIRM_RESEARCH"; confirmedResults: ResearchResults }
  | { type: "LETTER_GENERATED"; letter: string }
  | { type: "CONNECT_TELEGRAM" }
  | { type: "SKIP_CHANNEL" }
  | { type: "COMPLETE" };

// ─── INITIAL CONTEXT ────────────────────────────────────────────────────

export const initialContext: OnboardingContext = {
  userId: "",
  startingPointType: null,
  startingPointInput: "",
  linkedinUrl: "",
  websiteUrl: "",
  researchResults: null,
  researchError: null,
  confirmedResearch: null,
  factsStored: 0,
  coachingLetter: null,
  telegramConnected: false,
};

// ─── STATE MACHINE ──────────────────────────────────────────────────────

export const onboardingMachine = createMachine({
  id: "onboarding",
  initial: "signup",
  context: initialContext,
  types: {} as {
    context: OnboardingContext;
    events: OnboardingEvent;
  },
  states: {
    // Entry state — user just signed up, hasn't started onboarding yet
    signup: {
      on: {
        SUBMIT_STARTING_POINT: {
          target: "starting_point",
        },
      },
    },

    // Step 1: User selects their starting point type and provides URLs
    starting_point: {
      entry: assign(({ event }) => {
        if (event.type !== "SUBMIT_STARTING_POINT") return {};
        return {
          startingPointType: event.startingPointType,
          startingPointInput: event.startingPointInput,
          linkedinUrl: event.linkedinUrl,
          websiteUrl: event.websiteUrl,
        };
      }),
      always: {
        target: "research_pending",
      },
    },

    // Step 2: Background research is running (Firecrawl + LinkdAPI)
    research_pending: {
      on: {
        RESEARCH_COMPLETE: {
          target: "research_confirm",
          actions: assign({
            researchResults: ({ event }) => event.results,
            researchError: () => null,
          }),
        },
        RESEARCH_FAILED: {
          target: "research_pending",
          actions: assign({
            researchError: ({ event }) => event.error,
          }),
        },
        RETRY_RESEARCH: {
          target: "research_pending",
          actions: assign({
            researchError: () => null,
          }),
        },
      },
    },

    // Step 3: User reviews and confirms/edits research results
    research_confirm: {
      on: {
        CONFIRM_RESEARCH: {
          target: "coaching_letter",
          actions: assign({
            confirmedResearch: ({ event }) => event.confirmedResults,
          }),
        },
      },
    },

    // Step 4: Coaching letter is generated and displayed
    coaching_letter: {
      on: {
        LETTER_GENERATED: {
          actions: assign({
            coachingLetter: ({ event }) => event.letter,
          }),
        },
        SKIP_CHANNEL: {
          target: "complete",
        },
        CONNECT_TELEGRAM: {
          target: "channel_connect",
        },
        COMPLETE: {
          target: "complete",
        },
      },
    },

    // Step 5: Connect additional channels (Telegram, etc.)
    channel_connect: {
      on: {
        CONNECT_TELEGRAM: {
          actions: assign({
            telegramConnected: () => true,
          }),
        },
        COMPLETE: {
          target: "complete",
        },
        SKIP_CHANNEL: {
          target: "complete",
        },
      },
    },

    // Step 6: Onboarding complete — redirect to dashboard
    complete: {
      type: "final",
    },
  },
});

// ─── STEP MAPPING ───────────────────────────────────────────────────────

/** Maps machine state IDs to display step numbers (0-indexed) */
export const STEP_MAP: Record<string, number> = {
  signup: 0,
  starting_point: 1,
  research_pending: 2,
  research_confirm: 3,
  coaching_letter: 4,
  channel_connect: 5,
  complete: 6,
};

/** Labels for the progress bar */
export const STEP_LABELS = [
  "Sign Up",
  "Starting Point",
  "Research",
  "Confirm",
  "Coaching Letter",
  "Connect",
  "Complete",
];
