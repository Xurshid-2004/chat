import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { ModerationPage } from "@/components/moderation/ModerationPage";

export const metadata: Metadata = { title: "Admin" };

export default function Moderation() {
  return (
    <AppShell>
      <ModerationPage />
    </AppShell>
  );
}
