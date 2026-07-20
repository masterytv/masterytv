import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBrandFromRequest } from "@/lib/platform/brand.server";
import { notifyFounder, escapeHtml } from "@/lib/platform/notify";

/**
 * Feedback capture — ALL brands (Relatti-only until 2026-07-20; the widget is
 * platform chrome now). The authed user inserts their own row (RLS enforces
 * user_id = auth.uid()), stamped with the resolved brand's `program` so the
 * cockpit/triage reads stay per-vertical; the founder is emailed best-effort
 * so nothing is missed. See migration 20260720220000_feedback_program.
 *
 * Brand resolution: the widget sends its client-resolved brand id in the
 * body, which enters the SHARED precedence rule (resolveBrandId: explicit
 * hint > dedicated brand host > localhost cookie > default). A dedicated
 * host still resolves correctly for stale clients that send no hint, and
 * localhost dev (?brand=money) stamps the vertical actually being tested.
 * The hint can only select a REGISTERED brand, and all it decides is which
 * founder bucket the sender's own words land in — nothing gated rides on it.
 *
 * The full message goes in the founder email on purpose (the reviewed
 * carve-out from the event-only-pointer rule: feedback is written FOR the
 * founder — funnel.ts documents the same exception for the cockpit).
 */

const CATEGORIES = ["bug", "idea", "confusing", "praise", "beta_signup", "other"] as const;
type Category = (typeof CATEGORIES)[number];

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
    const message = (body.message ?? "").toString().trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const brand = await getBrandFromRequest(
      typeof body.brand === "string" ? body.brand : null,
    );

    const category: Category = CATEGORIES.includes(body.category)
      ? body.category
      : "other";
    const rating =
      Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
        ? body.rating
        : null;
    const pageUrl = (body.page_url ?? "").toString().slice(0, 500) || null;
    const userAgent = (body.user_agent ?? "").toString().slice(0, 500) || null;

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      program: brand.programSlug,
      category,
      message: message.slice(0, 5000),
      rating,
      page_url: pageUrl,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[feedback] insert failed:", error);
      return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
    }

    const email = user.email ?? "unknown";
    await notifyFounder(
      brand.id,
      `${brand.name} feedback (${category}${rating ? `, ${rating}★` : ""})`,
      `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6">
        <p style="margin:0 0 8px"><strong>${escapeHtml(category)}</strong>${rating ? ` &middot; ${rating}/5` : ""}</p>
        <p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(message)}</p>
        <p style="color:#666;font-size:13px;margin:0">From: ${escapeHtml(email)}<br/>Brand: ${escapeHtml(brand.name)}<br/>Page: ${escapeHtml(pageUrl ?? "—")}</p>
      </div>`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
