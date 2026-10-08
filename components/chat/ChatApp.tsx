"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { Logo } from "@/components/ui/Logo";
import { useMediaQuery, useVisualViewport } from "@/lib/hooks";
import { useRealtime } from "@/lib/realtime";
import { useChats } from "@/lib/store/chat";

import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";

const SLIDE = { type: "spring", stiffness: 380, damping: 40, mass: 0.9 } as const;

function NoChatSelected() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-app-subtle text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SLIDE}>
        <Logo className="size-20 opacity-90" />
      </motion.div>
      <p className="text-[17px] font-semibold">Select a chat</p>
      <p className="max-w-xs text-[15px] text-fg-2">Pick a conversation on the left or find someone new with the search.</p>
    </div>
  );
}

/** Mobile: the open chat slides over the list; swipe from the left edge to go back. */
function MobileChatScreen({ chatId, onBack }: { chatId: number; onBack: () => void }) {
  const drag = useDragControls();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100 || info.velocity.x > 700) onBack();
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SLIDE}
      drag="x"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 1 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 z-10 shadow-[-16px_0_40px_rgb(0_0_0/0.18)]"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 z-30 w-5 touch-none"
        onPointerDown={(event) => drag.start(event)}
      />
      <ChatWindow chatId={chatId} showBack onBack={onBack} />
    </motion.div>
  );
}

export function ChatApp() {
  const searchParams = useSearchParams();
  const chatId = Number(searchParams.get("id")) || null;
  const desktop = useMediaQuery("(min-width: 768px)");
  const loadChats = useChats((state) => state.loadChats);
  const setActiveChat = useChats((state) => state.setActiveChat);
  const openedFromList = useRef(false);

  useVisualViewport();
  useRealtime();

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    setActiveChat(chatId);
    // Closed some other way (e.g. the browser's back button): nothing left to pop.
    if (chatId === null) openedFromList.current = false;
  }, [chatId, setActiveChat]);

  useEffect(() => () => setActiveChat(null), [setActiveChat]);

  const openChat = useCallback(
    (id: number) => {
      if (id === chatId) return;
      // History entries let the phone's back gesture/button close the chat.
      if (chatId === null) {
        openedFromList.current = true;
        window.history.pushState(null, "", `/chat?id=${id}`);
      } else {
        window.history.replaceState(null, "", `/chat?id=${id}`);
      }
    },
    [chatId],
  );

  const closeChat = useCallback(() => {
    if (openedFromList.current) {
      openedFromList.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/chat");
    }
  }, []);

  return (
    <div className="fixed inset-x-0 top-[var(--vv-top,0px)] h-[var(--vvh,100dvh)] overflow-hidden bg-app">
      {desktop ? (
        <div className="flex h-full">
          <aside className="h-full w-[380px] shrink-0 border-r border-line">
            <ChatSidebar activeChatId={chatId} onOpenChat={openChat} />
          </aside>
          <section className="relative h-full min-w-0 flex-1">
            {chatId ? <ChatWindow key={chatId} chatId={chatId} showBack={false} onBack={closeChat} /> : <NoChatSelected />}
          </section>
        </div>
      ) : (
        <>
          <motion.div
            className="absolute inset-0"
            animate={chatId ? { x: "-28%", opacity: 0.7 } : { x: 0, opacity: 1 }}
            transition={SLIDE}
          >
            <ChatSidebar activeChatId={chatId} onOpenChat={openChat} />
          </motion.div>
          <AnimatePresence>
            {chatId && <MobileChatScreen key={chatId} chatId={chatId} onBack={closeChat} />}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
