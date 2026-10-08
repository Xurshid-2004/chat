/** Ready-made avatars for the start screen (keys match backend/users/presets.py). */
export interface AvatarPreset {
  key: string;
  label: string;
  emoji: string;
  from: string;
  to: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: "fox", label: "Fox", emoji: "🦊", from: "#ffb340", to: "#ff5e3a" },
  { key: "panda", label: "Panda", emoji: "🐼", from: "#a1a1aa", to: "#3f3f46" },
  { key: "tiger", label: "Tiger", emoji: "🐯", from: "#ffd60a", to: "#ff9500" },
  { key: "frog", label: "Frog", emoji: "🐸", from: "#6ee7b7", to: "#16a34a" },
  { key: "lion", label: "Lion", emoji: "🦁", from: "#fde68a", to: "#f59e0b" },
  { key: "koala", label: "Koala", emoji: "🐨", from: "#cbd5e1", to: "#64748b" },
  { key: "octopus", label: "Octopus", emoji: "🐙", from: "#ff8fab", to: "#e11d48" },
  { key: "unicorn", label: "Unicorn", emoji: "🦄", from: "#d8b4fe", to: "#7c3aed" },
  { key: "penguin", label: "Penguin", emoji: "🐧", from: "#7dd3fc", to: "#0a6cff" },
  { key: "bear", label: "Bear", emoji: "🐻", from: "#d6a77a", to: "#8b5a2b" },
  { key: "rabbit", label: "Rabbit", emoji: "🐰", from: "#fbcfe8", to: "#ec4899" },
  { key: "owl", label: "Owl", emoji: "🦉", from: "#c4b5a0", to: "#6b5b45" },
];

const BY_KEY = new Map(AVATAR_PRESETS.map((preset) => [preset.key, preset]));

export function avatarPreset(key: string | null | undefined): AvatarPreset | undefined {
  return key ? BY_KEY.get(key) : undefined;
}
