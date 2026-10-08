"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { User, Film, Sparkles } from "lucide-react";

/**
 * Lấy chữ cái viết tắt đại diện cho tên diễn viên (VD: "Phạm Băng Băng" -> "PB", "Trần Thành" -> "TT", "IU" -> "IU")
 */
export function getActorInitials(name?: string | null): string {
  if (!name || !name.trim()) return "★";
  const clean = name.trim().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "★";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const first = words[0].charAt(0).toUpperCase();
  const last = words[words.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}

/**
 * Bảng màu gradient phong cách điện ảnh cao cấp theo hash tên diễn viên
 */
const GRADIENT_THEMES = [
  {
    bg: "from-rose-950/80 via-zinc-900 to-zinc-950",
    badge: "bg-red-500/15 border-red-500/30 text-rose-300",
    glow: "rgba(225, 29, 72, 0.2)",
    accent: "text-rose-400",
    ring: "ring-rose-500/20",
  },
  {
    bg: "from-amber-950/80 via-zinc-900 to-zinc-950",
    badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    glow: "rgba(245, 158, 11, 0.2)",
    accent: "text-amber-400",
    ring: "ring-amber-500/20",
  },
  {
    bg: "from-indigo-950/80 via-zinc-900 to-zinc-950",
    badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
    glow: "rgba(99, 102, 241, 0.2)",
    accent: "text-indigo-400",
    ring: "ring-indigo-500/20",
  },
  {
    bg: "from-emerald-950/80 via-zinc-900 to-zinc-950",
    badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    glow: "rgba(16, 185, 129, 0.2)",
    accent: "text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  {
    bg: "from-cyan-950/80 via-zinc-900 to-zinc-950",
    badge: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
    glow: "rgba(6, 182, 212, 0.2)",
    accent: "text-cyan-400",
    ring: "ring-cyan-500/20",
  },
  {
    bg: "from-fuchsia-950/80 via-zinc-900 to-zinc-950",
    badge: "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300",
    glow: "rgba(217, 70, 239, 0.2)",
    accent: "text-fuchsia-400",
    ring: "ring-fuchsia-500/20",
  },
];

export function getActorGradientTheme(name?: string | null) {
  if (!name || !name.trim()) return GRADIENT_THEMES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_THEMES.length;
  return GRADIENT_THEMES[index];
}

export interface ActorAvatarProps {
  name: string;
  avatarUrl?: string | null;
  alt?: string;
  shape?: "card" | "circle" | "rounded";
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  unoptimized?: boolean;
}

/**
 * Component hiển thị chân dung diễn viên cao cấp với hệ thống Fallback an toàn 100%:
 * - Tự động bắt lỗi nếu URL ảnh bị 404, chết link hoặc chưa có ảnh
 * - Hiển thị fallback thẻ nghệ sĩ/avatar viết tắt sang trọng, giữ nguyên tỷ lệ và layout
 */
export const ActorAvatar: React.FC<ActorAvatarProps> = ({
  name,
  avatarUrl,
  alt,
  shape = "card",
  priority = false,
  className = "",
  imageClassName = "",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw",
  unoptimized = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset lỗi khi URL ảnh thay đổi
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = getActorInitials(name);
  const theme = getActorGradientTheme(name);
  const hasValidUrl = Boolean(avatarUrl && avatarUrl.trim().length > 5 && !avatarUrl.includes("placeholder"));

  // TRƯỜNG HỢP 1: Có ảnh và không bị lỗi tải
  if (hasValidUrl && !imgError) {
    return (
      <Image
        src={avatarUrl!}
        alt={alt || name}
        fill
        priority={priority}
        unoptimized={unoptimized}
        sizes={sizes}
        referrerPolicy="no-referrer"
        className={`object-cover object-top transition-transform duration-500 ${imageClassName}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // TRƯỜNG HỢP 2: FALLBACK THEO SHAPE

  // 2A. HÌNH TRÒN (CIRCLE)
  if (shape === "circle") {
    return (
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br ${theme.bg} flex items-center justify-center p-1 border border-white/10 ${theme.ring} shadow-inner select-none ${className}`}
      >
        <div className={`w-full h-full rounded-full ${theme.badge} border flex items-center justify-center font-black tracking-tight`}>
          <span className="text-xs sm:text-sm">{initials}</span>
        </div>
      </div>
    );
  }

  // 2B. HÌNH BO GÓC VUÔNG (ROUNDED)
  if (shape === "rounded") {
    return (
      <div
        className={`w-full h-full rounded-2xl bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center p-2 border border-white/10 select-none relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),transparent_70%)]" />
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${theme.badge} border flex items-center justify-center font-black text-sm sm:text-base shadow-lg z-10`}>
          {initials}
        </div>
      </div>
    );
  }

  // 2C. HÌNH THẺ CARD (3:4 PORTRAIT)
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b ${theme.bg} text-center relative overflow-hidden select-none group-hover:from-zinc-900 group-hover:to-zinc-950 transition-colors ${className}`}
    >
      {/* AMBIENT RADIAL LIGHT */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-white/[0.04] rounded-full blur-2xl pointer-events-none" />

      {/* BACKGROUND DECORATIVE WATERMARK */}
      <Film className="absolute -bottom-4 -right-4 w-20 h-20 text-white/[0.03] rotate-12 pointer-events-none" />

      {/* INITIALS BADGE WITH LUXURY GLASSMORPHISM */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        <div
          className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl ${theme.badge} border backdrop-blur-md flex items-center justify-center font-black text-base sm:text-xl tracking-wider shadow-xl group-hover:scale-110 transition-transform duration-300`}
        >
          <span>{initials}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <User className="w-3 h-3 text-zinc-500" />
          <span>Nghệ sĩ</span>
        </div>
      </div>
    </div>
  );
};

export default ActorAvatar;
