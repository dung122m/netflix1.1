"use client";

import React from "react";
import { EventEffectType } from "@/data/events/types";

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
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(251,191,36,0.6)); }
          50% { transform: scale(1.04); filter: drop-shadow(0 0 40px rgba(251,191,36,0.85)); }
        }
        @keyframes vnLanternSway1 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-6deg); }
          50% { transform: translate3d(3px, 4px, 0) rotate(6deg); }
        }
        @keyframes vnLanternSway2 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(5deg); }
          50% { transform: translate3d(-3px, 5px, 0) rotate(-5deg); }
        }
        @keyframes vnTwinkleBright {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 6px rgba(250,204,21,0.9)); }
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
          50% { transform: scale(1.1); filter: drop-shadow(0 0 30px rgba(250,204,21,1)); }
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
            opacity: 0.6 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* 1. MID-AUTUMN (TRUNG THU): Vầng trăng rằm rực rỡ, Đèn lồng đỏ Hội An đung đưa, Hạt sao vàng lấp lánh */}
      {effect === "mid-autumn" && (
        <>
          {/* Ambient Warm Golden Moonlight Atmosphere */}
          <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-gradient-to-l from-amber-500/25 via-yellow-500/15 to-transparent pointer-events-none" />

          {/* VẦNG TRĂNG RẰM LỚN TỎA SÁNG (Visible full moon in center-right) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-32 sm:right-48 md:right-64 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-400 border border-yellow-100/60 shadow-[0_0_45px_rgba(251,191,36,0.65)] flex items-center justify-center vn-fx-anim pointer-events-none"
            style={{ animation: "vnMoonGlow 6s ease-in-out infinite" }}
          >
            {/* Soft lunar surface detail / texture overlay */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.7),transparent_60%)]" />
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-300/30 blur-[2px]" />
          </div>

          {/* ĐÈN LỒNG 1: Đèn lồng đỏ truyền thống treo bên phải */}
          <div
            className="absolute top-0 right-14 sm:right-24 flex flex-col items-center vn-fx-anim"
            style={{ animation: "vnLanternSway1 4.5s ease-in-out infinite", transformOrigin: "top center" }}
          >
            <div className="w-[1.5px] h-3 bg-red-400/80" />
            <div className="text-2xl sm:text-3xl filter drop-shadow-[0_4px_14px_rgba(239,68,68,0.95)]">
              🏮
            </div>
          </div>

          {/* ĐÈN LỒNG 2: Đèn lồng thứ 2 đung đưa nhịp lệch */}
          <div
            className="absolute top-0 right-28 sm:right-40 flex flex-col items-center vn-fx-anim"
            style={{ animation: "vnLanternSway2 5.5s ease-in-out infinite 0.8s", transformOrigin: "top center" }}
          >
            <div className="w-[1.5px] h-4.5 bg-red-400/70" />
            <div className="text-xl sm:text-2xl filter drop-shadow-[0_3px_12px_rgba(239,68,68,0.85)]">
              🏮
            </div>
          </div>

          {/* ĐÈN LỒNG 3 (Hiển thị trên màn hình rộng) */}
          <div
            className="hidden md:flex absolute top-0 right-72 flex flex-col items-center vn-fx-anim opacity-85"
            style={{ animation: "vnLanternSway1 6s ease-in-out infinite 1.5s", transformOrigin: "top center" }}
          >
            <div className="w-[1px] h-3 bg-red-400/60" />
            <div className="text-lg filter drop-shadow-[0_2px_10px_rgba(239,68,68,0.75)]">
              🏮
            </div>
          </div>

          {/* HẠT SAO VÀNG LẤP LÁNH (Twinkling gold stars) */}
          <div className="absolute top-4 right-20 text-yellow-300 text-sm vn-fx-anim" style={{ animation: "vnTwinkleBright 2.8s ease-in-out infinite" }}>✨</div>
          <div className="absolute bottom-5 right-24 text-amber-200 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 3.5s ease-in-out infinite 1s" }}>✦</div>
          <div className="absolute top-8 right-60 text-yellow-300 text-base vn-fx-anim" style={{ animation: "vnTwinkleBright 3.2s ease-in-out infinite 1.8s" }}>✨</div>
          <div className="absolute bottom-4 right-48 text-amber-300 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 4s ease-in-out infinite 0.5s" }}>✧</div>
        </>
      )}

      {/* 2. TET (TẾT NGUYÊN ĐÁN): Hoa mai vàng & hoa đào hồng trôi rộn ràng, đèn lồng mừng xuân */}
      {effect === "tet" && (
        <>
          {/* Festive Red-Gold Warm Glow */}
          <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-gradient-to-l from-red-600/25 via-amber-500/20 to-transparent pointer-events-none" />

          {/* Đèn lồng Tết */}
          <div
            className="absolute top-0 right-16 sm:right-24 flex flex-col items-center vn-fx-anim"
            style={{ animation: "vnLanternSway1 4.5s ease-in-out infinite", transformOrigin: "top center" }}
          >
            <div className="w-[1.5px] h-3 bg-red-400/80" />
            <div className="text-2xl sm:text-3xl filter drop-shadow-[0_4px_14px_rgba(239,68,68,0.95)]">
              🏮
            </div>
          </div>

          {/* Hoa đào hồng 1 */}
          <div className="absolute top-0 right-28 text-base vn-fx-anim filter drop-shadow-[0_2px_8px_rgba(244,114,182,0.9)]" style={{ animation: "vnPetalDriftDao 7.5s linear infinite" }}>🌸</div>
          {/* Hoa mai vàng 1 */}
          <div className="absolute top-0 right-14 text-base vn-fx-anim filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.9)]" style={{ animation: "vnPetalDriftMai 8.2s linear infinite 1.5s" }}>🌼</div>
          {/* Hoa đào hồng 2 */}
          <div className="absolute top-0 right-48 text-sm vn-fx-anim filter drop-shadow-[0_2px_8px_rgba(244,114,182,0.85)]" style={{ animation: "vnPetalDriftDao 6.8s linear infinite 3.2s" }}>🌸</div>
          {/* Hoa mai vàng 2 */}
          <div className="hidden sm:block absolute top-0 right-64 text-sm vn-fx-anim filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.85)]" style={{ animation: "vnPetalDriftMai 9s linear infinite 4.5s" }}>🌼</div>

          {/* Lì xì đỏ may mắn góc trên */}
          <div className="absolute top-3 right-8 text-xl filter drop-shadow-[0_2px_8px_rgba(220,38,38,0.8)] vn-fx-anim" style={{ animation: "vnLanternSway2 5s ease-in-out infinite" }}>🧧</div>

          {/* Tia lấp lánh */}
          <div className="absolute top-6 right-36 text-amber-300 text-sm vn-fx-anim" style={{ animation: "vnTwinkleBright 2.5s ease-in-out infinite" }}>✨</div>
          <div className="absolute bottom-4 right-20 text-yellow-300 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 3.2s ease-in-out infinite 1.2s" }}>✦</div>
        </>
      )}

      {/* 3. NATIONAL DAY (QUỐC KHÁNH 2/9): Ngôi sao vàng tỏa sáng rực rỡ, hào khí non sông */}
      {effect === "national-day" && (
        <>
          {/* Red & Gold Sunburst Atmosphere */}
          <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-gradient-to-l from-red-600/30 via-yellow-500/20 to-transparent pointer-events-none" />

          {/* NGÔI SAO VÀNG NỔI BẬT TỎA SÁNG */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-24 sm:right-36 md:right-48 flex items-center justify-center vn-fx-anim pointer-events-none"
            style={{ animation: "vnStarPulse 5s ease-in-out infinite" }}
          >
            <div className="absolute w-28 h-28 rounded-full bg-yellow-400/25 blur-2xl" />
            <span className="text-4xl sm:text-5xl filter drop-shadow-[0_0_25px_rgba(250,204,21,0.95)]">
              ⭐
            </span>
          </div>

          {/* Viền cờ đỏ sao vàng phía trên */}
          <div className="absolute top-0 right-0 w-48 h-1 bg-gradient-to-l from-yellow-400 via-red-500 to-transparent shadow-[0_0_12px_rgba(250,204,21,0.8)]" />

          {/* Tia sáng vàng */}
          <div className="absolute top-3 right-12 text-yellow-300 text-sm vn-fx-anim" style={{ animation: "vnTwinkleBright 2.4s ease-in-out infinite" }}>✨</div>
          <div className="absolute bottom-4 right-16 text-yellow-200 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 3.2s ease-in-out infinite 0.8s" }}>✦</div>
        </>
      )}

      {/* 4. CHRISTMAS (GIÁNG SINH): Tuyết rơi trắng sáng, không khí mùa đông ấm áp */}
      {effect === "christmas" && (
        <>
          {/* Winter Sky Glow */}
          <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-gradient-to-l from-sky-400/25 via-blue-600/15 to-transparent pointer-events-none" />

          {/* Cây thông Noel / Chuông Giáng sinh góc phải */}
          <div className="absolute top-2 right-12 sm:right-16 text-2xl sm:text-3xl filter drop-shadow-[0_2px_12px_rgba(34,197,94,0.8)] vn-fx-anim" style={{ animation: "vnLanternSway1 5s ease-in-out infinite" }}>
            🎄
          </div>

          {/* Các bông tuyết rơi rõ rệt */}
          <div className="absolute top-0 right-20 text-white text-base vn-fx-anim filter drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]" style={{ animation: "vnSnowFallVisible 6s linear infinite" }}>❄</div>
          <div className="absolute top-0 right-36 text-sky-200 text-sm vn-fx-anim filter drop-shadow-[0_0_6px_rgba(186,230,253,0.9)]" style={{ animation: "vnSnowFallVisible 7.2s linear infinite 1.5s" }}>❅</div>
          <div className="absolute top-0 right-10 text-white text-xs vn-fx-anim filter drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]" style={{ animation: "vnSnowFallVisible 8s linear infinite 3s" }}>❄</div>
          <div className="hidden sm:block absolute top-0 right-56 text-sky-100 text-base vn-fx-anim filter drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]" style={{ animation: "vnSnowFallVisible 6.8s linear infinite 4.2s" }}>❅</div>
          <div className="hidden sm:block absolute top-0 right-72 text-white text-xs vn-fx-anim filter drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]" style={{ animation: "vnSnowFallVisible 8.5s linear infinite 2.2s" }}>•</div>
        </>
      )}

      {/* 5. HALLOWEEN: Quả bí ngô ma quái rực sáng, tàn lửa bay */}
      {effect === "halloween" && (
        <>
          {/* Spooky Purple & Pumpkin Mist */}
          <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-gradient-to-l from-orange-500/25 via-purple-600/20 to-transparent pointer-events-none" />

          {/* Quả bí ngô phát sáng nổi bật */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-20 sm:right-32 text-3xl sm:text-4xl filter drop-shadow-[0_0_20px_rgba(249,115,22,0.95)] vn-fx-anim"
            style={{ animation: "vnMoonGlow 5s ease-in-out infinite" }}
          >
            🎃
          </div>

          {/* Chú dơi bay */}
          <div className="absolute top-2 right-40 text-base vn-fx-anim opacity-80" style={{ animation: "vnLanternSway2 4s ease-in-out infinite" }}>🦇</div>

          {/* Tàn lửa bay lên */}
          <div className="absolute bottom-2 right-28 w-2 h-2 rounded-full bg-orange-400 filter drop-shadow-[0_0_6px_rgba(251,146,60,1)] vn-fx-anim" style={{ animation: "vnEmberFloat 5.5s linear infinite" }} />
          <div className="absolute bottom-2 right-44 w-1.5 h-1.5 rounded-full bg-amber-300 filter drop-shadow-[0_0_6px_rgba(252,211,77,1)] vn-fx-anim" style={{ animation: "vnEmberFloat 6.8s linear infinite 1.8s" }} />
        </>
      )}

      {/* 6. NANA'S BIRTHDAY: Bánh kem sinh nhật rực sáng, pháo giấy tung bay */}
      {effect === "nana-birthday" && (
        <>
          {/* Celebratory Pink-Amber Aura */}
          <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-gradient-to-l from-pink-500/25 via-amber-400/20 to-transparent pointer-events-none" />

          {/* BÁNH KEM SINH NHẬT TỎA SÁNG */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-20 sm:right-32 text-3xl sm:text-4xl filter drop-shadow-[0_0_22px_rgba(244,114,182,0.95)] vn-fx-anim"
            style={{ animation: "vnMoonGlow 4.5s ease-in-out infinite" }}
          >
            🎂
          </div>

          {/* Mảnh pháo giấy confetti rơi */}
          <div className="absolute top-0 right-16 text-base vn-fx-anim" style={{ animation: "vnConfettiDrift 6s linear infinite" }}>🎉</div>
          <div className="absolute top-0 right-28 text-base vn-fx-anim" style={{ animation: "vnConfettiDrift 7.2s linear infinite 1.5s" }}>🎈</div>
          <div className="absolute top-0 right-44 text-sm vn-fx-anim" style={{ animation: "vnConfettiDrift 5.8s linear infinite 2.8s" }}>✨</div>
          <div className="hidden sm:block absolute top-0 right-60 text-base vn-fx-anim" style={{ animation: "vnConfettiDrift 6.5s linear infinite 4s" }}>🎁</div>

          {/* Tia sáng chúc mừng */}
          <div className="absolute top-3 right-8 text-pink-300 text-sm vn-fx-anim" style={{ animation: "vnTwinkleBright 2.2s ease-in-out infinite" }}>✨</div>
          <div className="absolute bottom-3 right-14 text-yellow-300 text-xs vn-fx-anim" style={{ animation: "vnTwinkleBright 3s ease-in-out infinite 0.7s" }}>✦</div>
        </>
      )}
    </div>
  );
}
