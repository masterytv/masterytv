"use client";

/**
 * Coaching Letter — S6.2
 *
 * Displays the user's coaching letter from onboarding,
 * plus confirmed research facts with inline editing.
 *
 * Architecture: SPRINT.md S6.2
 * Tokens: dashboard.css (cl-* BEM classes)
 */

import { useUser } from "@/hooks/useUser";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Pencil, Save, Mail, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────

interface MemoryFact {
  id: string;
  category: string;
  subject: string;
  content: string;
  is_confirmed: boolean;
}

// ─── Markdown parser (mirrors onboarding parseMarkdownToHtml) ────────────

function parseMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h4 class="cl-letter__h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="cl-letter__h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="cl-letter__h2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(
      /(<li>[\s\S]*?<\/li>\n?)+/g,
      '<ul class="cl-letter__list">$&</ul>'
    )
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol")
      )
        return trimmed;
      return `<p>${trimmed.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");
}

// ─── Category display names ──────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  business: "Business",
  personal: "Personal",
  goal: "Goal",
  person: "Person",
  challenge: "Challenge",
  win: "Win",
  pattern: "Pattern",
  preference: "Preference",
  org_sop: "Process",
};

// ─── Fact Item Component ─────────────────────────────────────────────────

function FactItem({
  fact,
  onSave,
}: {
  fact: MemoryFact;
  onSave: (id: string, content: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(fact.content);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (editValue.trim() === fact.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(fact.id, editValue.trim());
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="cl-fact">
      <span className="cl-fact__badge">
        {CATEGORY_LABELS[fact.category] || fact.category}
      </span>

      {editing ? (
        <>
          <input
            className="cl-fact__input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditing(false);
                setEditValue(fact.content);
              }
            }}
            autoFocus
          />
          <button
            className="cl-fact__save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          </button>
        </>
      ) : (
        <>
          <span className="cl-fact__content">
            <span className="cl-fact__subject">{fact.subject}:</span>
            {fact.content}
          </span>
          <button
            className="cl-fact__edit-btn"
            onClick={() => setEditing(true)}
            aria-label={`Edit fact: ${fact.subject}`}
          >
            <Pencil size={12} /> Edit
          </button>
        </>
      )}
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────

export default function CoachingLetterPage() {
  const { user, loading: userLoading } = useUser();
  const [letter, setLetter] = useState<string | null>(null);
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  // Reset onboarding and redirect
  async function handleRedoOnboarding() {
    setResetting(true);
    if (user) {
      await supabase.from("onboarding_state").upsert(
        {
          user_id: user.id,
          current_step: "about_you",
          coaching_letter: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
    router.push("/onboarding?redo=1");
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;

    // Parallel: coaching letter + confirmed facts
    const [letterRes, factsRes] = await Promise.all([
      supabase
        .from("onboarding_state")
        .select("coaching_letter")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("memory_facts")
        .select("id, category, subject, content, is_confirmed")
        .eq("user_id", user.id)
        .eq("is_confirmed", true)
        .order("category"),
    ]);

    if (letterRes.data?.coaching_letter) {
      setLetter(letterRes.data.coaching_letter);
    }

    if (factsRes.data) {
      setFacts(factsRes.data as MemoryFact[]);
    }

    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Save edited fact
  async function handleSaveFact(id: string, content: string) {
    const { error } = await supabase
      .from("memory_facts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setFacts((prev) =>
        prev.map((f) => (f.id === id ? { ...f, content } : f))
      );
    }
  }

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

  // Empty state — no letter yet, prompt coaching onboarding
  if (!letter) {
    return (
      <div className="db-page">
        <div className="db-page__inner">
          <div className="db-header">
            <h1 className="db-header__title">Coaching Letter</h1>
          </div>
          <div className="db-section">
            <div className="db-empty">
              <div className="db-empty__icon"><Mail size={40} strokeWidth={1.5} /></div>
              <h3 className="db-empty__title">Your Coach Has Some Questions</h3>
              <p className="db-empty__desc">
                Before your initial coaching assessment can begin, your coach
                needs to learn a bit more about you — your goals, your challenges,
                and what matters most right now.
              </p>
              <p className="db-empty__desc" style={{ marginTop: 0, fontSize: "0.8rem", color: "var(--text-hint)" }}>
                This takes about 5 minutes.
              </p>
              <Link href="/onboarding" className="db-empty__cta">
                Answer Coach&apos;s Questions →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const html = parseMarkdownToHtml(letter);

  return (
    <div className="db-page">
      <div className="db-page__inner">
        {/* Header */}
        <div className="db-header">
          <h1 className="db-header__title">Your Coaching Letter</h1>
          <p className="db-header__subtitle">
            Your personalized coaching introduction, based on what we learned
            about you during onboarding.
          </p>
        </div>

        {/* Letter */}
        <div className="db-section" style={{ marginBottom: "1.5rem" }}>
          <div
            className="cl-letter"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {/* Research Facts */}
        {facts.length > 0 && (
          <div className="db-section">
            <h2 className="db-section__title">Confirmed Research Facts</h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-body)",
                marginBottom: "1rem",
                lineHeight: 1.5,
              }}
            >
              These facts were confirmed during onboarding. Click &quot;Edit&quot; to
              correct anything that&apos;s changed.
            </p>
            <div className="cl-facts">
              {facts.map((fact) => (
                <FactItem
                  key={fact.id}
                  fact={fact}
                  onSave={handleSaveFact}
                />
              ))}
            </div>
          </div>
        )}

        {/* Redo Onboarding CTA */}
        <div className="db-section" style={{ marginTop: "1rem" }}>
          <button
            onClick={handleRedoOnboarding}
            disabled={resetting}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary, #a3a6ff)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Redirecting…' : 'Redo coaching onboarding'}
          </button>
          <p style={{ fontSize: "0.75rem", color: "var(--text-hint)", marginTop: "0.35rem" }}>
            Start fresh with updated goals and background info. Your chat history is preserved.
          </p>
        </div>
      </div>
    </div>
  );
}
