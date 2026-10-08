"use client";

import { motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { applyTheme, readTheme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Segmented control: System / Light / Dark. */
export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>(() => readTheme());

  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-3/60 p-1" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = value === choice;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              setChoice(value);
              applyTheme(value);
            }}
            className={cn(
              "relative flex h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-medium transition-colors",
              selected ? "text-fg" : "text-fg-2",
            )}
          >
            {selected && (
              <motion.span
                layoutId="theme-choice"
                className="absolute inset-0 rounded-xl bg-surface shadow-float"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <Icon className="relative size-[18px]" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
