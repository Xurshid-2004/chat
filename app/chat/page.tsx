import type { Metadata } from "next";
import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import { ChatApp } from "@/components/chat/ChatApp";

export const metadata: Metadata = { title: "Chats" };

export default function ChatPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <ChatApp />
      </Suspense>
    </AppShell>
  );
}
