"use client";

import React, { useState } from "react";

export function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 2, total - 1, total];
  }
  return [1, "...", current, "...", total];
}

export function getCategoryEmoji(category: string): string {
  if (category.includes("VTV") && !category.includes("VTVcab")) return "🇻🇳";
  if (category.includes("HTV")) return "🏙️";
  if (category.includes("SCTV")) return "⭐";
  if (category.includes("VTVcab")) return "📺";
  if (category.includes("Vĩnh Long") || category.includes("THVL")) return "🌾";
  if (
    category.includes("Tin Tức") ||
    category.includes("Thời Sự") ||
    category.includes("VTC")
  )
    return "📰";
  if (category.includes("Phim") || category.includes("Cinema")) return "🎬";
  if (category.includes("Địa Phương")) return "📍";
  if (category.includes("Quốc Tế")) return "🌍";
  if (category.includes("Thiếu Nhi")) return "🎈";
  if (category.includes("Âm Nhạc")) return "🎵";
  if (category.includes("Bóng Đá") || category.includes("Thể Thao")) return "⚽";
  return "📺";
}

export interface TvChannelLogoProps {
  logo: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function TvChannelLogo({
  logo,
  name,
}: TvChannelLogoProps) {
  const [error, setError] = useState(false);

  // Nếu có logo URL và chưa bị lỗi → hiển thị ảnh trực tiếp từ nguồn
  if (logo && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={name}
        className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
      />
    );
  }

  // Fallback: Badge chữ đơn giản khi không có logo hoặc ảnh lỗi
  const words = name
    .toUpperCase()
    .split(/[\s\-_]+/)
    .filter(Boolean);
  const code = words.slice(0, 2).join(" ").slice(0, 7);
  const sub = words.length > 2 ? words[2].slice(0, 4) : "";

  return (
    <div className="w-full h-full rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center text-white select-none overflow-hidden gap-0.5 p-1">
      <span className="text-[11px] sm:text-xs font-black tracking-tight text-white leading-none font-sans tabular-nums line-clamp-1 text-center w-full px-0.5">
        {code}
      </span>
      {sub && (
        <span className="text-[8px] font-bold text-white/70 leading-none truncate">
          {sub}
        </span>
      )}
    </div>
  );
}

