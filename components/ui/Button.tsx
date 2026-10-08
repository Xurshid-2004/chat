"use client";

import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/cn";

import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-[0_6px_20px_-6px_var(--accent)]",
  secondary: "bg-surface-2 text-fg",
  ghost: "bg-transparent text-accent",
  danger: "bg-danger-soft text-danger",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-[15px] rounded-xl",
  lg: "h-14 px-6 text-[17px] rounded-2xl",
};

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex select-none items-center justify-center gap-2 font-semibold transition-[opacity,background-color] disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2 transition-opacity", loading && "opacity-0")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </motion.button>
  );
}
