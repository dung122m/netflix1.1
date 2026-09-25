import { VietnamEvent } from "./events/types";

export type HolidayNavbarThemeId =
  | "tet"
  | "new-year"
  | "mid-autumn"
  | "national-day"
  | "heritage-hung-kings"
  | "christmas"
  | "halloween"
  | "valentine"
  | "women-family"
  | "education-teachers"
  | "military-veterans"
  | "labor-may-day"
  | "children-youth"
  | "earth-environment"
  | "traditional-spiritual"
  | "nana-birthday";

export type HeroType =
  | "mid-autumn-moon"
  | "tet-branch"
  | "national-star"
  | "hung-kings-drum"
  | "christmas-star"
  | "halloween-moon"
  | "valentine-hearts"
  | "women-family-bloom"
  | "education-book"
  | "military-memorial"
  | "labor-sunrise"
  | "youth-kite"
  | "earth-leaf"
  | "spiritual-lotus"
  | "new-year-starburst"
  | "nana-crown";

export type MidgroundType =
  | "clouds"
  | "halo"
  | "bokeh"
  | "mist"
  | "sunburst"
  | "lotus"
  | "leaves"
  | "stardust";

export type ForegroundItemType =
  | "lantern"
  | "star"
  | "moon"
  | "tassel"
  | "dove"
  | "bell"
  | "snowflake"
  | "ember"
  | "heart"
  | "orb"
  | "crown";

export interface ForegroundItem {
  type: ForegroundItemType;
  position: { left: string; top?: string };
  animation: "sway" | "float" | "pulse" | "glide";
  duration: string;
  delay?: string;
  className?: string;
}

export interface DepthItem {
  type: "cloud" | "bokeh" | "petal" | "snow" | "ember" | "dust" | "mist" | "lantern";
  position: { left?: string; right?: string; top?: string; bottom?: string };
  color: string;
  opacity: number;
  animation?: "drift" | "float" | "pulse" | "sway" | "rise";
  duration?: string;
  delay?: string;
  blur?: string;
}

export interface HolidayNavbarTheme {
  id: HolidayNavbarThemeId;
  name: string;
  styleName: string;
  ambientGradient: string;
  hero: {
    type: HeroType;
    position: {
      left?: string;
      right?: string;
      top?: string;
      transform?: string;
    };
    glowColor: string;
    animation: "breathe" | "sway" | "soar" | "twinkle" | "starburst";
    duration: string;
  };
  midground: {
    type: MidgroundType;
    color: string;
    opacity: number;
  };
  foreground: {
    items: ForegroundItem[];
  };
  depth: DepthItem[];
}

export const HOLIDAY_NAVBAR_THEMES: Record<HolidayNavbarThemeId, HolidayNavbarTheme> = {
  "mid-autumn": {
    id: "mid-autumn",
    name: "Tết Trung Thu",
    styleName: "Moonlit Asian Cinema",
    ambientGradient:
      "radial-gradient(ellipse 70% 90% at 65% -30%, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.55) 45%, rgba(5, 7, 13, 0.9) 85%)",
    hero: {
      type: "mid-autumn-moon",
      position: { right: "22%" },
      glowColor: "rgba(251, 191, 36, 0.6)",
      animation: "breathe",
      duration: "14s",
    },
    midground: {
      type: "clouds",
      color: "rgba(251, 191, 36, 0.16)",
      opacity: 0.25,
    },
    foreground: {
      items: [
        { type: "lantern", position: { left: "4%" }, animation: "sway", duration: "12s" },
        { type: "moon", position: { left: "75%" }, animation: "pulse", duration: "14s" },
        { type: "lantern", position: { left: "95%" }, animation: "sway", duration: "14s", delay: "0.8s" },
      ],
    },
    depth: [
      { type: "lantern", position: { left: "3%" }, color: "#EF4444", opacity: 0.85, animation: "sway", duration: "12s" },
      { type: "lantern", position: { right: "4%" }, color: "#EF4444", opacity: 0.85, animation: "sway", duration: "14s", delay: "1s" },
      { type: "cloud", position: { left: "0%", top: "-6px" }, color: "rgba(254, 240, 138, 0.18)", opacity: 0.35, animation: "drift", duration: "24s" },
      { type: "bokeh", position: { left: "42%", top: "8px" }, color: "rgba(251, 191, 36, 0.4)", opacity: 0.4, animation: "float", duration: "16s", blur: "6px" },
    ],
  },

  "tet": {
    id: "tet",
    name: "Tết Nguyên Đán",
    styleName: "Luxury Lunar New Year",
    ambientGradient:
      "radial-gradient(ellipse 70% 100% at 50% -30%, rgba(136, 19, 55, 0.20) 0%, rgba(69, 10, 10, 0.22) 40%, rgba(5, 5, 5, 0.88) 85%)",
    hero: {
      type: "tet-branch",
      position: { right: "16%" },
      glowColor: "rgba(244, 63, 94, 0.6)",
      animation: "sway",
      duration: "18s",
    },
    midground: {
      type: "bokeh",
      color: "rgba(245, 158, 11, 0.20)",
      opacity: 0.28,
    },
    foreground: {
      items: [
        { type: "tassel", position: { left: "5%" }, animation: "sway", duration: "12s" },
        { type: "star", position: { left: "50%" }, animation: "pulse", duration: "10s", delay: "1s" },
        { type: "tassel", position: { left: "95%" }, animation: "sway", duration: "14s", delay: "0.5s" },
      ],
    },
    depth: [
      { type: "petal", position: { left: "30%", top: "12px" }, color: "#FDA4AF", opacity: 0.7, animation: "drift", duration: "16s" },
      { type: "petal", position: { left: "62%", top: "6px" }, color: "#FB7185", opacity: 0.65, animation: "drift", duration: "20s", delay: "2s" },
      { type: "dust", position: { left: "48%", top: "16px" }, color: "#FDE047", opacity: 0.5, animation: "float", duration: "12s" },
      { type: "lantern", position: { left: "3%" }, color: "#DC2626", opacity: 0.8, animation: "sway", duration: "13s" },
    ],
  },

  "national-day": {
    id: "national-day",
    name: "Quốc Khánh & Sự Kiện Lịch Sử",
    styleName: "Elegant Patriotic Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(153, 27, 27, 0.20) 0%, rgba(120, 53, 15, 0.14) 45%, rgba(5, 5, 5, 0.88) 85%)",
    hero: {
      type: "national-star",
      position: { right: "22%" },
      glowColor: "rgba(250, 204, 21, 0.8)",
      animation: "breathe",
      duration: "12s",
    },
    midground: {
      type: "sunburst",
      color: "rgba(234, 179, 8, 0.16)",
      opacity: 0.24,
    },
    foreground: {
      items: [
        { type: "dove", position: { left: "12%" }, animation: "glide", duration: "16s" },
        { type: "star", position: { left: "75%" }, animation: "pulse", duration: "12s" },
      ],
    },
    depth: [
      { type: "ember", position: { left: "28%", top: "14px" }, color: "#FBBF24", opacity: 0.6, animation: "rise", duration: "14s" },
      { type: "ember", position: { left: "65%", top: "18px" }, color: "#F59E0B", opacity: 0.55, animation: "rise", duration: "17s", delay: "1.5s" },
      { type: "dust", position: { left: "52%", top: "10px" }, color: "#FEF08A", opacity: 0.45, animation: "float", duration: "13s" },
    ],
  },

  "heritage-hung-kings": {
    id: "heritage-hung-kings",
    name: "Giỗ Tổ Hùng Vương",
    styleName: "Ancient Vietnamese Heritage",
    ambientGradient:
      "radial-gradient(ellipse 60% 100% at 50% -30%, rgba(146, 64, 14, 0.18) 0%, rgba(69, 26, 3, 0.22) 50%, rgba(5, 5, 5, 0.88) 85%)",
    hero: {
      type: "hung-kings-drum",
      position: { right: "20%" },
      glowColor: "rgba(217, 119, 6, 0.7)",
      animation: "breathe",
      duration: "20s",
    },
    midground: {
      type: "sunburst",
      color: "rgba(217, 119, 6, 0.18)",
      opacity: 0.25,
    },
    foreground: {
      items: [
        { type: "ember", position: { left: "25%" }, animation: "float", duration: "13s" },
        { type: "ember", position: { left: "75%" }, animation: "float", duration: "15s", delay: "1s" },
      ],
    },
    depth: [
      { type: "ember", position: { left: "15%", top: "14px" }, color: "#F59E0B", opacity: 0.6, animation: "rise", duration: "15s" },
      { type: "dust", position: { left: "45%", top: "10px" }, color: "#FDE047", opacity: 0.4, animation: "float", duration: "18s" },
      { type: "mist", position: { left: "0%", top: "20px" }, color: "rgba(180, 83, 9, 0.15)", opacity: 0.3, animation: "drift", duration: "22s" },
    ],
  },

  "christmas": {
    id: "christmas",
    name: "Giáng Sinh Noel",
    styleName: "Luxury Winter Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 60% -25%, rgba(15, 23, 42, 0.55) 0%, rgba(245, 158, 11, 0.08) 45%, rgba(2, 6, 23, 0.9) 85%)",
    hero: {
      type: "christmas-star",
      position: { right: "22%" },
      glowColor: "rgba(254, 240, 138, 0.85)",
      animation: "twinkle",
      duration: "11s",
    },
    midground: {
      type: "mist",
      color: "rgba(186, 230, 253, 0.18)",
      opacity: 0.25,
    },
    foreground: {
      items: [
        { type: "bell", position: { left: "6%" }, animation: "sway", duration: "12s" },
        { type: "snowflake", position: { left: "45%" }, animation: "float", duration: "16s" },
        { type: "bell", position: { left: "94%" }, animation: "sway", duration: "14s", delay: "0.7s" },
      ],
    },
    depth: [
      { type: "snow", position: { left: "20%", top: "6px" }, color: "#BAE6FD", opacity: 0.75, animation: "float", duration: "14s" },
      { type: "snow", position: { left: "38%", top: "18px" }, color: "#E0F2FE", opacity: 0.65, animation: "float", duration: "18s", delay: "1.5s" },
      { type: "snow", position: { left: "68%", top: "10px" }, color: "#BAE6FD", opacity: 0.7, animation: "float", duration: "16s", delay: "0.8s" },
      { type: "bokeh", position: { left: "82%", top: "8px" }, color: "rgba(239, 68, 68, 0.3)", opacity: 0.35, animation: "pulse", duration: "10s", blur: "8px" },
    ],
  },

  "halloween": {
    id: "halloween",
    name: "Lễ Hội Halloween",
    styleName: "Dark Fantasy Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 70% -25%, rgba(88, 28, 135, 0.20) 0%, rgba(154, 52, 18, 0.12) 50%, rgba(3, 7, 18, 0.9) 85%)",
    hero: {
      type: "halloween-moon",
      position: { right: "22%" },
      glowColor: "rgba(249, 115, 22, 0.75)",
      animation: "breathe",
      duration: "13s",
    },
    midground: {
      type: "mist",
      color: "rgba(168, 85, 247, 0.18)",
      opacity: 0.28,
    },
    foreground: {
      items: [
        { type: "moon", position: { left: "75%" }, animation: "pulse", duration: "13s" },
        { type: "ember", position: { left: "25%" }, animation: "float", duration: "14s" },
      ],
    },
    depth: [
      { type: "mist", position: { left: "0%", top: "14px" }, color: "rgba(107, 33, 168, 0.25)", opacity: 0.4, animation: "drift", duration: "20s" },
      { type: "ember", position: { left: "35%", top: "16px" }, color: "#FB923C", opacity: 0.7, animation: "rise", duration: "14s" },
      { type: "ember", position: { left: "58%", top: "20px" }, color: "#EA580C", opacity: 0.6, animation: "rise", duration: "18s", delay: "1.2s" },
    ],
  },

  "valentine": {
    id: "valentine",
    name: "Ngày Lễ Tình Nhân Valentine",
    styleName: "Romantic Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(159, 18, 57, 0.16) 0%, rgba(76, 5, 25, 0.20) 45%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "valentine-hearts",
      position: { right: "22%" },
      glowColor: "rgba(244, 114, 182, 0.8)",
      animation: "breathe",
      duration: "14s",
    },
    midground: {
      type: "bokeh",
      color: "rgba(244, 114, 182, 0.16)",
      opacity: 0.25,
    },
    foreground: {
      items: [
        { type: "heart", position: { left: "30%" }, animation: "float", duration: "15s" },
        { type: "heart", position: { left: "70%" }, animation: "float", duration: "17s", delay: "1.2s" },
      ],
    },
    depth: [
      { type: "bokeh", position: { left: "20%", top: "6px" }, color: "rgba(244, 114, 182, 0.45)", opacity: 0.4, animation: "float", duration: "18s", blur: "8px" },
      { type: "bokeh", position: { left: "55%", top: "14px" }, color: "rgba(251, 113, 133, 0.4)", opacity: 0.35, animation: "float", duration: "16s", blur: "10px" },
      { type: "dust", position: { left: "42%", top: "10px" }, color: "#FDA4AF", opacity: 0.5, animation: "float", duration: "13s" },
    ],
  },

  "women-family": {
    id: "women-family",
    name: "Phụ Nữ & Gia Đình",
    styleName: "Warm Golden Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(112, 26, 117, 0.16) 0%, rgba(67, 20, 7, 0.14) 50%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "women-family-bloom",
      position: { right: "22%" },
      glowColor: "rgba(251, 191, 36, 0.7)",
      animation: "breathe",
      duration: "15s",
    },
    midground: {
      type: "bokeh",
      color: "rgba(251, 191, 36, 0.18)",
      opacity: 0.24,
    },
    foreground: {
      items: [
        { type: "orb", position: { left: "32%" }, animation: "float", duration: "13s" },
        { type: "orb", position: { left: "70%" }, animation: "float", duration: "15s", delay: "1.5s" },
      ],
    },
    depth: [
      { type: "bokeh", position: { left: "18%", top: "8px" }, color: "rgba(251, 191, 36, 0.4)", opacity: 0.4, animation: "float", duration: "17s", blur: "8px" },
      { type: "bokeh", position: { left: "60%", top: "12px" }, color: "rgba(244, 114, 182, 0.35)", opacity: 0.35, animation: "float", duration: "15s", blur: "10px" },
      { type: "dust", position: { left: "45%", top: "16px" }, color: "#FDE047", opacity: 0.5, animation: "float", duration: "14s" },
    ],
  },

  "education-teachers": {
    id: "education-teachers",
    name: "Nhà Giáo & Học Trí",
    styleName: "Warm Knowledge",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(120, 53, 15, 0.18) 0%, rgba(69, 26, 3, 0.20) 50%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "education-book",
      position: { right: "22%" },
      glowColor: "rgba(245, 158, 11, 0.75)",
      animation: "breathe",
      duration: "14s",
    },
    midground: {
      type: "halo",
      color: "rgba(245, 158, 11, 0.16)",
      opacity: 0.24,
    },
    foreground: {
      items: [
        { type: "star", position: { left: "72%" }, animation: "pulse", duration: "11s" },
        { type: "orb", position: { left: "30%" }, animation: "float", duration: "14s" },
      ],
    },
    depth: [
      { type: "dust", position: { left: "22%", top: "14px" }, color: "#FDE047", opacity: 0.5, animation: "float", duration: "16s" },
      { type: "dust", position: { left: "55%", top: "8px" }, color: "#FEF08A", opacity: 0.45, animation: "float", duration: "18s", delay: "1.2s" },
      { type: "bokeh", position: { left: "70%", top: "12px" }, color: "rgba(245, 158, 11, 0.35)", opacity: 0.35, animation: "float", duration: "15s", blur: "6px" },
    ],
  },

  "military-veterans": {
    id: "military-veterans",
    name: "Quân Đội & Tri Ân Liệt Sĩ",
    styleName: "Respectful Memorial",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(127, 29, 29, 0.18) 0%, rgba(69, 10, 10, 0.20) 50%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "military-memorial",
      position: { right: "22%" },
      glowColor: "rgba(217, 119, 6, 0.8)",
      animation: "breathe",
      duration: "16s",
    },
    midground: {
      type: "sunburst",
      color: "rgba(234, 179, 8, 0.16)",
      opacity: 0.24,
    },
    foreground: {
      items: [
        { type: "star", position: { left: "75%" }, animation: "pulse", duration: "12s" },
      ],
    },
    depth: [
      { type: "ember", position: { left: "25%", top: "16px" }, color: "#F59E0B", opacity: 0.6, animation: "rise", duration: "16s" },
      { type: "dust", position: { left: "50%", top: "10px" }, color: "#FDE047", opacity: 0.45, animation: "float", duration: "18s" },
    ],
  },

  "labor-may-day": {
    id: "labor-may-day",
    name: "Quốc Tế Lao Động",
    styleName: "Sunrise Energy",
    ambientGradient:
      "radial-gradient(ellipse 70% 100% at 50% -30%, rgba(153, 27, 27, 0.16) 0%, rgba(120, 53, 15, 0.12) 45%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "labor-sunrise",
      position: { right: "22%" },
      glowColor: "rgba(245, 158, 11, 0.8)",
      animation: "breathe",
      duration: "14s",
    },
    midground: {
      type: "sunburst",
      color: "rgba(245, 158, 11, 0.16)",
      opacity: 0.22,
    },
    foreground: {
      items: [
        { type: "star", position: { left: "75%" }, animation: "pulse", duration: "11s" },
      ],
    },
    depth: [
      { type: "dust", position: { left: "30%", top: "14px" }, color: "#FEF08A", opacity: 0.55, animation: "float", duration: "15s" },
      { type: "dust", position: { left: "60%", top: "8px" }, color: "#FDE047", opacity: 0.5, animation: "float", duration: "18s", delay: "1s" },
    ],
  },

  "children-youth": {
    id: "children-youth",
    name: "Thiếu Nhi & Tuổi Trẻ",
    styleName: "Bright Playful Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(7, 89, 133, 0.16) 0%, rgba(15, 23, 42, 0.5) 50%, rgba(2, 6, 23, 0.9) 85%)",
    hero: {
      type: "youth-kite",
      position: { right: "22%" },
      glowColor: "rgba(56, 189, 248, 0.75)",
      animation: "sway",
      duration: "16s",
    },
    midground: {
      type: "bokeh",
      color: "rgba(56, 189, 248, 0.18)",
      opacity: 0.24,
    },
    foreground: {
      items: [
        { type: "orb", position: { left: "22%" }, animation: "float", duration: "12s" },
        { type: "orb", position: { left: "78%" }, animation: "float", duration: "14s", delay: "1s" },
      ],
    },
    depth: [
      { type: "bokeh", position: { left: "15%", top: "6px" }, color: "rgba(56, 189, 248, 0.4)", opacity: 0.4, animation: "float", duration: "16s", blur: "8px" },
      { type: "bokeh", position: { left: "45%", top: "12px" }, color: "rgba(250, 204, 21, 0.35)", opacity: 0.35, animation: "float", duration: "14s", blur: "6px" },
      { type: "dust", position: { left: "65%", top: "10px" }, color: "#BAE6FD", opacity: 0.5, animation: "float", duration: "12s" },
    ],
  },

  "earth-environment": {
    id: "earth-environment",
    name: "Ngày Trái Đất & Môi Trường",
    styleName: "Nature Cinema",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(6, 78, 59, 0.18) 0%, rgba(2, 44, 34, 0.22) 50%, rgba(2, 6, 23, 0.9) 85%)",
    hero: {
      type: "earth-leaf",
      position: { right: "22%" },
      glowColor: "rgba(52, 211, 153, 0.8)",
      animation: "sway",
      duration: "16s",
    },
    midground: {
      type: "leaves",
      color: "rgba(16, 185, 129, 0.18)",
      opacity: 0.26,
    },
    foreground: {
      items: [
        { type: "orb", position: { left: "25%" }, animation: "float", duration: "14s" },
        { type: "orb", position: { left: "75%" }, animation: "float", duration: "16s", delay: "1.2s" },
      ],
    },
    depth: [
      { type: "dust", position: { left: "18%", top: "14px" }, color: "#6EE7B7", opacity: 0.6, animation: "float", duration: "16s" },
      { type: "dust", position: { left: "55%", top: "8px" }, color: "#34D399", opacity: 0.55, animation: "float", duration: "18s", delay: "1.5s" },
      { type: "mist", position: { left: "0%", top: "20px" }, color: "rgba(6, 95, 70, 0.2)", opacity: 0.3, animation: "drift", duration: "22s" },
    ],
  },

  "traditional-spiritual": {
    id: "traditional-spiritual",
    name: "Lễ Hội Truyền Thống & Tâm Linh",
    styleName: "Zen Cinematic",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(120, 53, 15, 0.16) 0%, rgba(69, 26, 3, 0.20) 50%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "spiritual-lotus",
      position: { right: "22%" },
      glowColor: "rgba(245, 158, 11, 0.8)",
      animation: "breathe",
      duration: "16s",
    },
    midground: {
      type: "lotus",
      color: "rgba(245, 158, 11, 0.18)",
      opacity: 0.26,
    },
    foreground: {
      items: [
        { type: "ember", position: { left: "45%" }, animation: "float", duration: "14s" },
        { type: "ember", position: { left: "80%" }, animation: "float", duration: "16s", delay: "1s" },
      ],
    },
    depth: [
      { type: "mist", position: { left: "0%", top: "16px" }, color: "rgba(180, 83, 9, 0.2)", opacity: 0.35, animation: "drift", duration: "24s" },
      { type: "ember", position: { left: "30%", top: "18px" }, color: "#F59E0B", opacity: 0.6, animation: "rise", duration: "15s" },
      { type: "dust", position: { left: "62%", top: "10px" }, color: "#FDE047", opacity: 0.45, animation: "float", duration: "17s" },
    ],
  },

  "new-year": {
    id: "new-year",
    name: "Tết Dương Lịch",
    styleName: "Midnight Celebration",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(113, 63, 18, 0.16) 0%, rgba(15, 23, 42, 0.5) 50%, rgba(2, 6, 23, 0.9) 85%)",
    hero: {
      type: "new-year-starburst",
      position: { right: "22%" },
      glowColor: "rgba(250, 204, 21, 0.85)",
      animation: "starburst",
      duration: "15s",
    },
    midground: {
      type: "halo",
      color: "rgba(234, 179, 8, 0.18)",
      opacity: 0.24,
    },
    foreground: {
      items: [
        { type: "star", position: { left: "12%" }, animation: "pulse", duration: "11s" },
        { type: "star", position: { left: "75%" }, animation: "pulse", duration: "13s", delay: "1.5s" },
      ],
    },
    depth: [
      { type: "bokeh", position: { left: "25%", top: "8px" }, color: "rgba(234, 179, 8, 0.4)", opacity: 0.4, animation: "float", duration: "16s", blur: "8px" },
      { type: "bokeh", position: { left: "60%", top: "14px" }, color: "rgba(59, 130, 246, 0.35)", opacity: 0.35, animation: "float", duration: "18s", blur: "10px" },
      { type: "dust", position: { left: "42%", top: "10px" }, color: "#FEF08A", opacity: 0.55, animation: "float", duration: "13s" },
    ],
  },

  "nana-birthday": {
    id: "nana-birthday",
    name: "Sinh Nhật Nana",
    styleName: "Premium Celebration",
    ambientGradient:
      "radial-gradient(ellipse 65% 100% at 50% -30%, rgba(131, 24, 67, 0.16) 0%, rgba(120, 53, 15, 0.10) 45%, rgba(5, 5, 5, 0.9) 85%)",
    hero: {
      type: "nana-crown",
      position: { right: "22%" },
      glowColor: "rgba(244, 114, 182, 0.85)",
      animation: "breathe",
      duration: "12s",
    },
    midground: {
      type: "bokeh",
      color: "rgba(244, 114, 182, 0.18)",
      opacity: 0.26,
    },
    foreground: {
      items: [
        { type: "crown", position: { left: "75%" }, animation: "pulse", duration: "12s" },
        { type: "star", position: { left: "18%" }, animation: "float", duration: "13s" },
      ],
    },
    depth: [
      { type: "bokeh", position: { left: "25%", top: "8px" }, color: "rgba(244, 114, 182, 0.4)", opacity: 0.4, animation: "float", duration: "16s", blur: "8px" },
      { type: "dust", position: { left: "45%", top: "12px" }, color: "#FDE047", opacity: 0.55, animation: "float", duration: "12s" },
      { type: "dust", position: { left: "68%", top: "6px" }, color: "#FDA4AF", opacity: 0.5, animation: "float", duration: "14s", delay: "1s" },
    ],
  },
};

/**
 * Maps a VietnamEvent to its corresponding HolidayNavbarTheme.
 * Robust resolution checking:
 * 1. event.effect
 * 2. Solar calendar dates
 * 3. Lunar calendar dates
 * 4. Fallback event ID / nature checks
 * Returns null if the event is a minor or everyday topic without a major celebration atmosphere.
 */
export function getHolidayNavbarTheme(event: VietnamEvent | null | undefined): HolidayNavbarTheme | null {
  if (!event) return null;

  // 1. Direct configured effect on event
  if (event.effect) {
    if (event.effect === "tet") return HOLIDAY_NAVBAR_THEMES["tet"];
    if (event.effect === "mid-autumn") return HOLIDAY_NAVBAR_THEMES["mid-autumn"];
    if (event.effect === "national-day") return HOLIDAY_NAVBAR_THEMES["national-day"];
    if (event.effect === "christmas") return HOLIDAY_NAVBAR_THEMES["christmas"];
    if (event.effect === "halloween") return HOLIDAY_NAVBAR_THEMES["halloween"];
    if (event.effect === "nana-birthday") return HOLIDAY_NAVBAR_THEMES["nana-birthday"];
  }

  // 2. Solar calendar matching
  if (event.solarDate) {
    const { month, day } = event.solarDate;

    // Tết Dương Lịch & Giao Thừa DL
    if ((month === 1 && day === 1) || (month === 12 && day === 31)) {
      return HOLIDAY_NAVBAR_THEMES["new-year"];
    }

    // Valentine
    if (month === 2 && day === 14) {
      return HOLIDAY_NAVBAR_THEMES["valentine"];
    }

    // Quốc tế Phụ nữ & Phụ nữ VN
    if ((month === 3 && day === 8) || (month === 10 && day === 20)) {
      return HOLIDAY_NAVBAR_THEMES["women-family"];
    }

    // Thanh niên Việt Nam
    if (month === 3 && day === 26) {
      return HOLIDAY_NAVBAR_THEMES["children-youth"];
    }

    // Ngày Trái Đất (Earth Day) & Môi trường
    if ((month === 4 && day === 22) || (month === 6 && day === 5)) {
      return HOLIDAY_NAVBAR_THEMES["earth-environment"];
    }

    // 30/4 Giải phóng miền Nam & 2/9 Quốc khánh & 19/8 Cách mạng Tháng Tám & 10/10 Giải phóng Thủ đô & 19/5 Bác Hồ
    if (
      (month === 4 && day === 30) ||
      (month === 9 && day === 2) ||
      (month === 8 && day === 19) ||
      (month === 10 && day === 10) ||
      (month === 5 && day === 19)
    ) {
      return HOLIDAY_NAVBAR_THEMES["national-day"];
    }

    // 1/5 Quốc tế Lao động
    if (month === 5 && day === 1) {
      return HOLIDAY_NAVBAR_THEMES["labor-may-day"];
    }

    // 30/5 Sinh nhật Nana
    if (month === 5 && day === 30) {
      return HOLIDAY_NAVBAR_THEMES["nana-birthday"];
    }

    // 1/6 Quốc tế Thiếu nhi
    if (month === 6 && day === 1) {
      return HOLIDAY_NAVBAR_THEMES["children-youth"];
    }

    // 28/6 Ngày Gia đình Việt Nam
    if (month === 6 && day === 28) {
      return HOLIDAY_NAVBAR_THEMES["women-family"];
    }

    // 27/7 Thương binh Liệt sĩ & 22/12 Quân đội Nhân dân
    if ((month === 7 && day === 27) || (month === 12 && day === 22)) {
      return HOLIDAY_NAVBAR_THEMES["military-veterans"];
    }

    // 31/10 Halloween
    if (month === 10 && day === 31) {
      return HOLIDAY_NAVBAR_THEMES["halloween"];
    }

    // 20/11 Nhà giáo Việt Nam
    if (month === 11 && day === 20) {
      return HOLIDAY_NAVBAR_THEMES["education-teachers"];
    }

    // 24/12 & 25/12 Giáng Sinh
    if (month === 12 && (day === 24 || day === 25)) {
      return HOLIDAY_NAVBAR_THEMES["christmas"];
    }
  }

  // 3. Lunar calendar matching
  if (event.lunarDate) {
    const { lunarMonth, lunarDay, isNewYearEve } = event.lunarDate;

    // Tết Nguyên Đán (Đêm Giao thừa & Mùng 1-3 Tết)
    if (
      isNewYearEve ||
      (lunarMonth === 12 && lunarDay >= 29) ||
      (lunarMonth === 1 && lunarDay <= 3)
    ) {
      return HOLIDAY_NAVBAR_THEMES["tet"];
    }

    // Giỗ Tổ Hùng Vương (10/3 AL)
    if (lunarMonth === 3 && lunarDay === 10) {
      return HOLIDAY_NAVBAR_THEMES["heritage-hung-kings"];
    }

    // Tết Trung Thu (15/8 AL)
    if (lunarMonth === 8 && lunarDay === 15) {
      return HOLIDAY_NAVBAR_THEMES["mid-autumn"];
    }

    // Các lễ hội tâm linh cổ truyền:
    // 23 tháng Chạp (Táo Quân), Rằm tháng Giêng, Hàn Thực 3/3, Phật Đản 15/4, Đoan Ngọ 5/5, Vu Lan 15/7, Trùng Cửu 9/9, Hạ Nguyên 15/10
    if (
      (lunarMonth === 12 && lunarDay === 23) ||
      (lunarMonth === 1 && lunarDay === 15) ||
      (lunarMonth === 3 && lunarDay === 3) ||
      (lunarMonth === 4 && lunarDay === 15) ||
      (lunarMonth === 5 && lunarDay === 5) ||
      (lunarMonth === 7 && lunarDay === 15) ||
      (lunarMonth === 9 && lunarDay === 9) ||
      (lunarMonth === 10 && lunarDay === 15)
    ) {
      return HOLIDAY_NAVBAR_THEMES["traditional-spiritual"];
    }
  }

  // 4. Special dynamic date rules
  if (event.dateRule === "mothers-day" || event.dateRule === "fathers-day") {
    return HOLIDAY_NAVBAR_THEMES["women-family"];
  }

  // Ngày thường không thuộc đại lễ/sự kiện đặc biệt -> không có atmosphere
  return null;
}
