import type { Metadata, Viewport } from "next";

import { ThemeSync } from "@/components/ThemeSync";
import { Toaster } from "@/components/ui/Toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Chat", template: "%s · Chat" },
  description: "Private real-time chat with text, photos, videos and voice messages.",
  applicationName: "Chat",
  appleWebApp: { capable: true, title: "Chat", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / home indicator; layouts pad with env(safe-area-inset-*).
  viewportFit: "cover",
  // The on-screen keyboard shrinks the layout, so the message input stays visible.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Applies a saved light/dark choice before the first paint, so there is no flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <Toaster />
        <ThemeSync />
      </body>
    </html>
  );
}
