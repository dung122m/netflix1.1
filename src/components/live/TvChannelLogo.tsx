"use client";

import React, { useState } from "react";

export function getPageNumbers(current: number, total: number): (number | string)[] {
  const safeTotal = Number.isFinite(total) && total >= 1 ? Math.floor(total) : 1;
  const safeCurrent =
    Number.isFinite(current) && current >= 1
      ? Math.min(Math.floor(current), safeTotal)
      : 1;

  if (safeTotal <= 5) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }
  if (safeCurrent <= 3) {
    return [1, 2, 3, "...", safeTotal];
  }
  if (safeCurrent >= safeTotal - 2) {
    return [1, "...", safeTotal - 2, safeTotal - 1, safeTotal];
  }
  return [1, "...", safeCurrent, "...", safeTotal];
}

export function getCategoryEmoji(_category: string): string {
  return "";
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

