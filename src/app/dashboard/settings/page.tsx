"use client";

import { useUser } from "@/hooks/useUser";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { DECODED_TIERS, MESSAGE_LIMITS, isUpgrade } from "@/lib/decoded/billing/tiers";
import type { ReportTier } from "@/lib/decoded/report/prompts/types";
import {
  Save,
  Loader2,
  Check,
  Zap,
  CreditCard,
  ExternalLink,
  Shield,
  X,
  Flag,
  Mail,
  Send,
  MessageSquare,
  Download,
  Trash2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

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

// ─── TIER ORDER (for display & comparison) ────────────────────────────────
const TIER_ORDER: ReportTier[] = ["free", "insight", "growth", "mastery"];

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
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

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
          "Your upgrade is now active. Welcome to your new plan!",
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

  async function handleUpgrade(targetTier: ReportTier) {
    if (!user) return;
    setUpgradingTier(targetTier);

    try {
      const response = await fetch("/api/decoded/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier, interval: "annual" }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setToast({
          type: "error",
          message: data.error || "Failed to create checkout session.",
        });
        setUpgradingTier(null);
      }
    } catch {
      setToast({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
      setUpgradingTier(null);
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

  const currentTier = (user?.subscription_tier ?? "free") as ReportTier;
  const currentTierInfo = DECODED_TIERS.find(t => t.id === currentTier) ?? DECODED_TIERS[0];
  const isPaid = currentTier !== "free";
  const messageLimit = MESSAGE_LIMITS[currentTier];

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
                    : "bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]"
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
          <section id="subscription-section">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-medium text-text-primary">
                  Your Plan
                </h2>
                <p className="text-sm text-text-secondary">
                  You&apos;re on the <strong>{currentTierInfo.name}</strong> plan
                  {messageLimit.count === Infinity
                    ? " — unlimited coaching messages"
                    : ` — ${messageLimit.label} coaching messages`}
                </p>
              </div>

              {/* Manage billing for paid users */}
              {isPaid && (
                <button
                  id="manage-billing-button"
                  onClick={handleManageBilling}
                  className="flex items-center gap-2 rounded-lg bg-surface-100 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-200 transition-all"
                >
                  <CreditCard className="h-4 w-4" />
                  Manage Billing
                  <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-50" />
                </button>
              )}
            </div>

            {/* 4-tier comparison grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DECODED_TIERS.map((tierInfo) => {
                const isCurrent = tierInfo.id === currentTier;
                const canUpgrade = isUpgrade(currentTier, tierInfo.id);
                const isRecommended = tierInfo.recommended && canUpgrade;

                return (
                  <div
                    key={tierInfo.id}
                    className={`
                      relative rounded-xl p-5 transition-all
                      ${isCurrent
                        ? "bg-[rgba(96,99,238,0.08)] ring-1 ring-[rgba(96,99,238,0.3)]"
                        : isRecommended
                          ? "bg-surface-100 ring-1 ring-[rgba(96,99,238,0.2)]"
                          : "bg-surface-100"
                      }
                    `}
                  >
                    {/* Current / Recommended badge */}
                    {isCurrent && (
                      <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[rgba(96,99,238,0.15)] text-[#a3a6ff]">
                        Current Plan
                      </div>
                    )}
                    {isRecommended && !isCurrent && (
                      <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#6063ee] text-white">
                        Recommended
                      </div>
                    )}

                    {/* Tier name */}
                    <h3 className="text-base font-semibold text-text-primary mt-1">
                      {tierInfo.name}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mt-2 mb-1">
                      <span className="text-2xl font-bold text-text-primary">
                        {tierInfo.price}
                      </span>
                      {tierInfo.priceSubtext && (
                        <span className="text-xs text-text-muted">
                          {tierInfo.priceSubtext}
                        </span>
                      )}
                    </div>

                    {/* Tagline */}
                    <p className="text-xs text-text-muted mb-4">
                      {tierInfo.tagline}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2 mb-5">
                      {tierInfo.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-xs text-text-secondary"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {canUpgrade ? (
                      <motion.button
                        id={`upgrade-${tierInfo.id}`}
                        onClick={() => handleUpgrade(tierInfo.id)}
                        disabled={upgradingTier !== null}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50
                          ${isRecommended
                            ? "bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] text-white shadow-lg shadow-[rgba(96,99,238,0.2)]"
                            : "bg-surface-200 text-text-primary hover:bg-surface-300"
                          }
                        `}
                      >
                        {upgradingTier === tierInfo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        {upgradingTier === tierInfo.id
                          ? "Processing..."
                          : `Upgrade to ${tierInfo.name}`}
                      </motion.button>
                    ) : isCurrent ? (
                      <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-[rgba(96,99,238,0.1)] px-4 py-2.5 text-sm font-medium text-[#a3a6ff]">
                        <Check className="h-4 w-4" />
                        Active
                      </div>
                    ) : (
                      /* Lower tier than current — no action needed */
                      <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-200/50 px-4 py-2.5 text-sm font-medium text-text-muted">
                        <Check className="h-4 w-4" />
                        Included
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-text-muted flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Secure checkout via Stripe. Cancel anytime.
            </p>
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
                  className="w-full max-w-md rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
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
                  className="w-full max-w-md rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
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
                        flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all
                        ${
                          preferredChannel === ch.value
                            ? "bg-[rgba(96,99,238,0.1)] text-[#a3a6ff] ring-1 ring-[rgba(96,99,238,0.2)]"
                            : "bg-surface-100 text-text-secondary hover:bg-surface-200"
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
                  className="w-full max-w-xs rounded-lg bg-surface-100 px-4 py-2.5 text-sm text-text-primary focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-[rgba(96,99,238,0.2)] transition-all"
                />
                <p className="mt-1 text-xs text-text-muted">
                  When you&apos;d like to receive your daily coaching briefing
                </p>
              </div>
            </div>
          </section>

          {/* ─── Coach Profile (S6.4) ─── */}
          {coachProfile && (
            <section className="rounded-xl bg-surface-100 p-6">
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
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
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
