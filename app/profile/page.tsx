import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { ProfilePage } from "@/components/profile/ProfilePage";

export const metadata: Metadata = { title: "Profile" };

export default function Profile() {
  return (
    <AppShell>
      <ProfilePage />
    </AppShell>
  );
}
