"use client";

import { AtSign, Copy } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { copyText } from "@/lib/clipboard";
import { toast } from "@/lib/store/toast";
import type { User } from "@/lib/types";

import { OnlineStatus } from "./OnlineStatus";

/** The chat partner's public profile. */
export function PeerProfileSheet({ chatId, user, open, onClose }: { chatId: number; user: User | null; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open && !!user} onClose={onClose} label="Profile">
      {user && (
        <div className="flex flex-col items-center px-4 pb-4 pt-3 text-center">
          <Avatar user={user} size={104} showOnline />
          <h2 className="mt-4 text-[24px] font-bold tracking-tight">{user.display_name}</h2>
          <div className="mt-1">
            <OnlineStatus chatId={chatId} peer={user} />
          </div>
          <div className="mt-6 w-full divide-y divide-line overflow-hidden rounded-2xl bg-surface-2 text-left">
            <button
              type="button"
              onClick={async () => {
                if (await copyText(`@${user.username}`)) toast.success("Username copied");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 active:bg-surface-3"
            >
              <AtSign className="size-5 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px]">{user.username}</span>
                <span className="block text-[13px] text-fg-2">Username</span>
              </span>
              <Copy className="size-4 text-fg-3" />
            </button>
            {user.bio && (
              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap break-words text-[16px]">{user.bio}</p>
                <p className="text-[13px] text-fg-2">Bio</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
