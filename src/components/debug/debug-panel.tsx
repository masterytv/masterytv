"use client";

/**
 * DebugPanel — The main split-panel debug inspector for the Coach Debugger.
 *
 * Renders a tabbed interface showing the coaching engine's internal state:
 * - Brain State: 11-layer prompt breakdown
 * - Coach Profile: Communication dimension sliders
 * - Memory: Retrieved facts and session summaries
 * - Pipeline: Request timeline waterfall + cost
 *
 * Only visible to admin users when debug mode is toggled on.
 * Architecture: implementation_plan.md — Component 2
 */

import { useState } from "react";
import type { DebugSummary } from "@/lib/chat";
import { BrainStateTab, CoachProfileTab, MemoryTab, PipelineTab } from "./debug-tabs";
import "./debug-panel.css";

const TABS = [
  { id: "brain", label: "🧠 Brain", icon: "🧠" },
  { id: "profile", label: "🎭 Profile", icon: "🎭" },
  { id: "memory", label: "🔍 Memory", icon: "🔍" },
  { id: "pipeline", label: "⚡ Pipeline", icon: "⚡" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface DebugPanelProps {
  /** The most recent debug summary from the coaching pipeline */
  debugData: DebugSummary | null;
  /** History of debug traces per message (keyed by message index) */
  traceHistory: DebugSummary[];
}

export default function DebugPanel({ debugData, traceHistory }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("brain");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Show the selected historical trace, or the most recent one
  const currentData = selectedIndex !== null ? traceHistory[selectedIndex] : debugData;

  return (
    <div className="debug-split-layout__panel">
      {/* Header */}
      <div className="debug-panel__header">
        <span className="debug-panel__title">🔬 Coach Debugger</span>
        {traceHistory.length > 1 && (
          <select
            value={selectedIndex ?? "latest"}
            onChange={(e) =>
              setSelectedIndex(e.target.value === "latest" ? null : Number(e.target.value))
            }
            style={{
              background: "hsl(220 15% 15%)",
              border: "1px solid hsl(220 13% 25%)",
              color: "hsl(220 10% 70%)",
              fontSize: "0.68rem",
              fontFamily: "var(--font-mono, monospace)",
              padding: "3px 6px",
              borderRadius: 4,
            }}
          >
            <option value="latest">Latest</option>
            {traceHistory.map((_, i) => (
              <option key={i} value={i}>
                Message {i + 1}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="debug-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`debug-tab ${activeTab === tab.id ? "debug-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="debug-content">
        {!currentData ? (
          <div className="debug-empty">
            <span className="debug-empty__icon">🔬</span>
            <span className="debug-empty__text">
              Send a message to see the coach&apos;s internal state here.
            </span>
          </div>
        ) : (
          <>
            {activeTab === "brain" && <BrainStateTab data={currentData} />}
            {activeTab === "profile" && <CoachProfileTab data={currentData} />}
            {activeTab === "memory" && <MemoryTab data={currentData} />}
            {activeTab === "pipeline" && <PipelineTab data={currentData} />}
          </>
        )}
      </div>
    </div>
  );
}
