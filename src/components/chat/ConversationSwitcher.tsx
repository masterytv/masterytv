"use client";

/**
 * ConversationSwitcher (PC1) — pick / start conversations from the chat header.
 * Compact dropdown: current conversation + a list to switch + "New conversation".
 * Platform-wide (all brands). BRAND.md: Lucide only, semantic tokens, light+dark.
 */

import { useState, useRef, useEffect } from "react";
import { Plus, Check, ChevronDown, MessageSquare } from "lucide-react";
import type { ConversationSummary } from "@/lib/chat";

export default function ConversationSwitcher({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const active = conversations.find((c) => c.id === activeId);
  const label = active?.title || "New conversation";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[14rem] items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-text-muted" />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl bg-surface-100 py-1 shadow-elevated">
          <button
            onClick={() => {
              onNew();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-200"
            style={{ color: "var(--color-primary)" }}
          >
            <Plus className="h-4 w-4" />
            New conversation
          </button>

          {conversations.length > 0 && (
            <div className="my-1 mx-3 h-px bg-surface-200" />
          )}

          <div className="max-h-72 overflow-y-auto">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isActive && <Check className="h-4 w-4" style={{ color: "var(--color-primary)" }} />}
                  </span>
                  <span className="truncate">{c.title || "Untitled"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
