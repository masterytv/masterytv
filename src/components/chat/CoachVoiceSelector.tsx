'use client';

/**
 * CoachVoiceSelector — Voice style picker for the coaching chat.
 *
 * Compact popover that lets users choose how the coach communicates.
 * Each voice maps to coach_profiles dimensions, taking effect on the
 * next message (prompt assembler reads fresh values).
 *
 * Design: Matches the report's VoiceSelector pattern (horizontal pills)
 * but adapted for the chat header context (popover vs inline).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AudioLines,
  Microscope,
  Compass,
  Heart,
  ShieldCheck,
  Zap,
  Waves,
  Check,
  Loader2,
} from 'lucide-react';
import { COACH_VOICE_OPTIONS, type CoachVoiceId } from '@/lib/coach/voice-config';

// Map icon names to components (avoids dynamic import overhead)
const ICON_MAP = {
  Microscope,
  Compass,
  Heart,
  ShieldCheck,
  Zap,
  Waves,
} as const;

interface CoachVoiceSelectorProps {
  /** The currently active voice (from coach_profiles.voice_id) */
  activeVoiceId: CoachVoiceId | null;
  /** Callback when voice changes successfully */
  onVoiceChanged: (voiceId: CoachVoiceId) => void;
}

export default function CoachVoiceSelector({
  activeVoiceId,
  onVoiceChanged,
}: CoachVoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingVoiceId, setPendingVoiceId] = useState<CoachVoiceId | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleSelect = useCallback(
    async (voiceId: CoachVoiceId) => {
      if (voiceId === activeVoiceId || pendingVoiceId) return;

      setPendingVoiceId(voiceId);
      try {
        const res = await fetch('/api/coach/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice_id: voiceId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('[CoachVoiceSelector] Update failed:', err);
          return;
        }

        onVoiceChanged(voiceId);
        setIsOpen(false);
      } catch (err) {
        console.error('[CoachVoiceSelector] Network error:', err);
      } finally {
        setPendingVoiceId(null);
      }
    },
    [activeVoiceId, pendingVoiceId, onVoiceChanged]
  );

  const activeVoice = COACH_VOICE_OPTIONS.find((v) => v.id === activeVoiceId);

  return (
    <div className="coach-voice-selector" id="coach-voice-selector">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        className={`coach-voice-trigger ${isOpen ? 'coach-voice-trigger--open' : ''} ${activeVoice ? 'coach-voice-trigger--has-voice' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change coach voice style"
        aria-expanded={isOpen}
        title={activeVoice ? `Voice: ${activeVoice.label}` : 'Choose coaching voice'}
      >
        <AudioLines size={16} />
        {activeVoice ? (
          <>
            <span className="coach-voice-trigger__label">
              {activeVoice.label.replace('The ', '')}
            </span>
            <Check size={12} className="coach-voice-trigger__check" />
          </>
        ) : (
          <span className="coach-voice-trigger__label">Voice</span>
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            className="coach-voice-popover"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <div className="coach-voice-popover__header">
              <span className="coach-voice-popover__title">Coaching Voice</span>
              <span className="coach-voice-popover__subtitle">
                How your coach communicates with you
              </span>
            </div>

            <div className="coach-voice-popover__options">
              {COACH_VOICE_OPTIONS.map((voice) => {
                const isActive = voice.id === activeVoiceId;
                const IconComponent = ICON_MAP[voice.iconName];

                return (
                    <button
                      key={voice.id}
                      className={`coach-voice-option ${isActive ? 'coach-voice-option--active' : ''}`}
                      onClick={() => handleSelect(voice.id)}
                      disabled={!!pendingVoiceId}
                      aria-pressed={isActive}
                      id={`coach-voice-${voice.id}`}
                    >
                      <span className="coach-voice-option__icon">
                        <IconComponent size={16} />
                      </span>
                      <div className="coach-voice-option__text">
                        <span className="coach-voice-option__label">{voice.label}</span>
                        <span className="coach-voice-option__desc">{voice.shortDescription}</span>
                      </div>
                      <span className="coach-voice-option__status">
                        {pendingVoiceId === voice.id ? (
                          <Loader2 size={14} className="coach-voice-option__spinner" />
                        ) : isActive ? (
                          <Check size={14} />
                        ) : null}
                      </span>
                    </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
