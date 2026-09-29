"use client";

import React, { memo } from "react";
import {
  HeartPulse,
  Heart,
  Activity,
  Stethoscope,
  Plus,
  ShieldCheck,
  Pill,
  Ribbon,
  Sparkles,
  Flag,
  Star,
  Landmark,
  Building2,
  Map,
  History,
  Scroll,
  Award,
  Shield,
  Crown,
  Globe,
  Languages,
  Users,
  Plane,
  Share2,
  Compass,
  MapPin,
  MessageSquare,
  Palette,
  Music,
  Flower2,
  PartyPopper,
  Utensils,
  Moon,
  Gift,
  Smile,
  Sun,
  Flame,
  Leaf,
  TreePine,
  Trees,
  Droplets,
  CloudSun,
  GraduationCap,
  BookOpen,
  Pencil,
  Bookmark,
  Lightbulb,
  Trophy,
  Medal,
  Dumbbell,
  Bike,
  Monitor,
  Cpu,
  Wifi,
  Smartphone,
  Code2,
  Radio,
  Home,
  HandHeart,
  Film,
  Camera,
  Clapperboard,
  Tv,
  Snowflake,
  Bell,
  Ghost,
  Skull,
  Eye,
  CalendarDays,
  Mountain,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import type { VietnamPatternThemeKey } from "@/lib/vietnamEventBackgrounds";

/**
 * Thematic Illustration Composition Definition
 */
interface ThematicComposition {
  primary: LucideIcon;
  secondary: [LucideIcon, LucideIcon, LucideIcon, LucideIcon];
  detail: [LucideIcon, LucideIcon, LucideIcon, LucideIcon, LucideIcon];
  primaryRotateClass?: string;
}

const THEME_COMPOSITIONS: Record<VietnamPatternThemeKey, ThematicComposition> = {
  // 1. ❤️ Y tế / Tim mạch / Sức khỏe (29/9 World Heart Day)
  "medical-health": {
    primary: HeartPulse,
    secondary: [Heart, Activity, Stethoscope, Plus],
    detail: [ShieldCheck, Pill, Ribbon, Sparkles, Heart],
    primaryRotateClass: "rotate-[6deg]",
  },

  // 2. 🇻🇳 Quốc khánh & Đại lễ Việt Nam (2/9, 30/4, 19/8...)
  "vietnam-national": {
    primary: Flag,
    secondary: [Star, Landmark, Building2, Crown],
    detail: [Award, Shield, Compass, Sparkles, Star],
    primaryRotateClass: "rotate-[4deg]",
  },

  // 3. 📜 Mốc son lịch sử Việt Nam
  "vietnam-history": {
    primary: Landmark,
    secondary: [History, Scroll, Building2, Star],
    detail: [Map, Flag, Award, Compass, BookOpen],
    primaryRotateClass: "rotate-[0deg]",
  },

  // 4. 🌍 Quốc tế & Toàn cầu (30/9 Dịch thuật, 1/5 Lao động, 8/3...)
  international: {
    primary: Globe,
    secondary: [Languages, Users, Plane, Compass],
    detail: [Share2, MessageSquare, MapPin, Sparkles, Globe],
    primaryRotateClass: "rotate-[8deg]",
  },

  // 5. 🎎 Văn hóa truyền thống & Lễ hội (Tết, Trung Thu, Giỗ Tổ...)
  "culture-festival": {
    primary: PartyPopper,
    secondary: [Flower2, Music, Utensils, Moon],
    detail: [Gift, Sun, Flame, Sparkles, Smile],
    primaryRotateClass: "rotate-[12deg]",
  },

  // 6. 🎓 Giáo dục & Tôn sư trọng đạo (20/11, 5/9...)
  "education-teachers": {
    primary: GraduationCap,
    secondary: [BookOpen, Pencil, Bookmark, Award],
    detail: [Lightbulb, Sparkles, Compass, BookOpen, GraduationCap],
    primaryRotateClass: "-rotate-[6deg]",
  },

  // 7. 🌱 Môi trường & Thiên nhiên
  "environment-nature": {
    primary: Leaf,
    secondary: [TreePine, Trees, Droplets, Sun],
    detail: [CloudSun, Flower2, Globe, Sparkles, Leaf],
    primaryRotateClass: "rotate-[14deg]",
  },

  // 8. ⚽ Thể thao & Olympic
  sports: {
    primary: Trophy,
    secondary: [Medal, Activity, Flame, Bike],
    detail: [Dumbbell, Star, Award, Sparkles, Trophy],
    primaryRotateClass: "rotate-[4deg]",
  },

  // 9. 💻 Công nghệ & Số hóa
  technology: {
    primary: Cpu,
    secondary: [Monitor, Wifi, Smartphone, Code2],
    detail: [Radio, Share2, Sparkles, Cpu, Wifi],
    primaryRotateClass: "rotate-[0deg]",
  },

  // 10. 🏠 Gia đình & Xã hội
  "family-social": {
    primary: Users,
    secondary: [Home, Heart, Smile, HandHeart],
    detail: [Sun, Gift, Sparkles, Heart, Users],
    primaryRotateClass: "rotate-[0deg]",
  },

  // 11. 🎨 Nghệ thuật, Điện ảnh & Giải trí
  "arts-entertainment": {
    primary: Palette,
    secondary: [Music, Film, Camera, Clapperboard],
    detail: [Tv, Radio, PartyPopper, Sparkles, Music],
    primaryRotateClass: "rotate-[8deg]",
  },

  // 12. 🎄 Giáng sinh (24-25/12)
  christmas: {
    primary: TreePine,
    secondary: [Gift, Snowflake, Bell, Star],
    detail: [Sparkles, Snowflake, Gift, Star, Bell],
    primaryRotateClass: "rotate-[0deg]",
  },

  // 13. 🎃 Halloween (31/10)
  halloween: {
    primary: Ghost,
    secondary: [Skull, Moon, Flame, Eye],
    detail: [Sparkles, Flame, Skull, Eye, Ghost],
    primaryRotateClass: "rotate-[8deg]",
  },

  // 14. ☀️ Fallback ngày thường
  fallback: {
    primary: CalendarDays,
    secondary: [Sun, Mountain, Map, Sunrise],
    detail: [Compass, Sparkles, Flame, Star, Sun],
    primaryRotateClass: "-rotate-[4deg]",
  },
};

interface VietnamEventPatternLayerProps {
  themeKey: VietnamPatternThemeKey;
}

export const VietnamEventPatternLayer = memo(function VietnamEventPatternLayer({
  themeKey,
}: VietnamEventPatternLayerProps) {
  const comp = THEME_COMPOSITIONS[themeKey] || THEME_COMPOSITIONS.fallback;
  const { primary: PrimaryIcon, secondary, detail, primaryRotateClass = "rotate-[4deg]" } = comp;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[2] overflow-hidden pointer-events-none select-none"
    >
      {/* COMPOSITION HERO: PRIMARY ICON + SOFT GLOW BACKDROP */}
      <div
        style={{ top: "26%", right: "9%" }}
        className={`absolute flex items-center justify-center transform transition-transform duration-700 ${primaryRotateClass} opacity-[0.09] text-white`}
      >
        <PrimaryIcon
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 drop-shadow-md"
          strokeWidth={1.2}
        />
      </div>

      {/* SECONDARY SATELLITE 1: Upper-Left of Primary */}
      {(() => {
        const Sec1 = secondary[0];
        return (
          <div
            style={{ top: "10%", right: "25%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[14deg] opacity-[0.08] text-white"
          >
            <Sec1 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 drop-shadow-sm" strokeWidth={1.4} />
          </div>
        );
      })()}

      {/* SECONDARY SATELLITE 2: Lower-Left of Primary */}
      {(() => {
        const Sec2 = secondary[1];
        return (
          <div
            style={{ bottom: "12%", right: "23%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 rotate-[12deg] opacity-[0.08] text-white"
          >
            <Sec2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 drop-shadow-sm" strokeWidth={1.4} />
          </div>
        );
      })()}

      {/* SECONDARY SATELLITE 3: Upper-Right of Primary */}
      {(() => {
        const Sec3 = secondary[2];
        return (
          <div
            style={{ top: "6%", right: "4%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 rotate-[10deg] opacity-[0.075] text-white"
          >
            <Sec3 className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 drop-shadow-sm" strokeWidth={1.4} />
          </div>
        );
      })()}

      {/* SECONDARY SATELLITE 4: Lower-Right of Primary */}
      {(() => {
        const Sec4 = secondary[3];
        return (
          <div
            style={{ bottom: "8%", right: "3%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[10deg] opacity-[0.075] text-white"
          >
            <Sec4 className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 drop-shadow-sm" strokeWidth={1.4} />
          </div>
        );
      })()}

      {/* DETAIL 1: Top Orbit Accent */}
      {(() => {
        const Det1 = detail[0];
        return (
          <div
            style={{ top: "4%", right: "16%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 rotate-[18deg] opacity-[0.06] text-white"
          >
            <Det1 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* DETAIL 2: Outer-Left Orbit Accent */}
      {(() => {
        const Det2 = detail[1];
        return (
          <div
            style={{ top: "44%", right: "33%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[16deg] opacity-[0.055] text-white"
          >
            <Det2 className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* DETAIL 3: Bottom Orbit Accent */}
      {(() => {
        const Det3 = detail[2];
        return (
          <div
            style={{ bottom: "4%", right: "15%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 rotate-[22deg] opacity-[0.055] text-white"
          >
            <Det3 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* DETAIL 4: Ambient Atmosphere - Upper Left */}
      {(() => {
        const Det4 = detail[3];
        return (
          <div
            style={{ top: "14%", left: "42%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 rotate-[10deg] opacity-[0.035] text-white"
          >
            <Det4 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* DETAIL 5: Ambient Atmosphere - Lower Left */}
      {(() => {
        const Det5 = detail[4];
        return (
          <div
            style={{ bottom: "16%", left: "30%" }}
            className="absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[12deg] opacity-[0.03] text-white"
          >
            <Det5 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}
    </div>
  );
});
