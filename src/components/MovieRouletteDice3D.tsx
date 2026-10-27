"use client";

import React from "react";

export interface MovieRouletteDice3DProps {
  compact?: boolean;
  targetValues?: [number, number]; // Giá trị mục tiêu [viên 1, viên 2], từ 1 đến 6
}

// 3x3 grid pip coordinates:
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

interface DieFaceAssignment {
  top: number;
  bottom: number;
  front: number;
  back: number;
  left: number;
  right: number;
}

/**
 * Phân bổ sáu mặt xúc xắc chuẩn xác:
 * - Mặt TRÊN (Top Face) = target
 * - Mặt DƯỚI (Bottom Face) = 7 - target
 * - Các cặp mặt đối diện (Front/Back, Left/Right) đều có tổng bằng 7
 */
function getDieFacesForTarget(target: number): DieFaceAssignment {
  const t = Math.min(6, Math.max(1, Math.round(target || 6)));
  switch (t) {
    case 1:
      return { top: 1, bottom: 6, front: 2, back: 5, right: 3, left: 4 };
    case 2:
      return { top: 2, bottom: 5, front: 1, back: 6, right: 3, left: 4 };
    case 3:
      return { top: 3, bottom: 4, front: 1, back: 6, right: 2, left: 5 };
    case 4:
      return { top: 4, bottom: 3, front: 1, back: 6, right: 2, left: 5 };
    case 5:
      return { top: 5, bottom: 2, front: 1, back: 6, right: 3, left: 4 };
    case 6:
    default:
      return { top: 6, bottom: 1, front: 2, back: 5, right: 3, left: 4 };
  }
}

interface PorcelainDieProps {
  size: number;
  target: number;
  className?: string;
}

const PorcelainDie: React.FC<PorcelainDieProps> = ({ size, target, className }) => {
  const half = Math.round(size / 2);
  const isCompact = size < 48;
  const faces = getDieFacesForTarget(target);

  // Render từng mặt xúc xắc với phân tầng ánh sáng tự nhiên (Top sáng nhất, Front trung tính, Side có bóng)
  const renderFace = (
    faceNumber: number,
    transformStyle: string,
    lightRole: "top" | "front" | "side" | "bottom"
  ) => {
    const activePips = PIP_CONFIGS[faceNumber] || [];
    const isAce = faceNumber === 1;

    // Phân cấp màu nền và viền theo vai trò ánh sáng để cạnh 3D sắc nét tuyệt đối
    let bgStyle = "";
    let borderStyle = "";
    let shadowStyle = "";

    if (lightRole === "top") {
      bgStyle = "linear-gradient(145deg, #ffffff 0%, #fbf8f3 40%, #f2ebd9 100%)";
      borderStyle = "1px solid rgba(215, 205, 190, 0.9)";
      shadowStyle =
        "inset 0 1.5px 2px rgba(255, 255, 255, 0.95), inset 0 -1.5px 2px rgba(0,0,0,0.04)";
    } else if (lightRole === "front") {
      bgStyle = "linear-gradient(145deg, #eee7db 0%, #e4dcce 50%, #d8cec0 100%)";
      borderStyle = "1px solid rgba(195, 185, 170, 0.9)";
      shadowStyle =
        "inset 0 1px 2px rgba(255, 255, 255, 0.45), inset 0 -1px 3px rgba(0,0,0,0.08)";
    } else if (lightRole === "side") {
      bgStyle = "linear-gradient(145deg, #ded5c5 0%, #d3c9b9 50%, #c6bcaa 100%)";
      borderStyle = "1px solid rgba(180, 170, 155, 0.95)";
      shadowStyle =
        "inset 0 1px 2px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0,0,0,0.12)";
    } else {
      bgStyle = "#bfb4a2";
      borderStyle = "1px solid rgba(160, 150, 135, 0.95)";
      shadowStyle = "inset 0 0 6px rgba(0,0,0,0.2)";
    }

    return (
      <div
        className="absolute inset-0 grid grid-cols-3 grid-rows-3 items-center justify-items-center select-none box-border"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: transformStyle,
          borderRadius: isCompact ? "9px" : "11px",
          padding: isCompact ? "4px" : "5.5px",
          background: bgStyle,
          border: borderStyle,
          boxShadow: shadowStyle,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
          const hasPip = activePips.includes(idx);
          if (!hasPip) {
            return <span key={idx} className="w-1 h-1 pointer-events-none" />;
          }

          // Mặt 1 (Ace): Chấm đỏ truyền thống chu sa (Cinnabar Lacquer) chạm nổi
          const isAceCenter = isAce && idx === 4;

          return (
            <span
              key={idx}
              className="rounded-full pointer-events-none"
              style={{
                width: isAceCenter ? (isCompact ? "11px" : "13px") : isCompact ? "7.5px" : "9px",
                height: isAceCenter ? (isCompact ? "11px" : "13px") : isCompact ? "7.5px" : "9px",
                background: isAceCenter
                  ? "radial-gradient(circle at 35% 30%, #ef4444 0%, #dc2626 55%, #991b1b 100%)"
                  : "radial-gradient(circle at 35% 30%, #27272a 0%, #18181b 65%, #09090b 100%)",
                boxShadow: isAceCenter
                  ? "inset 0 1.5px 2px rgba(0, 0, 0, 0.65), inset 0 -0.8px 0.8px rgba(255, 255, 255, 0.35), 0 0.5px 1px rgba(255, 255, 255, 0.45)"
                  : "inset 0 1.5px 2px rgba(0, 0, 0, 0.85), inset 0 -0.5px 0.5px rgba(255, 255, 255, 0.2), 0 0.5px 1px rgba(255, 255, 255, 0.45)",
              }}
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
      {/* KHỐI LÕI ĐỆM NỘI TẠI (INNER BONE CORE) LOẠI BỎ TRIỆT ĐỂ KHE HỞ GÓC 3D */}
      <div
        className="absolute inset-[1px] rounded-lg pointer-events-none"
        style={{
          background: "#ded5c6",
          transform: "translateZ(0px)",
        }}
      />

      {/* 6 MẶT ĐƯỢC ĐỊNH HƯỚNG CHUẨN XÁC: MẶT TRÊN LUÔN HIỂN THỊ TARGET VALUE */}
      {renderFace(faces.top, `rotateX(90deg) translateZ(${half}px)`, "top")}
      {renderFace(faces.front, `translateZ(${half}px)`, "front")}
      {renderFace(faces.left, `rotateY(-90deg) translateZ(${half}px)`, "side")}
      {renderFace(faces.right, `rotateY(90deg) translateZ(${half}px)`, "side")}
      {renderFace(faces.back, `rotateY(180deg) translateZ(${half}px)`, "front")}
      {renderFace(faces.bottom, `rotateX(-90deg) translateZ(${half}px)`, "bottom")}
    </div>
  );
};

export const MovieRouletteDice3D: React.FC<MovieRouletteDice3DProps> = ({
  compact = false,
  targetValues = [5, 6],
}) => {
  // Lấy giá trị mục tiêu hợp lệ [1..6]
  const t1 = Math.min(6, Math.max(1, Math.round(targetValues[0] || 5)));
  const t2 = Math.min(6, Math.max(1, Math.round(targetValues[1] || 6)));

  const dieSize = compact ? 42 : 52;

  return (
    <div
      className={`relative w-full flex items-center justify-center select-none ${
        compact ? "py-3" : "py-8 min-h-[320px]"
      }`}
    >
      {/* SÂN KHẤU NỈ ĐEN & VÙNG SÁNG HỔ PHÁCH TINH TẾ */}
      <div className="relative flex items-center justify-center">
        {/* VÙNG SÁNG DỊU HỔ PHÁCH */}
        <div
          className="absolute -top-8 w-52 sm:w-64 h-36 rounded-full pointer-events-none blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 50%, transparent 80%)",
          }}
        />

        {/* MẶT BÀN GỖ MUN / NỈ ĐEN TRÒN */}
        <div
          className="absolute -bottom-4 w-48 sm:w-56 h-10 rounded-[100%] pointer-events-none border border-white/5 shadow-[0_16px_36px_rgba(0,0,0,0.85)]"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 50% 35%, rgba(30, 30, 36, 0.85) 0%, rgba(12, 12, 15, 0.98) 70%, transparent 100%)",
          }}
        />

        {/* 3D ARENA: TỪNG VIÊN CÓ DIRECT PERSPECTIVE WRAPPER RIÊNG BIỆT (CHỐNG FLATTEN 2D TRÊN CHROMIUM) */}
        <div className="relative flex items-center justify-center gap-10 sm:gap-14">
          {/* DIE 1 ISOLATED 3D STAGE */}
          <div
            style={{
              perspective: "850px",
              perspectiveOrigin: "50% 50%",
              width: `${dieSize}px`,
              height: `${dieSize + 40}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PorcelainDie
              size={dieSize}
              target={t1}
              className="dice-active-1"
            />
          </div>

          {/* DIE 2 ISOLATED 3D STAGE */}
          <div
            style={{
              perspective: "850px",
              perspectiveOrigin: "50% 50%",
              width: `${dieSize}px`,
              height: `${dieSize + 40}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PorcelainDie
              size={dieSize}
              target={t2}
              className="dice-active-2"
            />
          </div>
        </div>

        {/* BÓNG ĐỔ TIẾP ĐỊA ĐỘNG (NẰM DƯỚI ĐÁY BÀN) */}
        <div
          className="absolute bottom-0 w-full flex items-center justify-center gap-10 sm:gap-14 pointer-events-none"
          style={{ height: "14px" }}
        >
          {/* Bóng đổ viên 1 (Trái) */}
          <div
            className="w-12 h-3.5 rounded-full blur-[3px] bg-black/85 dice-shadow-active-1"
            style={{ width: `${dieSize}px` }}
          />
          {/* Bóng đổ viên 2 (Phải) */}
          <div
            className="w-12 h-3.5 rounded-full blur-[3px] bg-black/85 dice-shadow-active-2"
            style={{ width: `${dieSize}px` }}
          />
        </div>
      </div>
    </div>
  );
};

export default MovieRouletteDice3D;
