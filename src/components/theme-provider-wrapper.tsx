"use client";

/**
 * ThemeProviderWrapper — Client component wrapper for the ThemeProvider.
 * Needed because layout.tsx is a Server Component and can't use "use client" directly.
 */

import { ThemeProvider } from "@/components/theme-provider";

export function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
