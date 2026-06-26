'use client';

/**
 * ArchetypeGrid — Interactive gallery of all 16 Decoded archetypes.
 * Shows card images in a grid with expandable detail view.
 * 
 * Uses BRAND.md tokens exclusively. No emoji, no sparkles, no clipart.
 * Premium editorial aesthetic — "If it wouldn't appear in The Economist, 
 * it doesn't belong here."
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data — All 16 archetypes with metadata and Big Five profile
// ---------------------------------------------------------------------------

type TraitLevel = '++' | '+' | '·' | '−' | '−−';
type Style = 'animal' | 'object' | 'male' | 'female';

interface Archetype {
  slug: string;
  name: string;
  subLabel: string;
  description: string;
  powers: [string, string, string];
  traits: { O: TraitLevel; C: TraitLevel; E: TraitLevel; A: TraitLevel; N: TraitLevel };
  animal: string;
  object: string;
  maleFigure: string;
  femaleFigure: string;
  /** Which styles have generated images */
  availableStyles: Style[];
}

const ARCHETYPES: Archetype[] = [
  {
    slug: 'architect',
    name: 'The Architect',
    subLabel: 'Designer with Compassion',
    description: 'Systematic visionary who builds frameworks and structures',
    powers: ['Deep Empathy', 'Creative Vision', 'Strategic Thinking'],
    traits: { O: '++', C: '+', E: '−', A: '−', N: '·' },
    animal: 'Owl with drafting compass',
    object: 'Compass, T-square, blueprint',
    maleFigure: 'Figure at drafting table',
    femaleFigure: 'Figure at drafting table',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'explorer',
    name: 'The Explorer',
    subLabel: 'Wanderer with Purpose',
    description: 'Curiosity-driven adventurer who thrives on novelty',
    powers: ['Boundless Curiosity', 'Adaptive Thinking', 'Courageous Discovery'],
    traits: { O: '++', C: '−', E: '+', A: '·', N: '−' },
    animal: 'Eagle soaring with compass',
    object: 'Telescope, sextant, antique map',
    maleFigure: 'Figure on mountain summit',
    femaleFigure: 'Figure on mountain summit',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'advocate',
    name: 'The Advocate',
    subLabel: 'Voice for the Voiceless',
    description: 'People-centered champion who fights for others',
    powers: ['Moral Courage', 'Deep Conviction', 'Empathic Leadership'],
    traits: { O: '·', C: '·', E: '+', A: '++', N: '−' },
    animal: 'Bear in protective stance',
    object: 'Torch, shield with heart',
    maleFigure: 'Figure at podium with torch',
    femaleFigure: 'Figure at podium with torch',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'sentinel',
    name: 'The Sentinel',
    subLabel: 'Keeper of the Watch',
    description: 'Reliable protector who values tradition and duty',
    powers: ['Unwavering Loyalty', 'Structured Thinking', 'Quiet Strength'],
    traits: { O: '−', C: '++', E: '−', A: '+', N: '·' },
    animal: 'German Shepherd at attention',
    object: 'Key crossed with sword',
    maleFigure: 'Figure guarding ornate gate',
    femaleFigure: 'Figure guarding ornate gate',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'catalyst',
    name: 'The Catalyst',
    subLabel: 'Spark That Starts the Fire',
    description: 'Energetic change-maker who disrupts the status quo',
    powers: ['Infectious Energy', 'Transformative Vision', 'Fearless Initiative'],
    traits: { O: '+', C: '−', E: '++', A: '−', N: '·' },
    animal: 'Phoenix rising from flames',
    object: 'Lightning bolt striking anvil',
    maleFigure: 'Figure lighting chain of torches',
    femaleFigure: 'Figure lighting chain of torches',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'sage',
    name: 'The Sage',
    subLabel: 'Seeker of Hidden Truths',
    description: 'Deep thinker who seeks understanding over action',
    powers: ['Profound Insight', 'Patient Analysis', 'Wisdom Under Pressure'],
    traits: { O: '++', C: '+', E: '−−', A: '·', N: '−' },
    animal: 'Raven on stack of books',
    object: 'Tome, armillary sphere, hourglass',
    maleFigure: 'Figure at desk with candle',
    femaleFigure: 'Figure at desk with candle',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'healer',
    name: 'The Healer',
    subLabel: 'Gentle Force in Quiet Rooms',
    description: 'Empathic nurturer who absorbs others\' pain',
    powers: ['Deep Listening', 'Emotional Intelligence', 'Gentle Strength'],
    traits: { O: '·', C: '−', E: '−', A: '++', N: '+' },
    animal: 'Doe in healing herbs',
    object: 'Chalice, mortar & pestle',
    maleFigure: 'Figure with flame in hands',
    femaleFigure: 'Figure with flame in hands',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'commander',
    name: 'The Commander',
    subLabel: 'The One They Follow',
    description: 'Decisive leader who takes charge naturally',
    powers: ['Natural Authority', 'Strategic Command', 'Decisive Action'],
    traits: { O: '·', C: '++', E: '++', A: '−', N: '−' },
    animal: 'Hawk on gauntlet',
    object: 'Crown, crossed scepters',
    maleFigure: 'Figure commanding at table',
    femaleFigure: 'Figure commanding at table',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'artist',
    name: 'The Artist',
    subLabel: 'Feeling Made Visible',
    description: 'Sensitive creator who channels emotion into expression',
    powers: ['Raw Creativity', 'Emotional Depth', 'Visionary Expression'],
    traits: { O: '++', C: '−−', E: '·', A: '·', N: '++' },
    animal: 'Hummingbird with ink swirls',
    object: 'Artist palette and brushes',
    maleFigure: 'Figure painting at easel',
    femaleFigure: 'Figure painting at easel',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'diplomat',
    name: 'The Diplomat',
    subLabel: 'Bridge Between Worlds',
    description: 'Harmony-seeking bridge-builder in every room',
    powers: ['Social Intelligence', 'Conflict Resolution', 'Unifying Presence'],
    traits: { O: '·', C: '·', E: '+', A: '++', N: '−' },
    animal: 'Dove with olive branch',
    object: 'Balanced scales, handshake',
    maleFigure: 'Figure bridging two groups',
    femaleFigure: 'Figure bridging two groups',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'maverick',
    name: 'The Maverick',
    subLabel: 'Instinct Over Instructions',
    description: 'Rule-breaking innovator who trusts instinct over process',
    powers: ['Bold Intuition', 'Creative Disruption', 'Fearless Action'],
    traits: { O: '++', C: '−−', E: '++', A: '−', N: '·' },
    animal: 'Lone wolf howling on cliff',
    object: 'Broken compass, torn rulebook',
    maleFigure: 'Figure striding against crowd',
    femaleFigure: 'Figure striding against crowd',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'guardian',
    name: 'The Guardian',
    subLabel: 'Shield Against the Storm',
    description: 'Anxious protector who plans for every contingency',
    powers: ['Protective Instinct', 'Risk Awareness', 'Fierce Devotion'],
    traits: { O: '−', C: '++', E: '−', A: '·', N: '+' },
    animal: 'Mother bear with cub',
    object: 'Shield, fortress, keys',
    maleFigure: 'Figure blocking doorway in storm',
    femaleFigure: 'Figure blocking doorway in storm',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'luminary',
    name: 'The Luminary',
    subLabel: 'The Room Remembers You',
    description: 'Charismatic inspirer who lights up rooms',
    powers: ['Magnetic Presence', 'Inspirational Vision', 'Emotional Resonance'],
    traits: { O: '·', C: '·', E: '++', A: '+', N: '−' },
    animal: 'Lion with golden sun disc',
    object: 'Lantern with laurel crown',
    maleFigure: 'Figure on stage radiating light',
    femaleFigure: 'Figure on stage radiating light',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'strategist',
    name: 'The Strategist',
    subLabel: 'Three Moves Ahead',
    description: 'Long-range planner who sees three moves ahead',
    powers: ['Systems Thinking', 'Pattern Recognition', 'Calculated Precision'],
    traits: { O: '+', C: '++', E: '−', A: '−', N: '·' },
    animal: 'Octopus with strategic objects',
    object: 'Chess board, telescope, star map',
    maleFigure: 'Figure at chess board',
    femaleFigure: 'Figure at chess board',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'rebel',
    name: 'The Rebel',
    subLabel: 'Beautifully Uncontainable',
    description: 'Intense individualist who resists conformity',
    powers: ['Radical Authenticity', 'Unshakable Identity', 'Creative Defiance'],
    traits: { O: '++', C: '−−', E: '·', A: '−−', N: '+' },
    animal: 'Black panther leaping over chains',
    object: 'Shattered crown, rose through concrete',
    maleFigure: 'Figure breaking free from chains',
    femaleFigure: 'Figure breaking free from chains',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
  {
    slug: 'anchor',
    name: 'The Anchor',
    subLabel: 'The Ground Beneath Your Feet',
    description: 'Steady, grounding presence others rely on',
    powers: ['Unshakable Calm', 'Deep Reliability', 'Emotional Stability'],
    traits: { O: '−', C: '+', E: '·', A: '++', N: '−−' },
    animal: 'Elephant with oxpecker bird',
    object: 'Ship anchor, compass rose, oak roots',
    maleFigure: 'Figure as pillar of strength',
    femaleFigure: 'Figure as pillar of strength',
    availableStyles: ['animal', 'object', 'male', 'female'],
  },
];

const STYLE_LABELS: Record<Style, string> = {
  animal: 'Animal',
  object: 'Object',
  male: 'Male Figure',
  female: 'Female Figure',
};

const TRAIT_LABELS: Record<string, string> = {
  O: 'Openness',
  C: 'Conscientiousness',
  E: 'Extraversion',
  A: 'Agreeableness',
  N: 'Neuroticism',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArchetypeGrid() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<Record<string, Style>>({});

  function getStyle(slug: string, available: Style[]): Style {
    return activeStyle[slug] ?? available[0] ?? 'animal';
  }

  return (
    <div className="archetype-grid">
      {ARCHETYPES.map((arch) => {
        const isExpanded = expanded === arch.slug;
        const currentStyle = getStyle(arch.slug, arch.availableStyles);
        const hasImages = arch.availableStyles.length > 0;

        return (
          <motion.article
            key={arch.slug}
            layout
            className={`archetype-card ${isExpanded ? 'archetype-card--expanded' : ''}`}
            onClick={() => !isExpanded && setExpanded(arch.slug)}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpanded(isExpanded ? null : arch.slug);
              }
            }}
          >
            {/* Preview — always visible */}
            <div className="archetype-card__preview">
              {hasImages ? (
                <div className="archetype-card__image-wrap">
                  <Image
                    src={`/decoded/cards/${arch.slug}/${currentStyle}.png`}
                    alt={`${arch.name} — ${STYLE_LABELS[currentStyle]} style`}
                    width={400}
                    height={400}
                    className="archetype-card__image"
                    priority={ARCHETYPES.indexOf(arch) < 4}
                  />
                </div>
              ) : (
                <div className="archetype-card__placeholder">
                  <span className="archetype-card__placeholder-text">Coming Soon</span>
                </div>
              )}

              <div className="archetype-card__info">
                <h2 className="archetype-card__name">{arch.name}</h2>
                <p className="archetype-card__sublabel">{arch.subLabel}</p>
              </div>
            </div>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="archetype-card__detail"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    className="archetype-card__close"
                    onClick={() => setExpanded(null)}
                    aria-label="Close details"
                  >
                    <X className="archetype-card__close-icon" />
                  </button>

                  {/* Description */}
                  <p className="archetype-card__description">
                    &ldquo;{arch.description}&rdquo;
                  </p>

                  {/* Superpowers */}
                  <div className="archetype-card__powers">
                    {arch.powers.map((power) => (
                      <span key={power} className="archetype-card__power">
                        {power}
                      </span>
                    ))}
                  </div>

                  {/* Big Five profile */}
                  <div className="archetype-card__traits">
                    <h3 className="archetype-card__traits-title">Big Five Profile</h3>
                    <div className="archetype-card__trait-grid">
                      {(Object.entries(arch.traits) as [string, TraitLevel][]).map(
                        ([key, level]) => (
                          <div key={key} className="archetype-card__trait">
                            <span className="archetype-card__trait-label">
                              {TRAIT_LABELS[key]}
                            </span>
                            <span
                              className={`archetype-card__trait-level archetype-card__trait-level--${level.replace(/[+−·]/g, (m) => ({ '+': 'high', '−': 'low', '·': 'mid' }[m] ?? 'mid'))}`}
                            >
                              {level}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Style switcher */}
                  {hasImages && arch.availableStyles.length > 1 && (
                    <div className="archetype-card__styles">
                      <h3 className="archetype-card__styles-title">Card Styles</h3>
                      <div className="archetype-card__style-grid">
                        {arch.availableStyles.map((style) => (
                          <button
                            key={style}
                            className={`archetype-card__style-btn ${currentStyle === style ? 'archetype-card__style-btn--active' : ''}`}
                            onClick={() =>
                              setActiveStyle((prev) => ({ ...prev, [arch.slug]: style }))
                            }
                          >
                            <Image
                              src={`/decoded/cards/${arch.slug}/${style}.png`}
                              alt={`${arch.name} — ${STYLE_LABELS[style]}`}
                              width={120}
                              height={120}
                              className="archetype-card__style-thumb"
                            />
                            <span className="archetype-card__style-label">
                              {STYLE_LABELS[style]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Motif descriptions */}
                  <div className="archetype-card__motifs">
                    <h3 className="archetype-card__motifs-title">Card Motifs</h3>
                    <ul className="archetype-card__motif-list">
                      <li><strong>Animal:</strong> {arch.animal}</li>
                      <li><strong>Object:</strong> {arch.object}</li>
                      <li><strong>Figure:</strong> {arch.maleFigure}</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expand hint */}
            {!isExpanded && (
              <div className="archetype-card__expand-hint">
                <span>View details</span>
                <ChevronRight className="archetype-card__expand-icon" />
              </div>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}
