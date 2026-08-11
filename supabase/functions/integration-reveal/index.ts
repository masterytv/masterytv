/**
 * `integration-reveal` — the I1.5 bench, in a browser.
 *
 * Sprint 0 needs 5–10 real experiencers to read a matched retrieval and answer
 * one question: *did this make you feel less alone, or studied?*
 * `npm run corpus:probe` answers it in a terminal, which is fine for the
 * founder and wrong for a session with somebody who has just written down the
 * strangest hour of their life. This is the same bridge with a page in front.
 *
 * ─── WHAT THIS IS NOT ─────────────────────────────────────────────────────
 *
 * **Not the coach.** No LLM generates a single word here: the only model call
 * is an embedding, and everything returned is corpus text under the provenance
 * contract. That is deliberate and it is what makes this safe to run before I3
 * (memory-write filter, crisis patterns, output auditor) and I5.5 (consent)
 * exist. A chat interface would need all of them first — INTEGRATION_SPRINT.md
 * §3 puts I3 ahead of I5 precisely so this order cannot be reversed by
 * convenience.
 *
 * **Not a surface for the vertical.** No ProgramId, no brand, no pack. It is an
 * operator tool on the existing admin surface, and I1's exit is still a founder
 * decision rather than a deploy.
 *
 * **Not storage.** The account text is embedded, matched against, and dropped.
 * Nothing is written to any table, here or on the corpus project. The people
 * this is for have spent years being told their experience is a symptom; the
 * product's first act should not be filing it.
 *
 * ─── ACCESS ───────────────────────────────────────────────────────────────
 *
 * Admin or superadmin only, checked server-side against `users.role` — the
 * founder drives the session and pastes the account. Self-serve testers would
 * need the consent screen (I5.5), the 18+ gate and the state blocklist
 * (I11.2–3), which exist to protect exactly this population.
 *
 * Deploy WITH JWT verification (the default — no `--no-verify-jwt`), and set
 * PROFOUND_URL + PROFOUND_SERVICE_KEY as edge secrets first:
 *
 *   supabase secrets set PROFOUND_URL=… PROFOUND_SERVICE_KEY=…
 *   supabase functions deploy integration-reveal
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { findSimilarAccounts, isFounder } from "../_shared/corpus.ts";
import { integrationEngineEnabled } from "../_shared/flags.ts";

const FUNCTION_NAME = "integration-reveal";

/** EXPERIENCE §5.4 shows nine. */
const REVEAL_ACCOUNTS = 9;
const MAX_ACCOUNT_CHARS = 20000;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Only POST is allowed" }, 405);

  try {
    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: authError } = await authed.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or missing JWT" }, 401);

    // Role read with the service key: the operator check must not depend on a
    // policy that a future RLS change could widen.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superadmin"].includes(profile.role as string)) {
      console.warn(`[${FUNCTION_NAME}] Non-admin ${user.id} attempted the bench`);
      return json({ error: "Admins only." }, 403);
    }
    if (!integrationEngineEnabled(user.id)) {
      return json({ error: "INTEGRATION_ENGINE is off for this account." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const account = String(body.account ?? "").trim();
    if (!account) return json({ error: "Paste an account first." }, 400);
    if (account.length > MAX_ACCOUNT_CHARS) {
      return json({ error: `Accounts are capped at ${MAX_ACCOUNT_CHARS} characters.` }, 400);
    }

    const result = await findSimilarAccounts(account, {
      limit: REVEAL_ACCOUNTS,
      withTransformation: true,
    });

    // Analyst prose reaches the founder and nobody else (I1, founder decision).
    // Same rule as the coach path, applied at the same boundary: what a viewer
    // is not given cannot be shown to the person sitting next to them.
    const showAnalysis = isFounder(user.email);

    console.log(
      `[${FUNCTION_NAME}] ${result.accounts.length} accounts, ${result.claims.length} claims, ` +
        `${result.excluded_non_english} non-English dropped, ${result.took_ms}ms`,
    );

    return json({
      matched_count: result.matched_count,
      excluded_non_english: result.excluded_non_english,
      took_ms: result.took_ms,
      claims: result.claims.map((c) => ({ index: c.index, text: c.text })),
      claim_matches: result.claim_matches,
      accounts: result.accounts.map((a) => ({
        source: a.source,
        similarity: a.similarity,
        matched_claim: a.matched_claim,
        excerpt_scope: a.excerpt_scope,
        excerpt: a.excerpt,
      })),
      domain_directions: result.domain_directions,
      accounts_with_transformation: result.accounts_with_transformation,
      corpus_analysis: showAnalysis
        ? result.accounts.map((a) => ({
          video_id: a.source.video_id,
          notes: a.transformation?.integration_notes?.text ?? null,
        })).filter((n) => n.notes)
        : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[${FUNCTION_NAME}] ${message}`);
    return json({ error: message }, 500);
  }
});
