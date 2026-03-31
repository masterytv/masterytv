/**
 * Legacy Letter AI — PDF Generator
 *
 * Uses @react-pdf/renderer to generate a premium-looking PDF.
 * Page 1: The Letter (aged parchment feel, serif font)
 * Page 2: Legacy Statement 1-Pager (distilled, frameable)
 * Page 3+: 90-Day Protocol (if purchased)
 */
import React from 'react';
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Google Fonts for premium typography
Font.register({
    family: 'Playfair Display',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKd3unDXbtM.ttf', fontWeight: 700 },
        { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtbK-F3rA.ttf', fontWeight: 400, fontStyle: 'italic' },
    ],
});

Font.register({
    family: 'Lato',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.ttf', fontWeight: 700 },
    ],
});

const parchment = '#faf6f0';
const inkDark = '#2c2218';
const inkMedium = '#5a4a3a';
const inkLight = '#8a7a6a';
const accentGold = '#b8964e';

const styles = StyleSheet.create({
    // ── Letter Page ──────────────────────────────────
    letterPage: {
        backgroundColor: parchment,
        paddingTop: 72,
        paddingBottom: 60,
        paddingHorizontal: 64,
    },
    letterHeader: {
        textAlign: 'center',
        marginBottom: 40,
        borderBottomWidth: 0.5,
        borderBottomColor: accentGold,
        paddingBottom: 20,
    },
    letterTitle: {
        fontFamily: 'Playfair Display',
        fontSize: 22,
        color: inkDark,
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    letterSubtitle: {
        fontFamily: 'Lato',
        fontSize: 9,
        color: inkLight,
        letterSpacing: 3,
        textTransform: 'uppercase' as const,
    },
    letterBody: {
        fontFamily: 'Playfair Display',
        fontSize: 11.5,
        lineHeight: 1.8,
        color: inkDark,
        textAlign: 'justify' as const,
    },
    letterParagraph: {
        marginBottom: 14,
    },
    signature: {
        fontFamily: 'Playfair Display',
        fontStyle: 'italic',
        fontSize: 16,
        color: inkMedium,
        marginTop: 36,
        textAlign: 'right' as const,
    },
    // ── Legacy Statement Page ────────────────────────
    statementPage: {
        backgroundColor: '#1a1a1a',
        paddingTop: 120,
        paddingBottom: 80,
        paddingHorizontal: 72,
        justifyContent: 'center' as const,
    },
    statementLabel: {
        fontFamily: 'Lato',
        fontSize: 8,
        color: '#666',
        letterSpacing: 4,
        textTransform: 'uppercase' as const,
        marginBottom: 24,
        textAlign: 'center' as const,
    },
    statementText: {
        fontFamily: 'Playfair Display',
        fontSize: 18,
        lineHeight: 1.7,
        color: '#e8e0d4',
        textAlign: 'center' as const,
        marginBottom: 40,
    },
    statementName: {
        fontFamily: 'Playfair Display',
        fontStyle: 'italic',
        fontSize: 14,
        color: accentGold,
        textAlign: 'center' as const,
        marginTop: 20,
    },
    statementBrand: {
        fontFamily: 'Lato',
        fontSize: 7,
        color: '#444',
        letterSpacing: 3,
        textTransform: 'uppercase' as const,
        textAlign: 'center' as const,
        position: 'absolute' as const,
        bottom: 40,
        left: 0,
        right: 0,
    },
    // ── Protocol Page ────────────────────────────────
    protocolPage: {
        backgroundColor: '#ffffff',
        paddingTop: 56,
        paddingBottom: 48,
        paddingHorizontal: 56,
    },
    protocolTitle: {
        fontFamily: 'Playfair Display',
        fontSize: 20,
        color: inkDark,
        textAlign: 'center' as const,
        marginBottom: 6,
    },
    protocolSubtitle: {
        fontFamily: 'Lato',
        fontSize: 9,
        color: inkLight,
        textAlign: 'center' as const,
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
        marginBottom: 32,
        borderBottomWidth: 0.5,
        borderBottomColor: '#ddd',
        paddingBottom: 16,
    },
    protocolBody: {
        fontFamily: 'Lato',
        fontSize: 10,
        lineHeight: 1.65,
        color: '#333',
    },
    protocolParagraph: {
        marginBottom: 8,
    },
    weekHeading: {
        fontFamily: 'Playfair Display',
        fontWeight: 700,
        fontSize: 12,
        color: inkDark,
        marginTop: 16,
        marginBottom: 4,
    },
});

interface PDFInput {
    firstName: string;
    letterText: string;
    protocolText?: string;
}

/** Split the letter text into paragraphs */
function splitParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(Boolean);
}

/** Extract a "legacy statement" from the letter (last 2 paragraphs before signature) */
function extractStatement(letterText: string, firstName: string): string {
    const paragraphs = splitParagraphs(letterText);
    // Remove the signature line (just the name)
    const filtered = paragraphs.filter(
        (p) => p.trim().toLowerCase() !== firstName.toLowerCase()
    );
    // Take the last full paragraph as the statement
    const last = filtered[filtered.length - 1] || '';
    const secondLast = filtered[filtered.length - 2] || '';
    // Use whichever is shorter (more punchy) as the statement
    return last.length < secondLast.length && last.length > 20 ? last : secondLast;
}

function LegacyLetterDocument({ firstName, letterText, protocolText }: PDFInput) {
    const paragraphs = splitParagraphs(letterText);
    const statement = extractStatement(letterText, firstName);

    return (
        <Document
            title={`Legacy Letter — ${firstName}`}
            author="MasteryTV"
            subject="A Letter From Your Future Self"
        >
            {/* Page 1: The Letter */}
            <Page size="LETTER" style={styles.letterPage}>
                <View style={styles.letterHeader}>
                    <Text style={styles.letterTitle}>A Letter From Your Future Self</Text>
                    <Text style={styles.letterSubtitle}>Written at the peak of everything you built</Text>
                </View>
                <View style={styles.letterBody}>
                    {paragraphs.map((para, i) => {
                        // Check if this is the signature line (just the name)
                        if (para.trim().toLowerCase() === firstName.toLowerCase()) {
                            return (
                                <Text key={i} style={styles.signature}>
                                    {firstName}
                                </Text>
                            );
                        }
                        return (
                            <Text key={i} style={styles.letterParagraph}>
                                {para}
                            </Text>
                        );
                    })}
                </View>
            </Page>

            {/* Page 2: Legacy Statement (dark, frameable) */}
            <Page size="LETTER" style={styles.statementPage}>
                <Text style={styles.statementLabel}>Your Legacy Statement</Text>
                <Text style={styles.statementText}>&ldquo;{statement}&rdquo;</Text>
                <Text style={styles.statementName}>— {firstName}</Text>
                <Text style={styles.statementBrand}>MasteryTV · masterytv.com/legacy</Text>
            </Page>

            {/* Page 3+: Protocol (if $27 tier) */}
            {protocolText && (
                <Page size="LETTER" style={styles.protocolPage} wrap>
                    <Text style={styles.protocolTitle}>
                        Your Legacy Builder Protocol
                    </Text>
                    <Text style={styles.protocolSubtitle}>
                        90 days · 12 weeks · Your personal coaching plan
                    </Text>
                    <View style={styles.protocolBody}>
                        {splitParagraphs(protocolText).map((para, i) => {
                            // Detect week headings (e.g., "**Week 1: ...")
                            const weekMatch = para.match(/^\*?\*?Week\s+\d+/i);
                            if (weekMatch) {
                                // Strip markdown bold markers
                                const clean = para.replace(/\*\*/g, '');
                                return (
                                    <Text key={i} style={styles.weekHeading}>
                                        {clean}
                                    </Text>
                                );
                            }
                            return (
                                <Text key={i} style={styles.protocolParagraph}>
                                    {para.replace(/\*\*/g, '')}
                                </Text>
                            );
                        })}
                    </View>
                </Page>
            )}
        </Document>
    );
}

/**
 * Render the Legacy Letter PDF to a Node Buffer.
 * Called from the webhook route after AI generation.
 */
export async function renderLegacyPDF(input: PDFInput): Promise<Buffer> {
    const buffer = await renderToBuffer(
        <LegacyLetterDocument {...input} />
    );
    return Buffer.from(buffer);
}
