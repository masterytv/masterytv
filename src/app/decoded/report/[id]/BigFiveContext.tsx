'use client';

/**
 * Big Five Context — Explanatory intro + trait-by-trait tooltips
 *
 * Displayed above the Big Five radar chart in RS04 to help users
 * understand that every position on the spectrum has strengths.
 */

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

const TRAIT_EXPLANATIONS = [
  {
    name: 'Openness to Experience',
    tagline: 'Your Creative & Practical Style',
    description: 'This measures how you process new ideas, art, and experiences.',
    high: 'You are naturally curious, imaginative, and love exploring abstract concepts and new horizons.',
    grounded: 'You are practical, realistic, and focused. You value tradition, consistency, and what is proven to work.',
  },
  {
    name: 'Conscientiousness',
    tagline: 'Your Organization & Flexibility Style',
    description: 'This measures how you approach planning, discipline, and follow-through.',
    high: 'You are organized, dependable, and goal-driven. You thrive with structure and detailed plans.',
    grounded: 'You are adaptable, spontaneous, and comfortable with ambiguity. You stay flexible when plans change.',
  },
  {
    name: 'Extraversion',
    tagline: 'Your Social Energy Style',
    description: 'This measures where you draw energy — from people or from solitude.',
    high: 'You are energized by social interaction, talkative, and assertive. You light up in groups.',
    grounded: 'You recharge through solitude, prefer deep one-on-one conversations, and think before speaking.',
  },
  {
    name: 'Agreeableness',
    tagline: 'Your Collaboration & Advocacy Style',
    description: 'This measures how you balance harmony with honest directness.',
    high: 'You are warm, empathetic, and cooperative. You naturally build trust and prioritize others\' needs.',
    grounded: 'You are direct, analytical, and comfortable with debate. You advocate clearly and challenge ideas.',
  },
  {
    name: 'Neuroticism',
    tagline: 'Your Emotional Sensitivity Style',
    description: 'This measures how intensely you experience emotions and stress.',
    high: 'You are deeply perceptive and emotionally attuned. You pick up on subtleties others miss.',
    grounded: 'You are calm under pressure, emotionally steady, and resilient. You recover quickly from setbacks.',
  },
];

export default function BigFiveContext() {
  const [expandedTrait, setExpandedTrait] = useState<number | null>(null);

  return (
    <div className="big-five-context">
      {/* Intro paragraph */}
      <div className="big-five-context__intro">
        <p>
          This is not a test you can win or lose. There are no &ldquo;good&rdquo; or &ldquo;bad&rdquo; scores — a higher percentage isn&rsquo;t better than a lower one.
        </p>
        <p>
          The Big Five maps your unique style across five broad dimensions of human nature. Think of each percentage as a dial showing where you naturally feel most comfortable. Every point on the spectrum brings its own distinct strengths.
        </p>
      </div>

      {/* Trait explanations — expandable */}
      <div className="big-five-context__traits">
        {TRAIT_EXPLANATIONS.map((trait, i) => (
          <button
            key={trait.name}
            className={`big-five-context__trait ${expandedTrait === i ? 'big-five-context__trait--expanded' : ''}`}
            onClick={() => setExpandedTrait(expandedTrait === i ? null : i)}
          >
            <div className="big-five-context__trait-header">
              <div className="big-five-context__trait-title">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="big-five-context__trait-name">{trait.name}</span>
                <span className="big-five-context__trait-tagline">{trait.tagline}</span>
              </div>
              {expandedTrait === i ? (
                <ChevronUp className="h-4 w-4 flex-shrink-0 text-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-muted" />
              )}
            </div>
            {expandedTrait === i && (
              <div className="big-five-context__trait-body">
                <p className="big-five-context__trait-desc">{trait.description}</p>
                <div className="big-five-context__spectrum">
                  <div className="big-five-context__pole">
                    <span className="big-five-context__pole-label">Higher scores</span>
                    <span className="big-five-context__pole-text">{trait.high}</span>
                  </div>
                  <div className="big-five-context__pole">
                    <span className="big-five-context__pole-label">Lower scores</span>
                    <span className="big-five-context__pole-text">{trait.grounded}</span>
                  </div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
