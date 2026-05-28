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
