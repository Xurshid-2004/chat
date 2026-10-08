import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <AuthShell
      title="Page not found"
      subtitle="This link doesn't lead anywhere. It may be mistyped or no longer exist."
      footer={null}
    >
      <Link
        href="/chat"
        className="flex h-14 items-center justify-center rounded-2xl bg-accent text-[17px] font-semibold text-accent-fg shadow-[0_6px_20px_-6px_var(--accent)] active:opacity-80"
      >
        Go to chats
      </Link>
    </AuthShell>
  );
}
