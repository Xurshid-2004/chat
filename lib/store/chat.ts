"use client";

import { create } from "zustand";

import { ApiError, chatsApi, cursorFrom, messagesApi } from "../api";
import { nextTemporaryId, uuid } from "../ids";
import type { Attachment, Chat, Message, MessageType, ReplyPreview, ServerEvent, TypingAction, User } from "../types";
import { uploadMessage } from "../upload";
import { useAuth } from "./auth";
import { toast } from "./toast";

/** A photo, video, voice message or file about to be sent. */
export interface MediaDraft {
  file: File;
  type: Exclude<MessageType, "TEXT">;
  caption?: string;
  width?: number;
  height?: number;
  duration?: number;
  waveform?: number[];
  thumbnail?: Blob;
}

export interface ChatMessage extends Message {
  /** Present until the server confirms the message. */
  delivery?: "sending" | "failed";
  /** Arrived (or was sent) while the chat was open, so it animates in. */
  fresh?: boolean;
  /** Local preview (object URL) and upload progress (0-1) for media being sent. */
  localUrl?: string;
  progress?: number;
}

export interface Conversation {
  messages: ChatMessage[]; // oldest first; unconfirmed messages last
  loaded: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
}

interface Typing {
  userId: number;
  action: Exclude<TypingAction, "stop">;
  expiresAt: number;
}

interface ChatStore {
  chats: Record<number, Chat>;
  /** Chat ids, most recent activity first. */
  order: number[];
  listLoaded: boolean;
  listFailed: boolean;
  nextCursor: string | null;
  conversations: Record<number, Conversation>;
  typing: Record<number, Typing>;
  activeChatId: number | null;

  loadChats: () => Promise<void>;
  loadMoreChats: () => Promise<void>;
  upsertChat: (chat: Chat) => void;
  fetchChat: (chatId: number) => Promise<Chat | null>;
  openChatWith: (user: User) => Promise<number>;
  setActiveChat: (chatId: number | null) => void;
  loadMessages: (chatId: number) => Promise<void>;
  loadOlder: (chatId: number) => Promise<void>;
  catchUp: (chatId: number) => Promise<void>;
  addPending: (chatId: number, message: Partial<ChatMessage> & Pick<ChatMessage, "type" | "text">) => ChatMessage;
  confirmMessage: (message: Message) => void;
  failMessage: (chatId: number, clientId: string) => void;
  patchMessage: (chatId: number, clientId: string, patch: Partial<ChatMessage>) => void;
  sendText: (chatId: number, text: string, replyTo?: Message | null) => void;
  retryText: (chatId: number, clientId: string) => void;
  sendMedia: (chatId: number, draft: MediaDraft, replyTo?: Message | null) => void;
  retry: (message: ChatMessage) => void;
  cancelUpload: (message: ChatMessage) => void;
  deleteMessage: (message: ChatMessage) => Promise<void>;
  markRead: (chatId: number) => Promise<void>;
  handleEvent: (event: ServerEvent) => void;
  reset: () => void;
}

const EMPTY_CONVERSATION: Conversation = { messages: [], loaded: false, hasMore: true, loadingOlder: false };
const TYPING_TTL_MS = 6000;
const PAGE_SIZE = 40;

const myId = () => useAuth.getState().user?.id ?? 0;

/** Chats removed because the other person deleted their account (the open screen just closes). */
export const deletedChatIds = new Set<number>();

function sortOrder(chats: Record<number, Chat>): number[] {
  return Object.values(chats)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id)
    .map((chat) => chat.id);
}

/** Confirmed messages by id, then the ones still being sent. */
function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  const confirmed = messages.filter((message) => message.id > 0).sort((a, b) => a.id - b.id);
  return [...confirmed, ...messages.filter((message) => message.id < 0)];
}

/** Add `incoming`, replacing the unconfirmed copy (same client_id) or an older copy (same id). */
function mergeMessage(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  const index = messages.findIndex(
    (message) => message.id === incoming.id || (!!incoming.client_id && message.client_id === incoming.client_id),
  );
  if (index === -1) return sortMessages([...messages, incoming]);
  const next = messages.slice();
  const previous = messages[index];
  next[index] = {
    ...incoming,
    // A late response can carry an older snapshot: "read" never goes back to "unread".
    is_read: previous.is_read || incoming.is_read,
    fresh: previous.fresh || incoming.fresh,
    // Keep showing the local copy of a just-uploaded file (no flicker); freed when the chat closes.
    localUrl: incoming.localUrl ?? previous.localUrl,
  };
  return sortMessages(next);
}

export function toReplyPreview(message: Message): ReplyPreview {
  return {
    id: message.id,
    sender: message.sender,
    type: message.type,
    text: message.text.slice(0, 200),
    attachment: message.attachment,
  };
}

const viewingChat = (chatId: number, activeChatId: number | null) =>
  activeChatId === chatId && typeof document !== "undefined" && document.visibilityState === "visible";

const typingTimers = new Map<number, ReturnType<typeof setTimeout>>();
const readInFlight = new Set<number>();
// Media being uploaded, by client_id: the file (for retries) and a way to cancel.
const mediaDrafts = new Map<string, MediaDraft>();
const uploads = new Map<string, AbortController>();

function localAttachment(draft: MediaDraft, url: string): Attachment {
  return {
    url,
    name: draft.file.name,
    size: draft.file.size,
    mime_type: draft.file.type,
    width: draft.width ?? null,
    height: draft.height ?? null,
    duration: draft.duration ?? null,
    waveform: draft.waveform ?? null,
    thumbnail_url: null,
    preview: null,
  };
}

function buildUploadForm(draft: MediaDraft, message: ChatMessage): FormData {
  const form = new FormData();
  form.append("type", draft.type);
  form.append("client_id", message.client_id!);
  if (draft.caption) form.append("text", draft.caption);
  if (message.reply_to) form.append("reply_to", String(message.reply_to.id));
  if (draft.width) form.append("width", String(Math.round(draft.width)));
  if (draft.height) form.append("height", String(Math.round(draft.height)));
  if (draft.duration) form.append("duration", draft.duration.toFixed(2));
  if (draft.waveform?.length) form.append("waveform", JSON.stringify(draft.waveform));
  if (draft.thumbnail) form.append("thumbnail", draft.thumbnail, "poster.jpg");
  form.append("file", draft.file, draft.file.name);
  return form;
}

export const useChats = create<ChatStore>((set, get) => {
  const conversation = (chatId: number): Conversation => get().conversations[chatId] ?? EMPTY_CONVERSATION;

  const updateConversation = (chatId: number, update: (current: Conversation) => Partial<Conversation>) =>
    set((state) => {
      const current = state.conversations[chatId] ?? EMPTY_CONVERSATION;
      return { conversations: { ...state.conversations, [chatId]: { ...current, ...update(current) } } };
    });

  /** Keep the chat list in step with a message (new last message, unread count, order). */
  const touchChat = (message: ChatMessage, countUnread: boolean) =>
    set((state) => {
      const chat = state.chats[message.chat];
      if (!chat) return {};
      const current = chat.last_message;
      const isNewer = !current || message.id < 0 || current.id < 0 || message.id >= current.id;
      const replacesPending = !!message.client_id && current?.client_id === message.client_id;
      const sameMessage = !!current && (current.id === message.id || replacesPending);
      const latest = sameMessage && current ? { ...message, is_read: current.is_read || message.is_read } : message;
      const updated: Chat = {
        ...chat,
        last_message: isNewer || replacesPending ? latest : chat.last_message,
        updated_at: isNewer && message.created_at > chat.updated_at ? message.created_at : chat.updated_at,
        unread_count: chat.unread_count + (countUnread ? 1 : 0),
      };
      const chats = { ...state.chats, [chat.id]: updated };
      return { chats, order: sortOrder(chats) };
    });

  const clearTyping = (chatId: number) => {
    clearTimeout(typingTimers.get(chatId));
    typingTimers.delete(chatId);
    set((state) => {
      if (!state.typing[chatId]) return {};
      const typing = { ...state.typing };
      delete typing[chatId];
      return { typing };
    });
  };

  const startUpload = (chatId: number, message: ChatMessage) => {
    const clientId = message.client_id!;
    const draft = mediaDrafts.get(clientId);
    if (!draft) return;
    const controller = new AbortController();
    uploads.set(clientId, controller);
    let lastReport = 0;
    uploadMessage(chatId, buildUploadForm(draft, message), {
      signal: controller.signal,
      onProgress: (fraction) => {
        const now = Date.now();
        if (now - lastReport < 100 && fraction < 1) return; // ~10 updates per second is plenty
        lastReport = now;
        get().patchMessage(chatId, clientId, { progress: fraction });
      },
    })
      .then((confirmed) => {
        mediaDrafts.delete(clientId);
        get().confirmMessage(confirmed);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        get().failMessage(chatId, clientId);
        toast.error(error instanceof ApiError ? error.message : "Upload failed.");
      })
      .finally(() => uploads.delete(clientId));
  };

  const sendTextRequest = (chatId: number, message: ChatMessage) => {
    messagesApi
      .sendText(chatId, { text: message.text, client_id: message.client_id!, reply_to: message.reply_to?.id ?? null })
      .then((confirmed) => get().confirmMessage(confirmed))
      .catch((error: unknown) => {
        get().failMessage(chatId, message.client_id!);
        if (error instanceof ApiError && error.status !== 0) toast.error(error.message);
      });
  };

  return {
    chats: {},
    order: [],
    listLoaded: false,
    listFailed: false,
    nextCursor: null,
    conversations: {},
    typing: {},
    activeChatId: null,

    loadChats: async () => {
      try {
        const page = await chatsApi.list();
        set((state) => {
          const chats = { ...state.chats };
          for (const chat of page.results) chats[chat.id] = chat;
          return { chats, order: sortOrder(chats), listLoaded: true, listFailed: false, nextCursor: cursorFrom(page.next) };
        });
      } catch {
        set({ listFailed: true });
      }
    },

    loadMoreChats: async () => {
      const cursor = get().nextCursor;
      if (!cursor) return;
      set({ nextCursor: null });
      const page = await chatsApi.list(cursor);
      set((state) => {
        const chats = { ...state.chats };
        for (const chat of page.results) chats[chat.id] ??= chat;
        return { chats, order: sortOrder(chats), nextCursor: cursorFrom(page.next) };
      });
    },

    upsertChat: (chat) =>
      set((state) => {
        const chats = { ...state.chats, [chat.id]: { ...state.chats[chat.id], ...chat } };
        return { chats, order: sortOrder(chats) };
      }),

    fetchChat: async (chatId) => {
      try {
        const chat = await chatsApi.get(chatId);
        get().upsertChat(chat);
        return chat;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    openChatWith: async (user) => {
      const chat = await chatsApi.open(user.id);
      get().upsertChat(chat);
      return chat.id;
    },

    setActiveChat: (chatId) =>
      set((state) => {
        const previous = state.activeChatId;
        if (previous === chatId) return {};
        const conversations = { ...state.conversations };
        if (previous !== null && conversations[previous]) {
          conversations[previous] = {
            ...conversations[previous],
            messages: conversations[previous].messages.map((message) => {
              // Uploaded files are now served by the backend: free their local copies.
              const keepLocal = message.id < 0 || !message.localUrl;
              if (!keepLocal) URL.revokeObjectURL(message.localUrl!);
              if (!message.fresh && keepLocal) return message;
              // Messages that already animated in shouldn't animate again next time.
              return { ...message, fresh: false, localUrl: keepLocal ? message.localUrl : undefined };
            }),
          };
        }
        return { activeChatId: chatId, conversations };
      }),

    loadMessages: async (chatId) => {
      if (conversation(chatId).loaded) return;
      const page = await messagesApi.list(chatId, { limit: PAGE_SIZE });
      updateConversation(chatId, (current) => ({
        messages: page.results.reduce<ChatMessage[]>(mergeMessage, current.messages),
        loaded: true,
        hasMore: page.has_more,
      }));
    },

    loadOlder: async (chatId) => {
      const current = conversation(chatId);
      const oldest = current.messages.find((message) => message.id > 0);
      if (!current.loaded || !current.hasMore || current.loadingOlder || !oldest) return;
      updateConversation(chatId, () => ({ loadingOlder: true }));
      try {
        const page = await messagesApi.list(chatId, { before: oldest.id, limit: PAGE_SIZE });
        updateConversation(chatId, (latest) => ({
          messages: page.results.reduce<ChatMessage[]>(mergeMessage, latest.messages),
          hasMore: page.has_more,
          loadingOlder: false,
        }));
      } catch {
        updateConversation(chatId, () => ({ loadingOlder: false }));
      }
    },

    catchUp: async (chatId) => {
      if (!conversation(chatId).loaded) return;
      let hasMore = true;
      while (hasMore) {
        const confirmed = conversation(chatId).messages.filter((message) => message.id > 0);
        const newest = confirmed[confirmed.length - 1];
        const page = await messagesApi.list(chatId, newest ? { after: newest.id, limit: 100 } : { limit: PAGE_SIZE });
        updateConversation(chatId, (latest) => ({
          messages: page.results.reduce<ChatMessage[]>((list, message) => mergeMessage(list, { ...message, fresh: true }), latest.messages),
        }));
        hasMore = newest ? page.has_more : false;
      }
    },

    addPending: (chatId, partial) => {
      const message: ChatMessage = {
        id: nextTemporaryId(),
        chat: chatId,
        sender: myId(),
        attachment: null,
        reply_to: null,
        is_read: false,
        client_id: uuid(),
        created_at: new Date().toISOString(),
        delivery: "sending",
        fresh: true,
        ...partial,
      };
      updateConversation(chatId, (current) => ({ messages: [...current.messages, message] }));
      touchChat(message, false);
      return message;
    },

    confirmMessage: (message) => {
      const chatId = message.chat;
      updateConversation(chatId, (current) => ({
        messages: current.loaded || current.messages.length ? mergeMessage(current.messages, message) : current.messages,
      }));
      touchChat(message, false);
    },

    failMessage: (chatId, clientId) => get().patchMessage(chatId, clientId, { delivery: "failed", progress: undefined }),

    patchMessage: (chatId, clientId, patch) =>
      updateConversation(chatId, (current) => ({
        messages: current.messages.map((message) => (message.client_id === clientId ? { ...message, ...patch } : message)),
      })),

    sendText: (chatId, text, replyTo) => {
      const message = get().addPending(chatId, {
        type: "TEXT",
        text,
        reply_to: replyTo ? toReplyPreview(replyTo) : null,
      });
      sendTextRequest(chatId, message);
    },

    retryText: (chatId, clientId) => {
      const message = conversation(chatId).messages.find((item) => item.client_id === clientId);
      if (!message || message.delivery !== "failed") return;
      get().patchMessage(chatId, clientId, { delivery: "sending" });
      sendTextRequest(chatId, message);
    },

    sendMedia: (chatId, draft, replyTo) => {
      const localUrl = URL.createObjectURL(draft.file);
      const message = get().addPending(chatId, {
        type: draft.type,
        text: draft.caption ?? "",
        attachment: localAttachment(draft, localUrl),
        reply_to: replyTo ? toReplyPreview(replyTo) : null,
        localUrl,
        progress: 0,
      });
      mediaDrafts.set(message.client_id!, draft);
      startUpload(chatId, message);
    },

    retry: (message) => {
      if (message.type === "TEXT") {
        get().retryText(message.chat, message.client_id!);
        return;
      }
      if (message.delivery !== "failed" || !mediaDrafts.has(message.client_id!)) return;
      get().patchMessage(message.chat, message.client_id!, { delivery: "sending", progress: 0 });
      startUpload(message.chat, message);
    },

    cancelUpload: (message) => {
      const clientId = message.client_id;
      if (!clientId || message.id > 0) return;
      uploads.get(clientId)?.abort();
      mediaDrafts.delete(clientId);
      if (message.localUrl) URL.revokeObjectURL(message.localUrl);
      updateConversation(message.chat, (current) => ({
        messages: current.messages.filter((item) => item.client_id !== clientId),
      }));
    },

    deleteMessage: async (message) => {
      const chatId = message.chat;
      const removeLocally = () =>
        updateConversation(chatId, (current) => ({
          messages: current.messages.filter((item) => item.id !== message.id),
        }));
      if (message.id < 0) {
        get().cancelUpload(message);
        removeLocally();
        return;
      }
      const before = conversation(chatId).messages;
      removeLocally();
      try {
        await messagesApi.remove(message.id);
      } catch (error) {
        updateConversation(chatId, () => ({ messages: before }));
        toast.error(error instanceof ApiError ? error.message : "Could not delete the message.");
        return;
      }
      if (get().chats[chatId]?.last_message?.id === message.id) await get().fetchChat(chatId);
    },

    markRead: async (chatId) => {
      const chat = get().chats[chatId];
      const me = myId();
      const unreadIncoming = conversation(chatId).messages.filter((m) => m.id > 0 && m.sender !== me && !m.is_read);
      if ((!chat || chat.unread_count === 0) && unreadIncoming.length === 0) return;
      if (readInFlight.has(chatId)) return;
      readInFlight.add(chatId);
      try {
        const { last_read_id: lastReadId } = await chatsApi.markRead(chatId);
        set((state) => {
          const current = state.chats[chatId];
          const chats = current ? { ...state.chats, [chatId]: { ...current, unread_count: 0 } } : state.chats;
          const convo = state.conversations[chatId];
          if (!convo || lastReadId === null) return { chats };
          return {
            chats,
            conversations: {
              ...state.conversations,
              [chatId]: {
                ...convo,
                messages: convo.messages.map((m) => (m.sender !== me && m.id > 0 && m.id <= lastReadId ? { ...m, is_read: true } : m)),
              },
            },
          };
        });
      } catch {
        // Not critical: the next visit marks them read.
      } finally {
        readInFlight.delete(chatId);
      }
    },

    handleEvent: (event) => {
      const me = myId();
      switch (event.type) {
        case "message.created": {
          const { message } = event;
          const known = !!get().chats[message.chat];
          if (message.sender !== me) clearTyping(message.chat);
          if (!known) {
            void get().fetchChat(message.chat);
            return;
          }
          const current = conversation(message.chat);
          if (current.loaded) {
            updateConversation(message.chat, (latest) => ({ messages: mergeMessage(latest.messages, { ...message, fresh: true }) }));
          }
          const incoming = message.sender !== me;
          const viewing = viewingChat(message.chat, get().activeChatId);
          const alreadyListed = get().chats[message.chat]?.last_message?.id === message.id;
          touchChat(message, incoming && !viewing && !alreadyListed);
          if (incoming && viewing) void get().markRead(message.chat);
          return;
        }
        case "message.deleted": {
          const { chat_id: chatId, message_id: messageId } = event;
          updateConversation(chatId, (current) => ({
            messages: current.messages.filter((message) => message.id !== messageId),
          }));
          if (get().chats[chatId]?.last_message?.id === messageId) void get().fetchChat(chatId);
          return;
        }
        case "messages.read": {
          const { chat_id: chatId, reader_id: readerId, last_read_id: lastReadId } = event;
          const readByMe = readerId === me;
          set((state) => {
            const chat = state.chats[chatId];
            const chats = { ...state.chats };
            if (chat) {
              const lastMessage = chat.last_message;
              const lastIsRead =
                lastMessage && lastMessage.id > 0 && lastMessage.id <= lastReadId && (readByMe ? lastMessage.sender !== me : lastMessage.sender === me);
              chats[chatId] = {
                ...chat,
                unread_count: readByMe ? 0 : chat.unread_count,
                last_message: lastIsRead ? { ...lastMessage, is_read: true } : lastMessage,
              };
            }
            const convo = state.conversations[chatId];
            if (!convo) return { chats };
            const messages = convo.messages.map((message) => {
              const affected = readByMe ? message.sender !== me : message.sender === me;
              return affected && message.id > 0 && message.id <= lastReadId && !message.is_read ? { ...message, is_read: true } : message;
            });
            return { chats, conversations: { ...state.conversations, [chatId]: { ...convo, messages } } };
          });
          return;
        }
        case "typing": {
          const { chat_id: chatId, user_id: userId, action } = event;
          if (userId === me) return;
          if (action === "stop") {
            clearTyping(chatId);
            return;
          }
          clearTimeout(typingTimers.get(chatId));
          typingTimers.set(chatId, setTimeout(() => clearTyping(chatId), TYPING_TTL_MS));
          set((state) => ({ typing: { ...state.typing, [chatId]: { userId, action, expiresAt: Date.now() + TYPING_TTL_MS } } }));
          return;
        }
        case "presence": {
          set((state) => {
            let changed = false;
            const chats = { ...state.chats };
            for (const chat of Object.values(state.chats)) {
              if (chat.peer?.id === event.user_id) {
                chats[chat.id] = { ...chat, peer: { ...chat.peer, is_online: event.is_online, last_seen: event.last_seen } };
                changed = true;
              }
            }
            return changed ? { chats } : {};
          });
          return;
        }
        case "user.updated": {
          const { user } = event;
          if (user.id === me) {
            useAuth.getState().setUser(user);
            return;
          }
          set((state) => {
            const chats = { ...state.chats };
            for (const chat of Object.values(state.chats)) {
              if (chat.peer?.id === user.id) chats[chat.id] = { ...chat, peer: user };
            }
            return { chats };
          });
          return;
        }
        case "chat.deleted": {
          const { chat_id: chatId } = event;
          const chat = get().chats[chatId];
          deletedChatIds.add(chatId);
          if (chat && get().activeChatId === chatId) {
            toast.info(`${chat.peer?.display_name ?? "Your contact"} deleted their account`);
          }
          clearTyping(chatId);
          for (const message of get().conversations[chatId]?.messages ?? []) {
            if (message.localUrl) URL.revokeObjectURL(message.localUrl);
          }
          set((state) => {
            const chats = { ...state.chats };
            const conversations = { ...state.conversations };
            delete chats[chatId];
            delete conversations[chatId];
            return { chats, conversations, order: state.order.filter((id) => id !== chatId) };
          });
          return;
        }
        case "account.deleted":
          // Deleted on another device: this one has nothing left to show.
          if (!useAuth.getState().leaving) window.location.replace("/");
          return;
        default:
          return;
      }
    },

    reset: () =>
      set({ chats: {}, order: [], listLoaded: false, listFailed: false, nextCursor: null, conversations: {}, typing: {}, activeChatId: null }),
  };
});

export { EMPTY_CONVERSATION };
