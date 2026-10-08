"use client";

import { Copy, Reply, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { copyText } from "@/lib/clipboard";
import type { ChatMessage } from "@/lib/store/chat";
import { toast } from "@/lib/store/toast";
import { messagePreview } from "@/lib/text";

interface MessageMenuProps {
  message: ChatMessage | null;
  mine: boolean;
  onClose: () => void;
  onReply: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
}

export function MessageMenu({ message, mine, onClose, onReply, onRetry, onDelete }: MessageMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    setConfirming(false);
    onClose();
  };
  const run = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <Sheet open={message !== null} onClose={close} label="Message actions">
      {message && (
        <>
          <p className="mx-4 mb-2 line-clamp-2 border-b border-line pb-3 text-[15px] text-fg-2">{messagePreview(message) || " "}</p>
          {confirming ? (
            <div className="px-1 pb-1">
              <p className="px-3 pb-3 text-center text-[15px] text-fg-2">Delete this message for everyone?</p>
              <SheetAction danger icon={<Trash2 className="size-5" />} label="Delete for everyone" onClick={run(() => onDelete(message))} />
              <SheetAction icon={<span />} label="Cancel" onClick={() => setConfirming(false)} />
            </div>
          ) : (
            <div className="pb-1">
              {message.id > 0 && <SheetAction icon={<Reply className="size-5" />} label="Reply" onClick={run(() => onReply(message))} />}
              {message.text && (
                <SheetAction
                  icon={<Copy className="size-5" />}
                  label="Copy text"
                  onClick={run(async () => {
                    if (await copyText(message.text)) toast.success("Copied");
                  })}
                />
              )}
              {message.delivery === "failed" && (
                <SheetAction icon={<RotateCw className="size-5" />} label="Send again" onClick={run(() => onRetry(message))} />
              )}
              {mine && (
                <SheetAction
                  danger
                  icon={<Trash2 className="size-5" />}
                  label={message.id > 0 ? "Delete" : "Cancel sending"}
                  onClick={() => (message.id > 0 ? setConfirming(true) : run(() => onDelete(message))())}
                />
              )}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
