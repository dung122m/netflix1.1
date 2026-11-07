"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MatchKeyEvent,
  MatchCommentaryItem,
  MatchStatItem,
} from "@/services/live/football-score/types";
import { Activity, Clock, ArrowLeftRight, Sparkles, MessageSquare } from "lucide-react";

export interface MatchTimelineSidebarProps {
  events?: MatchKeyEvent[];
  commentary?: MatchCommentaryItem[];
  stats?: MatchStatItem[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
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
 * Trích xuất giá trị số phút để sắp xếp thời gian chính xác
 */
function parseMinuteNumber(raw?: string): number {
  if (!raw) return 0;
  const m = raw.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  const base = parseInt(m[1], 10) || 0;
  const extra = parseInt(m[2], 10) || 0;
  return base * 100 + extra;
}

interface StreamItem {
  id: string;
  minuteNum: number;
  timeDisplay: string;
  isKeyEvent: boolean;
  type?: "goal" | "yellow-card" | "red-card" | "substitution" | "commentary" | "other";
  title?: string;
  subtitle?: string;
  text: string;
  isHome?: boolean;
  teamLabel?: string;
}

export const MatchTimelineSidebar: React.FC<MatchTimelineSidebarProps> = ({
  events = [],
  commentary = [],
  stats = [],
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
  isLive: _isLive,
  displayClock: _displayClock,
  statusText: _statusText,
  loading = false,
}) => {
  // Chế độ xem: Mặc định là 'all' (Tất cả diễn biến từ sân cỏ), người dùng có thể lọc nhanh 'events'
  const [viewMode, setViewMode] = useState<"events" | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cuộn về đỉnh khi đổi tab hoặc thứ tự
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [viewMode, sortOrder]);

  // Tự động chuyển tab 'events' nếu trận đấu không có commentary nhưng có events
  useEffect(() => {
    if (commentary.length === 0 && events.length > 0) {
      setViewMode("events");
    }
  }, [events.length, commentary.length]);

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

  // 2. DANH SÁCH SỰ KIỆN CHÍNH THỨC (CHÍNH XÁC 100% TỪ summary.events - KHÔNG ĐOÁN TỰ BỊA)
  const pureKeyEvents = useMemo(() => {
    const list: StreamItem[] = events.map((ev, idx) => {
      const isHome = ev.homeAway === "home";
      const isAway = ev.homeAway === "away";
      const teamLabel = isHome ? homeTeamName : isAway ? awayTeamName : undefined;

      let title = ev.playerName || "";
      let subtitle = "";

      if (ev.type === "goal") {
        title = ev.playerName ? `Bàn thắng: ${ev.playerName}` : "BÀN THẮNG";
      } else if (ev.type === "yellow-card") {
        title = ev.playerName ? `${ev.playerName}` : "Thẻ vàng";
        subtitle = "Thẻ vàng";
      } else if (ev.type === "red-card") {
        title = ev.playerName ? `${ev.playerName}` : "Thẻ đỏ";
        subtitle = "Thẻ đỏ";
      } else if (ev.type === "substitution") {
        title = ev.subInPlayer ? `Vào: ${ev.subInPlayer}` : "Thay người";
        subtitle = ev.subOutPlayer ? `Ra: ${ev.subOutPlayer}` : "";
      }

      return {
        id: ev.id || `ev-${idx}`,
        minuteNum: parseMinuteNumber(ev.clock),
        timeDisplay: formatEventMinute(ev.clock),
        isKeyEvent: true,
        type: ev.type,
        title,
        subtitle,
        text: ev.text || title,
        isHome,
        teamLabel,
      };
    });

    if (sortOrder === "newest") {
      list.sort((a, b) => b.minuteNum - a.minuteNum);
    } else {
      list.sort((a, b) => a.minuteNum - b.minuteNum);
    }
    return list;
  }, [events, homeTeamName, awayTeamName, sortOrder]);

  // 3. TOÀN BỘ DÒNG BÌNH LUẬN + SỰ KIỆN ĐỒNG BỘ THEO THỜI GIAN & NGỮ NGHĨA (KHÔNG BỊ TRÙNG LẶP)
  const allStreamFeed = useMemo(() => {
    // Tập hợp ID các sự kiện đã được ghép khớp thành công với câu bình luận
    const matchedEventKeys = new Set<string>();

    // Chuẩn hóa tên cầu thủ để so khớp (lấy các từ có độ dài >= 3)
    const matchesPlayerName = (text: string, name?: string): boolean => {
      if (!name) return false;
      const lowerText = text.toLowerCase();
      const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
      if (parts.length === 0) return lowerText.includes(name.toLowerCase());
      return parts.some((p) => lowerText.includes(p));
    };

    // Kiểm tra xem dòng bình luận c có mô tả sự kiện ev không
    const findMatchingEvent = (cTimeNum: number, cText: string): MatchKeyEvent | undefined => {
      const lower = cText.toLowerCase();

      for (const ev of events) {
        const evKey = ev.id || `${ev.type}-${ev.clock}-${ev.playerName || ""}`;
        if (matchedEventKeys.has(evKey)) continue;

        const evTimeNum = parseMinuteNumber(ev.clock);
        // Chênh lệch phút không quá 1 (vì có thể commentary ghi 51' và event ghi 51' hoặc 50')
        if (Math.abs(evTimeNum - cTimeNum) > 100 && Math.abs(evTimeNum - cTimeNum) > 1) continue;

        if (ev.type === "yellow-card") {
          const hasYellowKeyword = /yellow card|thẻ vàng|booking|booked/i.test(lower);
          const hasPlayer = matchesPlayerName(lower, ev.playerName);
          if (hasYellowKeyword && hasPlayer) return ev;
        } else if (ev.type === "red-card") {
          const hasRedKeyword = /red card|thẻ đỏ|sent off/i.test(lower);
          const hasPlayer = matchesPlayerName(lower, ev.playerName);
          if (hasRedKeyword && hasPlayer) return ev;
        } else if (ev.type === "substitution") {
          const hasSubKeyword = /substitution|replaces|thay người|subbed/i.test(lower);
          const hasPlayer = matchesPlayerName(lower, ev.subInPlayer) || matchesPlayerName(lower, ev.subOutPlayer);
          if (hasSubKeyword && hasPlayer) return ev;
        } else if (ev.type === "goal") {
          const hasGoalKeyword = /\b(goal|bàn thắng|scores|scored)\b/i.test(lower);
          const isNotSaved = !/saved|attempt saved|missed|blocked|disallowed|var/i.test(lower);
          const hasPlayer = matchesPlayerName(lower, ev.playerName);
          if (hasGoalKeyword && isNotSaved && hasPlayer) return ev;
        }
      }
      return undefined;
    };

    // A. Duyệt qua từng dòng bình luận: Nếu là dòng mô tả sự kiện chính thức thì gắn icon sự kiện trực tiếp
    // và giữ NGUYÊN VẸN câu bình luận gốc (đầy đủ ai vào, ai ra, ai bị thẻ, ai ghi bàn)
    const list: StreamItem[] = commentary.map((c, idx) => {
      const cTimeNum = parseMinuteNumber(c.time);
      const matchedEv = findMatchingEvent(cTimeNum, c.text || "");

      if (matchedEv) {
        const evKey = matchedEv.id || `${matchedEv.type}-${matchedEv.clock}-${matchedEv.playerName || ""}`;
        matchedEventKeys.add(evKey);
        const isHome = matchedEv.homeAway === "home";
        const teamLabel = isHome ? homeTeamName : awayTeamName;

        return {
          id: `c-${idx}`,
          minuteNum: cTimeNum,
          timeDisplay: formatEventMinute(c.time),
          isKeyEvent: true,
          type: matchedEv.type,
          // Để nguyên câu text bình luận đầy đủ (ví dụ: "Substitution, Tottenham Hotspur. Conor Gallagher replaces Pedro Porro.")
          text: c.text || "",
          isHome,
          teamLabel,
        };
      }

      return {
        id: `c-${idx}`,
        minuteNum: cTimeNum,
        timeDisplay: formatEventMinute(c.time),
        isKeyEvent: false,
        type: "commentary",
        text: c.text || "",
      };
    });

    // B. Với các sự kiện trong events mà KHÔNG tìm thấy dòng bình luận nào mô tả tương ứng,
    // thì bổ sung riêng vào để không bao giờ bị sót sự kiện
    events.forEach((ev, idx) => {
      const evKey = ev.id || `${ev.type}-${ev.clock}-${ev.playerName || ""}`;
      if (!matchedEventKeys.has(evKey)) {
        const isHome = ev.homeAway === "home";
        const teamLabel = isHome ? homeTeamName : awayTeamName;

        let title = ev.playerName || "";
        let subtitle = "";
        if (ev.type === "goal") {
          title = ev.playerName ? `Bàn thắng: ${ev.playerName}` : "BÀN THẮNG";
        } else if (ev.type === "yellow-card") {
          title = `${ev.playerName || "Cầu thủ"}`;
          subtitle = "Thẻ vàng";
        } else if (ev.type === "red-card") {
          title = `${ev.playerName || "Cầu thủ"}`;
          subtitle = "Thẻ đỏ";
        } else if (ev.type === "substitution") {
          title = ev.subInPlayer ? `Vào: ${ev.subInPlayer}` : "Thay người";
          subtitle = ev.subOutPlayer ? `Ra: ${ev.subOutPlayer}` : "";
        }

        list.push({
          id: `fallback-ev-${idx}-${evKey}`,
          minuteNum: parseMinuteNumber(ev.clock),
          timeDisplay: formatEventMinute(ev.clock),
          isKeyEvent: true,
          type: ev.type,
          title,
          subtitle,
          text: ev.text || title,
          isHome,
          teamLabel,
        });
      }
    });

    if (sortOrder === "newest") {
      list.sort((a, b) => b.minuteNum - a.minuteNum);
    } else {
      list.sort((a, b) => a.minuteNum - b.minuteNum);
    }

    return list;
  }, [commentary, events, homeTeamName, awayTeamName, sortOrder]);

  const displayedList = viewMode === "events" ? pureKeyEvents : allStreamFeed;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-500 space-y-2">
        <Activity className="w-5 h-5 animate-pulse text-netflix-red" />
        <p className="text-xs font-semibold">Đang tải diễn biến...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
      {/* 1. MINI STATS WIDGET PHÍA TRÊN CÙNG (~70px, CỐ ĐỊNH PHẲNG) */}
      {hasStats && (
        <div className="px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 shrink-0">
          {/* Thanh tỉ lệ kiểm soát bóng kèm Tên & Logo hai đội */}
          {possessionStat && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-sans">
                {/* Đội nhà (Màu đỏ) */}
                <div className="flex items-center gap-1.5 min-w-0 max-w-[42%]">
                  {homeTeamLogo && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={homeTeamLogo}
                      alt=""
                      className="w-3.5 h-3.5 object-contain shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <span
                    className="font-bold text-rose-400 truncate text-[11px]"
                    title={homeTeamName}
                  >
                    {homeTeamName}
                  </span>
                  <span className="font-black text-rose-400 tabular-nums shrink-0 ml-0.5">
                    {possessionStat.homeValue}%
                  </span>
                </div>

                <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-semibold shrink-0 px-1">
                  Kiểm soát
                </span>

                {/* Đội khách (Màu xanh) */}
                <div className="flex items-center justify-end gap-1.5 min-w-0 max-w-[42%]">
                  <span className="font-black text-sky-400 tabular-nums shrink-0 mr-0.5">
                    {possessionStat.awayValue}%
                  </span>
                  <span
                    className="font-bold text-sky-400 truncate text-[11px] text-right"
                    title={awayTeamName}
                  >
                    {awayTeamName}
                  </span>
                  {awayTeamLogo && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={awayTeamLogo}
                      alt=""
                      className="w-3.5 h-3.5 object-contain shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden flex">
                <div
                  className="h-full bg-rose-500 transition-all duration-500 rounded-l-full"
                  style={{ width: `${homePossPct}%` }}
                />
                <div
                  className="h-full bg-sky-500 transition-all duration-500 rounded-r-full"
                  style={{ width: `${awayPossPct}%` }}
                />
              </div>
            </div>
          )}

          {/* 3 chỉ số nhanh với màu Đỏ - Xanh đồng bộ từng đội */}
          <div className="grid grid-cols-3 gap-1 pt-0.5 text-center text-[10.5px] font-sans">
            {shotsStat && (
              <div className="bg-white/[0.02] py-1 px-1 rounded-lg">
                <span className="text-zinc-500 text-[9.5px] block font-medium">Tổng sút</span>
                <span className="font-bold tabular-nums">
                  <span className="text-rose-400">{shotsStat.homeValue}</span>
                  <span className="text-zinc-600 font-normal mx-1">-</span>
                  <span className="text-sky-400">{shotsStat.awayValue}</span>
                </span>
              </div>
            )}
            {onTargetStat && (
              <div className="bg-white/[0.02] py-1 px-1 rounded-lg">
                <span className="text-zinc-500 text-[9.5px] block font-medium">Trúng đích</span>
                <span className="font-bold tabular-nums">
                  <span className="text-rose-400">{onTargetStat.homeValue}</span>
                  <span className="text-zinc-600 font-normal mx-1">-</span>
                  <span className="text-sky-400">{onTargetStat.awayValue}</span>
                </span>
              </div>
            )}
            {cornersStat && (
              <div className="bg-white/[0.02] py-1 px-1 rounded-lg">
                <span className="text-zinc-500 text-[9.5px] block font-medium">Phạt góc</span>
                <span className="font-bold tabular-nums">
                  <span className="text-rose-400">{cornersStat.homeValue}</span>
                  <span className="text-zinc-600 font-normal mx-1">-</span>
                  <span className="text-sky-400">{cornersStat.awayValue}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. HEADER ĐIỀU HƯỚNG & BỘ LỌC (PHẲNG, RÕ RÀNG, DỄ CHUYỂN ĐỔI) */}
      <div className="flex items-center justify-between px-1 shrink-0 gap-1.5 pt-0.5">
        {/* Nút lọc Chế độ xem: Sự kiện chính (chuẩn 100%) vs Tất cả */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("events")}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === "events"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Chỉ hiển thị các sự kiện chính: Bàn thắng, Thẻ, Thay người chuẩn xác 100%"
          >
            <Sparkles className="w-3 h-3" />
            <span>Sự kiện ({events.length})</span>
          </button>

          {commentary.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === "all"
                  ? "bg-netflix-red text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Xem đầy đủ dòng bình luận tường thuật kèm sự kiện"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Tất cả</span>
            </button>
          )}
        </div>

        {/* Nút chọn thứ tự Mới nhất / Cũ nhất */}
        <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setSortOrder("newest")}
            className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
              sortOrder === "newest"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Mới nhất
          </button>
          <button
            type="button"
            onClick={() => setSortOrder("oldest")}
            className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
              sortOrder === "oldest"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Cũ nhất
          </button>
        </div>
      </div>

      {/* 3. DANH SÁCH DIỄN BIẾN PHẲNG (TUYỆT ĐỐI KHÔNG DÙNG THẺ HỘP LỒNG NHAU) */}
      {displayedList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
            <Clock className="w-5 h-5 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-zinc-300 font-sans">
            Chưa có diễn biến
          </p>
          <p className="text-[11px] text-zinc-500 max-w-[200px] font-sans leading-relaxed">
            Dữ liệu sẽ hiển thị khi trận đấu có diễn biến từ sân cỏ.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-white/[0.04] scrollbar-thin"
        >
          {displayedList.map((item) => {
            // A. NẾU LÀ SỰ KIỆN CHÍNH THỨC (Bàn thắng, Thẻ, Thay người từ events - Flat Row)
            if (item.isKeyEvent) {
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-2.5 py-2.5 px-2 hover:bg-white/[0.02] transition text-xs ${
                    item.type === "goal" ? "bg-rose-500/[0.04]" : ""
                  }`}
                >
                  {/* Phút */}
                  <span className="w-8 shrink-0 text-right font-mono font-black tabular-nums text-amber-400 pt-0.5">
                    {item.timeDisplay}
                  </span>

                  {/* Icon sự kiện (phẳng, không có viền hộp) */}
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center pt-0.5">
                    {item.type === "goal" && <SoccerBallIcon className="w-4 h-4" />}
                    {item.type === "yellow-card" && (
                      <span className="w-2.5 h-3.5 rounded-[1px] bg-amber-400 shadow-sm inline-block" />
                    )}
                    {item.type === "red-card" && (
                      <span className="w-2.5 h-3.5 rounded-[1px] bg-red-600 shadow-sm inline-block" />
                    )}
                    {item.type === "substitution" && (
                      <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />
                    )}
                  </div>

                  {/* Chi tiết nội dung */}
                  <div className="flex-1 min-w-0">
                    {item.title ? (
                      <>
                        <p className="text-xs font-bold text-white font-sans leading-snug">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                        {item.teamLabel && (
                          <p
                            className={`text-[10px] font-semibold tracking-wide uppercase truncate font-sans mt-0.5 leading-none ${
                              item.isHome ? "text-rose-400" : "text-sky-400"
                            }`}
                          >
                            {item.teamLabel}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className={`text-xs font-sans leading-relaxed ${
                          item.type === "goal"
                            ? "font-bold text-white"
                            : item.type === "yellow-card"
                              ? "text-amber-200/90"
                              : item.type === "red-card"
                                ? "text-rose-300 font-bold"
                                : item.type === "substitution"
                                  ? "text-sky-200/90"
                                  : "text-zinc-200"
                        }`}
                      >
                        {item.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // B. NẾU LÀ DÒNG BÌNH LUẬN THƯỜNG (Text phẳng nhẹ nhàng)
            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 py-2 px-2 hover:bg-white/[0.02] transition text-xs"
              >
                <span className="w-8 shrink-0 text-right font-mono font-bold tabular-nums text-amber-400/90 pt-0.5">
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
