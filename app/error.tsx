"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthShell
      title="Something went wrong"
      subtitle="This screen hit an unexpected problem. Your messages are safe — try again."
      footer={error.digest ? `Error code: ${error.digest}` : null}
    >
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCw className="size-5" /> Try again
        </Button>
        <Link
          href="/chat"
          className="flex h-14 items-center justify-center rounded-2xl bg-surface-2 text-[17px] font-semibold text-fg active:opacity-70"
        >
          Back to chats
        </Link>
      </div>
    </AuthShell>
  );
}
