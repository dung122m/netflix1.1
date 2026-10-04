"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Filter,
  RotateCcw,
  Clock,
  Landmark,
  Sparkles,
  ChevronDown,
  ArrowLeft,
  X,
  History as HistoryIcon,
  Tag,
  Flame,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import allHistoryData from "@/data/history/catalog/allHistory.json";
import { HISTORICAL_PERIODS, getHistoricalPeriodById } from "@/data/history/periods";
import { resolveHistoricalFigure } from "@/data/history/figures";
import { getEventImage, getPeriodImage } from "@/data/history/images";
import { HistoricalEvent, HistoricalPeriodId, HistoricalPrecision } from "@/data/history/types";
import { getVietnamNow } from "@/lib/vietnamCalendar";

const ALL_EVENTS = allHistoryData as HistoricalEvent[];
const PAGE_SIZE = 40;

export function HistoryClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedPrecision, setSelectedPrecision] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [displayCount, setDisplayCount] = useState<number>(PAGE_SIZE);

  // Pre-compute event counts per period to eliminate repetitive array filtering
  const periodCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of ALL_EVENTS) {
      map[e.periodId] = (map[e.periodId] || 0) + 1;
    }
    return map;
  }, []);

  // 1. "Hôm nay trong lịch sử" milestone calculation
  const todayHighlight = useMemo(() => {
    const now = getVietnamNow();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();

    // Find exact day events occurring on today's month & day
    const todayEvents = ALL_EVENTS.filter(
      (e) => e.date.precision === "exact_day" && e.date.month === currentMonth && e.date.day === currentDay
    );

    if (todayEvents.length > 0) {
      // Sort by priorityScore desc
      const sorted = [...todayEvents].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
      return {
        isExactToday: true,
        events: sorted,
        primary: sorted[0],
        dateFormatted: `${currentDay.toString().padStart(2, "0")}/${currentMonth.toString().padStart(2, "0")}`,
        currentYear,
      };
    }

    // Fallback: monthly notable events
    const monthEvents = ALL_EVENTS.filter(
      (e) => e.date.month === currentMonth
    ).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    return {
      isExactToday: false,
      events: monthEvents.slice(0, 3),
      primary: monthEvents[0] || ALL_EVENTS[0],
      dateFormatted: `Tháng ${currentMonth}`,
      currentYear,
    };
  }, []);

  // 2. Filter & Search across all 3,388 events
  const filteredEvents = useMemo(() => {
    let result = ALL_EVENTS;

    // Search query: title, summary, year, figures & aliases
    if (searchQuery.trim()) {
      const rawQ = searchQuery.trim();
      const q = rawQ.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const resolvedFigure = resolveHistoricalFigure(rawQ);
      const canonicalNorm = resolvedFigure
        ? resolvedFigure.canonicalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        : null;

      result = result.filter((e) => {
        const normTitle = e.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normSummary = e.summary.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchFigures = e.figures?.some((f) => {
          const normF = f.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return normF.includes(q) || (canonicalNorm !== null && normF.includes(canonicalNorm));
        });
        const matchYear = e.year?.toString().includes(q);

        return normTitle.includes(q) || normSummary.includes(q) || matchFigures || matchYear;
      });
    }

    // Period filter
    if (selectedPeriod !== "all") {
      result = result.filter((e) => e.periodId === selectedPeriod);
    }

    // Precision filter
    if (selectedPrecision !== "all") {
      result = result.filter((e) => e.date.precision === selectedPrecision);
    }

    // Year filter
    if (yearFilter.trim()) {
      const y = parseInt(yearFilter.trim(), 10);
      if (!isNaN(y)) {
        result = result.filter((e) => e.year === y);
      }
    }

    return result;
  }, [searchQuery, selectedPeriod, selectedPrecision, yearFilter]);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, selectedPeriod, selectedPrecision, yearFilter]);

  const visibleEvents = useMemo(() => {
    return filteredEvents.slice(0, displayCount);
  }, [filteredEvents, displayCount]);

  const hasActiveFilters = searchQuery !== "" || selectedPeriod !== "all" || selectedPrecision !== "all" || yearFilter !== "";

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedPeriod("all");
    setSelectedPrecision("all");
    setYearFilter("");
  }, []);

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filteredEvents.length));
  };

  const handleShowAll = () => {
    setDisplayCount(filteredEvents.length);
  };

  // Precision label helper
  const getPrecisionBadge = (precision: HistoricalPrecision) => {
    switch (precision) {
      case "exact_day":
        return { label: "Ngày chính xác", bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
      case "month_year":
        return { label: "Theo tháng", bg: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
      case "year_only":
        return { label: "Theo năm", bg: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
      case "era_approx":
      default:
        return { label: "Thời tiền sử / Niên đại", bg: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
    }
  };

  return (
    <div className="min-h-screen text-zinc-100 pt-4 sm:pt-6 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER BANNER                                                     */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-white/10 p-6 sm:p-10 mb-8 shadow-2xl">
        {/* Subtle Ambient Red/Gold Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors bg-white/[0.06] hover:bg-white/[0.12] px-3.5 py-1.5 rounded-full border border-white/[0.1] mb-2 backdrop-blur-md cursor-pointer w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại xem phim</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600/20 to-amber-600/20 border border-amber-500/30 text-amber-300 shadow-sm backdrop-blur-md">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>BIÊN NIÊN SỬ VIỆT NAM</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Lịch Sử Việt Nam
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
            Khám phá hơn 3.300 mốc son hào hùng, các trận chiến hiển hách và danh nhân lập quốc qua 11 thời kỳ lịch sử vẻ vang từ thời các Vua Hùng dựng nước đến nay.
          </p>

          {/* Quick Metrics Chips */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-semibold text-zinc-300">
            <span className="px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>3.388 Mốc sự kiện</span>
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-red-400" />
              <span>11 Thời kỳ lịch sử</span>
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hơn 4.000 năm văn hiến</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. "HÔM NAY TRONG LỊCH SỬ" SPOTLIGHT                                      */}
      {/* ========================================================================= */}
      {todayHighlight.primary && (
        <div className="mb-10 rounded-2xl bg-gradient-to-r from-red-950/30 via-zinc-900 to-amber-950/30 border border-amber-500/30 p-5 sm:p-7 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📜</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-amber-400 uppercase tracking-wider">
                  {todayHighlight.isExactToday ? `Hôm nay trong lịch sử (${todayHighlight.dateFormatted})` : `Sự kiện tiêu biểu (${todayHighlight.dateFormatted})`}
                </h2>
                <p className="text-xs text-zinc-400">
                  {todayHighlight.isExactToday ? "Dấu mốc lịch sử diễn ra vào đúng ngày này" : "Các mốc sự kiện lịch sử trọng đại"}
                </p>
              </div>
            </div>

            {todayHighlight.primary.year && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600/30 text-red-200 border border-red-500/40">
                Năm {todayHighlight.primary.year}
                {todayHighlight.primary.year > 0 && todayHighlight.currentYear && (
                  <span className="ml-1 text-amber-300 font-normal">
                    ({todayHighlight.currentYear - todayHighlight.primary.year} năm trước)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="pt-4 space-y-2.5">
            <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {todayHighlight.primary.title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {todayHighlight.primary.summary}
            </p>

            {/* Documentary Image for Today's Highlight (if available) */}
            {(() => {
              const todayImg = getEventImage(todayHighlight.primary);
              if (!todayImg) return null;
              const rawSource = todayImg.imageSource || "";
              const parts = rawSource.split("/").map((s) => s.trim()).filter(Boolean);
              const credit = parts.length > 1 ? parts.slice(1).join(" • ") : rawSource;
              const captionText = todayImg.imageCaption || parts[0] || "Tư liệu lịch sử";

              return (
                <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/80 shadow-xl group/todayimg">
                  <div className="flex items-center justify-center p-3 sm:p-4 bg-black/40">
                    <img
                      src={todayImg.imageUrl}
                      alt={captionText}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const el = (e.currentTarget as HTMLElement).closest(".group\\/todayimg");
                        if (el) (el as HTMLElement).style.display = "none";
                      }}
                      className="max-h-[300px] w-auto max-w-full rounded-xl object-contain shadow-md transition-transform duration-300 group-hover/todayimg:scale-[1.01]"
                    />
                  </div>
                  <div className="px-4 py-2.5 bg-black/75 border-t border-white/[0.08] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 shrink-0">
                        Tư liệu
                      </span>
                      <span className="text-zinc-200 text-xs font-medium leading-relaxed line-clamp-2">
                        {captionText}
                      </span>
                    </div>
                    {credit && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 shrink-0 self-end sm:self-center">
                        <span className="text-zinc-500">Nguồn:</span>
                        {todayImg.referenceUrl ? (
                          <a
                            href={todayImg.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-amber-300 underline underline-offset-2 transition-colors max-w-[260px] truncate"
                          >
                            {credit}
                          </a>
                        ) : (
                          <span className="text-zinc-400 max-w-[260px] truncate">{credit}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {todayHighlight.primary.figures && todayHighlight.primary.figures.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-zinc-400">Nhân vật:</span>
                {todayHighlight.primary.figures.map((fig) => (
                  <span
                    key={fig}
                    className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] font-medium text-amber-300"
                  >
                    {fig}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="space-y-4 mb-8 bg-zinc-900/80 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
        {/* Search Input and Year Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sự kiện, nhân vật, chiến dịch, năm..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-zinc-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-36 sm:w-44">
              <input
                type="text"
                inputMode="numeric"
                value={yearFilter}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9\-]/g, "");
                  setYearFilter(val);
                }}
                placeholder="Lọc năm (vd: 1945)"
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-zinc-950 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-zinc-500 transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {yearFilter && (
                <button
                  onClick={() => setYearFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Xóa lọc năm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* 11 Historical Periods Filter Pills */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Thời kỳ lịch sử:</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedPeriod("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedPeriod === "all"
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 font-bold"
                  : "bg-zinc-950/80 text-zinc-300 hover:bg-zinc-800 border border-white/10"
              }`}
            >
              Tất cả thời kỳ ({ALL_EVENTS.length})
            </button>

            {HISTORICAL_PERIODS.map((period) => {
              const count = periodCounts[period.id] || 0;
              const isSelected = selectedPeriod === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(isSelected ? "all" : period.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "text-white border-amber-300 ring-1 ring-amber-300/60 shadow-md font-bold"
                      : "bg-zinc-950/80 text-zinc-300 hover:bg-zinc-800 border-white/10"
                  }`}
                  style={{
                    backgroundColor: isSelected ? period.colorToken : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? "#FFFFFF" : period.colorToken }}
                  />
                  <span>{period.shortName}</span>
                  <span className="text-[10px] opacity-80 font-normal">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Precision Selector Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
          <span className="text-zinc-400 font-medium">Độ chính xác ngày:</span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "exact_day", label: "Ngày chính xác (1.589)" },
            { id: "month_year", label: "Theo tháng (573)" },
            { id: "year_only", label: "Theo năm (1.137)" },
            { id: "era_approx", label: "Thời tiền sử (89)" },
          ].map((prec) => (
            <button
              key={prec.id}
              onClick={() => setSelectedPrecision(prec.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedPrecision === prec.id
                  ? "bg-zinc-200 text-zinc-950 font-bold"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-white/10"
              }`}
            >
              {prec.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. RESULTS STATS & ACTIVE PERIOD INFO                                     */}
      {/* ========================================================================= */}
      <div className="space-y-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-sm text-zinc-400">
            Hiển thị <span className="text-white font-bold">{visibleEvents.length}</span> /{" "}
            <span className="text-amber-400 font-bold">{filteredEvents.length}</span> sự kiện phù hợp
          </div>

          {selectedPeriod !== "all" && (
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <span>Đang lọc thời kỳ:</span>
              <span className="text-amber-300 font-semibold">
                {getHistoricalPeriodById(selectedPeriod)?.name} ({getHistoricalPeriodById(selectedPeriod)?.timeRange})
              </span>
            </div>
          )}
        </div>

        {/* Prominent Period Header Banner when a period is filtered */}
        {selectedPeriod !== "all" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-amber-500/30 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              {(() => {
                const pImg = getPeriodImage(selectedPeriod);
                const periodMeta = getHistoricalPeriodById(selectedPeriod);
                return (
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 shadow-md bg-zinc-900 flex items-center justify-center">
                    {pImg ? (
                      <img
                        src={pImg.imageUrl}
                        alt={pImg.imageCaption}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.parentElement?.querySelector(".period-fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    <div
                      className={`period-fallback w-full h-full ${pImg ? "hidden" : "flex"} items-center justify-center`}
                      style={{ backgroundColor: `${periodMeta?.colorToken || "#F59E0B"}20` }}
                    >
                      <span
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: periodMeta?.colorToken || "#F59E0B" }}
                      />
                    </div>
                  </div>
                );
              })()}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {getHistoricalPeriodById(selectedPeriod)?.name}
                </h2>
                <p className="text-xs text-zinc-400">
                  {getHistoricalPeriodById(selectedPeriod)?.timeRange} • {getHistoricalPeriodById(selectedPeriod)?.description}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
              {filteredEvents.length} sự kiện lịch sử
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. TIMELINE EVENTS STREAM                                                 */}
      {/* ========================================================================= */}
      {visibleEvents.length > 0 ? (
        <div className="relative border-l-2 border-zinc-800 ml-3 sm:ml-6 pl-4 sm:pl-8 space-y-6">
          {visibleEvents.map((event, index) => {
            const period = getHistoricalPeriodById(event.periodId);
            const precisionBadge = getPrecisionBadge(event.date.precision);
            const isNewPeriod = selectedPeriod === "all" && (index === 0 || event.periodId !== visibleEvents[index - 1]?.periodId);
            const periodCountInFiltered = filteredEvents.filter((e) => e.periodId === event.periodId).length;
            const eventImage = getEventImage(event);

            return (
              <React.Fragment key={event.id || `${event.displayDate}-${index}`}>
                {/* Period Section Banner when period changes in stream */}
                {isNewPeriod && period && (
                  <div className="sticky top-20 z-10 -ml-4 sm:-ml-8 pl-4 sm:pl-8 py-3 my-6 backdrop-blur-xl bg-[#050505]/95 border-y border-white/[0.08] flex items-center justify-between gap-3 shadow-md rounded-r-xl">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: period.colorToken || "#F59E0B" }}
                      />
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                          {period.name}
                        </span>
                        <span className="text-[11px] text-zinc-400 ml-2 hidden sm:inline">
                          ({period.timeRange})
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 shrink-0">
                      {periodCountInFiltered} sự kiện lịch sử
                    </span>
                  </div>
                )}

                <div className="relative group transition-all duration-300">
                  {/* Timeline Dot */}
                  <div
                    className="absolute -left-[23px] sm:-left-[39px] top-4 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 transition-transform group-hover:scale-125 shadow-md"
                    style={{ backgroundColor: period?.colorToken || "#F59E0B" }}
                  />

                  {/* Event Card */}
                  <div className="rounded-2xl bg-zinc-900/90 hover:bg-zinc-900 border border-white/10 hover:border-amber-400/40 p-4 sm:p-6 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-amber-950/20 backdrop-blur-md">
                    {/* Top Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-white/5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Date Badge */}
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{event.displayDate}</span>
                        </span>

                        {/* Precision Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${precisionBadge.bg}`}>
                          {precisionBadge.label}
                        </span>
                      </div>

                      {/* Period Badge */}
                      {period && (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white/90 border"
                          style={{
                            backgroundColor: `${period.colorToken}25`,
                            borderColor: `${period.colorToken}50`,
                          }}
                        >
                          {period.shortName}
                        </span>
                      )}
                    </div>

                    {/* Title & Summary (Deduplicated & Enhanced) */}
                    {(() => {
                      const cleanTitle = event.title.trim();
                      const cleanSummary = (event.summary || "").trim();
                      
                      const normTitle = cleanTitle.toLowerCase().replace(/[\.\,\;\:\s]+$/, "");
                      const normSummary = cleanSummary.toLowerCase().replace(/[\.\,\;\:\s]+$/, "");
                      const isDuplicate = normTitle === normSummary;

                      const isTruncatedTitle = cleanTitle.endsWith("...") || cleanTitle.endsWith("…");
                      const displayTitle = (isTruncatedTitle && cleanSummary && cleanSummary.startsWith(cleanTitle.replace(/\.{3}$|…$/, "")))
                        ? cleanSummary
                        : cleanTitle;

                      const shouldShowSummary = cleanSummary && !isDuplicate && displayTitle !== cleanSummary;

                      return (
                        <div className="mb-2">
                          <h3 className="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug break-words">
                            {displayTitle}
                          </h3>

                          {shouldShowSummary && (
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal break-words mt-1.5">
                              {cleanSummary}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Documentary Image (if available) with lazy-load & error fallback */}
                    {eventImage && (() => {
                      const rawSource = eventImage.imageSource || "";
                      const parts = rawSource.split("/").map((s) => s.trim()).filter(Boolean);
                      const credit = parts.length > 1 ? parts.slice(1).join(" • ") : rawSource;
                      const captionText = eventImage.imageCaption || parts[0] || "Tư liệu lịch sử";

                      return (
                        <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/80 shadow-xl group/img">
                          <div className="flex items-center justify-center p-3 sm:p-4 bg-black/40">
                            <img
                              src={eventImage.imageUrl}
                              alt={captionText}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const el = (e.currentTarget as HTMLElement).closest(".group\\/img");
                                if (el) (el as HTMLElement).style.display = "none";
                              }}
                              className="max-h-[320px] sm:max-h-[380px] w-auto max-w-full rounded-xl object-contain shadow-md transition-transform duration-300 group-hover/img:scale-[1.01]"
                            />
                          </div>
                          <div className="p-3 sm:p-4 bg-black/85 border-t border-white/[0.08] text-xs flex flex-col gap-2">
                            <div className="flex items-start gap-2 w-full min-w-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 shrink-0 mt-0.5">
                                Tư liệu
                              </span>
                              <span className="text-zinc-200 text-xs sm:text-sm font-medium leading-relaxed break-words flex-1">
                                {captionText}
                              </span>
                            </div>
                            {credit && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 w-full pt-2 border-t border-white/[0.06]">
                                <span className="text-zinc-500 font-semibold shrink-0">Nguồn:</span>
                                {eventImage.referenceUrl ? (
                                  <a
                                    href={eventImage.referenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-amber-300 underline underline-offset-2 transition-colors break-all"
                                    title="Xem tư liệu nguồn"
                                  >
                                    {credit}
                                  </a>
                                ) : (
                                  <span className="text-zinc-400 break-all">{credit}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bottom Figures & Significance Meta if available */}
                    {event.figures && event.figures.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-white/5">
                        <span className="text-[11px] text-zinc-400">Nhân vật:</span>
                        {event.figures.map((fig) => {
                          const figureObj = resolveHistoricalFigure(fig);
                          const displayName = figureObj ? figureObj.canonicalName : fig;
                          return (
                            <button
                              key={fig}
                              onClick={() => setSearchQuery(displayName)}
                              title={figureObj?.title || displayName}
                              className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 text-[11px] transition-colors cursor-pointer"
                            >
                              {displayName}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Sources Attribution */}
                    {event.sources && event.sources.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-white/5 text-[11px] text-zinc-500 font-normal">
                        <span className="text-zinc-400 font-medium flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-zinc-500" />
                          <span>Nguồn sự kiện:</span>
                        </span>
                        <span>{event.sources.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-4">
          <HistoryIcon className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Không tìm thấy sự kiện lịch sử phù hợp</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Hãy thử tìm kiếm với từ khóa khác (ví dụ: &ldquo;Điện Biên Phủ&rdquo;, &ldquo;1945&rdquo;, &ldquo;Bác Hồ&rdquo;, &ldquo;Bạch Đằng&rdquo;) hoặc đặt lại bộ lọc thời kỳ.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại toàn bộ bộ lọc</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PROGRESSIVE PAGINATION CONTROLS                                        */}
      {/* ========================================================================= */}
      {filteredEvents.length > visibleEvents.length && (
        <div className="mt-12 text-center space-y-3">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
            <span>
              Tải thêm 40 sự kiện (Còn {filteredEvents.length - visibleEvents.length} sự kiện)
            </span>
          </button>

          <div>
            <button
              onClick={handleShowAll}
              className="text-xs text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer underline underline-offset-4"
            >
              Hiển thị tất cả {filteredEvents.length} sự kiện
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


