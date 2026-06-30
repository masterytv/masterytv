import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyFounder, escapeHtml } from "@/lib/relatti/notify";

/**
 * Free-beta unlock. Flips users.beta_access (the coach edge fn bypasses the
 * free-tier daily limit when this is true) in exchange for a feedback pledge.
 * No payment. The optional note is stored as feedback(category='beta_signup').
 */

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
    const note = (body.note ?? "").toString().trim().slice(0, 5000);

    const { error } = await supabase
      .from("users")
      .update({ beta_access: true, beta_access_granted_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      console.error("[beta-unlock] update failed:", error);
      return NextResponse.json({ error: "Could not unlock beta access" }, { status: 500 });
    }

    if (note) {
      await supabase.from("feedback").insert({
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
        <p style="margin:0 0 12px"><strong>${escapeHtml(email)}</strong> unlocked free beta access.</p>
        ${
          note
            ? `<p style="white-space:pre-wrap;margin:0">${escapeHtml(note)}</p>`
            : `<p style="color:#666;margin:0">No note left.</p>`
        }
      </div>`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[beta-unlock] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
