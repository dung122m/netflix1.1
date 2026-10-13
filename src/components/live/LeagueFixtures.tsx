"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  CalendarDays,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Trophy,
} from "lucide-react";
import {
  NormalizedLeagueFixtures,
  NormalizedFixtureItem,
} from "@/services/live/football-score/types";
import { CountryFlag } from "./CountryFlag";
import { MatchCenter } from "./MatchCenter";

// Danh sách các giải đấu hỗ trợ chọn trong Lịch thi đấu & Kết quả
export const FIXTURE_LEAGUES = [
  { slug: "all", name: "Tất cả giải tâm điểm", country: "Châu Âu", flag: "🌐" },
  { slug: "eng.1", name: "Ngoại Hạng Anh", country: "Anh", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { slug: "esp.1", name: "La Liga", country: "Tây Ban Nha", flag: "🇪🇸" },
  { slug: "ita.1", name: "Serie A", country: "Ý", flag: "🇮🇹" },
  { slug: "ger.1", name: "Bundesliga", country: "Đức", flag: "🇩🇪" },
  { slug: "fra.1", name: "Ligue 1", country: "Pháp", flag: "🇫🇷" },
  { slug: "usa.1", name: "MLS", country: "Mỹ", flag: "🇺🇸" },
  { slug: "ksa.1", name: "Saudi Pro League", country: "Ả Rập Xê Út", flag: "🇸🇦" },
  { slug: "ned.1", name: "Eredivisie", country: "Hà Lan", flag: "🇳🇱" },
  { slug: "por.1", name: "Liga Portugal", country: "Bồ Đào Nha", flag: "🇵🇹" },
  { slug: "tur.1", name: "Super Lig", country: "Thổ Nhĩ Kỳ", flag: "🇹🇷" },
  { slug: "eng.fa", name: "FA Cup", country: "Anh", flag: "🏆", isCup: true },
  { slug: "eng.league_cup", name: "Carabao Cup", country: "Anh", flag: "🏆", isCup: true },
  { slug: "esp.copa_del_rey", name: "Copa del Rey", country: "Tây Ban Nha", flag: "🏆", isCup: true },
] as const;

const TOP_LEAGUES = [
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "usa.1",
  "ksa.1",
  "ned.1",
  "por.1",
  "tur.1",
  "eng.fa",
  "eng.league_cup",
  "esp.copa_del_rey",
] as const;

export interface LeagueFixturesProps {
  initialLeague?: string;
  defaultOpen?: boolean;
}

type TabFilter = "all" | "scheduled" | "finished";

// --- UTC+7 DATE HELPER FUNCTIONS (Đảm bảo giờ Việt Nam Asia/Ho_Chi_Minh tuyệt đối) ---
function getUtc7TodayString(): string {
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return dtf.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function parseUtc7Date(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0));
}

function addDaysToUtc7(dateStr: string, days: number): string {
  try {
    const dt = parseUtc7Date(dateStr);
    dt.setUTCDate(dt.getUTCDate() + days);
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return dtf.format(dt);
  } catch {
    return dateStr;
  }
}

function formatShortWeekdayUtc7(dateStr: string): string {
  try {
    const dt = parseUtc7Date(dateStr);
    const dtf = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "short",
    });
    return dtf.format(dt);
  } catch {
    return "";
  }
}

function formatDayMonthUtc7(dateStr: string): string {
  try {
    const dt = parseUtc7Date(dateStr);
    const dtf = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
    });
    return dtf.format(dt).replace("-", "/");
  } catch {
    return dateStr;
  }
}

function formatFullDateUtc7(dateStr: string): string {
  try {
    const dt = parseUtc7Date(dateStr);
    const dtf = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return dtf.format(dt);
  } catch {
    return dateStr;
  }
}

export const LeagueFixtures: React.FC<LeagueFixturesProps> = ({
  initialLeague = "eng.1",
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedLeague, setSelectedLeague] = useState<string>(initialLeague);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  // Ngày hôm nay theo giờ Việt Nam UTC+7
  const todayUtc7String = useMemo(() => getUtc7TodayString(), []);

  // Ngày đang được chọn (Mặc định hôm nay theo chuẩn FotMob)
  const [selectedDate, setSelectedDate] = useState<string>(todayUtc7String);

  // Điều khiển thanh cuộn ngang giải đấu & ngày
  const leaguesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const datesScrollRef = useRef<HTMLDivElement>(null);
  const activeDateBtnRef = useRef<HTMLButtonElement | null>(null);

  // Client-side cache theo key `${leagueSlug}:${tab}` (tránh gọi lại API khi chuyển ngày)
  const clientCacheRef = useRef<Record<string, NormalizedLeagueFixtures | null>>({});
  const inFlightRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [fixturesData, setFixturesData] = useState<NormalizedLeagueFixtures | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái thu gọn/mở rộng từng nhóm giải đấu
  const [collapsedLeagues, setCollapsedLeagues] = useState<Record<string, boolean>>({});

  // State mở modal Match Center chi tiết khi click vào trận
  const [activeModalFixture, setActiveModalFixture] = useState<NormalizedFixtureItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Khóa cuộn trang chính và lắng nghe phím Escape khi Modal mở
  useEffect(() => {
    if (activeModalFixture) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setActiveModalFixture(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activeModalFixture]);

  // Tự động căn giữa ngày đang chọn trên dải ngày FotMob khi chuyển ngày
  useEffect(() => {
    if (activeDateBtnRef.current && datesScrollRef.current) {
      activeDateBtnRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedDate]);

  const [, setCacheVersion] = useState<number>(0);

  // Hàm tải dữ liệu fixtures (có client cache và in-flight cancellation)
  const fetchFixtures = async (leagueSlug: string, tab: TabFilter, force: boolean = false) => {
    const statusParam = tab === "scheduled" ? "scheduled" : tab === "finished" ? "finished" : "all";

    if (leagueSlug === "all") {
      // Tải các giải đấu tâm điểm
      const uncached = TOP_LEAGUES.filter(
        (slug) => force || !clientCacheRef.current[`${slug}:${tab}`],
      );

      if (uncached.length === 0) {
        // Đã có trong cache đầy đủ
        setFixturesData(clientCacheRef.current[`${TOP_LEAGUES[0]}:${tab}`] || null);
        setCacheVersion((v) => v + 1);
        setError(null);
        return;
      }

      if (inFlightRef.current && !force) return;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      inFlightRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const promises = uncached.map(async (slug) => {
          try {
            const url = `/api/live-football/fixtures?league=${encodeURIComponent(slug)}&status=${statusParam}&limit=100`;
            const res = await fetch(url, {
              signal: controller.signal,
              cache: "no-store",
              headers: { Accept: "application/json" },
            });
            if (!res.ok) return null;
            const json = await res.json();
            if (json.status && json.data) {
              clientCacheRef.current[`${slug}:${tab}`] = json.data;
              return json.data;
            }
            return null;
          } catch {
            return null;
          }
        });

        await Promise.all(promises);
        setFixturesData(clientCacheRef.current[`${TOP_LEAGUES[0]}:${tab}`] || null);
        setCacheVersion((v) => v + 1);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Không thể tải lịch thi đấu lúc này.");
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
      return;
    }

    // Tải 1 giải đấu cụ thể
    const cacheKey = `${leagueSlug}:${tab}`;
    if (!force && clientCacheRef.current[cacheKey]) {
      setFixturesData(clientCacheRef.current[cacheKey]);
      setCacheVersion((v) => v + 1);
      setError(null);
      return;
    }

    if (inFlightRef.current && !force) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const url = `/api/live-football/fixtures?league=${encodeURIComponent(leagueSlug)}&status=${statusParam}&limit=100`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error("Không thể tải lịch thi đấu từ máy chủ lúc này.");
      }

      const json = await res.json();
      if (!json.status) {
        throw new Error(json.error || "Dữ liệu lịch thi đấu không khả dụng.");
      }

      setFixturesData(json.data);
      clientCacheRef.current[cacheKey] = json.data;
      setCacheVersion((v) => v + 1);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedLeague) {
      fetchFixtures(selectedLeague, activeTab);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, selectedLeague, activeTab]);

  // Cuộn thanh chọn giải đấu
  const checkLeagueScroll = useCallback(() => {
    const el = leaguesScrollRef.current;
    if (!el) return;
    const isAtStart = el.scrollLeft <= 4;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  }, []);

  useEffect(() => {
    const el = leaguesScrollRef.current;
    if (!el) return;
    checkLeagueScroll();
    el.addEventListener("scroll", checkLeagueScroll, { passive: true });
    window.addEventListener("resize", checkLeagueScroll);
    return () => {
      el.removeEventListener("scroll", checkLeagueScroll);
      window.removeEventListener("resize", checkLeagueScroll);
    };
  }, [isOpen, checkLeagueScroll]);

  const scrollLeagues = (direction: "left" | "right") => {
    const el = leaguesScrollRef.current;
    if (!el) return;
    const scrollAmount = direction === "left" ? -280 : 280;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Tạo danh sách 22 ngày xung quanh ngày hiện tại theo chuẩn FotMob
  const dateStripItems = useMemo(() => {
    const base = todayUtc7String;
    if (!base) return [];

    let minOffset = -7;
    let maxOffset = 14;

    if (selectedDate) {
      const diffDays = Math.round(
        (parseUtc7Date(selectedDate).getTime() - parseUtc7Date(base).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (diffDays < minOffset) minOffset = diffDays - 2;
      if (diffDays > maxOffset) maxOffset = diffDays + 2;
    }

    const items: {
      dateStr: string;
      shortWeekday: string;
      dayMonth: string;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    for (let i = minOffset; i <= maxOffset; i++) {
      const dStr = addDaysToUtc7(base, i);
      items.push({
        dateStr: dStr,
        shortWeekday: formatShortWeekdayUtc7(dStr),
        dayMonth: formatDayMonthUtc7(dStr),
        isToday: dStr === base,
        isSelected: dStr === selectedDate,
      });
    }

    return items;
  }, [todayUtc7String, selectedDate]);

  // Điều hướng ngày: Trước, Tiếp theo, Hôm nay
  const goToPreviousDay = () => {
    setSelectedDate((prev) => addDaysToUtc7(prev || todayUtc7String, -1));
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => addDaysToUtc7(prev || todayUtc7String, 1));
  };

  const goToToday = () => {
    setSelectedDate(todayUtc7String);
  };

  // Gom nhóm các trận thuộc selectedDate theo từng giải đấu
  const leagueGroups = useMemo(() => {
    const targetSlugs = selectedLeague === "all" ? TOP_LEAGUES : [selectedLeague];
    const groups: {
      leagueSlug: string;
      leagueName: string;
      flag: string;
      matches: NormalizedFixtureItem[];
    }[] = [];

    for (const slug of targetSlugs) {
      const cached =
        clientCacheRef.current[`${slug}:${activeTab}`] ||
        (fixturesData?.leagueSlug === slug ? fixturesData : null);

      if (!cached || !Array.isArray(cached.events)) continue;

      let matches = cached.events.filter((e) => e.kickoffDateUtc7 === selectedDate);
      if (activeTab === "scheduled") {
        matches = matches.filter((e) => e.status === "scheduled");
      } else if (activeTab === "finished") {
        matches = matches.filter((e) => e.status === "finished");
      }

      if (matches.length > 0) {
        matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const meta = FIXTURE_LEAGUES.find((l) => l.slug === slug);
        groups.push({
          leagueSlug: slug,
          leagueName: cached.leagueName || meta?.name || slug.toUpperCase(),
          flag: meta?.flag || "🏆",
          matches,
        });
      }
    }

    return groups;
  }, [selectedLeague, activeTab, selectedDate, fixturesData]);

  const totalMatchesOnDate = useMemo(() => {
    return leagueGroups.reduce((acc, g) => acc + g.matches.length, 0);
  }, [leagueGroups]);

  const toggleLeagueCollapse = (slug: string) => {
    setCollapsedLeagues((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  return (
    <div className="w-full mt-4 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* 1. HEADER KHU VỰC CHÍNH */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-600/10 border border-red-500/30 text-netflix-red shadow-inner">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Lịch Thi Đấu & Kết Quả
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
                FotMob UX
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                Giờ VN (UTC+7)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Tra cứu lịch thi đấu và tỷ số kết quả theo ngày — chuẩn nền tảng thể thao quốc tế
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fetchFixtures(selectedLeague, activeTab, true);
              }}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-netflix-red" : ""}`} />
            </button>
          )}

          <div className="p-2 rounded-xl bg-white/5 text-gray-400 border border-white/10">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* 2. NỘI DUNG KHU VỰC KHI MỞ */}
      {isOpen && (
        <div className="px-3 pb-6 sm:px-6 sm:pb-8 pt-1 border-t border-white/5 space-y-4">
          {/* A. THANH CHỌN NGÀY NGANG CHUẨN FOTMOB (FOTMOB DATE STRIP) */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-zinc-900/90 border border-white/10 rounded-2xl p-1.5 sm:p-2 shadow-lg backdrop-blur-md">
            {/* Nút Ngày trước */}
            <button
              type="button"
              onClick={goToPreviousDay}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer shrink-0"
              title="Ngày trước"
              aria-label="Ngày trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dải ngày cuộn ngang tự động căn giữa ngày đang chọn */}
            <div
              ref={datesScrollRef}
              className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-1 scroll-smooth flex-1 px-1"
            >
              {dateStripItems.map((item) => (
                <button
                  key={item.dateStr}
                  ref={item.isSelected ? activeDateBtnRef : null}
                  type="button"
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] px-2 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    item.isSelected
                      ? "bg-gradient-to-b from-netflix-red to-netflix-red/85 text-white font-black shadow-md shadow-[var(--accent-glow,rgba(229,9,20,0.4))] scale-[1.03] ring-1 ring-netflix-red/50"
                      : item.isToday
                        ? "bg-white/10 text-white hover:bg-white/15 border border-netflix-red/40"
                        : "bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <span
                    className={`text-[9.5px] uppercase font-bold tracking-tight ${
                      item.isSelected
                        ? "text-white"
                        : item.isToday
                          ? "text-netflix-red font-extrabold"
                          : "text-gray-400"
                    }`}
                  >
                    {item.isToday ? "HÔM NAY" : item.shortWeekday}
                  </span>
                  <span className="text-xs sm:text-sm font-black mt-0.5">
                    {item.dayMonth}
                  </span>
                </button>
              ))}
            </div>

            {/* Nút Ngày tiếp theo */}
            <button
              type="button"
              onClick={goToNextDay}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer shrink-0"
              title="Ngày tiếp theo"
              aria-label="Ngày tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Nút Trở về Hôm nay */}
            <button
              type="button"
              onClick={goToToday}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                selectedDate === todayUtc7String
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
              }`}
              title="Trở về hôm nay"
            >
              <Calendar className="w-3.5 h-3.5 text-netflix-red" />
              <span className="hidden sm:inline">Hôm nay</span>
            </button>
          </div>

          {/* B. THANH THÔNG TIN NGÀY & ĐIỀU HƯỚNG BỘ LỌC GỌN GÀNG */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pt-1 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Lịch thi đấu:</span>
              <strong className="text-xs sm:text-sm text-white font-extrabold capitalize">
                {formatFullDateUtc7(selectedDate)}
              </strong>
              {selectedDate === todayUtc7String && (
                <span className="text-[10px] uppercase font-black px-2 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  Hôm nay
                </span>
              )}
              {totalMatchesOnDate > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/10 text-emerald-400 border border-emerald-500/30">
                  {totalMatchesOnDate} trận
                </span>
              )}
            </div>

            {/* Tabs trạng thái: Tất cả | Sắp diễn ra | Kết quả */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-900/90 border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "all"
                    ? "bg-white text-black shadow-sm font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>Tất cả</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("scheduled")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "scheduled"
                    ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-sm font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Sắp đá</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("finished")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "finished"
                    ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-sm font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Kết quả</span>
              </button>
            </div>
          </div>

          {/* C. CAROUSEL CHỌN GIẢI ĐẤU (Gọn gàng, không chiếm màn hình) */}
          <div className="relative group/leagues">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollLeagues("left")}
                className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-zinc-900/95 border border-white/20 text-white shadow-xl hover:bg-zinc-800 transition -ml-2 cursor-pointer"
                aria-label="Cuộn sang trái"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={leaguesScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 scroll-smooth"
            >
              {FIXTURE_LEAGUES.map((league) => {
                const isSelected = selectedLeague === league.slug;
                return (
                  <button
                    key={league.slug}
                    type="button"
                    onClick={() => setSelectedLeague(league.slug)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-netflix-red text-white border-netflix-red shadow-md shadow-netflix-red/30 scale-[1.02]"
                        : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] border-white/10"
                    }`}
                  >
                    <CountryFlag emoji={league.flag} className="w-3.5 h-3.5 shrink-0" />
                    <span>{league.name}</span>
                  </button>
                );
              })}
            </div>

            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollLeagues("right")}
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-zinc-900/95 border border-white/20 text-white shadow-xl hover:bg-zinc-800 transition -mr-2 cursor-pointer"
                aria-label="Cuộn sang phải"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* D. TRẠNG THÁI TẢI & NỘI DUNG CHÍNH THEO NGÀY */}
          {loading && (
            <div className="py-8 space-y-3">
              <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-20 bg-white/5 rounded" />
                      <div className="h-4 w-16 bg-white/5 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-white/5 rounded" />
                      <div className="h-4 w-32 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-300">{error}</p>
              <button
                type="button"
                onClick={() => fetchFixtures(selectedLeague, activeTab, true)}
                className="px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* E. TRẠNG THÁI RỖNG: KHÔNG CÓ TRẬN NÀO TRONG NGÀY ĐÃ CHỌN (KHÔNG PHẢI LỖI MẠNG) */}
          {!loading && !error && leagueGroups.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 sm:p-12 text-center text-gray-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-base font-bold text-gray-200">
                Không có trận đấu nào trong ngày {formatFullDateUtc7(selectedDate)}
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Hiện chưa có lịch thi đấu hoặc kết quả được ghi nhận cho ngày này trong giải đấu đã chọn. Bạn có thể chuyển sang ngày tiếp theo hoặc chọn giải đấu khác.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {selectedDate !== todayUtc7String && (
                  <button
                    type="button"
                    onClick={goToToday}
                    className="px-3.5 py-1.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Về ngày hôm nay
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysToUtc7(selectedDate, 1))}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                >
                  Xem ngày tiếp theo
                </button>
              </div>
            </div>
          )}

          {/* F. DANH SÁCH TRẬN ĐẤU NHÓM THEO GIẢI ĐẤU (FOTMOB LEAGUE ACCORDIONS) */}
          {!loading && !error && leagueGroups.length > 0 && (
            <div className="space-y-4">
              {leagueGroups.map((group) => {
                const isCollapsed = !!collapsedLeagues[group.leagueSlug];

                return (
                  <div
                    key={group.leagueSlug}
                    className="rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden shadow-md"
                  >
                    {/* Header nhóm giải đấu (Có thể thu gọn / mở rộng) */}
                    <div
                      onClick={() => toggleLeagueCollapse(group.leagueSlug)}
                      className="flex items-center justify-between p-3 sm:p-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition cursor-pointer select-none border-b border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <CountryFlag emoji={group.flag} className="w-4 h-4 shrink-0" />
                        <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                          {group.leagueName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/10 text-gray-300">
                          {group.matches.length} trận
                        </span>
                      </div>

                      <div className="text-gray-400 p-1">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Lưới các thẻ trận đấu trong giải */}
                    {!isCollapsed && (
                      <div className="p-3 sm:p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {group.matches.map((match) => {
                          const isLive = match.status === "live";
                          const isFinished = match.status === "finished";
                          const isPostponed = match.status === "postponed";
                          const isCanceled = match.status === "canceled";

                          return (
                            <div
                              key={match.id}
                              onClick={() => setActiveModalFixture(match)}
                              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group flex flex-col justify-between gap-3 ${
                                isLive
                                  ? "bg-red-950/20 border-red-500/30 hover:border-red-500/60 shadow-lg shadow-red-950/20"
                                  : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                              }`}
                            >
                              {/* Dòng trạng thái & giờ đá */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-gray-300 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{match.kickoffTimeUtc7}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">VN</span>
                                </span>

                                {/* Badge trạng thái */}
                                <div>
                                  {isLive && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600/30 text-red-400 border border-red-500/40 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                      <span>{match.statusText || "Trực tiếp"}</span>
                                    </span>
                                  )}
                                  {isFinished && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300 border border-white/15">
                                      {match.statusText || "FT"}
                                    </span>
                                  )}
                                  {isPostponed && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      Hoãn
                                    </span>
                                  )}
                                  {isCanceled && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                      Hủy
                                    </span>
                                  )}
                                  {!isLive && !isFinished && !isPostponed && !isCanceled && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400 border border-white/10">
                                      Sắp diễn ra
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 2 Đội bóng & Tỷ số */}
                              <div className="space-y-2">
                                {/* Đội nhà */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {match.homeTeam.logo ? (
                                      <div className="relative w-5 h-5 shrink-0">
                                        <Image
                                          src={match.homeTeam.logo}
                                          alt={match.homeTeam.displayName}
                                          fill
                                          sizes="20px"
                                          className="object-contain"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                        {match.homeTeam.abbreviation?.slice(0, 2) || "H"}
                                      </div>
                                    )}
                                    <span
                                      className={`text-xs sm:text-sm truncate ${
                                        match.homeTeam.winner
                                          ? "font-extrabold text-white"
                                          : "font-medium text-gray-300"
                                      }`}
                                    >
                                      {match.homeTeam.displayName}
                                    </span>
                                  </div>

                                  {(isFinished || isLive) && match.homeTeam.score !== undefined && (
                                    <span
                                      className={`font-mono text-sm sm:text-base px-2 py-0.5 rounded-lg ${
                                        match.homeTeam.winner
                                          ? "font-black text-white bg-white/10"
                                          : "font-bold text-gray-400"
                                      }`}
                                    >
                                      {match.homeTeam.score}
                                    </span>
                                  )}
                                </div>

                                {/* Đội khách */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {match.awayTeam.logo ? (
                                      <div className="relative w-5 h-5 shrink-0">
                                        <Image
                                          src={match.awayTeam.logo}
                                          alt={match.awayTeam.displayName}
                                          fill
                                          sizes="20px"
                                          className="object-contain"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                        {match.awayTeam.abbreviation?.slice(0, 2) || "A"}
                                      </div>
                                    )}
                                    <span
                                      className={`text-xs sm:text-sm truncate ${
                                        match.awayTeam.winner
                                          ? "font-extrabold text-white"
                                          : "font-medium text-gray-300"
                                      }`}
                                    >
                                      {match.awayTeam.displayName}
                                    </span>
                                  </div>

                                  {(isFinished || isLive) && match.awayTeam.score !== undefined && (
                                    <span
                                      className={`font-mono text-sm sm:text-base px-2 py-0.5 rounded-lg ${
                                        match.awayTeam.winner
                                          ? "font-black text-white bg-white/10"
                                          : "font-bold text-gray-400"
                                      }`}
                                    >
                                      {match.awayTeam.score}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Footer thẻ: Sân vận động & Chi tiết */}
                              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                                <span className="truncate max-w-[200px]">
                                  {match.venue || "Chưa cập nhật sân"}
                                </span>
                                <span className="text-netflix-red group-hover:translate-x-0.5 transition-transform font-bold text-[10px] uppercase">
                                  Chi tiết trận →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. MODAL MATCH CENTER CHI TIẾT KHI CLICK VÀO TRẬN (Sử dụng createPortal) */}
      {isMounted &&
        activeModalFixture &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-netflix-red/20 text-netflix-red border border-netflix-red/30">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      {activeModalFixture.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {activeModalFixture.formattedDateUtc7} lúc {activeModalFixture.kickoffTimeUtc7} (Giờ VN)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalFixture(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
                  aria-label="Đóng chi tiết trận đấu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nội dung Match Center chi tiết */}
              <div className="max-h-[75vh] overflow-y-auto pr-1">
                <MatchCenter
                  leagueSlug={selectedLeague === "all" ? undefined : selectedLeague}
                  eventId={activeModalFixture.id}
                  matchTitle={activeModalFixture.name}
                  team1={activeModalFixture.homeTeam.displayName}
                  team2={activeModalFixture.awayTeam.displayName}
                  team1Logo={activeModalFixture.homeTeam.logo}
                  team2Logo={activeModalFixture.awayTeam.logo}
                  isLive={activeModalFixture.status === "live"}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default LeagueFixtures;
