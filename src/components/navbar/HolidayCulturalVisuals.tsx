"use client";

import React from "react";

interface VisualProps {
  className?: string;
  style?: React.CSSProperties;
}

/* ==========================================================================
   1. MID-AUTUMN (TẾT TRUNG THU) CULTURAL VISUALS
   ========================================================================== */

/**
 * 🦁 Đầu lân múa lân truyền thống Việt Nam
 * Sừng vàng kim, mắt to sinh động, râu bờm uốn lượn hùng dũng vui tươi
 */
export function LionDanceHead({ className = "w-7 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Đầu lân Trung Thu"
    >
      <defs>
        <linearGradient id="lionHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#B91C1C" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
        <linearGradient id="lionHornGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Sừng lân trung tâm */}
      <path
        d="M32 4 L28 18 L36 18 Z"
        fill="url(#lionHornGrad)"
        stroke="#F59E0B"
        strokeWidth="1"
      />
      <circle cx="32" cy="7" r="2.5" fill="#FDE047" />

      {/* Bờm trán uốn lượn */}
      <path
        d="M16 22 C18 14 26 14 32 16 C38 14 46 14 48 22 C52 26 50 32 46 34 C44 28 38 26 32 27 C26 26 20 28 18 34 C14 32 12 26 16 22 Z"
        fill="url(#lionHeadGrad)"
        stroke="#F59E0B"
        strokeWidth="1.2"
      />

      {/* Cặp mắt lân to sáng */}
      <ellipse cx="23" cy="24" rx="5" ry="4" fill="#FEF08A" stroke="#B45309" strokeWidth="1" />
      <circle cx="24" cy="24" r="2.5" fill="#1C1917" />
      <circle cx="25" cy="23" r="0.8" fill="#FFFFFF" />

      <ellipse cx="41" cy="24" rx="5" ry="4" fill="#FEF08A" stroke="#B45309" strokeWidth="1" />
      <circle cx="40" cy="24" r="2.5" fill="#1C1917" />
      <circle cx="41" cy="23" r="0.8" fill="#FFFFFF" />

      {/* Lông mày lân rực rỡ */}
      <path d="M16 19 Q23 15 28 20" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 19 Q41 15 36 20" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />

      {/* Mũi lân và hàm */}
      <ellipse cx="32" cy="33" rx="6" ry="3.5" fill="#F59E0B" />
      <circle cx="29.5" cy="33" r="1.2" fill="#78350F" />
      <circle cx="34.5" cy="33" r="1.2" fill="#78350F" />

      {/* Miệng lân cười và răng nanh */}
      <path
        d="M20 38 Q32 48 44 38 Q32 42 20 38 Z"
        fill="#991B1B"
        stroke="#FDE047"
        strokeWidth="1"
      />
      <polygon points="25,38 27,42 29,38" fill="#FFFFFF" />
      <polygon points="35,38 37,42 39,38" fill="#FFFFFF" />

      {/* Râu bờm cằm */}
      <path
        d="M22 43 C26 52 32 54 32 54 C32 54 38 52 42 43 C46 50 48 57 44 60 C38 57 32 58 32 58 C32 58 26 57 20 60 C16 57 18 50 22 43 Z"
        fill="#EA580C"
        stroke="#F59E0B"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/**
 * ⭐ Đèn ông sao 5 cánh cổ truyền Việt Nam
 * Khung tre tròn, cánh sao giấy bóng kính đỏ vàng, tua rua giấy màu
 */
export function StarLantern({ className = "w-7 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 60 68"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Đèn ông sao Trung Thu"
    >
      <defs>
        <radialGradient id="starLanternGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#EF4444" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* Dây treo đèn trên */}
      <line x1="30" y1="0" x2="30" y2="8" stroke="#CA8A04" strokeWidth="1" />

      {/* Vòng tre tròn bao quanh 5 cánh sao */}
      <circle cx="30" cy="30" r="22" stroke="#EAB308" strokeWidth="1.6" fill="none" opacity="0.85" />
      <circle cx="30" cy="30" r="20" stroke="#CA8A04" strokeWidth="0.8" strokeDasharray="2 2" fill="none" opacity="0.6" />

      {/* Ngôi sao 5 cánh lộng lẫy */}
      <polygon
        points="30,10 34.5,23.5 49,23.5 37.5,32 42,45.5 30,37 18,45.5 22.5,32 11,23.5 25.5,23.5"
        fill="url(#starLanternGlow)"
        stroke="#FDE047"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Tâm đèn thắp nến */}
      <circle cx="30" cy="30" r="4.5" fill="#FEF08A" />
      <circle cx="30" cy="30" r="2" fill="#FFFFFF" />

      {/* Cán cầm tre & tua rua ngũ sắc phía dưới */}
      <line x1="30" y1="52" x2="30" y2="66" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 50 Q22 58 20 65" stroke="#EC4899" strokeWidth="1" strokeLinecap="round" />
      <path d="M35 50 Q38 58 40 65" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" />
      <path d="M28 52 Q26 60 25 67" stroke="#10B981" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M32 52 Q34 60 35 67" stroke="#F59E0B" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🥮 Bánh Trung Thu truyền thống nướng vàng ươm
 * Hoa văn dập nổi cánh sen tinh tế, sắc thái vỏ bánh nướng thơm lừng
 */
export function Mooncake({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bánh Trung Thu"
    >
      <defs>
        <radialGradient id="cakeCrustGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="45%" stopColor="#D97706" />
          <stop offset="85%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#78350F" />
        </radialGradient>
      </defs>

      {/* Khối bánh tròn với viền múi hoa cúc / cánh sen */}
      <circle cx="24" cy="24" r="21" fill="url(#cakeCrustGrad)" stroke="#B45309" strokeWidth="1.2" />

      {/* 8 cánh hoa văn dập nổi quanh mép */}
      <path
        d="M24 6 C27 9 27 13 24 15 C21 13 21 9 24 6 Z M42 24 C39 27 35 27 33 24 C35 21 39 21 42 24 Z M24 42 C21 39 21 35 24 33 C27 35 27 39 24 42 Z M6 24 C9 21 13 21 15 24 C13 27 9 27 6 24 Z"
        fill="#B45309"
        opacity="0.75"
      />
      <path
        d="M37 11 C37 15 34 17 31 17 C31 14 34 11 37 11 Z M37 37 C34 37 31 34 31 31 C34 31 37 34 37 37 Z M11 37 C11 34 14 31 17 31 C17 34 14 37 11 37 Z M11 11 C14 11 17 14 17 17 C14 17 11 14 11 11 Z"
        fill="#92400E"
        opacity="0.7"
      />

      {/* Khung vuông tâm bánh */}
      <rect
        x="16"
        y="16"
        width="16"
        height="16"
        rx="2.5"
        stroke="#78350F"
        strokeWidth="1"
        fill="rgba(245, 158, 11, 0.25)"
      />

      {/* Hoa văn tâm bánh chữ 'Thọ' / hoa sen cách điệu */}
      <circle cx="24" cy="24" r="4.5" fill="#78350F" opacity="0.8" />
      <circle cx="24" cy="24" r="2.2" fill="#FDE68A" />
    </svg>
  );
}

/* ==========================================================================
   2. TẾT NGUYÊN ĐÁN CULTURAL VISUALS
   ========================================================================== */

/**
 * 🧧 Bao lì xì đỏ may mắn ngày Tết
 * Viền kim nhũ, thắt nơ may mắn và chữ Phúc/Lộc thếp vàng
 */
export function RedEnvelope({ className = "w-6 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 56"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bao lì xì đỏ"
    >
      <defs>
        <linearGradient id="redEnvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="60%" stopColor="#B91C1C" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
      </defs>

      {/* Thân bao lì xì */}
      <rect x="4" y="4" width="36" height="48" rx="4" fill="url(#redEnvGrad)" stroke="#F59E0B" strokeWidth="1.2" />

      {/* Nắp gấp bao lì xì cung đình */}
      <path
        d="M4 12 C12 24 32 24 40 12 L40 4 L4 4 Z"
        fill="#991B1B"
        stroke="#F59E0B"
        strokeWidth="1"
      />

      {/* Đồng xu vàng / chữ Phúc niêm phong */}
      <circle cx="22" cy="20" r="6" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
      <rect x="19.5" y="17.5" width="5" height="5" fill="#991B1B" />

      {/* Họa tiết mây lành viền đáy */}
      <path
        d="M8 44 Q14 40 22 44 Q30 40 36 44"
        stroke="#FDE047"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </svg>
  );
}

/**
 * 🥮 Bánh Chưng xanh vuông vức buộc lạt tre chữ thập
 */
export function BanhChung({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bánh chưng xanh"
    >
      <defs>
        <linearGradient id="leafGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="50%" stopColor="#166534" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>
      </defs>

      {/* Vuông bánh chưng góc hơi lượn mềm */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="3"
        fill="url(#leafGreenGrad)"
        stroke="#22C55E"
        strokeWidth="1"
      />

      {/* Gân lá dong chéo */}
      <line x1="6" y1="6" x2="42" y2="42" stroke="#14532D" strokeWidth="1" opacity="0.6" />
      <line x1="42" y1="6" x2="6" y2="42" stroke="#14532D" strokeWidth="1" opacity="0.6" />

      {/* Dây lạt tre chữ thập kép truyền thống */}
      <line x1="19" y1="6" x2="19" y2="42" stroke="#FDE047" strokeWidth="1.4" opacity="0.9" />
      <line x1="29" y1="6" x2="29" y2="42" stroke="#FDE047" strokeWidth="1.4" opacity="0.9" />
      <line x1="6" y1="19" x2="42" y2="19" stroke="#FDE047" strokeWidth="1.4" opacity="0.9" />
      <line x1="6" y1="29" x2="42" y2="29" stroke="#FDE047" strokeWidth="1.4" opacity="0.9" />

      {/* Mối lạt xoắn buộc ở giữa */}
      <circle cx="24" cy="24" r="2.2" fill="#CA8A04" stroke="#FEF08A" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * 🪭 Quạt gấm hoa văn hoàng cung
 */
export function SilkFan({ className = "w-7 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 54 36"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quạt gấm ngày xuân"
    >
      <path
        d="M27 32 L4 14 C12 4 42 4 50 14 Z"
        fill="rgba(190, 18, 60, 0.4)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Nan quạt */}
      <line x1="27" y1="32" x2="14" y2="9" stroke="#FBBF24" strokeWidth="0.8" opacity="0.7" />
      <line x1="27" y1="32" x2="27" y2="6" stroke="#FBBF24" strokeWidth="0.8" opacity="0.7" />
      <line x1="27" y1="32" x2="40" y2="9" stroke="#FBBF24" strokeWidth="0.8" opacity="0.7" />
      {/* Khuyên xỏ và tua rua */}
      <circle cx="27" cy="32" r="2.5" fill="#F59E0B" />
      <path d="M27 34 Q25 40 24 44" stroke="#DC2626" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/* ==========================================================================
   3. QUỐC KHÁNH 2/9 & 30/4 CULTURAL VISUALS
   ========================================================================== */

/**
 * 🇻🇳 Cờ đỏ sao vàng Việt Nam tung bay kiêu hãnh
 * Tỷ lệ chuẩn, gợn sóng lụa mềm mại
 */
export function VietnamFlagRipple({ className = "w-8 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cờ đỏ sao vàng"
    >
      <defs>
        <linearGradient id="flagRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="35%" stopColor="#EF4444" />
          <stop offset="70%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {/* Lá cờ gợn sóng lụa */}
      <path
        d="M2 4 Q16 8 30 4 T58 4 L58 34 Q44 38 30 34 T2 34 Z"
        fill="url(#flagRedGrad)"
        stroke="#F59E0B"
        strokeWidth="0.8"
      />

      {/* Ngôi sao vàng 5 cánh ở trung tâm */}
      <polygon
        points="30,11 32.5,18 40,18 34,22.5 36.2,29.5 30,25 23.8,29.5 26,22.5 20,18 27.5,18"
        fill="#FFFF00"
        stroke="#EAB308"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/**
 * 🕊️ Đôi chim bồ câu trắng hòa bình bay lượn
 */
export function PeaceDoves({ className = "w-7 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chim bồ câu hòa bình"
    >
      {/* Chim bồ câu 1 */}
      <path
        d="M4 14 C12 4 22 2 30 4 C24 10 26 16 34 18 C38 19 44 17 46 14 C40 22 30 22 24 20 C16 26 8 24 4 14 Z"
        fill="#FFFFFF"
        opacity="0.8"
      />
      {/* Cành ô liu / lúa non ngậm ở mỏ */}
      <path d="M46 14 Q48 12 50 13" stroke="#22C55E" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🎆 Chùm pháo hoa độc lập rực rỡ
 */
export function FireworksBurst({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pháo hoa độc lập"
    >
      <circle cx="20" cy="20" r="1.5" fill="#FEF08A" />
      <line x1="20" y1="6" x2="20" y2="12" stroke="#FDE047" strokeWidth="1" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="34" stroke="#FDE047" strokeWidth="1" strokeLinecap="round" />
      <line x1="6" y1="20" x2="12" y2="20" stroke="#FDE047" strokeWidth="1" strokeLinecap="round" />
      <line x1="28" y1="20" x2="34" y2="20" stroke="#FDE047" strokeWidth="1" strokeLinecap="round" />
      <line x1="10" y1="10" x2="14" y2="14" stroke="#F43F5E" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="26" y1="26" x2="30" y2="30" stroke="#F43F5E" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="30" y1="10" x2="26" y2="14" stroke="#60A5FA" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="14" y1="26" x2="10" y2="30" stroke="#60A5FA" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/* ==========================================================================
   4. GIỖ TỔ HÙNG VƯƠNG CULTURAL VISUALS
   ========================================================================== */

/**
 * 🪶 Chim Lạc sải cánh dài thiêng liêng bay về nguồn cội
 */
export function ChimLacBird({ className = "w-8 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 64 36"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chim Lạc thời Hùng Vương"
    >
      {/* Thân và sải cánh dài chim Lạc */}
      <path
        d="M2 18 Q14 2 34 2 C28 10 32 16 46 16 C54 16 62 12 64 10 C56 22 42 22 34 20 C22 28 12 28 2 18 Z"
        fill="rgba(180, 83, 9, 0.4)"
        stroke="#D97706"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Mỏ dài và mào chim đặc trưng văn hóa Đông Sơn */}
      <path d="M64 10 L52 14" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="50" cy="13" r="1.2" fill="#FDE047" />
      <path d="M22 10 Q28 6 34 8" stroke="#F59E0B" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * 🏔️ Dãy núi thiêng Nghĩa Lĩnh Đền Hùng trong sương
 */
export function NghiaLinhMountains({ className = "w-16 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 120 32"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Núi Nghĩa Lĩnh Đền Hùng"
    >
      <path
        d="M0 32 L20 18 L38 26 L60 8 L82 22 L102 16 L120 32 Z"
        fill="rgba(120, 53, 15, 0.25)"
        stroke="#92400E"
        strokeWidth="0.8"
      />
      <path
        d="M30 32 L50 20 L65 25 L85 14 L110 32 Z"
        fill="rgba(180, 83, 9, 0.2)"
        stroke="#B45309"
        strokeWidth="0.6"
      />
    </svg>
  );
}

/* ==========================================================================
   5. TÂM LINH & TRUYỀN THỐNG (VU LAN, PHẬT ĐẢN, ĐOAN NGỌ)
   ========================================================================== */

/**
 * 🕯️ Hoa đăng sen lung linh trôi trên dòng sông thiêng
 */
export function FloatingLotusLantern({ className = "w-7 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 52 44"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Hoa đăng cầu an"
    >
      {/* Cánh sen hồng nở */}
      <path
        d="M26 18 C20 26 16 34 26 38 C36 34 32 26 26 18 Z"
        fill="rgba(244, 63, 94, 0.4)"
        stroke="#FB7185"
        strokeWidth="1"
      />
      <path
        d="M26 38 C14 34 8 28 12 22 C18 26 22 32 26 38 Z"
        fill="rgba(251, 113, 133, 0.3)"
        stroke="#FDA4AF"
        strokeWidth="0.8"
      />
      <path
        d="M26 38 C38 34 44 28 40 22 C34 26 30 32 26 38 Z"
        fill="rgba(251, 113, 133, 0.3)"
        stroke="#FDA4AF"
        strokeWidth="0.8"
      />

      {/* Cây nến thắp sáng ở nhụy */}
      <rect x="24.5" y="16" width="3" height="8" rx="1" fill="#FEF08A" />
      {/* Ngọn lửa nến ấm */}
      <path
        d="M26 8 C24 12 24 15 26 16 C28 15 28 12 26 8 Z"
        fill="#F59E0B"
        stroke="#FDE047"
        strokeWidth="0.8"
      />

      {/* Gợn sóng nước nhẹ */}
      <path d="M6 40 Q26 44 46 40" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🔔 Chuông đồng cổ kính nơi cửa Phật
 */
export function AncientTempleBell({ className = "w-6 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 52"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chuông đồng cổ kính"
    >
      {/* Quai chuông rồng */}
      <path d="M18 10 C18 4 26 4 26 10" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
      {/* Thân đại hồng chung */}
      <path
        d="M14 12 Q22 10 30 12 L33 38 Q22 42 11 38 Z"
        fill="rgba(180, 83, 9, 0.35)"
        stroke="#D97706"
        strokeWidth="1.2"
      />
      {/* Hoa văn dập nổi ngang thân chuông */}
      <line x1="13" y1="24" x2="31" y2="24" stroke="#CA8A04" strokeWidth="1" strokeDasharray="2 1" />
      <line x1="12" y1="32" x2="32" y2="32" stroke="#CA8A04" strokeWidth="1" strokeDasharray="2 1" />
      {/* Miệng chuông */}
      <ellipse cx="22" cy="38" rx="11" ry="3" stroke="#F59E0B" strokeWidth="1.2" />
    </svg>
  );
}

/* ==========================================================================
   6. NGÀY NHÀ GIÁO VIỆT NAM (20/11) VISUALS
   ========================================================================== */

/**
 * 🎓 Mũ cử nhân tốt nghiệp vinh quy
 */
export function GraduationCap({ className = "w-7 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 54 36"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mũ cử nhân"
    >
      <polygon points="27,4 52,14 27,24 2,14" fill="rgba(180, 83, 9, 0.35)" stroke="#EAB308" strokeWidth="1.2" />
      <path d="M12 18 L12 28 C12 32 42 32 42 28 L42 18" stroke="#CA8A04" strokeWidth="1" />
      {/* Tua rua mũ */}
      <circle cx="27" cy="14" r="1.5" fill="#FEF08A" />
      <path d="M27 14 Q38 18 42 24" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🌸 Bông hoa điểm 10 rực rỡ tặng thầy cô
 */
export function FloralRosette({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Hoa điểm 10 tặng thầy cô"
    >
      <circle cx="22" cy="22" r="16" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" strokeWidth="1" />
      <circle cx="22" cy="22" r="11" fill="rgba(220, 38, 38, 0.35)" stroke="#EF4444" strokeWidth="1" />
      <circle cx="22" cy="22" r="5" fill="#FEF08A" />
      {/* Cánh hoa nhỏ tỏa tròn */}
      <circle cx="22" cy="8" r="2" fill="#FDE047" />
      <circle cx="22" cy="36" r="2" fill="#FDE047" />
      <circle cx="8" cy="22" r="2" fill="#FDE047" />
      <circle cx="36" cy="22" r="2" fill="#FDE047" />
    </svg>
  );
}

/* ==========================================================================
   7. PHỤ NỮ & GIA ĐÌNH (8/3, 20/10) VISUALS
   ========================================================================== */

/**
 * 🎀 Dải lụa mềm mại thắt nơ quý phái
 */
export function SilkRibbonBow({ className = "w-7 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 52 36"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Dải lụa thắt nơ"
    >
      <ellipse cx="16" cy="14" rx="10" ry="7" fill="rgba(219, 39, 119, 0.3)" stroke="#EC4899" strokeWidth="1" />
      <ellipse cx="36" cy="14" rx="10" ry="7" fill="rgba(219, 39, 119, 0.3)" stroke="#EC4899" strokeWidth="1" />
      <circle cx="26" cy="14" r="3.5" fill="#F472B6" stroke="#DB2777" strokeWidth="1" />
      <path d="M24 17 Q18 28 14 34" stroke="#F472B6" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28 17 Q34 28 38 34" stroke="#F472B6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🦋 Cánh bướm mùa xuân lượn quanh đóa hoa
 */
export function SpringButterfly({ className = "w-6 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 36"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bướm mùa xuân"
    >
      <path
        d="M22 18 C14 8 2 10 4 22 C12 24 18 20 22 18 Z"
        fill="rgba(236, 72, 153, 0.4)"
        stroke="#F472B6"
        strokeWidth="1"
      />
      <path
        d="M22 18 C30 8 42 10 40 22 C32 24 26 20 22 18 Z"
        fill="rgba(236, 72, 153, 0.4)"
        stroke="#F472B6"
        strokeWidth="1"
      />
      <ellipse cx="22" cy="18" rx="1.5" ry="6" fill="#FDE047" />
    </svg>
  );
}

/* ==========================================================================
   8. GIÁNG SINH NOEL CULTURAL VISUALS
   ========================================================================== */

/**
 * 🎄 Cây thông Noel với đỉnh sao vàng rực rỡ
 */
export function ChristmasPineTree({ className = "w-6 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 56"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cây thông Noel"
    >
      {/* Đỉnh sao */}
      <polygon points="22,2 24,7 29,7 25,10 27,15 22,12 17,15 19,10 15,7 20,7" fill="#FDE047" />
      {/* Tầng lá 1 */}
      <polygon points="22,11 32,22 12,22" fill="#047857" stroke="#10B981" strokeWidth="0.8" />
      {/* Tầng lá 2 */}
      <polygon points="22,18 36,32 8,32" fill="#065F46" stroke="#059669" strokeWidth="0.8" />
      {/* Tầng lá 3 */}
      <polygon points="22,27 40,44 4,44" fill="#064E3B" stroke="#047857" strokeWidth="0.8" />
      {/* Gốc cây */}
      <rect x="19" y="44" width="6" height="8" fill="#78350F" />
      {/* Quả châu trang trí */}
      <circle cx="18" cy="28" r="1.5" fill="#EF4444" />
      <circle cx="28" cy="38" r="1.5" fill="#FBBF24" />
      <circle cx="14" cy="40" r="1.5" fill="#38BDF8" />
    </svg>
  );
}

/**
 * 🎁 Hộp quà Giáng Sinh thắt nơ vàng kim
 */
export function ChristmasGiftBox({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Hộp quà Giáng Sinh"
    >
      <rect x="8" y="14" width="28" height="24" rx="2" fill="rgba(185, 28, 28, 0.45)" stroke="#DC2626" strokeWidth="1" />
      {/* Nắp hộp */}
      <rect x="6" y="10" width="32" height="6" rx="1.5" fill="#B91C1C" stroke="#EF4444" strokeWidth="0.8" />
      {/* Dây ruy băng chữ thập */}
      <line x1="22" y1="10" x2="22" y2="38" stroke="#FDE047" strokeWidth="2.5" />
      <line x1="8" y1="24" x2="36" y2="24" stroke="#FDE047" strokeWidth="2.5" />
      {/* Nơ trên đỉnh */}
      <ellipse cx="18" cy="8" rx="4" ry="2.5" fill="none" stroke="#FDE047" strokeWidth="1.2" />
      <ellipse cx="26" cy="8" rx="4" ry="2.5" fill="none" stroke="#FDE047" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * ❄️ Bông tuyết tinh thể pha lê đối xứng 6 cánh
 */
export function CrystalSnowflake({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bông tuyết pha lê"
    >
      <line x1="22" y1="4" x2="22" y2="40" stroke="#BAE6FD" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4" y1="22" x2="40" y2="22" stroke="#BAE6FD" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9" y1="9" x2="35" y2="35" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" />
      <line x1="35" y1="9" x2="9" y2="35" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" />
      {/* Nhánh con */}
      <path d="M19 10 L22 13 L25 10" stroke="#E0F2FE" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M19 34 L22 31 L25 34" stroke="#E0F2FE" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M10 19 L13 22 L10 25" stroke="#E0F2FE" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M34 19 L31 22 L34 25" stroke="#E0F2FE" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="22" cy="22" r="2" fill="#FFFFFF" />
    </svg>
  );
}

/* ==========================================================================
   9. HALLOWEEN CULTURAL VISUALS
   ========================================================================== */

/**
 * 🎃 Quả bí ngô Jack-o'-lantern phát sáng nụ cười ma mị
 */
export function JackOLantern({ className = "w-7 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 52 46"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bí ngô Halloween"
    >
      <defs>
        <radialGradient id="pumpkinGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="70%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </radialGradient>
      </defs>
      {/* Cuống bí ngô */}
      <path d="M26 8 Q28 2 32 3" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
      {/* Thân quả bí ngô */}
      <ellipse cx="26" cy="26" rx="22" ry="17" fill="url(#pumpkinGrad)" stroke="#7C2D12" strokeWidth="1.2" />
      {/* Múi bí ngô */}
      <ellipse cx="26" cy="26" rx="14" ry="17" fill="none" stroke="#C2410C" strokeWidth="1" />
      <ellipse cx="26" cy="26" rx="6" ry="17" fill="none" stroke="#C2410C" strokeWidth="0.8" />
      {/* Cặp mắt tam giác phát sáng */}
      <polygon points="17,21 21,21 19,16" fill="#FEF08A" stroke="#B45309" strokeWidth="0.5" />
      <polygon points="31,21 35,21 33,16" fill="#FEF08A" stroke="#B45309" strokeWidth="0.5" />
      {/* Mũi */}
      <polygon points="26,24 24,27 28,27" fill="#FEF08A" />
      {/* Nụ cười răng cưa */}
      <path
        d="M15 31 L18 34 L21 32 L24 35 L26 32 L28 35 L31 32 L34 34 L37 31 Q26 39 15 31 Z"
        fill="#FEF08A"
        stroke="#9A3412"
        strokeWidth="0.6"
      />
    </svg>
  );
}

/**
 * 🕸️ Mạng nhện góc navbar
 */
export function SpiderWebCorner({ className = "w-7 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mạng nhện Halloween"
    >
      <line x1="0" y1="0" x2="48" y2="48" stroke="#94A3B8" strokeWidth="0.8" opacity="0.4" />
      <line x1="0" y1="0" x2="48" y2="24" stroke="#94A3B8" strokeWidth="0.8" opacity="0.4" />
      <line x1="0" y1="0" x2="24" y2="48" stroke="#94A3B8" strokeWidth="0.8" opacity="0.4" />
      <path d="M12 0 Q10 10 0 12" stroke="#CBD5E1" strokeWidth="0.8" opacity="0.5" />
      <path d="M24 0 Q20 20 0 24" stroke="#CBD5E1" strokeWidth="0.8" opacity="0.5" />
      <path d="M38 0 Q30 30 0 38" stroke="#CBD5E1" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

/* ==========================================================================
   10. VALENTINE & TÌNH YÊU VISUALS
   ========================================================================== */

/**
 * 🌹 Đóa hồng nhung hé nở
 */
export function VelvetRose({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Hoa hồng nhung"
    >
      <circle cx="22" cy="18" r="10" fill="rgba(190, 18, 60, 0.4)" stroke="#BE123C" strokeWidth="1" />
      <path d="M18 14 C18 22 26 22 26 14 C26 10 18 10 18 14 Z" fill="#E11D48" opacity="0.8" />
      <path d="M22 28 Q22 38 22 42" stroke="#15803D" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22 34 Q28 32 30 28" stroke="#16A34A" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 💌 Phong thư tình yêu niêm phong sáp đỏ
 */
export function LoveLetterEnvelope({ className = "w-7 h-5", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 52 38"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Thư tình yêu"
    >
      <rect x="4" y="6" width="44" height="28" rx="2" fill="rgba(244, 114, 182, 0.2)" stroke="#F472B6" strokeWidth="1" />
      <path d="M4 6 L26 22 L48 6" stroke="#FB7185" strokeWidth="1" />
      {/* Trái tim sáp niêm phong */}
      <path
        d="M26 23 C24 20 21 20 20 22 C18 24 22 27 26 30 C30 27 34 24 32 22 C31 20 28 20 26 23 Z"
        fill="#E11D48"
      />
    </svg>
  );
}

/* ==========================================================================
   11. TRẺ EM & THANH NIÊN (1/6, 26/3) VISUALS
   ========================================================================== */

/**
 * 🌀 Chong chóng tuổi thơ bốn cánh xoay tít
 */
export function SpinningPinwheel({ className = "w-6 h-7", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 54"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chong chóng tuổi thơ"
    >
      {/* Que cầm */}
      <line x1="22" y1="22" x2="22" y2="52" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" />
      {/* 4 cánh chong chóng đa sắc */}
      <path d="M22 22 L36 10 L22 8 Z" fill="#EF4444" stroke="#DC2626" strokeWidth="0.6" />
      <path d="M22 22 L34 36 L36 22 Z" fill="#3B82F6" stroke="#2563EB" strokeWidth="0.6" />
      <path d="M22 22 L8 34 L22 36 Z" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.6" />
      <path d="M22 22 L10 8 L8 22 Z" fill="#10B981" stroke="#059669" strokeWidth="0.6" />
      <circle cx="22" cy="22" r="2" fill="#FFFFFF" />
    </svg>
  );
}

/* ==========================================================================
   12. TẾT DƯƠNG LỊCH & NĂM MỚI VISUALS
   ========================================================================== */

/**
 * 🥂 Cặp ly sâm panh giao thừa chúc mừng năm mới
 */
export function ToastingChampagne({ className = "w-7 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 52 44"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Ly sâm panh năm mới"
    >
      {/* Ly trái nghiêng */}
      <g transform="rotate(-15 20 25)">
        <path d="M16 6 L24 6 L22 20 C22 24 18 24 18 20 Z" fill="rgba(251, 191, 36, 0.4)" stroke="#FBBF24" strokeWidth="1" />
        <line x1="20" y1="24" x2="20" y2="36" stroke="#FBBF24" strokeWidth="1" />
        <line x1="16" y1="36" x2="24" y2="36" stroke="#FBBF24" strokeWidth="1" />
      </g>
      {/* Ly phải nghiêng chạm cốc */}
      <g transform="rotate(15 32 25)">
        <path d="M28 6 L36 6 L34 20 C34 24 30 24 30 20 Z" fill="rgba(251, 191, 36, 0.4)" stroke="#FBBF24" strokeWidth="1" />
        <line x1="32" y1="24" x2="32" y2="36" stroke="#FBBF24" strokeWidth="1" />
        <line x1="28" y1="36" x2="36" y2="36" stroke="#FBBF24" strokeWidth="1" />
      </g>
      {/* Bọt sâm panh nổ li ti */}
      <circle cx="26" cy="10" r="1.5" fill="#FEF08A" />
      <circle cx="24" cy="6" r="1" fill="#FEF08A" />
      <circle cx="28" cy="4" r="1" fill="#FEF08A" />
    </svg>
  );
}

/* ==========================================================================
   13. SINH NHẬT NANA (30/05) VISUALS
   ========================================================================== */

/**
 * 🎂 Bánh sinh nhật thắp nến lung linh
 */
export function BirthdayCake({ className = "w-6 h-6", style }: VisualProps) {
  return (
    <svg
      viewBox="0 0 44 48"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bánh sinh nhật Nana"
    >
      {/* Tầng bánh dưới */}
      <rect x="6" y="26" width="32" height="16" rx="2" fill="rgba(236, 72, 153, 0.35)" stroke="#EC4899" strokeWidth="1" />
      {/* Tầng kem trên */}
      <rect x="10" y="16" width="24" height="12" rx="2" fill="rgba(244, 114, 182, 0.4)" stroke="#F472B6" strokeWidth="1" />
      {/* 3 cây nến */}
      <line x1="16" y1="12" x2="16" y2="16" stroke="#FBBF24" strokeWidth="1.2" />
      <line x1="22" y1="10" x2="22" y2="16" stroke="#FBBF24" strokeWidth="1.2" />
      <line x1="28" y1="12" x2="28" y2="16" stroke="#FBBF24" strokeWidth="1.2" />
      {/* Ngọn lửa nến */}
      <circle cx="16" cy="10" r="1.2" fill="#F59E0B" />
      <circle cx="22" cy="8" r="1.5" fill="#EF4444" />
      <circle cx="28" cy="10" r="1.2" fill="#F59E0B" />
    </svg>
  );
}
