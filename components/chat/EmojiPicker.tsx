"use client";

import { motion } from "motion/react";
import { Apple, Car, Clock3, Dog, Hand, Heart, Lamp, Smile, Trophy, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { EMOJI_CATEGORIES, readRecentEmoji, rememberEmoji } from "@/lib/emoji";

const ICONS: Record<string, LucideIcon> = {
  recent: Clock3,
  smileys: Smile,
  people: Hand,
  nature: Dog,
  food: Apple,
  activity: Trophy,
  travel: Car,
  objects: Lamp,
  symbols: Heart,
};

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

/** Floating emoji panel above the message field. */
export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const [recent, setRecent] = useState<string[]>(() => readRecentEmoji());
  const [category, setCategory] = useState(() => (readRecentEmoji().length ? "recent" : "smileys"));
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!panelRef.current?.contains(target) && !target.closest("[data-emoji-toggle]")) onClose();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const categories = [{ id: "recent", label: "Recently used", emojis: recent }, ...EMOJI_CATEGORIES];
  const active = categories.find((item) => item.id === category) ?? categories[1];

  const choose = (emoji: string) => {
    setRecent(rememberEmoji(emoji));
    onPick(emoji);
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
      style={{ originX: 0.1, originY: 1 }}
      className="absolute bottom-full left-0 z-30 mb-2 flex h-[300px] w-[min(100%,380px)] flex-col overflow-hidden rounded-[24px] bg-surface shadow-float ring-1 ring-line"
      role="dialog"
      aria-label="Emoji"
    >
      <p className="px-4 pb-1 pt-3 text-[13px] font-semibold text-fg-2">{active.label}</p>
      <div ref={gridRef} className="grid flex-1 auto-rows-[44px] grid-cols-8 overflow-y-auto overscroll-contain px-2 pb-2">
        {active.emojis.length === 0 ? (
          <p className="col-span-8 px-2 pt-6 text-center text-[14px] text-fg-3">Emoji you use will show up here.</p>
        ) : (
          active.emojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              onClick={() => choose(emoji)}
              className="grid place-items-center rounded-xl text-[26px] leading-none transition-transform active:scale-90 hover:bg-surface-2"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line px-2 py-1">
        {categories.map((item) => {
          const Icon = ICONS[item.id];
          const selected = item.id === active.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCategory(item.id);
                gridRef.current?.scrollTo({ top: 0 });
              }}
              aria-label={item.label}
              aria-pressed={selected}
              className={cn("relative grid size-9 place-items-center rounded-full", selected ? "text-accent" : "text-fg-3")}
            >
              {selected && <motion.span layoutId="emoji-tab" className="absolute inset-0 rounded-full bg-accent-soft" />}
              <Icon className="relative size-[18px]" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
