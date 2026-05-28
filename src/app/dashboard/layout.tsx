"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/client";

/**
 * Unified dashboard layout — wraps all post-auth pages
 * (home, report, chat, commitments, progress, settings).
 * Assessment runs in its own layout group without sidebar.
 *
 * Checks assessment completion state to lock/unlock sidebar items.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const { user } = useUser();

  // Check if user has a completed (non-superseded) assessment
  useEffect(() => {
    async function checkAssessment() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from("assessments")
        .select("id")
        .eq("user_id", authUser.id)
        .not("completed_at", "is", null)
        .neq("current_layer", "superseded")
        .limit(1)
        .single();

      setAssessmentCompleted(!!data);
    }
    checkAssessment();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        assessmentCompleted={assessmentCompleted}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          userName={user?.name ?? null}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content — each page controls its own padding/container */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
