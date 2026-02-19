# MasteryTV.com

> **Something Big is Coming.** A 20-year authority in personal development and entrepreneurship, returning with a new digital app.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (Strict) |
| Styling | Vanilla CSS (Dark Mode OLED) |
| Typography | Cinzel + Josefin Sans (Google Fonts) |
| Export | Static (`output: 'export'`) |
| Hosting | Vercel (Hobby tier) |
| Repo | [github.com/masterytv/masterytv](https://github.com/masterytv/masterytv) |

## Setup

```bash
npm install
```

## Development

```bash
npm run dev       # http://localhost:3000
npm run build     # Static export to /out
npm run start     # Serve production build
```

## Deployment

Vercel auto-deploys on every push to `main`. Custom domain `masterytv.com` configured via Cloudflare DNS → Vercel CNAME.

## Project Structure

```
src/
├── app/
│   ├── api/subscribe/route.ts  # POST endpoint: email → Supabase + Resend
│   ├── layout.tsx              # Root layout: fonts, SEO meta, JSON-LD
│   ├── page.tsx                # Main page: text, email form, orb, stars
│   └── globals.css             # Design tokens, animations, form styles
├── components/
│   └── EmailForm.tsx           # Client component: email capture form
public/
├── robots.txt
├── sitemap.xml
└── manifest.json
directives/
└── doc-maintenance.md
```

## Email Capture (Mini CRM)

- **Database:** Supabase (free tier) — `contacts` table with RLS, email uniqueness, JSONB metadata
- **Email:** Resend (free tier, 3K/month) — welcome email on signup
- **API:** `/api/subscribe` — validates email, upserts to Supabase, fires Resend welcome email
- **Form:** Glass-morphic input + "Notify Me" button with loading/success/error states

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key for server-side DB access |
| `RESEND_API_KEY` | Resend transactional email key |

## Page Design

- **Layout:** "Something Big is Coming" headline positioned **above** the glowing orb, with "MasteryTV" subtitle beneath the headline
- **Orb animation:** Starts near-dark, reveals blue glow over **3 seconds** (`glow-reveal`), then pulses continuously (`pulse-glow`, 4s loop)
- **Text animation:** Slow fade-in + rise over **2.4 seconds** with staggered delays (heading 0.3s, brand 1s)
- **Star field:** 20 deterministic CSS-animated stars with varied twinkle durations
- **Design tokens:** `--bg-black: #000000`, `--accent-blue: #4F6EF7`, `--accent-glow: #6C8CFF`
- **Fonts:** Cinzel (headings, 400/600) + Josefin Sans (body, 300/400) via `next/font/google`
- **SEO:** OG tags, Twitter card, JSON-LD (Organization + WebSite schema), robots.txt, sitemap.xml

<!-- Last updated: 2026-02-19 -->
