"use client";

import { motion } from "motion/react";
import { Download, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo, Play } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { formatDuration, formatFileSize } from "@/lib/format";
import type { ChatMessage } from "@/lib/store/chat";

import { ProgressRing, UploadOverlay } from "./UploadOverlay";
import { VoiceMessage } from "./VoiceMessage";

const MAX_WIDTH = 300;
const MAX_HEIGHT = 380;
const MIN_WIDTH = 150;

export const mediaLayoutId = (message: ChatMessage) => `media-${message.client_id ?? message.id}`;

/** Display box for a photo/video: keeps the aspect ratio inside the bubble limits. */
function boxSize(width: number | null, height: number | null) {
  const ratio = width && height ? width / height : 4 / 3;
  let boxWidth = MAX_WIDTH;
  let boxHeight = boxWidth / ratio;
  if (boxHeight > MAX_HEIGHT) {
    boxHeight = MAX_HEIGHT;
    boxWidth = Math.max(MIN_WIDTH, boxHeight * ratio);
  }
  return { width: `min(${Math.round(boxWidth)}px, 66vw)`, aspectRatio: `${boxWidth} / ${boxHeight}` };
}

function Thumbnail({ src, preview, alt }: { src: string | null; preview: string | null; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny inline blur placeholder
        <img src={preview} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-xl" />
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- chat media is resized by the backend
        <img
          src={src}
          alt={alt}
          draggable={false}
          decoding="async"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn("relative size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </>
  );
}

// The "open" button and the upload ring (its own cancel/retry button) are
// siblings: a <button> must never contain another <button>.

function ImageAttachment({ message, onOpen }: { message: ChatMessage; onOpen: () => void }) {
  const attachment = message.attachment!;
  return (
    <motion.div
      layoutId={mediaLayoutId(message)}
      className="relative overflow-hidden rounded-[16px] bg-surface-3"
      style={boxSize(attachment.width, attachment.height)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="absolute inset-0 block"
        aria-label="Open photo"
      >
        <Thumbnail src={message.localUrl ?? attachment.url} preview={attachment.preview} alt={attachment.name || "Photo"} />
      </button>
      <UploadOverlay message={message} />
    </motion.div>
  );
}

function VideoAttachment({ message, onOpen }: { message: ChatMessage; onOpen: () => void }) {
  const attachment = message.attachment!;
  const pendingLocal = message.id < 0 && message.localUrl;
  return (
    <div className="relative overflow-hidden rounded-[16px] bg-black" style={boxSize(attachment.width, attachment.height)}>
      {pendingLocal ? (
        <video src={message.localUrl} muted playsInline preload="metadata" className="size-full object-cover" />
      ) : (
        <Thumbnail src={attachment.thumbnail_url} preview={attachment.preview} alt="Video" />
      )}
      {attachment.duration ? (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-medium tabular-nums text-white">
          {formatDuration(attachment.duration)}
        </span>
      ) : null}
      {message.delivery ? (
        <UploadOverlay message={message} />
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="absolute inset-0 grid place-items-center"
          aria-label="Play video"
        >
          <span className="grid size-14 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md">
            <Play className="ml-1 size-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}

const FILE_ICONS: Array<[RegExp, typeof FileText]> = [
  [/\.(zip|rar|7z|tar|gz)$/i, FileArchive],
  [/\.(mp3|wav|m4a|aac|ogg|flac)$/i, FileAudio],
  [/\.(mp4|mov|mkv|avi|webm)$/i, FileVideo],
  [/\.(png|jpe?g|gif|webp|heic|svg|bmp)$/i, FileImage],
  [/\.(xlsx?|csv|ods|numbers)$/i, FileSpreadsheet],
  [/\.(js|ts|tsx|py|json|html|css|java|c|cpp|go|rs|sql)$/i, FileCode],
];

function FileAttachment({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const attachment = message.attachment!;
  const Icon = FILE_ICONS.find(([pattern]) => pattern.test(attachment.name))?.[1] ?? FileText;
  const href = message.id > 0 ? `${attachment.url}?download=1` : undefined;

  const body = (
    <>
      {message.delivery ? (
        <ProgressRing message={message} size={46} dark={mine} />
      ) : (
        <span className={cn("grid size-[46px] shrink-0 place-items-center rounded-full", mine ? "bg-white/20 text-white" : "bg-accent text-accent-fg")}>
          <Icon className="size-[22px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{attachment.name || "File"}</span>
        <span className={cn("flex items-center gap-1 text-[13px]", mine ? "text-white/75" : "text-fg-2")}>
          {message.delivery && message.progress !== undefined
            ? `${formatFileSize(Math.round((attachment.size ?? 0) * message.progress))} of ${formatFileSize(attachment.size)}`
            : formatFileSize(attachment.size)}
          {href && <Download className="size-3.5" />}
        </span>
      </span>
    </>
  );

  return href ? (
    <a href={href} download={attachment.name} onClick={(event) => event.stopPropagation()} className="flex w-[min(280px,66vw)] items-center gap-3 rounded-2xl px-2 pb-5 pt-1.5">
      {body}
    </a>
  ) : (
    <div className="flex w-[min(280px,66vw)] items-center gap-3 px-2 pb-5 pt-1.5">{body}</div>
  );
}

/** Media part of a message bubble (photo, video, voice or file). */
export function MessageMedia({ message, mine, onOpen }: { message: ChatMessage; mine: boolean; onOpen: (message: ChatMessage) => void }) {
  if (!message.attachment) return null;
  switch (message.type) {
    case "IMAGE":
      return <ImageAttachment message={message} onOpen={() => onOpen(message)} />;
    case "VIDEO":
      return <VideoAttachment message={message} onOpen={() => onOpen(message)} />;
    case "AUDIO":
      return <VoiceMessage message={message} mine={mine} />;
    default:
      return <FileAttachment message={message} mine={mine} />;
  }
}
