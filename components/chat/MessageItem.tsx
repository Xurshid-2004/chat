"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Check, CheckCheck, CircleAlert, Clock3, Reply } from "lucide-react";
import { memo, useRef } from "react";

import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/store/chat";
import { isEmojiOnly, linkify, messagePreview } from "@/lib/text";

import { MessageMedia } from "./MessageMedia";

export interface MenuRequest {
  message: ChatMessage;
  x: number;
  y: number;
}

interface MessageItemProps {
  message: ChatMessage;
  mine: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  peerName: string;
  highlighted: boolean;
  onReply: (message: ChatMessage) => void;
  onMenu: (request: MenuRequest) => void;
  onRetry: (message: ChatMessage) => void;
  onJumpTo: (messageId: number) => void;
  onOpenMedia: (message: ChatMessage) => void;
}

const SWIPE_TO_REPLY = 56;
const LONG_PRESS_MS = 420;

function DeliveryTick({ message }: { message: ChatMessage }) {
  if (message.delivery === "sending") return <Clock3 className="size-3.5" aria-label="Sending" />;
  if (message.delivery === "failed") return null;
  return message.is_read ? (
    <CheckCheck className="size-4" aria-label="Read" />
  ) : (
    <Check className="size-4" aria-label="Sent" />
  );
}

function Meta({ message, mine, className }: { message: ChatMessage; mine: boolean; className?: string }) {
  return (
    <span className={cn("pointer-events-none flex select-none items-center gap-1 text-[11px] leading-none tabular-nums", className)}>
      {formatTime(message.created_at)}
      {mine && <DeliveryTick message={message} />}
    </span>
  );
}

function RichText({ text, mine }: { text: string; mine: boolean }) {
  return (
    <>
      {linkify(text).map((part, index) =>
        part.type === "link" ? (
          <a
            key={index}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={cn("underline underline-offset-2", mine ? "text-white" : "text-accent")}
            onClick={(event) => event.stopPropagation()}
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </>
  );
}

function ReplyQuote({ message, mine, peerName, onJumpTo }: Pick<MessageItemProps, "message" | "mine" | "peerName" | "onJumpTo">) {
  const reply = message.reply_to;
  if (!reply) return null;
  const author = reply.sender === message.sender ? (mine ? "You" : peerName) : mine ? peerName : "You";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onJumpTo(reply.id);
      }}
      className={cn(
        "mb-1 flex w-full min-w-0 flex-col rounded-xl border-l-[3px] px-2.5 py-1 text-left",
        mine ? "border-white/80 bg-white/15" : "border-accent bg-accent-soft",
      )}
    >
      <span className={cn("truncate text-[13px] font-semibold", mine ? "text-white" : "text-accent")}>{author}</span>
      <span className={cn("line-clamp-1 text-[14px]", mine ? "text-white/85" : "text-fg-2")}>{messagePreview(reply)}</span>
    </button>
  );
}

function MessageItemBase(props: MessageItemProps) {
  const { message, mine, startsGroup, endsGroup, highlighted, onReply, onMenu, onRetry, onOpenMedia } = props;
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, [-SWIPE_TO_REPLY, -12], [1, 0]);
  const replyIconScale = useTransform(x, [-SWIPE_TO_REPLY, -12], [1, 0.4]);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const emojiOnly = message.type === "TEXT" && isEmojiOnly(message.text);
  const hasMedia = message.type !== "TEXT";
  // Photos/videos without a caption carry the time on a dark pill over the picture.
  const timeOverMedia = (message.type === "IMAGE" || message.type === "VIDEO") && !message.text;

  const cancelPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    pressStart.current = { x: event.clientX, y: event.clientY };
    const { clientX, clientY } = event;
    pressTimer.current = window.setTimeout(() => {
      navigator.vibrate?.(8);
      onMenu({ message, x: clientX, y: clientY });
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const start = pressStart.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) cancelPress();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_TO_REPLY) {
      navigator.vibrate?.(6);
      onReply(message);
    }
  };

  const bubbleShape = mine
    ? cn("rounded-[20px]", !startsGroup && "rounded-tr-[8px]", endsGroup ? "rounded-br-[6px]" : "rounded-br-[8px]")
    : cn("rounded-[20px]", !startsGroup && "rounded-tl-[8px]", endsGroup ? "rounded-bl-[6px]" : "rounded-bl-[8px]");

  return (
    <motion.div
      id={`message-${message.id}`}
      initial={message.fresh ? { opacity: 0, y: 16, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      style={{ originX: mine ? 1 : 0, originY: 1 }}
      className={cn("relative flex w-full items-end gap-1.5", mine ? "justify-end" : "justify-start", startsGroup ? "mt-2" : "mt-[3px]")}
    >
      {mine && message.delivery === "failed" && (
        <button
          type="button"
          onClick={() => onRetry(message)}
          aria-label="Send again"
          className="mb-1 grid size-7 shrink-0 place-items-center rounded-full text-danger active:scale-90"
        >
          <CircleAlert className="size-6" />
        </button>
      )}

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.45, right: 0 }}
        dragSnapToOrigin
        onDragStart={cancelPress}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(event) => {
          event.preventDefault();
          cancelPress();
          onMenu({ message, x: event.clientX, y: event.clientY });
        }}
        onDoubleClick={() => onReply(message)}
        className={cn("max-w-[min(82%,560px)] select-none md:select-text", message.delivery === "sending" && "opacity-90")}
      >
        {emojiOnly ? (
          <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
            <span className="text-[46px] leading-[1.15]">{message.text}</span>
            <Meta message={message} mine={mine} className="rounded-full bg-surface-2 px-2 py-1 text-fg-2" />
          </div>
        ) : (
          <motion.div
            animate={highlighted ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "relative overflow-hidden text-[16px] leading-[1.35] transition-shadow",
              mine ? "bg-bubble-out text-bubble-out-fg" : "bg-bubble-in text-bubble-in-fg",
              bubbleShape,
              highlighted && "ring-4 ring-accent/35",
              // Media sets the width; a caption wraps inside it instead of widening the bubble.
              hasMedia ? "w-min p-1" : "px-3.5 py-[7px]",
            )}
          >
            <ReplyQuote {...props} />
            {hasMedia && <MessageMedia message={message} mine={mine} onOpen={onOpenMedia} />}
            {message.text ? (
              <p className={cn("whitespace-pre-wrap break-words [overflow-wrap:anywhere]", hasMedia && "px-2.5 pb-1.5 pt-1")}>
                <RichText text={message.text} mine={mine} />
                <span className={cn("inline-block", mine ? "w-[68px]" : "w-12")} aria-hidden />
              </p>
            ) : null}
            <Meta
              message={message}
              mine={mine}
              className={cn(
                "absolute",
                timeOverMedia
                  ? "bottom-3 right-3.5 rounded-full bg-black/45 px-1.5 py-1 text-white"
                  : cn("bottom-[7px] right-3", mine ? "text-white/75" : "text-fg-3"),
              )}
            />
          </motion.div>
        )}
      </motion.div>

      <motion.span
        aria-hidden
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
        className="pointer-events-none absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-fg-2"
      >
        <Reply className="size-4" />
      </motion.span>
    </motion.div>
  );
}

export const MessageItem = memo(MessageItemBase);
