"use client";

import { useUser } from "@/hooks/useUser";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Check } from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const CHANNELS = [
  { value: "email", label: "Email", emoji: "📧" },
  { value: "telegram", label: "Telegram", emoji: "✈️" },
  { value: "web", label: "Web Chat", emoji: "💬" },
] as const;

export default function SettingsPage() {
  const { user, loading, updateUser } = useUser();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local form state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [preferredChannel, setPreferredChannel] = useState<string>("email");
  const [briefingTime, setBriefingTime] = useState("08:00");

  // Sync form state with user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone);
      setPreferredChannel(user.preferred_channel);
      setBriefingTime(user.morning_briefing_time);
    }
  }, [user]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const { error } = await updateUser({
      name,
      timezone,
      preferred_channel: preferredChannel as "email" | "telegram" | "web",
      morning_briefing_time: briefingTime,
    });

    setSaving(false);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your profile and coaching preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="glass rounded-xl p-6">
          <h2 className="mb-4 text-lg font-medium text-text-primary">
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-md rounded-lg border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Email
              </label>
              <p className="text-sm text-text-muted">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Coaching Preferences */}
        <section className="glass rounded-xl p-6">
          <h2 className="mb-4 text-lg font-medium text-text-primary">
            Coaching Preferences
          </h2>
          <div className="space-y-5">
            <div>
              <label
                htmlFor="timezone"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full max-w-md rounded-lg border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-secondary">
                Preferred Coaching Channel
              </label>
              <div className="flex flex-wrap gap-3">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => setPreferredChannel(ch.value)}
                    className={`
                      flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all
                      ${
                        preferredChannel === ch.value
                          ? "border-brand-500 bg-brand-500/10 text-brand-400"
                          : "border-surface-300 bg-surface-50 text-text-secondary hover:border-surface-200"
                      }
                    `}
                  >
                    <span>{ch.emoji}</span>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="briefing-time"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Morning Briefing Time
              </label>
              <input
                id="briefing-time"
                type="time"
                value={briefingTime}
                onChange={(e) => setBriefingTime(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              />
              <p className="mt-1 text-xs text-text-muted">
                When you&apos;d like to receive your daily coaching briefing
              </p>
            </div>
          </div>
        </section>

        {/* Save button */}
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </motion.button>
      </div>
    </div>
    </div>
  );
}
