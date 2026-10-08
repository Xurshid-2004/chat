"use client";

import { create } from "zustand";

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const LIFETIME_MS = 3500;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, kind = "info") => {
    // The same message twice in a row is shown once.
    if (get().toasts.some((toast) => toast.message === message)) return;
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, kind, message }] }));
    window.setTimeout(() => get().dismiss(id), LIFETIME_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const toast = {
  info: (message: string) => useToasts.getState().show(message, "info"),
  success: (message: string) => useToasts.getState().show(message, "success"),
  error: (message: string) => useToasts.getState().show(message, "error"),
};
