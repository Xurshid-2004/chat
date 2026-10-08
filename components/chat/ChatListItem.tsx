"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck, Clock3, FileText, Image as ImageIcon, Mic, Video } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { formatListTime } from "@/lib/format";
import { useAuth } from "@/lib/store/auth";
import { useChats } from "@/lib/store/chat";
import { messagePreview } from "@/lib/text";
import type { Chat, MessageType } from "@/lib/types";

import { TypingDots } from "./OnlineStatus";

const MEDIA_ICONS: Partial<Record<MessageType, typeof ImageIcon>> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  AUDIO: Mic,
  FILE: FileText,
};

function UnreadBadge({ count }: { count: number }) {
  return (
    <AnimatePresence initial={false}>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 26 }}
          className="grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[13px] font-semibold tabular-nums text-accent-fg"
        >
          <motion.span key={count} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {count > 99 ? "99+" : count}
          </motion.span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function ChatListItem({ chat, active, onOpen }: { chat: Chat; active: boolean; onOpen: (id: number) => void }) {
  const meId = useAuth((state) => state.user?.id);
  const typing = useChats((state) => state.typing[chat.id]);
  const message = chat.last_message;
  const peer = chat.peer;
  if (!peer) return null;

  const mine = message?.sender === meId;
  const MediaIcon = message ? MEDIA_ICONS[message.type] : undefined;
  const Tick = !mine || !message ? null : message.id < 0 ? Clock3 : message.is_read ? CheckCheck : Check;

  return (
    <motion.li layout="position" transition={{ type: "spring", stiffness: 500, damping: 40 }}>
      <button
        type="button"
        onClick={() => onOpen(chat.id)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
          active ? "bg-accent-soft" : "active:bg-surface-2 md:hover:bg-surface-2",
        )}
      >
        <Avatar user={peer} size={56} showOnline />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[16px] font-semibold text-fg">{peer.display_name}</span>
            {message && (
              <span className="flex shrink-0 items-center gap-1 text-[13px] text-fg-3">
                {Tick && <Tick className={cn("size-4", message.is_read ? "text-accent" : "text-fg-3")} />}
                {formatListTime(message.created_at)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className="line-clamp-1 min-w-0 text-[15px] leading-5 text-fg-2">
              {typing ? (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <TypingDots />
                  {typing.action === "recording" ? "recording voice…" : "typing…"}
                </span>
              ) : message ? (
                <>
                  {mine && <span className="text-fg">You: </span>}
                  {MediaIcon && <MediaIcon className="mr-1 inline size-4 -translate-y-px text-fg-3" />}
                  {messagePreview(message)}
                </>
              ) : (
                "No messages yet"
              )}
            </span>
            <UnreadBadge count={chat.unread_count} />
          </span>
        </span>
      </button>
    </motion.li>
  );
}
