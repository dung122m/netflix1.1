"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi } from "@/services/movieApi";
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
  }>({
    genres: [],
    countries: [],
    years: [],
  });

  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);

  // =========================================================
  // LOAD FILTERS
  // =========================================================
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await movieApi.getFilters();
        setFilters(data);
      } catch (error) {
        console.error("❌ Lỗi tải bộ lọc:", error);
      }
    };

    loadFilters();
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
        onClick={() => handleFilterChange(type, value)}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-center truncate border ${
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
        onClick={() => handleClearFilter(type)}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-center truncate border ${
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
    router.push("?");
  };

  return (
    <div className="relative z-40">
      {/* FILTER BUTTONS */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* LOẠI PHIM */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "type" ? null : "type")
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm ${
            activeDropdown === "type" || hasSelectedFilter("type")
              ? "bg-zinc-800 text-white border-purple-500/60 shadow-purple-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>{activeTypeName}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500">
            {activeDropdown === "type" ? "▲" : "▼"}
          </span>
        </button>

        {/* THỂ LOẠI */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "the-loai" ? null : "the-loai")
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm ${
            activeDropdown === "the-loai" || hasSelectedFilter("the-loai")
              ? "bg-zinc-800 text-white border-rose-500/60 shadow-red-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
          <span>{activeCategoryName}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500">
            {activeDropdown === "the-loai" ? "▲" : "▼"}
          </span>
        </button>

        {/* QUỐC GIA */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "quoc-gia" ? null : "quoc-gia")
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm ${
            activeDropdown === "quoc-gia" || hasSelectedFilter("quoc-gia")
              ? "bg-zinc-800 text-white border-sky-500/60 shadow-sky-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Globe2 className="w-3.5 h-3.5 text-sky-400" />
          <span>{activeCountryName}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500">
            {activeDropdown === "quoc-gia" ? "▲" : "▼"}
          </span>
        </button>

        {/* NĂM */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "year" ? null : "year")
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-semibold transition text-xs sm:text-sm shadow-sm ${
            activeDropdown === "year" || hasSelectedFilter("year")
              ? "bg-zinc-800 text-white border-emerald-500/60 shadow-emerald-950/40"
              : "bg-zinc-950/80 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>{activeYear}</span>
          <span className="text-[9px] sm:text-[10px] text-gray-500">
            {activeDropdown === "year" ? "▲" : "▼"}
          </span>
        </button>

        {/* XÓA TẤT CẢ */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-gray-400 hover:text-rose-400 px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition cursor-pointer hover:bg-white/5 rounded-lg"
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

          {/* DROPDOWN BOX: Tự co giãn theo màn hình điện thoại, chống tràn mép */}
          <div className="absolute top-full left-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-full max-w-4xl bg-zinc-950 border border-zinc-700 rounded-2xl p-3.5 sm:p-5 shadow-2xl z-50">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5 max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
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
