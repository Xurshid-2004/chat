// A curated emoji set (no extra dependency): the ones people actually use.

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: string[];
}

const list = (value: string) => value.trim().split(/\s+/);

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: list(`😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭
      🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓
      🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩
      🤡 👻 👽 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾`),
  },
  {
    id: "people",
    label: "People",
    emojis: list(`👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏
      ✍️ 💅 💪 👀 👁️ 👅 👄 🧠 🫶 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙋 🙆 🙅 🤷 🤦 🙇 💁 🧑‍💻 🧑‍🎓
      🧑‍🍳 🧑‍🚀 🦸 🧙 🧚 💃 🕺 👫 👭 👬 💑 👪`),
  },
  {
    id: "nature",
    label: "Animals & nature",
    emojis: list(`🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐴 🦄 🐝
      🐛 🦋 🐌 🐞 🐢 🐍 🐙 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🦓 🐘 🦒 🐪 🐎 🐑 🐐 🦌 🐕 🐈 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️
      🍀 🍁 🍂 🍃 🌸 🌼 🌻 🌹 🌷 🌺 💐 🌞 🌝 🌚 🌙 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ ❄️ ☃️ 🌊 💧`),
  },
  {
    id: "food",
    label: "Food & drink",
    emojis: list(`🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🥐 🍞
      🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍡 🍧 🍨
      🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🥛 ☕ 🍵 🧃 🥤 🧋 🍺 🍻 🥂 🍷 🥃 🍸 🍹`),
  },
  {
    id: "activity",
    label: "Activities",
    emojis: list(`⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🏒 🥊 🥋 ⛳ 🏹 🎣 🛹 ⛸️ 🎿 🏂 🏋️ 🤸 🏊 🚴 🏆 🥇 🥈 🥉 🏅 🎖️
      🎫 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟️ 🎯 🎳 🎮 🧩 🎉 🎊 🎈 🎁 🎀`),
  },
  {
    id: "travel",
    label: "Travel & places",
    emojis: list(`🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚜 🛵 🏍️ 🚲 🛴 🚨 🚄 🚂 ✈️ 🛫 🛬 🚀 🛸 🚁 ⛵ 🚤 🚢 ⚓ 🗺️ 🗽
      🗼 🏰 🏯 🏟️ 🎡 🎢 ⛲ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ 🏠 🏡 🏢 🏥 🏦 🏨 🏫 🕌 ⛪ 🌃 🌆 🌇 🌉 🌌`),
  },
  {
    id: "objects",
    label: "Objects",
    emojis: list(`⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 📷 📸 📹 🎥 📞 📺 📻 🎙️ ⏰ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 💸 💵 💰 💳 💎 ⚖️
      🔧 🔨 ⚙️ 🧲 🛡️ 🔮 💊 💉 🧬 🧪 🌡️ 🧹 🧺 🔑 🗝️ 🚪 🛋️ 🛏️ 🧸 🖼️ 🛍️ 🛒 ✉️ 📩 📦 📝 📁 📅 📌 📎
      ✂️ 🔒 🔓 📚 📖 🔖`),
  },
  {
    id: "symbols",
    label: "Symbols",
    emojis: list(`❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ☮️ ☯️ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑
      ♒ ♓ 🆗 🆒 🆕 🆓 🆙 🆘 ❌ ⭕ 🛑 ⛔ 🚫 💯 ✅ ☑️ ✔️ ❎ ➕ ➖ ➗ ✖️ ♾️ ‼️ ⁉️ ❓ ❗ 💲 ©️ ®️ ™️ 🔴
      🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🏁 🚩 🏳️ 🏴 🏳️‍🌈 🇺🇿`),
  },
];

const RECENT_KEY = "chat:recent-emoji";
const RECENT_LIMIT = 32;

export function readRecentEmoji(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function rememberEmoji(emoji: string): string[] {
  const next = [emoji, ...readRecentEmoji().filter((item) => item !== emoji)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage full or disabled: recents are a nicety
  }
  return next;
}
