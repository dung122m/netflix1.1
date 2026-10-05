export interface AccentPreset {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  rgb: string;
  oklch: string;
  glow: string;
  border: string;
  icon: string;
  badgeText: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "netflix-red",
    name: "Classic Nanaflix",
    subtitle: "Kinh điển • Rực rỡ",
    color: "#E50914",
    rgb: "229, 9, 20",
    oklch: "oklch(0.55 0.23 25)",
    glow: "rgba(229, 9, 20, 0.40)",
    border: "rgba(229, 9, 20, 0.55)",
    icon: "🔴",
    badgeText: "Classic",
  },
  {
    id: "cyber-cyan",
    name: "Cyberpunk Neon",
    subtitle: "Xanh Neon • Tương lai",
    color: "#00b4d8",
    rgb: "0, 180, 216",
    oklch: "oklch(0.68 0.18 220)",
    glow: "rgba(0, 180, 216, 0.30)",
    border: "rgba(0, 180, 216, 0.50)",
    icon: "🔵",
    badgeText: "Neon",
  },
  {
    id: "amethyst-purple",
    name: "Amethyst",
    subtitle: "Tím Hoàng Gia • Huyền bí",
    color: "#a855f7",
    rgb: "168, 85, 247",
    oklch: "oklch(0.58 0.22 300)",
    glow: "rgba(168, 85, 247, 0.45)",
    border: "rgba(168, 85, 247, 0.55)",
    icon: "🟣",
    badgeText: "Amethyst",
  },
  {
    id: "emerald-green",
    name: "Emerald Matrix",
    subtitle: "Xanh Ngọc • Tươi mát",
    color: "#10b981",
    rgb: "16, 185, 129",
    oklch: "oklch(0.62 0.20 150)",
    glow: "rgba(16, 185, 129, 0.38)",
    border: "rgba(16, 185, 129, 0.50)",
    icon: "🟢",
    badgeText: "Emerald",
  },
  {
    id: "sunset-gold",
    name: "Sunset Gold",
    subtitle: "Vàng Hoàng Hôn • Ấm áp",
    color: "#f59e0b",
    rgb: "245, 158, 11",
    oklch: "oklch(0.68 0.21 48)",
    glow: "rgba(245, 158, 11, 0.30)",
    border: "rgba(245, 158, 11, 0.50)",
    icon: "🟡",
    badgeText: "Gold",
  },
  {
    id: "hot-pink",
    name: "Hot Pink",
    subtitle: "Hồng Cyber • Trẻ trung",
    color: "#f43f5e",
    rgb: "244, 63, 94",
    oklch: "oklch(0.62 0.24 350)",
    glow: "rgba(244, 63, 94, 0.42)",
    border: "rgba(244, 63, 94, 0.55)",
    icon: "🩷",
    badgeText: "Hot Pink",
  },
];

export const ACCENT_STORAGE_KEY = "nanaflix_theme";

export function getActiveAccent(): AccentPreset {
  if (typeof window === "undefined") return ACCENT_PRESETS[0];
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    const found = ACCENT_PRESETS.find((p) => p.id === saved);
    return found || ACCENT_PRESETS[0];
  } catch {
    return ACCENT_PRESETS[0];
  }
}

export function applyAccent(presetId: string): AccentPreset {
  if (typeof window === "undefined") {
    return ACCENT_PRESETS.find((p) => p.id === presetId) || ACCENT_PRESETS[0];
  }

  const preset = ACCENT_PRESETS.find((p) => p.id === presetId) || ACCENT_PRESETS[0];

  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, preset.id);
  } catch {
    // Ignore quota issues
  }

  const root = document.documentElement;
  root.setAttribute("data-accent", preset.id);
  root.style.setProperty("--netflix-red", preset.oklch);
  root.style.setProperty("--accent-color", preset.color);
  root.style.setProperty("--accent-rgb", preset.rgb);
  root.style.setProperty("--accent-glow", preset.glow);
  root.style.setProperty("--accent-border", preset.border);

  window.dispatchEvent(
    new CustomEvent("nanaflix-accent-changed", { detail: preset })
  );

  return preset;
}
