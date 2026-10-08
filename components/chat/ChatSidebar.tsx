"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { Pencil, Search, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useChats } from "@/lib/store/chat";
import { toast } from "@/lib/store/toast";
import type { User } from "@/lib/types";

import { ChatListItem } from "./ChatListItem";
import { ConnectionBadge } from "./ConnectionBadge";
import { PeopleSuggestions } from "./PeopleSuggestions";

interface SidebarProps {
  activeChatId: number | null;
  onOpenChat: (chatId: number) => void;
}

function ListSkeleton() {
  return (
    <ul aria-hidden className="animate-pulse">
      {Array.from({ length: 7 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-4 py-2">
          <div className="size-14 shrink-0 rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded-full bg-surface-2" />
            <div className="h-3.5 w-3/4 rounded-full bg-surface-2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChatList({ activeChatId, onOpenChat }: SidebarProps) {
  const { listLoaded, listFailed, nextCursor } = useChats(
    useShallow((state) => ({ listLoaded: state.listLoaded, listFailed: state.listFailed, nextCursor: state.nextCursor })),
  );
  const chats = useChats((state) => state.chats);
  const order = useChats((state) => state.order);
  const loadChats = useChats((state) => state.loadChats);
  const loadMoreChats = useChats((state) => state.loadMoreChats);
  const sentinel = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => order.filter((id) => chats[id]?.last_message && chats[id]?.peer), [order, chats]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && void loadMoreChats());
    observer.observe(element);
    return () => observer.disconnect();
  }, [nextCursor, loadMoreChats]);

  if (!listLoaded) {
    if (listFailed) {
      return (
        <div className="flex flex-col items-center gap-3 px-8 pt-16 text-center text-fg-2">
          Couldn&apos;t load your chats.
          <button type="button" className="font-semibold text-accent" onClick={() => void loadChats()}>
            Try again
          </button>
        </div>
      );
    }
    return <ListSkeleton />;
  }
  if (visible.length === 0) return <PeopleSuggestions onOpenChat={onOpenChat} />;

  return (
    <>
      <ul className="pb-safe">
        <AnimatePresence initial={false}>
          {visible.map((id) => (
            <ChatListItem key={id} chat={chats[id]} active={id === activeChatId} onOpen={onOpenChat} />
          ))}
        </AnimatePresence>
      </ul>
      {nextCursor && <div ref={sentinel} className="h-8" />}
    </>
  );
}

function PersonRow({ user, onOpen }: { user: User; onOpen: (user: User) => Promise<void> }) {
  const [opening, setOpening] = useState(false);
  return (
    <li>
      <button
        type="button"
        disabled={opening}
        onClick={async () => {
          setOpening(true);
          try {
            await onOpen(user);
          } finally {
            setOpening(false);
          }
        }}
        className="flex w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-2 md:hover:bg-surface-2"
      >
        <Avatar user={user} size={46} showOnline />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold">{user.display_name}</span>
          <span className="block truncate text-[14px] text-fg-2">@{user.username}</span>
        </span>
        {opening && <Spinner className="text-fg-3" />}
      </button>
    </li>
  );
}

function SearchResults({ query, onOpenChat }: { query: string; onOpenChat: (chatId: number) => void }) {
  const term = query.trim().replace(/^@/, "");
  const [result, setResult] = useState<{ term: string; users: User[] } | null>(null);
  const [failedTerm, setFailedTerm] = useState<string | null>(null);
  const openChatWith = useChats((state) => state.openChatWith);

  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      usersApi
        .search(term, controller.signal)
        .then((users) => setResult({ term, users }))
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setFailedTerm(term);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const open = async (user: User) => {
    try {
      onOpenChat(await openChatWith(user));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not open the chat.");
    }
  };

  const loading = result?.term !== term && failedTerm !== term;
  return (
    <section className="pb-safe">
      <h3 className="px-4 pb-1 pt-3 text-[13px] font-semibold uppercase tracking-wide text-fg-3">People</h3>
      {loading ? (
        <div className="flex justify-center py-8 text-fg-3">
          <Spinner />
        </div>
      ) : failedTerm === term ? (
        <p className="px-4 py-6 text-center text-[15px] text-fg-2">Search failed. Check your connection.</p>
      ) : result && result.users.length === 0 ? (
        <p className="px-4 py-6 text-center text-[15px] text-fg-2">No one found for “{term}”.</p>
      ) : (
        <ul>
          {result?.users.map((user) => (
            <PersonRow key={user.id} user={user} onOpen={open} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ChatSidebar({ activeChatId, onOpenChat }: SidebarProps) {
  const me = useAuth((state) => state.user);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const smallTitle = useTransform(scrollY, [28, 52], [0, 1]);
  const hairline = useTransform(scrollY, [40, 60], [0, 1]);

  const findPeople = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    searchRef.current?.focus();
  };

  const openChat = (chatId: number) => {
    setQuery("");
    onOpenChat(chatId);
  };

  return (
    <div className="flex h-full flex-col bg-app">
      <header className="relative z-10 pt-safe">
        <motion.div style={{ opacity: hairline }} className="absolute inset-x-0 bottom-0 h-px bg-line" />
        <div className="flex h-14 items-center justify-between px-3">
          {/* Your avatar + name with a pencil: tap to edit your name and avatar. */}
          <Link
            href="/profile"
            aria-label="Edit your profile"
            className="flex max-w-[34%] items-center gap-2 rounded-full p-1 pr-2 active:bg-surface-2 md:hover:bg-surface-2"
          >
            {me && (
              <span className="relative shrink-0">
                <Avatar user={me} size={34} />
                <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-accent text-accent-fg ring-2 ring-app">
                  <Pencil className="size-2.5" strokeWidth={3} />
                </span>
              </span>
            )}
            <span className="truncate text-[15px] font-medium">{me?.display_name}</span>
          </Link>
          <div className="absolute left-1/2 -translate-x-1/2">
            <ConnectionBadge>
              <motion.span style={{ opacity: smallTitle }} className="text-[17px] font-semibold">
                Chats
              </motion.span>
            </ConnectionBadge>
          </div>
          <IconButton label="New chat" onClick={findPeople}>
            <SquarePen className="size-[22px] text-accent" />
          </IconButton>
        </div>
      </header>

      <motion.div ref={scrollRef} layoutScroll className="flex-1 overflow-y-auto overscroll-contain">
        <h1 className="px-4 pb-2 pt-1 text-[34px] font-bold leading-tight tracking-tight">Chats</h1>
        <div className="px-4 pb-2">
          <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-fg-3 focus-within:text-accent">
            <Search className="size-[18px] shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              inputMode="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search people by username"
              aria-label="Search people"
              className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-3 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-fg-3">
                <X className="size-[18px]" />
              </button>
            )}
          </label>
        </div>
        {query.trim().replace(/^@/, "") ? (
          <SearchResults query={query} onOpenChat={openChat} />
        ) : (
          <ChatList activeChatId={activeChatId} onOpenChat={onOpenChat} />
        )}
      </motion.div>
    </div>
  );
}
