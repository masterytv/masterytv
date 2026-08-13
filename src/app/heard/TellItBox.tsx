"use client";

/**
 * The pre-account box — INTEGRATION_SPRINT.md I5.1, EXPERIENCE §5.2.
 *
 * One textarea and one button. Everything that is NOT here is the spec:
 *
 * - **No character minimum**, and no counter. A counter tells somebody their
 *   four words are not enough, on the surface where four words is a common and
 *   complete answer.
 * - **No prompts, no scaffolding questions, no example placeholder.** Any of
 *   them tells the person what shape of answer is expected, and this
 *   population's whole problem is that every system they tried had a shape
 *   ready for them.
 * - **No account, no email, no age gate.** The 18+ gate and the consent screen
 *   land before turn TWO, enforced server-side by I5.5 (the coach returns 403
 *   CONSENT_REQUIRED and the chat page renders `ConsentGate`).
 * - **No "are you OK?" framing anywhere.** §5.2 and §8.4 name it as
 *   iatrogenic: it signals distress is the expected response and can
 *   manufacture the anxiety it means to address.
 *
 * ─── HOW SOMEBODY WITH NO ACCOUNT GETS ANSWERED ──────────────────────────
 *
 * Submit mints a Supabase ANONYMOUS session, then hands the text to the normal
 * chat path. That choice keeps the single most safety-critical turn in the
 * product on the one code path that already carries the crisis kernel, the
 * irreversible-decision tripwire, the memory-write filter, the draft auditor
 * and the consent gate. A second, unauthenticated "just this one turn"
 * endpoint would have to reimplement all of it, and a crisis flag raised on it
 * would have no user to attach to or escalate.
 *
 * The session is minted ON SUBMIT rather than on page load, so a crawler or a
 * bounced visit creates no user.
 *
 * When anonymous sign-in is unavailable (the provider is off, or Supabase
 * rate-limits), we do NOT lose their words: the text stays held and they go to
 * the normal signup card, which returns them here afterwards. That is a worse
 * experience by design and a working one, not a dead end.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  holdAccount,
  clearHeldAccount,
  HELD_ACCOUNT_DESTINATION,
} from "@/lib/heard/pending-account";

/** Matches the coach's per-program ceiling for this vertical. */
const MAX_CHARS = 25000;

export default function TellItBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const account = text.trim();
    if (!account || sending) return;

    setSending(true);
    setFailed(false);

    if (!holdAccount(account)) {
      // Storage refused (private mode). Say so rather than navigating away
      // from the only copy of what they wrote.
      setFailed(true);
      setSending(false);
      return;
    }

    const supabase = createClient();
    try {
      // A returning visitor in the same tab may already have a session. Do not
      // mint a second one over the top of it.
      const { data: existing } = await supabase.auth.getSession();
      if (!existing.session) {
        const { error } = await supabase.auth.signInAnonymously({
          // Attributes the row the same way a real signup does — the trigger
          // reads `signup_brand` before it branches on `is_anonymous`, so an
          // anonymous account is not an unattributed one.
          options: { data: { signup_brand: "heard" } },
        });
        if (error) {
          // The held text survives the detour and the chat page collects it
          // once they land back.
          router.push(
            `/login?next=${encodeURIComponent(HELD_ACCOUNT_DESTINATION)}`,
          );
          return;
        }
      }
      router.push(HELD_ACCOUNT_DESTINATION);
    } catch {
      clearHeldAccount();
      setFailed(true);
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-12">
      <h2 className="text-headline-md text-text-primary">What happened?</h2>
      <p className="mt-2 text-base text-text-secondary">
        Take as long as you want. Nothing here is graded, and nobody is going to
        tell you what it was.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_CHARS}
        rows={10}
        autoFocus
        // No placeholder. The two lines above are the whole instruction, and a
        // ghost example inside the box would be a scaffolding question wearing
        // a different hat.
        aria-label="What happened"
        // `input-surface` (globals.css) rather than bg utilities: BRAND.md §8.3
        // requires white-with-a-ghost-border in light and surface-100 in dark,
        // and the shared --input-bg token is the invisible pair §8.3 warns about.
        className="input-surface mt-6 w-full resize-y rounded-xl p-4 text-base text-text-primary outline-none transition-shadow placeholder:text-text-placeholder"
      />

      <p className="mt-3 text-sm text-text-muted">
        You can start typing now. We will ask for an email later, only if you
        want to keep this.
      </p>

      <button
        type="submit"
        disabled={!text.trim() || sending}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-label-md text-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, var(--cta-from), var(--cta-to))",
        }}
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending
          </>
        ) : (
          <>
            Send it
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {failed && (
        <p className="mt-3 text-sm text-danger">
          That did not send. Your words are still in the box, so you can try
          again.
        </p>
      )}
    </form>
  );
}
