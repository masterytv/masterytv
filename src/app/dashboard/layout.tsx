"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/client";
import ShareModal from "@/components/decoded/ShareModal";

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
  const [reportId, setReportId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [broadcastInviteUrl, setBroadcastInviteUrl] = useState<string>('');
  const { user } = useUser();

  // Check if user has a completed (non-superseded) assessment + fetch broadcast invite
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

      // Fetch report ID for the sidebar link
      if (data) {
        const { data: report } = await supabase
          .from("assessment_reports")
          .select("id")
          .eq("assessment_id", data.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (report) setReportId(report.id);
      }

      // Fetch broadcast invite for share URL
      const { data: broadcast } = await supabase
        .from("decoded_invites")
        .select("id")
        .eq("inviter_id", authUser.id)
        .eq("recipient_email", "broadcast")
        .limit(1)
        .maybeSingle();

      if (broadcast) {
        setBroadcastInviteUrl(`${window.location.origin}/decoded/invite/${broadcast.id}`);
      }
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
        reportId={reportId}
        onShareClick={() => setShowShareModal(true)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          userName={user?.name ?? null}
          onMenuClick={() => setSidebarOpen(true)}
          userRole={user?.role}
        />

        {/* Page content — each page controls its own padding/container */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Share modal — triggered from sidebar Share button */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onUnlock={() => setShowShareModal(false)}
        shareUrl={broadcastInviteUrl || `${typeof window !== 'undefined' ? window.location.origin : 'https://masterytv.com'}/decoded`}
      />
    </div>
  );
}
