"use client";

/**
 * Progress Timeline — S6.3
 *
 * Vertical scrollable timeline merging:
 * - Completed commitments
 * - Wins (user_entities type='win')
 * - Patterns (user_entities type='pattern')
 * - Onboarding completion milestone
 *
 * Each item links to source conversation when available.
 *
 * Architecture: SPRINT.md S6.3
 * Tokens: dashboard.css (pg-* BEM classes)
 */

import { useUser } from "@/hooks/useUser";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trophy, CheckCircle2, Repeat, Star, TrendingUp, Lock } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────

interface TimelineItem {
  id: string;
  type: "win" | "commitment" | "pattern" | "milestone";
  title: string;
  description: string | null;
  timestamp: string;
  sourceMessageId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatTimelineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;

  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const TYPE_CONFIG = {
  win: {
    label: "Win",
    icon: Trophy,
    dotClass: "pg-timeline__dot--win",
    typeClass: "pg-timeline__type--win",
  },
  commitment: {
    label: "Completed",
    icon: CheckCircle2,
    dotClass: "pg-timeline__dot--commitment",
    typeClass: "pg-timeline__type--commitment",
  },
  pattern: {
    label: "Pattern",
    icon: Repeat,
    dotClass: "pg-timeline__dot--pattern",
    typeClass: "pg-timeline__type--pattern",
  },
  milestone: {
    label: "Milestone",
    icon: Star,
    dotClass: "pg-timeline__dot--milestone",
    typeClass: "pg-timeline__type--milestone",
  },
};

// ─── Page Component ──────────────────────────────────────────────────────

export default function ProgressPage() {
  const { user, loading: userLoading } = useUser();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Parallel queries for all timeline data sources
    const [commitmentsRes, entitiesRes, onboardingRes] = await Promise.all([
      // Completed commitments
      supabase
        .from("commitments")
        .select("id, description, completed_at, source_message_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),

      // Wins + patterns from user_entities
      supabase
        .from("user_entities")
        .select(
          "id, entity_type, name, description, first_mentioned_at, source_message_id"
        )
        .eq("user_id", user.id)
        .in("entity_type", ["win", "pattern"])
        .order("first_mentioned_at", { ascending: false }),

      // Onboarding completion as a milestone
      supabase
        .from("onboarding_state")
        .select("updated_at, current_step")
        .eq("user_id", user.id)
        .eq("current_step", "complete")
        .single(),
    ]);

    const timeline: TimelineItem[] = [];

    // Map completed commitments
    if (commitmentsRes.data) {
      for (const c of commitmentsRes.data) {
        if (!c.completed_at) continue;
        timeline.push({
          id: `commitment-${c.id}`,
          type: "commitment",
          title: c.description,
          description: null,
          timestamp: c.completed_at,
          sourceMessageId: c.source_message_id,
        });
      }
    }

    // Map wins + patterns
    if (entitiesRes.data) {
      for (const e of entitiesRes.data) {
        timeline.push({
          id: `entity-${e.id}`,
          type: e.entity_type as "win" | "pattern",
          title: e.name,
          description: e.description,
          timestamp: e.first_mentioned_at,
          sourceMessageId: e.source_message_id,
        });
      }
    }

    // Onboarding milestone
    if (onboardingRes.data?.updated_at) {
      timeline.push({
        id: "milestone-onboarding",
        type: "milestone",
        title: "Coaching journey started",
        description:
          "You completed onboarding and received your personalized coaching letter.",
        timestamp: onboardingRes.data.updated_at,
        sourceMessageId: null,
      });
    }

    // Sort by timestamp descending
    timeline.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setItems(timeline);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="db-page">
        <div className="db-empty">
          <Loader2
            className="h-6 w-6 animate-spin"
            style={{ color: "var(--text-hint)" }}
          />
        </div>
      </div>
    );
  }

  // Derive milestone unlock states from fetched timeline data
  const hasJourneyStarted = items.some(i => i.type === "milestone");
  const hasFirstCommitment = items.some(i => i.type === "commitment");
  const hasFirstWin = items.some(i => i.type === "win");
  const hasFirstPattern = items.some(i => i.type === "pattern");
  const winCount = items.filter(i => i.type === "win").length;
  const commitmentCount = items.filter(i => i.type === "commitment").length;
  const patternCount = items.filter(i => i.type === "pattern").length;

  const milestonePath = [
    { id: "started", label: "Started journey", icon: Star, unlocked: hasJourneyStarted },
    { id: "first-commitment", label: "First commitment", icon: CheckCircle2, unlocked: hasFirstCommitment },
    { id: "first-win", label: "First win", icon: Trophy, unlocked: hasFirstWin },
    { id: "first-pattern", label: "First pattern", icon: Repeat, unlocked: hasFirstPattern },
    { id: "3-patterns", label: "3 patterns identified", icon: Repeat, unlocked: patternCount >= 3 },
    { id: "5-wins", label: "5 wins logged", icon: Trophy, unlocked: winCount >= 5 },
    { id: "10-commitments", label: "10 commitments", icon: CheckCircle2, unlocked: commitmentCount >= 10 },
  ];

  return (
    <div className="db-page">
      <div className="db-page__inner">
        {/* Header */}
        <div className="db-header">
          <div className="db-header__row">
            <div>
              <h1 className="db-header__title">Progress</h1>
              <p className="db-header__subtitle">
                Your coaching journey, visualized — wins, breakthroughs, and patterns your coach has recognized. More appear as you keep talking.
              </p>
            </div>

            {items.length > 0 && (
              <div className="db-stat-chip">
                <span className="db-stat-chip__label">Logged</span>
                <span className="db-stat-chip__value">{items.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Card */}
        <div className="db-section">
          {/* Empty state */}
          {items.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty__icon"><TrendingUp size={40} strokeWidth={1.5} /></div>
              <h3 className="db-empty__title">Your journey starts here</h3>
              <p className="db-empty__desc">
                As you work with your coach, milestones, completed commitments,
                and recognized patterns will appear on your timeline.
              </p>
              <Link href="/dashboard/chat" className="db-empty__cta">
                Start a Session →
              </Link>
            </div>
          ) : (
            <>
              {/* Journey milestone path — shows locked/unlocked forward progress */}
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-hint)", marginBottom: "0.6rem" }}>
                  Journey Milestones
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {milestonePath.map(({ id, label, icon: Icon, unlocked }) => (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.3rem 0.65rem",
                        borderRadius: "100px",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        opacity: unlocked ? 1 : 0.38,
                        background: unlocked ? "var(--emerald-glow)" : "var(--color-surface-100)",
                        color: unlocked ? "var(--success-hex)" : "var(--text-hint)",
                      }}
                    >
                      <Icon size={11} />
                      {label}
                      {!unlocked && <Lock size={9} style={{ opacity: 0.7, marginLeft: "0.1rem" }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="pg-timeline">
                {items.map((item) => {
                  const config = TYPE_CONFIG[item.type];
                  const Icon = config.icon;

                  return (
                    <div key={item.id} className="pg-timeline__item">
                      {/* Dot */}
                      <div className={`pg-timeline__dot ${config.dotClass}`}>
                        <Icon size={11} />
                      </div>

                      {/* Card */}
                      <div className="pg-timeline__card">
                        <span
                          className={`pg-timeline__type ${config.typeClass}`}
                        >
                          {config.label}
                        </span>
                        <div className="pg-timeline__name">{item.title}</div>
                        {item.description && (
                          <div className="pg-timeline__desc">
                            {item.description}
                          </div>
                        )}
                        <div className="pg-timeline__footer">
                          <span className="pg-timeline__date">
                            {formatTimelineDate(item.timestamp)}
                          </span>
                          {item.sourceMessageId && (
                            <Link
                              href="/dashboard/chat"
                              className="pg-timeline__link"
                            >
                              View conversation →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
