"use client";

import React, { useEffect, useState } from "react";
import { getVietnamTodayEvent } from "@/lib/vietnamCalendar";
import {
  LionDanceHead,
  StarLantern,
  Mooncake,
  RedEnvelope,
  BanhChung,
  SilkFan,
  VietnamFlagRipple,
  PeaceDoves,
  FireworksBurst,
  ChimLacBird,
  NghiaLinhMountains,
  FloatingLotusLantern,
  AncientTempleBell,
  GraduationCap,
  FloralRosette,
  SilkRibbonBow,
  SpringButterfly,
  ChristmasPineTree,
  ChristmasGiftBox,
  CrystalSnowflake,
  JackOLantern,
  SpiderWebCorner,
  VelvetRose,
  LoveLetterEnvelope,
  SpinningPinwheel,
  ToastingChampagne,
  BirthdayCake,
} from "./HolidayCulturalVisuals";

import {
  getHolidayNavbarTheme,
  HolidayNavbarTheme,
  HolidayNavbarThemeId,
} from "@/data/holidayNavbarThemes";

/**
 * CINEMATIC LIVING NAVBAR SCENE ENGINE
 * Rich, multi-layered holiday scenes placed strictly in the background (z-[1]).
 * Designed to frame the navbar without ever obscuring or washing out interactive buttons or text.
 */

// 1. MID-AUTUMN (Tết Trung Thu) - Moonlit Asian Cinema (Dark Night, Restrained Atmosphere)
function MidAutumnScene() {
  return (
    <>
      {/* 1. Deep Celestial Night Sky Background (#05070D -> #0A1020 -> #111827) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #05070d 0%, #080c18 40%, #0d1222 75%, #111827 100%)",
          opacity: 0.88,
        }}
      />

      {/* 2. Very subtle horizon glow, barely brighter than background */}
      <div
        className="absolute inset-x-0 bottom-0 h-5 sm:h-6 pointer-events-none blur-[2px] cinema-anim"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(245, 158, 11, 0.10) 0%, rgba(30, 41, 59, 0.12) 50%, transparent 100%)",
          animation: "cinemaGlow 15s ease-in-out infinite",
        }}
      />

      {/* 3. Pagoda roofline & bamboo silhouette along bottom edge (dark silhouette, low opacity 0.22) */}
      <div className="absolute inset-x-0 bottom-0 h-5 sm:h-5.5 pointer-events-none opacity-[0.22] blur-[0.4px]">
        <svg viewBox="0 0 1000 26" className="w-full h-full" preserveAspectRatio="none" fill="#030712">
          <path d="M0,26 L0,18 Q40,16 80,18 Q120,20 160,14 Q200,6 240,14 L240,26 Z M340,26 L340,14 Q375,7 410,14 L410,26 Z M590,26 L590,16 Q635,9 680,16 L680,26 Z M795,26 L795,14 Q838,7 880,15 L880,26 Z" />
          <path d="M110,26 L112,11 L114,26 Z M115,26 L117,8 L119,26 Z M122,26 L123,13 L125,26 Z M520,26 L522,10 L524,26 Z M526,26 L528,7 L530,26 Z M730,26 L731,12 L733,26 Z M734,26 L736,9 L738,26 Z" />
        </svg>
      </div>

      {/* 4. Silky Night Clouds (Cloud drift 28s, 2-layer parallax) */}
      <div
        className="absolute -top-2 left-[-70px] w-[calc(100%+140px)] h-10 pointer-events-none cinema-anim opacity-20"
        style={{ animation: "cinemaCloudDrift 28s ease-in-out infinite alternate" }}
      >
        <svg viewBox="0 0 1000 40" className="w-full h-full" preserveAspectRatio="none" fill="none">
          <path
            d="M0,14 Q180,-4 360,16 T720,12 T1000,14 L1000,0 L0,0 Z"
            fill="rgba(51, 65, 85, 0.3)"
          />
        </svg>
      </div>
      <div
        className="absolute top-0 left-[-60px] w-[calc(100%+120px)] h-8 pointer-events-none cinema-anim opacity-15"
        style={{ animation: "cinemaCloudDriftSlow 34s ease-in-out infinite alternate 2s" }}
      >
        <svg viewBox="0 0 1000 32" className="w-full h-full" preserveAspectRatio="none" fill="none">
          <path
            d="M0,10 Q220,18 450,8 T900,16 T1000,10 L1000,0 L0,0 Z"
            fill="rgba(71, 85, 105, 0.22)"
          />
        </svg>
      </div>

      {/* 5. 2 sky lantern rise 40–60px with slight X drift */}
      {/* Sky Lantern 1 (Rise 22s) */}
      <div
        className="absolute top-2.5 left-[28%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaRise 22s ease-in-out infinite" }}
      >
        <div className="w-1.5 h-2 rounded-[1px] bg-gradient-to-t from-amber-400 to-amber-700 shadow-[0_0_5px_rgba(245,158,11,0.4)] opacity-55" />
      </div>
      {/* Sky Lantern 2 (Rise 26s, distant) */}
      <div
        className="absolute top-3 left-[74%] hidden sm:block pointer-events-none cinema-anim"
        style={{ animation: "cinemaRiseSlow 26s ease-in-out infinite 3.5s" }}
      >
        <div className="w-1 h-1.5 rounded-[1px] bg-gradient-to-t from-amber-300 to-amber-600 shadow-[0_0_4px_rgba(245,158,11,0.35)] opacity-45" />
      </div>

      {/* 6. 3 Dark silk lanterns sway ±5–7°, duration 5–7s, mỗi đèn lệch delay + Candle flicker 3s */}
      {/* Lantern 1 - Left Edge (Sway 5.5s, delay 0s, Candle flicker 3s) */}
      <div
        className="absolute top-0 left-[4.5%] flex flex-col items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 5.5s ease-in-out infinite", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2 bg-amber-500/40" />
        <div className="w-2.5 h-0.5 bg-amber-600/50 rounded-[1px]" />
        <div className="w-3.5 h-4.5 rounded-md bg-gradient-to-b from-red-950 via-rose-900 to-amber-950 shadow-[0_0_8px_rgba(185,28,28,0.35)] flex items-center justify-center border border-amber-600/30">
          <div className="w-1 h-1.5 rounded-full bg-amber-200/90 shadow-[0_0_5px_rgba(245,158,11,0.5)] cinema-anim" style={{ animation: "cinemaCandleFlicker 3s ease-in-out infinite" }} />
        </div>
        <div className="w-2 h-0.5 bg-amber-600/40 rounded-[1px]" />
        <div className="w-[1px] h-2 bg-amber-600/50" />
      </div>

      {/* Lantern 2 - Center Open Gap (Desktop) (Sway 6.8s, delay 0.7s, Candle flicker 3s) */}
      <div
        className="absolute top-0 left-[48%] hidden md:flex flex-col items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSwaySlow 6.8s ease-in-out infinite 0.7s", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-1.5 bg-amber-500/40" />
        <div className="w-2 h-0.5 bg-amber-600/50 rounded-[1px]" />
        <div className="w-3 h-4 rounded-md bg-gradient-to-b from-red-950 via-amber-950 to-amber-900 shadow-[0_0_6px_rgba(217,119,6,0.3)] flex items-center justify-center border border-amber-600/30">
          <div className="w-1 h-1.5 rounded-full bg-amber-200/85 shadow-[0_0_4px_rgba(245,158,11,0.4)] cinema-anim" style={{ animation: "cinemaCandleFlicker 3s ease-in-out infinite 0.4s" }} />
        </div>
        <div className="w-1.5 h-0.5 bg-amber-600/40 rounded-[1px]" />
        <div className="w-[1px] h-2 bg-amber-600/50" />
      </div>

      {/* Lantern 3 - Right Edge (Sway 6.2s, delay 1.4s, Candle flicker 3s) */}
      <div
        className="absolute top-0 right-[3.5%] flex flex-col items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 6.2s ease-in-out infinite 1.4s", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2 bg-amber-500/40" />
        <div className="w-2.5 h-0.5 bg-amber-600/50 rounded-[1px]" />
        <div className="w-3.5 h-4.5 rounded-md bg-gradient-to-b from-red-950 via-rose-900 to-amber-950 shadow-[0_0_8px_rgba(185,28,28,0.35)] flex items-center justify-center border border-amber-600/30">
          <div className="w-1 h-1.5 rounded-full bg-amber-200/90 shadow-[0_0_5px_rgba(245,158,11,0.5)] cinema-anim" style={{ animation: "cinemaCandleFlicker 3s ease-in-out infinite 0.2s" }} />
        </div>
        <div className="w-2 h-0.5 bg-amber-600/40 rounded-[1px]" />
        <div className="w-[1px] h-2 bg-amber-600/50" />
      </div>

      {/* 7. Moon: breathing scale 1 -> 1.03 (10s) */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 10s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          {/* Halo: scale 1 -> 1.08 + opacity 0.35 -> 0.55 */}
          <div
            className="absolute -top-1 w-20 h-16 rounded-full bg-amber-400/25 blur-xl pointer-events-none cinema-anim"
            style={{ animation: "cinemaHaloBreathe 10s ease-in-out infinite" }}
          />
          <div className="absolute w-12 h-12 rounded-full bg-yellow-100/15 blur-md pointer-events-none" />

          {/* Moon Disc */}
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full relative overflow-hidden shadow-[0_0_12px_rgba(251,191,36,0.45)] opacity-90"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #FFFBE8 0%, #FEF3C7 35%, #FDE68A 65%, #F59E0B 100%)",
            }}
          >
            {/* Crater details */}
            <div className="absolute top-1 left-2 w-2.5 h-1.8 rounded-full bg-amber-800/15 blur-[0.6px]" />
            <div className="absolute top-3.5 left-3.5 w-3 h-2 rounded-full bg-amber-800/18 blur-[0.6px]" />
          </div>
        </div>
      </div>

      {/* 8. CULTURAL SUPPORTING: Lion Dance Head (Đầu lân Trung Thu) */}
      <div
        className="absolute top-1 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 12s ease-in-out infinite", transformOrigin: "center center" }}
      >
        <LionDanceHead className="w-6 h-6 sm:w-7 sm:h-7 opacity-80 filter drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
      </div>

      {/* 9. CULTURAL SUPPORTING: Traditional Star Lantern (Đèn ông sao 5 cánh) */}
      <div
        className="absolute top-0 right-[18%] flex flex-col items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 6.5s ease-in-out infinite 0.5s", transformOrigin: "top center" }}
      >
        <StarLantern className="w-6 h-7 sm:w-7 sm:h-8 opacity-85 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
      </div>

      {/* 10. CULTURAL SUPPORTING: Embossed Mooncake (Bánh Trung Thu hoa sen) */}
      <div
        className="absolute top-2 right-[46%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 14s ease-in-out infinite 1s" }}
      >
        <Mooncake className="w-5 h-5 sm:w-6 sm:h-6 opacity-75 filter drop-shadow-[0_0_6px_rgba(217,119,6,0.45)]" />
      </div>

      {/* 8. Stars twinkle 4s: twinkle bằng opacity + scale 1 -> 1.35 */}
      <div
        className="absolute top-2 left-[20%] w-1 h-1 rounded-full bg-amber-200/70 shadow-[0_0_3px_#FDE047] opacity-60 cinema-anim"
        style={{ animation: "cinemaTwinkle 4s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3 left-[65%] w-1 h-1 rounded-full bg-yellow-200/70 shadow-[0_0_3px_#FEF08A] opacity-65 cinema-anim"
        style={{ animation: "cinemaTwinkle 4s ease-in-out infinite 1.5s" }}
      />
    </>
  );
}

// 2. TET (Tết Nguyên Đán) - Luxury Lunar New Year (Dark Burgundy + Black + Muted Gold)
function TetScene() {
  return (
    <>
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #070304 0%, #110508 50%, #18080d 100%)",
          opacity: 0.85,
        }}
      />

      {/* Palace wave border along bottom edge - muted gold, low opacity 0.15 */}
      <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none opacity-15 cinema-anim" style={{ animation: "cinemaGlow 14s ease-in-out infinite" }}>
        <svg viewBox="0 0 1000 16" className="w-full h-full" preserveAspectRatio="none" fill="none" stroke="#CA8A04" strokeWidth="1">
          <path d="M0,16 Q25,6 50,16 T100,16 T150,16 T200,16 T250,16 T300,16 T350,16 T400,16 T450,16 T500,16 T550,16 T600,16 T650,16 T700,16 T750,16 T800,16 T850,16 T900,16 T950,16 T1000,16" />
        </svg>
      </div>

      {/* Blossoming Mai & Đào Branch - dark silhouette with muted crimson/gold blossoms */}
      <div
        className="absolute -top-1 right-[30%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaSway 8.5s ease-in-out infinite", transformOrigin: "top right" }}
      >
        <svg viewBox="0 0 150 48" className="w-30 sm:w-36 h-auto opacity-75 filter drop-shadow-[0_2px_6px_rgba(159,18,57,0.4)]" fill="none">
          <path d="M150,0 Q120,10 90,16 T35,28 T0,38" stroke="#261005" strokeWidth="2" strokeLinecap="round" />
          <path d="M90,16 Q70,8 55,6" stroke="#261005" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="90" cy="16" r="4" fill="#9F1239" />
          <circle cx="90" cy="16" r="1.8" fill="#FDE047" />
          <circle cx="55" cy="6" r="4.5" fill="#BE123C" />
          <circle cx="55" cy="6" r="1.8" fill="#FEF08A" />
          <circle cx="35" cy="28" r="3.5" fill="#9F1239" />
          <circle cx="35" cy="28" r="1.5" fill="#FDE047" />
          <circle cx="110" cy="12" r="2" fill="#E11D48" />
          <circle cx="15" cy="18" r="3" fill="#BE123C" />
        </svg>
      </div>

      {/* Red Festive Silk Lanterns - dark burgundy body */}
      <div
        className="absolute top-0 left-[6%] flex flex-col items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 5.8s ease-in-out infinite", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2.5 bg-amber-600/60" />
        <div className="w-3.5 h-4.5 rounded-md bg-gradient-to-b from-red-950 via-rose-950 to-amber-950 shadow-[0_0_8px_rgba(159,18,57,0.4)] flex items-center justify-center border border-amber-600/30">
          <span className="inline-block text-[7.5px] text-yellow-300/85 font-bold cinema-anim" style={{ animation: "cinemaCandleFlicker 3s ease-in-out infinite" }}>福</span>
        </div>
        <div className="w-[1px] h-2 bg-amber-600/50" />
      </div>

      <div
        className="absolute top-0 right-[4%] flex flex-col items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 7.2s ease-in-out infinite 0.8s", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2.5 bg-amber-600/60" />
        <div className="w-3.5 h-4.5 rounded-md bg-gradient-to-b from-red-950 via-rose-950 to-amber-950 shadow-[0_0_8px_rgba(159,18,57,0.4)] flex items-center justify-center border border-amber-600/30">
          <span className="inline-block text-[7.5px] text-yellow-300/85 font-bold cinema-anim" style={{ animation: "cinemaCandleFlicker 3s ease-in-out infinite 0.4s" }}>春</span>
        </div>
        <div className="w-[1px] h-2 bg-amber-600/50" />
      </div>

      {/* CULTURAL SUPPORTING: Red Lucky Envelope (Bao lì xì may mắn) */}
      <div
        className="absolute top-1 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 7s ease-in-out infinite 0.3s", transformOrigin: "top center" }}
      >
        <RedEnvelope className="w-5 h-6 sm:w-6 sm:h-7 opacity-80 filter drop-shadow-[0_0_7px_rgba(220,38,38,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Square Bánh Chưng (Bánh chưng xanh buộc lạt tre) */}
      <div
        className="absolute top-2 right-[16%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 12s ease-in-out infinite 1s" }}
      >
        <BanhChung className="w-5 h-5 sm:w-6 sm:h-6 opacity-75 filter drop-shadow-[0_0_6px_rgba(22,101,52,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Silk Folding Fan (Quạt gấm ngày xuân) */}
      <div
        className="absolute top-2 right-[44%] hidden lg:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 14s ease-in-out infinite" }}
      >
        <SilkFan className="w-6 h-4 sm:w-7 sm:h-5 opacity-70 filter drop-shadow-[0_0_6px_rgba(190,18,60,0.35)]" />
      </div>

      {/* CULTURAL SUPPORTING: Midnight Fireworks Blossom */}
      <div
        className="absolute top-1 left-[38%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaTwinkle 4s ease-in-out infinite 0.5s" }}
      >
        <FireworksBurst className="w-5 h-5 opacity-70 filter drop-shadow-[0_0_6px_#FEF08A]" />
      </div>

      {/* Drifting blossom petals - faint, slow */}
      <div
        className="absolute top-1 left-[25%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaPetalFall 14s ease-in-out infinite" }}
      >
        <div className="w-2.5 h-1.5 rounded-full bg-rose-400 opacity-45 rotate-45 shadow-[0_0_3px_#FDA4AF]" />
      </div>
      <div
        className="absolute top-2 left-[60%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaPetalFall 18s ease-in-out infinite 2.5s" }}
      >
        <div className="w-2 h-1.2 rounded-full bg-pink-400 opacity-40 rotate-12 shadow-[0_0_3px_#FB7185]" />
      </div>

      {/* Floating gold dust & warm bokeh */}
      <div className="absolute top-1 right-[35%] w-20 h-14 rounded-full bg-red-950/30 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 11s ease-in-out infinite" }} />
      <div className="absolute top-2 left-[40%] w-1 h-1 rounded-full bg-yellow-300/70 shadow-[0_0_4px_#FDE047] opacity-50 cinema-anim" style={{ animation: "cinemaDrift 16s ease-in-out infinite" }} />
      <div className="absolute top-4 left-[75%] w-1 h-1 rounded-full bg-amber-300/70 shadow-[0_0_4px_#FEF08A] opacity-50 cinema-anim" style={{ animation: "cinemaDrift 19s ease-in-out infinite 1.8s" }} />
    </>
  );
}

// 3. NATIONAL DAY (Quốc Khánh 2/9, 30/4) - Elegant Patriotic Cinema (Deep Crimson + Black + Muted Gold)
function NationalDayScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #070203 0%, #120406 50%, #180508 100%)",
          opacity: 0.85,
        }}
      />
      {/* Soft golden rays, opacity 0.12 */}
      <div className="absolute inset-0 pointer-events-none opacity-12 cinema-anim" style={{ animation: "cinemaGlow 15s ease-in-out infinite" }}>
        <svg viewBox="0 0 1000 60" className="w-full h-full" preserveAspectRatio="none">
          <polygon points="500,0 420,60 580,60" fill="url(#natRayGrad)" />
          <polygon points="500,0 280,60 360,60" fill="url(#natRayGrad)" />
          <polygon points="500,0 640,60 720,60" fill="url(#natRayGrad)" />
          <defs>
            <linearGradient id="natRayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Dove silhouette very faint */}
      <div
        className="absolute top-3 left-[14%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 22s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 32 20" className="w-5 h-3 opacity-25 filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" fill="#FFFFFF">
          <path d="M0,8 Q12,2 20,0 Q16,8 24,10 Q28,11 32,9 Q24,15 16,14 Q8,18 0,8 Z" />
        </svg>
      </div>

      {/* 3D Faceted Golden Star - subtle size, muted gold */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 10s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-18 h-18 rounded-full bg-red-950/40 blur-xl cinema-anim" style={{ animation: "cinemaGlow 12s ease-in-out infinite" }} />
          <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 filter drop-shadow-[0_0_10px_rgba(217,119,6,0.65)] opacity-85">
            <polygon points="24,4 24,24 29.5,18.5" fill="#FDE047" />
            <polygon points="43,18 24,24 35.5,27.5" fill="#FDE047" />
            <polygon points="36,41 24,24 24,35" fill="#FDE047" />
            <polygon points="12,41 24,24 12.5,27.5" fill="#FDE047" />
            <polygon points="5,18 24,24 18.5,18.5" fill="#FDE047" />
            <polygon points="24,4 24,24 18.5,18.5" fill="#B45309" />
            <polygon points="43,18 24,24 29.5,18.5" fill="#B45309" />
            <polygon points="36,41 24,24 35.5,27.5" fill="#B45309" />
            <polygon points="12,41 24,24 24,35" fill="#B45309" />
            <polygon points="5,18 24,24 12.5,27.5" fill="#B45309" />
          </svg>
        </div>
      </div>

      {/* CULTURAL HERO/SUPPORTING: Waving Vietnam Flag SVG */}
      <div
        className="absolute top-1.5 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 13s ease-in-out infinite" }}
      >
        <VietnamFlagRipple className="w-7 h-5 sm:w-8 sm:h-5.5 opacity-85 filter drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
      </div>

      {/* CULTURAL SUPPORTING: Soaring Peace Doves */}
      <div
        className="absolute top-2 left-[34%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 20s ease-in-out infinite 1s" }}
      >
        <PeaceDoves className="w-6 h-4 sm:w-7 sm:h-5 opacity-70 filter drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Independence Fireworks Burst */}
      <div
        className="absolute top-1 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaTwinkle 4.5s ease-in-out infinite 0.8s" }}
      >
        <FireworksBurst className="w-6 h-6 opacity-75 filter drop-shadow-[0_0_8px_#FDE047]" />
      </div>

      {/* Tiny gold particles */}
      <div className="absolute top-2 left-[30%] w-1 h-1 rounded-full bg-yellow-400/70 shadow-[0_0_4px_#FDE047] opacity-50 cinema-anim" style={{ animation: "cinemaDrift 18s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[68%] w-1 h-1 rounded-full bg-amber-400/70 shadow-[0_0_4px_#F59E0B] opacity-50 cinema-anim" style={{ animation: "cinemaTwinkle 4.5s ease-in-out infinite 1.2s" }} />
    </>
  );
}

// 4. HUNG KINGS (Giỗ Tổ Hùng Vương) - Ancient Vietnamese Heritage (Dark Bronze + Black + Muted Gold)
function HungKingsScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060302 0%, #100803 50%, #170c05 100%)",
          opacity: 0.85,
        }}
      />
      {/* Concentric Đông Sơn drum frieze - very faint bronze */}
      <div
        className="absolute top-1 right-[35%] pointer-events-none cinema-anim opacity-22"
        style={{ animation: "cinemaBreathe 12s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-18 rounded-full bg-amber-950/40 blur-xl cinema-anim" style={{ animation: "cinemaGlow 15s ease-in-out infinite" }} />
          <svg viewBox="0 0 120 120" className="w-18 h-18 sm:w-20 sm:h-20 filter drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]">
            <circle cx="60" cy="60" r="56" stroke="#92400E" strokeWidth="1.2" fill="none" />
            <circle cx="60" cy="60" r="48" stroke="#78350F" strokeWidth="0.8" strokeDasharray="3 2" fill="none" />
            <circle cx="60" cy="60" r="38" stroke="#92400E" strokeWidth="1" fill="none" />
            <circle cx="60" cy="60" r="14" stroke="#B45309" strokeWidth="1.2" fill="none" />
            <polygon
              points="60,46 62,56 71,51 65,58 74,60 65,62 71,69 62,64 60,74 58,64 49,69 55,62 46,60 55,58 49,51 58,56"
              fill="#B45309"
            />
          </svg>
        </div>
      </div>

      {/* CULTURAL SUPPORTING: Soaring Chim Lạc Bird */}
      <div
        className="absolute top-2 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 16s ease-in-out infinite" }}
      >
        <ChimLacBird className="w-8 h-4 sm:w-9 sm:h-5 opacity-75 filter drop-shadow-[0_0_6px_rgba(217,119,6,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Nghĩa Lĩnh Sacred Mountains */}
      <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none opacity-25">
        <NghiaLinhMountains className="w-full h-full" />
      </div>

      {/* Sacred torch embers & flame */}
      <div
        className="absolute top-2 left-[25%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaRise 13s ease-in-out infinite" }}
      >
        <div className="w-1 h-1 rounded-full bg-amber-500/70 shadow-[0_0_5px_#F59E0B] opacity-55" />
      </div>
      <div className="absolute top-2 left-[48%] hidden md:flex w-1.5 h-1.5 rounded-full bg-amber-500/80 shadow-[0_0_6px_#D97706] cinema-anim opacity-60" style={{ animation: "cinemaFlicker 3.8s ease-in-out infinite" }} />
      <div className="absolute top-4 left-[65%] w-1 h-1 rounded-full bg-yellow-400/60 shadow-[0_0_4px_#FBBF24] opacity-50 cinema-anim" style={{ animation: "cinemaDrift 18s ease-in-out infinite 1s" }} />
    </>
  );
}

// 5. CHRISTMAS (Giáng Sinh Noel) - Luxury Winter Cinema (Midnight Blue + Black + Warm Amber)
function ChristmasScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #03060f 0%, #060c1c 50%, #091326 100%)",
          opacity: 0.85,
        }}
      />
      {/* Pine garland silhouette along top edge */}
      <div className="absolute inset-x-0 top-0 h-3 pointer-events-none opacity-25 cinema-anim" style={{ animation: "cinemaSway 10s ease-in-out infinite", transformOrigin: "top center" }}>
        <svg viewBox="0 0 1000 12" className="w-full h-full" preserveAspectRatio="none" fill="none" stroke="#064e3b" strokeWidth="2">
          <path d="M0,0 Q30,8 60,0 T120,0 T180,0 T240,0 T300,0 T360,0 T420,0 T480,0 T540,0 T600,0 T660,0 T720,0 T780,0 T840,0 T900,0 T960,0 T1000,0" />
        </svg>
      </div>

      {/* Warm fairy lights along garland */}
      <div className="absolute top-1 left-[28%] w-1 h-1 rounded-full bg-amber-300/80 shadow-[0_0_4px_#FDE047] opacity-65 cinema-anim" style={{ animation: "cinemaTwinkle 3.2s ease-in-out infinite" }} />
      <div className="absolute top-1 left-[52%] hidden md:block w-1 h-1 rounded-full bg-emerald-300/70 shadow-[0_0_4px_#34D399] opacity-60 cinema-anim" style={{ animation: "cinemaTwinkle 3.8s ease-in-out infinite 1.2s" }} />
      <div className="absolute top-1 left-[76%] w-1 h-1 rounded-full bg-amber-300/80 shadow-[0_0_4px_#FDE047] opacity-65 cinema-anim" style={{ animation: "cinemaTwinkle 3.5s ease-in-out infinite 0.6s" }} />

      {/* Hanging Bells on edges - muted gold */}
      <div
        className="absolute top-0 left-[6%] flex flex-col items-center pointer-events-none cinema-anim opacity-65"
        style={{ animation: "cinemaSway 7s ease-in-out infinite", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2.5 bg-amber-600/50" />
        <svg viewBox="0 0 16 16" className="w-3 h-3 filter drop-shadow-[0_0_5px_rgba(217,119,6,0.6)]" fill="#D97706">
          <path d="M8,1 C5,1 4,4 4,8 L2,12 L14,12 L12,8 C12,4 11,1 8,1 Z M8,15 A2,2 0 0,0 10,13 L6,13 A2,2 0 0,0 8,15 Z" />
        </svg>
      </div>

      <div
        className="absolute top-0 right-[4%] flex flex-col items-center pointer-events-none cinema-anim opacity-65"
        style={{ animation: "cinemaSway 8.2s ease-in-out infinite 0.6s", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2.5 bg-amber-600/50" />
        <svg viewBox="0 0 16 16" className="w-3 h-3 filter drop-shadow-[0_0_5px_rgba(217,119,6,0.6)]" fill="#D97706">
          <path d="M8,1 C5,1 4,4 4,8 L2,12 L14,12 L12,8 C12,4 11,1 8,1 Z M8,15 A2,2 0 0,0 10,13 L6,13 A2,2 0 0,0 8,15 Z" />
        </svg>
      </div>

      {/* Bethlehem Star - small, subtle, soft halo */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 10s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-14 rounded-full bg-amber-400/10 blur-xl cinema-anim" style={{ animation: "cinemaGlow 8s ease-in-out infinite" }} />
          <svg viewBox="0 0 48 56" className="w-7 h-9 sm:w-8 sm:h-10 opacity-80 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
            <path d="M24,0 L27,20 L48,24 L27,28 L24,56 L21,28 L0,24 L21,20 Z" fill="#FDE047" />
            <path d="M24,12 L26,22 L36,24 L26,26 L24,36 L22,26 L12,24 L22,22 Z" fill="#FEF08A" />
          </svg>
        </div>
      </div>

      {/* CULTURAL SUPPORTING: Christmas Pine Tree (Cây thông Noel) */}
      <div
        className="absolute top-0 right-[34%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 12s ease-in-out infinite" }}
      >
        <ChristmasPineTree className="w-6 h-7 sm:w-7 sm:h-8 opacity-85 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Christmas Gift Box (Hộp quà Noel) */}
      <div
        className="absolute top-2 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 13s ease-in-out infinite" }}
      >
        <ChristmasGiftBox className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 filter drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Crystal Snowflake (Bông tuyết pha lê) */}
      <div
        className="absolute top-2 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaTwinkle 4s ease-in-out infinite 0.7s" }}
      >
        <CrystalSnowflake className="w-5 h-5 sm:w-6 sm:h-6 opacity-75 filter drop-shadow-[0_0_6px_#BAE6FD]" />
      </div>

      {/* Faint snowfall - subtle fine dots (multi-layer slower fall) */}
      <div className="absolute top-0 left-[20%] w-1 h-1 rounded-full bg-sky-200 shadow-[0_0_3px_#BAE6FD] opacity-45 cinema-anim" style={{ animation: "cinemaSnowFall 12s linear infinite" }} />
      <div className="absolute top-0 left-[42%] w-1 h-1 rounded-full bg-sky-100 shadow-[0_0_3px_#E0F2FE] opacity-40 cinema-anim" style={{ animation: "cinemaSnowFallSlow 18s linear infinite 2s" }} />
      <div className="absolute top-1 left-[65%] w-1 h-1 rounded-full bg-white shadow-[0_0_3px_#FFFFFF] opacity-50 cinema-anim" style={{ animation: "cinemaSnowFall 15s linear infinite 4s" }} />
    </>
  );
}

// 6. HALLOWEEN - Dark Fantasy Cinema (Black + Deep Purple + Burnt Orange)
function HalloweenScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #050208 0%, #0c0514 50%, #13081e 100%)",
          opacity: 0.85,
        }}
      />
      {/* Bare gnarled tree branch silhouette */}
      <div className="absolute top-0 left-0 w-24 h-9 pointer-events-none opacity-22 cinema-anim" style={{ animation: "cinemaSway 9.5s ease-in-out infinite", transformOrigin: "top left" }}>
        <svg viewBox="0 0 120 40" className="w-full h-full" fill="none" stroke="#2e1065" strokeWidth="1.8">
          <path d="M0,0 Q30,15 60,18 T100,25" />
          <path d="M30,15 Q45,25 65,30" />
        </svg>
      </div>

      {/* Mist drift across - 100px drift */}
      <div className="absolute inset-x-0 bottom-0 h-5 pointer-events-none opacity-18 cinema-anim" style={{ animation: "cinemaFogDrift 24s ease-in-out infinite alternate" }}>
        <svg viewBox="0 0 1000 24" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,20 Q200,6 400,16 T800,8 T1000,18 L1000,24 L0,24 Z" fill="rgba(88,28,135,0.4)" />
        </svg>
      </div>

      {/* Bat silhouette - tiny and slow */}
      <div className="absolute top-2 left-[15%] pointer-events-none cinema-anim" style={{ animation: "cinemaFloat 24s ease-in-out infinite" }}>
        <svg viewBox="0 0 24 12" className="w-3.5 h-1.8 opacity-35 fill-purple-950">
          <path d="M0,6 Q6,0 12,5 Q18,0 24,6 Q18,8 12,7 Q6,8 0,6 Z" />
        </svg>
      </div>

      {/* Crescent Harvest Moon - burnt orange/amber, soft purple halo */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 11s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-18 h-18 rounded-full bg-purple-950/40 blur-xl cinema-anim" style={{ animation: "cinemaGlow 12s ease-in-out infinite" }} />
          <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 filter drop-shadow-[0_0_8px_rgba(194,65,12,0.65)] opacity-85">
            <path
              d="M32,6 C19,6 8,17 8,30 C8,38 12,44 18,48 C14,43 12,36 12,30 C12,18 20,9 32,6 Z"
              fill="url(#halGrad)"
            />
            <defs>
              <linearGradient id="halGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="60%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#9A3412" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* CULTURAL HERO/SUPPORTING: Glowing Jack-o'-lantern Pumpkin */}
      <div
        className="absolute top-1 right-[32%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 10s ease-in-out infinite" }}
      >
        <JackOLantern className="w-6 h-6 sm:w-7 sm:h-7 opacity-85 filter drop-shadow-[0_0_9px_rgba(234,88,12,0.6)]" />
      </div>

      {/* CULTURAL SUPPORTING: Spider Web in Corner */}
      <div className="absolute top-0 left-0 pointer-events-none opacity-40">
        <SpiderWebCorner className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      {/* Pumpkin embers & flame */}
      <div
        className="absolute top-3 left-[32%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaRise 13s ease-in-out infinite" }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500/80 shadow-[0_0_6px_#EA580C] opacity-70" />
      </div>
      <div className="absolute top-3 left-[46%] hidden md:flex w-1.5 h-1.5 rounded-full bg-orange-600/90 shadow-[0_0_6px_#C2410C] cinema-anim opacity-75" style={{ animation: "cinemaCandleFlicker 3.2s ease-in-out infinite" }} />
    </>
  );
}

// 7. VALENTINE - Dark Romantic Cinema (Black + Deep Burgundy + Dark Rose)
function ValentineScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #070204 0%, #110408 50%, #17060d 100%)",
          opacity: 0.85,
        }}
      />
      {/* Soft dark rose bokeh */}
      <div className="absolute top-1 right-[35%] w-20 h-14 rounded-full bg-rose-950/25 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 10s ease-in-out infinite" }} />

      {/* Intertwined Heart Silhouettes - subdued, elegant */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 11s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-10 rounded-full bg-rose-900/15 blur-lg cinema-anim" style={{ animation: "cinemaBreathe 10s ease-in-out infinite" }} />
          <svg viewBox="0 0 54 44" className="w-8 h-7 sm:w-9 sm:h-8 filter drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]" fill="none">
            <path
              d="M22,12 C18,4 8,4 4,12 C-2,23 11,33 22,40 C33,33 46,23 40,12 C36,4 26,4 22,12 Z"
              stroke="#BE123C"
              strokeWidth="1.4"
              fill="rgba(159,18,57,0.12)"
            />
            <path
              d="M38,8 C35,2 27,2 24,8 C19,16 29,24 38,30 C47,24 57,16 52,8 C49,2 41,2 38,8 Z"
              stroke="#E11D48"
              strokeWidth="1.2"
              fill="rgba(190,18,60,0.08)"
            />
          </svg>
        </div>
      </div>
{/* CULTURAL SUPPORTING: Velvet Red Rose (Hoa hồng nhung) */}
      <div
        className="absolute top-1 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 12s ease-in-out infinite" }}
      >
        <VelvetRose className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 filter drop-shadow-[0_0_6px_rgba(190,18,60,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Love Letter Envelope (Thư tình) */}
      <div
        className="absolute top-2 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 15s ease-in-out infinite 1s" }}
      >
        <LoveLetterEnvelope className="w-6 h-4 sm:w-7 sm:h-5 opacity-75 filter drop-shadow-[0_0_6px_rgba(244,114,182,0.35)]" />
      </div>

      <div className="absolute top-2 left-[24%] w-1 h-1 rounded-full bg-rose-300/60 shadow-[0_0_4px_#FB7185] opacity-45 cinema-anim" style={{ animation: "cinemaDrift 16s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[62%] w-1 h-1 rounded-full bg-pink-300/50 shadow-[0_0_4px_#FDA4AF] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 19s ease-in-out infinite 2s" }} />
    </>
  );
}

// 8. WOMEN & FAMILY (8/3, 20/10) - Dark Plum + Burgundy + Muted Champagne
function WomenFamilyScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #080307 0%, #120510 50%, #190815 100%)",
          opacity: 0.85,
        }}
      />
      {/* Subtle floral silhouette with champagne & rose accent */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaSway 11s ease-in-out infinite", transformOrigin: "center center" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-12 rounded-full bg-pink-950/25 blur-xl cinema-anim" style={{ animation: "cinemaGlow 10s ease-in-out infinite" }} />
          <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 filter drop-shadow-[0_0_8px_rgba(217,119,6,0.35)]" fill="none">
            <circle cx="24" cy="24" r="3.5" fill="#CA8A04" />
            <path d="M24,13 C27,16 27,21 24,24 C21,21 21,16 24,13 Z" fill="rgba(190,24,93,0.3)" stroke="#BE185D" strokeWidth="0.8" />
            <path d="M35,24 C32,27 27,27 24,24 C27,21 32,21 35,24 Z" fill="rgba(190,24,93,0.3)" stroke="#BE185D" strokeWidth="0.8" />
            <path d="M24,35 C21,32 21,27 24,24 C27,27 27,32 24,35 Z" fill="rgba(190,24,93,0.3)" stroke="#BE185D" strokeWidth="0.8" />
            <path d="M13,24 C16,21 21,21 24,24 C21,27 16,27 13,24 Z" fill="rgba(190,24,93,0.3)" stroke="#BE185D" strokeWidth="0.8" />
            <circle cx="24" cy="24" r="14" stroke="#A16207" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6" />
          </svg>
        </div>
      </div>
      {/* CULTURAL SUPPORTING: Silk Ribbon Bow (Dải lụa thắt nơ) */}
      <div
        className="absolute top-2 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 14s ease-in-out infinite" }}
      >
        <SilkRibbonBow className="w-6 h-4 sm:w-7 sm:h-5 opacity-75 filter drop-shadow-[0_0_6px_rgba(236,72,153,0.35)]" />
      </div>

      {/* CULTURAL SUPPORTING: Spring Butterfly (Bướm mùa xuân) */}
      <div
        className="absolute top-2 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 10s ease-in-out infinite 1s" }}
      >
        <SpringButterfly className="w-5 h-4 sm:w-6 sm:h-5 opacity-75 filter drop-shadow-[0_0_5px_rgba(244,114,182,0.35)]" />
      </div>

      {/* Drifting floral petals - very subtle */}
      <div className="absolute top-1 left-[22%] pointer-events-none cinema-anim" style={{ animation: "cinemaPetalFall 16s ease-in-out infinite" }}>
        <div className="w-2 h-1 rounded-full bg-rose-400 opacity-35 rotate-45 shadow-[0_0_2px_#FB7185]" />
      </div>
      <div className="absolute top-2 left-[58%] pointer-events-none cinema-anim" style={{ animation: "cinemaPetalFall 20s ease-in-out infinite 2s" }}>
        <div className="w-1.5 h-0.8 rounded-full bg-pink-400 opacity-30 rotate-12 shadow-[0_0_2px_#F472B6]" />
      </div>
      <div className="absolute top-2 left-[38%] w-1 h-1 rounded-full bg-amber-300/60 shadow-[0_0_3px_#CA8A04] opacity-45 cinema-anim" style={{ animation: "cinemaDrift 18s ease-in-out infinite" }} />
      <div className="absolute top-4 left-[72%] w-1 h-1 rounded-full bg-pink-300/50 shadow-[0_0_3px_#FDA4AF] opacity-40 cinema-anim" style={{ animation: "cinemaTwinkle 5s ease-in-out infinite 1s" }} />
    </>
  );
}

// 9. EDUCATION / TEACHERS (20/11) - Dark Brown + Amber + Black
function EducationScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060402 0%, #0d0905 50%, #140d07 100%)",
          opacity: 0.85,
        }}
      />
      {/* Warm desk lamp glow */}
      <div className="absolute top-1 right-[35%] w-24 h-14 rounded-full bg-amber-950/30 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 11s ease-in-out infinite" }} />

      {/* Book & Feather Quill Silhouette */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 14s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 48 42" className="w-8 h-7 sm:w-9 sm:h-8 filter drop-shadow-[0_0_8px_rgba(217,119,6,0.4)]" fill="none">
            <path
              d="M24,14 C18,9 9,9 3,12 L3,36 C9,33 18,33 24,38 C30,33 39,33 45,36 L45,12 C39,9 30,9 24,14 Z"
              stroke="#CA8A04"
              strokeWidth="1.3"
              fill="rgba(180,83,9,0.12)"
            />
            <path d="M24,14 L24,38" stroke="#CA8A04" strokeWidth="1.3" />
            <path d="M28,8 Q35,2 38,0 Q36,6 30,12" stroke="#EAB308" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
          </svg>
        </div>
      </div>
{/* CULTURAL SUPPORTING: Graduation Cap (Mũ cử nhân) */}
      <div
        className="absolute top-2 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 13s ease-in-out infinite" }}
      >
        <GraduationCap className="w-6 h-4 sm:w-7 sm:h-5 opacity-75 filter drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Floral Rosette (Hoa điểm 10 tri ân thầy cô) */}
      <div
        className="absolute top-2 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 11s ease-in-out infinite 0.5s" }}
      >
        <FloralRosette className="w-5 h-5 sm:w-6 sm:h-6 opacity-75 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
      </div>

      <div className="absolute top-2 left-[30%] w-1 h-1 rounded-full bg-amber-300/60 shadow-[0_0_3px_#F59E0B] opacity-45 cinema-anim" style={{ animation: "cinemaDrift 20s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[62%] w-1 h-1 rounded-full bg-yellow-300/50 shadow-[0_0_3px_#FEF08A] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 24s ease-in-out infinite 2s" }} />
    </>
  );
}

// 10. MILITARY / VETERANS (27/7, 22/12) - Deep Red + Black + Bronze (Restrained, No Fireworks)
function MilitaryScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060202 0%, #0e0404 50%, #140706 100%)",
          opacity: 0.85,
        }}
      />
      {/* Subtle atmospheric golden rays - very muted 0.08 */}
      <div className="absolute inset-0 pointer-events-none opacity-8 cinema-anim" style={{ animation: "cinemaGlow 18s ease-in-out infinite" }}>
        <svg viewBox="0 0 1000 60" className="w-full h-full" preserveAspectRatio="none">
          <polygon points="500,0 450,60 550,60" fill="#CA8A04" />
          <polygon points="500,0 340,60 390,60" fill="#CA8A04" />
          <polygon points="500,0 610,60 660,60" fill="#CA8A04" />
        </svg>
      </div>

      {/* Restrained Star Emblem */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 12s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-12 rounded-full bg-red-950/25 blur-xl cinema-anim" style={{ animation: "cinemaGlow 14s ease-in-out infinite" }} />
          <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 filter drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]" fill="none">
            <circle cx="24" cy="24" r="16" stroke="#92400E" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
            <polygon
              points="24,12 26.5,20 35,20 28,25 30.5,33 24,28 17.5,33 20,25 13,20 21.5,20"
              fill="rgba(180,83,9,0.25)"
              stroke="#D97706"
              strokeWidth="0.9"
            />
          </svg>
        </div>
      </div>
      <div className="absolute top-2 left-[28%] w-1 h-1 rounded-full bg-amber-400/60 shadow-[0_0_3px_#CA8A04] opacity-45 cinema-anim" style={{ animation: "cinemaDrift 22s ease-in-out infinite" }} />
      <div className="absolute top-4 left-[64%] w-1 h-1 rounded-full bg-yellow-300/50 shadow-[0_0_3px_#F59E0B] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 26s ease-in-out infinite 3s" }} />
    </>
  );
}

// 11. LABOR DAY (1/5) - Dark Bronze / Dawn + Deep Amber + Black
function LaborScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060302 0%, #0d0803 50%, #160d05 100%)",
          opacity: 0.85,
        }}
      />
      {/* Subtle dawn aura */}
      <div className="absolute top-1 right-[35%] w-20 h-14 rounded-full bg-amber-950/25 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 12s ease-in-out infinite" }} />

      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 15s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 60 40" className="w-9 h-6 sm:w-11 sm:h-7 filter drop-shadow-[0_0_8px_rgba(217,119,6,0.4)]">
            <line x1="6" y1="35" x2="54" y2="35" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M20,35 A10,10 0 0,1 40,35 Z" fill="rgba(217,119,6,0.3)" stroke="#D97706" strokeWidth="0.8" />
            <line x1="30" y1="16" x2="30" y2="8" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="20" y1="20" x2="14" y2="14" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="40" y1="20" x2="46" y2="14" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="absolute top-2 left-[26%] w-1 h-1 rounded-full bg-yellow-300/60 shadow-[0_0_3px_#CA8A04] opacity-45 cinema-anim" style={{ animation: "cinemaDrift 18s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[62%] w-1 h-1 rounded-full bg-amber-400/50 shadow-[0_0_3px_#D97706] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 22s ease-in-out infinite 2s" }} />
    </>
  );
}

// 12. CHILDREN / YOUTH (1/6, 26/3) - Midnight Blue + Dark Cyan + Black
function YouthScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #02060a 0%, #050d15 50%, #081420 100%)",
          opacity: 0.85,
        }}
      />
      <div className="absolute top-1 right-[35%] w-20 h-14 rounded-full bg-sky-950/25 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 10s ease-in-out infinite" }} />

      {/* Subtle kite silhouette */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 16s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 48 44" className="w-8 h-7 sm:w-9 sm:h-8 filter drop-shadow-[0_0_8px_rgba(2,132,199,0.35)]" fill="none">
            <polygon points="24,6 38,20 24,34 10,20" fill="rgba(3,105,161,0.15)" stroke="#0284C7" strokeWidth="1.2" />
            <line x1="24" y1="6" x2="24" y2="34" stroke="#0369A1" strokeWidth="0.8" />
            <line x1="10" y1="20" x2="38" y2="20" stroke="#0369A1" strokeWidth="0.8" />
            <path d="M24,34 Q28,40 22,44" stroke="#0284C7" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      </div>
      {/* CULTURAL SUPPORTING: Spinning Pinwheel (Chong chóng tuổi thơ) */}
      <div
        className="absolute top-0 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 5s ease-in-out infinite", transformOrigin: "bottom center" }}
      >
        <SpinningPinwheel className="w-5 h-6 sm:w-6 sm:h-7 opacity-80 filter drop-shadow-[0_0_6px_rgba(59,130,246,0.35)]" />
      </div>

      {/* Translucent soap bubbles - subtle and low-opacity */}
      <div className="absolute top-2 left-[24%] w-2.5 h-2.5 rounded-full border border-sky-400/30 bg-sky-500/5 shadow-[0_0_4px_rgba(56,189,248,0.25)] cinema-anim opacity-50" style={{ animation: "cinemaFloat 14s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[60%] w-2 h-2 rounded-full border border-sky-400/25 bg-sky-500/5 shadow-[0_0_4px_rgba(56,189,248,0.2)] cinema-anim opacity-45" style={{ animation: "cinemaFloat 17s ease-in-out infinite 2.5s" }} />
      <div className="absolute top-2 left-[44%] w-1 h-1 rounded-full bg-sky-300/50 shadow-[0_0_3px_#38BDF8] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 18s ease-in-out infinite" }} />
    </>
  );
}

// 13. EARTH / ENVIRONMENT - Dark Emerald + Deep Blue + Black
function EarthScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #020705 0%, #05120c 50%, #091a11 100%)",
          opacity: 0.85,
        }}
      />
      <div className="absolute top-1 right-[35%] w-20 h-14 rounded-full bg-emerald-950/30 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 14s ease-in-out infinite" }} />

      {/* Leaf Silhouette */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaSway 10s ease-in-out infinite", transformOrigin: "bottom center" }}
      >
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 filter drop-shadow-[0_0_8px_rgba(5,150,105,0.4)]" fill="none">
            <path
              d="M12,38 C12,18 26,10 38,10 C38,30 24,38 12,38 Z"
              fill="rgba(5,150,105,0.15)"
              stroke="#059669"
              strokeWidth="1.3"
            />
            <path d="M12,38 Q24,24 38,10" stroke="#10B981" strokeWidth="0.8" opacity="0.6" />
            <path
              d="M16,30 C20,18 30,16 34,16 C32,24 24,28 16,30 Z"
              fill="rgba(4,120,87,0.12)"
              stroke="#047857"
              strokeWidth="0.8"
            />
          </svg>
        </div>
      </div>
      {/* Bioluminescent dots - soft rising & drifting */}
      <div className="absolute top-3 left-[46%] hidden md:flex pointer-events-none cinema-anim" style={{ animation: "cinemaRise 16s ease-in-out infinite" }}>
        <div className="w-1 h-1 rounded-full bg-emerald-400/60 shadow-[0_0_4px_#10B981] opacity-50" />
      </div>
      <div className="absolute top-2 left-[28%] w-1 h-1 rounded-full bg-emerald-300/50 shadow-[0_0_4px_#34D399] opacity-45 cinema-anim" style={{ animation: "cinemaDrift 20s ease-in-out infinite" }} />
      <div className="absolute top-4 left-[64%] w-1 h-1 rounded-full bg-teal-300/40 shadow-[0_0_3px_#2DD4BF] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 24s ease-in-out infinite 3s" }} />
    </>
  );
}

// 14. TRADITIONAL / SPIRITUAL - Dark Amber + Black + Deep Brown (Zen, Slow)
function SpiritualScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060402 0%, #0d0904 50%, #150e06 100%)",
          opacity: 0.85,
        }}
      />
      {/* Incense mist drift across top - very faint */}
      <div className="absolute inset-x-0 top-0 h-5 pointer-events-none opacity-12 cinema-anim" style={{ animation: "cinemaCloudDrift 28s ease-in-out infinite alternate" }}>
        <svg viewBox="0 0 1000 20" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,10 Q250,3 500,14 T1000,8 L1000,0 L0,0 Z" fill="rgba(180,83,9,0.2)" />
        </svg>
      </div>

      {/* Hanging Zen Lantern / Tassel */}
      <div
        className="absolute top-0 left-[6%] flex flex-col items-center pointer-events-none cinema-anim opacity-65"
        style={{ animation: "cinemaSway 9s ease-in-out infinite", transformOrigin: "top center" }}
      >
        <div className="w-[1px] h-2 bg-amber-700/60" />
        <div className="w-2.5 h-3 rounded-sm bg-gradient-to-b from-amber-900 to-amber-950 shadow-[0_0_6px_rgba(180,83,9,0.3)] border border-amber-700/30" />
        <div className="w-[1px] h-2 bg-amber-700/50" />
      </div>

      {/* CULTURAL SUPPORTING: Floating Lotus Lantern (Hoa đăng cầu an) */}
      <div
        className="absolute top-1 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 15s ease-in-out infinite" }}
      >
        <FloatingLotusLantern className="w-6 h-5 sm:w-7 sm:h-6 opacity-80 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: Ancient Temple Bronze Bell (Chuông đồng cổ) */}
      <div
        className="absolute top-0 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaLanternSway 8s ease-in-out infinite 0.7s", transformOrigin: "top center" }}
      >
        <AncientTempleBell className="w-5 h-6 sm:w-6 sm:h-7 opacity-75 filter drop-shadow-[0_0_6px_rgba(180,83,9,0.4)]" />
      </div>

      {/* Sacred Golden Lotus Bloom */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 13s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-18 h-14 rounded-full bg-amber-950/25 blur-xl cinema-anim" style={{ animation: "cinemaGlow 20s ease-in-out infinite" }} />
          <svg viewBox="0 0 52 44" className="w-8 h-7 sm:w-10 sm:h-8 filter drop-shadow-[0_0_8px_rgba(180,83,9,0.45)]" fill="none">
            <path
              d="M26,10 C22,18 22,25 26,32 C30,25 30,18 26,10 Z"
              fill="rgba(180,83,9,0.18)"
              stroke="#CA8A04"
              strokeWidth="1.2"
            />
            <path
              d="M26,32 C17,27 12,20 15,15 C19,18 22,25 26,32 Z"
              fill="rgba(146,64,14,0.12)"
              stroke="#B45309"
              strokeWidth="1"
            />
            <path
              d="M26,32 C35,27 40,20 37,15 C33,18 30,25 26,32 Z"
              fill="rgba(146,64,14,0.12)"
              stroke="#B45309"
              strokeWidth="1"
            />
            <path d="M10,34 Q26,39 42,34" stroke="#A16207" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      </div>
      <div className="absolute top-2 left-[30%] w-1 h-1 rounded-full bg-amber-400/50 shadow-[0_0_3px_#CA8A04] opacity-45 cinema-anim" style={{ animation: "cinemaRiseSlow 24s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[62%] w-1 h-1 rounded-full bg-yellow-300/40 shadow-[0_0_3px_#D97706] opacity-40 cinema-anim" style={{ animation: "cinemaDrift 28s ease-in-out infinite 2s" }} />
    </>
  );
}

// 15. NEW YEAR (1/1, 31/12) - Midnight Blue/Black + Champagne Gold (No Big Fireworks)
function NewYearScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #03050a 0%, #070c16 50%, #0c1424 100%)",
          opacity: 0.85,
        }}
      />
      {/* Distant soft champagne bokeh */}
      <div className="absolute top-1 left-[45%] hidden md:flex w-20 h-14 rounded-full bg-amber-950/20 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 11s ease-in-out infinite" }} />

      {/* Midnight Champagne Starburst - small, refined */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaStarburst 18s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-12 rounded-full bg-amber-950/25 blur-xl cinema-anim" style={{ animation: "cinemaGlow 10s ease-in-out infinite" }} />
          <svg viewBox="0 0 48 48" className="w-7 h-7 sm:w-8 sm:h-8 filter drop-shadow-[0_0_8px_rgba(202,138,4,0.45)]">
            <polygon
              points="24,4 26,19 40,14 28,23 42,24 28,25 40,34 26,29 24,44 22,29 8,34 20,25 6,24 20,23 8,14 22,19"
              fill="#CA8A04"
              opacity="0.8"
            />
            <circle cx="24" cy="24" r="2" fill="#FEF08A" />
          </svg>
        </div>
      </div>
{/* CULTURAL SUPPORTING: Toasting Champagne Flutes (Ly sâm panh giao thừa) */}
      <div
        className="absolute top-1 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 13s ease-in-out infinite" }}
      >
        <ToastingChampagne className="w-6 h-5 sm:w-7 sm:h-6 opacity-80 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
      </div>

      {/* CULTURAL SUPPORTING: New Year Fireworks Blossom */}
      <div
        className="absolute top-1 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaTwinkle 4s ease-in-out infinite 0.6s" }}
      >
        <FireworksBurst className="w-5 h-5 sm:w-6 sm:h-6 opacity-75 filter drop-shadow-[0_0_7px_#FEF08A]" />
      </div>

      <div className="absolute top-2 left-[24%] w-1 h-1 rounded-full bg-amber-200/60 shadow-[0_0_3px_#FEF08A] opacity-45 cinema-anim" style={{ animation: "cinemaTwinkle 5s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[60%] w-1.5 h-1.5 rounded-full bg-blue-300/40 shadow-[0_0_4px_#60A5FA] opacity-40 cinema-anim" style={{ animation: "cinemaTwinkle 6s ease-in-out infinite 1.5s" }} />
      <div className="absolute top-3 left-[40%] w-1 h-1 rounded-full bg-yellow-300/40 shadow-[0_0_2px_#FDE047] opacity-35 cinema-anim" style={{ animation: "cinemaDrift 18s ease-in-out infinite" }} />
    </>
  );
}

// 16. NANA BIRTHDAY (30/5) - Black + Dark Champagne + Muted Pink
function NanaBirthdayScene() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060305 0%, #0e060c 50%, #160a13 100%)",
          opacity: 0.85,
        }}
      />
      {/* Subtle holographic pink & champagne aura */}
      <div className="absolute top-1 right-[35%] w-20 h-14 rounded-full bg-pink-950/20 blur-xl pointer-events-none cinema-anim" style={{ animation: "cinemaGlow 12s ease-in-out infinite" }} />

      {/* Royal Tiara / Crown Silhouette */}
      <div
        className="absolute top-1 right-[36%] pointer-events-none cinema-anim"
        style={{ animation: "cinemaBreathe 14s ease-in-out infinite" }}
      >
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 52 40" className="w-8 h-6 sm:w-9 sm:h-7 filter drop-shadow-[0_0_8px_rgba(219,39,119,0.35)]" fill="none">
            <path d="M6,32 Q26,36 46,32" stroke="#CA8A04" strokeWidth="1.3" strokeLinecap="round" />
            <polygon
              points="6,32 10,18 17,25 26,10 35,25 42,18 46,32"
              fill="rgba(190,24,93,0.12)"
              stroke="#D97706"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <circle cx="26" cy="18" r="2" fill="#FBCFE8" stroke="#DB2777" strokeWidth="0.8" />
            <circle cx="10" cy="18" r="1.5" fill="#CA8A04" />
            <circle cx="42" cy="18" r="1.5" fill="#CA8A04" />
          </svg>
        </div>
      </div>
{/* CULTURAL SUPPORTING: Birthday Cake with Glowing Candles */}
      <div
        className="absolute top-1 left-[18%] hidden sm:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 12s ease-in-out infinite" }}
      >
        <BirthdayCake className="w-5 h-6 sm:w-6 sm:h-7 opacity-85 filter drop-shadow-[0_0_8px_rgba(236,72,153,0.45)]" />
      </div>

      {/* CULTURAL SUPPORTING: Birthday Gift Box */}
      <div
        className="absolute top-2 right-[18%] hidden md:flex items-center pointer-events-none cinema-anim"
        style={{ animation: "cinemaFloat 14s ease-in-out infinite 1s" }}
      >
        <ChristmasGiftBox className="w-5 h-5 sm:w-6 sm:h-6 opacity-75 filter drop-shadow-[0_0_6px_rgba(244,114,182,0.4)]" />
      </div>

      <div className="absolute top-2 left-[25%] w-1 h-1 rounded-full bg-pink-300/50 shadow-[0_0_3px_#F472B6] opacity-45 cinema-anim" style={{ animation: "cinemaTwinkle 6s ease-in-out infinite" }} />
      <div className="absolute top-3 left-[62%] w-1 h-1 rounded-full bg-amber-200/50 shadow-[0_0_3px_#FEF08A] opacity-40 cinema-anim" style={{ animation: "cinemaTwinkle 7s ease-in-out infinite 1.5s" }} />
      <div className="absolute top-2 left-[45%] w-1 h-1 rounded-full bg-rose-200/40 shadow-[0_0_2px_#FDA4AF] opacity-35 cinema-anim" style={{ animation: "cinemaDrift 19s ease-in-out infinite" }} />
    </>
  );
}

/**
 * Scene Router for all 16 Holidays
 */
function HolidaySceneRenderer({ id }: { id: HolidayNavbarThemeId }) {
  switch (id) {
    case "mid-autumn":
      return <MidAutumnScene />;
    case "tet":
      return <TetScene />;
    case "national-day":
      return <NationalDayScene />;
    case "heritage-hung-kings":
      return <HungKingsScene />;
    case "christmas":
      return <ChristmasScene />;
    case "halloween":
      return <HalloweenScene />;
    case "valentine":
      return <ValentineScene />;
    case "women-family":
      return <WomenFamilyScene />;
    case "education-teachers":
      return <EducationScene />;
    case "military-veterans":
      return <MilitaryScene />;
    case "labor-may-day":
      return <LaborScene />;
    case "children-youth":
      return <YouthScene />;
    case "earth-environment":
      return <EarthScene />;
    case "traditional-spiritual":
      return <SpiritualScene />;
    case "new-year":
      return <NewYearScene />;
    case "nana-birthday":
      return <NanaBirthdayScene />;
    default:
      return null;
  }
}

function getActiveHolidayTheme(): HolidayNavbarTheme | null {
  try {
    const todayInfo = getVietnamTodayEvent();
    if (todayInfo.isToday && todayInfo.event) {
      return getHolidayNavbarTheme(todayInfo.event);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * CINEMATIC LIVING NAVBAR ATMOSPHERE COMPONENT
 * Sits at z-[1] behind z-10 navbar UI.
 * Returns null immediately on normal days.
 */
export function HolidayNavbarAtmosphere() {
  const [theme, setTheme] = useState<HolidayNavbarTheme | null>(getActiveHolidayTheme);

  useEffect(() => {
    setTheme(getActiveHolidayTheme());
  }, []);

  // Ngày thường: Navbar sạch 100%, không render bất kỳ DOM nào
  if (!theme) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none z-[1] overflow-hidden contain-paint isolate"
    >
      <style>{`
        @keyframes cinemaBreathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        @keyframes cinemaHaloBreathe {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.08); opacity: 0.55; }
        }
        @keyframes cinemaLanternSway {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        @keyframes cinemaLanternSwaySlow {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes cinemaCloudDrift {
          0% { transform: translate3d(-55px, 0, 0); }
          100% { transform: translate3d(55px, 0, 0); }
        }
        @keyframes cinemaCloudDriftSlow {
          0% { transform: translate3d(-42px, 0, 0); }
          100% { transform: translate3d(42px, 0, 0); }
        }
        @keyframes cinemaFogDrift {
          0% { transform: translate3d(-50px, 0, 0); }
          100% { transform: translate3d(50px, 0, 0); }
        }
        @keyframes cinemaPetalFall {
          0% { transform: translate3d(0, -6px, 0) rotate(0deg); opacity: 0.2; }
          25% { opacity: 0.7; }
          60% { transform: translate3d(24px, 22px, 0) rotate(35deg); opacity: 0.65; }
          100% { transform: translate3d(48px, 46px, 0) rotate(75deg); opacity: 0.15; }
        }
        @keyframes cinemaFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(14px, -8px, 0); }
        }
        @keyframes cinemaRise {
          0% { transform: translate3d(0, 10px, 0); opacity: 0.15; }
          25% { opacity: 0.7; }
          50% { transform: translate3d(8px, -24px, 0); opacity: 0.75; }
          75% { opacity: 0.6; }
          100% { transform: translate3d(-6px, -52px, 0); opacity: 0.15; }
        }
        @keyframes cinemaRiseSlow {
          0% { transform: translate3d(0, 10px, 0); opacity: 0.15; }
          25% { opacity: 0.65; }
          50% { transform: translate3d(-7px, -18px, 0); opacity: 0.7; }
          75% { opacity: 0.55; }
          100% { transform: translate3d(7px, -42px, 0); opacity: 0.15; }
        }
        @keyframes cinemaGlow {
          0%, 100% { transform: scale(1); opacity: 0.65; }
          50% { transform: scale(1.08); opacity: 0.95; }
        }
        @keyframes cinemaDrift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(20px, -6px, 0); }
        }
        @keyframes cinemaCandleFlicker {
          0%, 100% { transform: scale(1); opacity: 0.85; filter: brightness(1); }
          25% { transform: scale(0.9); opacity: 0.6; filter: brightness(0.85); }
          50% { transform: scale(1.18); opacity: 1; filter: brightness(1.25); }
          75% { transform: scale(0.94); opacity: 0.7; filter: brightness(0.9); }
        }
        @keyframes cinemaTwinkle {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.35); opacity: 0.95; }
        }
        @keyframes cinemaSnowFall {
          0% { transform: translate3d(0, -8px, 0); opacity: 0.15; }
          20% { opacity: 0.85; }
          60% { transform: translate3d(10px, 24px, 0); opacity: 0.8; }
          100% { transform: translate3d(22px, 48px, 0); opacity: 0.15; }
        }
        @keyframes cinemaSnowFallSlow {
          0% { transform: translate3d(0, -8px, 0); opacity: 0.15; }
          25% { opacity: 0.75; }
          65% { transform: translate3d(-8px, 20px, 0); opacity: 0.7; }
          100% { transform: translate3d(-18px, 44px, 0); opacity: 0.15; }
        }
        @keyframes cinemaStarburst {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.75; }
          50% { transform: rotate(12deg) scale(1.08); opacity: 0.95; }
        }

        /* Backward-compatible keyframe aliases */
        @keyframes cinemaSway {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        @keyframes cinemaSwaySlow {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes cinemaFlicker {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          25% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 1; }
          75% { transform: scale(0.94); opacity: 0.7; }
        }
        @keyframes cinemaPulseSlow {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.06); opacity: 0.95; }
        }
        @keyframes cinemaFloatSlow {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -5px, 0); }
        }
        @keyframes cinemaPetalDrift {
          0% { transform: translate3d(0, -6px, 0) rotate(0deg); opacity: 0.2; }
          25% { opacity: 0.7; }
          60% { transform: translate3d(24px, 22px, 0) rotate(35deg); opacity: 0.65; }
          100% { transform: translate3d(48px, 46px, 0) rotate(75deg); opacity: 0.15; }
        }

        .cinema-anim {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>

      {/* LỚP 1: AMBIENT GRADIENT & VIGNETTE */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 pointer-events-none"
        style={{ background: theme.ambientGradient }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* LỚP 2-5: RICH CINEMATIC HOLIDAY SCENE */}
      <HolidaySceneRenderer id={theme.id} />
    </div>
  );
}
