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

let cachedGeoBadge: string | null = null;
let inFlightGeoBadgePromise: Promise<string> | null = null;

/**
 * Hook tự động phát hiện mã vùng / tỉnh thành / quốc gia cho Logo Nanaflix
 * 1. Đọc tức thì 0ms từ sessionStorage
 * 2. Fallback gọi /api/geo/badge (đúng 1 request cho cả phiên duyệt web)
 */
export function useGeoBadge(): string {
  // Luôn khởi tạo "VN" một cách deterministic cho cả SSR và lần render đầu tiên của client (tránh hydration mismatch)
  const [badge, setBadge] = React.useState<string>("VN");

  React.useEffect(() => {
    // 1. Kiểm tra cache trong RAM sau khi component đã mount / hydrate xong
    if (cachedGeoBadge) {
      if (badge !== cachedGeoBadge) {
        setBadge(cachedGeoBadge);
      }
      return;
    }

    // 2. Đọc từ sessionStorage (chỉ thực thi an toàn sau hydration)
    try {
      const stored = sessionStorage.getItem("nanaflix_geo_badge");
      if (stored) {
        cachedGeoBadge = stored;
        setBadge(stored);
        return;
      }
    } catch {}

    // 3. Nếu chưa có trong cache, gọi /api/geo/badge (đúng 1 request duy nhất)
    if (!inFlightGeoBadgePromise) {
      inFlightGeoBadgePromise = fetch("/api/geo/badge", {
        signal: AbortSignal.timeout(3000),
      })
        .then((res) => (res.ok ? res.json() : { badge: "VN" }))
        .then((data) => {
          const resBadge =
            typeof data.badge === "string" && data.badge ? data.badge.trim().toUpperCase() : "VN";
          cachedGeoBadge = resBadge;
          try {
            sessionStorage.setItem("nanaflix_geo_badge", resBadge);
          } catch {}
          return resBadge;
        })
        .catch(() => "VN");
    }

    inFlightGeoBadgePromise.then((b) => {
      setBadge(b);
    });
  }, [badge]);

  return badge;
}

export interface NanaflixBrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: "sm" | "md" | "lg" | "auto";
  badgeOverride?: string;
}

export const NanaflixBrandLogo: React.FC<NanaflixBrandLogoProps> = ({
  className = "",
  size = "auto",
  badgeOverride,
  ...props
}) => {
  const dynamicBadge = useGeoBadge();
  const displayBadge = badgeOverride || dynamicBadge || "VN";
  const isThreeLetters = displayBadge.length >= 3;

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
      aria-label={`Nanaflix ${displayBadge}`}
      title={`Nanaflix ${displayBadge} - Trang Chủ`}
      {...props}
    >
      {/* 🎬 SVG Vector YouTube-Style NANAFLIX VN Logo */}
      <svg
        viewBox="0 0 152 32"
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
        {/* 🇻🇳 3. KÝ HIỆU VỊ TRÍ: VN, HCM, HN, BD, HT... hoặc Quốc tế (Xám kim loại, khoảng cách chuẩn YouTube) */}
        {/* ============================================================ */}
        <text
          x="122.5"
          y="11.5"
          fill="#94A3B8"
          fontFamily="'YouTube Sans', 'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
          fontWeight="600"
          fontSize={isThreeLetters ? "7.5" : "8.5"}
          letterSpacing="0.2px"
          style={{ textRendering: "geometricPrecision" }}
        >
          {displayBadge}
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

/**
 * 🇻🇳 Lá cờ Việt Nam chuẩn Quốc kỳ (Tỷ lệ hình chữ nhật 3:2)
 */
export const VietnamFlag: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "w-18 h-12",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 90 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-hidden ${className}`}
      aria-label="Cờ Việt Nam"
      {...props}
    >
      <defs>
        <linearGradient id="vn-rect-flag-red" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EA1D24" />
          <stop offset="100%" stopColor="#DA251D" />
        </linearGradient>
        <linearGradient id="vn-rect-flag-star" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF200" />
          <stop offset="100%" stopColor="#FFDE00" />
        </linearGradient>
      </defs>

      {/* Nền cờ đỏ chữ nhật tỷ lệ 3:2 */}
      <rect width="90" height="60" rx="4" fill="url(#vn-rect-flag-red)" />

      {/* Ngôi sao vàng 5 cánh tỷ lệ chuẩn */}
      <polygon
        points="
          45,10
          49.49,23.82
          64.02,23.82
          52.26,32.36
          56.76,46.18
          45,37.64
          33.24,46.18
          37.74,32.36
          25.98,23.82
          40.51,23.82
        "
        fill="url(#vn-rect-flag-star)"
      />
    </svg>
  );
};

export default NanaflixBrandLogo;
