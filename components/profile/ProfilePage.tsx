"use client";

import { motion } from "motion/react";
import { AtSign, Camera, ChevronLeft, Copy, LogOut, NotebookPen, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { ApiError, usersApi } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { LOCALE } from "@/lib/format";
import { useAuth } from "@/lib/store/auth";
import { toast } from "@/lib/store/toast";
import type { User } from "@/lib/types";

import { AvatarPicker } from "./AvatarPicker";
import { DeleteAccountSheet } from "./DeleteAccountSheet";
import { LeaveSheet } from "./LeaveSheet";
import { ThemePicker } from "./ThemePicker";

const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,31}$/;
const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" });

interface Errors {
  first_name?: string;
  username?: string;
  bio?: string;
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mt-6"
    >
      {title && <h2 className="mb-2 ml-1 text-[13px] font-semibold uppercase tracking-wide text-fg-3">{title}</h2>}
      <div className="rounded-[22px] bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">{children}</div>
    </motion.section>
  );
}

function ProfileForm({ user }: { user: User }) {
  const setUser = useAuth((state) => state.setUser);
  const logout = useAuth((state) => state.logout);
  const [name, setName] = useState(user.first_name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const clean = { first_name: name.trim().replace(/\s+/g, " "), username: username.trim(), bio: bio.trim() };
  const dirty = clean.first_name !== user.first_name || clean.username !== user.username || clean.bio !== user.bio;

  const save = async () => {
    const found: Errors = {};
    if (!clean.first_name) found.first_name = "Enter your name.";
    if (!USERNAME_PATTERN.test(clean.username)) {
      found.username = "3–32 characters: letters, digits or _, starting with a letter.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const updated = await usersApi.updateProfile(clean);
      setUser(updated);
      toast.success("Profile saved");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ first_name: error.field("first_name"), username: error.field("username"), bio: error.field("bio") });
        if (!error.field("first_name") && !error.field("username") && !error.field("bio")) toast.error(error.message);
      } else {
        toast.error("Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (data: FormData | Record<string, unknown>, done: string) => {
    setAvatarBusy(true);
    try {
      setUser(await usersApi.updateProfile(data));
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update the avatar.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const uploadPhoto = (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    void changeAvatar(form, "Photo updated");
  };

  return (
    <main className="min-h-dvh bg-app-subtle pb-[max(env(safe-area-inset-bottom),24px)]">
      <header className="sticky top-0 z-20 bg-app-subtle/80 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center px-2">
          <Link
            href="/chat"
            aria-label="Back to chats"
            className="grid size-11 place-items-center rounded-full text-accent active:bg-surface-2"
          >
            <ChevronLeft className="size-7" />
          </Link>
          <h1 className="flex-1 text-center text-[17px] font-semibold">Profile</h1>
          <Button variant="ghost" className="h-11 px-3" disabled={!dirty} loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="flex flex-col items-center pt-4 text-center"
        >
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative rounded-full active:scale-95"
            aria-label="Change avatar"
          >
            <Avatar user={user} size={112} />
            <span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-accent text-accent-fg ring-4 ring-app-subtle">
              {avatarBusy ? <Spinner className="size-4" /> : <Camera className="size-[18px]" />}
            </span>
          </button>
          <p className="mt-4 text-[26px] font-bold tracking-tight">{user.display_name}</p>
          <button
            type="button"
            onClick={async () => {
              if (await copyText(`@${user.username}`)) toast.success("Username copied");
            }}
            className="mt-1 flex items-center gap-1.5 text-[15px] text-fg-2 active:opacity-60"
          >
            @{user.username} <Copy className="size-3.5" />
          </button>
        </motion.div>

        <Section title="Your info">
          <div className="flex flex-col gap-4">
            <TextField
              label="Name"
              icon={UserRound}
              value={name}
              maxLength={40}
              autoComplete="given-name"
              onChange={(event) => setName(event.target.value)}
              error={errors.first_name}
            />
            <TextField
              label="Username"
              icon={AtSign}
              value={username}
              maxLength={32}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => setUsername(event.target.value)}
              error={errors.username}
              hint="Others can find you by this name."
            />
            <TextField
              label="About"
              icon={NotebookPen}
              value={bio}
              maxLength={160}
              placeholder="A few words about you"
              onChange={(event) => setBio(event.target.value)}
              error={errors.bio}
              hint={bio ? `${bio.length}/160` : undefined}
            />
          </div>
        </Section>

        <Section title="Appearance">
          <ThemePicker />
        </Section>

        <Section>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="flex w-full items-center justify-center gap-2 text-[16px] font-semibold text-danger"
          >
            <LogOut className="size-5" /> Leave this account
          </button>
        </Section>

        <Section>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex w-full items-center justify-center gap-2 text-[16px] font-semibold text-danger"
          >
            <Trash2 className="size-5" /> Delete account
          </button>
        </Section>
        <p className="mt-2 px-4 text-center text-[13px] text-fg-3">
          Deletes your profile and all your chats for both sides. This can&apos;t be undone.
        </p>

        <p className="mt-6 text-center text-[13px] text-fg-3">Here since {dateFormat.format(new Date(user.created_at))}</p>
      </div>

      <AvatarPicker
        user={user}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPreset={(key) => void changeAvatar({ avatar_preset: key, ...(user.avatar ? { remove_avatar: true } : {}) }, "Avatar updated")}
        onPhoto={uploadPhoto}
        onRemovePhoto={() => void changeAvatar({ remove_avatar: true }, "Photo removed")}
        onError={(message) => toast.error(message)}
      />
      <LeaveSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} onLeave={logout} />
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  );
}

export function ProfilePage() {
  const user = useAuth((state) => state.user);
  if (!user) return null;
  // Re-mount the form when the account changes, so it never shows stale fields.
  return <ProfileForm key={user.id} user={user} />;
}
