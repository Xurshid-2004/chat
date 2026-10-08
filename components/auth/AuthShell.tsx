"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

import { Logo } from "@/components/ui/Logo";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
};

function Backdrop() {
  const reduceMotion = useReducedMotion();
  const drift = (x: number, y: number, duration: number) =>
    reduceMotion
      ? {}
      : {
          animate: { x: [0, x, 0], y: [0, y, 0], scale: [1, 1.08, 1] },
          transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
        };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-28 -top-36 size-[26rem] rounded-full bg-accent/20 blur-[90px]"
        {...drift(40, 30, 18)}
      />
      <motion.div
        className="absolute -bottom-44 -right-28 size-[28rem] rounded-full bg-accent-2/20 blur-[100px]"
        {...drift(-30, -40, 22)}
      />
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  showLogo?: boolean;
}

export function AuthShell({ title, subtitle, children, footer, showLogo = true }: AuthShellProps) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-app pb-safe pt-safe">
      <Backdrop />
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="relative z-10 mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-10"
      >
        {showLogo && (
          <motion.div variants={fadeUp} className="mb-7">
            <Logo className="size-16 drop-shadow-[0_10px_24px_rgb(10_108_255_/_0.35)]" />
          </motion.div>
        )}
        <motion.h1 variants={fadeUp} className="text-[30px] font-bold leading-tight tracking-tight text-fg">
          {title}
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-2 text-[16px] leading-relaxed text-fg-2">
          {subtitle}
        </motion.p>
        <motion.div variants={fadeUp} className="mt-7">
          {children}
        </motion.div>
        <motion.div variants={fadeUp} className="mt-6 text-center text-[14px] text-fg-3">
          {footer}
        </motion.div>
      </motion.div>
    </main>
  );
}
