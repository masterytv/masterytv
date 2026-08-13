/**
 * The held account — the bridge between the pre-account box (I5.1) and the
 * witness turn (I5.2).
 *
 * What somebody writes in that box can be four words or four thousand
 * (EXPERIENCE §5.2), so it cannot ride in a query string the way the money and
 * report deep links do. It goes in `sessionStorage` and the chat page takes it
 * on arrival.
 *
 * 🔑 Three properties, each deliberate:
 *
 * 1. **sessionStorage, not localStorage.** This text is the most private thing
 *    on the device. It should not outlive the tab, and it must not sit in
 *    storage on a shared machine after somebody closes the window.
 * 2. **`take` reads and clears in one step.** A refresh must never re-send the
 *    account as a second turn, and a leftover key must never surface somebody
 *    else's words in a later session.
 * 3. **Writes are best-effort.** Private browsing and storage-blocked contexts
 *    throw on `setItem`; the box treats that as a hold failure and keeps the
 *    person where they are rather than navigating away from their own text.
 */

const KEY = "heard.pending-account";

/** Hold the text for the chat page. Returns false when storage refused it. */
export function holdAccount(text: string): boolean {
  try {
    sessionStorage.setItem(KEY, text);
    return true;
  } catch {
    return false;
  }
}

/** Read and clear. Returns null when nothing is held. */
export function takeHeldAccount(): string | null {
  try {
    const held = sessionStorage.getItem(KEY);
    if (held !== null) sessionStorage.removeItem(KEY);
    return held;
  } catch {
    return null;
  }
}

/** Drop it without reading — used when a flow is abandoned. */
export function clearHeldAccount(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do; an unreadable store is an empty one for our purposes.
  }
}

/**
 * Where the box sends people, and what the chat page matches on to know an
 * account is waiting. Shared so the two halves cannot drift.
 */
export const HELD_ACCOUNT_CONTEXT = "heard_account";
export const HELD_ACCOUNT_DESTINATION = `/dashboard/chat?context=${HELD_ACCOUNT_CONTEXT}`;
