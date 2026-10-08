"use client";

import { motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { onSessionExpired } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

function goToStart() {
  const here = window.location.pathname + window.location.search;
  window.location.replace(`/?next=${encodeURIComponent(here)}`);
}

function Splash({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-app px-8 pb-safe pt-safe text-center">
      <motion.div
        animate={failed ? { scale: 1, opacity: 0.5 } : { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={failed ? { duration: 0.3 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Logo className="size-20" />
      </motion.div>
      {failed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <p className="flex items-center gap-2 text-[15px] text-fg-2">
            <WifiOff className="size-4" /> Can&apos;t reach the server.
          </p>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Wraps signed-in pages: loads the current user (refreshing the session when
 * needed) and sends the visitor to the start page once the session is gone.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const status = useAuth((state) => state.status);
  const load = useAuth((state) => state.load);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSessionExpired(goToStart);
    load().catch(() => setFailed(true));
  }, [load]);

  useEffect(() => {
    if (status === "guest") goToStart();
  }, [status]);

  if (status !== "authenticated") {
    return (
      <Splash
        failed={failed}
        onRetry={() => {
          setFailed(false);
          load().catch(() => setFailed(true));
        }}
      />
    );
  }
  return children;
}
