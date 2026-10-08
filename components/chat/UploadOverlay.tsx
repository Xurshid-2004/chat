"use client";

import { motion } from "motion/react";
import { RotateCw, X } from "lucide-react";

import { useChats, type ChatMessage } from "@/lib/store/chat";

/** Circular upload progress with cancel; a retry button when the upload failed. */
export function ProgressRing({ message, size = 48, dark = true }: { message: ChatMessage; size?: number; dark?: boolean }) {
  const cancelUpload = useChats((state) => state.cancelUpload);
  const retry = useChats((state) => state.retry);
  const failed = message.delivery === "failed";
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0.02, message.progress ?? 0);

  return (
    <button
      type="button"
      aria-label={failed ? "Send again" : "Cancel upload"}
      onClick={(event) => {
        event.stopPropagation();
        if (failed) retry(message);
        else cancelUpload(message);
      }}
      className={`relative grid shrink-0 place-items-center rounded-full ${dark ? "bg-black/50 text-white" : "bg-accent text-accent-fg"}`}
      style={{ width: size, height: size }}
    >
      {!failed && (
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </svg>
      )}
      {failed ? <RotateCw className="size-5" /> : <X className="size-5" />}
    </button>
  );
}

export function UploadOverlay({ message }: { message: ChatMessage }) {
  if (!message.delivery) return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/25">
      <ProgressRing message={message} />
    </div>
  );
}
