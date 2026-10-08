import { cn } from "@/lib/cn";

/** App mark: a speech bubble on an accent gradient tile. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-16", className)}>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#logo-gradient)" />
      <path
        d="M32 17c-9.4 0-17 6.3-17 14.1 0 4.5 2.5 8.5 6.4 11.1L20 48.5l7.4-3.5c1.5.3 3 .5 4.6.5 9.4 0 17-6.3 17-14.4S41.4 17 32 17Z"
        fill="#fff"
      />
      <circle cx="25" cy="31.5" r="2.4" fill="url(#logo-gradient)" />
      <circle cx="32" cy="31.5" r="2.4" fill="url(#logo-gradient)" />
      <circle cx="39" cy="31.5" r="2.4" fill="url(#logo-gradient)" />
    </svg>
  );
}
