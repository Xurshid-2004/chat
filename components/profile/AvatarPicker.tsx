"use client";

import { motion } from "motion/react";
import { Camera, Trash2 } from "lucide-react";
import { useRef } from "react";

import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { AVATAR_PRESETS } from "@/lib/avatars";
import type { User } from "@/lib/types";

const PHOTO_LIMIT = 10 * 1024 * 1024;

interface AvatarPickerProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onPreset: (key: string) => void;
  onPhoto: (file: File) => void;
  onRemovePhoto: () => void;
  onError: (message: string) => void;
}

export function AvatarPicker({ user, open, onClose, onPreset, onPhoto, onRemovePhoto, onError }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet open={open} onClose={onClose} label="Change avatar">
      <p className="px-4 pb-3 pt-1 text-center text-[17px] font-semibold">Choose an avatar</p>
      <div className="grid grid-cols-6 gap-2.5 px-4 pb-4" role="radiogroup" aria-label="Avatar">
        {AVATAR_PRESETS.map((option) => {
          const selected = !user.avatar && user.avatar_preset === option.key;
          return (
            <motion.button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                onPreset(option.key);
                onClose();
              }}
              className="relative grid aspect-square place-items-center rounded-full"
            >
              {selected && <span className="absolute -inset-[3px] rounded-full ring-[3px] ring-accent" />}
              <span
                className="grid size-full place-items-center rounded-full text-[24px] leading-none"
                style={{ background: `linear-gradient(145deg, ${option.from}, ${option.to})` }}
              >
                {option.emoji}
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="border-t border-line pt-1">
        <SheetAction icon={<Camera className="size-5 text-accent" />} label="Upload a photo" onClick={() => inputRef.current?.click()} />
        {user.avatar && (
          <SheetAction
            danger
            icon={<Trash2 className="size-5" />}
            label="Remove photo"
            onClick={() => {
              onRemovePhoto();
              onClose();
            }}
          />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > PHOTO_LIMIT) {
            onError("Photo must be smaller than 10 MB.");
            return;
          }
          onPhoto(file);
          onClose();
        }}
      />
    </Sheet>
  );
}
