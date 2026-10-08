"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Keyboard, Mic, Paperclip, Reply, Smile, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { useCoarsePointer } from "@/lib/hooks";
import { useAuth } from "@/lib/store/auth";
import type { ChatMessage } from "@/lib/store/chat";
import { messagePreview } from "@/lib/text";

import { EmojiPicker } from "./EmojiPicker";

const MAX_TEXTAREA_HEIGHT = 168;
const MAX_LENGTH = 4096;

// Unsent text per chat survives switching between chats.
const drafts = new Map<number, string>();

interface MessageInputProps {
  chatId: number;
  peerName: string;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (text: string) => void;
  onTyping?: () => void;
  onTypingStop?: () => void;
  onAttach?: () => void;
  /** Mic button: starts a voice message; while `recording`, stops and sends it. */
  onRecord?: () => void;
  recording?: boolean;
  /** Rendered in place of the text field (e.g. the voice recorder). */
  overlay?: React.ReactNode;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function ReplyBar({ message, peerName, onCancel }: { message: ChatMessage; peerName: string; onCancel: () => void }) {
  const meId = useAuth((state) => state.user?.id);
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className="overflow-hidden"
    >
      <div className="mb-2 flex items-center gap-3 rounded-2xl bg-surface-2 py-2 pl-3 pr-1">
        <Reply className="size-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 border-l-2 border-accent pl-2.5">
          <p className="truncate text-[13px] font-semibold text-accent">
            Reply to {message.sender === meId ? "yourself" : peerName}
          </p>
          <p className="truncate text-[14px] text-fg-2">{messagePreview(message)}</p>
        </div>
        <IconButton label="Cancel reply" size={36} onClick={onCancel} className="text-fg-3">
          <X className="size-5" />
        </IconButton>
      </div>
    </motion.div>
  );
}

export function MessageInput({
  chatId,
  peerName,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  onTypingStop,
  onAttach,
  onRecord,
  recording = false,
  overlay,
  textareaRef,
}: MessageInputProps) {
  const [text, setText] = useState(() => drafts.get(chatId) ?? "");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = textareaRef ?? ownRef;
  const coarse = useCoarsePointer();
  const hasText = text.trim().length > 0;
  const showSend = hasText || recording;

  // Grow with the content up to a few lines, then scroll inside.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text, areaRef]);

  const update = (value: string) => {
    setText(value);
    drafts.set(chatId, value);
    if (value.trim()) onTyping?.();
    else onTypingStop?.();
  };

  const send = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    update("");
    setEmojiOpen(false);
    if (!coarse) areaRef.current?.focus();
  };

  // Insert at the caret (the textarea keeps its selection while the picker is used).
  const insertEmoji = (emoji: string) => {
    const area = areaRef.current;
    const start = area?.selectionStart ?? text.length;
    const end = area?.selectionEnd ?? text.length;
    update(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      if (!area) return;
      area.setSelectionRange(start + emoji.length, start + emoji.length);
      if (!coarse) area.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !coarse && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
    if (event.key === "Escape" && replyTo) onCancelReply();
  };

  return (
    <div className="relative z-10 px-2.5 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5">
      <AnimatePresence initial={false}>
        {replyTo && <ReplyBar key="reply" message={replyTo} peerName={peerName} onCancel={onCancelReply} />}
      </AnimatePresence>

      <div className="relative flex items-end gap-2">
        <AnimatePresence>
          {emojiOpen && !overlay && <EmojiPicker key="emoji" onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
        </AnimatePresence>
        <div
          className={cn(
            "relative flex min-h-12 min-w-0 flex-1 items-end rounded-[26px] bg-surface-2 px-1 ring-1 ring-line transition-colors",
            "focus-within:bg-surface focus-within:ring-accent/30",
          )}
        >
          {overlay ?? (
            <>
              <IconButton label="Attach a file" size={40} className="mb-1 text-fg-2" onClick={onAttach}>
                <Paperclip className="size-[22px]" />
              </IconButton>
              <textarea
                ref={areaRef}
                rows={1}
                value={text}
                maxLength={MAX_LENGTH}
                onChange={(event) => update(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message"
                aria-label="Message"
                enterKeyHint={coarse ? "enter" : "send"}
                className="no-scrollbar max-h-[168px] min-w-0 flex-1 resize-none bg-transparent px-1 py-[13px] text-[17px] leading-[22px] text-fg outline-none placeholder:text-fg-3"
              />
              <IconButton
                label={emojiOpen ? "Show keyboard" : "Emoji"}
                size={40}
                className="mb-1 text-fg-2"
                data-emoji-toggle=""
                onClick={() => {
                  if (emojiOpen && coarse) areaRef.current?.focus();
                  setEmojiOpen((open) => !open);
                }}
              >
                {emojiOpen ? <Keyboard className="size-[22px]" /> : <Smile className="size-[22px]" />}
              </IconButton>
            </>
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={hasText ? send : onRecord}
          aria-label={hasText ? "Send message" : recording ? "Send voice message" : "Record a voice message"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-fg shadow-[0_8px_20px_-8px_var(--accent)]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {showSend ? (
              <motion.span
                key="send"
                initial={{ scale: 0.3, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.3, rotate: 90, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
              >
                <ArrowUp className="size-6" strokeWidth={2.5} />
              </motion.span>
            ) : (
              <motion.span
                key="mic"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
              >
                <Mic className="size-6" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
