"use client";

// Replaces the root layout when it fails, so it can't rely on globals.css or the theme.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorScheme: "light dark",
        }}
      >
        <title>Something went wrong · Chat</title>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 16, opacity: 0.7, margin: "0 0 24px" }}>The app couldn&apos;t load. Please try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              height: 52,
              width: "100%",
              border: 0,
              borderRadius: 16,
              background: "#0a6cff",
              color: "#fff",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
