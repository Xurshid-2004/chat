"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/store/chat";

import { mediaLayoutId } from "./MessageMedia";

interface MediaViewerProps {
  message: ChatMessage | null;
  senderName: string;
  onClose: () => void;
}

/** Full-screen photo/video. Photos zoom out of the bubble; swipe down (or Esc) closes. */
export function MediaViewer({ message, senderName, onClose }: MediaViewerProps) {
  const y = useMotionValue(0);
  const backdrop = useTransform(y, [-300, 0, 300], [0.2, 1, 0.2]);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!message) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [message, onClose]);

  const close = () => {
    setZoomed(false);
    onClose();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.y) > 110 || Math.abs(info.velocity.y) > 700) close();
  };

  if (typeof document === "undefined") return null;
  const attachment = message?.attachment;
  const src = message ? (message.localUrl ?? attachment?.url) : undefined;
  const downloadHref = message && message.id > 0 && attachment ? `${attachment.url}?download=1` : undefined;

  return createPortal(
    <AnimatePresence>
      {message && attachment && src && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Media viewer">
          <motion.div
            className="absolute inset-0 bg-black"
            style={{ opacity: backdrop }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-linear-to-b from-black/70 to-transparent px-3 pb-8 pt-[max(env(safe-area-inset-top),12px)] text-white"
          >
            <button type="button" onClick={close} aria-label="Close" className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur-md">
              <X className="size-6" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{senderName}</p>
              <p className="text-[13px] text-white/70">{formatTime(message.created_at)}</p>
            </div>
            {downloadHref && (
              <a
                href={downloadHref}
                download={attachment.name}
                aria-label="Download"
                className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur-md"
              >
                <Download className="size-5" />
              </a>
            )}
          </motion.div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            {message.type === "IMAGE" ? (
              <motion.img
                layoutId={mediaLayoutId(message)}
                src={src}
                alt={attachment.name || "Photo"}
                draggable={false}
                drag={zoomed ? false : "y"}
                dragSnapToOrigin
                style={{ y }}
                onDragEnd={handleDragEnd}
                onDoubleClick={() => setZoomed((value) => !value)}
                animate={{ scale: zoomed ? 2 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                className="pointer-events-auto max-h-full max-w-full touch-none select-none rounded-lg object-contain"
              />
            ) : (
              <motion.video
                src={src}
                poster={attachment.thumbnail_url ?? undefined}
                controls
                autoPlay
                playsInline
                drag="y"
                dragSnapToOrigin
                style={{ y }}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="pointer-events-auto max-h-full max-w-full rounded-lg bg-black"
              />
            )}
          </div>

          {message.text && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-10 text-center text-[16px] text-white"
            >
              {message.text}
            </motion.p>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
