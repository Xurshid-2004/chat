"use client";

import { AnimatePresence, motion } from "motion/react";

import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { useConnection } from "@/lib/store/connection";

interface ConnectionBadgeProps {
  children: React.ReactNode;
  /** "sm" fits a status line under a name; "md" replaces a title. */
  size?: "sm" | "md";
}

/** Shows its children while connected, "Connecting…" / "Waiting for network…" otherwise. */
export function ConnectionBadge({ children, size = "md" }: ConnectionBadgeProps) {
  const status = useConnection((state) => state.status);
  const label = status === "offline" ? "Waiting for network…" : status === "connecting" ? "Connecting…" : null;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {label ? (
        <motion.span
          key={label}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap text-fg-2",
            size === "sm" ? "h-[18px] text-[13px] leading-[18px]" : "text-[15px] font-semibold",
          )}
        >
          <Spinner className={size === "sm" ? "size-3" : "size-4"} />
          {label}
        </motion.span>
      ) : (
        <motion.span key="ok" className="block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
