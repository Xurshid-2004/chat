"use client";

import { AnimatePresence, motion } from "motion/react";
import { Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCoarsePointer } from "@/lib/hooks";
import { mediaKind, sizeError } from "@/lib/media";
import { chatSocket } from "@/lib/socket";
import { deletedChatIds, useChats, type ChatMessage, type MediaDraft } from "@/lib/store/chat";
import { toast } from "@/lib/store/toast";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";

import { AttachMenu } from "./AttachMenu";
import { ChatHeader } from "./ChatHeader";
import { MediaComposer } from "./MediaComposer";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { PeerProfileSheet } from "./PeerProfileSheet";
import { VoiceRecorderBar } from "./VoiceRecorderBar";

const MAX_FILES_AT_ONCE = 10;

interface ChatWindowProps {
  chatId: number;
  showBack: boolean;
  onBack: () => void;
}

export function ChatWindow({ chatId, showBack, onBack }: ChatWindowProps) {
  const chat = useChats((state) => state.chats[chatId]);
  const loaded = useChats((state) => state.conversations[chatId]?.loaded ?? false);
  const fetchChat = useChats((state) => state.fetchChat);
  const loadMessages = useChats((state) => state.loadMessages);
  const markRead = useChats((state) => state.markRead);
  const sendText = useChats((state) => state.sendText);
  const sendMedia = useChats((state) => state.sendMedia);
  const coarse = useCoarsePointer();

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [composerFiles, setComposerFiles] = useState<File[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const sendOnMaxLength = useRef<() => void>(() => undefined);
  const handleMaxLength = useCallback(() => sendOnMaxLength.current(), []);
  const recorder = useVoiceRecorder(toast.error, handleMaxLength);

  const hasChat = !!chat;
  const unread = chat?.unread_count ?? 0;
  const peerName = chat?.peer?.display_name ?? "";

  // Opened by link (/chat?id=…) before the chat list knew this chat.
  useEffect(() => {
    if (hasChat) return;
    // The other person deleted their account while this chat was open (already announced).
    if (deletedChatIds.has(chatId)) {
      onBack();
      return;
    }
    let cancelled = false;
    fetchChat(chatId)
      .then((found) => {
        if (!cancelled && !found) {
          toast.error("This chat doesn't exist.");
          onBack();
        }
      })
      .catch(() => toast.error("Could not open the chat."));
    return () => {
      cancelled = true;
    };
  }, [chatId, hasChat, fetchChat, onBack]);

  useEffect(() => {
    loadMessages(chatId).catch(() => toast.error("Could not load messages."));
  }, [chatId, loadMessages]);

  // Seen while the chat is open and the page is visible.
  useEffect(() => {
    if (loaded && unread > 0 && document.visibilityState === "visible") void markRead(chatId);
  }, [chatId, loaded, unread, markRead]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void markRead(chatId);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [chatId, markRead]);

  useEffect(() => {
    if (!coarse) textareaRef.current?.focus();
  }, [chatId, coarse]);

  // "typing…" for the other person: at most every 3 s while typing, "stop" when done.
  const typingSentAt = useRef(0);
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - typingSentAt.current > 3000) {
      typingSentAt.current = now;
      chatSocket.sendTyping(chatId, "typing");
    }
  }, [chatId]);
  const stopTyping = useCallback(() => {
    if (!typingSentAt.current) return;
    typingSentAt.current = 0;
    chatSocket.sendTyping(chatId, "stop");
  }, [chatId]);
  useEffect(() => stopTyping, [stopTyping]);

  // "recording voice…" while the microphone is on.
  const recording = recorder.state === "recording";
  useEffect(() => {
    if (!recording) return;
    chatSocket.sendTyping(chatId, "recording");
    const timer = window.setInterval(() => chatSocket.sendTyping(chatId, "recording"), 3000);
    return () => {
      window.clearInterval(timer);
      chatSocket.sendTyping(chatId, "stop");
    };
  }, [chatId, recording]);

  const afterSend = useCallback(() => {
    setReplyTo(null);
    setScrollSignal((value) => value + 1);
  }, []);

  const send = useCallback(
    (text: string) => {
      stopTyping();
      sendText(chatId, text, replyTo);
      afterSend();
    },
    [afterSend, chatId, replyTo, sendText, stopTyping],
  );

  const sendDrafts = useCallback(
    (drafts: MediaDraft[]) => {
      drafts.forEach((draft, index) => sendMedia(chatId, draft, index === 0 ? replyTo : null));
      afterSend();
    },
    [afterSend, chatId, replyTo, sendMedia],
  );

  /** Photos/videos open the preview; other files are sent as documents right away. */
  const handleFiles = useCallback(
    (list: FileList | File[], asDocuments = false) => {
      const files = Array.from(list).slice(0, MAX_FILES_AT_ONCE);
      if (list.length > MAX_FILES_AT_ONCE) toast.info(`Up to ${MAX_FILES_AT_ONCE} files at a time.`);
      const visual: File[] = [];
      const documents: MediaDraft[] = [];
      for (const file of files) {
        const kind = asDocuments ? "FILE" : mediaKind(file);
        const problem = sizeError(file, kind);
        if (problem) {
          toast.error(problem);
          continue;
        }
        if (kind === "FILE") documents.push({ file, type: "FILE" });
        else visual.push(file);
      }
      if (documents.length) sendDrafts(documents);
      if (visual.length) setComposerFiles(visual);
    },
    [sendDrafts],
  );

  const toggleRecording = useCallback(async () => {
    if (recorder.state === "starting") return;
    if (recorder.state === "idle") {
      await recorder.start();
      return;
    }
    const result = await recorder.stop(true);
    if (result) {
      sendDrafts([{ file: result.file, type: "AUDIO", duration: result.duration, waveform: result.waveform }]);
    }
  }, [recorder, sendDrafts]);

  // Reaching the maximum length sends what was recorded.
  useEffect(() => {
    sendOnMaxLength.current = () => void toggleRecording();
  }, [toggleRecording]);

  const reply = useCallback((message: ChatMessage) => {
    setReplyTo(message);
    textareaRef.current?.focus();
  }, []);

  const handlePaste = (event: React.ClipboardEvent) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    handleFiles(files);
  };

  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  return (
    <div
      className="relative flex h-full flex-col bg-app"
      onPaste={handlePaste}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (hasFiles(event)) event.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <ChatHeader chat={chat} showBack={showBack} onBack={onBack} onOpenProfile={() => setProfileOpen(true)} />
      <MessageList chatId={chatId} peerName={peerName} scrollSignal={scrollSignal} onReply={reply} onGreet={() => send("👋")} />
      <MessageInput
        chatId={chatId}
        peerName={peerName}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={send}
        onTyping={notifyTyping}
        onTypingStop={stopTyping}
        onAttach={() => setAttachOpen(true)}
        onRecord={() => void toggleRecording()}
        recording={recording}
        overlay={
          recording ? (
            <VoiceRecorderBar elapsed={recorder.elapsed} levels={recorder.levels} onCancel={() => void recorder.stop(false)} />
          ) : undefined
        }
        textareaRef={textareaRef}
      />

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files, true);
          event.target.value = "";
        }}
      />

      <AttachMenu
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPickMedia={() => mediaInputRef.current?.click()}
        onPickFiles={() => fileInputRef.current?.click()}
      />
      <AnimatePresence>
        {composerFiles && <MediaComposer key="composer" files={composerFiles} onClose={() => setComposerFiles(null)} onSend={sendDrafts} />}
      </AnimatePresence>
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-[28px] border-2 border-dashed border-accent bg-accent-soft backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-3 text-accent">
              <Upload className="size-10" />
              <p className="text-[17px] font-semibold">Drop files to send</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PeerProfileSheet chatId={chatId} user={chat?.peer ?? null} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
