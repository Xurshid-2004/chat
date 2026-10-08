"use client";

import { useEffect } from "react";

import { chatSocket } from "./socket";
import { useChats } from "./store/chat";

/** After a reconnect: refresh the chat list, fetch missed messages, resend failed texts. */
async function resync() {
  const state = useChats.getState();
  await state.loadChats();
  for (const [id, conversation] of Object.entries(useChats.getState().conversations)) {
    if (!conversation.loaded) continue;
    try {
      await state.catchUp(Number(id));
    } catch {
      // The next reconnect tries again.
    }
  }
  for (const conversation of Object.values(useChats.getState().conversations)) {
    for (const message of conversation.messages) {
      // Safe to repeat: the server ignores a client_id it has already seen.
      if (message.delivery === "failed" && message.type === "TEXT") state.retryText(message.chat, message.client_id!);
    }
  }
}

/** Connects the WebSocket for as long as the chat screen is open. */
export function useRealtime() {
  useEffect(() => {
    chatSocket.start();
    const unsubscribe = chatSocket.subscribe((event) => useChats.getState().handleEvent(event));
    const stopResync = chatSocket.onReconnect(() => void resync());
    return () => {
      unsubscribe();
      stopResync();
      chatSocket.stop();
    };
  }, []);
}
