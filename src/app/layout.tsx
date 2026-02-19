import type { Metadata } from 'next';
import { Cinzel, Josefin_Sans } from 'next/font/google';
import './globals.css';

// Typography: Elegant serif for headings, clean sans for body
const cinzel = Cinzel({
    subsets: ['latin'],
    weight: ['400', '600'],
    variable: '--font-cinzel',
    display: 'swap',
});

const josefin = Josefin_Sans({
    subsets: ['latin'],
    weight: ['300', '400'],
    variable: '--font-josefin',
    display: 'swap',
});

// Comprehensive SEO metadata for a 20-year authority brand returning
export const metadata: Metadata = {
    metadataBase: new URL('https://masterytv.com'),
    title: 'MasteryTV — Something Big is Coming',
    description:
        'MasteryTV is back. After 20 years of empowering entrepreneurs and personal development leaders, something transformative is on the way. Stay tuned.',
    keywords: [
        'MasteryTV',
        'personal development',
        'entrepreneurship',
        'self improvement',
        'mastery',
        'digital learning',
        'coming soon',
    ],
    authors: [{ name: 'MasteryTV' }],
    creator: 'MasteryTV',
    publisher: 'MasteryTV',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://masterytv.com',
        siteName: 'MasteryTV',
        title: 'MasteryTV — Something Big is Coming',
        description:
            'After 20 years of empowering entrepreneurs, MasteryTV is returning with something transformative. Stay tuned.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'MasteryTV — Something Big is Coming',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MasteryTV — Something Big is Coming',
        description:
            'After 20 years of empowering entrepreneurs, MasteryTV is returning with something transformative.',
        images: ['/og-image.png'],
    },
    other: {
        'theme-color': '#000000',
    },
};

// JSON-LD Structured Data — Organization + WebSite schema for rich snippets
const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            name: 'MasteryTV',
            url: 'https://masterytv.com',
            description:
                'MasteryTV has 20 years of authority in personal development and entrepreneurship education.',
            foundingDate: '2006',
        },
        {
            '@type': 'WebSite',
            name: 'MasteryTV',
            url: 'https://masterytv.com',
            description: 'Something big is coming to MasteryTV.',
        },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${cinzel.variable} ${josefin.variable}`}>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
