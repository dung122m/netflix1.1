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
} from "lucide-react";

type FilterType = "the-loai" | "quoc-gia" | "year" | "type";

const MOVIE_TYPES = [
  { name: "🍿 Phim Lẻ", slug: "phim-le" },
  { name: "📺 Phim Bộ", slug: "phim-bo" },
  { name: "🎬 Chiếu Rạp", slug: "phim-chieu-rap" },
  { name: "🎨 Hoạt Hình", slug: "hoat-hinh" },
  { name: "🎪 TV Shows", slug: "tv-shows" },
  { name: "⏳ Sắp Chiếu", slug: "phim-sap-chieu" },
  { name: "🎙️ Thuyết Minh", slug: "phim-thuyet-minh" },
  { name: "🗣️ Lồng Tiếng", slug: "phim-long-tieng" },
];

export const FilterBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    router.push(`?${params.toString()}`, { scroll: false });
    setActiveDropdown(null);

    // Trả focus về trigger sau khi chọn filter
    setTimeout(() => {
      const trigger = document.querySelector<HTMLElement>(
        `[data-tv-filter="true"][data-filter-type="${filterType}"]`
      );
      if (trigger) {
        trigger.focus({ preventScroll: true });
      }
    }, 50);
  };

  // =========================================================
  // BẤM "TẤT CẢ"
  // =========================================================
  const handleClearFilter = (filterType: FilterType) => {
    const params = new URLSearchParams(searchParams.toString());
    const key = getParamKey(filterType);

    params.delete(key);
    params.delete("page");
    router.push(`?${params.toString()}`, { scroll: false });
    setActiveDropdown(null);

    // Trả focus về trigger sau khi xóa filter
    setTimeout(() => {
      const trigger = document.querySelector<HTMLElement>(
        `[data-tv-filter="true"][data-filter-type="${filterType}"]`
      );
      if (trigger) {
        trigger.focus({ preventScroll: true });
      }
    }, 50);
  };

  // =========================================================
  // TỰ ĐỘNG FOCUS CHIP KHI MỞ DROPDOWN & XỬ LÝ PHÍM ESCAPE/BACKSPACE
  // =========================================================
  useEffect(() => {
    if (activeDropdown) {
      const timer = setTimeout(() => {
        const selectedChip = document.querySelector<HTMLElement>(
          '[data-tv-filter-chip="true"][data-selected="true"]'
        );
        const firstChip = document.querySelector<HTMLElement>(
          '[data-tv-filter-chip="true"]'
        );
        const target = selectedChip || firstChip;
        if (target) {
          target.focus({ preventScroll: true });
          target.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [activeDropdown]);

  useEffect(() => {
    if (!activeDropdown) return;

    const handleDropdownKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        const currentDropdown = activeDropdown;
        setActiveDropdown(null);

        setTimeout(() => {
          const trigger = document.querySelector<HTMLElement>(
            `[data-tv-filter="true"][data-filter-type="${currentDropdown}"]`
          );
          if (trigger) {
            trigger.focus({ preventScroll: true });
          }
        }, 40);
      }
    };

    window.addEventListener("keydown", handleDropdownKeyDown);
    return () => window.removeEventListener("keydown", handleDropdownKeyDown);
  }, [activeDropdown]);

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
    MOVIE_TYPES.find((item) => item.slug === activeTypeSlug)?.name ||
    "Loại phim";

  const activeCategorySlug = searchParams.get("category");
  const activeCategoryName =
    filters.genres.find((item) => item.slug === activeCategorySlug)?.name ||
    "Thể loại";

  const activeCountrySlug = searchParams.get("country");
  const activeCountryName =
    filters.countries.find((item) => item.slug === activeCountrySlug)?.name ||
    "Quốc gia";

  const activeYear = searchParams.get("year") || "Năm phát hành";

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
        data-tv-filter-chip="true"
        data-selected={selected ? "true" : undefined}
        onClick={() => handleFilterChange(type, value)}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-center truncate border outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 cursor-pointer ${
          selected
            ? "bg-white text-black border-white font-semibold shadow-md"
            : "bg-zinc-800 text-gray-300 border-zinc-800 hover:bg-zinc-700 hover:text-white"
        }`}
      >
        {selected && <span className="mr-1">✓</span>}
        {label}
      </button>
    );
  };

  const renderAllButton = (type: FilterType) => {
    const isAllSelected = !hasSelectedFilter(type);

    return (
      <button
        type="button"
        data-tv-filter-chip="true"
        data-selected={isAllSelected ? "true" : undefined}
        onClick={() => handleClearFilter(type)}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-center truncate border outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 cursor-pointer ${
          isAllSelected
            ? "bg-white text-black border-white font-semibold shadow-md"
            : "bg-zinc-800 text-gray-300 border-zinc-800 hover:bg-zinc-700 hover:text-white"
        }`}
      >
        {isAllSelected && <span className="mr-1">✓</span>}
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
    router.push(query ? `?${query}` : "?", { scroll: false });
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

  return (
    <div className="relative z-40">
      {/* FILTER BUTTONS: Cuộn ngang mượt mà trên mobile, wrap trên PC */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2 pt-1 touch-pan-x overscroll-x-contain sm:flex-wrap sm:overflow-visible w-full">
        {/* LOẠI PHIM */}
        <button
          type="button"
          data-tv-filter="true"
          data-filter-type="type"
          aria-expanded={activeDropdown === "type"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "type" ? null : "type")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "type" || hasSelectedFilter("type")
              ? "bg-zinc-800 text-white border-purple-500/60 shadow-purple-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="whitespace-nowrap">{activeTypeName}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500 ml-0.5">
            {activeDropdown === "type" ? "▲" : "▼"}
          </span>
        </button>

        {/* THỂ LOẠI */}
        <button
          type="button"
          data-tv-filter="true"
          data-filter-type="the-loai"
          aria-expanded={activeDropdown === "the-loai"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "the-loai" ? null : "the-loai")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "the-loai" || hasSelectedFilter("the-loai")
              ? "bg-zinc-800 text-white border-rose-500/60 shadow-red-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-netflix-red flex-shrink-0" />
          <span className="whitespace-nowrap">{activeCategoryName}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500 ml-0.5">
            {activeDropdown === "the-loai" ? "▲" : "▼"}
          </span>
        </button>

        {/* QUỐC GIA */}
        <button
          type="button"
          data-tv-filter="true"
          data-filter-type="quoc-gia"
          aria-expanded={activeDropdown === "quoc-gia"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "quoc-gia" ? null : "quoc-gia")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "quoc-gia" || hasSelectedFilter("quoc-gia")
              ? "bg-zinc-800 text-white border-sky-500/60 shadow-sky-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Globe2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span className="whitespace-nowrap">{activeCountryName}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500 ml-0.5">
            {activeDropdown === "quoc-gia" ? "▲" : "▼"}
          </span>
        </button>

        {/* NĂM */}
        <button
          type="button"
          data-tv-filter="true"
          data-filter-type="year"
          aria-expanded={activeDropdown === "year"}
          onClick={() =>
            setActiveDropdown(activeDropdown === "year" ? null : "year")
          }
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
            activeDropdown === "year" || hasSelectedFilter("year")
              ? "bg-zinc-800 text-white border-emerald-500/60 shadow-emerald-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="whitespace-nowrap">{activeYear}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500 ml-0.5">
            {activeDropdown === "year" ? "▲" : "▼"}
          </span>
        </button>

        {/* XÓA TẤT CẢ */}
        {hasFilters && (
          <button
            type="button"
            data-tv-filter="true"
            data-filter-type="clear"
            onClick={clearAllFilters}
            className="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-gray-400 hover:text-rose-400 px-3 py-2 text-xs sm:text-sm transition cursor-pointer hover:bg-white/5 rounded-xl border border-dashed border-zinc-700/80 hover:border-rose-500/40 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Xoá bộ lọc</span>
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
                MOVIE_TYPES.map((item) => (
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
