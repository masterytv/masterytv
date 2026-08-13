"use client";

/**
 * "Keep this" — the other half of the promise the pre-account box makes.
 *
 * The box says, in as many words: *"We will ask for an email later, only if you
 * want to keep this."* This is later. Everything about it is shaped by the
 * second half of that sentence:
 *
 * - **It never gates.** No modal, no interstitial, no blocked composer. It is a
 *   strip they can ignore forever, and the conversation works untouched if they
 *   do. The one thing this vertical must never do is make somebody pay for
 *   having spoken.
 * - **It waits.** It renders only after there has been a real exchange, so it
 *   cannot land on the turn the account arrives. Asking for an email in the
 *   same breath as being told the strangest hour of somebody's life is the
 *   "handled by a system" move the whole product is designed against.
 * - **It keeps the same account.** `updateUser` links an email to the SAME
 *   `auth.users` row, so the conversation, the consent record and the memory
 *   survive. There is no migration step and nothing to re-tell. (The
 *   `public.users` side is finished in /auth/callback once they confirm.)
 *
 * It renders for anonymous sessions only, and only on this brand.
 */

import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBrand } from "@/hooks/useBrand";

export default function KeepThis() {
  const brand = useBrand();
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setIsAnonymous(data.user?.is_anonymous === true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError("An email and a password of at least 6 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser(
      { email: email.trim(), password },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/chat` },
    );
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSent(true);
  }

  if (brand.id !== "heard" || !isAnonymous || sent) {
    return sent ? (
      <p className="mx-auto mb-3 max-w-3xl px-4 text-sm text-text-secondary">
        <Check className="mr-1 inline h-4 w-4" />
        Check your email. Once you confirm it, this conversation is yours to
        come back to.
      </p>
    ) : null;
  }

  if (!open) {
    return (
      <div className="mx-auto mb-3 max-w-3xl px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-text-secondary underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          Keep this conversation
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto mb-3 max-w-3xl px-4">
      <p className="text-sm text-text-secondary">
        An email and a password, and this is here when you come back. Nothing
        else changes.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="input-surface min-w-48 flex-1 rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="new-password"
          className="input-surface min-w-48 flex-1 rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-label-md text-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--color-primary-container)" }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Keep it
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </form>
  );
}
