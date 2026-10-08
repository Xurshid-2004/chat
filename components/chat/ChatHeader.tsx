"use client";

import { ChevronLeft, Ellipsis } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import type { Chat } from "@/lib/types";

import { ConnectionBadge } from "./ConnectionBadge";
import { OnlineStatus } from "./OnlineStatus";

interface ChatHeaderProps {
  chat: Chat | undefined;
  showBack: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
}

/** Floating header: round back button, a frosted pill with the person, a round menu button. */
export function ChatHeader({ chat, showBack, onBack, onOpenProfile }: ChatHeaderProps) {
  const peer = chat?.peer ?? null;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-linear-to-b from-app from-40% via-app/85 to-transparent px-3 pb-6 pt-safe">
      <div className="pointer-events-auto mt-2 flex items-center gap-2">
        {showBack && (
          <IconButton label="Back to chats" glass onClick={onBack}>
            <ChevronLeft className="size-6" />
          </IconButton>
        )}
        <button
          type="button"
          onClick={onOpenProfile}
          disabled={!peer}
          className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-glass py-1 pl-1 pr-4 text-left shadow-float backdrop-blur-xl backdrop-saturate-150 active:scale-[0.99]"
        >
          {peer ? <Avatar user={peer} size={36} /> : <span className="size-9 shrink-0 animate-pulse rounded-full bg-surface-2" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-5">
              {peer ? peer.display_name : <span className="inline-block h-3.5 w-28 animate-pulse rounded-full bg-surface-2" />}
            </span>
            {chat && (
              <ConnectionBadge size="sm">
                <OnlineStatus chatId={chat.id} peer={peer} />
              </ConnectionBadge>
            )}
          </span>
        </button>
        <IconButton label="Chat info" glass onClick={onOpenProfile} disabled={!peer}>
          <Ellipsis className="size-6" />
        </IconButton>
      </div>
    </header>
  );
}
