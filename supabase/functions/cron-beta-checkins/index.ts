/**
 * cron-beta-checkins — day-14 after-check-in email nudges.
 *
 * The beta deal is free unlimited access ⇄ a before check-in (at unlock) and an
 * after check-in (day 14). This fn runs daily (pg_cron 'beta-checkin-nudges',
 * 16:00 UTC) and emails testers whose after check-in is due:
 *   before row ≥ 14 days old · no after row · beta_access still on
 *   · fewer than 3 sends · ≥ 3 days since the last send.
 * Soft enforcement by design (founder decision 2026-07-09): we nudge at most
 * 3 times and never revoke access. Reminder state lives on the BEFORE row.
 *
 * Sends via the Relatti Resend account (mail.relatti.com). Deploy:
 *   supabase functions deploy cron-beta-checkins --no-verify-jwt
 * (pg_cron calls it server-to-server with the service-role key.)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const CHECKIN_DUE_DAYS = 14;
const MAX_REMINDERS = 3;
const REMINDER_SPACING_DAYS = 3;

function checkinEmailHtml(checkinUrl: string, isFirst: boolean): string {
  const lead = isFirst
    ? `You&rsquo;ve had your coach for two weeks — time for the second (and last) check-in of the beta deal.`
    : `Just a gentle nudge: your 2-week check-in is still open — it&rsquo;s the second (and last) half of the beta deal.`;
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;line-height:1.6;color:#333">
    <p style="margin:0 0 16px">${lead}</p>
    <p style="margin:0 0 16px">It takes about three minutes: the same four satisfaction questions you answered at the start, plus what changed and what we should fix. Straight answers help most &mdash; including the unflattering ones.</p>
    <p style="margin:0 0 24px">
      <a href="${checkinUrl}" style="display:inline-block;background:#E11D48;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Do my 2-week check-in</a>
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#666">Same promise as always: your coaching conversations are never read or used for anything. Check-in answers are used anonymously, in aggregate &mdash; and a quote only if you explicitly allow it on the form.</p>
    <p style="margin:0;font-size:13px;color:#666">Questions? Just reply to this email.</p>
  </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const appUrl = Deno.env.get("RELATTI_APP_URL") ?? "https://relatti.com";
  const checkinUrl = `${appUrl}/dashboard/beta/checkin`;

  const dueBefore = new Date(Date.now() - CHECKIN_DUE_DAYS * 86400000).toISOString();
  const spacingCutoff = new Date(Date.now() - REMINDER_SPACING_DAYS * 86400000).toISOString();

  try {
    // Candidates: before rows old enough, under the send cap, spaced ≥3 days.
    const { data: candidates, error } = await supabase
      .from("beta_surveys")
      .select("id, user_id, reminders_sent, last_reminder_at")
      .eq("phase", "before")
      .lte("created_at", dueBefore)
      .lt("reminders_sent", MAX_REMINDERS)
      .or(`last_reminder_at.is.null,last_reminder_at.lte.${spacingCutoff}`);
    if (error) throw new Error(`candidates query: ${error.message}`);
    if (!candidates?.length) {
      return Response.json({ ok: true, sent: 0, reason: "no candidates" });
    }

    const userIds = candidates.map((c) => c.user_id);

    // Exclude anyone who already completed the after check-in.
    const { data: afterRows } = await supabase
      .from("beta_surveys")
      .select("user_id")
      .eq("phase", "after")
      .in("user_id", userIds);
    const done = new Set((afterRows ?? []).map((r) => r.user_id));

    // Email + beta_access (skip revoked testers).
    const { data: users } = await supabase
      .from("users")
      .select("id, email, beta_access")
      .in("id", userIds);
    const userById = new Map((users ?? []).map((u) => [u.id, u]));

    let sent = 0;
    const failures: string[] = [];
    for (const row of candidates) {
      if (done.has(row.user_id)) continue;
      const u = userById.get(row.user_id);
      if (!u?.email || !u.beta_access) continue;

      try {
        const isFirst = row.reminders_sent === 0;
        await sendEmail({
          to: u.email,
          subject: isFirst
            ? "Your 2-week Relatti check-in is ready (3 minutes)"
            : "Still open: your 2-week Relatti check-in",
          html: checkinEmailHtml(checkinUrl, isFirst),
          brand: "relatti",
        });
        await supabase
          .from("beta_surveys")
          .update({
            reminders_sent: row.reminders_sent + 1,
            last_reminder_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        sent++;
      } catch (e) {
        failures.push(`${row.user_id}: ${(e as Error).message}`);
        console.error(`[cron-beta-checkins] send failed for ${row.user_id}:`, e);
      }
    }

    console.log(`[cron-beta-checkins] sent ${sent}, failures ${failures.length}`);
    return Response.json({ ok: true, sent, failures });
  } catch (err) {
    console.error("[cron-beta-checkins] error:", err);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
});
