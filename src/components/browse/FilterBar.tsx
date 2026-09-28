"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movieApi";
import {
  Layers,
  Sparkles,
  Globe2,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from "lucide-react";

type FilterType = "the-loai" | "quoc-gia" | "year" | "type";

export const FilterBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const movieTypes = [
    { name: "🍿 Phim Lẻ", slug: "phim-le" },
    { name: "📺 Phim Bộ", slug: "phim-bo" },
    { name: "🎬 Chiếu Rạp", slug: "phim-chieu-rap" },
    { name: "🎨 Hoạt Hình", slug: "hoat-hinh" },
    { name: "🎪 TV Shows", slug: "tv-shows" },
    { name: "⏳ Sắp Chiếu", slug: "phim-sap-chieu" },
    { name: "🎙️ Thuyết Minh", slug: "phim-thuyet-minh" },
    { name: "🗣️ Lồng Tiếng", slug: "phim-long-tieng" },
  ];

  const [filters, setFilters] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genres: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countries: any[];
    years: string[];
  }>(() => {
    const currentYear = new Date().getFullYear();
    return {
      genres: DEFAULT_GENRES,
      countries: DEFAULT_COUNTRIES,
      years: Array.from({ length: 50 }, (_, index) => String(currentYear - index)),
    };
  });

  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Đồng bộ nhanh từ static cache của movieApi (0ms, không gọi API ngoài)
  useEffect(() => {
    movieApi.getFilters().then(setFilters).catch(() => {});
  }, []);

  // =========================================================
  // LẤY PARAM TƯƠNG ỨNG VỚI FILTER
  // =========================================================
  const getParamKey = (filterType: FilterType) => {
    if (filterType === "type") return "type";
    if (filterType === "the-loai") return "category";
    if (filterType === "quoc-gia") return "country";
    return "year";
  };

  // =========================================================
  // CHỌN FILTER
  // =========================================================
  const handleFilterChange = (filterType: FilterType, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const key = getParamKey(filterType);

    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.delete("page");
    const query = params.toString();
    router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    setActiveDropdown(null);
  };

  // =========================================================
  // BẤM "TẤT CẢ"
  // =========================================================
  const handleClearFilter = (filterType: FilterType) => {
    const params = new URLSearchParams(searchParams.toString());
    const key = getParamKey(filterType);

    params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    setActiveDropdown(null);
  };

  const isSelected = (filterType: FilterType, value: string) => {
    const key = getParamKey(filterType);
    return searchParams.get(key) === value;
  };

  const hasSelectedFilter = (filterType: FilterType) => {
    const key = getParamKey(filterType);
    return !!searchParams.get(key);
  };

  const activeTypeSlug = searchParams.get("type");
  const activeTypeName =
    movieTypes.find((item) => item.slug === activeTypeSlug)?.name ||
    "Loại phim";

  const activeCategorySlug = searchParams.get("category");
  const activeCategoryName =
    filters.genres.find((item) => item.slug === activeCategorySlug)?.name ||
    "Thể loại";

  const activeCountrySlug = searchParams.get("country");
  const activeCountryName =
    filters.countries.find((item) => item.slug === activeCountrySlug)?.name ||
    "Quốc gia";

  const activeYear = searchParams.get("year") || "Năm";

  const getActiveChipStyle = (filterType: FilterType) => {
    switch (filterType) {
      case "type":
        return "bg-purple-600/90 text-white border-purple-400 shadow-md shadow-purple-950/60 font-semibold";
      case "the-loai":
        return "bg-rose-600/90 text-white border-rose-400 shadow-md shadow-red-950/60 font-semibold";
      case "quoc-gia":
        return "bg-sky-600/90 text-white border-sky-400 shadow-md shadow-sky-950/60 font-semibold";
      case "year":
        return "bg-emerald-600/90 text-white border-emerald-400 shadow-md shadow-emerald-950/60 font-semibold";
      default:
        return "bg-zinc-200 text-zinc-950 border-white font-semibold shadow-md";
    }
  };

  const Chip = ({
    label,
    value,
    type,
  }: {
    label: string;
    value: string;
    type: FilterType;
  }) => {
    const selected = isSelected(type, value);

    return (
      <button
        type="button"
        onClick={() => handleFilterChange(type, value)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-center truncate border outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 cursor-pointer active:scale-95 motion-reduce:transform-none ${
          selected
            ? getActiveChipStyle(type)
            : "bg-zinc-900/90 text-gray-300 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white"
        }`}
      >
        {selected && <Check className="inline-block w-3.5 h-3.5 mr-1 stroke-[2.5]" />}
        {label}
      </button>
    );
  };

  const renderAllButton = (type: FilterType) => {
    const isAllSelected = !hasSelectedFilter(type);

    return (
      <button
        type="button"
        onClick={() => handleClearFilter(type)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-center truncate border outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 cursor-pointer active:scale-95 motion-reduce:transform-none ${
          isAllSelected
            ? "bg-zinc-200 text-zinc-950 border-white font-semibold shadow-md"
            : "bg-zinc-900/90 text-gray-300 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white"
        }`}
      >
        {isAllSelected && <Check className="inline-block w-3.5 h-3.5 mr-1 stroke-[2.5]" />}
        Tất cả
      </button>
    );
  };

  const hasFilters =
    !!searchParams.get("type") ||
    !!searchParams.get("category") ||
    !!searchParams.get("country") ||
    !!searchParams.get("year");

  const clearAllFilters = () => {
    setActiveDropdown(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("category");
    params.delete("country");
    params.delete("year");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
  };

  const getDropdownAnchorClasses = () => {
    switch (activeDropdown) {
      case "type":
        return "left-0 right-auto";
      case "the-loai":
        return "left-0 sm:left-24 lg:left-32 right-auto";
      case "quoc-gia":
        return "left-0 sm:left-48 lg:left-64 right-auto";
      case "year":
        return "left-0 sm:left-auto sm:right-0";
      default:
        return "left-0 right-auto";
    }
  };

  const activeFilterCount = [
    searchParams.get("type"),
    searchParams.get("category"),
    searchParams.get("country"),
    searchParams.get("year"),
  ].filter(Boolean).length;

  return (
    <div className="relative z-40">
      {/* MOBILE ACCORDION TOGGLE: Thu gọn thanh filter dày trên mobile 390px, ưu tiên QuickGenreChips */}
      <div className="sm:hidden flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={() => setIsMobileExpanded((prev) => !prev)}
          aria-expanded={isMobileExpanded || hasFilters}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none cursor-pointer shadow-sm ${
            hasFilters || isMobileExpanded
              ? "bg-zinc-800 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.06)]"
              : "bg-zinc-900/90 text-gray-300 border-white/10 hover:text-white hover:border-white/20"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-netflix-red" />
          <span>Bộ lọc chi tiết</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-netflix-red text-[10px] font-bold text-white flex items-center justify-center shadow-sm shadow-red-950">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 motion-reduce:transition-none ${
              isMobileExpanded || hasFilters ? "rotate-180 text-white" : "rotate-0"
            }`}
          />
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium px-2 py-1 transition-all duration-150 hover:scale-105 active:scale-95 motion-reduce:transform-none"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* FILTER BUTTONS: Cuộn ngang mượt mà trên mobile khi mở, wrap trên PC */}
      <div
        className={`${
          isMobileExpanded || hasFilters ? "flex" : "hidden sm:flex"
        } items-center gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2 pt-1 sm:flex-wrap sm:overflow-visible w-full`}
      >
        {/* LOẠI PHIM */}
        <button
          type="button"
          aria-expanded={activeDropdown === "type"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "type" ? null : "type")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "type" || hasSelectedFilter("type")
              ? "bg-zinc-800 text-white border-purple-500/70 shadow-[0_0_16px_rgba(168,85,247,0.22)]"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-purple-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(168,85,247,0.12)]"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="whitespace-nowrap">{activeTypeName}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 motion-reduce:transition-none flex-shrink-0 ${
              activeDropdown === "type" ? "rotate-180 text-purple-300" : "rotate-0"
            }`}
          />
        </button>

        {/* THỂ LOẠI */}
        <button
          type="button"
          aria-expanded={activeDropdown === "the-loai"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "the-loai" ? null : "the-loai")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "the-loai" || hasSelectedFilter("the-loai")
              ? "bg-zinc-800 text-white border-rose-500/70 shadow-[0_0_16px_rgba(244,63,94,0.22)]"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-rose-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(244,63,94,0.12)]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-netflix-red flex-shrink-0" />
          <span className="whitespace-nowrap">{activeCategoryName}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 motion-reduce:transition-none flex-shrink-0 ${
              activeDropdown === "the-loai" ? "rotate-180 text-rose-300" : "rotate-0"
            }`}
          />
        </button>

        {/* QUỐC GIA */}
        <button
          type="button"
          aria-expanded={activeDropdown === "quoc-gia"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "quoc-gia" ? null : "quoc-gia")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "quoc-gia" || hasSelectedFilter("quoc-gia")
              ? "bg-zinc-800 text-white border-sky-500/70 shadow-[0_0_16px_rgba(14,165,233,0.22)]"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-sky-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(14,165,233,0.12)]"
          }`}
        >
          <Globe2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span className="whitespace-nowrap">{activeCountryName}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 motion-reduce:transition-none flex-shrink-0 ${
              activeDropdown === "quoc-gia" ? "rotate-180 text-sky-300" : "rotate-0"
            }`}
          />
        </button>

        {/* NĂM */}
        <button
          type="button"
          aria-expanded={activeDropdown === "year"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "year" ? null : "year")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "year" || hasSelectedFilter("year")
              ? "bg-zinc-800 text-white border-emerald-500/70 shadow-[0_0_16px_rgba(16,185,129,0.22)]"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-emerald-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(16,185,129,0.12)]"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="whitespace-nowrap">{activeYear}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 motion-reduce:transition-none flex-shrink-0 ${
              activeDropdown === "year" ? "rotate-180 text-emerald-300" : "rotate-0"
            }`}
          />
        </button>

        {/* XÓA TẤT CẢ */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-gray-400 hover:text-rose-400 px-3 py-2 text-xs sm:text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none cursor-pointer hover:bg-rose-500/10 rounded-xl border border-dashed border-zinc-700/80 hover:border-rose-500/40 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* DROPDOWN MENU */}
      {activeDropdown && (
        <>
          {/* OVERLAY */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setActiveDropdown(null)}
          />

          {/* DROPDOWN BOX: Neo đúng bên dưới nút đang mở trên PC, co giãn chống tràn trên Mobile */}
          <div
            className={`absolute top-full mt-2.5 ${getDropdownAnchorClasses()} w-[calc(100vw-2rem)] sm:w-auto min-w-[280px] sm:min-w-[360px] max-w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-3xl bg-zinc-950/98 border border-zinc-700/80 rounded-2xl p-3.5 sm:p-5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150`}
          >
            <div
              className={`grid ${
                activeDropdown === "year"
                  ? "grid-cols-3 sm:grid-cols-5 md:grid-cols-8"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
              } gap-2 sm:gap-2.5 max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent`}
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {renderAllButton(activeDropdown)}

              {activeDropdown === "type" &&
                movieTypes.map((item) => (
                  <Chip
                    key={item.slug}
                    label={item.name}
                    value={item.slug}
                    type="type"
                  />
                ))}

              {activeDropdown === "the-loai" &&
                filters.genres.map((item) => (
                  <Chip
                    key={item.slug}
                    label={item.name}
                    value={item.slug}
                    type="the-loai"
                  />
                ))}

              {activeDropdown === "quoc-gia" &&
                filters.countries.map((item) => (
                  <Chip
                    key={item.slug}
                    label={item.name}
                    value={item.slug}
                    type="quoc-gia"
                  />
                ))}

              {activeDropdown === "year" &&
                filters.years.map((year) => (
                  <Chip key={year} label={year} value={year} type="year" />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterBar;
