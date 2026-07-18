import type { Metadata } from "next";
import "./globals.css";
import { ThemeProviderWrapper } from "@/components/theme-provider-wrapper";

export const metadata: Metadata = {
  title: "Mastery Coach — Coaching for High-Performers",
  description:
    "Not a chatbot. A coach that knows your name. Mastery Coach remembers your people, your goals, your fears, and your wins — and uses 20+ proven frameworks to coach you in your own style.",
  keywords: [
    "personal coaching",
    "executive coaching",
    "business coaching",
    "personal development",
    "online coach",
    "founder coaching",
    "leadership coaching",
  ],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Mastery Coach — Coaching for High-Performers",
    description:
      "A coach that remembers everything that matters about you. 20+ frameworks. Adapted to how you think.",
    type: "website",
    siteName: "Mastery Coach",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mastery Coach — Coaching for High-Performers",
    description:
      "Not a chatbot. A coach that knows your name, your goals, and your blind spots.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" data-theme="light" data-brand="masterytv" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
        {/* Inline script prevents flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('mastery-theme-preference');
                  var theme = stored || 'system';
                  var resolved = theme;
                  if (theme === 'system') {
                    try {
                      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    } catch(e) { resolved = 'light'; }
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.className = resolved;
                } catch(e) {}
                // PA3/PB1: brand resolution (FOUC-free, keeps pages static).
                // Precedence: ?brand= override > Relatti host/route > brand
                // cookie (LOCALHOST ONLY, retired on deployed hosts 2026-07-14)
                // > masterytv. Mirrors middleware + resolveBrandId().
                try {
                  var host = window.location.hostname;
                  var path = window.location.pathname;
                  var urlBrand = new URLSearchParams(window.location.search).get('brand');
                  var isLocalHost = (host === 'localhost' || host === '127.0.0.1');
                  var ck = document.cookie.match(/(?:^|; )brand=([^;]+)/);
                  var cookieBrand = (isLocalHost && ck) ? decodeURIComponent(ck[1]) : null;
                  var relattiHost = (host === 'relatti.com' || host === 'www.relatti.com' || host === 'staging.relatti.com');
                  // NOTE: this JS lives in a template literal, where "\\/" emits
                  // "\/" — a single "\/" would collapse to "/" and make the
                  // emitted regex a SyntaxError that killed this whole script
                  // (brand AND theme resolution) from 2026-06-22 to 2026-07-02.
                  var relattiPath = /^\\/(relatti|couples|engaged|premarital|challenge|samefight)(\\/|$)/.test(path);
                  // Money uses plain string checks (no regex) — deliberately
                  // avoiding the "\\/" template-literal footgun that killed this
                  // whole script 06-22→07-02.
                  var moneyHost = (host === 'moneymaps.masterytv.com' || host === 'staging.moneymaps.masterytv.com');
                  var moneyPath = (path === '/money' || path.indexOf('/money/') === 0);
                  var hostBrand = (relattiHost || relattiPath) ? 'relatti' : 'masterytv';
                  var brand = (urlBrand === 'relatti' || urlBrand === 'masterytv' || urlBrand === 'money') ? urlBrand
                    : (relattiHost || relattiPath) ? 'relatti'
                    : (moneyHost || moneyPath) ? 'money'
                    : (cookieBrand === 'relatti' || cookieBrand === 'masterytv' || cookieBrand === 'money') ? cookieBrand
                    : 'masterytv';
                  document.documentElement.setAttribute('data-brand', brand);
                  // Brand-aware favicon/touch icon, same FOUC-free client-side
                  // mechanism as data-brand (keeps pages static — no Host read).
                  // Metadata's default (MasteryTV) icons are rewritten in place
                  // and the resolved brand's set appended once the head is parsed.
                  // Data-driven per brand (relatti + money) — no per-brand ternary;
                  // masterytv keeps the metadata default (no entry → no swap).
                  var ICON_SETS = {
                    relatti: { dir: '/relatti/', fav: '/relatti/favicon-32.png', svg: '/relatti/icon.svg', apple: '/relatti/apple-touch-icon.png', flag: 'data-relatti-icon' },
                    money: { dir: '/money/', fav: '/money/favicon-32.png', svg: '/money/icon.svg', apple: '/money/apple-touch-icon.png', flag: 'data-money-icon' }
                  };
                  var iconSet = ICON_SETS[brand];
                  if (iconSet) {
                    // STRICTLY NON-DESTRUCTIVE swap. Never remove or move the
                    // metadata-rendered <link> nodes — Next owns them, and
                    // deleting them silently breaks every subsequent soft
                    // navigation (URL changes, page doesn't — the "two clicks"
                    // bug). Instead: rewrite their hrefs in place (attribute-
                    // only), and append OUR icon links as foreign nodes Next
                    // ignores. Duplicate rel=icon links are valid; the last
                    // one wins in practice.
                    var setIcons = function() {
                      try {
                        document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(function(l) {
                          var href = l.getAttribute('href') || '';
                          if (href.indexOf(iconSet.dir) === 0) return;
                          if (l.getAttribute('rel') === 'apple-touch-icon') {
                            l.setAttribute('href', iconSet.apple);
                          } else {
                            l.setAttribute('href', iconSet.fav);
                            if (l.getAttribute('type')) l.setAttribute('type', 'image/png');
                          }
                        });
                        [['icon', iconSet.svg, 'image/svg+xml'],
                         ['apple-touch-icon', iconSet.apple, '']].forEach(function(s) {
                          if (document.querySelector('link[' + iconSet.flag + '][href="' + s[1] + '"]')) return;
                          var l = document.createElement('link');
                          l.rel = s[0]; l.href = s[1]; if (s[2]) l.type = s[2];
                          l.setAttribute(iconSet.flag, '');
                          document.head.appendChild(l);
                        });
                      } catch(e) {}
                    };
                    var startIconGuard = function() {
                      setIcons();
                      try {
                        var mo = new MutationObserver(setIcons);
                        mo.observe(document.head, { childList: true });
                        setTimeout(function() { mo.disconnect(); }, 10000);
                      } catch(e) {}
                    };
                    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startIconGuard);
                    else startIconGuard();
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface-0 text-text-primary antialiased">
        <ThemeProviderWrapper>
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
