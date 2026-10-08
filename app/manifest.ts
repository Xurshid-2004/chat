import type { MetadataRoute } from "next";

// "Add to Home Screen": opens full screen like a native app, straight into the chats.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Chat",
    short_name: "Chat",
    description: "Private real-time chat with text, photos, videos and voice messages.",
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
