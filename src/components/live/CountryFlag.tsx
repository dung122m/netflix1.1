"use client";

import React, { useState, useMemo } from "react";

export interface CountryFlagProps {
  emoji?: string;
  className?: string;
  size?: number | string;
}

/**
 * Hiển thị cờ quốc gia dạng đồ họa vector chuẩn quốc tế
 * Giải quyết triệt để vấn đề Windows hiển thị ký tự mã ISO (ES, IT, DE, TR...) thay vì cờ
 * Tự động chuyển đổi emoji thành SVG Twemoji chất lượng cao
 */
export function CountryFlag({ emoji, className = "", size }: CountryFlagProps) {
  const [imgError, setImgError] = useState(false);

  const twemojiUrl = useMemo(() => {
    try {
      if (!emoji) return null;
      const cps: string[] = [];
      for (const char of emoji) {
        const cp = char.codePointAt(0);
        if (cp && cp !== 0xfe0f) {
          cps.push(cp.toString(16));
        }
      }
      const isFlag = cps.some((cp) => {
        const num = parseInt(cp, 16);
        return (num >= 0x1f1e6 && num <= 0x1f1ff) || num === 0x1f3f4;
      });
      if (!isFlag) return null;
      return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps.join("-")}.svg`;
    } catch {
      return null;
    }
  }, [emoji]);

  if (twemojiUrl && !imgError) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={twemojiUrl}
        alt={emoji || "flag"}
        className={`object-contain select-none inline-block shrink-0 ${className}`}
        style={size ? { width: size, height: size } : undefined}
        onError={() => setImgError(true)}
        loading="lazy"
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <span className={`select-none leading-none inline-block ${className}`}>
      {emoji}
    </span>
  );
}

export default CountryFlag;
