"use client";

import { AnimatePresence, motion } from "motion/react";
import { Link2, MessageCirclePlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, usersApi } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { useChats } from "@/lib/store/chat";
import { toast } from "@/lib/store/toast";
import type { User } from "@/lib/types";

const REFRESH_MS = 15_000;

function PersonCard({ user, onStart }: { user: User; onStart: (user: User) => Promise<void> }) {
  const [opening, setOpening] = useState(false);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3"
    >
      <Avatar user={user} size={48} showOnline />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold">{user.display_name}</span>
        <span className="block truncate text-[14px] text-fg-2">{user.is_online ? "online" : `@${user.username}`}</span>
      </span>
      <Button
        size="md"
        loading={opening}
        className="h-10 shrink-0 rounded-full px-4 text-[15px]"
        onClick={async () => {
          setOpening(true);
          try {
            await onStart(user);
          } finally {
            setOpening(false);
          }
        }}
      >
        Start chat
      </Button>
    </motion.li>
  );
}

/** Shown while there are no chats: everyone else here, one tap to start talking. */
export function PeopleSuggestions({ onOpenChat }: { onOpenChat: (chatId: number) => void }) {
  const [people, setPeople] = useState<User[] | null>(null);
  const openChatWith = useChats((state) => state.openChatWith);

  // Refresh now and then: a friend who just tapped "Start" shows up by themselves.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      usersApi
        .people()
        .then((list) => !cancelled && setPeople(list))
        .catch(() => !cancelled && setPeople((current) => current ?? []));
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const start = async (user: User) => {
    try {
      onOpenChat(await openChatWith(user));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not start the chat.");
    }
  };

  const copyLink = async () => {
    if (await copyText(window.location.origin)) toast.success("Link copied: send it to your friend");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-safe pt-6">
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 1.4, delay: 0.4, repeat: Infinity, repeatDelay: 3 }}
          className="mb-4 grid size-20 place-items-center rounded-[26px] bg-accent-soft text-accent"
        >
          <MessageCirclePlus className="size-10" />
        </motion.div>
        <h2 className="text-[20px] font-semibold">No chats yet</h2>
        <p className="mt-1.5 text-[15px] text-fg-2">Start a conversation with someone here.</p>
      </div>

      <div className="mt-6">
        {people === null ? (
          <div className="flex justify-center py-6 text-fg-3">
            <Spinner />
          </div>
        ) : people.length === 0 ? (
          <div className="rounded-2xl bg-surface-2 p-5 text-center">
            <p className="text-[15px] text-fg-2">
              You&apos;re the first one here. Send this site to your friend: when they tap{" "}
              <span className="font-semibold text-fg">Start chatting</span>, they&apos;ll appear right here.
            </p>
            <Button variant="secondary" className="mt-4 bg-surface" onClick={copyLink}>
              <Link2 className="size-4" /> Copy link to this site
            </Button>
          </div>
        ) : (
          <>
            <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-fg-3">People</h3>
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {people.map((person) => (
                  <PersonCard key={person.id} user={person} onStart={start} />
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>
    </motion.div>
  );
}
