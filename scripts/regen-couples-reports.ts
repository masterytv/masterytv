/**
 * Relatti — regenerate stale couples / compatibility reports after a re-score.
 *
 * The per-user compatibility reports + couples_report live as jsonb on
 * decoded_invites (compatibility_report / _inviter / _recipient) and are produced
 * by the decoded-compatibility-report edge function from both partners' corrected
 * assessment_reports + scores. Generation is INLINED in the edge fn (no src to
 * reuse), so we regenerate by driving the canonical edge fn with force_regenerate.
 *
 * The edge fn requires a member's JWT, so we mint the inviter's session via the
 * admin API (generateLink → verifyOtp; no email is sent) and call the fn once per
 * invite (one call regenerates BOTH per-user reports + the couples_report).
 *
 *   DRY-RUN (default): npx tsx scripts/regen-couples-reports.ts
 *   APPLY:             npx tsx scripts/regen-couples-reports.ts --apply [--limit=N]
 *
 * Reads creds from .env.local (service role + anon). Never logs secrets/tokens.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const URL_ = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !SERVICE || !ANON) throw new Error("Missing SUPABASE_URL / SERVICE_ROLE / ANON in .env.local");

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0");
const FN_URL = `${URL_}/functions/v1/decoded-compatibility-report`;

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

const tokenCache = new Map<string, string>();
async function mintToken(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink(${email}): ${error.message}`);
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error(`no hashed_token for ${email}`);
  const { data: v, error: vErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (vErr) throw new Error(`verifyOtp(${email}): ${vErr.message}`);
  const at = v.session?.access_token;
  if (!at) throw new Error(`no access_token for ${email}`);
  tokenCache.set(email, at);
  return at;
}

async function main() {
  console.log(`\n=== Regenerate couples/compatibility reports (${APPLY ? "APPLY" : "DRY-RUN"}) ===\n`);

  let { data: invites, error } = await admin
    .from("decoded_invites")
    .select("id, status, inviter_id, inviter_email, recipient_email")
    .in("status", ["consented", "connected"])
    .order("status");
  if (error) throw error;
  if (LIMIT > 0) invites = (invites ?? []).slice(0, LIMIT);

  let ok = 0;
  for (const inv of invites ?? []) {
    console.log(`${inv.id} (${inv.status}): ${inv.inviter_email} ↔ ${inv.recipient_email}`);
    if (!APPLY) continue;
    try {
      const token = await mintToken(inv.inviter_email);
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invite_id: inv.id, program: "relationship", force_regenerate: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && !body.cached) {
        ok++;
        console.log(`  ✓ regenerated (status ${res.status})`);
      } else {
        console.error(`  ✗ status ${res.status}${body.cached ? " (returned CACHED — force_regenerate not honored)" : ""}: ${JSON.stringify(body).slice(0, 200)}`);
      }
    } catch (e) {
      console.error(`  ✗ ${(e as Error).message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Invites scanned: ${invites?.length ?? 0}`);
  if (APPLY) console.log(`Regenerated: ${ok}`);
  else console.log(`DRY-RUN — re-run with --apply to regenerate.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
