"use client";

import { motion } from "motion/react";
import { Trash2 } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { formatDuration } from "@/lib/format";

/** Replaces the text field while recording: cancel, a pulsing timer and live levels. */
export function VoiceRecorderBar({ elapsed, levels, onCancel }: { elapsed: number; levels: number[]; onCancel: () => void }) {
  const bars = Array.from({ length: 32 }, (_, index) => levels[levels.length - 32 + index] ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex min-h-12 w-full items-center gap-2 pr-3"
    >
      <IconButton label="Cancel recording" size={40} onClick={onCancel} className="text-danger">
        <Trash2 className="size-[22px]" />
      </IconButton>
      <span className="flex items-center gap-2 text-[16px] font-medium tabular-nums">
        <motion.span
          className="size-2.5 rounded-full bg-danger"
          animate={{ opacity: [1, 0.25, 1], scale: [1, 0.85, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
        {formatDuration(elapsed)}
      </span>
      <div className="flex h-8 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden" aria-hidden>
        {bars.map((level, index) => (
          <motion.span
            key={index}
            className="w-[3px] shrink-0 rounded-full bg-accent"
            animate={{ height: `${Math.max(10, level * 100)}%` }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
