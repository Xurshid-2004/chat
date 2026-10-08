"use client";

import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/cn";

interface IconButtonProps extends HTMLMotionProps<"button"> {
  label: string;
  /** Frosted round button, for controls floating above content. */
  glass?: boolean;
  size?: number;
}

export function IconButton({ label, glass = false, size = 44, className, children, ...props }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-fg transition-colors disabled:opacity-40",
        glass ? "bg-glass shadow-float backdrop-blur-xl backdrop-saturate-150" : "hover:bg-surface-2 active:bg-surface-2",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
