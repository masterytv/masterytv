import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mastery Coach — AI Coaching for High-Performers",
  description:
    "Your AI coaching partner that learns how you think, adapts to your style, and proactively drives your agenda forward. Built for founders, leaders, and ambitious professionals.",
  keywords: ["AI coaching", "executive coaching", "business coaching", "personal development"],
  openGraph: {
    title: "Mastery Coach",
    description: "AI coaching that adapts to you.",
    type: "website",
    siteName: "MasteryTV",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-0 text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
