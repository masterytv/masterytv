import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { scoreCSI4 } from "@/lib/decoded/scoring/engine";
import {
  parseBeforeSurvey,
  insertBeforeSurvey,
} from "@/lib/relatti/beta-survey";
import { notifyFounder, escapeHtml } from "@/lib/platform/notify";

/**
 * Beta check-in surveys.
 *
 * GET  → the caller's check-in state (drives the beta page + day-14 banner).
 *        Reads via the user's own RLS (select-self policy).
 * POST → record a check-in. phase='before' backfills testers who unlocked
 *        before the survey existed; phase='after' is the day-14 check-in
 *        (CSI-4 re-administered verbatim + experience questions + optional
 *        testimonial with explicit quote permission). Writes via service role
 *        so consent flags can't be forged; both phases are idempotent (unique
 *        user+phase — first submission wins, protecting data integrity).
 */

const CHECKIN_DUE_DAYS = 14;

const ATTRIBUTIONS = ["first_name", "initials", "anonymous"] as const;
const IMPROVED = ["much_better", "somewhat_better", "same", "somewhat_worse", "much_worse"] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: rows } = await supabase
    .from("beta_surveys")
    .select("phase, created_at")
    .eq("user_id", user.id);

  const before = rows?.find((r) => r.phase === "before") ?? null;
  const after = rows?.find((r) => r.phase === "after") ?? null;
  const dueAt = before
    ? new Date(new Date(before.created_at).getTime() + CHECKIN_DUE_DAYS * 86400000)
    : null;
  return NextResponse.json({
    before: !!before,
    after: !!after,
    checkinDue: !!before && !after && !!dueAt && dueAt <= new Date(),
    dueAt: dueAt?.toISOString() ?? null,
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    const admin = createServiceClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));

    // ── BEFORE (backfill path for already-unlocked testers) ──
    if (body.phase === "before") {
      const survey = parseBeforeSurvey(body);
      if (!survey) {
        return NextResponse.json({ error: "Please answer all three questions." }, { status: 400 });
      }
      const { status } = await insertBeforeSurvey(admin, user.id, survey);
      if (status === "error") {
        return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
      }
      return NextResponse.json({ success: true, status });
    }

    // ── AFTER (day-14 check-in) ──
    if (body.phase !== "after") {
      return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
    }

    // Must have a before row — the deal is before AND after. (responses +
    // csi_total feed the founder notification's before→after story.)
    const { data: beforeRow } = await admin
      .from("beta_surveys")
      .select("id, responses, csi_total")
      .eq("user_id", user.id)
      .eq("phase", "before")
      .maybeSingle();
    if (!beforeRow) {
      return NextResponse.json(
        { error: "Complete your first check-in on the beta page first.", needsBefore: true },
        { status: 400 }
      );
    }

    // CSI-4 answers: item 1 is 0–6, items 2–4 are 0–5. Same keys as the
    // assessment engine so scoreCSI4 applies verbatim.
    const csi = (body.csi ?? {}) as Record<string, unknown>;
    const csiResponses: Record<string, number> = {};
    for (const [item, max] of [["1", 6], ["2", 5], ["3", 5], ["4", 5]] as const) {
      const v = Number(csi[item]);
      if (!Number.isInteger(v) || v < 0 || v > max) {
        return NextResponse.json({ error: "Please answer all four satisfaction questions." }, { status: 400 });
      }
      csiResponses[item] = v;
    }
    const csiTotal = scoreCSI4(csiResponses).totalScore;

    const improved = String(body.improved ?? "");
    if (!(IMPROVED as readonly string[]).includes(improved)) {
      return NextResponse.json({ error: "Please tell us how your relationship has changed." }, { status: 400 });
    }
    const recommend = Number(body.recommend);
    if (!Number.isInteger(recommend) || recommend < 0 || recommend > 10) {
      return NextResponse.json({ error: "Please answer the recommend question." }, { status: 400 });
    }

    const whatChanged = String(body.whatChanged ?? "").trim().slice(0, 3000);
    const shouldFix = String(body.shouldFix ?? "").trim().slice(0, 3000);
    const testimonial = String(body.testimonial ?? "").trim().slice(0, 1500);
    const quotePermission = body.quotePermission === true && testimonial.length > 0;
    const quoteAttribution = quotePermission
      ? (ATTRIBUTIONS as readonly string[]).includes(String(body.quoteAttribution))
        ? String(body.quoteAttribution)
        : "anonymous"
      : null;

    const { error } = await admin.from("beta_surveys").insert({
      user_id: user.id,
      phase: "after",
      responses: { csi: csiResponses, improved, recommend, whatChanged, shouldFix },
      csi_total: csiTotal,
      testimonial: testimonial || null,
      quote_permission: quotePermission,
      quote_attribution: quoteAttribution,
    });
    if (error) {
      if (error.code === "23505") return NextResponse.json({ success: true, status: "already" });
      console.error("[beta-survey] after insert failed:", error.message);
      return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
    }

    // Founder notification — the FUNNEL EVENT only (privacy invariant,
    // founder 2026-07-15): the check-in form promises answers are "used only
    // anonymously, in aggregate", so no scores, answers, or quotes travel by
    // email. Identified responses (including cleared testimonials) live
    // behind the authenticated admin cockpit.
    const email = user.email ?? "unknown";
    await notifyFounder(
      "relatti",
      `Beta check-in 2/2 — ${email}`,
      `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#1a1a2e">
        <p style="margin:0 0 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Relatti beta · internal notification · no action needed</p>
        <p style="margin:0 0 16px"><strong>${escapeHtml(email)}</strong> just completed their 2-week check-in — the second half of the beta deal (free unlimited access in exchange for a before + after check-in). That's both check-ins done for this tester.${testimonial && quotePermission ? " They also cleared a testimonial quote for marketing use." : ""}</p>
        <p style="margin:0;font-size:12px;color:#888">Their answers stay out of email by design — the before &rarr; after story, aggregate stats, and any cleared quotes are in the <a href="https://relatti.com/admin/beta">beta cockpit</a>.</p>
      </div>`
    );

    return NextResponse.json({ success: true, status: "ok" });
  } catch (err) {
    console.error("[beta-survey] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
