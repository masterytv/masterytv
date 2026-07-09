import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notifyFounder, escapeHtml } from "@/lib/relatti/notify";
import {
  parseBeforeSurvey,
  insertBeforeSurvey,
  RELATIONSHIP_LENGTH_LABELS,
} from "@/lib/relatti/beta-survey";

/**
 * Free-beta unlock — GATED behind an invite code with a per-code cap
 * (the admission mechanic for the controlled/Reddit beta). Redemption is atomic
 * and race-safe in `redeem_beta_code` (service-role-only). On success it flips
 * users.beta_access (the coach edge fn bypasses the free-tier daily limit) and
 * records which code was used.
 *
 * The unlock also requires the BEFORE check-in (the free-access ⇄ two-surveys
 * deal): three quick questions stored in beta_surveys with the tester's CSI-4
 * baseline snapshotted from their assessment. The optional note is stored as
 * feedback(category='beta_signup').
 */

// Map the RPC status → HTTP outcome + a user-facing message.
const OUTCOME: Record<string, { ok: boolean; error?: string }> = {
  ok: { ok: true },
  already: { ok: true },
  invalid: { ok: false, error: "That code isn't valid. Double-check it and try again." },
  expired: { ok: false, error: "That code is no longer active." },
  exhausted: { ok: false, error: "That code has already been fully claimed. Ask us for a fresh one." },
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = (body.code ?? "").toString().trim();
    const note = (body.note ?? "").toString().trim().slice(0, 5000);
    if (!code) {
      return NextResponse.json({ error: "Enter your invite code." }, { status: 400 });
    }
    // The before check-in is part of the deal — required with the code.
    const survey = parseBeforeSurvey(body.survey);
    if (!survey) {
      return NextResponse.json(
        { error: "Please answer the three quick check-in questions." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }
    const admin = createServiceClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: status, error } = await admin.rpc("redeem_beta_code", {
      p_code: code,
      p_user_id: user.id,
    });
    if (error) {
      console.error("[beta-unlock] redeem_beta_code failed:", error.message);
      return NextResponse.json({ error: "Could not verify your code. Please try again." }, { status: 500 });
    }

    const outcome = OUTCOME[status as string] ?? { ok: false, error: "Could not redeem that code." };
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error, status }, { status: 400 });
    }

    // Record the before check-in for fresh grants AND 'already' users (existing
    // testers backfilling the survey through the same page). Idempotent — a
    // duplicate submit returns 'already' from the unique(user, phase) constraint.
    const { baseline } = await insertBeforeSurvey(admin, user.id, survey);

    // Fresh grant only: record the note + notify the founder. ('already' means
    // they were in already — don't double-notify or re-consume anything.)
    if (status === "ok") {
      if (note) {
        await admin.from("feedback").insert({
          user_id: user.id,
          category: "beta_signup",
          message: note,
          page_url: "/dashboard/beta",
        });
      }

      // Which code they used + how much of its cap is left.
      const { data: codeRow } = await admin
        .from("users")
        .select("beta_code_id, beta_invite_codes:beta_code_id (code, label, uses, max_uses)")
        .eq("id", user.id)
        .maybeSingle();
      const codeInfo = (codeRow?.beta_invite_codes ?? null) as
        | { code: string; label: string | null; uses: number; max_uses: number }
        | null;

      const email = user.email ?? "unknown";
      const lengthLabel = RELATIONSHIP_LENGTH_LABELS[survey.relationshipLength] ?? survey.relationshipLength;
      await notifyFounder(
        `Beta: new tester unlocked — ${email}`,
        `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#1a1a2e">
          <p style="margin:0 0 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Relatti beta · internal notification · no action needed</p>
          <p style="margin:0 0 16px"><strong>${escapeHtml(email)}</strong> redeemed an invite code and completed the <em>before</em> check-in (1 of 2) — they now have free unlimited coaching for the beta. Their 2-week check-in schedules itself: a dashboard banner plus up to 3 email nudges starting on day 14. Nothing for you to do.</p>
          <div style="background:#f6f7f9;border-radius:10px;padding:14px 16px;margin:0 0 16px">
            <p style="margin:0 0 6px"><strong>Where they're starting:</strong></p>
            <p style="margin:0 0 4px">Together ${escapeHtml(lengthLabel)} · hopefulness <strong>${survey.hopefulness}/5</strong> · satisfaction baseline ${baseline == null ? "not captured (no completed assessment yet)" : `<strong>${baseline}/21</strong> (CSI-4; 13.5 is the distress cutoff)`}</p>
            <p style="margin:0">Wants to change: &ldquo;${escapeHtml(survey.topChange)}&rdquo;</p>
          </div>
          ${
            codeInfo
              ? `<p style="margin:0 0 12px;font-size:13px;color:#555">Code used: <strong>${escapeHtml(codeInfo.code)}</strong>${codeInfo.label ? ` (${escapeHtml(codeInfo.label)})` : ""} — ${codeInfo.uses}/${codeInfo.max_uses} slots taken.</p>`
              : ""
          }
          <p style="margin:0;font-size:12px;color:#888">Funnel + check-in stats aggregate in the <a href="https://relatti.com/admin/beta">beta cockpit</a>.</p>
        </div>`,
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("[beta-unlock] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
