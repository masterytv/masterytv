# MasteryTV — Local Agent Context

Project-specific rules and lessons learned. This file is loaded automatically by Antigravity agents working in this workspace.

---

## Email / Resend Configuration

> **⚠️ MANDATORY: All Resend emails MUST use the verified `mail.masterytv.com` domain.**

| Setting | Value |
|---|---|
| **Verified domain** | `mail.masterytv.com` |
| **Default from address** | `donotreply@mail.masterytv.com` |
| **Display name format** | `"Label Name <donotreply@mail.masterytv.com>"` |
| **Coach emails** | `coach@mail.masterytv.com` (Edge Functions) |

### ❌ Never use
- `hello@masterytv.com` — root domain is **not verified** with Resend
- `anything@masterytv.com` — only `@mail.masterytv.com` subaddresses work

### ✅ Correct examples
```
from: 'MasteryTV <donotreply@mail.masterytv.com>'
from: 'Decoded by MasteryTV <donotreply@mail.masterytv.com>'
from: 'Mastery Coach <coach@mail.masterytv.com>'
```

### Where Resend is used
- `src/app/api/decoded/invite/route.ts` — Assessment invite emails
- `src/app/api/subscribe/route.ts` — Coming soon subscribe welcome
- `src/app/api/legacy/webhook/route.ts` — Legacy letter notification
- `supabase/functions/_shared/resend.ts` — Coach email notifications (Edge Functions)

---

## AI Generation Architecture

> **⚠️ MANDATORY: All AI report generation MUST live in Supabase Edge Functions, NOT Next.js API routes.**

The "assessment engine" (AI generation + database) is decoupled from the "web UI" (Next.js) for portability. Edge Functions use `OPENAI_API_KEY` from Supabase secrets — this key is NOT in Vercel.

| Function | Purpose | Deploy |
|---|---|---|
| `decoded-generate-report` | Main Decoded report (13 dimensions) | `--no-verify-jwt` |
| `decoded-compatibility-report` | Per-user compatibility reports (2 voices) | `--no-verify-jwt` |
| `coach` | Mastery Coach chat (streaming) | `--no-verify-jwt` |

### Client → Edge Function Pattern
Client components call Edge Functions directly with the user's JWT:
```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const { data } = await supabase.auth.getSession();
fetch(`${SUPABASE_URL}/functions/v1/<function-name>`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.session.access_token}`,
  },
  body: JSON.stringify({ ... }),
});
```

### ❌ Never add to Vercel API routes
- OpenAI calls
- Any AI generation logic
- Direct LLM prompting

### Where Next.js API routes ARE used
- Auth flows (`invite-consent`, `compatibility-request`, `deny-upgrade`)
- Webhooks (`stripe`, `legacy`)
- Email sending (`invite`, `subscribe`)
- Read-only cache layers (`compatibility-report` GET)

---

## Compatibility Report — Upgrade Request Data Model

The `decoded_invites` table has two fields for upgrade requests:

| Column | Purpose |
|---|---|
| `upgrade_requested_level` | The level requested (e.g., `'full'`) |
| `upgrade_requested_by` | User ID of who requested |

### State machine
- **No request:** Both fields are `null` → UI shows "Request Access"
- **Pending request:** Both fields populated → requester sees "Requested", other party sees "Accept / Deny"
- **After denial:** `deny-upgrade` route clears BOTH fields to `null` → back to "No request"
- **After acceptance:** `invite-consent` route updates `share_with_human` and clears BOTH fields to `null`

### ⚠️ Lesson: There is NO "denied" state in the data
Denial clears the fields. Do NOT try to infer denial from `upgrade_requested_level != share_with_human` — that's a pending request, not a denial.

### ⚠️ Lesson: Consent flow must clear upgrade fields
When `invite-consent` runs, it MUST set `upgrade_requested_level: null, upgrade_requested_by: null` in the update query. Otherwise stale values cause false "Requested" badges.
