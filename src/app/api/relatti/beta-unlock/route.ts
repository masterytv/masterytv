import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { parseBeforeSurvey, redeemBetaOffer } from "@/lib/relatti/beta-survey";

/**
 * Free-beta unlock — GATED behind an invite code with a per-code cap
 * (the admission mechanic for the controlled/Reddit beta) PLUS the BEFORE
 * check-in (the free-access ⇄ two-surveys deal). All of the actual work —
 * atomic redemption, before-survey insert with the CSI baseline snapshot,
 * feedback note, founder notification — lives in redeemBetaOffer(), shared
 * with the dashboard auto-redeem for the /beta pre-registration cookie.
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

    const result = await redeemBetaOffer(admin, user, code, survey, {
      note,
      source: (body.source as string) === "/beta" ? "/beta" : "/dashboard/beta",
    });
    if (result.status !== "ok" && result.status !== "already") {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: result.status === "error" ? 500 : 400 }
      );
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (err) {
    console.error("[beta-unlock] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
