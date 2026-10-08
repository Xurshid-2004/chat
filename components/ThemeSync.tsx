"use client";

import { useEffect } from "react";

import { syncThemeOnLoad } from "@/lib/theme";

/** Applies the saved theme to the browser bar colour once the page is interactive. */
export function ThemeSync() {
  useEffect(() => {
    syncThemeOnLoad();
  }, []);
  return null;
}
