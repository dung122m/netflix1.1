"use client";

import React from "react";
import { CountryFlag } from "@/components/live/CountryFlag";
import { lookupNationalCountryEmoji } from "@/data/live/countryFlags";
import { cleanCountryName } from "@/lib/stringUtils";
import { cn } from "@/lib/utils";

/**
 * Trích xuất emoji cờ từ chuỗi (nếu có sẵn ký tự cờ quốc gia Unicode)
 */
function extractFlagEmoji(str?: string | null): string | null {
  if (!str) return null;
  for (let i = 0; i < str.length; i++) {
    const cp = str.codePointAt(i);
    if (cp && cp >= 0x1f1e6 && cp <= 0x1f1ff) {
      const nextCp = str.codePointAt(i + 2);
      if (nextCp && nextCp >= 0x1f1e6 && nextCp <= 0x1f1ff) {
        return String.fromCodePoint(cp, nextCp);
      }
    }
  }
  return null;
}

/**
 * Tra cứu emoji cờ quốc gia thông qua hệ thống Đội tuyển Quốc gia (>210 nước) của trang /live
 */
export function resolveCountryFlagEmoji(countryName?: string | null): string | null {
  if (!countryName) return null;

  // 1. Nếu chuỗi ban đầu đã chứa sẵn emoji cờ (e.g. "Việt Nam 🇻🇳")
  const extracted = extractFlagEmoji(countryName);
  if (extracted) return extracted;

  const clean = cleanCountryName(countryName).trim();
  if (!clean) return null;

  const lower = clean.toLowerCase();
  // Xử lý các từ chuyên biệt trong danh mục phim / điện ảnh
  if (lower === "âu mỹ" || lower === "hollywood" || lower === "au my") {
    return "🇺🇸";
  }
  if (lower === "hồng kông" || lower === "hong kong" || lower === "hongkong") {
    return "🇭🇰";
  }

  // 2. Tra cứu qua bảng quốc kỳ nhẹ trong countryFlags.ts (không kéo dữ liệu CLB/Esports)
  const matchedFlag = lookupNationalCountryEmoji(clean);
  if (matchedFlag) {
    return matchedFlag;
  }

  return null;
}

export interface CountryBadgeProps {
  country?: string | null;
  className?: string;
  flagSize?: number | string;
  showFlag?: boolean;
  variant?: "pill" | "inline";
}

/**
 * Badge quốc gia sử dụng chính xác hệ thống cờ quốc gia từ trang /live (CountryFlag + teamAssets)
 * - Tự động nhận diện toàn bộ hơn 210 quốc gia trên thế giới
 * - Sử dụng vector Twemoji từ CountryFlag hiển thị chuẩn xác trên mọi thiết bị (kể cả Windows)
 * - Tự động làm sạch tên quốc gia (loại bỏ emoji hoặc mã ISO thừa như VN, KR, US...)
 * - variant="inline": Hiển thị dạng chữ phẳng kèm icon cờ (không viền nút), căn chỉnh typography tuyệt đối
 * - variant="pill": Hiển thị dạng thẻ pill truyền thống
 */
export function CountryBadge({
  country,
  className,
  flagSize = 14,
  showFlag = true,
  variant = "pill",
}: CountryBadgeProps) {
  if (!country) return null;
  const cleanName = cleanCountryName(country);
  if (!cleanName) return null;

  const flagEmoji = showFlag ? resolveCountryFlagEmoji(country) : null;

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-300 select-none",
          className
        )}
      >
        {flagEmoji && (
          <CountryFlag
            emoji={flagEmoji}
            size={flagSize}
            className="rounded-[2px] shadow-xs shrink-0 object-cover"
          />
        )}
        <span>{cleanName}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.08] text-xs font-medium text-zinc-300 flex-none select-none",
        className
      )}
    >
      {flagEmoji && (
        <CountryFlag
          emoji={flagEmoji}
          size={flagSize}
          className="rounded-[2px] shadow-xs shrink-0 object-cover"
        />
      )}
      <span>{cleanName}</span>
    </span>
  );
}

export default CountryBadge;
