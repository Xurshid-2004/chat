// Date, time and size formatting for the chat UI (runs in the browser only).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// The interface is English, so month and weekday names are too (24-hour clock).
export const LOCALE = "en-GB";

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });
const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short" });
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const fullDateFormat = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const dayLabelFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / (24 * HOUR));
}

/** "14:05" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Chat list: time today, "Yesterday", weekday this week, otherwise a date. */
export function formatListTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysAgo(date, now);
  if (days <= 0) return timeFormat.format(date);
  if (days === 1) return "Yesterday";
  if (days < 7) return weekdayFormat.format(date);
  return date.getFullYear() === now.getFullYear() ? shortDateFormat.format(date) : fullDateFormat.format(date);
}

/** Divider between days in a conversation. */
export function formatDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysAgo(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (date.getFullYear() === now.getFullYear()) return dayLabelFormat.format(date);
  return fullDateFormat.format(date);
}

export function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** "last seen 5 minutes ago", "last seen yesterday at 21:40"... */
export function formatLastSeen(iso: string | null, now = new Date()): string {
  if (!iso) return "last seen recently";
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "last seen just now";
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `last seen ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const days = daysAgo(date, now);
  if (days <= 0) return `last seen today at ${timeFormat.format(date)}`;
  if (days === 1) return `last seen yesterday at ${timeFormat.format(date)}`;
  if (days < 7) return `last seen ${weekdayFormat.format(date)} at ${timeFormat.format(date)}`;
  return `last seen ${fullDateFormat.format(date)}`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** "0:07", "1:05:09" */
export function formatDuration(seconds: number | null): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}
