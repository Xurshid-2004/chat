"use client";

/**
 * Light / dark / system theme. The choice lives in localStorage and is applied
 * as data-theme on <html> (an inline script in the root layout does it before
 * the first paint; see app/layout.tsx).
 */
export type ThemeChoice = "system" | "light" | "dark";

const KEY = "theme";
const BAR_COLORS = { light: "#ffffff", dark: "#000000" } as const;

export function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Keep the browser/status bar colour in step with a forced theme. */
function syncThemeColor(choice: ThemeChoice) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute("media") ?? "";
    const natural = media.includes("dark") ? BAR_COLORS.dark : BAR_COLORS.light;
    meta.content = choice === "system" ? natural : BAR_COLORS[choice];
  });
}

export function applyTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // storage unavailable: the theme still applies for this visit
  }
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  syncThemeColor(choice);
}

/** On load: the inline script already set data-theme; fix the bar colour too. */
export function syncThemeOnLoad() {
  syncThemeColor(readTheme());
}
