"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

const CONFIRM_WORD = "DELETE";

interface DeleteAccountSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Deleting can't be undone, so it spells out what goes and asks for a typed confirmation. */
export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const deleteAccount = useAuth((state) => state.deleteAccount);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const close = () => {
    if (deleting) return;
    setTyped("");
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    setDeleting(true);
    setError(undefined);
    try {
      await deleteAccount(); // goes to the start screen
    } catch (problem) {
      setDeleting(false);
      setError(problem instanceof ApiError ? problem.message : "Could not delete the account. Please try again.");
    }
  };

  return (
    <Sheet open={open} onClose={close} label="Delete account">
      <form
        className="flex flex-col items-center px-4 pb-2 pt-2 text-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmed && !deleting) void confirm();
        }}
      >
        <span className="mb-3 grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
          <Trash2 className="size-7" />
        </span>
        <h2 className="text-[19px] font-semibold">Delete your account?</h2>
        <p className="mt-2 text-[15px] text-fg-2">
          Your profile and all your chats — every message, photo, video, voice message and file — will be deleted for
          good, for you <span className="font-semibold text-fg">and for the people you chatted with</span>. This
          can&apos;t be undone.
        </p>
        <TextField
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={CONFIRM_WORD}
          error={error}
          className="mt-5 w-full text-left"
        />
        <div className="mt-5 flex w-full flex-col gap-2">
          <Button type="submit" variant="danger" size="lg" loading={deleting} disabled={!confirmed} className="w-full">
            <Trash2 className="size-5" /> Delete account
          </Button>
          <Button type="button" variant="secondary" size="lg" className="w-full" disabled={deleting} onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
