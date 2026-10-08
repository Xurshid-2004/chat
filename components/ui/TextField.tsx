"use client";

import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/cn";

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
}

/**
 * iOS-style input: 17 px text (no zoom on focus in iOS Safari), soft surface,
 * an accent ring on focus and an animated error line.
 */
export function TextField({ label, icon: Icon, error, hint, type = "text", className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const message = error ?? hint;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="ml-1 text-[13px] font-medium text-fg-2">
        {label}
      </label>
      <div
        className={cn(
          "group flex h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 ring-1 ring-transparent transition-[box-shadow,background-color]",
          "focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/40",
          error && "ring-2 ring-danger/50 focus-within:ring-danger/60",
        )}
      >
        {Icon && <Icon className="size-5 shrink-0 text-fg-3 transition-colors group-focus-within:text-accent" aria-hidden />}
        <input
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-3"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-fg-3 hover:text-fg-2"
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            key={message}
            id={messageId}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={cn("ml-1 overflow-hidden text-[13px]", error ? "text-danger" : "text-fg-3")}
            role={error ? "alert" : undefined}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
