"use client";

/**
 * ThemeToggle — 3-state theme switcher (Light / System / Dark)
 *
 * UI/UX skill compliance:
 * - SVG icons (Lucide), not emojis (§ no-emoji-icons)
 * - 44×44px touch targets (§ touch-target-size)  
 * - cursor-pointer on all interactive elements
 * - Smooth 200ms transitions (§ duration-timing)
 * - aria-labels for accessibility (§ aria-labels)
 * - Focus ring on keyboard nav (§ focus-states)
 */

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const THEMES = [
  { value: "light" as const, icon: Sun, label: "Light mode" },
  { value: "system" as const, icon: Monitor, label: "System preference" },
  { value: "dark" as const, icon: Moon, label: "Dark mode" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme preference">
      {THEMES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          className={`theme-toggle__btn ${theme === value ? "theme-toggle__btn--active" : ""}`}
          onClick={() => setTheme(value)}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
