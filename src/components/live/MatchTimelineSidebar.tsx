"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MatchKeyEvent,
  MatchCommentaryItem,
  MatchStatItem,
} from "@/services/live/football-score/types";
import { Activity, Clock, ArrowLeftRight, MessageSquare, RotateCw } from "lucide-react";

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
 * Icon Quả bóng đá chuẩn quốc tế (FIFA / Twemoji soccer standard)
 * Sử dụng vector quả bóng tiêu chuẩn được nhận diện toàn cầu, không còn bị nhầm với hình ngôi sao
 */
export function SoccerBallIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      className={`${className} shrink-0 inline-block drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle fill="#FFFFFF" cx="18" cy="18" r="17.5" stroke="#0F172A" strokeWidth="1" />
      {/* Đường may vân bóng */}
      <path
        d="M18 11c-.552 0-1-.448-1-1V3c0-.552.448-1 1-1s1 .448 1 1v7c0 .552-.448 1-1 1zm-6.583 4.5c-.1 0-.202-.015-.302-.047l-8.041-2.542c-.527-.167-.819-.728-.652-1.255.166-.527.73-.818 1.255-.652l8.042 2.542c.527.167.819.729.652 1.255-.136.426-.53.699-.954.699zm13.625-.291c-.434 0-.833-.285-.96-.722-.154-.531.151-1.085.682-1.239l6.75-1.958c.531-.153 1.085.153 1.238.682.154.531-.151 1.085-.682 1.239l-6.75 1.958c-.092.027-.186.04-.278.04zm2.001 14.958c-.306 0-.606-.14-.803-.403l-5.459-7.333c-.33-.442-.238-1.069.205-1.399.442-.331 1.069-.238 1.399.205l5.459 7.333c.33.442.238 1.069-.205 1.399-.179.134-.389.198-.596.198zm-18.294-.083c-.197 0-.395-.058-.57-.179-.454-.316-.565-.938-.25-1.392l5.125-7.375c.315-.454.938-.566 1.392-.251.454.315.565.939.25 1.392l-5.125 7.375c-.194.281-.506.43-.822.43zM3.5 27.062c-.44 0-.844-.293-.965-.738L.347 18.262c-.145-.533.17-1.082.704-1.227.535-.141 1.083.171 1.227.704l2.188 8.062c.145.533-.17 1.082-.704 1.226-.088.025-.176.035-.262.035zM22 34h-9c-.552 0-1-.447-1-1s.448-1 1-1h9c.553 0 1 .447 1 1s-.447 1-1 1zm10.126-6.875c-.079 0-.16-.009-.24-.029-.536-.132-.864-.674-.731-1.21l2.125-8.625c.133-.536.679-.862 1.21-.732.536.132.864.674.731 1.211l-2.125 8.625c-.113.455-.521.76-.97.76zM30.312 7.688c-.17 0-.342-.043-.5-.134L22.25 3.179c-.478-.277-.642-.888-.364-1.367.275-.478.886-.643 1.366-.365l7.562 4.375c.478.277.642.888.364 1.367-.185.32-.521.499-.866.499zm-24.811 0c-.312 0-.618-.145-.813-.417-.322-.45-.22-1.074.229-1.396l6.188-4.438c.449-.322 1.074-.219 1.396.229.322.449.219 1.074-.229 1.396L6.083 7.5c-.177.126-.38.188-.582.188z"
        fill="#94A3B8"
      />
      {/* Các múi ngũ giác đen chuẩn bóng đá */}
      <path
        d="M25.493 13.516l-7.208-5.083c-.348-.245-.814-.243-1.161.006l-7.167 5.167c-.343.248-.494.684-.375 1.091l2.5 8.583c.124.426.515.72.96.72H22c.43 0 .81-.274.948-.681l2.917-8.667c.141-.419-.011-.881-.372-1.136zM1.292 19.542c.058 0 .117-.005.175-.016.294-.052.55-.233.697-.494l3.375-6c.051-.091.087-.188.108-.291L6.98 6.2c.06-.294-.016-.6-.206-.832C6.584 5.135 6.3 5 6 5h-.428C2.145 8.277 0 12.884 0 18c0 .266.028.525.04.788l.602.514c.182.156.413.24.65.24zm9.325-16.547c.106.219.313.373.553.412l6.375 1.042c.04.006.081.01.121.01.04 0 .081-.003.122-.01l6.084-1c.2-.033.38-.146.495-.314.116-.168.158-.375.118-.575l-.292-1.443C22.26.407 20.18 0 18 0c-2.425 0-4.734.486-6.845 1.356l-.521.95c-.117.213-.123.47-.017.689zm20.517 2.724l-1.504-.095c-.228-.013-.455.076-.609.249-.152.173-.218.402-.175.63l1.167 6.198c.017.086.048.148.093.224 1.492 2.504 3.152 5.301 3.381 5.782.024.084.062.079.114.151.14.195.372.142.612.142h.007c.198 0 .323.094 1.768-.753.001-.083.012-.164.012-.247 0-4.753-1.856-9.064-4.866-12.281zM14.541 33.376c.011-.199-.058-.395-.191-.544l-4.5-5c-.06-.066-.131-.122-.211-.163-5.885-3.069-5.994-3.105-6.066-3.13-.078-.025-.161-.039-.242-.039-.537 0-.695.065-1.185 2.024 2.236 4.149 6.053 7.316 10.644 8.703l1.5-1.333c.149-.132.239-.319.251-.518zm17.833-8.567c-.189-.08-.405-.078-.592.005l-6.083 2.667c-.106.046-.2.116-.274.205l-4.25 5.083c-.129.154-.19.352-.172.552.02.2.117.384.272.51.683.559 1.261 1.03 1.767 1.44 4.437-1.294 8.154-4.248 10.454-8.146l-.712-1.889c-.072-.193-.221-.347-.41-.427z"
        fill="#0F172A"
      />
    </svg>
  );
}

/**
 * Icon Hỏng phạt đền (Missed Penalty) chuẩn truyền hình thể thao quốc tế
 * Biểu tượng quả bóng kết hợp dấu X đỏ gạch chéo nhận diện tức thì
 */
export function MissedPenaltyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <span className={`${className} shrink-0 relative inline-flex items-center justify-center`}>
      <SoccerBallIcon className="w-full h-full opacity-80" />
      {/* Dấu X đỏ sắc nét nổi bật đè lên bóng */}
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full absolute inset-0 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" stroke="#EF4444" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="19.5" y1="4.5" x2="4.5" y2="19.5" stroke="#EF4444" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </span>
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
  const m = raw.match(/(\d+)(?:['’"“”\s]*\+(\d+))?/);
  if (!m) return 0;
  const base = parseInt(m[1], 10) || 0;
  const extra = parseInt(m[2], 10) || 0;
  return base * 100 + extra;
}

interface StreamItem {
  id: string;
  minuteNum: number;
  orderIndex: number;
  timeDisplay: string;
  isKeyEvent: boolean;
  type?: "goal" | "yellow-card" | "red-card" | "substitution" | "missed-penalty" | "commentary" | "other";
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
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleManualRefresh = () => {
    setIsManualRefreshing(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nanaflix-refresh-match-summary"));
    }
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 800);
  };

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
      } else if (ev.type === "missed-penalty") {
        title = ev.playerName ? `Hỏng phạt đền: ${ev.playerName}` : "HỎNG PHẠT ĐỀN";
        subtitle = "Penalty Missed";
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
        orderIndex: idx,
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
      list.sort((a, b) => {
        if (b.minuteNum !== a.minuteNum) return b.minuteNum - a.minuteNum;
        return b.orderIndex - a.orderIndex;
      });
    } else {
      list.sort((a, b) => {
        if (a.minuteNum !== b.minuteNum) return a.minuteNum - b.minuteNum;
        return a.orderIndex - b.orderIndex;
      });
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
        } else if (ev.type === "missed-penalty") {
          const hasMissedPenKeyword = /penalty missed|missed penalty|penalty.*(?:saved|hits the post|missed)|hỏng phạt đền|trượt pen|hỏng 11m/i.test(lower);
          const hasPlayer = matchesPlayerName(lower, ev.playerName);
          if (hasMissedPenKeyword && (hasPlayer || !ev.playerName)) return ev;
        } else if (ev.type === "goal") {
          const hasGoalKeyword = /\b(goal|bàn thắng|scores|scored)\b/i.test(lower);
          const isNotSaved = !/saved|attempt saved|missed|blocked|disallowed|var|penalty missed|missed penalty/i.test(lower);
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
          orderIndex: typeof c.sequence === "number" ? c.sequence : idx,
          timeDisplay: formatEventMinute(c.time),
          isKeyEvent: true,
          type: matchedEv.type,
          // Để nguyên câu text bình luận đầy đủ (ví dụ: "Substitution, Tottenham Hotspur. Conor Gallagher replaces Pedro Porro.")
          text: c.text || "",
          isHome,
          teamLabel,
        };
      }

      // Nhận diện dòng bình luận sút hỏng penalty trực tiếp từ text nếu không map được event
      const isMissedPenCommentary = /penalty missed|missed penalty|penalty.*(?:saved|hits the post|missed)|hỏng phạt đền|trượt pen|hỏng 11m/i.test(c.text || "");
      if (isMissedPenCommentary) {
        // Đánh dấu event missed-penalty nếu có cùng khoảng thời gian để tránh bị lặp ở khối fallback
        for (const ev of events) {
          if (ev.type === "missed-penalty") {
            const evTimeNum = parseMinuteNumber(ev.clock);
            if (Math.abs(evTimeNum - cTimeNum) <= 100 || Math.abs(evTimeNum - cTimeNum) <= 1) {
              const evKey = ev.id || `${ev.type}-${ev.clock}-${ev.playerName || ""}`;
              matchedEventKeys.add(evKey);
            }
          }
        }
        return {
          id: `c-${idx}`,
          minuteNum: cTimeNum,
          orderIndex: typeof c.sequence === "number" ? c.sequence : idx,
          timeDisplay: formatEventMinute(c.time),
          isKeyEvent: true,
          type: "missed-penalty",
          text: c.text || "",
        };
      }

      return {
        id: `c-${idx}`,
        minuteNum: cTimeNum,
        orderIndex: typeof c.sequence === "number" ? c.sequence : idx,
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
        } else if (ev.type === "missed-penalty") {
          title = ev.playerName ? `Hỏng phạt đền: ${ev.playerName}` : "HỎNG PHẠT ĐỀN";
          subtitle = "Penalty Missed";
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
          orderIndex: (commentary.length > 0 ? commentary.length : 0) + idx,
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
      list.sort((a, b) => {
        if (b.minuteNum !== a.minuteNum) return b.minuteNum - a.minuteNum;
        return b.orderIndex - a.orderIndex;
      });
    } else {
      list.sort((a, b) => {
        if (a.minuteNum !== b.minuteNum) return a.minuteNum - b.minuteNum;
        return a.orderIndex - b.orderIndex;
      });
    }

    return list;
  }, [commentary, events, homeTeamName, awayTeamName, sortOrder]);

  const displayedList = viewMode === "events" ? pureKeyEvents : allStreamFeed;
  const hasData = displayedList.length > 0 || hasStats || events.length > 0 || commentary.length > 0;

  // Chỉ hiển thị màn hình loading toàn phần khi THỰC SỰ chưa có dữ liệu nào (cả stream, events lẫn stats)
  if (loading && !hasData) {
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
        <div className="px-2.5 py-2 rounded-xl bg-white/[0.04] space-y-2 shrink-0">
          {/* Thanh tỉ lệ kiểm soát bóng kèm Tên & Logo hai đội */}
          {possessionStat && (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center text-[11px] font-sans leading-4 select-none">
                {/* Đội nhà (Màu đỏ) */}
                <div className="flex items-center gap-1.5 min-w-0 justify-start leading-4">
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
                    className="font-bold text-rose-400 truncate text-[11px] leading-4"
                    title={homeTeamName}
                  >
                    {homeTeamName}
                  </span>
                  <span className="font-black text-rose-400 tabular-nums shrink-0 text-[11px] leading-4">
                    {possessionStat.homeValue}%
                  </span>
                </div>

                {/* Nhãn Kiểm soát căn giữa tuyệt đối, cùng font-size và line-height để khóa chặt baseline ngang */}
                <span className="text-[11px] leading-4 text-zinc-400 font-medium shrink-0 px-2 text-center">
                  Kiểm soát
                </span>

                {/* Đội khách (Màu xanh) */}
                <div className="flex items-center justify-end gap-1.5 min-w-0 leading-4">
                  <span className="font-black text-sky-400 tabular-nums shrink-0 text-[11px] leading-4">
                    {possessionStat.awayValue}%
                  </span>
                  <span
                    className="font-bold text-sky-400 truncate text-[11px] leading-4 text-right"
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
                <span className="text-zinc-500 text-[9.5px] block font-medium leading-tight">Tổng sút</span>
                <span className="font-bold tabular-nums leading-4 block">
                  <span className="text-rose-400">{shotsStat.homeValue}</span>
                  <span className="text-zinc-600 font-normal mx-1">-</span>
                  <span className="text-sky-400">{shotsStat.awayValue}</span>
                </span>
              </div>
            )}
            {onTargetStat && (
              <div className="bg-white/[0.02] py-1 px-1 rounded-lg">
                <span className="text-zinc-500 text-[9.5px] block font-medium leading-tight">Trúng đích</span>
                <span className="font-bold tabular-nums leading-4 block">
                  <span className="text-rose-400">{onTargetStat.homeValue}</span>
                  <span className="text-zinc-600 font-normal mx-1">-</span>
                  <span className="text-sky-400">{onTargetStat.awayValue}</span>
                </span>
              </div>
            )}
            {cornersStat && (
              <div className="bg-white/[0.02] py-1 px-1 rounded-lg">
                <span className="text-zinc-500 text-[9.5px] block font-medium leading-tight">Phạt góc</span>
                <span className="font-bold tabular-nums leading-4 block">
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
        {/* Nút lọc Chế độ xem: Sự kiện chính vs Tất cả */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("events")}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${viewMode === "events"
              ? "bg-netflix-red text-white shadow-sm"
              : "text-zinc-400 hover:text-white"
              }`}
          >
            <span>Sự kiện ({events.length})</span>
          </button>

          {commentary.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${viewMode === "all"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Tất cả</span>
            </button>
          )}

          {loading && hasData && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium pl-1">
              <Activity className="w-2.5 h-2.5 animate-spin text-netflix-red" />
            </span>
          )}
        </div>

        {/* Nút làm mới diễn biến tức thì + Thứ tự Mới nhất / Cũ nhất */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || loading}
            title="Làm mới diễn biến"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer disabled:opacity-50"
            aria-label="Làm mới diễn biến"
          >
            <RotateCw
              className={`w-3 h-3 ${isManualRefreshing || (loading && hasData)
                ? "animate-spin text-netflix-red"
                : ""
                }`}
            />
          </button>

          <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setSortOrder("newest")}
              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${sortOrder === "newest"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Mới nhất
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("oldest")}
              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${sortOrder === "oldest"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Cũ nhất
            </button>
          </div>
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
                    item.type === "goal"
                      ? "bg-rose-500/[0.04]"
                      : item.type === "missed-penalty"
                        ? "bg-rose-500/[0.06]"
                        : ""
                  }`}
                >
                  {/* Phút */}
                  <span className="w-8 shrink-0 text-right font-sans font-black tabular-nums text-amber-400 pt-0.5">
                    {item.timeDisplay}
                  </span>

                  {/* Icon sự kiện (phẳng, không có viền hộp) */}
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center pt-0.5">
                    {item.type === "goal" && <SoccerBallIcon className="w-4 h-4" />}
                    {item.type === "missed-penalty" && <MissedPenaltyIcon className="w-4 h-4" />}
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
                            className={`text-[10px] font-semibold tracking-wide uppercase truncate font-sans mt-0.5 leading-none ${item.isHome ? "text-rose-400" : "text-sky-400"
                              }`}
                          >
                            {item.teamLabel}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className={`text-xs font-sans leading-relaxed ${item.type === "goal"
                          ? "font-bold text-white"
                          : item.type === "missed-penalty"
                            ? "text-rose-200/90 font-medium"
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
                <span className="w-8 shrink-0 text-right font-sans font-bold tabular-nums text-amber-400/90 pt-0.5">
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
