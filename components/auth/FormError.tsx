"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={message}
          role="alert"
          initial={{ opacity: 0, height: 0, scale: 0.96 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-[15px] text-danger">
            <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
