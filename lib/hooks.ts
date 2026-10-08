"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Live result of a CSS media query. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The current time, refreshed every `intervalMs` (for "last seen 5 minutes ago"). */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * Mirror the visual viewport into CSS variables (--vvh, --vv-top). When the
 * on-screen keyboard opens (iOS Safari doesn't resize the layout), a container
 * sized with them keeps the message input right above the keyboard.
 */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--vvh", `${viewport.height}px`);
      root.style.setProperty("--vv-top", `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vv-top");
    };
  }, []);
}

/** True on touch-first devices, where Enter should add a new line instead of sending. */
export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
