/**
 * Decoded Coach Message Rate Limiting
 *
 * Enforces message limits per decoded tier:
 *   Free:    5/day
 *   Insight: 50/week
 *   Growth:  300/month
 *   Mastery: Unlimited
 *
 * Uses assessment_coach_messages table for counting.
 * Called from the coaching engine before processing a message.
 */

import type { ReportTier } from '@/lib/decoded/report/prompts/types';
import { MESSAGE_LIMITS } from '@/lib/decoded/billing/tiers';
import { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  window: string;
  resetAt?: string;
}

/**
 * Check if a user can send a coach message based on their decoded tier.
 *
 * Why: Each tier has different message quotas.
 * Using DB counts rather than in-memory counters for durability across sessions.
 */
export async function checkMessageRateLimit(
  supabase: SupabaseClient,
  userId: string,
  decodedTier: ReportTier
): Promise<RateLimitResult> {
  const limit = MESSAGE_LIMITS[decodedTier];

  // Mastery = unlimited
  if (limit.count === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity, window: 'unlimited' };
  }

  // Calculate window start
  const now = new Date();
  let windowStart: Date;

  switch (limit.window) {
    case 'day':
      windowStart = new Date(now);
      windowStart.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      windowStart = new Date(now);
      const dayOfWeek = windowStart.getDay();
      windowStart.setDate(windowStart.getDate() - dayOfWeek);
      windowStart.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  // Count messages in current window
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('[rate-limit] Count query failed:', error);
    // Fail open — allow the message but log the error
    return { allowed: true, remaining: limit.count, limit: limit.count, window: limit.window };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, limit.count - used);

  // Calculate reset time
  let resetAt: string;
  switch (limit.window) {
    case 'day': {
      const tomorrow = new Date(windowStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      resetAt = tomorrow.toISOString();
      break;
    }
    case 'week': {
      const nextWeek = new Date(windowStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      resetAt = nextWeek.toISOString();
      break;
    }
    case 'month': {
      const nextMonth = new Date(windowStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      resetAt = nextMonth.toISOString();
      break;
    }
  }

  return {
    allowed: remaining > 0,
    remaining,
    limit: limit.count,
    window: `${limit.count}/${limit.window}`,
    resetAt,
  };
}
