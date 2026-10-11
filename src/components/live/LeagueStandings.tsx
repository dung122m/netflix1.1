"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { NormalizedLeagueStandings, StandingGroup } from "@/services/live/football-score/types";
import { CountryFlag } from "./CountryFlag";

// Danh sách các giải đấu hỗ trợ chọn trong Bảng xếp hạng
export const STANDINGS_LEAGUES = [
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

export interface LeagueStandingsProps {
  initialLeague?: string;
  defaultOpen?: boolean;
}

export const LeagueStandings: React.FC<LeagueStandingsProps> = ({
  initialLeague = "eng.1",
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedLeague, setSelectedLeague] = useState<string>(initialLeague);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);

  // Ref và state điều khiển thanh cuộn ngang giải đấu
  const leaguesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Client-side cache theo league để tránh fetch lại khi người dùng bấm chuyển đổi giữa các giải đấu
  const clientCacheRef = useRef<Record<string, { data: NormalizedLeagueStandings | null; isCup: boolean }>>({});
  const inFlightRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [standings, setStandings] = useState<NormalizedLeagueStandings | null>(null);
  const [isCupTournament, setIsCupTournament] = useState<boolean>(false);
  const [cupMessage, setCupMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStandings = async (leagueSlug: string, force: boolean = false) => {
    // 1. Kiểm tra cache phía client nếu không force
    if (!force && clientCacheRef.current[leagueSlug]) {
      const cached = clientCacheRef.current[leagueSlug];
      setStandings(cached.data);
      setIsCupTournament(cached.isCup);
      setActiveGroupIndex(0);
      setError(null);
      return;
    }

    if (inFlightRef.current && !force) {
      return;
    }

    // Hủy request trước nếu đang chạy
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/live-football/standings?league=${encodeURIComponent(leagueSlug)}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error("Không thể tải bảng xếp hạng từ máy chủ lúc này.");
      }

      const json = await res.json();
      if (!json.status) {
        throw new Error(json.error || "Dữ liệu bảng xếp hạng không khả dụng.");
      }

      if (json.isCupOrNoStandings) {
        setIsCupTournament(true);
        setCupMessage(json.message || "Giải đấu này theo thể thức cúp / loại trực tiếp và không có bảng xếp hạng.");
        setStandings(null);
        clientCacheRef.current[leagueSlug] = { data: null, isCup: true };
      } else {
        setIsCupTournament(false);
        setCupMessage("");
        setStandings(json.data);
        clientCacheRef.current[leagueSlug] = { data: json.data, isCup: false };
      }

      setActiveGroupIndex(0);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // Chỉ fetch dữ liệu khi khu vực Bảng xếp hạng đang MỞ và selectedLeague thay đổi
  useEffect(() => {
    if (isOpen && selectedLeague) {
      fetchStandings(selectedLeague);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedLeague]);

  const currentLeagueMeta = STANDINGS_LEAGUES.find((l) => l.slug === selectedLeague);
  const currentGroup: StandingGroup | undefined =
    standings?.groups?.[activeGroupIndex] || standings?.groups?.[0];

  // Kiểm tra vị trí cuộn để ẩn/hiện nút điều hướng
  const checkScroll = useCallback(() => {
    const el = leaguesScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  }, []);

  // Cuộn danh sách giải đấu mượt mà sang trái / phải
  const scrollLeagues = useCallback((direction: "left" | "right") => {
    if (leaguesScrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      leaguesScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScroll, 320);
    }
  }, [checkScroll]);

  // Hỗ trợ lăn chuột dọc chuyển thành cuộn ngang cho chuột máy tính
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && leaguesScrollRef.current) {
      leaguesScrollRef.current.scrollBy({ left: e.deltaY * 1.5, behavior: "auto" });
      checkScroll();
    }
  }, [checkScroll]);

  // Tự động cuộn giải đấu đang chọn vào giữa tầm nhìn khi chọn hoặc khi mở Bảng xếp hạng
  useEffect(() => {
    if (!isOpen || !leaguesScrollRef.current) return;
    const activeBtn = leaguesScrollRef.current.querySelector<HTMLButtonElement>(
      `[data-league="${selectedLeague}"]`,
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    const timer = setTimeout(checkScroll, 350);
    return () => clearTimeout(timer);
  }, [selectedLeague, isOpen, checkScroll]);

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200">
      {/* HEADER BẢNG XẾP HẠNG */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              Bảng Xếp Hạng Bóng Đá
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10">
                P3 • Standings
              </span>
            </h3>
            <p className="text-[11px] text-gray-400 truncate max-w-[220px] sm:max-w-md">
              {currentLeagueMeta ? `${currentLeagueMeta.flag} ${currentLeagueMeta.name}` : "Cập nhật từ ban tổ chức"}
              {standings ? ` • Mùa giải ${standings.season}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              type="button"
              onClick={() => fetchStandings(selectedLeague, true)}
              disabled={loading}
              title="Làm mới bảng xếp hạng"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all cursor-pointer"
          >
            {isOpen ? (
              <>
                <span>Thu gọn</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Xem bảng xếp hạng</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* CAROUSEL / TABS CHỌN GIẢI ĐẤU (NÚT CUỘN TRÁI / PHẢI VÀ HỖ TRỢ CON LĂN CHUỘT) */}
          <div className="relative group/tabs -mx-1 px-1">
            {/* Nút cuộn trái trên desktop */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollLeagues("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900/95 hover:bg-white text-gray-200 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                title="Cuộn sang trái"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Gradient mờ mép trái báo hiệu còn nội dung */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-transparent z-10" />
            )}

            {/* Container danh sách các tab */}
            <div
              ref={leaguesScrollRef}
              onScroll={checkScroll}
              onWheel={handleWheel}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden border-b border-white/5 scroll-smooth px-1"
            >
              {STANDINGS_LEAGUES.map((l) => {
                const isSelected = selectedLeague === l.slug;
                return (
                  <button
                    key={l.slug}
                    data-league={l.slug}
                    type="button"
                    onClick={() => setSelectedLeague(l.slug)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-sm font-bold scale-[1.02]"
                        : "bg-black/30 text-gray-400 border-white/5 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    <CountryFlag emoji={l.flag} className="w-4 h-4 object-contain inline-block shrink-0" />
                    <span>{l.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Gradient mờ mép phải báo hiệu còn nội dung */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-900 via-zinc-900/80 to-transparent z-10" />
            )}

            {/* Nút cuộn phải trên desktop */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollLeagues("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900/95 hover:bg-white text-gray-200 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                title="Cuộn sang phải"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* TAB CHUYỂN BẢNG ĐẤU NẾU GIẢI CÓ NHIỀU BẢNG (VÍ DỤ MLS CÓ 2 CONFERENCE) */}
          {standings && standings.groups.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Bảng đấu:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {standings.groups.map((group, idx) => (
                  <button
                    key={group.name}
                    type="button"
                    onClick={() => setActiveGroupIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeGroupIndex === idx
                        ? "bg-white/20 text-white border border-white/20"
                        : "bg-white/5 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TRẠNG THÁI LOADING */}
          {loading && !standings && !isCupTournament && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs sm:text-sm">Đang tải bảng xếp hạng chính thức...</p>
            </div>
          )}

          {/* TRẠNG THÁI LỖI */}
          {error && !standings && !isCupTournament && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-red-950/20 rounded-xl border border-red-500/20 p-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-xs sm:text-sm text-red-300 max-w-md">{error}</p>
              <button
                type="button"
                onClick={() => fetchStandings(selectedLeague, true)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* TRẠNG THÁI GIẢI ĐẤU CÚP (KNOCKOUT) */}
          {isCupTournament && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-zinc-950/40 rounded-xl border border-white/5 p-6">
              <ShieldAlert className="w-8 h-8 text-amber-400/80 mb-1" />
              <h4 className="text-sm font-bold text-gray-200">
                {currentLeagueMeta?.name} là giải đấu cúp
              </h4>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                {cupMessage}
              </p>
              <span className="mt-2 text-[11px] text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                Các trận đấu trực tiếp của giải sẽ hiển thị tại danh sách trận bên trên
              </span>
            </div>
          )}

          {/* TRẠNG THÁI KHÔNG CÓ DỮ LIỆU HOẶC NHÓM TRỐNG */}
          {standings && (!currentGroup || currentGroup.entries.length === 0) && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-zinc-950/40 rounded-xl border border-white/5 p-6">
              <AlertCircle className="w-8 h-8 text-amber-400/80 mb-1" />
              <h4 className="text-sm font-bold text-gray-200">
                Chưa có dữ liệu bảng xếp hạng
              </h4>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                Dữ liệu bảng xếp hạng cho {currentLeagueMeta?.name} đang được hệ thống cập nhật từ ban tổ chức.
              </p>
            </div>
          )}

          {/* TRẠNG THÁI CHƯA CÓ DỮ LIỆU BAN ĐẦU */}
          {!loading && !error && !standings && !isCupTournament && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-zinc-950/40 rounded-xl border border-white/5 p-6">
              <AlertCircle className="w-8 h-8 text-gray-400/80 mb-1" />
              <h4 className="text-sm font-bold text-gray-200">
                Chưa có dữ liệu giải đấu
              </h4>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                Vui lòng chọn một giải đấu ở thanh tab phía trên để xem bảng xếp hạng chi tiết.
              </p>
            </div>
          )}

          {/* BẢNG DỮ LIỆU CHÍNH (RESPONSIVE TABLE CUỘN NGANG) */}
          {standings && currentGroup && currentGroup.entries.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/90 shadow-xl scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-2 sm:px-3 text-center w-9 sm:w-12 sticky left-0 bg-zinc-950 z-20">#</th>
                      <th className="py-3 px-3 sm:px-4 min-w-[150px] sm:min-w-[220px] sticky left-9 sm:left-12 bg-zinc-950 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Câu lạc bộ</th>
                      <th className="py-3 px-2 text-center w-10 sm:w-12 font-bold" title="Số trận đã đá">Trận</th>
                      <th className="py-3 px-2 text-center w-10 sm:w-12 text-emerald-400 font-bold" title="Thắng">T</th>
                      <th className="py-3 px-2 text-center w-10 sm:w-12 text-gray-300 font-bold" title="Hòa">H</th>
                      <th className="py-3 px-2 text-center w-10 sm:w-12 text-rose-400 font-bold" title="Thua">B</th>
                      <th className="py-3 px-2 text-center w-16 sm:w-20 hidden md:table-cell font-mono" title="Bàn thắng - Bàn thua">BT-BB</th>
                      <th className="py-3 px-2 text-center w-12 sm:w-14 font-semibold font-mono" title="Hiệu số">HS</th>
                      <th className="py-3 px-3 text-center w-12 sm:w-16 font-black text-amber-400 bg-amber-500/10 font-mono" title="Điểm số">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {currentGroup.entries.map((entry, idx) => {
                      const totalEntries = currentGroup.entries.length;
                      // Determine European or standard qualification zones
                      let zoneColor = entry.note?.color;
                      if (!zoneColor) {
                        if (entry.rank <= 4) zoneColor = "#3b82f6"; // Champions League blue
                        else if (entry.rank <= 6) zoneColor = "#f97316"; // Europa League orange
                        else if (entry.rank > totalEntries - 3 && totalEntries >= 18) zoneColor = "#ef4444"; // Relegation red
                      }

                      return (
                        <tr
                          key={entry.team.id || entry.team.name || idx}
                          className="hover:bg-white/[0.04] transition-colors group/row"
                        >
                          {/* THỨ HẠNG VÀ CHỈ BÁO VỊ TRÍ (STICKY MOBILE) */}
                          <td className="py-2.5 px-2 sm:px-3 text-center font-bold text-gray-400 sticky left-0 bg-zinc-950 z-10">
                            <div className="flex items-center justify-center gap-1.5">
                              {zoneColor ? (
                                <span
                                  className="w-1.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: zoneColor }}
                                  title={entry.note?.description || `Hạng ${entry.rank}`}
                                />
                              ) : (
                                <span className="w-1.5 h-3.5 rounded-full shrink-0 bg-transparent" />
                              )}
                              <span className={entry.rank <= 4 ? "text-white font-black" : "font-mono"}>
                                {entry.rank}
                              </span>
                            </div>
                          </td>

                          {/* TÊN VÀ LOGO ĐỘI BÓNG (STICKY MOBILE) */}
                          <td className="py-2.5 px-3 sm:px-4 sticky left-9 sm:left-12 bg-zinc-950 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-2.5">
                              {entry.team.logo ? (
                                <div className="relative w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-sm">
                                  <Image
                                    src={entry.team.logo}
                                    alt={entry.team.displayName}
                                    fill
                                    className="object-contain"
                                    sizes="24px"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
                                  {entry.team.abbreviation || entry.team.name.slice(0, 2)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-extrabold text-white group-hover/row:text-amber-300 transition-colors block truncate text-xs sm:text-sm">
                                  {entry.team.displayName}
                                </span>
                                {entry.note?.description && (
                                  <span className="text-[10px] text-gray-400 hidden sm:block truncate">
                                    {entry.note.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* SỐ TRẬN */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-gray-300">
                            {entry.gamesPlayed}
                          </td>

                          {/* THẮNG */}
                          <td className="py-2.5 px-2 text-center font-mono text-emerald-400 font-bold">
                            {entry.wins}
                          </td>

                          {/* HÒA */}
                          <td className="py-2.5 px-2 text-center font-mono text-gray-400 font-medium">
                            {entry.ties}
                          </td>

                          {/* THUA */}
                          <td className="py-2.5 px-2 text-center font-mono text-rose-400 font-medium">
                            {entry.losses}
                          </td>

                          {/* BÀN THẮNG - BÀN THUA (Ẩn trên mobile) */}
                          <td className="py-2.5 px-2 text-center font-mono text-gray-400 text-xs hidden md:table-cell">
                            {entry.pointsFor}-{entry.pointsAgainst}
                          </td>

                          {/* HIỆU SỐ */}
                          <td className={`py-2.5 px-2 text-center font-mono font-bold ${
                            entry.pointDifferential > 0
                              ? "text-emerald-400"
                              : entry.pointDifferential < 0
                              ? "text-rose-400"
                              : "text-gray-400"
                          }`}>
                            {entry.pointDifferential > 0 ? `+${entry.pointDifferential}` : entry.pointDifferential}
                          </td>

                          {/* ĐIỂM SỐ */}
                          <td className="py-2.5 px-3 text-center font-mono font-black text-amber-400 sm:text-base bg-amber-500/10">
                            {entry.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* CHÚ THÍCH CÁC VỊ TRÍ XẾP HẠNG (NẾU CÓ) */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-400 px-1">
                <span className="font-semibold text-gray-300">Ghi chú:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#81D6AC]" />
                  <span>Vòng bảng Cúp C1 (Champions League)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B298E7]" />
                  <span>Vòng bảng Cúp C2 (Europa League)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E57373]" />
                  <span>Khu vực xuống hạng</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
