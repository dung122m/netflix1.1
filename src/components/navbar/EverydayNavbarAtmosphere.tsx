"use client";

import React from "react";
import { useTimeAtmosphere, TimePeriod } from "@/lib/timeAtmosphere";

/**
 * NANAFLIX EVERYDAY NAVBAR ATMOSPHERE
 * Lớp ambience ngày thường nằm ở z-[1] phía sau thanh Navbar.
 * Hòa nhập tự nhiên vào background, TUYỆT ĐỐI không có đường viền hay line nào.
 */

function MorningNavbarScene() {
  return (
    <>
      {/* 1. Lớp nền rạng đông dịu nhẹ: Gradient vàng mật ong & xanh thiên thanh */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "linear-gradient(180deg, rgba(245, 158, 11, 0.09) 0%, rgba(14, 165, 233, 0.06) 50%, transparent 100%)",
        }}
      />

      {/* 2. Quầng sáng mặt trời mọc dịu nhẹ phía góc phải trên */}
      <div
        className="absolute -top-10 right-[25%] sm:right-[35%] w-72 sm:w-96 h-28 sm:h-36 pointer-events-none everyday-anim blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(251, 191, 36, 0.16) 0%, rgba(245, 158, 11, 0.08) 45%, transparent 75%)",
          animation: "everydaySunriseGlow 14s ease-in-out infinite",
        }}
      />

      {/* 3. Làn sương mây buổi sớm êm đềm (Drift chậm 28s) */}
      <div
        className="absolute -top-2 left-[-60px] w-[calc(100%+120px)] h-10 pointer-events-none everyday-anim opacity-15"
        style={{ animation: "everydayCloudDrift 28s ease-in-out infinite alternate" }}
      >
        <svg viewBox="0 0 1000 40" className="w-full h-full" preserveAspectRatio="none" fill="none">
          <path
            d="M0,18 Q200,2 400,22 T800,14 T1000,18 L1000,0 L0,0 Z"
            fill="rgba(224, 242, 254, 0.35)"
          />
        </svg>
      </div>

      {/* 4. Hạt bụi sương mai lấp lánh nhẹ */}
      <div
        className="absolute top-2.5 left-[30%] w-1 h-1 rounded-full bg-amber-200/60 shadow-[0_0_4px_#FDE68A] opacity-50 everyday-anim"
        style={{ animation: "everydayTwinkle 5s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3.5 left-[68%] w-1 h-1 rounded-full bg-sky-200/50 shadow-[0_0_4px_#BAE6FD] opacity-45 everyday-anim"
        style={{ animation: "everydayTwinkle 6s ease-in-out infinite 1.5s" }}
      />
    </>
  );
}

function DayNavbarScene() {
  return (
    <>
      {/* 1. Nền ánh sáng tự nhiên sạch sẽ, trong suốt & thoáng đãng */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "linear-gradient(180deg, rgba(56, 189, 248, 0.07) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)",
        }}
      />

      {/* 2. Vùng sáng trung tâm nhẹ nhàng của bầu trời ngày */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-32 sm:h-40 pointer-events-none everyday-anim blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(186, 230, 253, 0.12) 0%, rgba(125, 211, 252, 0.05) 50%, transparent 80%)",
          animation: "everydayDaylightBreathe 16s ease-in-out infinite",
        }}
      />

      {/* 3. Làn sương mờ thanh khiết */}
      <div
        className="absolute top-0 left-[-50px] w-[calc(100%+100px)] h-8 pointer-events-none everyday-anim opacity-10"
        style={{ animation: "everydayCloudDriftSlow 34s ease-in-out infinite alternate" }}
      >
        <svg viewBox="0 0 1000 32" className="w-full h-full" preserveAspectRatio="none" fill="none">
          <path
            d="M0,12 Q250,20 500,10 T1000,14 L1000,0 L0,0 Z"
            fill="rgba(240, 249, 255, 0.3)"
          />
        </svg>
      </div>
    </>
  );
}

function GoldenHourNavbarScene() {
  return (
    <>
      {/* 1. Nền hoàng hôn ấm áp: Gradient cam hoàng hôn, hổ phách & sắc hồng dịu */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "linear-gradient(180deg, rgba(249, 115, 22, 0.12) 0%, rgba(245, 158, 11, 0.06) 45%, rgba(190, 18, 60, 0.03) 80%, transparent 100%)",
        }}
      />

      {/* 2. Quầng sáng hoàng hôn rực rỡ phía chân trời */}
      <div
        className="absolute -top-10 right-[30%] sm:right-[38%] w-80 sm:w-[450px] h-32 sm:h-40 pointer-events-none everyday-anim blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(251, 146, 60, 0.20) 0%, rgba(234, 88, 12, 0.10) 45%, rgba(159, 18, 57, 0.04) 75%, transparent 100%)",
          animation: "everydaySunsetPulse 12s ease-in-out infinite",
        }}
      />

      {/* 3. Mây hoàng hôn sắc cam dịu lướt qua */}
      <div
        className="absolute -top-2 left-[-70px] w-[calc(100%+140px)] h-10 pointer-events-none everyday-anim opacity-20"
        style={{ animation: "everydayCloudDrift 26s ease-in-out infinite alternate" }}
      >
        <svg viewBox="0 0 1000 40" className="w-full h-full" preserveAspectRatio="none" fill="none">
          <path
            d="M0,16 Q180,-2 360,18 T720,14 T1000,16 L1000,0 L0,0 Z"
            fill="rgba(254, 215, 170, 0.3)"
          />
        </svg>
      </div>

      {/* 4. Hạt bụi nắng hoàng hôn ấm áp */}
      <div
        className="absolute top-2 left-[24%] w-1 h-1 rounded-full bg-amber-300/70 shadow-[0_0_5px_#F59E0B] opacity-60 everyday-anim"
        style={{ animation: "everydayTwinkle 4.5s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3.5 left-[72%] w-1 h-1 rounded-full bg-orange-300/60 shadow-[0_0_5px_#FB923C] opacity-55 everyday-anim"
        style={{ animation: "everydayTwinkle 5s ease-in-out infinite 1.2s" }}
      />
    </>
  );
}

function NightNavbarScene() {
  return (
    <>
      {/* 1. Nền đêm điện ảnh sâu thẳm: Gradient xanh chàm celestial & tím than */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "linear-gradient(180deg, rgba(30, 58, 138, 0.14) 0%, rgba(67, 56, 202, 0.08) 45%, rgba(88, 28, 135, 0.03) 80%, transparent 100%)",
        }}
      />

      {/* 2. Quầng sáng ánh trăng huyền ảo (Moonlight Halo) */}
      <div
        className="absolute -top-12 right-[32%] sm:right-[36%] w-72 sm:w-96 h-32 sm:h-40 pointer-events-none everyday-anim blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(129, 140, 248, 0.16) 0%, rgba(99, 102, 241, 0.08) 45%, transparent 75%)",
          animation: "everydayMoonGlow 14s ease-in-out infinite",
        }}
      />

      {/* 3. Dải mây đêm mượt mà (Drift 30s) */}
      <div
        className="absolute -top-2 left-[-60px] w-[calc(100%+120px)] h-10 pointer-events-none everyday-anim opacity-20"
        style={{ animation: "everydayCloudDrift 30s ease-in-out infinite alternate" }}
      >
        <svg viewBox="0 0 1000 40" className="w-full h-full" preserveAspectRatio="none" fill="none">
          <path
            d="M0,14 Q220,2 450,18 T900,12 T1000,14 L1000,0 L0,0 Z"
            fill="rgba(99, 102, 241, 0.25)"
          />
        </svg>
      </div>

      {/* 4. Ngôi sao đêm lấp lánh rất nhẹ */}
      <div
        className="absolute top-2 left-[20%] w-1 h-1 rounded-full bg-indigo-200/80 shadow-[0_0_4px_#A5B4FC] opacity-65 everyday-anim"
        style={{ animation: "everydayTwinkle 4.2s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3 left-[62%] w-1 h-1 rounded-full bg-blue-200/70 shadow-[0_0_4px_#BFDBFE] opacity-60 everyday-anim"
        style={{ animation: "everydayTwinkle 5.2s ease-in-out infinite 1.8s" }}
      />
      <div
        className="absolute top-2.5 right-[16%] hidden md:block w-1 h-1 rounded-full bg-purple-200/70 shadow-[0_0_4px_#E9D5FF] opacity-55 everyday-anim"
        style={{ animation: "everydayTwinkle 4.8s ease-in-out infinite 0.9s" }}
      />
    </>
  );
}

function EverydaySceneRenderer({ period }: { period: TimePeriod }) {
  switch (period) {
    case "morning":
      return <MorningNavbarScene />;
    case "day":
      return <DayNavbarScene />;
    case "golden-hour":
      return <GoldenHourNavbarScene />;
    case "night":
    default:
      return <NightNavbarScene />;
  }
}

export function EverydayNavbarAtmosphere() {
  const period = useTimeAtmosphere();

  return (
    <div
      aria-hidden="true"
      data-time-period={period}
      className="absolute inset-0 pointer-events-none select-none z-[1] overflow-hidden contain-paint isolate"
    >
      <style>{`
        @keyframes everydaySunriseGlow {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.06); opacity: 0.95; }
        }
        @keyframes everydayDaylightBreathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.04); opacity: 0.9; }
        }
        @keyframes everydaySunsetPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes everydayMoonGlow {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.05); opacity: 0.95; }
        }
        @keyframes everydayCloudDrift {
          0% { transform: translate3d(-45px, 0, 0); }
          100% { transform: translate3d(45px, 0, 0); }
        }
        @keyframes everydayCloudDriftSlow {
          0% { transform: translate3d(-35px, 0, 0); }
          100% { transform: translate3d(35px, 0, 0); }
        }
        @keyframes everydayTwinkle {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.35); opacity: 0.95; }
        }

        .everyday-anim {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>

      {/* RENDER SCENE CHO 4 TIME STATES */}
      <EverydaySceneRenderer period={period} />

      {/* VIGNETTE MỀM 2 BÊN MÉP (Không viền, hòa tự nhiên vào mép màn hình) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
}

export default React.memo(EverydayNavbarAtmosphere);
