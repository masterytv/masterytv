"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/client";
import ShareModal from "@/components/decoded/ShareModal";
import PartnerInviteModal from "@/components/relatti/PartnerInviteModal";
import { FeedbackWidget } from "@/components/relatti/FeedbackWidget";
import { useBrand, resolveBrandClient } from "@/hooks/useBrand";
import { byBrand } from "@/lib/platform/brand";

/**
 * Unified dashboard chrome — wraps all post-auth pages
 * (home, report, chat, commitments, progress, settings).
 * Assessment runs in its own layout group without sidebar.
 *
 * Client component: interactivity only. The route's layout.tsx is the server
 * shell that owns brand-aware metadata (BRAND.md §15) and renders this.
 *
 * Checks assessment completion state to lock/unlock sidebar items.
 */
export default function DashboardLayoutClient({
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
  const brand = useBrand();

  // Check if user has a completed (non-superseded) assessment + fetch broadcast invite
  useEffect(() => {
    async function checkAssessment() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Program-scoped: the sidebar must link to THIS brand's profile, not
      // whichever program the user happened to finish last.
      //
      // resolveBrandClient(), NOT the `brand` from useBrand(): useBrand starts
      // at the DEFAULT brand and only re-resolves in its own mount effect, but
      // this effect has [] deps and runs once — it would capture 'general' on
      // relatti.com and query the wrong program. resolveBrandClient reads the
      // host synchronously, so it's right on the first pass.
      //
      // The .order() is new and load-bearing: this was .limit(1).single() with
      // no ordering at all, which is non-deterministic the moment a user has
      // two live assessments — Postgres may return either row.
      // (PC2.1d — directives/ASSESSMENT_PROGRAM_SCOPING.md.)
      const { data } = await supabase
        .from("assessments")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("program", resolveBrandClient().programSlug)
        .not("completed_at", "is", null)
        .neq("current_layer", "superseded")
        .order("completed_at", { ascending: false })
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
        setBroadcastInviteUrl(`${window.location.origin}/invite/${broadcast.id}`);
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

      {/* Beta feedback widget — Relatti only */}
      {brand.id === "relatti" && <FeedbackWidget />}

      {/* Invite/Share modal — triggered from the sidebar Share button. Relatti
          gets the partner-invite (the Decoded viral share is off-brand there);
          MasteryTV keeps the Decoded archetype share. byBrand so a new brand
          must declare its share surface instead of inheriting Decoded's. */}
      {byBrand(
        {
          relatti: (
            <PartnerInviteModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              inviteUrl={broadcastInviteUrl || `${typeof window !== 'undefined' ? window.location.origin : 'https://relatti.com'}/assess`}
            />
          ),
          masterytv: (
            <ShareModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              onUnlock={() => setShowShareModal(false)}
              shareUrl={broadcastInviteUrl || `${typeof window !== 'undefined' ? window.location.origin : 'https://masterytv.com'}/decoded`}
            />
          ),
          // Money's share surface (the trait card share + the cofounder edge
          // comparison) is a leaf; nothing to share until it ships. `null` keeps
          // money off the Decoded/partner share modals rather than inheriting one.
          money: null,
        },
        brand.id,
      )}
    </div>
  );
}
