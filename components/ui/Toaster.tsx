"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

import { useToasts, type ToastKind } from "@/lib/store/toast";

const ICONS: Record<ToastKind, React.ReactNode> = {
  info: <Info className="size-[18px] text-white/80" />,
  success: <CircleCheck className="size-[18px] text-online" />,
  error: <CircleAlert className="size-[18px] text-danger" />,
};

/** Notifications that drop from the top like iOS' Dynamic Island. */
export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-safe z-[100] flex flex-col items-center gap-2 px-4 pt-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            layout
            type="button"
            onClick={() => dismiss(toast.id)}
            initial={{ opacity: 0, y: -24, scale: 0.6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, scale: 0.8, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex max-w-[min(92vw,420px)] items-center gap-2.5 rounded-full bg-toast py-2.5 pl-3.5 pr-5 text-left text-[15px] font-medium text-white shadow-float backdrop-blur-xl"
          >
            {ICONS[toast.kind]}
            <span className="line-clamp-2">{toast.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
