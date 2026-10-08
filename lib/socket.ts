"use client";

/**
 * The app's single WebSocket. Keeps itself alive on flaky mobile networks:
 * reconnects with backoff, pings to detect dead connections, refreshes the
 * session when the server closes with 4401, and reconnects right away when
 * the phone comes back online or the app returns to the foreground.
 */
import { ApiError, authApi, notifySessionExpired, refreshSession } from "./api";
import { useConnection } from "./store/connection";
import type { ServerEvent, TypingAction } from "./types";

const CLOSE_UNAUTHORIZED = 4401;
/** Set at build time when the backend lives on another host (see next.config.ts). */
const DIRECT_WS_URL = process.env.CHAT_DIRECT_WS_URL ?? "";
const PING_EVERY_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 15_000;

type EventListener = (event: ServerEvent) => void;

class ChatSocket {
  private socket: WebSocket | null = null;
  private fetchingTicket = false;
  private wanted = false;
  private connectedBefore = false;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private pongTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<EventListener>();
  private readonly reconnectListeners = new Set<() => void>();

  start() {
    if (this.wanted) return;
    this.wanted = true;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("pageshow", this.handleWake);
    document.addEventListener("visibilitychange", this.handleWake);
    this.connect();
  }

  stop() {
    this.wanted = false;
    this.connectedBefore = false;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("pageshow", this.handleWake);
    document.removeEventListener("visibilitychange", this.handleWake);
    clearTimeout(this.retryTimer);
    this.stopHeartbeat();
    this.drop();
    useConnection.getState().setStatus("connecting");
  }

  /** Server events. Returns an unsubscribe function. */
  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Called after every reconnection (not the first connection): time to catch up. */
  onReconnect(listener: () => void) {
    this.reconnectListeners.add(listener);
    return () => {
      this.reconnectListeners.delete(listener);
    };
  }

  sendTyping(chatId: number, action: TypingAction) {
    this.send({ type: "typing", chat_id: chatId, action });
  }

  private send(payload: object) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }

  private connect() {
    if (!this.wanted || this.socket || this.fetchingTicket) return;
    clearTimeout(this.retryTimer);
    if (!navigator.onLine) {
      useConnection.getState().setStatus("offline");
      return;
    }
    useConnection.getState().setStatus("connecting");
    if (!DIRECT_WS_URL) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      this.open(`${protocol}://${window.location.host}/ws/`);
      return;
    }
    // Straight to the backend: its cookies live on our domain, so prove who we are with a ticket.
    this.fetchingTicket = true;
    authApi
      .webSocketTicket()
      .then(({ ticket }) => {
        this.fetchingTicket = false;
        if (this.wanted && !this.socket) this.open(`${DIRECT_WS_URL}?ticket=${encodeURIComponent(ticket)}`);
      })
      .catch((error: unknown) => {
        this.fetchingTicket = false;
        if (!this.wanted) return;
        if (error instanceof ApiError && error.status === 401) notifySessionExpired();
        else this.scheduleReconnect();
      });
  }

  private open(url: string) {
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onmessage = (message) => this.handleMessage(message);
    socket.onclose = (event) => {
      if (this.socket === socket) void this.handleClose(event.code);
    };
  }

  /** Forget the current socket without waiting for its close handshake. */
  private drop() {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onmessage = null;
    socket.onclose = null;
    // Closing while still connecting makes browsers log a warning: close once open instead.
    if (socket.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close();
    else if (socket.readyState === WebSocket.OPEN) socket.close();
  }

  private handleMessage(message: MessageEvent) {
    let event: ServerEvent;
    try {
      event = JSON.parse(message.data as string) as ServerEvent;
    } catch {
      return;
    }
    if (event.type === "ready") {
      this.attempts = 0;
      useConnection.getState().setStatus("online");
      this.startHeartbeat();
      if (this.connectedBefore) this.reconnectListeners.forEach((listener) => listener());
      this.connectedBefore = true;
      return;
    }
    if (event.type === "pong") {
      clearTimeout(this.pongTimer);
      return;
    }
    this.listeners.forEach((listener) => listener(event));
  }

  private async handleClose(code: number) {
    this.stopHeartbeat();
    this.socket = null;
    if (!this.wanted) return;
    useConnection.getState().setStatus(navigator.onLine ? "connecting" : "offline");

    if (code === CLOSE_UNAUTHORIZED) {
      if (await refreshSession()) {
        this.connect();
      } else {
        notifySessionExpired();
      }
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (!this.wanted || !navigator.onLine) return;
    // Exponential backoff with jitter, so a restarted server isn't hit by everyone at once.
    const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempts) * (0.7 + Math.random() * 0.6);
    this.attempts += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private ping() {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.send({ type: "ping" });
    clearTimeout(this.pongTimer);
    // No answer: the connection is dead (e.g. the phone switched networks).
    this.pongTimer = setTimeout(() => {
      this.drop();
      void this.handleClose(4000);
    }, PONG_TIMEOUT_MS);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => this.ping(), PING_EVERY_MS);
  }

  private stopHeartbeat() {
    clearInterval(this.pingTimer);
    clearTimeout(this.pongTimer);
  }

  private handleOnline = () => {
    this.attempts = 0;
    this.connect();
  };

  private handleOffline = () => {
    this.stopHeartbeat();
    this.drop();
    useConnection.getState().setStatus("offline");
  };

  private handleWake = () => {
    if (document.visibilityState !== "visible" || !this.wanted) return;
    if (!this.socket) {
      this.attempts = 0;
      this.connect();
    } else {
      // Check right away that the connection survived the background.
      this.ping();
    }
  };
}

export const chatSocket = new ChatSocket();
