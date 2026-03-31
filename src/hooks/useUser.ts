"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  timezone: string;
  preferred_channel: "email" | "telegram" | "web";
  morning_briefing_time: string;
  subscription_tier: "free" | "core" | "premium";
  telegram_chat_id: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

/**
 * Hook to fetch and manage the current user's profile from the users table.
 * Returns the user profile, loading state, and update function.
 */
export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, email, name, timezone, preferred_channel, morning_briefing_time, subscription_tier, telegram_chat_id, linkedin_url, website_url"
        )
        .eq("id", authUser.id)
        .single();

      if (!error && data) {
        setUser(data as UserProfile);
      }
      setLoading(false);
    }

    fetchUser();
  }, [supabase]);

  const updateUser = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) return { error: "No user" };

      const { error } = await supabase
        .from("users")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (!error) {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
      }

      return { error: error?.message ?? null };
    },
    [user, supabase]
  );

  return { user, loading, updateUser };
}
