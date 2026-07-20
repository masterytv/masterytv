// MoneyTraits™ v1 — canonical scoring reference + self-check.
// This is the SPEC-LOCKING reference for directives/MONEY_TRAITS_INSTRUMENT.md §3.
// Deterministic, no LLM. When the production TS scorer lands in the Decoded
// engine (program=money), its unit tests must reproduce the cases at the bottom.
// Run:  node scripts/money-maps-scoring.mjs   (exits non-zero on any failure)

// item -> Map  (all 16 items positively keyed: agree = more of the construct)
const ITEMS = {
  GUARD:  ['G1', 'G2', 'G3'],
  DRIVE:  ['D1', 'D2', 'D3'],
  MIRROR: ['M1', 'M2', 'M3'],
  SHADOW: ['S1', 'S2', 'S3'],
  LEAP:   ['L1', 'L2', 'L3', 'L4'],
};
const CORE = ['GUARD', 'DRIVE', 'MIRROR', 'SHADOW'];    // LEAP is a state, not an archetype input
const TIEBREAK = ['DRIVE', 'GUARD', 'SHADOW', 'MIRROR']; // fixed order → determinism on exact ties

// archetype = ARCHETYPES[dominant][secondary]
const ARCHETYPES = {
  GUARD:  { DRIVE: 'The Fortress Builder',   MIRROR: 'The Quiet Titan',        SHADOW: 'The Vault' },
  DRIVE:  { GUARD: 'The Relentless Builder', MIRROR: 'The Mogul',              SHADOW: 'The Reluctant Rainmaker' },
  MIRROR: { DRIVE: 'The Headliner',          GUARD: 'The Curator',             SHADOW: 'The Aspirant' },
  SHADOW: { GUARD: 'The Monk',               DRIVE: 'The Heart-First Creator', MIRROR: 'The Understated' },
};

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const r2 = x => Math.round(x * 100) / 100;

export function scoreMoneyMaps(answers) {
  // 1. raw dimension means (rank on raw; round only for display)
  const raw = {};
  for (const [map, items] of Object.entries(ITEMS)) raw[map] = mean(items.map(i => answers[i]));

  // 2. dominant + secondary among the 4 core Maps, deterministic tie-break
  const ranked = [...CORE].sort((a, b) =>
    (raw[b] - raw[a]) || (TIEBREAK.indexOf(a) - TIEBREAK.indexOf(b)));
  const [dominant, secondary] = ranked;

  // 3. archetype   4. overclock (>= 4.0)   5. LEAP band + tilt
  const archetype   = ARCHETYPES[dominant][secondary];
  const overclocked = CORE.filter(m => raw[m] >= 4.0);
  const leap = raw.LEAP;
  const band = leap >= 4.0 ? 'High' : leap >= 2.75 ? 'Moderate' : 'Low';
  const failFacet = mean([answers.L1, answers.L3]); // fear of failure / loss-aversion
  const succFacet = mean([answers.L2, answers.L4]); // fear of success / identity
  let tilt = 'balanced';
  if (failFacet - succFacet >= 0.5) tilt = 'fear-of-failure';
  else if (succFacet - failFacet >= 0.5) tilt = 'fear-of-success';

  return {
    dims: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, r2(v)])),
    dominant, secondary, archetype, overclocked,
    leap: { score: r2(leap), band, tilt, failFacet: r2(failFacet), succFacet: r2(succFacet) },
  };
}

// ---------------------------------------------------------------------------
// Self-check: locks the boundary semantics (tie-break, >=4.0 hot, 2.75/4.0
// LEAP cutpoints, 0.5 tilt margin). Reproduce these in the production tests.
// ---------------------------------------------------------------------------
const A = (n) => Object.fromEntries(
  'G1 G2 G3 D1 D2 D3 M1 M2 M3 S1 S2 S3 L1 L2 L3 L4'.split(' ').map((k, i) => [k, n[i]]));

const CASES = [
  { name: 'Relentless Builder, High/success-tilt',
    a: A([5,4,4, 6,5,4, 2,3,2, 3,4,3, 3,5,3,5]),
    want: { archetype: 'The Relentless Builder', band: 'High', tilt: 'fear-of-success', hot: ['GUARD','DRIVE'] } },
  { name: 'The Monk, Low/balanced',
    a: A([5,4,4, 2,2,2, 1,2,1, 5,4,5, 2,2,2,2]),
    want: { archetype: 'The Monk', band: 'Low', tilt: 'balanced', hot: ['GUARD','SHADOW'] } },
  { name: 'exact tie GUARD=SHADOW -> tie-break picks The Vault',
    a: A([4,4,4, 2,3,2, 2,2,2, 4,4,4, 4,3,4,3]),
    want: { archetype: 'The Vault', band: 'Moderate', tilt: 'fear-of-failure', hot: ['GUARD','SHADOW'] } },
  { name: 'LEAP exactly 2.75 -> Moderate (not Low)',
    a: A([3,3,3, 3,3,3, 3,3,3, 3,3,3, 3,3,3,2]),
    want: { band: 'Moderate' } },
  { name: 'LEAP exactly 4.0 -> High',
    a: A([3,3,3, 3,3,3, 3,3,3, 3,3,3, 4,4,4,4]),
    want: { band: 'High' } },
  { name: 'tilt margin exactly 0.5 -> triggers fear-of-failure',
    a: A([3,3,3, 3,3,3, 3,3,3, 3,3,3, 4,3,4,4]), // fail (4+4)/2=4.0, succ (3+4)/2=3.5, diff 0.5
    want: { tilt: 'fear-of-failure' } },
  { name: 'four-way tie -> DRIVE dominant, GUARD secondary',
    a: A([4,4,4, 4,4,4, 4,4,4, 4,4,4, 3,3,3,3]),
    want: { archetype: 'The Relentless Builder' } },
];

function runTests() {
  let failed = 0;
  for (const c of CASES) {
    const r = scoreMoneyMaps(c.a);
    const checks = [];
    if (c.want.archetype !== undefined) checks.push(['archetype', r.archetype, c.want.archetype]);
    if (c.want.band !== undefined)      checks.push(['band', r.leap.band, c.want.band]);
    if (c.want.tilt !== undefined)      checks.push(['tilt', r.leap.tilt, c.want.tilt]);
    if (c.want.hot !== undefined)       checks.push(['hot', r.overclocked.join(','), c.want.hot.join(',')]);
    const bad = checks.filter(([, got, want]) => got !== want);
    if (bad.length) {
      failed++;
      console.log(`✗ ${c.name}`);
      bad.forEach(([f, got, want]) => console.log(`    ${f}: got "${got}", want "${want}"`));
    } else {
      console.log(`✓ ${c.name}`);
    }
  }
  console.log(failed ? `\n${failed} FAILED` : `\nAll ${CASES.length} passed.`);
  if (failed) process.exit(1);
}

runTests();
