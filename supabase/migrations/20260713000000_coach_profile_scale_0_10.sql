-- PC3.5 — Unify coach_profiles dimension scale to canonical 0-10.
--
-- Three scales coexisted for the 8 coaching dials:
--   * column defaults were 0-1 (0.4-0.6, this baseline),
--   * profile-updater.ts clamped every update to [0, 1],
--   * the Decoded report seeder wrote 1-10,
--   * the prompt layers (delivery style, intervention selector) read 1-10
--     thresholds (>= 7 high / <= 3 low).
-- Consequences:
--   (a) a default profile read as <= 3 on every dial -> the coach was told
--       "be risk-framed, challenge-first, data-heavy, give space" — the exact
--       opposite of a neutral default;
--   (b) the [0,1] clamp crushed Decoded-seeded dials on the first behavioral
--       update after 5 messages (warmth 9 -> 1).
-- Canonical scale going forward = 0-10 (matches the seeder + prompt reads);
-- profile-updater.ts now clamps [0, 10] with x10 deltas in the same change.

alter table coach_profiles
  alter column directness set default 5,
  alter column framing set default 6,
  alter column warmth set default 6,
  alter column autonomy set default 5,
  alter column pacing set default 5,
  alter column evidence_style set default 5,
  alter column accountability set default 5,
  alter column challenge_level set default 4;

-- Backfill rows written on the 0-1 scale. Gate on source, NOT on value:
-- 'decoded' rows are already 1-10 and legitimately contain values <= 1
-- (e.g. directness 1 = very diplomatic). 'default' rows hold the old 0-1
-- column defaults; 'behavioral' rows are defaults nudged by the old updater.
update coach_profiles
set directness      = least(directness * 10, 10),
    framing         = least(framing * 10, 10),
    warmth          = least(warmth * 10, 10),
    autonomy        = least(autonomy * 10, 10),
    pacing          = least(pacing * 10, 10),
    evidence_style  = least(evidence_style * 10, 10),
    accountability  = least(accountability * 10, 10),
    challenge_level = least(challenge_level * 10, 10)
where source in ('default', 'behavioral');
