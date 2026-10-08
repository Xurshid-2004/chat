import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { StartScreen } from "@/components/auth/StartScreen";

// Visitors who already started on this device are sent to /chat by next.config.ts.
export default function StartPage() {
  return (
    <AuthShell
      title="Join the chat"
      subtitle="Pick an avatar and enter your name, so your friend knows who's writing."
      footer="No password needed. Your account is kept on this device."
      showLogo={false}
    >
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[22px] bg-surface-2" />}>
        <StartScreen />
      </Suspense>
    </AuthShell>
  );
}
