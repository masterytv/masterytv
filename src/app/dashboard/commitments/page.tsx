"use client";

/**
 * Commitment Tracker — S6.1
 *
 * Displays commitments grouped by status: Active, Completed, Missed
 * Users can mark complete or reschedule with a date picker.
 * Completion rate stat chip at top.
 *
 * Architecture: SPRINT.md S6.1
 * Tokens: dashboard.css (cm-* BEM classes)
 */

import { useUser } from "@/hooks/useUser";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveBrandClient } from "@/hooks/useBrand";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Calendar,
  MessageSquare,
  RotateCcw,
  Check,
  Target,
  CheckCircle,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

interface Commitment {
  id: string;
  type: string;
  description: string;
  due_date: string | null;
  status: string;
  follow_up_count: number;
  source_message_id: string | null;
  created_at: string;
  completed_at: string | null;
  context_note: string | null;
}

type TabStatus = "active" | "completed" | "missed";

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86_400_000);

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

// ─── Page Component ──────────────────────────────────────────────────────

export default function CommitmentsPage() {
  const { user, loading: userLoading } = useUser();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("active");
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const supabase = createClient();

  // Fetch commitments
  const fetchCommitments = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("user_id", user.id)
      // Program-scoped (2026-07-20): the money dashboard was listing the
      // executive coach's commitments. Each vertical sees only its own.
      .eq("program", resolveBrandClient().programSlug)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCommitments(data as Commitment[]);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (user) fetchCommitments();
  }, [user, fetchCommitments]);

  // Mark complete
  async function handleComplete(id: string) {
    const { error } = await supabase
      .from("commitments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      setCommitments((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "completed", completed_at: new Date().toISOString() }
            : c
        )
      );
    }
  }

  // Reschedule
  async function handleReschedule(id: string) {
    if (!rescheduleDate) return;

    const { error } = await supabase
      .from("commitments")
      .update({
        due_date: new Date(rescheduleDate).toISOString(),
        status: "active",
      })
      .eq("id", id);

    if (!error) {
      setCommitments((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, due_date: new Date(rescheduleDate).toISOString(), status: "active" }
            : c
        )
      );
      setReschedulingId(null);
      setRescheduleDate("");
    }
  }

  // Filter + stats
  const active = commitments.filter(
    (c) => c.status === "active" || c.status === "rescheduled"
  );
  const completed = commitments.filter((c) => c.status === "completed");
  const missed = commitments.filter((c) => c.status === "missed");

  const totalResolvable = completed.length + missed.length;
  const completionRate =
    totalResolvable > 0
      ? Math.round((completed.length / totalResolvable) * 100)
      : null;

  const filtered =
    activeTab === "active"
      ? active
      : activeTab === "completed"
        ? completed
        : missed;

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="db-page">
        <div className="db-empty">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-hint)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="db-page">
      <div className="db-page__inner">
        {/* Header */}
        <div className="db-header">
          <div className="db-header__row">
            <div>
              <h1 className="db-header__title">Commitments</h1>
              <p className="db-header__subtitle">
                Track the actions you&apos;ve committed to in coaching sessions
              </p>
            </div>

            {completionRate !== null && (
              <div className="db-stat-chip">
                <span className="db-stat-chip__label">Completion Rate</span>
                <span className={`db-stat-chip__value ${completionRate >= 50 ? "db-stat-chip__value--success" : ""}`}>
                  {completionRate}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Card */}
        <div className="db-section">
          {/* Tabs */}
          <div className="db-tabs">
            {(["active", "completed", "missed"] as TabStatus[]).map((tab) => {
              const count =
                tab === "active" ? active.length : tab === "completed" ? completed.length : missed.length;
              return (
                <button
                  key={tab}
                  className={`db-tab ${activeTab === tab ? "db-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="db-tab__count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Commitment list */}
          {filtered.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty__icon">
                {activeTab === "active" ? <Target size={40} strokeWidth={1.5} /> : activeTab === "completed" ? <CheckCircle size={40} strokeWidth={1.5} /> : <Clock size={40} strokeWidth={1.5} />}
              </div>
              <h3 className="db-empty__title">
                {activeTab === "active"
                  ? "No active commitments"
                  : activeTab === "completed"
                    ? "No completed commitments yet"
                    : "No missed commitments"}
              </h3>
              <p className="db-empty__desc">
                {activeTab === "active"
                  ? "Your commitments from coaching conversations will appear here."
                  : activeTab === "completed"
                    ? "Complete your active commitments and they'll show up here."
                    : "Missed deadlines will appear here for reflection."}
              </p>
              {activeTab === "active" && (
                <a href="/dashboard/chat" className="db-empty__cta">
                  Start a Coaching Session →
                </a>
              )}
            </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="cm-list">
              {filtered.map((commitment) => (
                <motion.div
                  key={commitment.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className="cm-card">
                    {/* Status dot */}
                    <div className={`cm-card__dot cm-card__dot--${commitment.status === "rescheduled" ? "active" : commitment.status}`} />

                    {/* Content */}
                    <div className="cm-card__body">
                      <p className="cm-card__desc">{commitment.description}</p>
                      {commitment.context_note && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-hint)", margin: "0.2rem 0 0.25rem", fontStyle: "italic", lineHeight: 1.45 }}>
                          {commitment.context_note}
                        </p>
                      )}
                      <div className="cm-card__meta">
                        {commitment.due_date && (
                          <span className="cm-card__meta-item">
                            <Calendar size={12} />
                            {formatDueDate(commitment.due_date)}
                          </span>
                        )}
                        <span className="cm-card__meta-item">
                          {formatDate(commitment.created_at)}
                        </span>
                        {commitment.follow_up_count > 0 && (
                          <span className="cm-card__meta-item">
                            <MessageSquare size={12} />
                            {commitment.follow_up_count} follow-up{commitment.follow_up_count > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {commitment.status === "active" || commitment.status === "rescheduled" ? (
                      <div className="cm-card__actions">
                        {reschedulingId === commitment.id ? (
                          <div className="cm-date-picker">
                            <input
                              type="date"
                              className="cm-date-picker__input"
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                            />
                            <button
                              className="cm-date-picker__confirm"
                              onClick={() => handleReschedule(commitment.id)}
                              disabled={!rescheduleDate}
                            >
                              Save
                            </button>
                            <button
                              className="cm-date-picker__cancel"
                              onClick={() => {
                                setReschedulingId(null);
                                setRescheduleDate("");
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              className="cm-btn cm-btn--complete"
                              onClick={() => handleComplete(commitment.id)}
                            >
                              <Check size={12} /> Done
                            </button>
                            <button
                              className="cm-btn cm-btn--reschedule"
                              onClick={() => setReschedulingId(commitment.id)}
                            >
                              <RotateCcw size={12} /> Reschedule
                            </button>
                          </>
                        )}
                      </div>
                    ) : commitment.status === "completed" ? (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--success-hex)",
                          fontWeight: 500,
                        }}
                      >
                        ✓ {commitment.completed_at && formatDate(commitment.completed_at)}
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
        </div>
      </div>
    </div>
  );
}
