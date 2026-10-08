"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { ChevronLeft, KeyRound, Lock, MessageCircle, ShieldCheck, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { ApiError, moderationApi } from "@/lib/api";
import { formatLastSeen, LOCALE } from "@/lib/format";
import { useAuth } from "@/lib/store/auth";
import { useChats } from "@/lib/store/chat";
import { toast } from "@/lib/store/toast";
import type { Member } from "@/lib/types";

const joinedFormat = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });

type Stage = "loading" | "off" | "locked" | "unlocked" | "failed";

function Header({ onLock }: { onLock?: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-app-subtle/80 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-2xl items-center px-2">
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="grid size-11 place-items-center rounded-full text-accent active:bg-surface-2"
        >
          <ChevronLeft className="size-7" />
        </Link>
        <h1 className="flex-1 text-center text-[17px] font-semibold">Admin</h1>
        {onLock ? (
          <IconButton label="Lock the admin panel" onClick={onLock}>
            <Lock className="size-[20px] text-accent" />
          </IconButton>
        ) : (
          <span className="size-11" />
        )}
      </div>
    </header>
  );
}

function PasswordForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setPending(true);
    setError(undefined);
    try {
      await moderationApi.unlock(password);
      onUnlocked();
    } catch (problem) {
      setPending(false);
      setError(problem instanceof ApiError ? (problem.field("password") ?? problem.message) : "Something went wrong.");
      animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.42 });
    }
  };

  return (
    <motion.form
      ref={scope}
      onSubmit={submit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-10 text-center"
    >
      <span className="mb-4 grid size-20 place-items-center rounded-[26px] bg-accent-soft text-accent">
        <ShieldCheck className="size-10" />
      </span>
      <h2 className="text-[24px] font-bold tracking-tight">Admin access</h2>
      <p className="mt-2 text-[15px] text-fg-2">Enter the admin password to see everyone who joined and remove accounts.</p>
      <TextField
        label="Password"
        icon={KeyRound}
        type="password"
        autoComplete="current-password"
        inputMode="numeric"
        enterKeyHint="go"
        autoFocus
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        className="mt-6 w-full text-left"
      />
      <Button type="submit" size="lg" loading={pending} disabled={!password} className="mt-5 w-full">
        Unlock
      </Button>
    </motion.form>
  );
}

function MemberRow({ member, isMe, onDelete }: { member: Member; isMe: boolean; onDelete: (member: Member) => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginTop: 0, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="flex items-center gap-3 overflow-hidden rounded-[20px] bg-surface p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
    >
      <Avatar user={member} size={48} showOnline />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold">{member.display_name}</span>
          {isMe && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">You</span>}
        </p>
        <p className="truncate text-[13px] text-fg-2">
          @{member.username} · {member.is_online ? "online" : formatLastSeen(member.last_seen)}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-fg-3">
          <span>Joined {joinedFormat.format(new Date(member.created_at))}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" /> {member.chats} {member.chats === 1 ? "chat" : "chats"}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3" /> {member.messages}
          </span>
        </p>
      </div>
      {!isMe && (
        <IconButton label={`Delete ${member.display_name}`} onClick={() => onDelete(member)} className="hover:bg-danger-soft">
          <Trash2 className="size-5 text-danger" />
        </IconButton>
      )}
    </motion.li>
  );
}

function DeleteMemberSheet({ member, onClose, onDeleted }: { member: Member | null; onClose: () => void; onDeleted: (member: Member) => void }) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    if (!member) return;
    setDeleting(true);
    try {
      await moderationApi.deleteMember(member.id);
      onDeleted(member);
    } catch (problem) {
      toast.error(problem instanceof ApiError ? problem.message : "Could not delete the account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={member !== null} onClose={() => !deleting && onClose()} label="Delete account">
      {member && (
        <div className="flex flex-col items-center px-4 pb-2 pt-2 text-center">
          <Avatar user={member} size={64} />
          <h2 className="mt-3 text-[19px] font-semibold">Delete {member.display_name}?</h2>
          <p className="mt-2 text-[15px] text-fg-2">
            Their account and all their chats — messages, photos, videos and files — are deleted for everyone. This
            can&apos;t be undone.
          </p>
          <div className="mt-5 flex w-full flex-col gap-2">
            <Button variant="danger" size="lg" loading={deleting} className="w-full" onClick={confirm}>
              <Trash2 className="size-5" /> Delete account
            </Button>
            <Button variant="secondary" size="lg" className="w-full" disabled={deleting} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function ModerationPage() {
  const me = useAuth((state) => state.user);
  const [stage, setStage] = useState<Stage>("loading");
  const [members, setMembers] = useState<Member[]>([]);
  const [target, setTarget] = useState<Member | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await moderationApi.members());
      setStage("unlocked");
    } catch (problem) {
      // The 12-hour unlock ran out: ask again.
      if (problem instanceof ApiError && problem.status === 403) setStage("locked");
      else setStage("failed");
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const status = await moderationApi.status();
      if (!status.enabled) setStage("off");
      else if (status.unlocked) await loadMembers();
      else setStage("locked");
    } catch {
      setStage("failed");
    }
  }, [loadMembers]);

  useEffect(() => {
    let cancelled = false;
    moderationApi
      .status()
      .then(async (status) => {
        if (cancelled) return;
        if (!status.enabled) setStage("off");
        else if (status.unlocked) await loadMembers();
        else setStage("locked");
      })
      .catch(() => !cancelled && setStage("failed"));
    return () => {
      cancelled = true;
    };
  }, [loadMembers]);

  const lock = async () => {
    await moderationApi.lock().catch(() => undefined);
    setMembers([]);
    setStage("locked");
  };

  const deleted = (member: Member) => {
    setTarget(null);
    setMembers((current) => current.filter((item) => item.id !== member.id));
    // Drop my own chat with them right away (other people learn it over the WebSocket).
    const chats = useChats.getState();
    for (const chat of Object.values(chats.chats)) {
      if (chat.peer?.id === member.id) chats.handleEvent({ type: "chat.deleted", chat_id: chat.id });
    }
    toast.success(`${member.display_name} was deleted`);
  };

  return (
    <main className="min-h-dvh bg-app-subtle pb-[max(env(safe-area-inset-bottom),24px)]">
      <Header onLock={stage === "unlocked" ? lock : undefined} />

      {stage === "loading" && (
        <div className="flex justify-center pt-24 text-fg-3">
          <Spinner />
        </div>
      )}

      {stage === "locked" && <PasswordForm onUnlocked={() => void loadMembers()} />}

      {stage === "off" && (
        <p className="mx-auto max-w-sm px-6 pt-20 text-center text-[15px] text-fg-2">
          The admin panel is turned off. Set <code className="font-mono">CHAT_ADMIN_PASSWORD</code> on the server to use
          it.
        </p>
      )}

      {stage === "failed" && (
        <div className="flex flex-col items-center gap-3 px-6 pt-20 text-center text-fg-2">
          Couldn&apos;t reach the server.
          <button type="button" className="font-semibold text-accent" onClick={() => void check()}>
            Try again
          </button>
        </div>
      )}

      {stage === "unlocked" && (
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-end justify-between pb-3 pt-2">
            <h2 className="text-[30px] font-bold tracking-tight">People</h2>
            <span className="pb-1.5 text-[14px] text-fg-2">{members.length} joined</span>
          </div>
          {members.length === 0 ? (
            <p className="pt-12 text-center text-[15px] text-fg-2">Nobody has joined yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {members.map((member) => (
                  <MemberRow key={member.id} member={member} isMe={member.id === me?.id} onDelete={setTarget} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}

      <DeleteMemberSheet member={target} onClose={() => setTarget(null)} onDeleted={deleted} />
    </main>
  );
}
