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
import {
  getVietnamEventThemeConfig,
  type VietnamPatternThemeKey,
} from "@/lib/vietnamEventBackgrounds";

interface ThemeComposition {
  primary: LucideIcon;
  secondary: [LucideIcon, LucideIcon, LucideIcon, LucideIcon];
  detail: [LucideIcon, LucideIcon, LucideIcon, LucideIcon, LucideIcon];
  primaryRotateClass?: string;
}

const THEME_COMPOSITIONS: Record<VietnamPatternThemeKey, ThemeComposition> = {
  "medical-health": {
    primary: HeartPulse,
    secondary: [Heart, Activity, Stethoscope, Plus],
    detail: [ShieldCheck, Pill, Ribbon, Sparkles, Droplets],
    primaryRotateClass: "rotate-[6deg]",
  },
  "vietnam-national": {
    primary: Flag,
    secondary: [Star, Landmark, Building2, Shield],
    detail: [Award, Sparkles, Crown, Map, Heart],
    primaryRotateClass: "-rotate-[6deg]",
  },
  "vietnam-history": {
    primary: Landmark,
    secondary: [History, Scroll, Building2, Map],
    detail: [Flag, Award, Star, Shield, Sparkles],
    primaryRotateClass: "rotate-[4deg]",
  },
  international: {
    primary: Globe,
    secondary: [Languages, Users, Plane, Compass],
    detail: [Sparkles, Share2, MapPin, MessageSquare, Sun],
    primaryRotateClass: "rotate-[8deg]",
  },
  "culture-festival": {
    primary: PartyPopper,
    secondary: [Music, Utensils, Moon, Gift],
    detail: [Sparkles, Sun, Smile, Flame, Star],
    primaryRotateClass: "-rotate-[8deg]",
  },
  "education-teachers": {
    primary: GraduationCap,
    secondary: [BookOpen, Lightbulb, Pencil, Trophy],
    detail: [Bookmark, Award, Star, Sparkles, Medal],
    primaryRotateClass: "rotate-[5deg]",
  },
  "environment-nature": {
    primary: Leaf,
    secondary: [TreePine, Droplets, Trees, CloudSun],
    detail: [Sparkles, Sun, Mountain, Sunrise, Flower2],
    primaryRotateClass: "rotate-[10deg]",
  },
  sports: {
    primary: Trophy,
    secondary: [Medal, Activity, Dumbbell, Bike],
    detail: [Sparkles, Star, Flame, Award, Shield],
    primaryRotateClass: "-rotate-[5deg]",
  },
  technology: {
    primary: Cpu,
    secondary: [Monitor, Code2, Wifi, Smartphone],
    detail: [Sparkles, Radio, Lightbulb, Star, Shield],
    primaryRotateClass: "rotate-[4deg]",
  },
  "family-social": {
    primary: HandHeart,
    secondary: [Home, Users, Heart, Smile],
    detail: [Sparkles, Gift, Sun, Flower2, Star],
    primaryRotateClass: "rotate-[6deg]",
  },
  "arts-entertainment": {
    primary: Clapperboard,
    secondary: [Film, Music, Camera, Palette],
    detail: [Tv, Sparkles, Star, Award, Heart],
    primaryRotateClass: "-rotate-[8deg]",
  },
  christmas: {
    primary: TreePine,
    secondary: [Gift, Snowflake, Bell, Star],
    detail: [Sparkles, Moon, Heart, Flame, Ribbon],
    primaryRotateClass: "rotate-[4deg]",
  },
  halloween: {
    primary: Ghost,
    secondary: [Skull, Moon, Flame, Eye],
    detail: [Sparkles, Star, Shield, Bell, Heart],
    primaryRotateClass: "-rotate-[10deg]",
  },
  fallback: {
    primary: CalendarDays,
    secondary: [Sparkles, Star, Sun, Bookmark],
    detail: [Heart, Ribbon, Award, Shield, Compass],
    primaryRotateClass: "rotate-[4deg]",
  },
};

interface VietnamEventPatternLayerProps {
  themeKey: VietnamPatternThemeKey;
}

export const VietnamEventPatternLayer = memo(function VietnamEventPatternLayer({
  themeKey,
}: VietnamEventPatternLayerProps) {
  const comp = THEME_COMPOSITIONS[themeKey] || THEME_COMPOSITIONS.fallback;
  const themeConfig = getVietnamEventThemeConfig(themeKey);
  const { primary: PrimaryIcon, secondary, detail, primaryRotateClass = "rotate-[4deg]" } = comp;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[2] overflow-hidden pointer-events-none select-none"
    >
      {/* 1. THEMATIC AMBIENT SPOTLIGHT GLOW (Nửa phải card, 12-20% opacity) */}
      <div
        style={{
          background: `radial-gradient(circle at 82% 35%, ${themeConfig.spotlightRgba} 0%, transparent 58%)`,
        }}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* 2. COMPOSITION HERO: PRIMARY ICON (96-140px, Duotone Fill + Stroke, opacity 0.14) */}
      <div
        style={{ top: "20%", right: "7%" }}
        className={`absolute flex items-center justify-center transform transition-transform duration-700 ${primaryRotateClass} opacity-[0.14] ${themeConfig.primaryColorClass} z-[1]`}
      >
        <PrimaryIcon
          className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 drop-shadow-lg"
          fill="currentColor"
          fillOpacity={0.10}
          strokeWidth={1.5}
        />
      </div>

      {/* 3. SECONDARY SATELLITE 1: Upper-Left of Primary (32-52px, opacity 0.09) */}
      {(() => {
        const Sec1 = secondary[0];
        return (
          <div
            style={{ top: "10%", right: "26%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[14deg] opacity-[0.09] ${themeConfig.secondaryColorClass} z-[1]`}
          >
            <Sec1 className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 drop-shadow-sm" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 4. SECONDARY SATELLITE 2: Lower-Left of Primary (32-52px, opacity 0.09) */}
      {(() => {
        const Sec2 = secondary[1];
        return (
          <div
            style={{ bottom: "12%", right: "23%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 rotate-[12deg] opacity-[0.09] ${themeConfig.secondaryColorClass} z-[1]`}
          >
            <Sec2 className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 drop-shadow-sm" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 5. SECONDARY SATELLITE 3: Upper-Right of Primary (32-52px, opacity 0.085) */}
      {(() => {
        const Sec3 = secondary[2];
        return (
          <div
            style={{ top: "6%", right: "4%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 rotate-[10deg] opacity-[0.085] ${themeConfig.secondaryColorClass} z-[1]`}
          >
            <Sec3 className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 drop-shadow-sm" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 6. SECONDARY SATELLITE 4: Lower-Right of Primary (32-52px, opacity 0.085) */}
      {(() => {
        const Sec4 = secondary[3];
        return (
          <div
            style={{ bottom: "8%", right: "3%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[10deg] opacity-[0.085] ${themeConfig.secondaryColorClass} z-[1]`}
          >
            <Sec4 className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 drop-shadow-sm" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 7. DETAIL 1: Top Orbit Accent (14-24px, opacity 0.065) */}
      {(() => {
        const Det1 = detail[0];
        return (
          <div
            style={{ top: "4%", right: "16%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 rotate-[18deg] opacity-[0.065] ${themeConfig.detailColorClass} z-[1]`}
          >
            <Det1 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 8. DETAIL 2: Outer-Left Orbit Accent (14-24px, opacity 0.06) */}
      {(() => {
        const Det2 = detail[1];
        return (
          <div
            style={{ top: "45%", right: "34%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[16deg] opacity-[0.06] ${themeConfig.detailColorClass} z-[1]`}
          >
            <Det2 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 9. DETAIL 3: Bottom Orbit Accent (14-24px, opacity 0.06) */}
      {(() => {
        const Det3 = detail[2];
        return (
          <div
            style={{ bottom: "4%", right: "15%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 rotate-[22deg] opacity-[0.06] ${themeConfig.detailColorClass} z-[1]`}
          >
            <Det3 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 10. DETAIL 4: Ambient Atmosphere - Upper Left (14-24px, opacity 0.04) */}
      {(() => {
        const Det4 = detail[3];
        return (
          <div
            style={{ top: "14%", left: "42%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 rotate-[10deg] opacity-[0.04] ${themeConfig.detailColorClass} z-[1]`}
          >
            <Det4 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}

      {/* 11. DETAIL 5: Ambient Atmosphere - Lower Left (14-24px, opacity 0.035) */}
      {(() => {
        const Det5 = detail[4];
        return (
          <div
            style={{ bottom: "16%", left: "30%" }}
            className={`absolute flex items-center justify-center transform transition-transform duration-700 -rotate-[12deg] opacity-[0.035] ${themeConfig.detailColorClass} z-[1]`}
          >
            <Det5 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </div>
        );
      })()}
    </div>
  );
});
