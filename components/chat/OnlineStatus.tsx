"use client";

import { AnimatePresence, motion } from "motion/react";

import { formatLastSeen } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useChats } from "@/lib/store/chat";
import type { User } from "@/lib/types";

export function TypingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} aria-hidden>
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="size-[5px] rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/** "typing…" / "online" / "last seen 5 minutes ago" for a chat partner. */
export function OnlineStatus({ chatId, peer }: { chatId: number; peer: User | null }) {
  const typing = useChats((state) => state.typing[chatId]);
  const now = useNow();

  let key: string;
  let content: React.ReactNode;
  if (typing) {
    key = typing.action;
    content = (
      <span className="inline-flex items-center gap-1.5 text-accent">
        <TypingDots />
        {typing.action === "recording" ? "recording voice" : "typing"}
      </span>
    );
  } else if (peer?.is_online) {
    key = "online";
    content = <span className="text-accent">online</span>;
  } else {
    key = "offline";
    content = <span>{peer ? formatLastSeen(peer.last_seen, now) : " "}</span>;
  }

  return (
    <span className="relative block h-[18px] overflow-hidden text-[13px] leading-[18px] text-fg-2">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={key}
          className="flex h-[18px] items-center truncate"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {content}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
