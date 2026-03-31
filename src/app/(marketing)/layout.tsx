import { Cinzel, Josefin_Sans } from "next/font/google";
import "./marketing.css";

// Original typography: Elegant serif for headings, clean sans for body
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-josefin",
  display: "swap",
});

/**
 * Marketing layout — the original "Coming Soon" cinematic design.
 * Preserves the existing lead gen page at masterytv.com root.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${cinzel.variable} ${josefin.variable}`}>
      {children}
    </div>
  );
}
