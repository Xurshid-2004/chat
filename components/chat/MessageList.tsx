"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { dayKey, formatDayLabel } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useAuth } from "@/lib/store/auth";
import { EMPTY_CONVERSATION, useChats, type ChatMessage } from "@/lib/store/chat";
import { toast } from "@/lib/store/toast";

import { MediaViewer } from "./MediaViewer";
import { MessageItem, type MenuRequest } from "./MessageItem";
import { MessageMenu } from "./MessageMenu";
import { TypingDots } from "./OnlineStatus";

const GROUP_GAP_MS = 5 * 60_000;
const NEAR_BOTTOM_PX = 80;

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: ChatMessage; startsGroup: boolean; endsGroup: boolean };

function continues(previous: ChatMessage | undefined, message: ChatMessage): boolean {
  if (!previous || previous.sender !== message.sender) return false;
  if (dayKey(previous.created_at) !== dayKey(message.created_at)) return false;
  return Date.parse(message.created_at) - Date.parse(previous.created_at) < GROUP_GAP_MS;
}

function buildRows(messages: ChatMessage[], now: Date): Row[] {
  const rows: Row[] = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const day = dayKey(message.created_at);
    if (!previous || dayKey(previous.created_at) !== day) {
      rows.push({ kind: "day", key: `day-${day}`, label: formatDayLabel(message.created_at, now) });
    }
    rows.push({
      kind: "message",
      key: message.client_id ?? `id-${message.id}`,
      message,
      startsGroup: !continues(previous, message),
      endsGroup: !next || !continues(message, next),
    });
  });
  return rows;
}

interface MessageListProps {
  chatId: number;
  peerName: string;
  scrollSignal: number;
  onReply: (message: ChatMessage) => void;
  onGreet: () => void;
}

export function MessageList({ chatId, peerName, scrollSignal, onReply, onGreet }: MessageListProps) {
  const conversation = useChats((state) => state.conversations[chatId]) ?? EMPTY_CONVERSATION;
  const typing = useChats((state) => state.typing[chatId]);
  const loadOlder = useChats((state) => state.loadOlder);
  const retry = useChats((state) => state.retry);
  const deleteMessage = useChats((state) => state.deleteMessage);
  const meId = useAuth((state) => state.user?.id);
  const now = useNow(60_000);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [bottomAnchorId, setBottomAnchorId] = useState(0);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);

  const { messages, loaded, hasMore, loadingOlder } = conversation;
  const rows = useMemo(() => buildRows(messages, now), [messages, now]);
  const lastConfirmedId = useMemo(() => messages.findLast((message) => message.id > 0)?.id ?? 0, [messages]);
  const missed = atBottom ? 0 : messages.filter((m) => m.id > bottomAnchorId && m.sender !== meId).length;

  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Sending a message always brings the conversation back to the newest message.
  useEffect(() => {
    if (scrollSignal) scrollToBottom();
  }, [scrollSignal, scrollToBottom]);

  // Older messages load as the top of the history comes into view.
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !hasMore || !loaded) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && void loadOlder(chatId), {
      root: scrollRef.current,
      rootMargin: "600px 0px 0px 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [chatId, hasMore, loaded, loadOlder]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    // flex-col-reverse: scrollTop is 0 at the bottom and negative above it.
    const nearBottom = Math.abs(element.scrollTop) < NEAR_BOTTOM_PX;
    setAtBottom(nearBottom);
    if (nearBottom) setBottomAnchorId(lastConfirmedId);
  };

  const jumpTo = useCallback((messageId: number) => {
    const element = document.getElementById(`message-${messageId}`);
    if (!element) {
      toast.info("That message is further back in the history.");
      return;
    }
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlighted(messageId);
    window.setTimeout(() => setHighlighted((current) => (current === messageId ? null : current)), 1400);
  }, []);

  const openMenu = useCallback((request: MenuRequest) => setMenu(request), []);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full flex-col-reverse overflow-y-auto overscroll-contain px-3 pb-2 pt-[calc(env(safe-area-inset-top)+72px)]"
      >
        <div className="flex flex-col">
          {!loaded ? (
            <div className="flex justify-center py-10 text-fg-3">
              <Spinner className="size-6" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto my-10 flex max-w-[260px] flex-col items-center rounded-[28px] bg-surface-2 px-6 py-7 text-center"
            >
              <p className="text-[17px] font-semibold">No messages here yet</p>
              <p className="mt-1 text-[15px] text-fg-2">Send a message or tap the greeting below.</p>
              <motion.button
                type="button"
                onClick={onGreet}
                whileHover={{ rotate: [0, -14, 14, -8, 0] }}
                whileTap={{ scale: 0.85 }}
                className="mt-4 text-[64px] leading-none"
                aria-label="Send a wave"
              >
                👋
              </motion.button>
            </motion.div>
          ) : (
            rows.map((row) =>
              row.kind === "day" ? (
                <div key={row.key} className="my-3 flex justify-center">
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-fg-2">
                    {row.label}
                  </span>
                </div>
              ) : (
                <MessageItem
                  key={row.key}
                  message={row.message}
                  mine={row.message.sender === meId}
                  startsGroup={row.startsGroup}
                  endsGroup={row.endsGroup}
                  peerName={peerName}
                  highlighted={highlighted === row.message.id}
                  onReply={onReply}
                  onMenu={openMenu}
                  onRetry={retry}
                  onJumpTo={jumpTo}
                  onOpenMedia={setViewing}
                />
              ),
            )
          )}
          <AnimatePresence>
            {typing && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ originX: 0 }}
                className="mt-2 flex"
              >
                <span className="flex h-9 items-center rounded-[20px] rounded-bl-[6px] bg-bubble-in px-4 text-fg-2">
                  <TypingDots />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {hasMore && loaded && (
          <div ref={topSentinelRef} className="flex justify-center py-3 text-fg-3">
            {loadingOlder && <Spinner />}
          </div>
        )}
      </div>

      <AnimatePresence>
        {!atBottom && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 10 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollToBottom()}
            aria-label="Scroll to the newest message"
            className="absolute bottom-3 right-3 z-10 grid size-11 place-items-center rounded-full bg-glass text-fg-2 shadow-float backdrop-blur-xl"
          >
            <ChevronDown className="size-6" />
            {missed > 0 && (
              <span className="absolute -top-1.5 left-1/2 grid h-5 min-w-5 -translate-x-1/2 place-items-center rounded-full bg-accent px-1 text-[12px] font-semibold text-accent-fg">
                {missed}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <MediaViewer
        message={viewing}
        senderName={viewing?.sender === meId ? "You" : peerName}
        onClose={() => setViewing(null)}
      />

      <MessageMenu
        message={menu?.message ?? null}
        mine={menu?.message.sender === meId}
        onClose={() => setMenu(null)}
        onReply={onReply}
        onRetry={retry}
        onDelete={(message) => void deleteMessage(message)}
      />
    </div>
  );
}
