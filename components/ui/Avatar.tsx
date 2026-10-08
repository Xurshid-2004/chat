"use client";

import { AnimatePresence, motion } from "motion/react";

import { avatarPreset } from "@/lib/avatars";
import type { User } from "@/lib/types";

const GRADIENTS: Array<[string, string]> = [
  ["#5ac8fa", "#0a6cff"],
  ["#ff9f0a", "#ff5e3a"],
  ["#34c759", "#30b0c7"],
  ["#bf5af2", "#5e5ce6"],
  ["#ff375f", "#ff6482"],
  ["#ffcc00", "#ff9500"],
  ["#64d2ff", "#7b61ff"],
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

interface AvatarProps {
  user: Pick<User, "id" | "display_name" | "avatar"> & Partial<Pick<User, "is_online" | "avatar_preset">>;
  size?: number;
  showOnline?: boolean;
}

/** A photo, else the chosen ready-made avatar, else initials on a colour from the user id. */
export function Avatar({ user, size = 48, showOnline = false }: AvatarProps) {
  const preset = avatarPreset(user.avatar_preset);
  const [from, to] = preset ? [preset.from, preset.to] : GRADIENTS[Math.abs(user.id) % GRADIENTS.length];
  const dot = Math.max(10, Math.round(size * 0.26));

  return (
    <span className="relative inline-block shrink-0 select-none" style={{ width: size, height: size }}>
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars are already 512 px WebP from the backend
        <img
          src={user.avatar}
          alt=""
          draggable={false}
          decoding="async"
          className="size-full rounded-full bg-surface-2 object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-full place-items-center rounded-full font-semibold leading-none text-white"
          style={{ background: `linear-gradient(145deg, ${from}, ${to})`, fontSize: size * (preset ? 0.56 : 0.38) }}
        >
          {preset ? preset.emoji : initials(user.display_name)}
        </span>
      )}
      <AnimatePresence>
        {showOnline && user.is_online && (
          <motion.span
            key="online"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute bottom-0 right-0 rounded-full bg-online ring-[2.5px] ring-app"
            style={{ width: dot, height: dot }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}
