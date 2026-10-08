"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Spinner } from "@/components/ui/Spinner";
import { formatDuration } from "@/lib/format";
import { mediaKind, readImageInfo, readVideoInfo, type VisualInfo } from "@/lib/media";
import type { MediaDraft } from "@/lib/store/chat";

interface Item {
  file: File;
  url: string;
  kind: "IMAGE" | "VIDEO";
  info: VisualInfo | null;
  ready: boolean;
}

interface MediaComposerProps {
  files: File[];
  onClose: () => void;
  onSend: (drafts: MediaDraft[]) => void;
}

/** Preview of the chosen photos/videos with a caption, before sending. */
export function MediaComposer({ files, onClose, onSend }: MediaComposerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    let cancelled = false;
    const created = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      kind: mediaKind(file) === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const),
      info: null,
      ready: false,
    }));
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setItems(created);
      // Measure every file (and grab a poster frame from videos) in the background.
      for (const item of created) {
        const info = item.kind === "VIDEO" ? await readVideoInfo(item.url) : await readImageInfo(item.url);
        if (cancelled) return;
        setItems((current) => current.map((entry) => (entry.url === item.url ? { ...entry, info, ready: true } : entry)));
      }
    })();
    return () => {
      cancelled = true;
      created.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  const remove = (url: string) => {
    const next = items.filter((item) => item.url !== url);
    setItems(next);
    if (next.length === 0) onClose();
  };

  const allReady = items.length > 0 && items.every((item) => item.ready);

  const send = () => {
    if (!allReady) return;
    onSend(
      items.map((item, index) => ({
        file: item.file,
        type: item.kind,
        caption: index === 0 ? caption.trim() : undefined,
        width: item.info?.width,
        height: item.info?.height,
        duration: item.info?.duration,
        thumbnail: item.info?.thumbnail,
      })),
    );
    onClose();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      role="dialog"
      aria-modal="true"
      aria-label="Send media"
    >
      <div className="flex items-center gap-3 px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        <button type="button" onClick={onClose} aria-label="Cancel" className="grid size-11 place-items-center rounded-full bg-white/10">
          <X className="size-6" />
        </button>
        <p className="flex-1 text-center text-[17px] font-semibold">
          {items.length === 1 ? (items[0].kind === "VIDEO" ? "Send video" : "Send photo") : `Send ${items.length} items`}
        </p>
        <span className="size-11" />
      </div>

      <div className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory items-center gap-3 overflow-x-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.url}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative flex h-full max-h-[70dvh] w-full max-w-[min(100%,560px)] shrink-0 snap-center items-center justify-center"
            >
              {item.kind === "VIDEO" ? (
                <video src={item.url} muted playsInline preload="metadata" className="max-h-full max-w-full rounded-2xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of the file being sent
                <img src={item.url} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
              )}
              {item.kind === "VIDEO" && (
                <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[12px]">
                  <Play className="size-3 fill-current" />
                  {item.info?.duration ? formatDuration(item.info.duration) : "Video"}
                </span>
              )}
              {!item.ready && (
                <span className="absolute inset-0 grid place-items-center">
                  <Spinner className="size-7" />
                </span>
              )}
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(item.url)}
                  aria-label="Remove"
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/60"
                >
                  <X className="size-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-end gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <textarea
          rows={1}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={4096}
          placeholder="Add a caption…"
          aria-label="Caption"
          className="no-scrollbar max-h-32 min-h-12 flex-1 resize-none rounded-[24px] bg-white/12 px-4 py-3 text-[17px] text-white outline-none placeholder:text-white/50"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={send}
          disabled={!allReady}
          aria-label="Send"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-50"
        >
          {allReady ? <ArrowUp className="size-6" strokeWidth={2.5} /> : <Spinner />}
        </motion.button>
      </div>
    </motion.div>,
    document.body,
  );
}
