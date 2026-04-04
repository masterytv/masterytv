"use client";

import { useUser } from "@/hooks/useUser";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Save,
  Loader2,
  Check,
  Crown,
  Zap,
  CreditCard,
  ExternalLink,
  Star,
  Shield,
  X,
  Flag,
  Mail,
  Send,
  MessageSquare,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useCallback } from "react";

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
  { value: "email", label: "Email", icon: Mail },
  { value: "telegram", label: "Telegram", icon: Send },
  { value: "web", label: "Web Chat", icon: MessageSquare },
] as const;

// ─── TIER CONFIG ──────────────────────────────────────────────────────────
const TIERS = {
  free: {
    name: "Free",
    icon: Zap,
    color: "text-text-secondary",
    bg: "bg-surface-100",
    border: "border-surface-300",
    badge: "bg-surface-200 text-text-secondary",
    description: "5 messages per day",
  },
  core: {
    name: "Core",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-400",
    description: "Unlimited coaching",
  },
  premium: {
    name: "Premium",
    icon: Star,
    color: "text-violet-400",
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    badge: "bg-violet-500/10 text-violet-400",
    description: "White-glove coaching",
  },
} as const;

const CORE_FEATURES = [
  "Unlimited AI coaching messages",
  "Morning briefings & accountability",
  "Weekly coaching sessions",
  "Real-time factual grounding",
  "Email, Telegram & web channels",
  "Monthly progress reviews",
];

// ─── COACH PROFILE DIMENSION CONFIG ───────────────────────────────────

interface CoachProfile {
  id: string;
  directness: number;
  framing: number;
  warmth: number;
  autonomy: number;
  pacing: number;
  evidence_style: number;
  accountability: number;
  challenge_level: number;
  source: string;
  confidence: number;
  framework_affinity: Record<string, unknown> | null;
  promotion_focus: number;
  prevention_focus: number;
}

const DIMENSION_CONFIG = {
  autonomy: { name: "Autonomy", low: "Guided", high: "Self-directed" },
  challenge_level: { name: "Challenge", low: "Supportive", high: "Provocative" },
  directness: { name: "Directness", low: "Diplomatic", high: "Blunt" },
  framing: { name: "Framing", low: "Problem-focused", high: "Solution-focused" },
  warmth: { name: "Warmth", low: "Professional", high: "Personal" },
  pacing: { name: "Pacing", low: "Methodical", high: "Rapid-fire" },
  evidence_style: { name: "Evidence", low: "Intuitive", high: "Data-driven" },
  accountability: { name: "Accountability", low: "Flexible", high: "Rigorous" },
} as const;

const INTERVENTION_DIMENSIONS = ["autonomy", "challenge_level"] as const;
const DELIVERY_DIMENSIONS = ["directness", "framing", "warmth", "pacing", "evidence_style", "accountability"] as const;

function SettingsContent() {
  const { user, loading, updateUser } = useUser();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  // Data management state (TD-006)
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Coach profile state
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [flaggedDimensions, setFlaggedDimensions] = useState<Record<string, string>>({});

  // Toast state for checkout callbacks
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Local form state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [preferredChannel, setPreferredChannel] = useState<string>("email");
  const [briefingTime, setBriefingTime] = useState("08:00");

  // Fetch coach profile
  const fetchCoachProfile = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("coach_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setCoachProfile(data as CoachProfile);
      // Restore flagged dimensions from framework_affinity JSONB
      const affinity = data.framework_affinity as Record<string, unknown> | null;
      if (affinity?.flagged_dimensions) {
        setFlaggedDimensions(affinity.flagged_dimensions as Record<string, string>);
      }
    }
  }, [user]);

  // Sync form state with user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone);
      setPreferredChannel(user.preferred_channel);
      setBriefingTime(user.morning_briefing_time);
      fetchCoachProfile();
    }
  }, [user, fetchCoachProfile]);

  // Handle checkout callback query params
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setToast({
        type: "success",
        message:
          "Welcome to Mastery Coach Core! Your unlimited coaching is now active.",
      });
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (checkout === "cancelled") {
      setToast({
        type: "info",
        message: "Checkout cancelled. You can upgrade anytime.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  async function handleUpgrade() {
    if (!user) return;
    setUpgrading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setToast({ type: "error", message: "Please sign in to upgrade." });
        setUpgrading(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tier: "core",
            interval: billingInterval,
          }),
        }
      );

      const data = await response.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setToast({
          type: "error",
          message: data.message || "Failed to create checkout session.",
        });
        setUpgrading(false);
      }
    } catch {
      setToast({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    if (!user?.stripe_customer_id) return;

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      // Call a simple portal session creator
      // For now, link directly to Stripe customer portal
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "portal" }),
        }
      );

      const data = await response.json();
      if (data.portal_url) {
        window.open(data.portal_url, "_blank");
      }
    } catch {
      setToast({
        type: "error",
        message: "Could not open billing portal.",
      });
    }
  }

  // ── TD-006: Export User Data ──
  async function handleExport() {
    if (!user) return;
    setExporting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setToast({ type: "error", message: "Please sign in to export data." });
        setExporting(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-user-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        setToast({ type: "error", message: err.message || "Failed to export data." });
        setExporting(false);
        return;
      }

      // Trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mastery-coach-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ type: "success", message: "Your data has been exported successfully." });
    } catch {
      setToast({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setExporting(false);
    }
  }

  // ── TD-006: Delete All User Data ──
  async function handleDeleteAccount() {
    if (!user || deleteConfirmText !== "DELETE") return;
    setDeleting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setToast({ type: "error", message: "Please sign in to delete data." });
        setDeleting(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ confirm: true }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        setToast({ type: "error", message: err.message || "Failed to delete data." });
        setDeleting(false);
        return;
      }

      // Sign out and redirect to landing
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setToast({ type: "error", message: "Something went wrong. Please try again." });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const tier = user?.subscription_tier ?? "free";
  const tierConfig = TIERS[tier as keyof typeof TIERS] ?? TIERS.free;
  const TierIcon = tierConfig.icon;
  const isPaid = tier === "core" || tier === "premium";

  return (
    <div className="overflow-y-auto h-full">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-6 flex items-center justify-between rounded-xl px-5 py-3.5 text-sm font-medium ${
                toast.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : toast.type === "error"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-brand-500/10 text-brand-400 border border-brand-500/20"
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-4 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your profile, coaching preferences, and subscription
          </p>
        </div>

        <div className="space-y-8">
          {/* ─── SUBSCRIPTION SECTION ─────────────────────────────────── */}
          <section
            id="subscription-section"
            className={`rounded-xl p-6 border ${tierConfig.border} ${tierConfig.bg} relative overflow-hidden`}
          >
            {/* Subtle gradient accent for paid tiers */}
            {isPaid && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 ${
                    tier === "premium"
                      ? "bg-violet-500"
                      : "bg-amber-500"
                  }`}
                />
              </div>
            )}

            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${tierConfig.badge}`}
                  >
                    <TierIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-text-primary">
                      {tierConfig.name} Plan
                    </h2>
                    <p className="text-sm text-text-secondary">
                      {tierConfig.description}
                    </p>
                  </div>
                </div>

                {/* Tier badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tierConfig.badge}`}
                >
                  <TierIcon className="h-3.5 w-3.5" />
                  {tierConfig.name}
                </span>
              </div>

              {/* Free tier → Upgrade CTA */}
              {!isPaid && (
                <div className="mt-4">
                  <div className="mb-5 rounded-lg bg-surface-50 border border-surface-200 p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">
                      Upgrade to Core — Unlimited Coaching
                    </h3>
                    <ul className="space-y-2 mb-5">
                      {CORE_FEATURES.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2.5 text-sm text-text-secondary"
                        >
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Billing toggle */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="inline-flex rounded-lg bg-surface-100 p-0.5 border border-surface-200">
                        <button
                          onClick={() => setBillingInterval("monthly")}
                          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                            billingInterval === "monthly"
                              ? "bg-surface-0 text-text-primary shadow-sm"
                              : "text-text-muted hover:text-text-secondary"
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          onClick={() => setBillingInterval("yearly")}
                          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                            billingInterval === "yearly"
                              ? "bg-surface-0 text-text-primary shadow-sm"
                              : "text-text-muted hover:text-text-secondary"
                          }`}
                        >
                          Yearly
                          <span className="ml-1.5 text-xs text-emerald-400 font-semibold">
                            Save 17%
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-5">
                      <span className="text-3xl font-bold text-text-primary">
                        ${billingInterval === "monthly" ? "99" : "990"}
                      </span>
                      <span className="text-sm text-text-muted">
                        /{billingInterval === "monthly" ? "month" : "year"}
                      </span>
                      {billingInterval === "yearly" && (
                        <span className="text-xs text-text-muted ml-1">
                          ($82.50/mo)
                        </span>
                      )}
                    </div>

                    {/* Upgrade button */}
                    <motion.button
                      id="upgrade-button"
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      whileTap={{ scale: 0.98 }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20"
                    >
                      {upgrading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      {upgrading ? "Redirecting to checkout..." : "Upgrade to Core"}
                    </motion.button>

                    <p className="mt-3 text-center text-xs text-text-muted flex items-center justify-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Secure checkout via Stripe. Cancel anytime.
                    </p>
                  </div>

                  {/* Usage indicator for free tier */}
                  {user && (
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      <CreditCard className="h-4 w-4" />
                      <span>
                        {user.daily_message_count ?? 0}/5 free messages used today
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Paid tier → Manage subscription */}
              {isPaid && (
                <div className="mt-2 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Unlimited coaching messages active</span>
                  </div>

                  <button
                    id="manage-billing-button"
                    onClick={handleManageBilling}
                    className="flex items-center gap-2 rounded-lg border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-surface-200 transition-all"
                  >
                    <CreditCard className="h-4 w-4" />
                    Manage Subscription
                    <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-50" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ─── PROFILE SECTION ─────────────────────────────────────── */}
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

          {/* ─── COACHING PREFERENCES ────────────────────────────────── */}
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
                      <ch.icon size={16} strokeWidth={2} />
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

          {/* ─── Coach Profile (S6.4) ─── */}
          {coachProfile && (
            <section className="rounded-xl border border-surface-300/50 bg-surface-50 p-6">
              <h2 className="mb-1 text-lg font-semibold text-text-primary font-display">
                Your Coach Profile
              </h2>
              <p className="text-sm text-text-muted mb-6">
                How your coach adapts its style based on your interactions.
              </p>

              {/* Intervention Biases */}
              <div className="cp-group">
                <div className="cp-group__label">Intervention Biases</div>
                <div className="cp-dimensions">
                  {INTERVENTION_DIMENSIONS.map((key) => {
                    const dim = DIMENSION_CONFIG[key];
                    const value = coachProfile[key as keyof CoachProfile] as number;
                    const isFlagged = !!flaggedDimensions[key];
                    return (
                      <div key={key} className="cp-dimension">
                        <span className="cp-dimension__name">{dim.name}</span>
                        <div className="cp-dimension__bar-wrap">
                          <div className="cp-dimension__bar">
                            <div
                              className="cp-dimension__fill"
                              style={{ width: `${Math.round(value * 100)}%` }}
                            />
                          </div>
                          <div className="cp-dimension__range">
                            <span className="cp-dimension__range-label">{dim.low}</span>
                            <span className="cp-dimension__range-label">{dim.high}</span>
                          </div>
                        </div>
                        <button
                          className={`cp-flag-btn ${isFlagged ? "cp-flag-btn--flagged" : ""}`}
                          onClick={async () => {
                            const supabase = createClient();
                            const newFlags = { ...flaggedDimensions };
                            if (isFlagged) {
                              delete newFlags[key];
                            } else {
                              newFlags[key] = new Date().toISOString().split("T")[0];
                            }
                            setFlaggedDimensions(newFlags);
                            await supabase
                              .from("coach_profiles")
                              .update({
                                framework_affinity: {
                                  ...(coachProfile.framework_affinity || {}),
                                  flagged_dimensions: newFlags,
                                },
                              })
                              .eq("user_id", user!.id);
                          }}
                          title={isFlagged ? "Flagged for recalibration" : "Flag if this doesn't feel right"}
                        >
                          <Flag size={10} />
                          {isFlagged ? "Flagged" : "Flag"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Style */}
              <div className="cp-group">
                <div className="cp-group__label">Delivery Style</div>
                <div className="cp-dimensions">
                  {DELIVERY_DIMENSIONS.map((key) => {
                    const dim = DIMENSION_CONFIG[key];
                    const value = coachProfile[key as keyof CoachProfile] as number;
                    const isFlagged = !!flaggedDimensions[key];
                    return (
                      <div key={key} className="cp-dimension">
                        <span className="cp-dimension__name">{dim.name}</span>
                        <div className="cp-dimension__bar-wrap">
                          <div className="cp-dimension__bar">
                            <div
                              className="cp-dimension__fill"
                              style={{ width: `${Math.round(value * 100)}%` }}
                            />
                          </div>
                          <div className="cp-dimension__range">
                            <span className="cp-dimension__range-label">{dim.low}</span>
                            <span className="cp-dimension__range-label">{dim.high}</span>
                          </div>
                        </div>
                        <button
                          className={`cp-flag-btn ${isFlagged ? "cp-flag-btn--flagged" : ""}`}
                          onClick={async () => {
                            const supabase = createClient();
                            const newFlags = { ...flaggedDimensions };
                            if (isFlagged) {
                              delete newFlags[key];
                            } else {
                              newFlags[key] = new Date().toISOString().split("T")[0];
                            }
                            setFlaggedDimensions(newFlags);
                            await supabase
                              .from("coach_profiles")
                              .update({
                                framework_affinity: {
                                  ...(coachProfile.framework_affinity || {}),
                                  flagged_dimensions: newFlags,
                                },
                              })
                              .eq("user_id", user!.id);
                          }}
                          title={isFlagged ? "Flagged for recalibration" : "Flag if this doesn't feel right"}
                        >
                          <Flag size={10} />
                          {isFlagged ? "Flagged" : "Flag"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confidence indicator */}
              <div className="cp-confidence">
                <span className="cp-confidence__dot" />
                Based on {coachProfile.source || "self-reported"} data · {Math.round(coachProfile.confidence * 100)}% confidence
              </div>
            </section>
          )}

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

          {/* ─── TD-006: DATA MANAGEMENT ─── */}
          <section className="mt-10 rounded-xl border border-surface-300 bg-surface-50 p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Your Data</h2>
            <p className="text-sm text-text-secondary mb-6">
              You own your data. Export, view, or permanently delete everything at any time.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
              {/* Export */}
              <motion.button
                onClick={handleExport}
                disabled={exporting}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 rounded-lg border border-surface-300 bg-surface-100 px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-200 disabled:opacity-50 transition-colors"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exporting ? "Exporting..." : "Export My Data"}
              </motion.button>

              {/* Delete Account */}
              <motion.button
                onClick={() => setShowDeleteModal(true)}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete All My Data
              </motion.button>
            </div>
          </section>
        </div>
      </div>

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red-500/20 bg-surface-50 p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Delete all your data?</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    This will permanently delete your entire coaching history, including:
                  </p>
                </div>
              </div>

              <ul className="ml-14 mb-6 space-y-1 text-sm text-text-secondary">
                <li>• All messages and conversation history</li>
                <li>• Memory facts and knowledge graph</li>
                <li>• Coach profile and personalization</li>
                <li>• Commitments and progress tracking</li>
                <li>• Your account and login credentials</li>
              </ul>

              <div className="ml-14 mb-6">
                <p className="text-sm font-medium text-text-primary mb-2">
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  disabled={deleting}
                  className="w-full rounded-lg border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50"
                />
              </div>

              <div className="ml-14 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-surface-300 bg-surface-100 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== "DELETE"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleting ? "Deleting..." : "Delete Everything"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
