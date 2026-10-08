/**
 * Client for the Django API. The session lives in httpOnly cookies, so the
 * browser sends it automatically; this module adds the CSRF header and, when
 * the short-lived access token has expired (401), refreshes it once and retries.
 */
import type { Chat, CursorPage, Message, MessagePage, User } from "./types";

const API = "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** First message for a form field, if the server rejected it. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

type Body = FormData | Record<string, unknown> | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Body;
  signal?: AbortSignal;
  /** When false, a 401 is returned to the caller instead of refreshing the session. */
  refresh?: boolean;
}

const BASE_HEADERS = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };

let sessionExpiredHandler: (() => void) | null = null;

/** Called when the session can't be refreshed any more (signed out elsewhere, expired). */
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

export function notifySessionExpired() {
  sessionExpiredHandler?.();
}

let refreshing: Promise<boolean> | null = null;

/**
 * Get a new access token. Tabs share cookies, so a Web Lock makes sure only
 * one tab refreshes at a time; the others then just see the fresh cookie.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= withLock("chat-session-refresh", async () => {
    const probe = await fetch(`${API}/auth/me/`, { headers: BASE_HEADERS, cache: "no-store" });
    if (probe.ok) return true; // another tab refreshed while we waited
    const response = await fetch(`${API}/auth/refresh/`, { method: "POST", headers: BASE_HEADERS, cache: "no-store" });
    return response.ok;
  })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    // request() resolves with the value the callback's promise resolves to.
    return navigator.locks.request(name, task) as unknown as Promise<T>;
  }
  return task();
}

function buildInit({ method = "GET", body, signal }: RequestOptions): RequestInit {
  const headers: Record<string, string> = { ...BASE_HEADERS };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  return { method, headers, body: payload, signal, cache: "no-store", credentials: "same-origin" };
}

export async function toApiError(response: Response): Promise<ApiError> {
  let data: { detail?: string; code?: string; errors?: Record<string, string[]> } = {};
  try {
    data = await response.json();
  } catch {
    // not JSON (e.g. a proxy error page)
  }
  const fallback =
    response.status === 413
      ? "File is too large."
      : response.status === 429
        ? "Too many requests. Please wait a moment."
        : response.status >= 500
          ? "Server error. Please try again."
          : "Something went wrong.";
  return new ApiError(response.status, data.code ?? "error", data.detail ?? fallback, data.errors ?? {});
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init = buildInit(options);
  let response: Response;
  try {
    response = await fetch(API + path, init);
    if (response.status === 401 && options.refresh !== false) {
      if (await refreshSession()) {
        response = await fetch(API + path, init);
      }
      if (response.status === 401) sessionExpiredHandler?.();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network_error", "No connection. Check your internet and try again.");
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --- endpoints ------------------------------------------------------------------

export const authApi = {
  me: () => request<User>("/auth/me/"),
  /** The start screen: a new account with this name and avatar, signed in on this device. */
  start: (data: { name: string; avatar_preset: string }) =>
    request<{ user: User }>("/auth/guest/", { method: "POST", body: data, refresh: false }),
  logout: () => request<void>("/auth/logout/", { method: "POST", refresh: false }),
};

export const usersApi = {
  search: (query: string, signal?: AbortSignal) =>
    request<User[]>(`/users/?search=${encodeURIComponent(query)}`, { signal }),
  /** Other people on the app, most recently active first. */
  people: () => request<User[]>("/users/people/"),
  get: (id: number) => request<User>(`/users/${id}/`),
  updateProfile: (data: FormData | Record<string, unknown>) =>
    request<User>("/users/me/", { method: "PATCH", body: data }),
  /** Deletes the account, its chats, messages and files for good; signs out everywhere. */
  deleteAccount: () => request<void>("/users/me/", { method: "DELETE" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/users/me/password/", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    }),
};

export const chatsApi = {
  list: (cursor?: string | null) =>
    request<CursorPage<Chat>>(cursor ? `/chats/?cursor=${encodeURIComponent(cursor)}` : "/chats/"),
  open: (userId: number) => request<Chat>("/chats/", { method: "POST", body: { user_id: userId } }),
  get: (id: number) => request<Chat>(`/chats/${id}/`),
  markRead: (id: number, upTo?: number) =>
    request<{ updated: number; last_read_id: number | null }>(`/chats/${id}/read/`, {
      method: "POST",
      body: upTo ? { up_to: upTo } : {},
    }),
};

export const messagesApi = {
  list: (chatId: number, params: { before?: number; after?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const suffix = query.size ? `?${query}` : "";
    return request<MessagePage>(`/chats/${chatId}/messages/${suffix}`);
  },
  sendText: (chatId: number, data: { text: string; client_id: string; reply_to?: number | null }) =>
    request<Message>(`/chats/${chatId}/messages/`, { method: "POST", body: data }),
  remove: (id: number) => request<void>(`/messages/${id}/`, { method: "DELETE" }),
};

/** Pull the `cursor` query value out of a DRF "next" link. */
export function cursorFrom(url: string | null): string | null {
  if (!url) return null;
  return new URL(url, "http://localhost").searchParams.get("cursor");
}
