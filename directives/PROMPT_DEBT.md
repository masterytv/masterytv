# Prompt & Process Improvement Debt

Technical debt items for the coaching engine (prompt-assembler, post-processor, channel-router).

---

## PD-001: Session Gap Awareness (Time Delta Detection)

**Priority:** High
**Discovered:** 2026-04-03
**Status:** Open

### Problem
The coach treats every message as a continuation of the previous conversation thread, regardless of time elapsed. If a user was discussing procrastination yesterday and sends "I need to write a blog post about productivity" today, the coach interprets the new topic as avoidance behavior from the old thread — when it's actually a completely new session.

### Root Cause
The prompt assembler passes recent messages as conversation history but includes NO signal about time gaps between messages. Claude sees the last 20 messages as a continuous thread.

### Proposed Fix
1. **In `assemblePrompt()` (prompt-assembler.ts):** Compute the time delta between the last message's `created_at` and `now()`.
2. **Inject a session boundary signal** into the system prompt when the gap exceeds a threshold (e.g., 1 hour):
   ```
   SESSION CONTEXT: The user's last message was 18 hours ago (yesterday at 7:12 PM).
   This is likely a NEW session. Treat any topic change as intentional, not avoidance.
   If the previous thread was unresolved, you may briefly acknowledge it later
   ("Last time we were working on X — want to circle back to that?") but follow
   the user's lead first.
   ```
3. **Threshold tiers:**
   - < 1 hour: Same session, treat as continuation
   - 1–4 hours: Possible session break — don't assume continuity
   - 4+ hours: New session — follow the user's current topic, don't anchor to old thread
   - 24+ hours: Definitely new day — acknowledge if appropriate ("Welcome back!")

### Conversation ID Reference
The `conversation_summaries` table already tracks session boundaries. Could use that as an additional signal — if the summarizer has already closed the previous conversation, it's definitely a new session.

### Impact
Without this fix, the coach can come across as presumptuous or tone-deaf when users return after a break. It undermines trust, especially for high-autonomy users who don't want their new requests reframed as avoidance patterns.

---

## PD-002: [Template for next item]
<!-- Copy this block for new debt items -->
