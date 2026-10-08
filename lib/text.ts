import type { Message } from "./types";

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;

export type TextPart = { type: "text"; value: string } | { type: "link"; value: string };

/** Split text into plain parts and http(s) links. */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    parts.push({ type: "link", value: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

/** 1-3 emoji and nothing else: shown large, without a bubble. */
export function isEmojiOnly(text: string): boolean {
  if (!text || text.length > 24 || !EMOJI_ONLY.test(text) || /^\d+$/.test(text.trim())) return false;
  const trimmed = text.trim();
  const glyphs =
    typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed), (part) => part.segment)
      : Array.from(trimmed);
  return glyphs.length > 0 && glyphs.length <= 3 && glyphs.every((glyph) => /\p{Extended_Pictographic}/u.test(glyph));
}

/** Short description of a message for the chat list and reply quotes. */
export function messagePreview(message: Pick<Message, "type" | "text" | "attachment">): string {
  const caption = message.text.trim();
  switch (message.type) {
    case "IMAGE":
      return caption || "Photo";
    case "VIDEO":
      return caption || "Video";
    case "AUDIO":
      return "Voice message";
    case "FILE":
      return caption || message.attachment?.name || "File";
    default:
      return caption;
  }
}
