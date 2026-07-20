/**
 * PC4.1 — Fixed fixtures for the prompt-snapshot goldens.
 *
 * Each scenario is a frozen database: a map of table → rows (or a function of
 * the PostgREST query params, for tables the assembler queries in more than one
 * shape). prompt-snapshot.ts serves these through a fake PostgREST server so
 * the REAL assemblePrompt() runs against them, and the resulting system prompt
 * is locked byte-for-byte in goldens/.
 *
 * Determinism rules for fixture data:
 * - Every timestamp is at T12:00:00Z (± minutes) so toLocaleDateString renders
 *   the same calendar day in UTC (CI) and US timezones (local dev).
 * - assessment_reports rows always set generated_at (buildAssessmentProfile
 *   falls back to new Date() without it).
 * - Rows for list queries are pre-sorted the way the real query would return
 *   them (the fake server ignores order/limit params).
 */

export type TableFixture =
  | Record<string, unknown>[]
  | ((params: URLSearchParams) => Record<string, unknown>[]);

export interface Scenario {
  name: string;
  userId: string;
  userMessage: string;
  program: string | null;
  mode: string | null;
  engagementId: string | null;
  conversationId: string | null;
  /** Coverage guards: the golden must contain these… */
  mustInclude: string[];
  /** …and must NOT contain these (cross-vertical bleed detector). */
  mustExclude: string[];
  tables: Record<string, TableFixture>;
}

// ─── Executive (MasteryTV) — full layer stack ───────────────────────────

const EXEC_USER = "11111111-1111-4111-8111-111111111101";
const EXEC_ASSESSMENT = "11111111-1111-4111-8111-1111111111a1";

const EXEC_TABLES: Record<string, TableFixture> = {
  assessments: [{ id: EXEC_ASSESSMENT }],
  users: [
    {
      id: EXEC_USER,
      name: "Alex",
      email: "alex@fixture.test",
      timezone: "America/New_York",
      preferred_channel: "email",
      subscription_tier: "mastery",
      ai_tools: [
        { name: "Claude", proficiency: "advanced" },
        { name: "Notion AI" },
      ],
    },
  ],
  coach_profiles: [
    {
      directness: 8,
      framing: 5,
      warmth: 3,
      autonomy: 8,
      pacing: 5,
      evidence_style: 2,
      accountability: 8,
      challenge_level: 8,
      trust_level: 6,
      framework_affinity: {},
    },
  ],
  coaching_challenges: [
    {
      id: "11111111-1111-4111-8111-1111111111c1",
      title: "Delegate the sales pipeline",
      framework: "GROW",
      framework_phase: "Options",
      status: "active",
    },
    {
      id: "11111111-1111-4111-8111-1111111111c2",
      title: "Hire a COO",
      framework: "OSKAR",
      framework_phase: "Scaling",
      status: "active",
    },
  ],
  framework_config: [
    { name: "GROW", phases: ["Goal", "Reality", "Options", "Will"] },
    { name: "OSKAR", phases: ["Outcome", "Scaling", "Know-how", "Affirm", "Review"] },
  ],
  // Descending created_at, as the real query returns them.
  messages: [
    { role: "coach", content: "What would delegating the pipeline actually free you up to do?", created_at: "2026-07-08T12:03:00Z" },
    { role: "user", content: "I keep ending up back in the sales weeds every week.", created_at: "2026-07-08T12:02:00Z" },
    { role: "coach", content: "Good to see you back. Where do you want to pick up?", created_at: "2026-07-08T12:01:00Z" },
    { role: "user", content: "Hey coach.", created_at: "2026-07-08T12:00:00Z" },
  ],
  memory_facts: [
    { category: "business", subject: "Company", content: "Runs a 12-person B2B SaaS agency, ~$1.8M ARR.", importance: 9 },
    { category: "goal", subject: "Exit", content: "Wants the business sellable within 3 years.", importance: 8 },
    { category: "pattern", subject: "Delegation", content: "Takes tasks back from the team when quality dips instead of coaching them.", importance: 7 },
  ],
  coaching_agenda: [
    {
      priority_topic: "Deciding on the COO hire",
      coaching_questions: [
        "What would have to be true for Alex to trust someone else with the pipeline?",
        "Where is the hesitation on the COO hire actually coming from?",
      ],
    },
  ],
  conversation_summaries: [
    {
      summary: "Explored why delegation keeps failing; Alex noticed the pattern of taking work back at the first quality dip.",
      key_topics: ["delegation", "quality control"],
      framework_used: "GROW",
      message_count: 18,
      first_message_at: "2026-07-01T12:00:00Z",
      last_message_at: "2026-07-01T12:45:00Z",
    },
    {
      summary: "Mapped the COO hire decision; fear of losing founder-level client relationships surfaced.",
      key_topics: ["hiring", "COO"],
      framework_used: null,
      message_count: 12,
      first_message_at: "2026-06-24T12:00:00Z",
      last_message_at: "2026-06-24T12:30:00Z",
    },
  ],
  ai_tools: [
    {
      name: "Claude",
      category: ["writing", "analysis"],
      cost_model: "subscription",
      description: "General-purpose assistant strong at long-form reasoning.",
      strengths: ["writing", "strategy docs"],
      when_to_recommend: "Drafting, synthesis, thinking out loud.",
    },
    {
      name: "Zapier",
      category: ["automation"],
      cost_model: "freemium",
      description: "No-code workflow automation between apps.",
      strengths: ["gluing tools together"],
      when_to_recommend: "Repetitive multi-app workflows.",
    },
  ],
  assessment_scores: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${EXEC_ASSESSMENT}`) {
      return [
        {
          instrument_id: "ipip50",
          total_score: 178,
          subscale_scores: { openness: 4.1, conscientiousness: 4.4, extraversion: 3.2, agreeableness: 2.9, neuroticism: 2.4 },
          percentile_scores: { openness: 78, conscientiousness: 82, extraversion: 48, agreeableness: 22, neuroticism: 30 },
          interpretation: {},
        },
        {
          instrument_id: "ecr_r_short",
          total_score: 0,
          subscale_scores: { anxiety: 2.1, avoidance: 3.4 },
          percentile_scores: {},
          interpretation: { attachmentStyle: "secure" },
        },
        {
          instrument_id: "ders16",
          total_score: 34,
          subscale_scores: { clarity: 1.8, impulse: 1.5, goals: 2.9, nonAcceptance: 1.6, strategies: 2.0 },
          percentile_scores: {},
          interpretation: {},
        },
      ];
    }
    return [];
  },
  assessment_reports: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${EXEC_ASSESSMENT}`) {
      return [
        {
          archetype_base: "The Strategist",
          archetype_sublabel: "The Visionary Strategist",
          archetype_tagline: "Sees the system, builds the machine.",
          generated_at: "2026-06-20T12:00:00Z",
        },
      ];
    }
    return [];
  },
  participant: [],
  decoded_invites: [],
};

// ─── Relationship (Relatti) solo — no dyad connected ─────────────────────

const SOLO_USER = "22222222-2222-4222-8222-222222222202";
const SOLO_ASSESSMENT = "22222222-2222-4222-8222-2222222222a2";
const SOLO_CONVERSATION = "22222222-2222-4222-8222-2222222222f2";

const SOLO_TABLES: Record<string, TableFixture> = {
  assessments: [{ id: SOLO_ASSESSMENT }],
  users: [
    {
      id: SOLO_USER,
      name: "Sam",
      email: "sam@fixture.test",
      timezone: "America/New_York",
      preferred_channel: "email",
      subscription_tier: "premium",
      ai_tools: [],
    },
  ],
  coach_profiles: [
    {
      directness: 5,
      framing: 5,
      warmth: 5,
      autonomy: 5,
      pacing: 5,
      evidence_style: 5,
      accountability: 5,
      challenge_level: 5,
      trust_level: 1,
      framework_affinity: {},
    },
  ],
  coaching_challenges: [],
  framework_config: [],
  messages: [
    { role: "coach", content: "How long has it felt this way?", created_at: "2026-07-10T12:03:00Z" },
    { role: "user", content: "We barely talk in the evenings anymore. It feels like we're roommates.", created_at: "2026-07-10T12:02:00Z" },
    { role: "coach", content: "I'm glad you're here. What's on your mind?", created_at: "2026-07-10T12:01:00Z" },
    { role: "user", content: "Hi.", created_at: "2026-07-10T12:00:00Z" },
  ],
  memory_facts: [
    { category: "relationship", subject: "Evenings", content: "Feels the evenings have gone silent; misses feeling chosen.", importance: 8 },
    { category: "relationship", subject: "Partner", content: "Partner works late most weeknights.", importance: 6 },
  ],
  coaching_agenda: [],
  conversation_summaries: [
    {
      summary: "Named the roommate feeling for the first time; underneath it was a fear of not mattering.",
      key_topics: ["distance", "evenings"],
      framework_used: null,
      message_count: 14,
      first_message_at: "2026-07-03T12:00:00Z",
      last_message_at: "2026-07-03T12:40:00Z",
    },
  ],
  ai_tools: [],
  assessment_scores: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${SOLO_ASSESSMENT}`) {
      return [
        {
          instrument_id: "ipip50",
          total_score: 162,
          subscale_scores: { openness: 3.6, conscientiousness: 3.1, extraversion: 3.9, agreeableness: 4.3, neuroticism: 3.8 },
          percentile_scores: { openness: 60, conscientiousness: 40, extraversion: 66, agreeableness: 80, neuroticism: 70 },
          interpretation: {},
        },
        {
          instrument_id: "ecr_r_short",
          total_score: 0,
          subscale_scores: { anxiety: 5.2, avoidance: 2.8 },
          percentile_scores: {},
          interpretation: { attachmentStyle: "anxious" },
        },
      ];
    }
    return [];
  },
  assessment_reports: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${SOLO_ASSESSMENT}`) {
      return [
        {
          archetype_base: "The Devoted",
          archetype_sublabel: "The Devoted Heart",
          archetype_tagline: "Loves deeply, needs the bond to feel safe.",
          generated_at: "2026-06-28T12:00:00Z",
          // Report vocabulary source — content_markdown is a JSON string,
          // exactly as decoded-generate-report stores it.
          sections: {
            S1: {
              title: "You at a Glance",
              min_tier: "free",
              content_markdown: JSON.stringify({
                tldr: "You love with your whole chest, and you're learning to keep some of it for yourself.",
                top_strengths: [
                  { label: "Loyal Anchor", description: "You stay when it matters, and people build on that." },
                  { label: "Emotional Radar", description: "You read a room's undercurrent before anyone names it." },
                  { label: "Generous Heart", description: "You give first and ask questions later." },
                ],
                growth_edges: [
                  { label: "The Overgiving Loop" },
                  { label: "Silent Scorekeeping" },
                  { label: "Fear of the Ask" },
                ],
              }),
            },
            S2: {
              title: "Your Personality",
              min_tier: "free",
              content_markdown: JSON.stringify({
                trait_cards: [
                  { trait_name: "Agreeableness", label: "The Peacemaker" },
                  { trait_name: "Neuroticism", label: "The Deep Feeler" },
                ],
                signature_pattern: {
                  name: "The Harmony Reflex",
                  description: "High agreeableness plus deep feeling means conflict registers as danger before it registers as information.",
                },
              }),
            },
            S8: {
              title: "Your Growth Map",
              min_tier: "mastery",
              content_markdown: JSON.stringify({
                growth_edges: [
                  { priority: 1, title: "Ask Before You Ache" },
                  { priority: 2, title: "Let Them Hold Some Weight" },
                ],
                thirty_day_challenge: "Once a day, name one need out loud before doing a favor.",
              }),
            },
            // An errored section must be skipped, never leak into the prompt.
            S5: {
              title: "Your Relationships",
              min_tier: "insight",
              error: "OpenAI API error (429): quota",
              content_markdown: "_This section could not be generated. Please try again._",
            },
          },
        },
      ];
    }
    return [];
  },
  participant: (params: URLSearchParams) => {
    // The assembler's coach-visibility read; the dyad spine query gets nothing.
    if ((params.get("select") ?? "").includes("coach_share_level")) {
      return [{ coach_share_level: "full" }];
    }
    return [];
  },
  decoded_invites: [],
};

// ─── Relationship (Relatti) dyad — spine-connected couple ────────────────

const DYAD_USER = "33333333-3333-4333-8333-333333333303";
const DYAD_PARTNER = "44444444-4444-4444-8444-444444444404";
const DYAD_ASSESSMENT = "33333333-3333-4333-8333-3333333333a3";
const DYAD_ENGAGEMENT = "33333333-3333-4333-8333-3333333333e3";
const DYAD_PARTNER_REPORT = "44444444-4444-4444-8444-4444444444b4";
const DYAD_PARTNER_ASSESSMENT = "44444444-4444-4444-8444-4444444444a4";
const DYAD_CONVERSATION = "33333333-3333-4333-8333-3333333333f3";

const DYAD_TABLES: Record<string, TableFixture> = {
  assessments: [{ id: DYAD_ASSESSMENT }],
  // id-aware: dyad-context resolves the PARTNER's display name from users.name
  // (service role) — an unfiltered array would hand back Sam's row for the
  // partner query and the coach would call the partner "Sam".
  users: (params: URLSearchParams) => {
    if (params.get("id") === `eq.${DYAD_PARTNER}`) {
      return [{ id: DYAD_PARTNER, name: "Jordan" }];
    }
    return [
      {
        id: DYAD_USER,
        name: "Sam",
        email: "sam@fixture.test",
        timezone: "America/New_York",
        preferred_channel: "email",
        subscription_tier: "premium",
        ai_tools: [],
      },
    ];
  },
  coach_profiles: [
    {
      directness: 5,
      framing: 5,
      warmth: 5,
      autonomy: 5,
      pacing: 5,
      evidence_style: 5,
      accountability: 5,
      challenge_level: 5,
      trust_level: 2,
      framework_affinity: {},
    },
  ],
  coaching_challenges: [],
  framework_config: [],
  messages: [
    { role: "coach", content: "When Jordan goes quiet, what happens for you?", created_at: "2026-07-11T12:02:00Z" },
    { role: "user", content: "We had the same fight about the weekend again.", created_at: "2026-07-11T12:01:00Z" },
    { role: "user", content: "Hey.", created_at: "2026-07-11T12:00:00Z" },
  ],
  memory_facts: [
    { category: "relationship", subject: "The cycle", content: "Sam pushes to talk it out immediately; Jordan needs space first.", importance: 9 },
    { category: "relationship", subject: "Weekends", content: "Recurring conflict about how much weekend time is spent together.", importance: 7 },
  ],
  coaching_agenda: [],
  conversation_summaries: [
    {
      summary: "Mapped the pursue-withdraw loop around weekend plans; Sam saw their own pursuit for the first time.",
      key_topics: ["pursue-withdraw", "weekends"],
      framework_used: null,
      message_count: 16,
      first_message_at: "2026-07-04T12:00:00Z",
      last_message_at: "2026-07-04T12:35:00Z",
    },
  ],
  ai_tools: [],
  assessment_scores: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${DYAD_ASSESSMENT}`) {
      return [
        {
          instrument_id: "ipip50",
          total_score: 162,
          subscale_scores: { openness: 3.6, conscientiousness: 3.1, extraversion: 3.9, agreeableness: 4.3, neuroticism: 3.8 },
          percentile_scores: { openness: 60, conscientiousness: 40, extraversion: 66, agreeableness: 80, neuroticism: 70 },
          interpretation: {},
        },
        {
          instrument_id: "ecr_r_short",
          total_score: 0,
          subscale_scores: { anxiety: 5.2, avoidance: 2.9 },
          percentile_scores: {},
          interpretation: { attachmentStyle: "anxious" },
        },
      ];
    }
    if (params.get("instrument_id") === "eq.ecr_r_short") {
      if (params.get("user_id") === `eq.${DYAD_USER}`) {
        return [{ subscale_scores: { anxiety: 5.2, avoidance: 2.9 } }];
      }
      if (params.get("user_id") === `eq.${DYAD_PARTNER}`) {
        return [{ subscale_scores: { anxiety: 2.2, avoidance: 5.1 } }];
      }
    }
    // Partner's scored instruments — shared with the coach at share level
    // "full" (the user can already see these numbers on their own screen).
    if (params.get("assessment_id") === `eq.${DYAD_PARTNER_ASSESSMENT}`) {
      return [
        {
          instrument_id: "ipip50",
          total_score: 148,
          percentile_scores: { openness: 45, conscientiousness: 85, extraversion: 30, agreeableness: 55, neuroticism: 25 },
          interpretation: null,
        },
      ];
    }
    return [];
  },
  assessment_reports: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${DYAD_ASSESSMENT}`) {
      return [
        {
          archetype_base: "The Devoted",
          archetype_sublabel: "The Devoted Heart",
          archetype_tagline: "Loves deeply, needs the bond to feel safe.",
          generated_at: "2026-06-28T12:00:00Z",
        },
      ];
    }
    if (params.get("id") === `eq.${DYAD_PARTNER_REPORT}`) {
      return [
        {
          archetype_base: "The Independent",
          archetype_sublabel: "The Steady Independent",
          archetype_tagline: "Finds calm in space, loyal at the core.",
          assessment_id: DYAD_PARTNER_ASSESSMENT,
          sections: {
            S1: { content_markdown: "Jordan steadies under pressure by stepping back, and shows love through reliability more than words." },
          },
        },
      ];
    }
    return [];
  },
  participant: (params: URLSearchParams) => {
    const select = params.get("select") ?? "";
    if (select.includes("coach_share_level")) {
      return [{ coach_share_level: "full" }];
    }
    if (params.get("engagement_id") === `eq.${DYAD_ENGAGEMENT}`) {
      return [
        {
          role: "inviter",
          user_id: DYAD_USER,
          invited_email: null,
          report_id: null,
          share_level: "full",
          status: "active",
        },
        {
          role: "invited",
          user_id: DYAD_PARTNER,
          invited_email: "jordan@fixture.test",
          report_id: DYAD_PARTNER_REPORT,
          share_level: "full",
          status: "active",
        },
      ];
    }
    if (params.get("user_id") === `eq.${DYAD_USER}`) {
      return [
        {
          engagement_id: DYAD_ENGAGEMENT,
          role: "inviter",
          engagement: {
            id: DYAD_ENGAGEMENT,
            kind: "relationship_dyad",
            status: "active",
            created_at: "2026-06-25T12:00:00Z",
          },
        },
      ];
    }
    return [];
  },
  engagement_artifact: [
    {
      content: {
        compatibility_report: {
          headline: "A pursue-withdraw pair with real warmth underneath",
          chemistry: "Sam brings emotional voltage; Jordan brings steadiness.",
          friction: "Under stress, Sam reaches while Jordan retreats, and each read confirms the other's fear.",
          superpower: "When both feel safe, they repair faster than most couples.",
          watch_out: "Scorekeeping about weekend time.",
        },
      },
    },
  ],
  accountability_link: [{ status: "active" }],
  decoded_invites: [],
};

// ─── Money (MoneyTraits™) solo — post-quiz, the reveal moment ─────────────

const MONEY_USER = "55555555-5555-4555-8555-555555555505";
const MONEY_ASSESSMENT = "55555555-5555-4555-8555-5555555555a5";
const MONEY_CONVERSATION = "55555555-5555-4555-8555-5555555555f5";

// The scored bundle the money assessment stores on its report row
// (assessment_reports.sections.money_map). These exact values are boundary
// case 1 in money-maps-scoring.mjs / money-maps.test.ts — "The Relentless
// Builder", High LEAP, success-tilted — so the fixture and the scorer agree.
const MONEY_MAP_BUNDLE = {
  archetype: "The Relentless Builder",
  dominant: "DRIVE",
  secondary: "GUARD",
  edge: "high-output founder, ambition with brakes",
  leak: "the moving goalpost; can't enjoy the climb",
  dims: { GUARD: 4.33, DRIVE: 5, MIRROR: 2.33, SHADOW: 3.33, LEAP: 4 },
  overclocked: ["GUARD", "DRIVE"],
  leap: { score: 4, band: "High", tilt: "fear-of-success", failFacet: 3, succFacet: 5 },
};

const MONEY_TABLES: Record<string, TableFixture> = {
  assessments: [{ id: MONEY_ASSESSMENT }],
  users: [
    {
      id: MONEY_USER,
      name: "Riley",
      email: "riley@fixture.test",
      timezone: "America/New_York",
      preferred_channel: "email",
      subscription_tier: "premium",
      ai_tools: [],
    },
  ],
  coach_profiles: [
    {
      directness: 5,
      framing: 5,
      warmth: 5,
      autonomy: 5,
      pacing: 5,
      evidence_style: 5,
      accountability: 5,
      challenge_level: 5,
      trust_level: 1,
      framework_affinity: {},
    },
  ],
  coaching_challenges: [],
  framework_config: [],
  messages: [
    { role: "user", content: "ok, finished the quiz. what's the read?", created_at: "2026-07-12T12:00:00Z" },
  ],
  memory_facts: [
    { category: "pattern", subject: "Targets", content: "Raises the revenue target the moment they hit it; it never feels like enough.", importance: 8 },
    { category: "goal", subject: "The live decision", content: "Weighing whether to raise prices or take a bigger, lower-margin contract.", importance: 7 },
  ],
  coaching_agenda: [],
  conversation_summaries: [],
  ai_tools: [],
  // The money branch reads the profile from the REPORT, never from scores —
  // return [] so the golden can't accidentally depend on money score rows.
  assessment_scores: [],
  assessment_reports: (params: URLSearchParams) => {
    if (params.get("assessment_id") === `eq.${MONEY_ASSESSMENT}`) {
      return [
        {
          archetype_base: "The Relentless Builder",
          archetype_sublabel: "DRIVE · guarded",
          archetype_tagline: "Out-works the room and never blows up.",
          generated_at: "2026-07-12T12:00:00Z",
          sections: { money_map: MONEY_MAP_BUNDLE },
        },
      ];
    }
    return [];
  },
  // A money solo user has no participant row (money is not a dyad vertical):
  // the coach-visibility read returns [] → defaults to "full", and dyad
  // resolution finds nothing.
  participant: [],
  decoded_invites: [],
};

// ─── Scenarios ───────────────────────────────────────────────────────────

export const SCENARIOS: Scenario[] = [
  {
    name: "executive",
    userId: EXEC_USER,
    userMessage: "I still haven't made the COO call. Every week something more urgent comes up.",
    program: null,
    mode: null,
    engagementId: null,
    conversationId: null,
    mustInclude: [
      "executive and business coach",
      "ACTIVE COACHING THREADS",
      "Delegate the sales pipeline",
      "COACHING RELATIONSHIP STAGE",
      "ESTABLISHED",
      "INTERVENTION SELECTION",
      "USER PROFILE:",
      "DELIVERY STYLE:",
      "PREVIOUS SESSION SUMMARIES",
      "COACHING AGENDA",
      "Deciding on the COO hire",
      "AI TOOL INTEGRATION:",
      "PRESCRIPTIVE INTERVENTION RULES:",
      "SAFETY RULES:",
    ],
    mustExclude: [
      "warm relationship coach",
      "RELATIONSHIP DYAD MODE",
      "Emotionally Focused Therapy",
    ],
    tables: EXEC_TABLES,
  },
  {
    name: "relationship-solo",
    userId: SOLO_USER,
    userMessage: "It happened again last night. We sat in the same room for two hours and said nothing.",
    program: "relationship",
    mode: null,
    engagementId: null,
    conversationId: SOLO_CONVERSATION,
    mustInclude: [
      "warm relationship coach",
      "RELEVANT FACTS FROM MEMORY:",
      "PREVIOUS SESSION SUMMARIES",
      "SAFETY RULES:",
      "WHAT YOU CAN AND CAN'T DO",
    ],
    mustExclude: [
      "executive and business coach",
      "ACTIVE COACHING THREADS",
      "INTERVENTION SELECTION",
      "DELIVERY STYLE:",
      "COACHING AGENDA",
      "AI TOOL INTEGRATION:",
      "COACHING RELATIONSHIP STAGE",
      "RELATIONSHIP DYAD MODE",
    ],
    tables: SOLO_TABLES,
  },
  {
    name: "relationship-dyad",
    userId: DYAD_USER,
    userMessage: "We had the same weekend fight again and Jordan just shut down.",
    program: "relationship",
    mode: null,
    engagementId: DYAD_ENGAGEMENT,
    conversationId: DYAD_CONVERSATION,
    mustInclude: [
      "warm relationship coach",
      "RELATIONSHIP DYAD MODE",
      "LAYER 4.6 — RELATIONSHIP DYAD CONTEXT",
      "with **Jordan**", // real account name, not the invited_email prefix
      "The Independent",
      "Their compatibility report",
      'assessment scores (shared at "full"', // partner percentiles at full share
      "never ask the user who their partner is",
      "THE STAKE:",
      "SAFETY RULES:",
    ],
    mustExclude: [
      "executive and business coach",
      "INTERVENTION SELECTION",
      "ACTIVE COACHING THREADS",
    ],
    tables: DYAD_TABLES,
  },
  {
    name: "relationship-deescalate",
    userId: SOLO_USER,
    userMessage: "I'm about to send this text and I know it's a grenade. Can you look at it first?",
    program: "relationship",
    mode: "deescalate",
    engagementId: null,
    conversationId: SOLO_CONVERSATION,
    mustInclude: [
      "warm relationship coach",
      "DE-ESCALATION MODE",
      "SAFETY RULES:",
    ],
    mustExclude: [
      "executive and business coach",
      "INTERVENTION SELECTION",
    ],
    tables: SOLO_TABLES,
  },
  {
    name: "money",
    userId: MONEY_USER,
    userMessage: "ok, finished the quiz. what's the read?",
    program: "money",
    mode: null,
    engagementId: null,
    conversationId: MONEY_CONVERSATION,
    mustInclude: [
      "money coach", // money persona
      "MONEY TRAITS PROFILE", // Layer 4.5 rendered by money-map-profile.ts
      "The Relentless Builder", // the stored archetype
      "running hot", // overclock rendering
      "THE FEAR: High", // Fear band rendering (stored key `leap`; user-facing "the Fear" since 2026-07-20)
      "THE REVEAL", // the reveal first-message builder
      "Does 'enough' have an actual number", // the DRIVE type-selected question
      "ANSWER CHIPS", // the clickable-chip contract (T5)
      "[[CHIPS:", // the exact machine-readable marker the money chat UI parses
      "WHAT YOU CAN AND CAN'T DO", // money guardrails
      "SAFETY RULES:", // shared crisis kernel
    ],
    mustExclude: [
      // No cross-vertical persona bleed…
      "executive and business coach",
      "warm relationship coach",
      "Emotionally Focused Therapy",
      // …and the gate PROOF: the money branch rendered its own Layer 4.5, NOT
      // the Big-Five Decoded profile (those headers must be absent).
      "DECODED PERSONALITY ASSESSMENT",
      "PERSONALITY PROFILE (Big Five)",
      "INTERVENTION SELECTION",
      "RELATIONSHIP DYAD MODE",
    ],
    tables: MONEY_TABLES,
  },
];
