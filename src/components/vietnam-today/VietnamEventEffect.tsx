"use client";

import React from "react";
import { EventEffectType } from "@/data/events/types";
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
  ChristmasPineTree,
  ChristmasGiftBox,
  CrystalSnowflake,
  JackOLantern,
  SpiderWebCorner,
  BirthdayCake,
} from "../navbar/HolidayCulturalVisuals";

interface VietnamEventEffectProps {
  effect?: EventEffectType | null;
}

export function VietnamEventEffect({ effect }: VietnamEventEffectProps) {
  if (!effect) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[5] pointer-events-none overflow-hidden select-none"
    >
      <style>{`
        @keyframes vnMoonGlow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(251,191,36,0.65)); }
          50% { transform: scale(1.04); filter: drop-shadow(0 0 45px rgba(251,191,36,0.9)); }
        }
        @keyframes vnLanternSway1 {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        @keyframes vnLanternSway2 {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-5deg); }
        }
        @keyframes vnFloatSlow {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -8px, 0); }
        }
        @keyframes vnFloatBob {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-3px, -7px, 0) rotate(-3deg); }
        }
        @keyframes vnBreathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes vnTwinkleBright {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 8px rgba(250,204,21,0.9)); }
        }
        @keyframes vnPetalDriftMai {
          0% { transform: translate3d(-20px, -20px, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { transform: translate3d(160px, 170px, 0) rotate(260deg); opacity: 0; }
        }
        @keyframes vnPetalDriftDao {
          0% { transform: translate3d(0px, -20px, 0) rotate(30deg); opacity: 0; }
          20% { opacity: 0.95; }
          80% { opacity: 0.95; }
          100% { transform: translate3d(140px, 170px, 0) rotate(310deg); opacity: 0; }
        }
        @keyframes vnSnowFallVisible {
          0% { transform: translate3d(0, -15px, 0); opacity: 0; }
          20% { opacity: 0.85; }
          80% { opacity: 0.85; }
          100% { transform: translate3d(35px, 165px, 0); opacity: 0; }
        }
        @keyframes vnStarPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(250,204,21,0.7)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 30px rgba(250,204,21,1)); }
        }
        @keyframes vnEmberFloat {
          0% { transform: translate3d(0, 40px, 0); opacity: 0; }
          25% { opacity: 0.9; }
          75% { opacity: 0.9; }
          100% { transform: translate3d(-25px, -40px, 0); opacity: 0; }
        }
        @keyframes vnConfettiDrift {
          0% { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.95; }
          80% { opacity: 0.95; }
          100% { transform: translate3d(80px, 165px, 0) rotate(360deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vn-fx-anim {
            animation: none !important;
            opacity: 0.7 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          1. MID-AUTUMN (TẾT TRUNG THU): Trăng rằm dạ nguyệt, Đầu lân, Đèn ông sao, Bánh nướng
          ========================================================================= */}
      {effect === "mid-autumn" && (
        <>
          {/* Ambient Warm Golden Moonlight Atmosphere */}
          <div className="absolute top-0 right-0 w-80 sm:w-[460px] md:w-[560px] h-full bg-gradient-to-l from-amber-500/25 via-yellow-500/12 to-transparent pointer-events-none" />

          {/* VẦNG TRĂNG RẰM LỚN DẠ NGUYỆT */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-32 sm:right-48 md:right-60 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-400 border border-yellow-100/70 shadow-[0_0_55px_rgba(251,191,36,0.7)] flex items-center justify-center vn-fx-anim pointer-events-none opacity-90"
            style={{ animation: "vnMoonGlow 6s ease-in-out infinite" }}
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.7),transparent_60%)]" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-300/30 blur-[2px]" />
          </div>

          {/* 🦁 CULTURAL ICON 1: ĐẦU LÂN MÚA LÂN SƯ RỒNG */}
          <div
            className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-16 sm:right-28 md:right-36 flex items-center vn-fx-anim"
            style={{ animation: "vnFloatBob 5.5s ease-in-out infinite" }}
          >
            <LionDanceHead className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 opacity-90 filter drop-shadow-[0_4px_14px_rgba(220,38,38,0.75)]" />
          </div>

          {/* ⭐ CULTURAL ICON 2: ĐÈN ÔNG SAO 5 CÁNH CỔ TRUYỀN */}
          <div
            className="absolute top-0 right-4 sm:right-8 md:right-12 flex flex-col items-center vn-fx-anim"
            style={{ animation: "vnLanternSway1 6s ease-in-out infinite", transformOrigin: "top center" }}
          >
            <StarLantern className="w-10 h-12 sm:w-13 sm:h-15 md:w-15 md:h-18 opacity-95 filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.75)]" />
          </div>

          {/* 🥮 CULTURAL ICON 3: BÁNH TRUNG THU HOA SEN NƯỚNG VÀNG ƯƠM */}
          <div
            className="hidden sm:flex absolute bottom-3 sm:bottom-4 md:bottom-5 right-44 sm:right-60 md:right-76 items-center vn-fx-anim"
            style={{ animation: "vnBreathe 7s ease-in-out infinite 1s" }}
          >
            <Mooncake className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 opacity-85 filter drop-shadow-[0_4px_12px_rgba(217,119,6,0.6)]" />
          </div>

          {/* 🏮 CULTURAL ICON 4: ĐÈN LỒNG LỤA ĐỎ HỘI AN ĐUNG ĐƯA (SVG) */}
          <div
            className="absolute top-0 right-24 sm:right-36 md:right-48 flex flex-col items-center vn-fx-anim"
            style={{ animation: "vnLanternSway2 5s ease-in-out infinite 0.7s", transformOrigin: "top center" }}
          >
            <div className="w-[1.5px] h-3.5 bg-amber-500/80" />
            <div className="w-4 h-6 sm:w-5 sm:h-7 rounded-md bg-gradient-to-b from-red-950 via-rose-900 to-amber-950 border border-amber-500/40 shadow-[0_0_12px_rgba(239,68,68,0.7)] flex items-center justify-center">
              <div className="w-1.5 h-2 rounded-full bg-amber-200/90 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            </div>
            <div className="w-[1px] h-2 bg-amber-600/60" />
          </div>

          {/* HẠT SAO VÀNG LẤP LÁNH */}
          <div className="absolute top-4 right-20 text-yellow-300 text-sm vn-fx-anim" style={{ animation: "vnTwinkleBright 2.8s ease-in-out infinite" }}>✨</div>
          <div className="absolute bottom-5 right-24 text-amber-200 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 3.5s ease-in-out infinite 1s" }}>✦</div>
          <div className="absolute top-8 right-60 text-yellow-300 text-base vn-fx-anim" style={{ animation: "vnTwinkleBright 3.2s ease-in-out infinite 1.8s" }}>✨</div>
          <div className="absolute bottom-4 right-48 text-amber-300 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 4s ease-in-out infinite 0.5s" }}>✧</div>
        </>
      )}

      {/* =========================================================================
          2. TET (TẾT NGUYÊN ĐÁN): Cành mai đào, Bao lì xì may mắn, Bánh chưng xanh, Quạt gấm
          ========================================================================= */}
      {effect === "tet" && (
        <>
          {/* Festive Red-Gold Warm Glow */}
          <div className="absolute top-0 right-0 w-80 sm:w-[460px] md:w-[560px] h-full bg-gradient-to-l from-red-600/30 via-amber-500/20 to-transparent pointer-events-none" />

          {/* 🧧 CULTURAL ICON 1: BAO LÌ XÌ ĐỎ MAY MẮN */}
          <div
            className="absolute top-2 sm:top-3 right-6 sm:right-10 md:right-14 flex items-center vn-fx-anim"
            style={{ animation: "vnLanternSway1 6s ease-in-out infinite", transformOrigin: "top center" }}
          >
            <RedEnvelope className="w-10 h-13 sm:w-13 sm:h-16 md:w-14 md:h-18 opacity-95 filter drop-shadow-[0_4px_16px_rgba(220,38,38,0.7)]" />
          </div>

          {/* 🥮 CULTURAL ICON 2: BÁNH CHƯNG XANH BUỘC LẠT */}
          <div
            className="absolute bottom-3 sm:bottom-4 md:bottom-5 right-20 sm:right-32 md:right-40 flex items-center vn-fx-anim"
            style={{ animation: "vnBreathe 8s ease-in-out infinite" }}
          >
            <BanhChung className="w-10 h-10 sm:w-13 sm:h-13 md:w-15 md:h-15 opacity-90 filter drop-shadow-[0_4px_14px_rgba(22,101,52,0.7)]" />
          </div>

          {/* 🪭 CULTURAL ICON 3: QUẠT GẤM NGÀY XUÂN */}
          <div
            className="hidden sm:flex absolute bottom-3 sm:bottom-4 md:bottom-5 right-44 sm:right-56 md:right-68 items-center vn-fx-anim"
            style={{ animation: "vnFloatSlow 7s ease-in-out infinite 0.5s" }}
          >
            <SilkFan className="w-12 h-8 sm:w-14 sm:h-10 md:w-16 md:h-11 opacity-85 filter drop-shadow-[0_4px_12px_rgba(190,18,60,0.6)]" />
          </div>

          {/* 🏮 ĐÈN LỒNG CHỮ XUÂN (SVG) */}
          <div
            className="absolute top-0 right-28 sm:right-44 md:right-56 flex flex-col items-center vn-fx-anim"
            style={{ animation: "vnLanternSway2 5.5s ease-in-out infinite 0.8s", transformOrigin: "top center" }}
          >
            <div className="w-[1.5px] h-3.5 bg-amber-500/80" />
            <div className="w-5 h-7 rounded-md bg-gradient-to-b from-red-950 via-rose-900 to-amber-950 border border-amber-500/40 shadow-[0_0_14px_rgba(220,38,38,0.7)] flex items-center justify-center">
              <span className="text-[9px] text-yellow-300 font-black">春</span>
            </div>
          </div>

          {/* 🎆 PHÁO HOA GIAO THỪA */}
          <div
            className="hidden md:flex absolute top-4 right-72 items-center vn-fx-anim"
            style={{ animation: "vnTwinkleBright 3s ease-in-out infinite 1s" }}
          >
            <FireworksBurst className="w-8 h-8 opacity-80 filter drop-shadow-[0_0_10px_#FDE047]" />
          </div>

          {/* Cánh hoa mai vàng & đào thắm rơi */}
          <div className="absolute top-0 right-28 text-base vn-fx-anim" style={{ animation: "vnPetalDriftDao 7.5s linear infinite" }}>🌸</div>
          <div className="absolute top-0 right-14 text-base vn-fx-anim" style={{ animation: "vnPetalDriftMai 8.2s linear infinite 1.5s" }}>🌼</div>
          <div className="absolute top-0 right-48 text-sm vn-fx-anim" style={{ animation: "vnPetalDriftDao 6.8s linear infinite 3.2s" }}>🌸</div>
          <div className="hidden sm:block absolute top-0 right-64 text-sm vn-fx-anim" style={{ animation: "vnPetalDriftMai 9s linear infinite 4.5s" }}>🌼</div>
        </>
      )}

      {/* =========================================================================
          3. NATIONAL DAY (QUỐC KHÁNH 2/9, 30/4): Cờ đỏ sao vàng, Ngôi sao 3D, Chim hòa bình
          ========================================================================= */}
      {effect === "national-day" && (
        <>
          {/* Red & Gold Sunburst Atmosphere */}
          <div className="absolute top-0 right-0 w-80 sm:w-[460px] md:w-[560px] h-full bg-gradient-to-l from-red-600/35 via-yellow-500/20 to-transparent pointer-events-none" />

          {/* 🇻🇳 CULTURAL ICON 1: CỜ ĐỎ SAO VÀNG SÓNG LỤA */}
          <div
            className="absolute top-3 sm:top-4 right-8 sm:right-14 md:right-18 flex items-center vn-fx-anim"
            style={{ animation: "vnFloatSlow 7s ease-in-out infinite" }}
          >
            <VietnamFlagRipple className="w-14 h-9 sm:w-18 sm:h-12 md:w-22 md:h-14 opacity-95 filter drop-shadow-[0_4px_18px_rgba(220,38,38,0.85)]" />
          </div>

          {/* ⭐ CULTURAL ICON 2: NGÔI SAO VÀNG 3D HÀO QUANG */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-28 sm:right-40 md:right-52 flex items-center justify-center vn-fx-anim"
            style={{ animation: "vnStarPulse 5s ease-in-out infinite" }}
          >
            <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-yellow-400/25 blur-2xl" />
            <svg viewBox="0 0 48 48" className="w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 filter drop-shadow-[0_0_20px_rgba(250,204,21,0.9)] opacity-95">
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

          {/* 🕊️ CULTURAL ICON 3: CHIM BỒ CÂU HÒA BÌNH BAY LƯỢN */}
          <div
            className="hidden sm:flex absolute bottom-3 sm:bottom-4 md:bottom-5 right-48 sm:right-64 md:right-80 items-center vn-fx-anim"
            style={{ animation: "vnFloatBob 8s ease-in-out infinite 1s" }}
          >
            <PeaceDoves className="w-12 h-8 sm:w-15 sm:h-10 md:w-16 md:h-11 opacity-85 filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.6)]" />
          </div>

          {/* 🎆 CULTURAL ICON 4: PHÁO HOA ĐỘC LẬP BA ĐÌNH */}
          <div
            className="hidden md:flex absolute top-3 right-68 items-center vn-fx-anim"
            style={{ animation: "vnTwinkleBright 3.5s ease-in-out infinite 0.6s" }}
          >
            <FireworksBurst className="w-10 h-10 opacity-85 filter drop-shadow-[0_0_12px_#FDE047]" />
          </div>
        </>
      )}

      {/* =========================================================================
          4. CHRISTMAS (GIÁNG SINH): Cây thông Noel, Hộp quà, Bông tuyết pha lê
          ========================================================================= */}
      {effect === "christmas" && (
        <>
          {/* Winter Sky Glow */}
          <div className="absolute top-0 right-0 w-80 sm:w-[460px] md:w-[560px] h-full bg-gradient-to-l from-sky-400/25 via-blue-600/15 to-transparent pointer-events-none" />

          {/* 🎄 CÂY THÔNG NOEL ĐỈNH SAO */}
          <div
            className="absolute top-2 sm:top-3 right-6 sm:right-12 md:right-16 flex items-center vn-fx-anim"
            style={{ animation: "vnFloatSlow 6s ease-in-out infinite" }}
          >
            <ChristmasPineTree className="w-12 h-16 sm:w-15 sm:h-20 md:w-18 md:h-24 opacity-95 filter drop-shadow-[0_4px_16px_rgba(16,185,129,0.65)]" />
          </div>

          {/* 🎁 HỘP QUÀ NOEL THẮT NƠ VÀNG */}
          <div
            className="absolute bottom-3 sm:bottom-4 md:bottom-5 right-24 sm:right-36 md:right-44 flex items-center vn-fx-anim"
            style={{ animation: "vnBreathe 7s ease-in-out infinite" }}
          >
            <ChristmasGiftBox className="w-10 h-10 sm:w-13 sm:h-13 md:w-15 md:h-15 opacity-90 filter drop-shadow-[0_4px_14px_rgba(220,38,38,0.7)]" />
          </div>

          {/* ❄️ BÔNG TUYẾT PHA LÊ */}
          <div
            className="hidden sm:flex absolute top-3 right-44 sm:right-56 md:right-68 items-center vn-fx-anim"
            style={{ animation: "vnTwinkleBright 4s ease-in-out infinite 0.7s" }}
          >
            <CrystalSnowflake className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 opacity-85 filter drop-shadow-[0_0_10px_#BAE6FD]" />
          </div>

          {/* Các bông tuyết rơi */}
          <div className="absolute top-0 right-20 text-white text-base vn-fx-anim" style={{ animation: "vnSnowFallVisible 6s linear infinite" }}>❄</div>
          <div className="absolute top-0 right-36 text-sky-200 text-sm vn-fx-anim" style={{ animation: "vnSnowFallVisible 7.2s linear infinite 1.5s" }}>❅</div>
        </>
      )}

      {/* =========================================================================
          5. HALLOWEEN: Quả bí ngô ma mị, Mạng nhện góc, Cánh dơi
          ========================================================================= */}
      {effect === "halloween" && (
        <>
          {/* Spooky Purple & Pumpkin Mist */}
          <div className="absolute top-0 right-0 w-80 sm:w-[460px] md:w-[560px] h-full bg-gradient-to-l from-orange-500/25 via-purple-600/20 to-transparent pointer-events-none" />

          {/* 🎃 QUẢ BÍ NGÔ JACK-O'-LANTERN PHÁT SÁNG */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-12 sm:right-20 md:right-28 flex items-center vn-fx-anim"
            style={{ animation: "vnMoonGlow 5s ease-in-out infinite" }}
          >
            <JackOLantern className="w-16 h-14 sm:w-20 sm:h-18 md:w-24 md:h-20 opacity-95 filter drop-shadow-[0_0_24px_rgba(249,115,22,0.95)]" />
          </div>

          {/* 🕸️ MẠNG NHỆN BẠC GÓC TRÊN */}
          <div className="absolute top-0 right-0 opacity-50">
            <SpiderWebCorner className="w-16 h-16 sm:w-22 sm:h-22" />
          </div>

          {/* Dơi đêm bay & tàn lửa */}
          <div className="absolute top-2 right-44 text-base vn-fx-anim opacity-80" style={{ animation: "vnLanternSway2 4s ease-in-out infinite" }}>🦇</div>
          <div className="absolute bottom-2 right-28 w-2 h-2 rounded-full bg-orange-400 filter drop-shadow-[0_0_6px_rgba(251,146,60,1)] vn-fx-anim" style={{ animation: "vnEmberFloat 5.5s linear infinite" }} />
        </>
      )}

      {/* =========================================================================
          6. NANA'S BIRTHDAY: Bánh kem lung linh, Hộp quà, Pháo giấy
          ========================================================================= */}
      {effect === "nana-birthday" && (
        <>
          {/* Celebratory Pink-Amber Aura */}
          <div className="absolute top-0 right-0 w-80 sm:w-[460px] md:w-[560px] h-full bg-gradient-to-l from-pink-500/25 via-amber-400/20 to-transparent pointer-events-none" />

          {/* 🎂 BÁNH KEM SINH NHẬT */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-14 sm:right-24 md:right-32 flex items-center vn-fx-anim"
            style={{ animation: "vnMoonGlow 4.5s ease-in-out infinite" }}
          >
            <BirthdayCake className="w-14 h-16 sm:w-18 sm:h-20 md:w-20 md:h-22 opacity-95 filter drop-shadow-[0_0_24px_rgba(244,114,182,0.95)]" />
          </div>

          {/* 🎁 HỘP QUÀ SINH NHẬT NƠ HỒNG */}
          <div
            className="hidden sm:flex absolute bottom-3 sm:bottom-4 md:bottom-5 right-36 sm:right-52 md:right-64 items-center vn-fx-anim"
            style={{ animation: "vnFloatSlow 6s ease-in-out infinite 0.7s" }}
          >
            <ChristmasGiftBox className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 opacity-85 filter drop-shadow-[0_4px_12px_rgba(236,72,153,0.6)]" />
          </div>

          {/* Confetti & bóng bay */}
          <div className="absolute top-0 right-16 text-base vn-fx-anim" style={{ animation: "vnConfettiDrift 6s linear infinite" }}>🎉</div>
          <div className="absolute top-0 right-28 text-base vn-fx-anim" style={{ animation: "vnConfettiDrift 7.2s linear infinite 1.5s" }}>🎈</div>
        </>
      )}
    </div>
  );
}
