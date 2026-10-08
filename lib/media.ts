/** Browser-side helpers for media before upload. */
import type { MessageType } from "./types";

const MB = 1024 * 1024;

/** Mirrors the backend limits (CHAT_MAX_*_MB) for a friendly early error. */
export const UPLOAD_LIMITS: Record<Exclude<MessageType, "TEXT">, number> = {
  IMAGE: 20 * MB,
  VIDEO: 100 * MB,
  AUDIO: 20 * MB,
  FILE: 100 * MB,
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

/** Photos and videos are shown inline; everything else is sent as a document. */
export function mediaKind(file: File): "IMAGE" | "VIDEO" | "FILE" {
  if (IMAGE_TYPES.has(file.type)) return "IMAGE";
  if (VIDEO_TYPES.has(file.type)) return "VIDEO";
  return "FILE";
}

export function sizeError(file: File, kind: Exclude<MessageType, "TEXT">): string | null {
  const limit = UPLOAD_LIMITS[kind];
  return file.size > limit ? `“${file.name}” is larger than ${Math.round(limit / MB)} MB.` : null;
}

export interface VisualInfo {
  width: number;
  height: number;
  duration?: number;
  thumbnail?: Blob;
}

export function readImageInfo(url: string): Promise<VisualInfo | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** Size, duration and a poster frame of a local video. Resolves null if the browser can't decode it. */
export function readVideoInfo(url: string): Promise<VisualInfo | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let settled = false;
    const finish = (value: VisualInfo | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const timer = setTimeout(() => {
      finish(video.videoWidth ? { width: video.videoWidth, height: video.videoHeight, duration: video.duration || undefined } : null);
    }, 6000);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 3);
    };
    video.onseeked = () => {
      const info: VisualInfo = { width: video.videoWidth, height: video.videoHeight, duration: video.duration || undefined };
      const scale = Math.min(1, 720 / Math.max(info.width, info.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(info.width * scale));
      canvas.height = Math.max(1, Math.round(info.height * scale));
      try {
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish({ ...info, thumbnail: blob ?? undefined }), "image/jpeg", 0.82);
      } catch {
        finish(info);
      }
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

/** The best recording format this browser supports (playable on other devices too). */
export function recorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function extensionFor(mimeType: string): string {
  if (mimeType.startsWith("audio/mp4")) return "m4a";
  if (mimeType.startsWith("audio/ogg")) return "ogg";
  return "webm";
}

/** Reduce raw loudness samples to `points` bars between 0 and 1. */
export function compressWaveform(samples: number[], points = 48): number[] {
  if (samples.length === 0) return [];
  const bucket = samples.length / points;
  const bars: number[] = [];
  for (let index = 0; index < points; index += 1) {
    const slice = samples.slice(Math.floor(index * bucket), Math.max(Math.floor((index + 1) * bucket), Math.floor(index * bucket) + 1));
    bars.push(slice.length ? Math.max(...slice) : 0);
  }
  const peak = Math.max(...bars, 0.01);
  return bars.map((bar) => Math.round(Math.min(1, bar / peak) * 1000) / 1000);
}
