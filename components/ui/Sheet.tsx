"use client";

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
}

/** iOS-style bottom sheet: slides up, closes with a swipe down or a tap outside. */
export function Sheet({ open, onClose, children, label }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[28px] bg-surface px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 shadow-float"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={handleDragEnd}
          >
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-surface-3" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface SheetActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export function SheetAction({ icon, label, onClick, danger = false }: SheetActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 w-full items-center gap-4 rounded-2xl px-4 text-left text-[17px] transition-colors active:bg-surface-2 hover:bg-surface-2 ${
        danger ? "text-danger" : "text-fg"
      }`}
    >
      <span className="grid size-6 place-items-center">{icon}</span>
      {label}
    </button>
  );
}
