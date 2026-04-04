/**
 * Seed Dashboard Test Data
 * 
 * Seeds realistic test data for all 4 dashboard pages:
 * - Commitments (S6.1)
 * - Coaching Letter (S6.2) 
 * - Progress Timeline (S6.3) — wins, patterns, completed commitments
 * - Coach Profile (S6.4) — 8-dimension communication style
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Run with: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-dashboard-data.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // 1. Find the user
  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id, email, name, subscription_tier");

  if (userErr) {
    console.error("Error fetching users:", userErr);
    process.exit(1);
  }

  console.log("Found users:", JSON.stringify(users, null, 2));

  if (!users || users.length === 0) {
    console.error("No users found. Please sign up first.");
    process.exit(1);
  }

  const user = users[0];
  const userId = user.id;
  console.log(`\nSeeding data for user: ${user.name} (${user.email})\n`);

  // ─── S6.1: COMMITMENTS ─────────────────────────────────────────────────
  console.log("📋 Seeding commitments...");

  const commitments = [
    {
      user_id: userId,
      type: "rock",
      description: "Close 3 new enterprise deals by end of Q2",
      due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: "active",
      follow_up_count: 2,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      user_id: userId,
      type: "action_item",
      description: "Schedule 1:1 with Chuck to discuss budget allocation",
      due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: "active",
      follow_up_count: 1,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      user_id: userId,
      type: "habit",
      description: "Begin each morning with 10-min journaling before email",
      due_date: null,
      status: "active",
      follow_up_count: 0,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      user_id: userId,
      type: "action_item",
      description: "Draft investor update email for board",
      due_date: new Date(Date.now() - 1 * 86400000).toISOString(),
      status: "active",
      follow_up_count: 3,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      user_id: userId,
      type: "goal",
      description: "Launch V2 product page with updated positioning",
      due_date: new Date(Date.now() + 21 * 86400000).toISOString(),
      status: "active",
      follow_up_count: 0,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    // Completed
    {
      user_id: userId,
      type: "action_item",
      description: "Finalize hiring criteria for VP of Sales role",
      status: "completed",
      completed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      user_id: userId,
      type: "action_item",
      description: "Set up weekly team standup cadence",
      status: "completed",
      completed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      user_id: userId,
      type: "rock",
      description: "Complete competitive analysis for Series A pitch",
      status: "completed",
      completed_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    // Missed
    {
      user_id: userId,
      type: "action_item",
      description: "Follow up with potential advisor re: go-to-market strategy",
      due_date: new Date(Date.now() - 4 * 86400000).toISOString(),
      status: "missed",
      follow_up_count: 2,
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
  ];

  const { error: cmErr } = await supabase.from("commitments").upsert(commitments);
  if (cmErr) console.error("  ❌ Commitments error:", cmErr.message);
  else console.log(`  ✅ ${commitments.length} commitments seeded`);

  // ─── S6.2: COACHING LETTER (via onboarding_state) ──────────────────────
  console.log("\n📝 Seeding coaching letter...");

  const coachingLetter = `# Welcome to Your Coaching Journey, ${user.name}

## What I've Learned About You

Based on our conversation and research, I can see you're a **founder navigating the critical transition from hands-on builder to strategic leader**. This is one of the most challenging — and rewarding — phases of any entrepreneurial journey.

### Your Strengths
- You have a clear vision and the technical ability to execute
- You're deeply committed to your team and product quality
- You bring genuine empathy to leadership, which builds loyalty

### Your Growth Edges
- **Delegation anxiety**: You tend to hold onto tasks because "it's faster if I do it myself" — this creates bottlenecks
- **Conflict avoidance with stakeholders**: Particularly with Chuck on budget allocation
- **Perfectionism in launches**: You've delayed two releases because they weren't "ready enough"

## How I'll Coach You

I'll use a blend of frameworks tailored to where you are:

- **EOS/Traction** for operational clarity — rocks, scorecards, accountability
- **GROW Model** when you're stuck on specific decisions
- **Stoic Philosophy** when perfectionism or anxiety creeps in
- **Narrative Coaching** when imposter syndrome surfaces

## Our First Priority

Let's start with the Chuck conversation. You've been avoiding it for three weeks, and it's blocking your Q2 rock. We'll use the GROW framework to prepare: what's the **Goal**, what's the **Reality**, what are your **Options**, and what **Will** you commit to?

*I'm here whenever you need me. Let's build something extraordinary together.*`;

  const { error: letterErr } = await supabase
    .from("onboarding_state")
    .upsert({
      user_id: userId,
      current_step: "complete",
      coaching_letter: coachingLetter,
      updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    });
  if (letterErr) console.error("  ❌ Coaching letter error:", letterErr.message);
  else console.log("  ✅ Coaching letter seeded");

  // ─── S6.2: MEMORY FACTS (confirmed research) ──────────────────────────
  console.log("\n🧠 Seeding memory facts...");

  const memoryFacts = [
    { category: "business", subject: "Company", content: "SaaS platform in the productivity/coaching space, pre-Series A", is_confirmed: true },
    { category: "person", subject: "Chuck", content: "CFO, controls budget allocation. Relationship is professional but strained over Q2 spending.", is_confirmed: true },
    { category: "goal", subject: "Series A", content: "Targeting $3M raise by end of 2026. Need stronger revenue metrics first.", is_confirmed: true },
    { category: "challenge", subject: "Delegation", content: "Struggles to delegate technical decisions, creating bottleneck as team grows.", is_confirmed: true },
    { category: "personal", subject: "Family", content: "Spouse and two kids. Values family time but frequently works late.", is_confirmed: true },
    { category: "pattern", subject: "Procrastination", content: "Tends to avoid difficult conversations, especially with authority figures.", is_confirmed: true },
    { category: "preference", subject: "Communication", content: "Prefers direct, data-driven feedback over emotional support.", is_confirmed: true },
    { category: "win", subject: "Product Launch", content: "Successfully launched V1 to first 100 beta users last month.", is_confirmed: true },
  ];

  const factsWithUser = memoryFacts.map((f) => ({ ...f, user_id: userId }));
  const { error: factsErr } = await supabase.from("memory_facts").upsert(factsWithUser);
  if (factsErr) console.error("  ❌ Memory facts error:", factsErr.message);
  else console.log(`  ✅ ${memoryFacts.length} memory facts seeded`);

  // ─── S6.3: USER ENTITIES (wins + patterns for timeline) ────────────────
  console.log("\n🏆 Seeding user entities (wins + patterns)...");

  const entities = [
    {
      user_id: userId,
      entity_type: "win",
      name: "Closed first enterprise deal ($48K ARR)",
      description: "Landed Acme Corp as the first enterprise customer. Validated the B2B pricing model.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      mention_count: 3,
    },
    {
      user_id: userId,
      entity_type: "win",
      name: "Shipped V1 to 100 beta users",
      description: "Hit the beta milestone ahead of schedule. 87% activation rate in first week.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      mention_count: 5,
    },
    {
      user_id: userId,
      entity_type: "win",
      name: "Had the hard conversation with Chuck",
      description: "Finally addressed the budget allocation issue. Agreed on a compromise for Q2 spending.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      mention_count: 2,
    },
    {
      user_id: userId,
      entity_type: "pattern",
      name: "Avoidance under stress",
      description: "When facing high-stakes conversations, you tend to over-prepare and delay. This happened with Chuck, the board update, and the product launch.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      mention_count: 4,
    },
    {
      user_id: userId,
      entity_type: "pattern",
      name: "Peak productivity in morning blocks",
      description: "Your best strategic thinking happens between 6-9am before meetings start. You consistently report breakthroughs during this window.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      mention_count: 2,
    },
    {
      user_id: userId,
      entity_type: "goal",
      name: "Close Series A by Q4 2026",
      description: "Need $3M at $15M pre-money. Targeting 3-5 enterprise deals first as proof points.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      attributes: JSON.stringify({ level: "annual", progress: 0.25, target_date: "2026-12-31" }),
    },
    {
      user_id: userId,
      entity_type: "person",
      name: "Chuck",
      description: "CFO. Controls budget. Professional but strained relationship over Q2 spending priorities.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      attributes: JSON.stringify({ relationship: "CFO", sentiment: "improving", ally_or_blocker: "neutral" }),
    },
    {
      user_id: userId,
      entity_type: "fear",
      name: "Imposter syndrome before investor meetings",
      description: "Recurring feeling of being 'found out' before high-stakes conversations with investors and board.",
      status: "active",
      first_mentioned_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  const { error: entErr } = await supabase.from("user_entities").upsert(entities);
  if (entErr) console.error("  ❌ User entities error:", entErr.message);
  else console.log(`  ✅ ${entities.length} user entities seeded`);

  // ─── S6.4: COACH PROFILE (8 dimensions) ────────────────────────────────
  console.log("\n🎯 Seeding coach profile...");

  const profile = {
    user_id: userId,
    directness: 0.72,
    framing: 0.65,
    warmth: 0.45,
    autonomy: 0.58,
    pacing: 0.70,
    evidence_style: 0.80,
    accountability: 0.75,
    challenge_level: 0.62,
    source: "behavioral",
    confidence: 0.68,
    trust_level: 3,
    promotion_focus: 0.65,
    prevention_focus: 0.35,
    avg_message_length: 142,
    action_completion_rate: 0.67,
    engagement_score: 0.78,
    framework_affinity: {
      GROW: 0.85,
      EOS: 0.72,
      Stoic: 0.60,
      MI: 0.55,
    },
  };

  // Check if profile exists first
  const { data: existingProfile } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingProfile) {
    const { error: cpErr } = await supabase
      .from("coach_profiles")
      .update(profile)
      .eq("user_id", userId);
    if (cpErr) console.error("  ❌ Coach profile error:", cpErr.message);
    else console.log("  ✅ Coach profile updated");
  } else {
    const { error: cpErr } = await supabase
      .from("coach_profiles")
      .insert(profile);
    if (cpErr) console.error("  ❌ Coach profile error:", cpErr.message);
    else console.log("  ✅ Coach profile created");
  }

  console.log("\n✨ Dashboard seeding complete! Check each page:");
  console.log("  → /coachapp/dashboard/commitments");
  console.log("  → /coachapp/dashboard/coaching-letter");
  console.log("  → /coachapp/dashboard/progress");
  console.log("  → /coachapp/dashboard/settings (Coach Profile section)");
}

main().catch(console.error);
