"use client";

import { create } from "zustand";

/** State of the real-time connection (driven by lib/socket.ts). */
export type ConnectionStatus = "connecting" | "online" | "offline";

export const useConnection = create<{ status: ConnectionStatus; setStatus: (status: ConnectionStatus) => void }>(
  (set) => ({
    status: "connecting",
    setStatus: (status) => set({ status }),
  }),
);
