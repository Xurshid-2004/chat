"use client";

import { create } from "zustand";

import { ApiError, authApi, usersApi } from "../api";
import type { User } from "../types";

type Status = "loading" | "authenticated" | "guest";

interface AuthState {
  user: User | null;
  status: Status;
  /** Load the signed-in user (refreshing the session if needed). */
  load: () => Promise<void>;
  setUser: (user: User) => void;
  /** Signing out or deleting the account on this device is under way. */
  leaving: boolean;
  logout: () => Promise<void>;
  /** Deletes the account for good, then returns to the start screen. Throws if it fails. */
  deleteAccount: () => Promise<void>;
}

let loading: Promise<void> | null = null;

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "loading",

  load: () => {
    loading ??= authApi
      .me()
      .then((user) => set({ user, status: "authenticated" }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          set({ user: null, status: "guest" });
          return;
        }
        throw error;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  },

  setUser: (user) => set({ user, status: "authenticated" }),

  leaving: false,

  logout: async () => {
    set({ leaving: true });
    try {
      await authApi.logout();
    } finally {
      // A full page load clears every in-memory store and hidden (Activity) page.
      window.location.replace("/");
    }
  },

  deleteAccount: async () => {
    set({ leaving: true });
    try {
      await usersApi.deleteAccount();
    } catch (error) {
      set({ leaving: false });
      throw error;
    }
    window.location.replace("/");
  },
}));

/** Only allow redirects to our own pages after starting (no open redirects). */
export function safeNextPath(value: string | null | undefined, fallback = "/chat"): string {
  if (!value || value === "/" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
