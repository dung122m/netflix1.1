export interface ThemeOption {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  oklch: string;
  glow: string;
  border: string;
  icon: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "netflix-red",
    name: "Đỏ Nanaflix",
    subtitle: "Kinh điển • Rực rỡ",
    color: "#E50914",
    oklch: "oklch(0.55 0.23 25)",
    glow: "rgba(229, 9, 20, 0.45)",
    border: "rgba(229, 9, 20, 0.6)",
    icon: "🎬",
  },
  {
    id: "cyber-cyan",
    name: "Xanh Neon",
    subtitle: "Cyberpunk • Tương lai",
    color: "#00b4d8",
    oklch: "oklch(0.68 0.18 220)",
    glow: "rgba(0, 180, 216, 0.45)",
    border: "rgba(0, 180, 216, 0.6)",
    icon: "💎",
  },
  {
    id: "amethyst-purple",
    name: "Tím Hoàng Gia",
    subtitle: "Amethyst • Huyền bí",
    color: "#a855f7",
    oklch: "oklch(0.58 0.22 300)",
    glow: "rgba(168, 85, 247, 0.45)",
    border: "rgba(168, 85, 247, 0.6)",
    icon: "🔮",
  },
  {
    id: "emerald-green",
    name: "Xanh Ngọc",
    subtitle: "Matrix • Tươi mát",
    color: "#10b981",
    oklch: "oklch(0.62 0.20 150)",
    glow: "rgba(16, 185, 129, 0.45)",
    border: "rgba(16, 185, 129, 0.6)",
    icon: "🌿",
  },
  {
    id: "sunset-gold",
    name: "Vàng Hoàng Hôn",
    subtitle: "Sang trọng • Ấm áp",
    color: "#f59e0b",
    oklch: "oklch(0.68 0.21 48)",
    glow: "rgba(245, 158, 11, 0.45)",
    border: "rgba(245, 158, 11, 0.6)",
    icon: "✨",
  },
  {
    id: "hot-pink",
    name: "Hồng Cyber",
    subtitle: "Nổi loạn • Trẻ trung",
    color: "#f43f5e",
    oklch: "oklch(0.62 0.24 350)",
    glow: "rgba(244, 63, 94, 0.45)",
    border: "rgba(244, 63, 94, 0.6)",
    icon: "💖",
  },
];

export const THEME_STORAGE_KEY = "nanaflix_theme";

export function getCurrentTheme(): ThemeOption {
  if (typeof window === "undefined") return THEMES[0];
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const found = THEMES.find((t) => t.id === saved);
    return found || THEMES[0];
  } catch {
    return THEMES[0];
  }
}

export function setTheme(themeId: string) {
  if (typeof window === "undefined") return;
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    // Ignore quota issues
  }

  document.documentElement.setAttribute("data-theme", theme.id);
  document.documentElement.style.setProperty("--netflix-red", theme.oklch);

  window.dispatchEvent(
    new CustomEvent("nanaflix-theme-changed", { detail: theme })
  );
}

export type ThemeMode = "dark" | "light";
export const THEME_MODE_KEY = "nanaflix_mode";

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_MODE_KEY);
    return saved === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Ignore quota issues
  }

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(mode);
  document.documentElement.setAttribute("data-mode", mode);

  window.dispatchEvent(
    new CustomEvent("nanaflix-mode-changed", { detail: mode })
  );
}
