// Shapes returned by the Django API (see ROADMAP.md, sections 5 and 6).

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar: string | null;
  /** Ready-made avatar chosen on the start screen (see lib/avatars.ts); "" when none. */
  avatar_preset: string;
  bio: string;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

export interface Attachment {
  url: string;
  name: string;
  size: number | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  waveform: number[] | null;
  thumbnail_url: string | null;
  preview: string | null;
}

export interface ReplyPreview {
  id: number;
  sender: number;
  type: MessageType;
  text: string;
  attachment: Attachment | null;
}

export interface Message {
  id: number;
  chat: number;
  sender: number;
  type: MessageType;
  text: string;
  attachment: Attachment | null;
  reply_to: ReplyPreview | null;
  is_read: boolean;
  client_id: string | null;
  created_at: string;
}

export interface Chat {
  id: number;
  peer: User | null;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MessagePage {
  results: Message[];
  has_more: boolean;
}

export type TypingAction = "typing" | "recording" | "stop";

/** Events pushed by the server over the WebSocket. */
export type ServerEvent =
  | { type: "ready"; user_id: number }
  | { type: "pong" }
  | { type: "error"; detail: string }
  | { type: "message.created"; chat_id: number; message: Message }
  | { type: "message.deleted"; chat_id: number; message_id: number }
  | { type: "messages.read"; chat_id: number; reader_id: number; last_read_id: number }
  | { type: "typing"; chat_id: number; user_id: number; action: TypingAction }
  | { type: "presence"; user_id: number; is_online: boolean; last_seen: string | null }
  | { type: "user.updated"; user: User }
  /** The other person deleted their account: the chat is gone. */
  | { type: "chat.deleted"; chat_id: number }
  /** This account was deleted on another device. */
  | { type: "account.deleted" };
