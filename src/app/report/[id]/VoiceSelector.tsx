'use client';

/**
 * Voice Selector — Narrative voice picker for Decoded reports
 *
 * Shows the current auto-classified voice and lets users
 * explore alternative voices. Triggers a rewrite when selected.
 *
 * Design: Horizontal pill strip with the active voice highlighted.
 * Positioned just above the narrative transition divider.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §4
 * PRD: NVR20–NVR23
 */

import { useState, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Palette, Microscope, Compass, Heart, ShieldCheck, Zap, Waves } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type VoiceId =
  | 'intellectual'
  | 'adventurer'
  | 'connector'
  | 'steward'
  | 'challenger'
  | 'sensitive';

interface VoiceOption {
  id: VoiceId;
  label: string;
  shortDescription: string;
  icon: React.ReactNode;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'intellectual',
    label: 'The Intellectual',
    shortDescription: 'Precise, analytical, framework-driven',
    icon: <Microscope size={14} />,
  },
  {
    id: 'adventurer',
    label: 'The Adventurer',
    shortDescription: 'Bold, direct, action-oriented',
    icon: <Compass size={14} />,
  },
  {
    id: 'connector',
    label: 'The Connector',
    shortDescription: 'Warm, relational, empathetic',
    icon: <Heart size={14} />,
  },
  {
    id: 'steward',
    label: 'The Steward',
    shortDescription: 'Structured, evidence-based, reassuring',
    icon: <ShieldCheck size={14} />,
  },
  {
    id: 'challenger',
    label: 'The Challenger',
    shortDescription: 'Strategic, no-nonsense, results-focused',
    icon: <Zap size={14} />,
  },
  {
    id: 'sensitive',
    label: 'The Sensitive',
    shortDescription: 'Spacious, poetic, deeply attuned',
    icon: <Waves size={14} />,
  },
];

interface VoiceSelectorProps {
  /** The auto-classified voice for this report */
  currentVoiceId: VoiceId;
  /** The currently displayed voice (may differ if user switched) */
  activeVoiceId: VoiceId;
  /** Report ID for the rewrite API */
  reportId: string;
  /** Called when a voice version is ready to display */
  onVoiceChange: (voiceId: VoiceId, sections: Record<string, unknown> | null) => void;
  /** Whether the user has permission to rewrite (tier check) */
  canRewrite?: boolean;
}

type RewriteStatus = 'idle' | 'generating' | 'complete' | 'error';

export default function VoiceSelector({
  currentVoiceId,
  activeVoiceId,
  reportId,
  onVoiceChange,
  canRewrite = true,
}: VoiceSelectorProps) {
  const [rewriteStatus, setRewriteStatus] = useState<Record<VoiceId, RewriteStatus>>({
    intellectual: 'idle',
    adventurer: 'idle',
    connector: 'idle',
    steward: 'idle',
    challenger: 'idle',
    sensitive: 'idle',
  });
  const [expandedVoice, setExpandedVoice] = useState<VoiceId | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleVoiceSelect = useCallback(
    async (voiceId: VoiceId) => {
      // If this is the original voice, just switch back
      if (voiceId === currentVoiceId) {
        onVoiceChange(voiceId, null);
        return;
      }

      if (!canRewrite) return;

      // Check if we already have a cached version
      const supabase = createClient();
      const { data: existingVersion } = await supabase
        .from('assessment_report_versions')
        .select('id, status, sections')
        .eq('report_id', reportId)
        .eq('voice_id', voiceId)
        .single();

      if (existingVersion?.status === 'complete') {
        // Already generated: switch immediately
        onVoiceChange(voiceId, existingVersion.sections);
        return;
      }

      // Trigger a rewrite
      setRewriteStatus((prev) => ({ ...prev, [voiceId]: 'generating' }));

      try {
        const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const response = await fetch(
          `${projectUrl}/functions/v1/decoded-rewrite-voice`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ report_id: reportId, voice_id: voiceId }),
          },
        );

        if (!response.ok) {
          throw new Error(`Rewrite failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'complete') {
          // Already done (was cached on the server)
          setRewriteStatus((prev) => ({ ...prev, [voiceId]: 'complete' }));
          onVoiceChange(voiceId, result.sections);
          return;
        }

        // Start polling for completion
        pollForCompletion(voiceId, result.version_id);
      } catch (error) {
        console.error('[VoiceSelector] Rewrite error:', error);
        setRewriteStatus((prev) => ({ ...prev, [voiceId]: 'error' }));
      }
    },
    [currentVoiceId, reportId, canRewrite, onVoiceChange],
  );

  const pollForCompletion = useCallback(
    (voiceId: VoiceId, versionId: string) => {
      const supabase = createClient();
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)

      const poll = async () => {
        attempts++;
        if (attempts > maxAttempts) {
          setRewriteStatus((prev) => ({ ...prev, [voiceId]: 'error' }));
          return;
        }

        const { data } = await supabase
          .from('assessment_report_versions')
          .select('status, sections, sections_completed, total_sections')
          .eq('id', versionId)
          .single();

        if (!data) {
          setTimeout(poll, 5000);
          return;
        }

        if (data.status === 'complete') {
          setRewriteStatus((prev) => ({ ...prev, [voiceId]: 'complete' }));
          startTransition(() => {
            onVoiceChange(voiceId, data.sections);
          });
          return;
        }

        if (data.status === 'failed') {
          setRewriteStatus((prev) => ({ ...prev, [voiceId]: 'error' }));
          return;
        }

        // Still generating: poll again
        setTimeout(poll, 5000);
      };

      setTimeout(poll, 3000); // First poll after 3s (give generation a head start)
    },
    [onVoiceChange],
  );

  return (
    <div className="voice-selector" id="voice-selector">
      <div className="voice-selector__header">
        <div className="voice-selector__label">
          <Palette size={14} />
          Narrative Voice
        </div>
        <div className="voice-selector__sublabel">
          Your report was written in{' '}
          <strong>{VOICE_OPTIONS.find((v) => v.id === currentVoiceId)?.label}</strong>
          {' '}voice. Try a different perspective.
        </div>
      </div>

      <div className="voice-selector__pills">
        {VOICE_OPTIONS.map((voice) => {
          const isActive = voice.id === activeVoiceId;
          const isOriginal = voice.id === currentVoiceId;
          const status = rewriteStatus[voice.id];
          const isGenerating = status === 'generating';

          return (
            <button
              key={voice.id}
              className={`voice-pill ${isActive ? 'voice-pill--active' : ''} ${isOriginal ? 'voice-pill--original' : ''}`}
              onClick={() => handleVoiceSelect(voice.id)}
              onMouseEnter={() => setExpandedVoice(voice.id)}
              onMouseLeave={() => setExpandedVoice(null)}
              disabled={isGenerating || (!canRewrite && !isOriginal)}
              aria-pressed={isActive}
              aria-label={`${voice.label}: ${voice.shortDescription}`}
              id={`voice-pill-${voice.id}`}
            >
              <span className="voice-pill__icon">{voice.icon}</span>
              <span className="voice-pill__label">{voice.label.replace('The ', '')}</span>

              {isGenerating && (
                <Loader2 className="voice-pill__spinner" size={12} />
              )}
              {isActive && !isGenerating && (
                <Check className="voice-pill__check" size={12} />
              )}
              {isOriginal && !isActive && (
                <span className="voice-pill__original-dot" aria-label="Original voice" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded description tooltip */}
      <AnimatePresence>
        {expandedVoice && (
          <motion.div
            className="voice-selector__tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {VOICE_OPTIONS.find((v) => v.id === expandedVoice)?.shortDescription}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {Object.entries(rewriteStatus).some(([, s]) => s === 'error') && (
        <div className="voice-selector__error">
          Generation failed for one or more voices. Please try again.
        </div>
      )}
    </div>
  );
}
