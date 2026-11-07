"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MatchKeyEvent,
  MatchCommentaryItem,
  MatchStatItem,
} from "@/services/live/football-score/types";
import { Activity, Clock, ArrowLeftRight, MessageSquare } from "lucide-react";

export interface MatchTimelineSidebarProps {
  events?: MatchKeyEvent[];
  commentary?: MatchCommentaryItem[];
  stats?: MatchStatItem[];
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
 * Chuẩn hóa số phút thi đấu: loại bỏ triệt để dấu nháy đơn/kép dư thừa
 */
function formatEventMinute(raw?: string): string {
  if (!raw) return "•";
  const normalized = raw.trim().replace(/['’"“”\s]+$/g, "").trim();
  return normalized ? `${normalized}'` : "•";
}

/**
 * Trích xuất giá trị số phút để sắp xếp theo thời gian
 */
function parseMinuteNumber(raw?: string): number {
  if (!raw) return 0;
  const m = raw.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  const base = parseInt(m[1], 10) || 0;
  const extra = parseInt(m[2], 10) || 0;
  return base * 100 + extra;
}

interface FeedItem {
  id: string;
  minuteNum: number;
  timeDisplay: string;
  text: string;
  type: "commentary" | "goal" | "yellow-card" | "red-card" | "substitution" | "other";
  playerName?: string;
  teamName?: string;
  isHome?: boolean;
}

export const MatchTimelineSidebar: React.FC<MatchTimelineSidebarProps> = ({
  events = [],
  commentary = [],
  stats = [],
  homeTeamName,
  awayTeamName,
  isLive,
  displayClock,
  statusText,
  loading = false,
}) => {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cuộn về đỉnh khi đổi thứ tự
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [sortOrder]);

  // 1. TRÍCH XUẤT MINI STATS (Kiểm soát bóng + 3 chỉ số nhanh)
  const possessionStat = useMemo(() => {
    return stats.find(
      (s) =>
        s.name === "possessionPct" ||
        /kiểm soát|possession/i.test(s.name) ||
        /kiểm soát|possession/i.test(s.label)
    );
  }, [stats]);

  const shotsStat = useMemo(() => {
    return stats.find(
      (s) => s.name === "totalShots" || s.name === "shotsTotal" || /tổng số cú sút|shots/i.test(s.name)
    );
  }, [stats]);

  const onTargetStat = useMemo(() => {
    return stats.find(
      (s) => s.name === "shotsOnTarget" || /sút trúng đích|on target/i.test(s.name)
    );
  }, [stats]);

  const cornersStat = useMemo(() => {
    return stats.find(
      (s) => s.name === "wonCorners" || s.name === "cornerKicks" || /phạt góc|corner/i.test(s.name)
    );
  }, [stats]);

  const { homePossPct, awayPossPct } = useMemo(() => {
    if (!possessionStat) return { homePossPct: 50, awayPossPct: 50 };
    const h = parseFloat(possessionStat.homeValue) || 50;
    const a = parseFloat(possessionStat.awayValue) || 50;
    const total = h + a;
    if (total === 0) return { homePossPct: 50, awayPossPct: 50 };
    const hPct = Math.round((h / total) * 100);
    return { homePossPct: hPct, awayPossPct: 100 - hPct };
  }, [possessionStat]);

  const hasStats = Boolean(possessionStat || shotsStat || onTargetStat || cornersStat);

  // 2. HỢP NHẤT LIVE FEED (Bình luận + Sự kiện Highlight)
  const unifiedFeed = useMemo(() => {
    const items: FeedItem[] = [];

    // Map các sự kiện đặc biệt theo phút để highlight chính xác
    const eventTimeMap = new Map<string, MatchKeyEvent>();
    events.forEach((ev) => {
      if (ev.clock) {
        const key = ev.clock.replace(/['’"“”\s]+/g, "");
        eventTimeMap.set(key, ev);
      }
    });

    // A. Nếu có commentary từ API
    if (commentary.length > 0) {
      commentary.forEach((c, idx) => {
        const text = c.text || "";
        const rawTime = c.time || "";
        const cleanTimeKey = rawTime.replace(/['’"“”\s]+/g, "");
        const matchedEv = cleanTimeKey ? eventTimeMap.get(cleanTimeKey) : undefined;

        let type: FeedItem["type"] = "commentary";
        let teamName: string | undefined = undefined;
        let isHome: boolean | undefined = undefined;

        if (matchedEv) {
          type = matchedEv.type;
          isHome = matchedEv.homeAway === "home";
          teamName = isHome ? homeTeamName : awayTeamName;
        } else if (/goal|bàn thắng/i.test(text)) {
          type = "goal";
        } else if (/red card|thẻ đỏ/i.test(text)) {
          type = "red-card";
        } else if (/yellow card|thẻ vàng/i.test(text)) {
          type = "yellow-card";
        } else if (/substitution|thay người/i.test(text)) {
          type = "substitution";
        }

        items.push({
          id: `c-${idx}`,
          minuteNum: parseMinuteNumber(rawTime),
          timeDisplay: formatEventMinute(rawTime),
          text,
          type,
          playerName: matchedEv?.playerName,
          teamName,
          isHome,
        });
      });
    }

    // B. Kiểm tra sự kiện nào trong events chưa có trong feed thì bổ sung
    events.forEach((ev, idx) => {
      const cleanKey = (ev.clock || "").replace(/['’"“”\s]+/g, "");
      const exists = items.some((it) => it.type === ev.type && it.minuteNum === parseMinuteNumber(ev.clock));
      if (!exists) {
        const isHome = ev.homeAway === "home";
        const teamName = isHome ? homeTeamName : awayTeamName;
        let eventText = ev.text || "";
        if (!eventText) {
          if (ev.type === "goal") eventText = `Bàn thắng: ${ev.playerName || teamName}`;
          else if (ev.type === "yellow-card") eventText = `Thẻ vàng: ${ev.playerName || teamName}`;
          else if (ev.type === "red-card") eventText = `Thẻ đỏ: ${ev.playerName || teamName}`;
          else if (ev.type === "substitution") {
            eventText = ev.subInPlayer ? `Vào: ${ev.subInPlayer} • Ra: ${ev.subOutPlayer || ""}` : `Thay người (${teamName})`;
          }
        }

        items.push({
          id: `ev-${idx}-${cleanKey}`,
          minuteNum: parseMinuteNumber(ev.clock),
          timeDisplay: formatEventMinute(ev.clock),
          text: eventText,
          type: ev.type,
          playerName: ev.playerName || ev.subInPlayer,
          teamName,
          isHome,
        });
      }
    });

    // C. Sắp xếp theo thứ tự người dùng chọn
    if (sortOrder === "newest") {
      items.sort((a, b) => b.minuteNum - a.minuteNum);
    } else {
      items.sort((a, b) => a.minuteNum - b.minuteNum);
    }

    return items;
  }, [commentary, events, homeTeamName, awayTeamName, sortOrder]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-500 space-y-2">
        <Activity className="w-5 h-5 animate-pulse text-netflix-red" />
        <p className="text-xs font-semibold">Đang tải diễn biến...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
      {/* 1. MINI STATS WIDGET PHÍA TRÊN CÙNG (~75px, CỐ ĐỊNH) */}
      {hasStats && (
        <div className="px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 shrink-0">
          {/* Thanh tỉ lệ kiểm soát bóng */}
          {possessionStat && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-sans font-bold tabular-nums">
                <span className="text-white truncate max-w-[110px]">
                  {homeTeamName} {possessionStat.homeValue}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0 px-1">
                  Kiểm soát
                </span>
                <span className="text-white truncate max-w-[110px] text-right">
                  {possessionStat.awayValue} {awayTeamName}
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5 gap-0.5">
                <div
                  className="bg-netflix-red rounded-l-full transition-all duration-500"
                  style={{ width: `${homePossPct}%` }}
                />
                <div
                  className="bg-sky-500 rounded-r-full transition-all duration-500"
                  style={{ width: `${awayPossPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Hàng 3 chỉ số nhanh: Sút - Trúng đích - Phạt góc */}
          {(shotsStat || onTargetStat || cornersStat) && (
            <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
              {shotsStat && (
                <div className="px-1 py-0.5 rounded-lg bg-white/[0.02]">
                  <span className="text-[9.5px] font-semibold text-zinc-400 block truncate">Sút</span>
                  <span className="text-xs font-bold font-sans tabular-nums text-white">
                    {shotsStat.homeValue} - {shotsStat.awayValue}
                  </span>
                </div>
              )}
              {onTargetStat && (
                <div className="px-1 py-0.5 rounded-lg bg-white/[0.02]">
                  <span className="text-[9.5px] font-semibold text-zinc-400 block truncate">Trúng đích</span>
                  <span className="text-xs font-bold font-sans tabular-nums text-white">
                    {onTargetStat.homeValue} - {onTargetStat.awayValue}
                  </span>
                </div>
              )}
              {cornersStat && (
                <div className="px-1 py-0.5 rounded-lg bg-white/[0.02]">
                  <span className="text-[9.5px] font-semibold text-zinc-400 block truncate">Phạt góc</span>
                  <span className="text-xs font-bold font-sans tabular-nums text-white">
                    {cornersStat.homeValue} - {cornersStat.awayValue}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. HEADER ĐIỀU HƯỚNG LIVE FEED (TIÊU ĐỀ GỌN + NÚT CHỌN THỨ TỰ) */}
      <div className="flex items-center justify-between px-1 pb-1 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse shrink-0" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate font-sans">
            Diễn biến
          </h4>
          {displayClock && (
            <span className="text-[10px] font-sans font-bold tabular-nums text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded shrink-0">
              {displayClock}
            </span>
          )}
        </div>

        {/* Nút Segmented Control chọn thứ tự rõ ràng */}
        <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setSortOrder("newest")}
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
              sortOrder === "newest"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Mới nhất
          </button>
          <button
            type="button"
            onClick={() => setSortOrder("oldest")}
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
              sortOrder === "oldest"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Cũ nhất
          </button>
        </div>
      </div>

      {/* 3. DÒNG BÌNH LUẬN & SỰ KIỆN CUỘN MƯỢT MÀ (FLAT STREAM - KHÔNG LỒNG THẺ) */}
      {unifiedFeed.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
            <Clock className="w-5 h-5 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-zinc-300 font-sans">
            Chưa có diễn biến
          </p>
          <p className="text-[11px] text-zinc-500 max-w-[200px] font-sans leading-relaxed">
            Dữ liệu sẽ hiển thị khi có sự kiện từ sân cỏ.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-white/[0.04] scrollbar-thin"
        >
          {unifiedFeed.map((item) => {
            // A. BÀN THẮNG ⚽
            if (item.type === "goal") {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2.5 px-2 rounded-lg bg-rose-500/10 border-l-2 border-rose-500 text-xs my-0.5"
                >
                  <span className="w-9 shrink-0 text-right font-mono font-black tabular-nums text-rose-400 pt-0.5">
                    {item.timeDisplay}
                  </span>
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center pt-0.5">
                    <SoccerBallIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-rose-300 block text-[11px]">BÀN THẮNG</span>
                    <p className="text-zinc-200 leading-snug font-sans">{item.text}</p>
                  </div>
                </div>
              );
            }

            // B. THẺ VÀNG 🟨
            if (item.type === "yellow-card") {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-lg bg-amber-500/10 border-l-2 border-amber-400 text-xs my-0.5"
                >
                  <span className="w-9 shrink-0 text-right font-mono font-black tabular-nums text-amber-400 pt-0.5">
                    {item.timeDisplay}
                  </span>
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center pt-0.5">
                    <span className="w-2.5 h-3.5 rounded-[1.5px] bg-amber-400 shadow-sm inline-block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-amber-300 block text-[11px]">Thẻ vàng</span>
                    <p className="text-zinc-200 leading-snug font-sans">{item.text}</p>
                  </div>
                </div>
              );
            }

            // C. THẺ ĐỎ 🟥
            if (item.type === "red-card") {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-lg bg-red-600/15 border-l-2 border-red-500 text-xs my-0.5"
                >
                  <span className="w-9 shrink-0 text-right font-mono font-black tabular-nums text-red-400 pt-0.5">
                    {item.timeDisplay}
                  </span>
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center pt-0.5">
                    <span className="w-2.5 h-3.5 rounded-[1.5px] bg-red-600 shadow-sm inline-block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-red-300 block text-[11px]">Thẻ đỏ</span>
                    <p className="text-zinc-200 leading-snug font-sans">{item.text}</p>
                  </div>
                </div>
              );
            }

            // D. THAY NGƯỜI 🔄
            if (item.type === "substitution") {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-lg bg-sky-500/10 border-l-2 border-sky-400 text-xs my-0.5"
                >
                  <span className="w-9 shrink-0 text-right font-mono font-black tabular-nums text-sky-400 pt-0.5">
                    {item.timeDisplay}
                  </span>
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center pt-0.5 text-sky-400">
                    <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sky-300 block text-[11px]">Thay người</span>
                    <p className="text-zinc-200 leading-snug font-sans">{item.text}</p>
                  </div>
                </div>
              );
            }

            // E. TÌNH HUỐNG BÌNH THƯỜNG (Dòng phẳng nhẹ nhàng)
            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 py-2 px-1 hover:bg-white/[0.02] rounded-lg transition text-xs"
              >
                <span className="w-9 shrink-0 text-right font-mono font-bold tabular-nums text-amber-400/90 pt-0.5">
                  {item.timeDisplay}
                </span>
                <p className="text-zinc-300 leading-relaxed flex-1 font-sans">{item.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchTimelineSidebar;
