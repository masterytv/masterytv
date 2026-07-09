import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notifyFounder, escapeHtml } from "@/lib/relatti/notify";
import { parseBeforeSurvey, insertBeforeSurvey } from "@/lib/relatti/beta-survey";

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
    await insertBeforeSurvey(admin, user.id, survey);

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
      const email = user.email ?? "unknown";
      await notifyFounder(
        `Relatti beta unlock — ${email}`,
        `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6">
          <p style="margin:0 0 12px"><strong>${escapeHtml(email)}</strong> redeemed a beta invite code.</p>
          ${
            note
              ? `<p style="white-space:pre-wrap;margin:0">${escapeHtml(note)}</p>`
              : `<p style="color:#666;margin:0">No note left.</p>`
          }
        </div>`,
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("[beta-unlock] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
