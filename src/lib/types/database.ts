/**
 * Supabase Database Types — Auto-generated from schema
 * Re-generate with: supabase gen types typescript --project-id lwmadssysqcwbsoiaokc
 *
 * For now, we use lightweight type aliases that match our schema.
 * Full generated types can be regenerated as the schema evolves.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Row types for each table — these match the Supabase-generated Row types.
 * Use these in component props and hooks.
 */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  linkedin_url: string | null;
  website_url: string | null;
  telegram_chat_id: string | null;
  timezone: string;
  preferred_channel: "email" | "telegram" | "web";
  morning_briefing_time: string;
  subscription_tier: "free" | "core" | "premium";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  ai_tools: Json;
  daily_message_count: number;
  daily_message_reset_at: string | null;
  org_id: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachProfileRow {
  id: string;
  user_id: string;
  directness: number;
  framing: number;
  warmth: number;
  autonomy: number;
  pacing: number;
  evidence_style: number;
  accountability: number;
  challenge_level: number;
  source: "default" | "self_reported" | "behavioral" | "blended";
  confidence: number;
  avg_response_time_seconds: number | null;
  avg_message_length: number | null;
  action_completion_rate: number;
  engagement_score: number;
  trust_level: number;
  framework_affinity: Json;
  promotion_focus: number;
  prevention_focus: number;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  user_id: string;
  conversation_id: string;
  channel: "email" | "telegram" | "web";
  role: "user" | "coach" | "system";
  content: string;
  metadata: Json;
  embedding: string | null;
  created_at: string;
}

export interface CommitmentRow {
  id: string;
  user_id: string;
  type: "goal" | "action_item" | "rock" | "habit";
  description: string;
  due_date: string | null;
  status: "active" | "completed" | "missed" | "rescheduled" | "cancelled";
  follow_up_count: number;
  source_message_id: string | null;
  ai_tool_suggestion: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MemoryFactRow {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  content: string;
  importance: number;
  source_message_id: string | null;
  embedding: string | null;
  expires_at: string | null;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkConfigRow {
  id: string;
  name: string;
  tier: number;
  category: string;
  description: string | null;
  when_to_use: string | null;
  system_prompt_template: string | null;
  phases: string[] | null;
  phase_descriptions: Json;
  transition_signals: string | null;
  selection_weight: number;
  requires_trust_level: number;
  requires_consent: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  email: string;
  name: string | null;
  source: string;
  source_detail: string | null;
  status: "lead" | "prospect" | "free_member" | "paid_member" | "premium_member" | "churned";
  lead_score: number;
  converted_user_id: string | null;
  referrer_contact_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ContactListRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OnboardingStateRow {
  user_id: string;
  current_step: string;
  data: Json;
  research_results: Json | null;
  coaching_letter: string | null;
  updated_at: string;
}
