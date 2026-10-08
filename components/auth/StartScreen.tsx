"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { ArrowRight, Check, KeyRound, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, authApi } from "@/lib/api";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { safeNextPath } from "@/lib/store/auth";

import { FormError } from "./FormError";

const NAME_LIMIT = 40;

/** Choose an avatar, type a name, start: that's the whole sign-up. */
export function StartScreen() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  // A shared link can carry the code: https://…/?invite=CODE
  const [invite, setInvite] = useState(searchParams.get("invite") ?? "");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [inviteError, setInviteError] = useState<string>();
  const [preset, setPreset] = useState(AVATAR_PRESETS[0].key);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();

  const cleanName = name.trim().replace(/\s+/g, " ");

  useEffect(() => {
    authApi
      .startOptions()
      .then((options) => setInviteRequired(options.invite_required))
      .catch(() => undefined); // the server still checks the code
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cleanName) {
      setNameError("Enter your name.");
      animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.42 });
      return;
    }
    if (inviteRequired && !invite.trim()) {
      setInviteError("Enter the invite code.");
      animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.42 });
      return;
    }
    setPending(true);
    setNameError(undefined);
    setInviteError(undefined);
    setFormError(undefined);
    try {
      await authApi.start({
        name: cleanName,
        avatar_preset: preset,
        ...(invite.trim() ? { invite_code: invite.trim() } : {}),
      });
      setDone(true);
      // A full load starts the app with a clean state for this account.
      window.location.assign(next);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError) {
        const inviteProblem = error.field("invite_code");
        setNameError(error.field("name"));
        setInviteError(inviteProblem);
        if (inviteProblem) setInviteRequired(true);
        setFormError(error.field("name") || inviteProblem ? undefined : error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <form ref={scope} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormError message={formError} />

      {/* How the other person will see you in their chat list. */}
      <div className="flex items-center gap-3 rounded-[22px] bg-surface-2 p-3" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={preset}
            initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.4, rotate: 25, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <Avatar user={{ id: 0, display_name: cleanName || "You", avatar: null, avatar_preset: preset }} size={56} />
          </motion.span>
        </AnimatePresence>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[17px] font-semibold", !cleanName && "text-fg-3")}>
            {cleanName || "Your name"}
          </span>
          <span className="block text-[14px] text-accent">online</span>
        </span>
        <span className="text-[12px] font-medium text-fg-3">Preview</span>
      </div>

      <fieldset>
        <legend className="mb-2 ml-1 text-[13px] font-medium text-fg-2">Choose your avatar</legend>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Avatar">
          {AVATAR_PRESETS.map((option) => {
            const selected = option.key === preset;
            return (
              <motion.button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                onClick={() => setPreset(option.key)}
                whileTap={{ scale: 0.85 }}
                animate={{ scale: selected ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className="relative grid aspect-square place-items-center rounded-full"
              >
                {selected && (
                  <motion.span
                    layoutId="avatar-choice"
                    className="absolute -inset-[3px] rounded-full ring-[3px] ring-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <span
                  className="grid size-full place-items-center rounded-full text-[26px] leading-none"
                  style={{ background: `linear-gradient(145deg, ${option.from}, ${option.to})` }}
                >
                  {option.emoji}
                </span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      <TextField
        label="Your name"
        icon={UserRound}
        name="name"
        autoComplete="given-name"
        enterKeyHint="go"
        placeholder="How your friend will see you"
        maxLength={NAME_LIMIT}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (nameError) setNameError(undefined);
        }}
        error={nameError}
      />

      {inviteRequired && (
        <TextField
          label="Invite code"
          icon={KeyRound}
          name="invite"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="The code your friend gave you"
          value={invite}
          onChange={(event) => {
            setInvite(event.target.value);
            if (inviteError) setInviteError(undefined);
          }}
          error={inviteError}
        />
      )}

      <Button type="submit" size="lg" loading={pending} disabled={!cleanName && !nameError} className="w-full">
        {done ? (
          <Check className="size-6" />
        ) : (
          <>
            Start chatting <ArrowRight className="size-5" />
          </>
        )}
      </Button>
    </form>
  );
}
