"use client";

import React from "react";

export interface MovieRouletteDice3DProps {
  compact?: boolean;
}

// 3x3 pip coordinates:
// 0 1 2
// 3 4 5
// 6 7 8
const PIP_CONFIGS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DICE_STYLES = `
/* ============================================================================
   CINEMATIC 3D TUMBLING & BOUNCE PHYSICS KEYFRAMES
   Pacing: Lift (0-15%) -> Peak Tumbling (25-55%) -> Deceleration & Bounce (70-90%) -> Settle (90-100%)
   ============================================================================ */

@keyframes diceTumbleOne {
  0% {
    transform: translate3d(-24px, 0px, 0px) rotateX(15deg) rotateY(20deg) rotateZ(0deg);
  }
  14% {
    transform: translate3d(-20px, -16px, 12px) rotateX(75deg) rotateY(90deg) rotateZ(20deg);
  }
  34% {
    transform: translate3d(-30px, -46px, 28px) rotateX(210deg) rotateY(260deg) rotateZ(85deg);
  }
  54% {
    transform: translate3d(-16px, -36px, -12px) rotateX(390deg) rotateY(440deg) rotateZ(165deg);
  }
  72% {
    transform: translate3d(-26px, 3px, 14px) rotateX(540deg) rotateY(580deg) rotateZ(250deg);
  }
  84% {
    transform: translate3d(-22px, -8px, 6px) rotateX(630deg) rotateY(650deg) rotateZ(305deg);
  }
  94% {
    transform: translate3d(-24px, 1px, -1px) rotateX(700deg) rotateY(710deg) rotateZ(345deg);
  }
  100% {
    transform: translate3d(-24px, 0px, 0px) rotateX(735deg) rotateY(740deg) rotateZ(360deg);
  }
}

@keyframes diceTumbleTwo {
  0% {
    transform: translate3d(24px, 0px, 0px) rotateX(-20deg) rotateY(-25deg) rotateZ(0deg);
  }
  12% {
    transform: translate3d(26px, -12px, -8px) rotateX(-65deg) rotateY(-80deg) rotateZ(-15deg);
  }
  32% {
    transform: translate3d(20px, -42px, -22px) rotateX(-210deg) rotateY(-240deg) rotateZ(-75deg);
  }
  52% {
    transform: translate3d(32px, -48px, 22px) rotateX(-390deg) rotateY(-430deg) rotateZ(-170deg);
  }
  70% {
    transform: translate3d(22px, 3px, -10px) rotateX(-540deg) rotateY(-570deg) rotateZ(-260deg);
  }
  82% {
    transform: translate3d(26px, -7px, 6px) rotateX(-625deg) rotateY(-640deg) rotateZ(-310deg);
  }
  92% {
    transform: translate3d(24px, 1px, 2px) rotateX(-705deg) rotateY(-710deg) rotateZ(-348deg);
  }
  100% {
    transform: translate3d(24px, 0px, 0px) rotateX(-740deg) rotateY(-745deg) rotateZ(-360deg);
  }
}

@keyframes diceShadowOne {
  0%, 100% {
    transform: translate3d(-24px, 0, 0) scale(1);
    opacity: 0.65;
  }
  14% {
    transform: translate3d(-20px, 0, 0) scale(0.75);
    opacity: 0.45;
  }
  34% {
    transform: translate3d(-30px, 0, 0) scale(0.42);
    opacity: 0.18;
  }
  54% {
    transform: translate3d(-16px, 0, 0) scale(0.5);
    opacity: 0.25;
  }
  72% {
    transform: translate3d(-26px, 0, 0) scale(1.15);
    opacity: 0.85;
  }
  84% {
    transform: translate3d(-22px, 0, 0) scale(0.85);
    opacity: 0.55;
  }
  94% {
    transform: translate3d(-24px, 0, 0) scale(1.05);
    opacity: 0.75;
  }
}

@keyframes diceShadowTwo {
  0%, 100% {
    transform: translate3d(24px, 0, 0) scale(1);
    opacity: 0.65;
  }
  12% {
    transform: translate3d(26px, 0, 0) scale(0.8);
    opacity: 0.5;
  }
  32% {
    transform: translate3d(20px, 0, 0) scale(0.45);
    opacity: 0.2;
  }
  52% {
    transform: translate3d(32px, 0, 0) scale(0.4);
    opacity: 0.16;
  }
  70% {
    transform: translate3d(22px, 0, 0) scale(1.15);
    opacity: 0.85;
  }
  82% {
    transform: translate3d(26px, 0, 0) scale(0.85);
    opacity: 0.55;
  }
  92% {
    transform: translate3d(24px, 0, 0) scale(1.05);
    opacity: 0.75;
  }
}

/* Reduced motion fallback: Gentle floating drift instead of tumbling */
@keyframes diceFloatOneReduced {
  0%, 100% {
    transform: translate3d(-24px, 0px, 0px) rotateX(15deg) rotateY(20deg);
  }
  50% {
    transform: translate3d(-24px, -8px, 6px) rotateX(25deg) rotateY(30deg);
  }
}

@keyframes diceFloatTwoReduced {
  0%, 100% {
    transform: translate3d(24px, 0px, 0px) rotateX(-20deg) rotateY(-25deg);
  }
  50% {
    transform: translate3d(24px, -8px, -6px) rotateX(-10deg) rotateY(-15deg);
  }
}

.dice-active-1 {
  animation: diceTumbleOne 1.62s cubic-bezier(0.35, 0.05, 0.45, 0.98) infinite !important;
  will-change: transform;
}

.dice-active-2 {
  animation: diceTumbleTwo 1.72s cubic-bezier(0.35, 0.05, 0.45, 0.98) infinite !important;
  will-change: transform;
}

.dice-shadow-active-1 {
  animation: diceShadowOne 1.62s cubic-bezier(0.35, 0.05, 0.45, 0.98) infinite !important;
  will-change: transform, opacity;
}

.dice-shadow-active-2 {
  animation: diceShadowTwo 1.72s cubic-bezier(0.35, 0.05, 0.45, 0.98) infinite !important;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .dice-active-1 {
    animation: diceFloatOneReduced 3s ease-in-out infinite !important;
  }
  .dice-active-2 {
    animation: diceFloatTwoReduced 3.2s ease-in-out infinite !important;
  }
}
`;

interface DieProps {
  theme: "ruby" | "amber";
  size: number;
  className?: string;
}

const Die: React.FC<DieProps> = ({ theme, size, className }) => {
  const half = Math.round(size / 2);
  const isRuby = theme === "ruby";

  const faceThemes = isRuby
    ? "bg-gradient-to-br from-red-600 via-rose-700 to-zinc-950 border-2 border-amber-400/60 shadow-[inset_0_0_12px_rgba(255,255,255,0.35)]"
    : "bg-gradient-to-br from-amber-400 via-amber-600 to-zinc-950 border-2 border-yellow-300/60 shadow-[inset_0_0_12px_rgba(255,255,255,0.4)]";

  const pipStyle = isRuby
    ? "bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.95)]"
    : "bg-zinc-950 border border-amber-200/60 shadow-[0_0_4px_rgba(0,0,0,0.9)]";

  const renderFace = (faceNumber: number, transformStyle: string) => {
    const activePips = PIP_CONFIGS[faceNumber] || [];
    return (
      <div
        className={`absolute inset-0 rounded-xl sm:rounded-2xl p-1.5 grid grid-cols-3 grid-rows-3 items-center justify-items-center select-none ${faceThemes}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: transformStyle,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
          const hasPip = activePips.includes(idx);
          if (!hasPip) {
            return <span key={idx} className="w-1.5 h-1.5" />;
          }

          const isAceCenter = isRuby && faceNumber === 1 && idx === 4;

          return (
            <span
              key={idx}
              className={`rounded-full ${
                isAceCenter
                  ? "w-3 h-3 bg-amber-200 shadow-[0_0_8px_rgba(251,191,36,1)] ring-1 ring-amber-400"
                  : size < 44
                  ? "w-1.5 h-1.5"
                  : "w-2 h-2"
              } ${pipStyle}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`relative ${className || ""}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
      }}
    >
      {/* SOLID INNER CORE BOX TO PREVENT 3D GAPS */}
      <div
        className="absolute inset-1 rounded-lg bg-zinc-950"
        style={{
          transform: "translateZ(0px)",
        }}
      />

      {/* 6 authentic 3D faces (opposites sum to 7: 1+6, 2+5, 3+4) */}
      {renderFace(1, `translateZ(${half}px)`)}
      {renderFace(6, `rotateY(180deg) translateZ(${half}px)`)}
      {renderFace(2, `rotateX(-90deg) translateZ(${half}px)`)}
      {renderFace(5, `rotateX(90deg) translateZ(${half}px)`)}
      {renderFace(3, `rotateY(90deg) translateZ(${half}px)`)}
      {renderFace(4, `rotateY(-90deg) translateZ(${half}px)`)}
    </div>
  );
};

export const MovieRouletteDice3D: React.FC<MovieRouletteDice3DProps> = ({
  compact = false,
}) => {
  const dieSize = compact ? 44 : 50;

  return (
    <div
      className={`relative w-full flex items-center justify-center select-none ${
        compact ? "py-6" : "py-12 min-h-[360px]"
      }`}
    >
      {/* NATIVE STYLE TAG FOR RELIABLE 3D KEYFRAME ANIMATIONS */}
      <style dangerouslySetInnerHTML={{ __html: DICE_STYLES }} />

      {/* CINEMATIC STAGE ATMOSPHERE */}
      <div className="relative flex items-center justify-center">
        {/* DUAL SPOTLIGHT GLOW (Ruby on Left, Warm Amber on Right) */}
        <div className="absolute -left-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-tr from-rose-600/20 via-red-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-tl from-amber-500/20 via-yellow-600/10 to-transparent blur-3xl pointer-events-none" />

        {/* DARK CINEMA PEDESTAL STAGE (Subtle reflective stage floor) */}
        <div
          className="absolute -bottom-5 w-48 sm:w-56 h-10 rounded-[100%] pointer-events-none border-t border-amber-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.9)]"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 50% 40%, rgba(30, 20, 25, 0.8) 0%, rgba(10, 10, 12, 0.95) 70%, transparent 100%)",
          }}
        />

        {/* 3D ARENA CONTAINER (STRICT PRESERVE-3D, NO 2D FLATTENING) */}
        <div
          className="relative flex items-center justify-center"
          style={{
            perspective: "700px",
            perspectiveOrigin: "50% 50%",
            width: "160px",
            height: `${dieSize + 54}px`,
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
          }}
        >
          {/* GROUND SHADOWS */}
          <div
            className="absolute bottom-1 w-full flex items-center justify-center pointer-events-none"
            style={{ height: "14px" }}
          >
            <div className="w-11 h-3.5 rounded-full bg-amber-950/80 blur-[3px] dice-shadow-active-1" />
            <div className="w-11 h-3.5 rounded-full bg-black/90 blur-[3px] dice-shadow-active-2" />
          </div>

          {/* 3D TUMBLING DICE PAIR */}
          <div
            className="relative flex items-center justify-center"
            style={{
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d",
            }}
          >
            {/* DIE 1: CINEMA RUBY (RED & GOLD) */}
            <Die
              theme="ruby"
              size={dieSize}
              className="dice-active-1"
            />

            {/* DIE 2: MYSTIC AMBER (GOLD & OBSIDIAN) */}
            <Die
              theme="amber"
              size={dieSize}
              className="dice-active-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieRouletteDice3D;
