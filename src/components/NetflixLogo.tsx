"use client";

import React from "react";

/**
 * 🎬 NANAFLIX - YOUTUBE STYLE LOGO (VIETNAM EDITION)
 * 
 * Chuẩn nhận diện YouTube:
 * 1. Lá cờ Việt Nam cố định (Pill icon bo góc chuẩn YouTube, Nền đỏ Quốc kỳ #DA251D, Ngôi sao vàng #FFFF00).
 * 2. Không bị đổi màu theo theme, luôn giữ sắc cờ Đỏ Sao Vàng Việt Nam.
 * 3. Không xê dịch, không nhảy icon khi hover (toàn bộ logo là một thể thống nhất ổn định).
 * 4. Chữ "Nanaflix" Bold Sans-serif trắng tuyết sắc nét và ký hiệu "VN" superscript xám kim loại.
 */

export interface NanaflixBrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: "sm" | "md" | "lg" | "auto";
}

export const NanaflixBrandLogo: React.FC<NanaflixBrandLogoProps> = ({
  className = "",
  size = "auto",
  ...props
}) => {
  const sizeClasses = {
    sm: "h-6 w-auto",
    md: "h-7 sm:h-8 w-auto",
    lg: "h-9 sm:h-10 w-auto",
    auto: "h-7 sm:h-8 w-auto",
  }[size];

  return (
    <div
      className={`group/brand relative inline-flex items-center select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg transition-opacity duration-200 hover:opacity-90 ${className}`}
      role="img"
      aria-label="Nanaflix VN"
      title="Nanaflix VN - Trang Chủ"
      {...props}
    >
      {/* 🎬 SVG Vector YouTube-Style NANAFLIX VN Logo */}
      <svg
        viewBox="0 0 150 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} max-w-full overflow-visible`}
      >
        <defs>
          {/* Màu Đỏ Cờ Việt Nam chuẩn quốc gia */}
          <linearGradient id="vn-flag-red" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EA1D24" />
            <stop offset="100%" stopColor="#DA251D" />
          </linearGradient>

          {/* Màu Vàng Ngôi Sao Việt Nam */}
          <linearGradient id="vn-star-yellow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF200" />
            <stop offset="100%" stopColor="#FFDE00" />
          </linearGradient>
        </defs>

        {/* ============================================================ */}
        {/* 🇻🇳 1. LÁ CỜ VIỆT NAM (Nút bo góc YouTube, Đỏ sao vàng bất biến) */}
        {/* ============================================================ */}
        <g>
          {/* Nút bo tròn YouTube (32x23, rx=6.5) */}
          <rect
            x="1"
            y="4.5"
            width="32"
            height="23"
            rx="6.5"
            fill="url(#vn-flag-red)"
          />

          {/* Ngôi sao vàng 5 cánh Việt Nam đặt chính giữa tâm nút (x=17, y=16) */}
          <polygon
            points="
              17,10.2
              18.4,14.2
              22.6,14.2
              19.2,16.7
              20.5,20.8
              17,18.3
              13.5,20.8
              14.8,16.7
              11.4,14.2
              15.6,14.2
            "
            fill="url(#vn-star-yellow)"
          />
        </g>

        {/* ============================================================ */}
        {/* ✍️ 2. CHỮ: Nanaflix (YouTube Bold Sans Trắng Tuyết) */}
        {/* ============================================================ */}
        <text
          x="39"
          y="22.5"
          fill="#FFFFFF"
          fontFamily="'YouTube Sans', 'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
          fontWeight="800"
          fontSize="20.5"
          letterSpacing="-0.6px"
          style={{ textRendering: "geometricPrecision" }}
        >
          Nanaflix
        </text>

        {/* ============================================================ */}
        {/* 🇻🇳 3. KÝ HIỆU: VN (YouTube Regional Badge - Xám kim loại) */}
        {/* ============================================================ */}
        <text
          x="128"
          y="11.5"
          fill="#94A3B8"
          fontFamily="'YouTube Sans', 'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="0.2px"
          style={{ textRendering: "geometricPrecision" }}
        >
          VN
        </text>
      </svg>
    </div>
  );
};

/**
 * 🎬 Standalone Compact Icon (Lá cờ Việt Nam)
 */
export const NetflixLogo: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "w-6 h-6",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`vn-icon-svg transition-transform duration-200 drop-shadow-[0_2px_8px_rgba(229,9,20,0.4)] ${className}`}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="compact-vn-red" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EA1D24" />
          <stop offset="100%" stopColor="#DA251D" />
        </linearGradient>
        <linearGradient id="compact-vn-star" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF566" />
          <stop offset="50%" stopColor="#FFDD00" />
          <stop offset="100%" stopColor="#E5A900" />
        </linearGradient>
      </defs>

      {/* Nút bo góc tròn */}
      <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#compact-vn-red)" />

      {/* Ngôi sao vàng 5 cánh Việt Nam */}
      <polygon
        points="
          256, 106
          290.1, 211
          401, 211
          311.2, 276.3
          345.5, 381.8
          256, 316.7
          166.5, 381.8
          200.8, 276.3
          111, 211
          221.9, 211
        "
        fill="url(#compact-vn-star)"
      />
    </svg>
  );
};

export default NanaflixBrandLogo;
