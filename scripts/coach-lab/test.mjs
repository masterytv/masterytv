#!/usr/bin/env node
/**
 * Coach test harness runner (B.4). Ties together:
 *   1. the offline Tier-1 keyword battery (safety-battery.mjs)
 *   2. the scenario battery (scenarios.mjs) run through the real model, with
 *      deterministic hard/soft assertions (assertions.mjs)
 *   3. an advisory LLM judge (--judge) and cross-model diff (--both)
 *
 * GATE: exits NON-ZERO if the keyword battery fails OR any HARD assertion fails on
 * the primary model (claude = the relationship coach, which runs forceClaude). Soft
 * checks and the openai run are advisory (they warn, they don't block).
 *
 * Usage:
 *   node scripts/coach-lab/test.mjs                 # claude, hard gate
 *   node scripts/coach-lab/test.mjs --both          # + gpt-4o-mini cross-model diff
 *   node scripts/coach-lab/test.mjs --judge         # + advisory stance scores
 *   node scripts/coach-lab/test.mjs --update-snapshots
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SCENARIOS } from "./scenarios.mjs";
import { runChecks } from "./assertions.mjs";
import { RELATIONSHIP_SYSTEM, callModel, judge } from "./lib.mjs";
import { detectCrisisKeywords } from "../../supabase/functions/_shared/crisis-patterns.ts";

// Prod Tier-1 short-circuits explicit crisis/abuse with a canned resource reply
// (buildCrisisResponse / buildAbuseResponse) BEFORE the model runs. Mirror that so
// safety scenarios test the real user-facing guarantee, not the model in isolation.
const CANNED_CRISIS = "I'm really glad you told me. I'm an AI coach and this is beyond what I can help with. Please reach out — 988 Suicide & Crisis Lifeline (call or text 988), or Crisis Text Line (text HOME to 741741). If you're in immediate danger, call 911.";
const CANNED_DV = "Thank you for trusting me with this. I'm an AI coach and I won't coach or mediate a relationship where you feel unsafe. Please reach out — National Domestic Violence Hotline 1-800-799-7233, or text START to 88788, or thehotline.org. If you're in immediate danger, call 911.";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const runJudge = args.includes("--judge");
const updateSnap = args.includes("--update-snapshots");
const models = args.includes("--both")
  ? ["claude", "openai"]
  : args.find((a) => a.startsWith("--model="))?.split("=")[1]?.split(",") ?? ["claude"];

const GATE_MODEL = "claude"; // relationship coach forces Claude; only it gates.
let gateFails = 0;

// ── 1. Offline Tier-1 keyword battery (fast, deterministic) ──
console.log("── Tier-1 keyword battery ──");
try {
  execFileSync("node", [resolve(HERE, "safety-battery.mjs")], { stdio: "inherit" });
} catch {
  gateFails++;
  console.log("  ✗ keyword battery FAILED (gates deploy)\n");
}

// ── 2. Scenario battery ──
for (const model of models) {
  console.log(`\n────────── SCENARIOS · model=${model}${model === GATE_MODEL ? " (GATE)" : " (advisory)"} ──────────`);
  const snapDir = resolve(HERE, "snapshots", model);
  mkdirSync(snapDir, { recursive: true });

  for (const sc of SCENARIOS) {
    const messages = [];
    let reply = "";
    try {
      for (const turn of sc.turns) {
        messages.push({ role: "user", content: turn });
        // Mirror prod: Tier-1 keyword hard-stop short-circuits before the model.
        const k = detectCrisisKeywords(turn);
        reply = k.isCrisis
          ? (k.category === "abuse" ? CANNED_DV : CANNED_CRISIS)
          : await callModel(model, { system: RELATIONSHIP_SYSTEM, messages });
        messages.push({ role: "assistant", content: reply });
      }
    } catch (e) {
      console.log(`\n■ ${sc.id} — MODEL ERROR: ${e.message}`);
      if (model === GATE_MODEL) gateFails++;
      continue;
    }

    const hard = runChecks(sc.hard, reply);
    const soft = runChecks(sc.soft, reply);
    const hardFail = hard.filter((c) => !c.ok);
    const softFail = soft.filter((c) => !c.ok);

    const badge = hardFail.length ? "✗ HARD FAIL" : softFail.length ? "~ soft warn" : "✓ pass";
    console.log(`\n■ ${sc.id} — ${badge}  (${sc.desc})`);
    for (const c of hardFail) console.log(`    ✗ HARD  ${c.name}: ${c.detail}`);
    for (const c of softFail) console.log(`    ~ soft  ${c.name}: ${c.detail}`);

    if (model === GATE_MODEL && hardFail.length) gateFails += hardFail.length;

    // Snapshot (advisory drift signal)
    const snapPath = resolve(snapDir, `${sc.id}.txt`);
    if (updateSnap || !existsSync(snapPath)) {
      writeFileSync(snapPath, reply);
    } else if (readFileSync(snapPath, "utf8") !== reply) {
      console.log(`    · snapshot changed (${sc.id}) — review or --update-snapshots`);
    }

    if (runJudge) {
      const transcript = messages.map((m) => `${m.role === "assistant" ? "COACH" : "USER"}: ${m.content}`).join("\n");
      const j = await judge(transcript);
      if (j) console.log(`    judge: understand=${j.understood_before_solving} validate=${j.validated} oneQ=${j.one_question} voice=${j.human_voice} withheld=${j.withheld_premature_advice} — ${j.note ?? ""}`);
    }
  }
}

// ── 3. Verdict ──
console.log(`\n${"═".repeat(52)}`);
if (gateFails > 0) {
  console.log(`GATE FAILED — ${gateFails} hard failure(s) on ${GATE_MODEL}. Do not deploy.\n`);
  process.exit(1);
}
console.log("GATE PASSED — all hard assertions green.\n");
