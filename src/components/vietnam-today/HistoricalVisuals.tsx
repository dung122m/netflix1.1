"use client";

import React from "react";
import { HistoricalVisualTheme } from "@/data/historicalEvents";

interface HistoricalVisualProps {
  theme: HistoricalVisualTheme;
  className?: string;
}

/**
 * 1. BA ĐÌNH 1945: Quảng trường Ba Đình, Bục Tuyên ngôn, Cờ đỏ Sao vàng rực rỡ, Văn kiện Độc lập
 */
export function BaDinh1945Visual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#450a0a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="bdSun" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
          <stop offset="40%" stopColor="#eab308" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bdGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="bdRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>

      {/* Background & Aura */}
      <rect width="400" height="240" fill="url(#bdSky)" />
      <circle cx="200" cy="80" r="140" fill="url(#bdSun)" />

      {/* Sun rays */}
      <g stroke="#fef08a" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="4 4">
        <line x1="200" y1="80" x2="80" y2="10" />
        <line x1="200" y1="80" x2="130" y2="5" />
        <line x1="200" y1="80" x2="270" y2="5" />
        <line x1="200" y1="80" x2="320" y2="10" />
        <line x1="200" y1="80" x2="50" y2="50" />
        <line x1="200" y1="80" x2="350" y2="50" />
      </g>

      {/* Ba Dinh Podium & Columns silhouette */}
      <path
        d="M60 210 L340 210 L320 185 L80 185 Z"
        fill="#27272a"
        stroke="#52525b"
        strokeWidth="1"
      />
      <rect x="130" y="150" width="140" height="35" rx="3" fill="#18181b" stroke="#71717a" strokeWidth="1" />
      <rect x="150" y="125" width="100" height="25" rx="2" fill="#27272a" stroke="#eab308" strokeOpacity="0.4" strokeWidth="1" />

      {/* Independence declaration scroll / podium stand */}
      <path
        d="M185 110 L215 110 L210 125 L190 125 Z"
        fill="#fef08a"
        fillOpacity="0.9"
      />
      <rect x="198" y="98" width="4" height="12" fill="#71717a" />
      <circle cx="200" cy="96" r="3" fill="#a1a1aa" />

      {/* Hanoi Flag Tower Silhouette (Background Left) */}
      <g opacity="0.35" transform="translate(45, 105)">
        <polygon points="15,75 35,75 30,35 20,35" fill="#3f3f46" />
        <polygon points="20,35 30,35 28,15 22,15" fill="#52525b" />
        <rect x="24" y="2" width="2" height="13" fill="#71717a" />
        <polygon points="26,2 38,5 26,9" fill="#ef4444" />
      </g>

      {/* Grand Vietnam Flag center high */}
      <g transform="translate(160, 25)">
        {/* Flag pole */}
        <line x1="5" y1="0" x2="5" y2="100" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="5" cy="0" r="3" fill="#fef08a" />
        {/* Flying Flag Wave */}
        <path
          d="M6 5 C25 2, 45 12, 70 6 C70 6, 72 38, 70 42 C45 48, 25 38, 6 42 Z"
          fill="url(#bdRed)"
          stroke="#f87171"
          strokeWidth="0.5"
        />
        {/* Star */}
        <polygon
          points="38,15 41,23 49,23 43,28 45,36 38,31 31,36 33,28 27,23 35,23"
          fill="url(#bdGold)"
          filter="drop-shadow(0 0 4px rgba(250,204,21,0.8))"
        />
      </g>

      {/* Crowd Silhouettes with waving mini flags */}
      <g fill="#18181b">
        <path d="M0 240 C30 215, 70 218, 120 225 C170 230, 230 222, 280 225 C330 228, 370 218, 400 240 Z" />
        <circle cx="30" cy="215" r="7" />
        <circle cx="55" cy="210" r="8" />
        <circle cx="85" cy="212" r="7" />
        <circle cx="115" cy="214" r="8" />
        <circle cx="295" cy="213" r="8" />
        <circle cx="325" cy="210" r="7" />
        <circle cx="355" cy="212" r="8" />
        <circle cx="380" cy="216" r="7" />
      </g>
      {/* Mini waving flags in crowd */}
      <line x1="58" y1="210" x2="68" y2="190" stroke="#a1a1aa" strokeWidth="1" />
      <polygon points="68,190 78,193 68,198" fill="#ef4444" />
      <line x1="330" y1="210" x2="340" y2="192" stroke="#a1a1aa" strokeWidth="1" />
      <polygon points="340,192 350,195 340,200" fill="#ef4444" />
    </svg>
  );
}

/**
 * 2. ĐIỆN BIÊN PHỦ: Đồi A1, Hầm De Castries, Cờ Quyết chiến Quyết thắng tung bay, Đồi núi Mường Thanh
 */
export function DienBienPhuVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dbpSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14532d" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#1e3a1e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id="dbpHill1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id="dbpHill2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>
        <radialGradient id="dbpGlow" cx="65%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#eab308" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#dbpSky)" />
      <circle cx="260" cy="70" r="130" fill="url(#dbpGlow)" />

      {/* Distant mountain ranges */}
      <path
        d="M0 130 L60 85 L130 115 L210 70 L300 110 L360 80 L400 100 L400 240 L0 240 Z"
        fill="#1e293b"
        opacity="0.5"
      />
      <path
        d="M0 150 L80 110 L160 135 L250 95 L340 130 L400 110 L400 240 L0 240 Z"
        fill="#0f172a"
        opacity="0.8"
      />

      {/* Bunker Hill (Hầm Đờ-cát trên Đồi A1) */}
      <path
        d="M100 240 Q 230 140, 380 240 Z"
        fill="url(#dbpHill2)"
        stroke="#71717a"
        strokeWidth="1"
      />

      {/* De Castries Bunker curved steel arched roof */}
      <path
        d="M210 185 C210 160, 270 160, 270 185 Z"
        fill="#3f3f46"
        stroke="#a1a1aa"
        strokeWidth="1.5"
      />
      {/* Sandbags around bunker */}
      <ellipse cx="225" cy="183" rx="14" ry="5" fill="#78716c" />
      <ellipse cx="255" cy="183" rx="14" ry="5" fill="#78716c" />
      <ellipse cx="240" cy="177" rx="15" ry="5" fill="#a8a29e" />

      {/* Trench silhouette */}
      <path
        d="M0 220 L120 205 L180 225 L210 195 L300 215 L400 200 L400 240 L0 240 Z"
        fill="url(#dbpHill1)"
      />

      {/* Victorious Soldier raising "Quyết chiến Quyết thắng" Flag on Bunker */}
      <g transform="translate(232, 75)">
        {/* Soldier Silhouette */}
        <circle cx="8" cy="85" r="4.5" fill="#22c55e" /> {/* Pith helmet */}
        <path d="M4 90 L12 90 L10 105 L6 105 Z" fill="#15803d" /> {/* Body */}
        <line x1="8" y1="92" x2="16" y2="82" stroke="#22c55e" strokeWidth="2.5" /> {/* Raised arm */}

        {/* Flag Pole */}
        <line x1="16" y1="0" x2="16" y2="105" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="0" r="3" fill="#facc15" />

        {/* Red Flag "Quyết chiến Quyết thắng" waving proudly */}
        <path
          d="M17 5 C45 0, 75 14, 105 5 C105 5, 108 42, 105 45 C75 52, 45 40, 17 45 Z"
          fill="#dc2626"
          stroke="#f87171"
          strokeWidth="0.5"
        />
        {/* Star */}
        <polygon
          points="58,18 61,26 69,26 63,31 65,39 58,34 51,39 53,31 47,26 55,26"
          fill="#facc15"
          filter="drop-shadow(0 0 4px rgba(250,204,21,0.9))"
        />
      </g>
    </svg>
  );
}

/**
 * 3. GIẢI PHÓNG THỦ ĐÔ 10/10/1954: Cột cờ Hà Nội, Tháp Rùa, Năm cửa ô rực rỡ cờ hoa
 */
export function GiaiPhongThuDoVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gptdSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#431407" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="gptdSun" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fdba74" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#gptdSky)" />
      <circle cx="200" cy="90" r="140" fill="url(#gptdSun)" />

      {/* Water reflection of Sword Lake (Hồ Gươm) */}
      <rect x="0" y="190" width="400" height="50" fill="#0c1e28" opacity="0.9" />
      <line x1="50" y1="205" x2="160" y2="205" stroke="#38bdf8" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="240" y1="215" x2="350" y2="215" stroke="#38bdf8" strokeOpacity="0.2" strokeWidth="1" />

      {/* Turtle Tower (Tháp Rùa) on left island */}
      <g transform="translate(40, 120)">
        {/* Island base */}
        <ellipse cx="45" cy="72" rx="48" ry="12" fill="#152e22" />
        {/* Tier 1 */}
        <rect x="25" y="42" width="40" height="28" fill="#78350f" stroke="#b45309" strokeWidth="1" />
        <rect x="23" y="40" width="44" height="3" fill="#d97706" />
        <rect x="35" y="48" width="8" height="15" rx="3" fill="#18181b" />
        <rect x="47" y="48" width="8" height="15" rx="3" fill="#18181b" />
        {/* Tier 2 */}
        <rect x="30" y="22" width="30" height="20" fill="#78350f" stroke="#b45309" strokeWidth="1" />
        <rect x="28" y="20" width="34" height="3" fill="#d97706" />
        <rect x="40" y="27" width="10" height="10" rx="3" fill="#18181b" />
        {/* Tier 3 (top) */}
        <rect x="37" y="10" width="16" height="11" fill="#92400e" />
        <polygon points="45,4 34,10 56,10" fill="#b45309" />
      </g>

      {/* Hanoi Flag Tower (Cột cờ Hà Nội) Center Right */}
      <g transform="translate(240, 45)">
        {/* Base Tier 1 */}
        <polygon points="10,150 90,150 82,125 18,125" fill="#713f12" stroke="#a16207" strokeWidth="1" />
        {/* Base Tier 2 */}
        <polygon points="22,125 78,125 72,105 28,105" fill="#854d0e" stroke="#ca8a04" strokeWidth="1" />
        {/* Octagonal Tower Body */}
        <polygon points="36,105 64,105 60,35 40,35" fill="#a16207" stroke="#ca8a04" strokeWidth="1" />
        {/* Top Observatory */}
        <rect x="38" y="22" width="24" height="13" rx="2" fill="#ca8a04" />
        <polygon points="50,14 34,22 66,22" fill="#eab308" />

        {/* Flag Pole & National Flag */}
        <line x1="50" y1="0" x2="50" y2="15" stroke="#f4f4f5" strokeWidth="2" />
        <circle cx="50" cy="0" r="2.5" fill="#facc15" />
        <path
          d="M51 2 C68 0, 85 8, 100 2 C100 2, 101 25, 100 27 C85 32, 68 25, 51 27 Z"
          fill="#dc2626"
        />
        <polygon
          points="73,10 75,15 80,15 76,18 77,23 73,20 69,23 70,18 66,15 71,15"
          fill="#facc15"
        />
      </g>

      {/* Victorious Army marching through Hanoi gate banner */}
      <g transform="translate(130, 160)">
        {/* Arch of triumph */}
        <path d="M0 45 C0 10, 50 10, 50 45" stroke="#fbbf24" strokeWidth="3" fill="none" />
        {/* Banner with star */}
        <rect x="2" y="10" width="46" height="12" fill="#dc2626" rx="2" />
        <polygon points="25,12 26,15 29,15 27,17 28,20 25,18 22,20 23,17 21,15 24,15" fill="#fef08a" />
      </g>
    </svg>
  );
}

/**
 * 4. THỐNG NHẤT 30/04/1975: Cổng Dinh Độc Lập, Xe tăng 390 lịch sử, Cờ Mặt trận Giải phóng, Bồ câu hòa bình
 */
export function ThongNhat1975Visual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tnSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
          <stop offset="45%" stopColor="#991b1b" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="tnSun" cx="50%" cy="35%" r="45%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flagFrontier" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="50.1%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      <rect width="400" height="240" fill="url(#tnSky)" />
      <circle cx="200" cy="80" r="120" fill="url(#tnSun)" />

      {/* Independence Palace Architectural Facade Silhouette */}
      <g opacity="0.3" transform="translate(60, 70)">
        <rect x="30" y="30" width="220" height="60" fill="#475569" rx="2" />
        {/* Sunscreen louvers (rèm hoa đá) */}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={i} x1={45 + i * 13} y1="40" x2={45 + i * 13} y2="80" stroke="#94a3b8" strokeWidth="2" />
        ))}
        {/* Roof top flagpole */}
        <line x1="140" y1="10" x2="140" y2="30" stroke="#cbd5e1" strokeWidth="2" />
      </g>

      {/* Historic Iron Gates - Broken Open */}
      <g stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
        {/* Left gate bent inward */}
        <line x1="90" y1="130" x2="145" y2="155" />
        <line x1="90" y1="150" x2="145" y2="175" />
        <line x1="90" y1="170" x2="145" y2="195" />
        <line x1="100" y1="125" x2="105" y2="190" />
        <line x1="120" y1="135" x2="125" y2="195" />

        {/* Right gate bent inward */}
        <line x1="310" y1="130" x2="255" y2="155" />
        <line x1="310" y1="150" x2="255" y2="175" />
        <line x1="310" y1="170" x2="255" y2="195" />
        <line x1="300" y1="125" x2="295" y2="190" />
        <line x1="280" y1="135" x2="275" y2="195" />
      </g>

      {/* Tank 390 Silhouette Rolling Through Center */}
      <g transform="translate(135, 145)">
        {/* Tank tracks / wheels */}
        <rect x="15" y="45" width="100" height="22" rx="10" fill="#1c1917" stroke="#44403c" strokeWidth="1.5" />
        <circle cx="30" cy="56" r="6" fill="#44403c" />
        <circle cx="50" cy="56" r="6" fill="#44403c" />
        <circle cx="70" cy="56" r="6" fill="#44403c" />
        <circle cx="90" cy="56" r="6" fill="#44403c" />
        <circle cx="100" cy="56" r="6" fill="#44403c" />

        {/* Tank hull */}
        <polygon points="10,48 120,48 110,30 25,30" fill="#15803d" stroke="#22c55e" strokeWidth="1" />
        {/* Tank turret */}
        <path d="M45 30 Q 75 12, 95 30 Z" fill="#166534" stroke="#22c55e" strokeWidth="1" />
        {/* Cannon pointing forward right */}
        <line x1="85" y1="22" x2="145" y2="15" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />

        {/* "390" text badge */}
        <text x="56" y="42" fill="#fef08a" fontSize="10" fontWeight="bold" fontFamily="monospace">
          390
        </text>
      </g>

      {/* Historic National Liberation Front Flag (Red top, Blue bottom, Yellow Star) */}
      <g transform="translate(200, 30)">
        <line x1="0" y1="0" x2="0" y2="110" stroke="#f4f4f5" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="3" fill="#facc15" />
        {/* Flag */}
        <path
          d="M1 5 C28 0, 56 12, 85 4 C85 4, 87 38, 85 42 C56 50, 28 38, 1 42 Z"
          fill="url(#flagFrontier)"
          stroke="#93c5fd"
          strokeWidth="0.5"
        />
        {/* Center Star */}
        <polygon
          points="42,16 45,24 53,24 47,29 49,37 42,32 35,37 37,29 31,24 39,24"
          fill="#facc15"
          filter="drop-shadow(0 0 4px rgba(250,204,21,0.9))"
        />
      </g>

      {/* Peace Doves flying above */}
      <g stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.85">
        <path d="M50 45 C55 38, 65 40, 70 45 C75 40, 85 38, 90 45" />
        <path d="M100 30 C104 25, 112 26, 116 30 C120 26, 128 25, 132 30" />
      </g>
    </svg>
  );
}

/**
 * 5. NGỌC HỒI - ĐỐNG ĐA 1789: Gò Đống Đa, Vua Quang Trung áo vải cờ đào, Vó ngựa Tây Sơn, Cờ lệnh
 */
export function DongDaVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ddSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#78350f" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#451a03" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="ddFire" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#ddSky)" />
      <circle cx="160" cy="110" r="140" fill="url(#ddFire)" />

      {/* Dong Da Mound hillocks */}
      <path
        d="M0 240 Q 120 150, 240 240 Z"
        fill="#292524"
        stroke="#44403c"
        strokeWidth="1"
      />
      <path
        d="M160 240 Q 300 130, 400 240 Z"
        fill="#1c1917"
        stroke="#57534e"
        strokeWidth="1"
      />

      {/* Tay Son Grand Battle Drums (Trống trận Tây Sơn) */}
      <g transform="translate(45, 155)">
        <ellipse cx="30" cy="20" rx="25" ry="12" fill="#d97706" stroke="#fef08a" strokeWidth="1" />
        <path d="M5 20 L5 55 Q 30 70, 55 55 L55 20 Z" fill="#b45309" stroke="#78350f" strokeWidth="1" />
        {/* Drum stand */}
        <line x1="12" y1="50" x2="0" y2="75" stroke="#78350f" strokeWidth="3" />
        <line x1="48" y1="50" x2="60" y2="75" stroke="#78350f" strokeWidth="3" />
      </g>

      {/* Emperor Quang Trung on Rearing Steed Silhouette */}
      <g transform="translate(180, 55)">
        {/* Rearing Steed (Ngựa chiến tung vó) */}
        <path
          d="M35 125 C30 110, 40 90, 55 85 C65 80, 80 75, 95 65 C100 60, 105 50, 100 45 C95 40, 85 45, 80 50 C75 45, 80 35, 90 30 C105 25, 115 35, 110 50 C120 65, 115 85, 105 95 C95 105, 90 120, 85 135 Z"
          fill="#1c1917"
        />
        {/* Front raised hooves */}
        <line x1="95" y1="65" x2="125" y2="45" stroke="#1c1917" strokeWidth="5" strokeLinecap="round" />
        <line x1="90" y1="70" x2="115" y2="55" stroke="#1c1917" strokeWidth="5" strokeLinecap="round" />

        {/* Emperor with helmet and flowing red cloak */}
        <circle cx="68" cy="45" r="7" fill="#facc15" /> {/* Golden helmet */}
        <path
          d="M60 52 C50 60, 20 65, 5 60 C15 75, 45 75, 65 65 Z"
          fill="#dc2626"
          filter="drop-shadow(0 0 6px rgba(220,38,38,0.8))"
        /> {/* Flowing Red Cloak (Áo bào đỏ) */}
        <line x1="68" y1="50" x2="100" y2="25" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" /> {/* Raised Sword */}
      </g>

      {/* Tay Son Flaming Battle Banner (Cờ lệnh ngũ hành Tây Sơn) */}
      <g transform="translate(305, 30)">
        <line x1="0" y1="0" x2="0" y2="150" stroke="#78350f" strokeWidth="3" />
        {/* Serrated triangular pennant */}
        <polygon
          points="2,10 75,40 2,70 15,50 2,40 15,30"
          fill="#ea580c"
          stroke="#fef08a"
          strokeWidth="1.5"
        />
        {/* Center flaming circle */}
        <circle cx="28" cy="40" r="10" fill="#dc2626" />
        <circle cx="28" cy="40" r="5" fill="#facc15" />
      </g>
    </svg>
  );
}

/**
 * 6. HAI BÀ TRƯNG: Voi chiến Mê Linh, Lời thề Hát Môn, Cờ khởi nghĩa, Hoa sen
 */
export function HaiBaTrungVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hbtSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#831843" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#500724" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="hbtLotus" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#hbtSky)" />
      <circle cx="200" cy="80" r="130" fill="url(#hbtLotus)" />

      {/* Hat River (Sông Hát) waves */}
      <path
        d="M0 215 C60 205, 120 225, 180 215 C240 205, 300 225, 400 215 L400 240 L0 240 Z"
        fill="#1e1b4b"
        opacity="0.8"
      />

      {/* War Elephant (Voi chiến Mê Linh) Silhouette */}
      <g transform="translate(90, 80)">
        {/* Massive Body & Back */}
        <path
          d="M40 90 C30 50, 70 20, 130 20 C180 20, 200 45, 210 70 C220 85, 225 110, 215 130 C200 130, 190 120, 185 105 C175 105, 170 125, 160 130 C145 130, 140 100, 130 95 C120 100, 110 125, 95 130 C80 130, 75 100, 65 95 C55 100, 50 125, 40 130 Z"
          fill="#27272a"
        />
        {/* Elephant Head & Trunk (Vòi voi giương cao) */}
        <path
          d="M190 40 C210 30, 230 40, 235 60 C240 80, 235 110, 245 125 C250 130, 260 125, 255 110 C250 90, 255 65, 245 45 C235 25, 205 15, 185 25 Z"
          fill="#27272a"
        />
        {/* Ivory Tusk (Ngà voi trắng ngà) */}
        <path
          d="M215 75 Q 255 70, 265 40 Q 245 60, 215 82 Z"
          fill="#fef08a"
        />
        {/* Ear */}
        <ellipse cx="180" cy="55" rx="18" ry="24" fill="#3f3f46" />

        {/* Howdah / Seat on Elephant Back with Two Heroines */}
        <rect x="90" y="5" width="55" height="18" rx="3" fill="#b91c1c" stroke="#facc15" strokeWidth="1.5" />
        {/* Two Sister Silhouettes with golden headdresses */}
        <circle cx="105" cy="0" r="5" fill="#facc15" />
        <circle cx="125" cy="-2" r="5" fill="#facc15" />
        <line x1="105" y1="5" x2="105" y2="-8" stroke="#f472b6" strokeWidth="2" />
        <line x1="125" y1="3" x2="125" y2="-10" stroke="#f472b6" strokeWidth="2" />

        {/* Uprising Twin Banners */}
        <line x1="85" y1="-25" x2="85" y2="20" stroke="#eab308" strokeWidth="2" />
        <polygon points="85,-25 50,-15 85,-5" fill="#dc2626" />
        <line x1="150" y1="-25" x2="150" y2="20" stroke="#eab308" strokeWidth="2" />
        <polygon points="150,-25 185,-15 150,-5" fill="#dc2626" />
      </g>

      {/* Ancient Dong Son Bronze Drum Motif (Background Right) */}
      <g transform="translate(300, 40)" opacity="0.35">
        <circle cx="50" cy="50" r="45" stroke="#facc15" strokeWidth="2" fill="none" />
        <circle cx="50" cy="50" r="30" stroke="#facc15" strokeWidth="1" strokeDasharray="3 3" fill="none" />
        <circle cx="50" cy="50" r="10" fill="#facc15" />
        {/* Sun rays on drum */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={50 + 25 * Math.cos((i * Math.PI) / 4)}
            y2={50 + 25 * Math.sin((i * Math.PI) / 4)}
            stroke="#facc15"
            strokeWidth="1.5"
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * 7. BẠCH ĐẰNG: Bãi cọc gỗ Bạch Đằng đâm xuyên thuyền giặc, Chiến thuyền Đại Việt, Sóng nước Bạch Đằng Giang
 */
export function BachDangVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bdgSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#082f49" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id="bdgWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>

      <rect width="400" height="240" fill="url(#bdgSky)" />

      {/* Distant estuary mountains */}
      <path
        d="M0 110 L60 80 L140 105 L220 70 L320 95 L400 85 L400 240 L0 240 Z"
        fill="#042f2e"
        opacity="0.5"
      />

      {/* Raging River Waves of Bach Dang */}
      <path
        d="M0 150 C70 135, 130 165, 200 150 C270 135, 330 165, 400 150 L400 240 L0 240 Z"
        fill="url(#bdgWater)"
      />
      <path
        d="M0 185 C60 175, 120 195, 180 185 C240 175, 310 195, 400 185 L400 240 L0 240 Z"
        fill="#075985"
        opacity="0.8"
      />

      {/* Famous Bach Dang Wooden Stakes (Bãi cọc gỗ lim vót nhọn nhô lên khỏi triều rút) */}
      <g fill="#78350f" stroke="#451a03" strokeWidth="1">
        {/* Stake 1 */}
        <polygon points="65,225 72,130 78,130 85,225" />
        <polygon points="72,130 75,120 78,130" fill="#d97706" /> {/* Sharpened tip */}

        {/* Stake 2 (angled) */}
        <polygon points="120,230 140,145 146,147 135,230" />
        <polygon points="140,145 146,136 146,147" fill="#d97706" />

        {/* Stake 3 */}
        <polygon points="210,235 218,125 225,125 230,235" />
        <polygon points="218,125 221,114 225,125" fill="#d97706" />

        {/* Stake 4 (angled) */}
        <polygon points="290,230 275,140 282,138 302,230" />
        <polygon points="275,140 273,128 282,138" fill="#d97706" />

        {/* Stake 5 */}
        <polygon points="345,235 352,150 358,150 365,235" />
        <polygon points="352,150 355,140 358,150" fill="#d97706" />
      </g>

      {/* Victorious Tran Dynasty Warship (Thuyền chiến Đại Việt giương buồm rẽ sóng) */}
      <g transform="translate(180, 75)">
        {/* Hull */}
        <path
          d="M0 45 C30 45, 110 40, 130 25 C100 45, 40 55, -15 35 Z"
          fill="#451a03"
          stroke="#78350f"
          strokeWidth="1.5"
        />
        {/* Dragon prow ornament */}
        <path d="M130 25 Q 145 15, 140 30 Z" fill="#d97706" />

        {/* Main Mast & Batten Sail (Buồm cánh dơi) */}
        <line x1="55" y1="45" x2="55" y2="-15" stroke="#78350f" strokeWidth="2.5" />
        <path
          d="M55 -15 C85 -5, 100 15, 95 35 C75 35, 60 25, 55 15 Z"
          fill="#ea580c"
          opacity="0.85"
        />
        {/* Battens */}
        <line x1="55" y1="-2" x2="88" y2="5" stroke="#fef08a" strokeWidth="1" />
        <line x1="55" y1="12" x2="92" y2="18" stroke="#fef08a" strokeWidth="1" />

        {/* "Sát Thát" / Grand Commander Banner */}
        <line x1="20" y1="40" x2="20" y2="5" stroke="#facc15" strokeWidth="1.5" />
        <polygon points="20,5 0,15 20,25" fill="#dc2626" />
      </g>
    </svg>
  );
}

/**
 * 8. BÁC HỒ TÌM ĐƯỜNG CỨU NƯỚC: Bến Nhà Rồng, Tàu Latouche-Tréville ra khơi, Sao dẫn đường
 */
export function BacHoCuuNuocVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bhSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="bhStarGlow" cx="75%" cy="25%" r="35%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#bhSky)" />
      <circle cx="300" cy="50" r="90" fill="url(#bhStarGlow)" />

      {/* Guide Star (Ngôi sao dẫn đường kim chỉ nam) */}
      <polygon
        points="300,32 304,46 318,50 304,54 300,68 296,54 282,50 296,46"
        fill="#fef08a"
        filter="drop-shadow(0 0 8px rgba(254,240,138,0.9))"
      />

      {/* Saigon River Waters at Night */}
      <rect x="0" y="170" width="400" height="70" fill="#032b43" opacity="0.8" />
      <line x1="30" y1="190" x2="160" y2="190" stroke="#38bdf8" strokeOpacity="0.3" strokeWidth="1" />
      <line x1="180" y1="205" x2="330" y2="205" stroke="#38bdf8" strokeOpacity="0.3" strokeWidth="1" />

      {/* Nha Rong Harbor Architecture (Bến cảng Nhà Rồng với đôi rồng chầu mặt trăng) */}
      <g transform="translate(25, 95)">
        {/* Harbor building body */}
        <rect x="10" y="35" width="130" height="42" fill="#7f1d1d" stroke="#991b1b" strokeWidth="1" />
        {/* Arches */}
        {Array.from({ length: 5 }).map((_, i) => (
          <path
            key={i}
            d={`M${25 + i * 22} 77 L${25 + i * 22} 55 C${25 + i * 22} 48, ${37 + i * 22} 48, ${37 + i * 22} 55 L${37 + i * 22} 77 Z`}
            fill="#18181b"
          />
        ))}
        {/* Roof with dragons on crest */}
        <polygon points="0,35 150,35 135,18 15,18" fill="#991b1b" stroke="#b91c1c" strokeWidth="1" />
        {/* Dragon silhouettes facing center sphere */}
        <circle cx="75" cy="14" r="4" fill="#facc15" />
        <path d="M50 18 Q 62 10, 70 14" stroke="#facc15" strokeWidth="2" fill="none" />
        <path d="M100 18 Q 88 10, 80 14" stroke="#facc15" strokeWidth="2" fill="none" />
      </g>

      {/* Steamship Amiral Latouche-Tréville sailing out to sea */}
      <g transform="translate(190, 115)">
        {/* Ship Hull */}
        <path
          d="M0 55 L160 55 L180 32 L40 32 L0 42 Z"
          fill="#18181b"
          stroke="#52525b"
          strokeWidth="1.5"
        />
        {/* Upper deck cabin */}
        <rect x="55" y="18" width="80" height="15" fill="#f4f4f5" stroke="#a1a1aa" strokeWidth="1" />
        {/* Portholes */}
        <circle cx="68" cy="25" r="2" fill="#eab308" />
        <circle cx="85" cy="25" r="2" fill="#eab308" />
        <circle cx="102" cy="25" r="2" fill="#eab308" />
        <circle cx="119" cy="25" r="2" fill="#eab308" />

        {/* Funnels with steam plume */}
        <rect x="75" y="0" width="10" height="18" fill="#dc2626" />
        <rect x="75" y="0" width="10" height="4" fill="#18181b" />
        <rect x="98" y="0" width="10" height="18" fill="#dc2626" />
        <rect x="98" y="0" width="10" height="4" fill="#18181b" />
        {/* White smoke trail drifting toward the star */}
        <path
          d="M80 -2 Q 70 -18, 50 -25"
          stroke="#e4e4e7"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M103 -2 Q 95 -18, 80 -25"
          stroke="#e4e4e7"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Bow Wave (Sóng rẽ mũi tàu) */}
        <path d="M180 48 Q 195 55, 175 60" stroke="#bae6fd" strokeWidth="2" fill="none" />
      </g>
    </svg>
  );
}

/**
 * 9. KHÁNG CHIẾN & QUÂN ĐỘI: Chiến khu Việt Bắc, Rừng nứa đại ngàn, Mũ nan sao vàng, Ngọn đuốc cách mạng
 */
export function KhangChienVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kcSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14532d" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#064e3b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="kcTorch" cx="65%" cy="60%" r="40%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#kcSky)" />
      <circle cx="260" cy="140" r="110" fill="url(#kcTorch)" />

      {/* Viet Bac Mountains & Bamboo Grove Silhouette */}
      <path
        d="M0 130 L70 80 L160 120 L240 75 L330 110 L400 90 L400 240 L0 240 Z"
        fill="#022c22"
        opacity="0.6"
      />
      {/* Bamboo trunks */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1={20 + i * 32}
          y1="70"
          x2={20 + i * 32}
          y2="230"
          stroke="#15803d"
          strokeOpacity="0.3"
          strokeWidth="3"
        />
      ))}

      {/* Marching Soldiers Silhouette with Pith Helmets & Golden Star */}
      <g transform="translate(60, 110)">
        {/* Soldier 1 */}
        <g transform="translate(0, 20)">
          <circle cx="20" cy="20" r="10" fill="#14532d" /> {/* Helmet */}
          <polygon points="20,13 21,17 25,17 22,19 23,23 20,21 17,23 18,19 15,17 19,17" fill="#facc15" />
          <path d="M12 30 L28 30 L26 70 L14 70 Z" fill="#0f172a" />
          {/* Rifle slung over shoulder */}
          <line x1="8" y1="20" x2="30" y2="60" stroke="#78350f" strokeWidth="3" />
        </g>

        {/* Soldier 2 (Leader with raised arm/torch) */}
        <g transform="translate(80, 0)">
          <circle cx="20" cy="20" r="11" fill="#14532d" />
          <polygon points="20,13 21,17 25,17 22,19 23,23 20,21 17,23 18,19 15,17 19,17" fill="#facc15" />
          <path d="M10 32 L30 32 L28 85 L12 85 Z" fill="#0f172a" />
        </g>

        {/* Soldier 3 holding Flag */}
        <g transform="translate(160, 10)">
          <circle cx="20" cy="20" r="10" fill="#14532d" />
          <polygon points="20,13 21,17 25,17 22,19 23,23 20,21 17,23 18,19 15,17 19,17" fill="#facc15" />
          <path d="M12 30 L28 30 L26 75 L14 75 Z" fill="#0f172a" />
          {/* Flagpole */}
          <line x1="28" y1="-45" x2="28" y2="70" stroke="#facc15" strokeWidth="2.5" />
          <polygon points="28,-45 85,-25 28,-5" fill="#dc2626" />
          <polygon points="46,-28 48,-23 53,-23 49,-20 51,-15 46,-18 41,-15 43,-20 39,-23 44,-23" fill="#facc15" />
        </g>
      </g>

      {/* Campfire / Revolutionary Torch Flare */}
      <g transform="translate(290, 155)">
        <polygon points="20,40 10,15 25,25 35,5 40,25 50,20 40,40" fill="#f97316" />
        <polygon points="25,40 18,22 28,30 34,15 38,30 42,40" fill="#facc15" />
      </g>
    </svg>
  );
}

/**
 * 10. GENERAL HISTORY: Trống đồng Đông Sơn, Cuốn sử vàng, Bút lông, Triện son Đại Việt
 */
export function GeneralHistoryVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ghSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#451a03" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#292524" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="ghGold" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#ghSky)" />
      <circle cx="200" cy="85" r="130" fill="url(#ghGold)" />

      {/* Massive Dong Son Sun & Drum Crest Center */}
      <g transform="translate(200, 85)" opacity="0.65">
        <circle cx="0" cy="0" r="70" stroke="#facc15" strokeWidth="2" fill="none" />
        <circle cx="0" cy="0" r="54" stroke="#facc15" strokeWidth="1" strokeDasharray="4 4" fill="none" />
        <circle cx="0" cy="0" r="38" stroke="#facc15" strokeWidth="1.5" fill="none" />
        <circle cx="0" cy="0" r="14" fill="#facc15" />
        {/* 12 Sun Rays */}
        {Array.from({ length: 12 }).map((_, i) => (
          <polygon
            key={i}
            points={`0,-14 4,-36 0,-38 -4,-36`}
            fill="#facc15"
            transform={`rotate(${i * 30})`}
          />
        ))}
        {/* Flying birds (Chim Lạc) */}
        {Array.from({ length: 4 }).map((_, i) => (
          <path
            key={i}
            d="M-5 -46 Q 0 -52, 10 -46"
            stroke="#fef08a"
            strokeWidth="1.5"
            fill="none"
            transform={`rotate(${i * 90 + 45})`}
          />
        ))}
      </g>

      {/* Golden History Book (Cuốn sử vàng dân tộc) */}
      <g transform="translate(125, 145)">
        {/* Left page */}
        <path d="M75 50 C40 45, 10 52, 0 65 L0 25 C10 12, 40 5, 75 10 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
        {/* Right page */}
        <path d="M75 50 C110 45, 140 52, 150 65 L150 25 C140 12, 110 5, 75 10 Z" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
        {/* Spine */}
        <line x1="75" y1="10" x2="75" y2="50" stroke="#92400e" strokeWidth="2.5" />

        {/* Text lines on book */}
        <line x1="15" y1="28" x2="60" y2="25" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="36" x2="55" y2="33" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="44" x2="58" y2="41" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />

        <line x1="90" y1="25" x2="135" y2="28" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="92" y1="33" x2="132" y2="36" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="90" y1="41" x2="134" y2="44" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />

        {/* Royal Vermilion Seal (Triện son Đại Việt) */}
        <rect x="110" y="42" width="18" height="18" rx="2" fill="#dc2626" opacity="0.8" />
        <rect x="113" y="45" width="12" height="12" stroke="#fef08a" strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}

/**
 * Main Historical Visual Selector Component
 */
export function HistoricalVisual({
  theme,
  className = "w-full h-full",
}: HistoricalVisualProps) {
  switch (theme) {
    case "ba-dinh-1945":
      return <BaDinh1945Visual className={className} />;
    case "dien-bien-phu":
      return <DienBienPhuVisual className={className} />;
    case "giai-phong-thu-do":
      return <GiaiPhongThuDoVisual className={className} />;
    case "thong-nhat-1975":
      return <ThongNhat1975Visual className={className} />;
    case "dong-da":
      return <DongDaVisual className={className} />;
    case "hai-ba-trung":
      return <HaiBaTrungVisual className={className} />;
    case "bach-dang":
      return <BachDangVisual className={className} />;
    case "bac-ho-cuu-nuoc":
      return <BacHoCuuNuocVisual className={className} />;
    case "khang-chien":
      return <KhangChienVisual className={className} />;
    case "general-history":
    default:
      return <GeneralHistoryVisual className={className} />;
  }
}
