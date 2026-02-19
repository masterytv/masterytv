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
src/app/
├── layout.tsx      # Root layout: fonts, SEO meta, JSON-LD
├── page.tsx        # Main page: orb, stars, messaging
└── globals.css     # Design tokens, animations, responsive
public/
├── robots.txt      # Crawl directives
├── sitemap.xml     # Single-page sitemap
└── manifest.json   # PWA manifest
```

<!-- Last updated: 2026-02-19 -->
