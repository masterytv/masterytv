"use client";

/**
 * Speaking instead of typing — INTEGRATION_SPRINT.md I5.4, EXPERIENCE §5.2.
 *
 * "Voice input matters more here than anywhere else in the platform.
 * Ineffability is a defining feature of these experiences, and a purely typed
 * interface fights the phenomenology."
 *
 * ─── WHY THE BROWSER AND NOT A TRANSCRIPTION SERVICE ─────────────────────
 *
 * The obvious build is MediaRecorder → upload → a speech model behind an edge
 * function. It was rejected on the constraint that defines this surface: there
 * is no account yet. Uploading audio needs either an unauthenticated endpoint —
 * the thing I5.1 declined for the coach path, and a worse idea for a file than
 * for a sentence — or a session minted the moment somebody presses a mic, which
 * would create a user for every person who pressed it and thought better of it.
 * Minting on SUBMIT is the property that keeps a crawler, a misclick and a
 * change of heart from all becoming rows.
 *
 * So dictation is the browser's own, and its output lands in the same textarea
 * as typing. That has a second property worth more than the accuracy a hosted
 * model would buy: **the person reads it before anybody else does.** A
 * transcript of somebody who cried halfway through describing the worst hour of
 * their life should not post itself. They can fix the words, cut the parts they
 * did not mean to say, and send it when they are ready.
 *
 * ⚠️ **What this does NOT claim.** Recognition happens wherever the browser
 * does it, and several send the audio to their own servers to do it. The line
 * under the button says so, because "your voice never leaves this device" would
 * be false in Chrome and this is the one product that cannot afford a
 * comfortable inaccuracy about where somebody's words go.
 *
 * Unsupported browsers render NOTHING rather than a disabled control. Firefox
 * has no support at all, and a dead button on this page is a small message that
 * the thing was built for somebody else.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

/**
 * Minimal shape of the Web Speech API. `lib.dom` does not ship these, and the
 * vendor-prefixed constructor is still the only one two major browsers expose.
 */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export default function Dictate({
  onText,
  disabled,
}: {
  /** Called with each finished phrase. The box appends it. */
  onText: (chunk: string) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognition = useRef<SpeechRecognitionLike | null>(null);
  // Read inside the recognition callbacks, which close over their first render.
  const wantListening = useRef(false);
  const emit = useRef(onText);
  emit.current = onText;

  // Feature detection must run after mount: the server render has no window,
  // and rendering the button only on the client keeps the two in agreement.
  useEffect(() => setSupported(recognitionCtor() !== null), []);

  const stop = useCallback(() => {
    wantListening.current = false;
    setListening(false);
    setInterim("");
    recognition.current?.stop();
    recognition.current = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recognition.current) return;

    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";

    r.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          emit.current(text);
        } else {
          pending += text;
        }
      }
      setInterim(pending);
    };

    r.onerror = (event) => {
      // Silence and a manual stop are ordinary; everything else is worth saying
      // out loud, because a mic that quietly does nothing reads as being ignored.
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Your browser is not letting us use the microphone. You can still type."
          : "The microphone stopped. You can start it again, or type.",
      );
      stop();
    };

    // Browsers end the session on a pause even with `continuous`, and somebody
    // telling this story will stop for a long time in the middle of it. Restart
    // until they say to stop.
    r.onend = () => {
      recognition.current = null;
      setInterim("");
      if (wantListening.current) start();
    };

    recognition.current = r;
    wantListening.current = true;
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      // Already starting. Nothing to do; onend keeps the loop honest.
    }
  }, [stop]);

  // Never leave the microphone open behind a navigation.
  useEffect(() => () => {
    wantListening.current = false;
    recognition.current?.abort();
  }, []);

  useEffect(() => {
    if (disabled && wantListening.current) stop();
  }, [disabled, stop]);

  if (!supported) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? "Stop dictating" : "Say it out loud instead"}
        className="inline-flex items-center gap-2 text-sm text-text-secondary underline underline-offset-2 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {listening ? (
          <>
            <Square className="h-4 w-4" aria-hidden />
            Stop
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" aria-hidden />
            Say it out loud instead
          </>
        )}
      </button>

      {listening && (
        <p className="mt-2 text-sm text-text-muted" aria-live="polite">
          {interim || "Listening. Take your time."}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {/* Honest rather than reassuring: some browsers do the recognition on
          their own servers, and this is not a product that can afford a
          comfortable inaccuracy about where somebody's words go. */}
      <p className="mt-2 text-sm text-text-muted">
        Your browser does the listening, and some send the audio to their own
        servers first. Whatever lands in the box is yours to edit.
      </p>
    </div>
  );
}
