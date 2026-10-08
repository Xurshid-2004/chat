import type { NextConfig } from "next";

// Django backend. The browser only ever talks to Next.js, which forwards
// /api, /media and /ws there, so cookies and WebSockets share one origin.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// Next.js buffers proxied request bodies and silently cuts them at this size
// (default 10 MB). Keep it above the backend's CHAT_MAX_REQUEST_SIZE (125 MB).
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 130);

// Pages only: Django sets its own headers on /api, /media and /admin.
// No nonces (pages stay static), so inline scripts need 'unsafe-inline'; dev also needs eval.
// No upgrade-insecure-requests: phones on the local network open the site over plain http.
const isDev = process.env.NODE_ENV === "development";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // blob: — previews of photos/videos/voice before they are uploaded.
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const PAGE_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone (voice messages) is the only device feature the app uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    proxyClientMaxBodySize: `${MAX_UPLOAD_MB}mb`,
    // Large video uploads over slow mobile networks need more than the 30 s default.
    proxyTimeout: 10 * 60 * 1000,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Django URLs end with "/": forward them as written instead of redirecting.
  skipTrailingSlashRedirect: true,
  // Opening the dev server from a phone on the local network.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  poweredByHeader: false,
  // The floating dev badge covers the attach button on phone screens; errors still show.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/((?!api/|media/|ws/|admin/|static/).*)", headers: PAGE_HEADERS }];
  },
  async rewrites() {
    return [
      { source: "/api/:path(.*)", destination: `${BACKEND_URL}/api/:path` },
      { source: "/media/:path(.*)", destination: `${BACKEND_URL}/media/:path` },
      { source: "/ws/:path(.*)", destination: `${BACKEND_URL}/ws/:path` },
      { source: "/admin/:path(.*)", destination: `${BACKEND_URL}/admin/:path` },
      { source: "/static/:path(.*)", destination: `${BACKEND_URL}/static/:path` },
    ];
  },
  async redirects() {
    return [
      // Already started on this device: straight to the chats.
      {
        source: "/",
        has: [{ type: "cookie", key: "chat_session" }],
        destination: "/chat",
        permanent: false,
      },
      // Old sign-in pages: there is a single "Start chatting" button now.
      { source: "/login", destination: "/", permanent: false },
      { source: "/register", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
