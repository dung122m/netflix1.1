"use client";

import React from "react";
import { MatchKeyEvent } from "@/services/live/football-score/types";
import { Activity, Clock, ArrowLeftRight } from "lucide-react";

interface MatchTimelineSidebarProps {
  events?: MatchKeyEvent[];
  homeTeamName: string;
  awayTeamName: string;
  isLive?: boolean;
  displayClock?: string;
  statusText?: string;
  loading?: boolean;
}

/**
 * Icon Quả bóng đá chuẩn quốc tế (FIFA / Adidas Telstar classic geometry)
 */
export function SoccerBallIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0 inline-block drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#09090b" strokeWidth="1.2" />
      <polygon points="12,8 15.3,10.4 14.1,14.2 9.9,14.2 8.7,10.4" fill="#09090b" />
      <line x1="12" y1="8" x2="12" y2="2" stroke="#09090b" strokeWidth="1.2" />
      <line x1="15.3" y1="10.4" x2="21" y2="8.5" stroke="#09090b" strokeWidth="1.2" />
      <line x1="14.1" y1="14.2" x2="17.6" y2="19.7" stroke="#09090b" strokeWidth="1.2" />
      <line x1="9.9" y1="14.2" x2="6.4" y2="19.7" stroke="#09090b" strokeWidth="1.2" />
      <line x1="8.7" y1="10.4" x2="3" y2="8.5" stroke="#09090b" strokeWidth="1.2" />
      <path d="M10 2.2C10.6 2.06 11.3 2 12 2c.7 0 1.4.06 2 .2l-.8 2.3h-2.4L10 2.2z" fill="#09090b" />
      <path d="M21 8.5c.5.9.8 1.9.9 3l-2.4.4-.9-2.1 2.4-1.3z" fill="#09090b" />
      <path d="M17.6 19.7c-.8.6-1.7 1.1-2.7 1.4l-.5-2.4 2-1.2 1.2 2.2z" fill="#09090b" />
      <path d="M6.4 19.7c.8.6 1.7 1.1 2.7 1.4l.5-2.4-2-1.2-1.2 2.2z" fill="#09090b" />
      <path d="M3 8.5c-.5.9-.8 1.9-.9 3l2.4.4.9-2.1L3 8.5z" fill="#09090b" />
    </svg>
  );
}

/**
 * Chuẩn hóa số phút thi đấu: loại bỏ triệt để dấu nháy đơn/kép và khoảng trắng dư thừa
 */
function formatEventMinute(raw?: string): string {
  if (!raw) return "-";
  const normalized = raw.trim().replace(/['’"“”\s]+$/g, "").trim();
  return normalized ? `${normalized}'` : "-";
}

export const MatchTimelineSidebar: React.FC<MatchTimelineSidebarProps> = ({
  events = [],
  homeTeamName,
  awayTeamName,
  isLive,
  displayClock,
  statusText,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-500 space-y-2">
        <Activity className="w-5 h-5 animate-pulse text-netflix-red" />
        <p className="text-xs font-semibold">Đang tải diễn biến trực tiếp...</p>
      </div>
    );
  }

  // Sắp xếp sự kiện: sự kiện mới nhất lên trên
  const sortedEvents = [...events].reverse();

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
      {/* Mini Header thanh bên */}
      <div className="flex items-center justify-between px-1 pb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse shrink-0" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate font-sans">
            Diễn biến trận đấu
          </h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {displayClock ? (
            <span className="text-[11px] font-sans font-bold tabular-nums text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {displayClock}
            </span>
          ) : isLive ? (
            <span className="text-[10px] font-bold text-red-400 uppercase bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse font-sans">
              Trực tiếp
            </span>
          ) : statusText ? (
            <span className="text-[10px] font-medium text-zinc-400 font-sans">
              {statusText}
            </span>
          ) : null}
        </div>
      </div>

      {/* Danh sách các sự kiện theo dòng thời gian */}
      {sortedEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
            <Clock className="w-5 h-5 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-zinc-300 font-sans">
            Chưa có diễn biến trực tiếp
          </p>
          <p className="text-[11px] text-zinc-500 max-w-[220px] font-sans leading-relaxed">
            Trận đấu chưa có dữ liệu sự kiện hoặc đang được cập nhật trực tiếp qua luồng phát video.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
          {sortedEvents.map((ev, index) => {
            const isHome = ev.homeAway === "home";
            const isAway = ev.homeAway === "away";
            const teamLabel = isHome
              ? homeTeamName
              : isAway
                ? awayTeamName
                : undefined;

            // Render icon phẳng, vector sắc nét chuẩn thể thao quốc tế
            let iconElement = <span className="text-xs text-amber-400 font-bold">⚡</span>;

            if (ev.type === "goal") {
              iconElement = <SoccerBallIcon className="w-4 h-4 shrink-0 drop-shadow" />;
            } else if (ev.type === "yellow-card") {
              iconElement = (
                <span
                  className="w-2.5 h-3.5 rounded-[1.5px] bg-amber-400 shadow-sm inline-block shrink-0"
                  title="Thẻ vàng"
                />
              );
            } else if (ev.type === "red-card") {
              iconElement = (
                <span
                  className="w-2.5 h-3.5 rounded-[1.5px] bg-rose-600 shadow-sm inline-block shrink-0"
                  title="Thẻ đỏ"
                />
              );
            } else if (ev.type === "substitution") {
              iconElement = (
                <span
                  className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0"
                  title="Thay người"
                >
                  <ArrowLeftRight className="w-3 h-3 stroke-[2.5]" />
                </span>
              );
            }

            return (
              <div
                key={ev.id || index}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition ${
                  isHome
                    ? "bg-rose-500/[0.08] hover:bg-rose-500/[0.12]"
                    : isAway
                      ? "bg-sky-500/[0.08] hover:bg-sky-500/[0.12]"
                      : "bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                {/* 1. CỘT PHÚT: Cố định độ rộng w-12, căn phải, font-sans tabular-nums thẳng tắp */}
                <span className="w-12 shrink-0 text-right font-sans font-bold tabular-nums text-xs text-amber-400 leading-none">
                  {formatEventMinute(ev.clock)}
                </span>

                {/* 2. CỘT ICON: Cố định độ rộng w-6 h-6, căn giữa, KHÔNG CÓ BORDER BAO QUANH */}
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  {iconElement}
                </div>

                {/* 3. CHI TIẾT SỰ KIỆN: Thẳng hàng tắp theo trục dọc */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate font-sans leading-snug">
                    {ev.playerName || (ev.subInPlayer ? `Vào: ${ev.subInPlayer}` : ev.text)}
                  </p>
                  {ev.subOutPlayer && (
                    <p className="text-[11px] text-zinc-400 truncate font-sans leading-snug">
                      Ra: {ev.subOutPlayer}
                    </p>
                  )}
                  {teamLabel && (
                    <p
                      className={`text-[10px] font-semibold tracking-wide uppercase truncate font-sans mt-0.5 leading-none ${
                        isHome ? "text-rose-400" : "text-sky-400"
                      }`}
                    >
                      {teamLabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchTimelineSidebar;
