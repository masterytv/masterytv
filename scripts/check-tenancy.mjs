#!/usr/bin/env node
/**
 * check-tenancy.mjs — the TENANCY gate (TENANCY_AUDIT.md T0, the item the
 * original T1–T7 list missed and the only one that stops the class that has
 * actually bitten this project three times: conversations 2026-07-15,
 * assessments 2026-07-16, invites 2026-07-16).
 *
 * The recurring bug: a user-data table has no program column, or a read
 * filters by user_id alone — so a dual-brand user's data crosses verticals
 * SILENTLY, and "the founder notices" is the only detection. This gate turns
 * that into "CI notices". Two assertions:
 *
 *   (1) COMPLETENESS — every table CREATEd in supabase/migrations/ must be
 *       categorized below. A new table fails the build until a human decides
 *       its tenancy shape (the decision the pre-detour engine never made).
 *
 *   (2) SCOPED READS — for every PROGRAM_SCOPED table, any query chain that
 *       filters by user_id must ALSO carry a program/parent scope
 *       (.eq("program"…), programScope(…), engagement/conversation/assessment
 *       ids). `user_id` alone is not brand isolation — the restated durable
 *       rule from the assessments incident.
 *
 * Static-analysis honesty: (2) inspects the ~600 chars after each .from()
 * call, so a scope applied far away (or via a variable) can false-positive —
 * fix by scoping inline or allowlisting with a justification. It also only
 * keys on `user_id` filters; reads keyed by other user-pointing columns
 * (inviter_id/recipient_id) are reviewed manually (see INVITE_PROGRAM_DESIGN
 * §6.4 for the invite rule: a route acting on a specific invite reads program
 * OFF THE INVITE ROW).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = process.cwd();

// ── The tenancy map. Adding a table to the DB means adding it here. ──

// Tables that carry a `program` column. user_id-filtered reads MUST scope.
const PROGRAM_SCOPED = [
  "conversations",        // 2026-07-15 (cross-brand chat bleed)
  "assessments",          // 2026-07-16 PC2.1
  "assessment_reports",   // 2026-07-16 PC2.1
  "crisis_flags",         // 2026-07-14 PC5
  "decoded_invites",      // 2026-07-16 PC2.1h
  "memory_facts",         // 2026-07-16 PC2.2
  "coach_profiles",       // 2026-07-16 PC2.2
  "coach_profile_history",// 2026-07-16 PC2.2
  "money_decisions",      // 2026-07-18 Decision Room (money §8) — decision log
];

// Tenancy flows through a parent FK (assessment_id / conversation_id /
// report_id / engagement_id) — scoping the parent scopes the child.
const CHILD_SCOPED = [
  "assessment_scores", "assessment_progress", "assessment_responses",
  "assessment_profiles", "assessment_report_versions",
  "messages", "conversation_summaries",
  "participant", "engagement_activity", "engagement_artifact",
  "accountability_link", "ritual_responses", "ritual_settings",
];

// The polymorphic spine + platform config — program-aware by construction.
const SPINE = ["workspace", "program", "engagement", "entry_segment", "ritual_prompts"];

// Reviewed exemptions. Every entry needs a reason; "revisit at career" means
// the exemption is a deliberate single-vertical assumption that must be
// re-decided before the career vertical ships (VERTICAL_PLAYBOOK §5).
const EXEMPT = {
  users: "shared identity across verticals BY DESIGN (STRATEGY: one account, many programs)",
  organizations: "workspace-level, pre-detour B2B remnant",
  shows: "pre-detour MasteryTV content catalog, single-brand",
  ai_tools: "executive-coach tool catalog — revisit at career",
  commitments: "executive-only machinery (module gated off relatti) — revisit at career",
  coaching_challenges: "executive-only machinery — revisit at career",
  coaching_agenda: "executive-only machinery — revisit at career",
  onboarding_state: "executive onboarding is the only writer (Relatti uses /assess) — revisit at career",
  user_entities: "executive onboarding artifact — revisit at career",
  fact_cache: "executive research cache — revisit at career",
  framework_config: "global coaching-framework catalog (not user data)",
  framework_usage: "executive framework telemetry — revisit at career",
  coach_message_usage: "billing counter, deliberately cross-vertical (one message cap per user)",
  nagging_tracker: "per-channel send throttle, program lives on the message context",
  scheduled_messages: "program/brand ride in context JSONB (PC5); delivery resolves per message",
  telegram_connect_tokens: "channel plumbing, no coached content",
  voice_feedback: "coach-voice module is general-only (modules.ts)",
  cost_tracking: "program stamped in metadata JSONB (PC5.5); admin derives per-brand spend",
  error_log: "operational telemetry",
  admin_audit_log: "operational telemetry",
  report_events: "share/viral telemetry, brand in payload where needed",
  share_unlocks: "Decoded viral mechanics telemetry",
  viral_events: "Decoded viral mechanics telemetry (brand stamped in metadata)",
  email_signups: "pre-detour landing capture",
  contacts: "marketing CRM, brand column exists on contact tables where needed",
  contact_events: "marketing CRM telemetry",
  contact_lists: "marketing CRM",
  contact_subscriptions: "marketing CRM",
  feedback: "workspace-scoped (E1 spine column)",
  beta_surveys: "Relatti beta instrument, single-program by definition",
  beta_invite_codes: "Relatti beta admission, single-program by definition",
};

// Files allowed to read PROGRAM_SCOPED tables by user_id alone.
const READ_ALLOW = {
  "supabase/functions/export-user-data/index.ts": "GDPR-style FULL export — cross-program by definition",
  "supabase/functions/delete-user-data/index.ts": "account deletion — cross-program by definition",
  "supabase/functions/admin-data/index.ts": "internal admin debug view (latest-updated profile; per-program view is future work)",
  "src/lib/relatti/funnel.ts": "admin beta-funnel aggregation (single-program cohort)",
};

const ALL_KNOWN = new Set([
  ...PROGRAM_SCOPED, ...CHILD_SCOPED, ...SPINE, ...Object.keys(EXEMPT),
]);

// ── (1) completeness: parse CREATE TABLE from migrations ──
const migDir = join(ROOT, "supabase", "migrations");
const created = new Set();
for (const f of readdirSync(migDir)) {
  if (!f.endsWith(".sql")) continue;
  const sql = readFileSync(join(migDir, f), "utf8");
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
    created.add(m[1].toLowerCase());
  }
}
const uncategorized = [...created].filter((t) => !ALL_KNOWN.has(t));

// ── (2) scoped reads over PROGRAM_SCOPED tables ──
const FROM_RE = new RegExp(
  `\\.from\\(\\s*["'](${PROGRAM_SCOPED.join("|")})["']\\s*\\)`,
  "g",
);
const USER_FILTER = /\beq\(\s*["']user_id["']/;
const SCOPE_TOKEN =
  // reads: an explicit program / parent-id filter in the chain
  // writes: a `program:` key (or shorthand `program,`) stamped in the payload
  /\beq\(\s*["']program["']|programScope\(|resolveBrandClient\(\)\.programSlug|\beq\(\s*["'](engagement_id|conversation_id|assessment_id|id)["']|match_program|\bprogram\s*:|\bprogram\s*,/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield full;
  }
}

const violations = [];
for (const base of ["src", join("supabase", "functions")]) {
  for (const file of walk(join(ROOT, base))) {
    const rel = file.slice(ROOT.length + 1).split(sep).join("/");
    if (READ_ALLOW[rel]) continue;
    const code = readFileSync(file, "utf8");
    let m;
    FROM_RE.lastIndex = 0;
    while ((m = FROM_RE.exec(code)) !== null) {
      const window = code.slice(m.index, m.index + 600);
      if (USER_FILTER.test(window) && !SCOPE_TOKEN.test(window)) {
        const line = code.slice(0, m.index).split("\n").length;
        violations.push(`${rel}:${line}  .from("${m[1]}") filters user_id without a program/parent scope`);
      }
    }
  }
}

let failed = false;
if (uncategorized.length) {
  failed = true;
  console.error(`Tenancy gate FAILED — ${uncategorized.length} table(s) not categorized in scripts/check-tenancy.mjs:\n`);
  for (const t of uncategorized) console.error(`  ${t}`);
  console.error(
    `\nEvery table must declare its tenancy shape: PROGRAM_SCOPED (carries program),` +
    `\nCHILD_SCOPED (scoped via parent FK), SPINE, or EXEMPT (with a written reason).`,
  );
}
if (violations.length) {
  failed = true;
  console.error(`\nTenancy gate FAILED — ${violations.length} unscoped read(s) of program-scoped tables:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `\n"user_id alone is not brand isolation." Add .eq("program", …) / programScope(…)` +
    `\nor an id/parent filter to the chain — or allowlist the FILE in READ_ALLOW with a reason.`,
  );
}
if (failed) process.exit(1);

console.log(
  `Tenancy gate passed — ${created.size} tables categorized ` +
  `(${PROGRAM_SCOPED.length} program-scoped, ${CHILD_SCOPED.length} child-scoped, ${SPINE.length} spine, ${Object.keys(EXEMPT).length} exempt), ` +
  `all user_id reads of program-scoped tables carry a scope.`,
);
