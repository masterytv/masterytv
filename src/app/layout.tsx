import type { Metadata } from "next";
import "./globals.css";
import { ThemeProviderWrapper } from "@/components/theme-provider-wrapper";

export const metadata: Metadata = {
  title: "Mastery Coach — AI Coaching for High-Performers",
  description:
    "Not a chatbot. A coach that knows your name. Mastery Coach remembers your people, your goals, your fears, and your wins — and uses 20+ proven frameworks to coach you in your own style.",
  keywords: [
    "AI coaching",
    "executive coaching",
    "business coaching",
    "personal development",
    "AI coach",
    "founder coaching",
    "leadership coaching",
  ],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Mastery Coach — AI Coaching for High-Performers",
    description:
      "A coach that remembers everything that matters about you. 20+ frameworks. Adapted to how you think.",
    type: "website",
    siteName: "Mastery Coach",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mastery Coach — AI Coaching for High-Performers",
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
    <html lang="en" className="light" data-theme="light" suppressHydrationWarning>
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
