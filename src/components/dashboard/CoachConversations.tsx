"use client";

/**
 * CoachConversations (PC1) — the conversation list nested under "Coach" in the
 * dashboard sidebar. Shows the first 5 with a See more / See less toggle, plus
 * "New conversation". Selection is URL-driven (/dashboard/chat?c=<id>) so it
 * works from any page. Scoped to the active brand's thread (dyad vs general).
 *
 * Refetches on mount, on route change, and on the 'coach:conversations-changed'
 * window event the chat page dispatches after a reply (so a just-started
 * conversation appears here too). BRAND.md: Lucide only, semantic tokens.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listConversations, type ConversationSummary } from "@/lib/chat";
import { resolveBrandClient } from "@/hooks/useBrand";
import { getActiveDyad } from "@/lib/relatti/dashboard-dyad";

const VISIBLE = 5;

export default function CoachConversations() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c");
  const onChatPage = pathname === "/dashboard/chat";

  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    // Scope to the active brand's thread (Relatti dyad vs general).
    let engagementId: string | null = null;
    if (resolveBrandClient().id === "relatti") {
      const dyad = await getActiveDyad(supabase, user.id);
      engagementId = dyad?.engagementId ?? null;
    }
    setItems(await listConversations(engagementId));
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname, activeId]);

  // Refresh when the chat page reports a new/updated conversation.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("coach:conversations-changed", handler);
    return () => window.removeEventListener("coach:conversations-changed", handler);
  }, [load]);

  if (items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, VISIBLE);

  return (
    <div className="mt-1 space-y-0.5 pl-9 pr-1">
      <Link
        href="/dashboard/chat?c=new"
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-surface-200"
        style={{ color: "var(--color-primary)" }}
      >
        <Plus className="h-3.5 w-3.5" />
        New conversation
      </Link>

      {shown.map((c) => {
        const isActive = onChatPage && activeId === c.id;
        return (
          <Link
            key={c.id}
            href={`/dashboard/chat?c=${c.id}`}
            className="block truncate rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-surface-200"
            style={
              isActive
                ? { background: "color-mix(in oklch, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }
                : { color: "var(--text-secondary)" }
            }
            title={c.title || "Untitled"}
          >
            {c.title || "Untitled"}
          </Link>
        );
      })}

      {items.length > VISIBLE && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? "See less" : `See ${items.length - VISIBLE} more`}
        </button>
      )}
    </div>
  );
}
