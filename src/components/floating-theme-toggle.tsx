"use client";

/**
 * FloatingThemeToggle — Fixed-position theme switcher for pages without a topbar.
 * 
 * Renders a compact pill in the top-right corner with light/system/dark options.
 * Uses the same ThemeProvider context as the dashboard's topbar toggle.
 * 
 * Drop this onto any page that doesn't have the dashboard layout:
 *   <FloatingThemeToggle />
 * 
 * Dual-theme compliant (BRAND.md §2).
 */

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const THEMES = [
  { value: "light" as const, icon: Sun, label: "Light mode" },
  { value: "system" as const, icon: Monitor, label: "System preference" },
  { value: "dark" as const, icon: Moon, label: "Dark mode" },
];

export function FloatingThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="floating-theme-toggle no-print" role="radiogroup" aria-label="Theme preference">
      {THEMES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          className={`floating-theme-toggle__btn ${theme === value ? "floating-theme-toggle__btn--active" : ""}`}
          onClick={() => setTheme(value)}
        >
          <Icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
