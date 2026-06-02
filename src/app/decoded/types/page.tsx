import type { Metadata } from 'next';
import { Fingerprint } from 'lucide-react';
import { FloatingThemeToggle } from '@/components/floating-theme-toggle';
import Link from 'next/link';
import { ArchetypeGrid } from './ArchetypeGrid';
import './types.css';

export const metadata: Metadata = {
  title: 'Decoded — 16 Personality Archetypes',
  description:
    'Explore all 16 Decoded personality archetypes derived from the Big Five model. Discover which type you are — from The Architect to The Anchor.',
  openGraph: {
    title: 'Decoded — 16 Personality Archetypes',
    description:
      'Explore all 16 personality archetypes. Which one are you?',
    type: 'website',
  },
};

export default function TypesPage() {
  return (
    <div className="types-page">
      <FloatingThemeToggle />

      {/* Background ambient glow */}
      <div className="types-page__glow" aria-hidden="true">
        <div className="types-page__glow-orb types-page__glow-orb--primary" />
        <div className="types-page__glow-orb types-page__glow-orb--accent" />
      </div>

      {/* Hero */}
      <header className="types-hero">
        <div className="types-hero__badge">
          <Fingerprint className="types-hero__badge-icon" strokeWidth={1.5} />
        </div>
        <p className="types-hero__label">DECODED</p>
        <h1 className="types-hero__title">16 Personality Archetypes</h1>
        <p className="types-hero__subtitle">
          Your Big Five personality profile — Openness, Conscientiousness,
          Extraversion, Agreeableness, and Neuroticism — maps to one of 16
          distinct archetypes. Each reveals your superpowers, your growth edges,
          and how you show up in the world.
        </p>
        <Link href="/decoded" className="types-hero__cta">
          Discover Your Type
        </Link>
      </header>

      {/* How it works — editorial strip */}
      <section className="types-method">
        <div className="types-method__inner">
          <h2 className="types-method__title">How You Get Your Type</h2>
          <div className="types-method__steps">
            <div className="types-method__step">
              <span className="types-method__step-num">01</span>
              <h3 className="types-method__step-title">50-Question Assessment</h3>
              <p className="types-method__step-desc">
                Answer questions from the IPIP-50 — a scientifically validated
                measure of the Big Five personality traits.
              </p>
            </div>
            <div className="types-method__step">
              <span className="types-method__step-num">02</span>
              <h3 className="types-method__step-title">Profile Normalization</h3>
              <p className="types-method__step-desc">
                Your raw scores are converted to z-scores against population
                norms, revealing where you truly stand on each dimension.
              </p>
            </div>
            <div className="types-method__step">
              <span className="types-method__step-num">03</span>
              <h3 className="types-method__step-title">Archetype Classification</h3>
              <p className="types-method__step-desc">
                Your profile is compared to 16 archetype centroids using
                Euclidean distance. The closest match is your primary type.
              </p>
            </div>
            <div className="types-method__step">
              <span className="types-method__step-num">04</span>
              <h3 className="types-method__step-title">Personalized Card</h3>
              <p className="types-method__step-desc">
                Choose your card style — animal, object, or figure — and get a
                premium shareable image with your name and superpowers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Archetype gallery */}
      <section className="types-gallery">
        <ArchetypeGrid />
      </section>

      {/* CTA footer */}
      <footer className="types-footer">
        <h2 className="types-footer__title">Which one are you?</h2>
        <p className="types-footer__desc">
          Take the free Decoded assessment and discover your archetype in 30
          minutes.
        </p>
        <Link href="/decoded" className="types-footer__cta">
          Start Your Assessment
        </Link>
      </footer>
    </div>
  );
}
