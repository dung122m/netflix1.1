"use client";

import React, { useEffect, useState, useRef, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movieApi";
import {
  Film,
  Sparkles,
  Globe2,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  Filter,
  Dices,
  Clock,
  Star,
  Flame,
  Loader2,
} from "lucide-react";

export type FilterGroup = "type" | "genre" | "country" | "year" | "sort";

interface MovieTypeOption {
  name: string;
  slug: string;
  emoji: string;
}

const MOVIE_TYPES: MovieTypeOption[] = [
  { name: "Phim Lẻ", slug: "phim-le", emoji: "🍿" },
  { name: "Phim Bộ", slug: "phim-bo", emoji: "📺" },
  { name: "Chiếu Rạp", slug: "phim-chieu-rap", emoji: "🎬" },
  { name: "Hoạt Hình", slug: "hoat-hinh", emoji: "🎨" },
  { name: "TV Shows", slug: "tv-shows", emoji: "🎪" },
  { name: "Sắp Chiếu", slug: "phim-sap-chieu", emoji: "⏳" },
  { name: "Thuyết Minh", slug: "phim-thuyet-minh", emoji: "🎙️" },
  { name: "Lồng Tiếng", slug: "phim-long-tieng", emoji: "🗣️" },
];

const SORT_OPTIONS = [
  { label: "Đánh giá cao", value: "rating", icon: Star, color: "text-amber-400" },
  { label: "Mới cập nhật", value: "latest", icon: Clock, color: "text-sky-400" },
  { label: "Xem nhiều nhất", value: "views", icon: Flame, color: "text-orange-500" },
  { label: "Năm mới nhất", value: "year", icon: Calendar, color: "text-emerald-400" },
];

export const FilterBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

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
      years: Array.from({ length: 45 }, (_, index) => String(currentYear - index)),
    };
  });

  const [activeDropdown, setActiveDropdown] = useState<FilterGroup | null>(null);
  const [optimisticParams, setOptimisticParams] = useState<{
    type?: string;
    category?: string;
    country?: string;
    year?: string;
    sort?: string;
  }>({});
  const [pendingGroup, setPendingGroup] = useState<FilterGroup | "all" | null>(null);

  // Sync with movieApi static/cached filters
  useEffect(() => {
    movieApi.getFilters().then(setFilters).catch(() => {});
  }, []);

  // Dismiss on outside click & Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // When searchParams updates, reset optimistic state and pending group
  useEffect(() => {
    setOptimisticParams({});
    setPendingGroup(null);
  }, [searchParams]);

  // Current active values with optimistic instant feedback
  const currentType = optimisticParams.type !== undefined ? optimisticParams.type : (searchParams.get("type") || "");
  const currentCategory = optimisticParams.category !== undefined ? optimisticParams.category : (searchParams.get("category") || "");
  const currentCountry = optimisticParams.country !== undefined ? optimisticParams.country : (searchParams.get("country") || "");
  const currentYear = optimisticParams.year !== undefined ? optimisticParams.year : (searchParams.get("year") || "");
  const currentSort = optimisticParams.sort !== undefined ? optimisticParams.sort : (searchParams.get("sort") || "rating");
  const currentActor = searchParams.get("actor") || "";
  const currentKeyword = searchParams.get("keyword") || "";

  // Query parameter updating helper with immediate transition & loading events
  const updateQueryParam = useCallback((key: string, value: string) => {
    const groupKey = (key === "type" ? "type" : key === "category" ? "genre" : key === "country" ? "country" : key === "year" ? "year" : key === "sort" ? "sort" : null) as FilterGroup | null;
    
    // 1. Cập nhật nhãn và trạng thái active ngay lập tức (0ms)
    setOptimisticParams((prev) => ({
      ...prev,
      [key]: value === searchParams.get(key) ? "" : value,
    }));
    if (groupKey) {
      setPendingGroup(groupKey);
    }
    setActiveDropdown(null);

    // 2. Kích hoạt thanh tiến trình đỏ đỉnh trang (Top Progress Bar)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:loading-start"));
    }

    const params = new URLSearchParams(searchParams.toString());
    if (key === "sort") {
      if (value === "rating" || !value) {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
    } else if (!value || params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();

    // 3. Thực hiện chuyển trang không chặn UI bằng useTransition
    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [searchParams, router]);

  // Clear single key
  const handleClearKey = useCallback((key: string) => {
    const groupKey = (key === "type" ? "type" : key === "category" ? "genre" : key === "country" ? "country" : key === "year" ? "year" : key === "sort" ? "sort" : null) as FilterGroup | null;
    setOptimisticParams((prev) => ({
      ...prev,
      [key]: "",
    }));
    if (groupKey) {
      setPendingGroup(groupKey);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:loading-start"));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [searchParams, router]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setActiveDropdown(null);
    setOptimisticParams({
      type: "",
      category: "",
      country: "",
      year: "",
      sort: "",
    });
    setPendingGroup("all");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:loading-start"));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("category");
    params.delete("country");
    params.delete("year");
    params.delete("sort");
    params.delete("actor");
    params.delete("keyword");
    params.delete("page");
    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [searchParams, router]);

  // Resolved display labels
  const activeTypeObj = MOVIE_TYPES.find((t) => t.slug === currentType);
  const activeTypeName = activeTypeObj ? activeTypeObj.name : "Loại phim";

  const activeCategoryObj = filters.genres.find((g) => g.slug === currentCategory);
  const activeCategoryName = activeCategoryObj ? activeCategoryObj.name : "Thể loại";

  const activeCountryObj = filters.countries.find((c) => c.slug === currentCountry);
  const activeCountryName = activeCountryObj ? activeCountryObj.name : "Quốc gia";

  const activeSortObj = SORT_OPTIONS.find((s) => s.value === currentSort);
  const activeSortName = activeSortObj ? activeSortObj.label : "Đánh giá cao";

  // Count active filters for badge
  const isCustomSort = Boolean(currentSort && currentSort !== "rating");
  const activeFiltersCount = [
    Boolean(currentType),
    Boolean(currentCategory),
    Boolean(currentCountry),
    Boolean(currentYear),
    isCustomSort,
    Boolean(currentActor || currentKeyword),
  ].filter(Boolean).length;

  const hasAnyFilter = activeFiltersCount > 0;

  const toggleDropdown = (group: FilterGroup) => {
    setActiveDropdown((prev) => (prev === group ? null : group));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key in FilterGroup]?: HTMLButtonElement | null }>({});
  const [dropdownOffset, setDropdownOffset] = useState<{ left?: number; right?: number }>({});

  const updateDropdownPosition = useCallback(() => {
    if (!activeDropdown || !containerRef.current) return;
    const btn = buttonRefs.current[activeDropdown];
    if (!btn) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    // On mobile, wide grid dropdowns (genre, country, year) align to container edge
    if (isMobile && (activeDropdown === "genre" || activeDropdown === "country" || activeDropdown === "year")) {
      setDropdownOffset({ left: 0, right: undefined });
      return;
    }

    const left = btnRect.left - containerRect.left;

    if (activeDropdown === "sort") {
      const right = containerRect.right - btnRect.right;
      setDropdownOffset({ right: Math.max(0, right), left: undefined });
    } else if (activeDropdown === "year" && left + 320 > containerRect.width) {
      const right = containerRect.right - btnRect.right;
      setDropdownOffset({ right: Math.max(0, right), left: undefined });
    } else {
      const maxDropdownWidth = (activeDropdown === "genre" || activeDropdown === "country") ? 384 : 240;
      const maxLeft = Math.max(0, containerRect.width - maxDropdownWidth);
      setDropdownOffset({ left: Math.max(0, Math.min(left, maxLeft)), right: undefined });
    }
  }, [activeDropdown]);

  useEffect(() => {
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", updateDropdownPosition, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      if (scrollEl) scrollEl.removeEventListener("scroll", updateDropdownPosition);
    };
  }, [updateDropdownPosition]);

  return (
    <div ref={containerRef} className="w-full relative z-40 select-none">
      {/* 1. COMPACT DROPDOWN FILTER BAR (Single Row 44-48px) */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 flex-nowrap sm:flex-wrap"
      >
        
        {/* DROPDOWN 1: LOẠI PHIM */}
        <button
          ref={(el) => {
            buttonRefs.current["type"] = el;
          }}
          type="button"
          onClick={() => toggleDropdown("type")}
          aria-expanded={activeDropdown === "type"}
          aria-haspopup="listbox"
          aria-label="Lọc theo loại phim"
          className={`h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
            currentType
              ? "bg-purple-950/60 border-purple-500/80 text-purple-200 ring-1 ring-purple-500/30 shadow-purple-950/50"
              : activeDropdown === "type"
              ? "bg-zinc-800 text-white border-zinc-600"
              : "bg-zinc-900/90 text-gray-300 border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/20"
          }`}
        >
          <Film className={`w-3.5 h-3.5 flex-none ${currentType ? "text-purple-400" : "text-gray-400"}`} />
          <span className="truncate max-w-[110px] sm:max-w-none">
            {currentType ? activeTypeName : "Loại phim"}
          </span>
          {isPending && pendingGroup === "type" ? (
            <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-none" />
          ) : (
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-none ${
                activeDropdown === "type" ? "rotate-180 text-white" : "rotate-0"
              }`}
            />
          )}
        </button>

        {/* DROPDOWN 2: THỂ LOẠI */}
        <button
          ref={(el) => {
            buttonRefs.current["genre"] = el;
          }}
          type="button"
          onClick={() => toggleDropdown("genre")}
          aria-expanded={activeDropdown === "genre"}
          aria-haspopup="listbox"
          aria-label="Lọc theo thể loại phim"
          className={`h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
            currentCategory
              ? "bg-rose-950/60 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/30 shadow-rose-950/50"
              : activeDropdown === "genre"
              ? "bg-zinc-800 text-white border-zinc-600"
              : "bg-zinc-900/90 text-gray-300 border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/20"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 flex-none ${currentCategory ? "text-rose-400" : "text-amber-400"}`} />
          <span className="truncate max-w-[110px] sm:max-w-none">
            {currentCategory ? activeCategoryName : "Thể loại"}
          </span>
          {isPending && pendingGroup === "genre" ? (
            <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin flex-none" />
          ) : (
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-none ${
                activeDropdown === "genre" ? "rotate-180 text-white" : "rotate-0"
              }`}
            />
          )}
        </button>

        {/* DROPDOWN 3: QUỐC GIA */}
        <button
          ref={(el) => {
            buttonRefs.current["country"] = el;
          }}
          type="button"
          onClick={() => toggleDropdown("country")}
          aria-expanded={activeDropdown === "country"}
          aria-haspopup="listbox"
          aria-label="Lọc theo quốc gia sản xuất"
          className={`h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
            currentCountry
              ? "bg-sky-950/60 border-sky-500/80 text-sky-200 ring-1 ring-sky-500/30 shadow-sky-950/50"
              : activeDropdown === "country"
              ? "bg-zinc-800 text-white border-zinc-600"
              : "bg-zinc-900/90 text-gray-300 border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/20"
          }`}
        >
          <Globe2 className={`w-3.5 h-3.5 flex-none ${currentCountry ? "text-sky-400" : "text-gray-400"}`} />
          <span className="truncate max-w-[110px] sm:max-w-none">
            {currentCountry ? activeCountryName : "Quốc gia"}
          </span>
          {isPending && pendingGroup === "country" ? (
            <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin flex-none" />
          ) : (
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-none ${
                activeDropdown === "country" ? "rotate-180 text-white" : "rotate-0"
              }`}
            />
          )}
        </button>

        {/* DROPDOWN 4: NĂM PHÁT HÀNH */}
        <button
          ref={(el) => {
            buttonRefs.current["year"] = el;
          }}
          type="button"
          onClick={() => toggleDropdown("year")}
          aria-expanded={activeDropdown === "year"}
          aria-haspopup="listbox"
          aria-label="Lọc theo năm phát hành"
          className={`h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
            currentYear
              ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-200 ring-1 ring-emerald-500/30 shadow-emerald-950/50"
              : activeDropdown === "year"
              ? "bg-zinc-800 text-white border-zinc-600"
              : "bg-zinc-900/90 text-gray-300 border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/20"
          }`}
        >
          <Calendar className={`w-3.5 h-3.5 flex-none ${currentYear ? "text-emerald-400" : "text-gray-400"}`} />
          <span className="truncate max-w-[110px] sm:max-w-none">
            {currentYear ? currentYear : "Năm"}
          </span>
          {isPending && pendingGroup === "year" ? (
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin flex-none" />
          ) : (
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-none ${
                activeDropdown === "year" ? "rotate-180 text-white" : "rotate-0"
              }`}
            />
          )}
        </button>

        {/* DROPDOWN 5: SẮP XẾP */}
        <button
          ref={(el) => {
            buttonRefs.current["sort"] = el;
          }}
          type="button"
          onClick={() => toggleDropdown("sort")}
          aria-expanded={activeDropdown === "sort"}
          aria-haspopup="listbox"
          aria-label="Sắp xếp danh sách phim"
          className={`h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
            isCustomSort
              ? "bg-amber-950/60 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/30 shadow-amber-950/50"
              : activeDropdown === "sort"
              ? "bg-zinc-800 text-white border-zinc-600"
              : "bg-zinc-900/90 text-gray-300 border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/20"
          }`}
        >
          <ArrowUpDown className={`w-3.5 h-3.5 flex-none ${isCustomSort ? "text-amber-400" : "text-gray-400"}`} />
          <span className="truncate max-w-[110px] sm:max-w-none">
            {activeSortName}
          </span>
          {isPending && pendingGroup === "sort" ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-none" />
          ) : (
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-none ${
                activeDropdown === "sort" ? "rotate-180 text-white" : "rotate-0"
              }`}
            />
          )}
        </button>

        {/* NÚT BỐC QUẺ NHANH */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-ai-roulette"));
            }
          }}
          className="h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border border-[var(--accent-border,rgba(229,9,20,0.5))] bg-netflix-red/15 hover:bg-netflix-red/30 text-white text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm flex-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          title="Bốc quẻ phim ngẫu nhiên với AI"
        >
          <Dices className="w-4 h-4 text-amber-300" />
          <span className="hidden md:inline">Bốc quẻ</span>
        </button>

        {/* XÓA NHANH TOÀN BỘ BỘ LỌC KHI CÓ FILTER */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClearAll}
            className="h-11 px-3 sm:px-3.5 rounded-xl sm:rounded-2xl border border-dashed border-zinc-700/80 hover:border-rose-500/50 text-gray-400 hover:text-rose-300 hover:bg-rose-950/20 text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm flex-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            title="Xóa tất cả các bộ lọc hiện tại"
          >
            {isPending && pendingGroup === "all" ? (
              <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="hidden sm:inline">Đặt lại</span>
          </button>
        )}
      </div>

      {/* 2. ACTIVE DROPDOWN POPUP (Neo chính xác dưới từng nút bấm được chọn) */}
      {activeDropdown && (
        <div
          className="absolute top-full mt-2 z-50 transition-all duration-150"
          style={{
            left: dropdownOffset.left !== undefined ? `${dropdownOffset.left}px` : undefined,
            right: dropdownOffset.right !== undefined ? `${dropdownOffset.right}px` : undefined,
          }}
        >
          {/* POPUP 1: LOẠI PHIM */}
          {activeDropdown === "type" && (
            <div className="w-56 sm:w-60 rounded-2xl bg-zinc-950/98 border border-zinc-700/80 p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 mb-2 flex items-center justify-between">
                <span>Chọn loại phim</span>
                {currentType && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("type", "")}
                    className="text-purple-400 hover:text-purple-300 text-[11px] normal-case font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                <button
                  type="button"
                  onClick={() => updateQueryParam("type", "")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                    !currentType
                      ? "bg-white/10 text-white font-bold"
                      : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span>Tất cả loại phim</span>
                  {!currentType && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
                {MOVIE_TYPES.map((t) => {
                  const isSelected = currentType === t.slug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => updateQueryParam("type", t.slug)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                        isSelected
                          ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-950/50"
                          : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{t.emoji}</span>
                        <span>{t.name}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* POPUP 2: THỂ LOẠI */}
          {activeDropdown === "genre" && (
            <div className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 rounded-2xl bg-zinc-950/98 border border-zinc-700/80 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 mb-2 flex items-center justify-between">
                <span>Chọn thể loại</span>
                {currentCategory && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("category", "")}
                    className="text-rose-400 hover:text-rose-300 text-[11px] normal-case font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>

              {/* Bốc quẻ roulette action button */}
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(null);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-ai-roulette"));
                  }
                }}
                className="w-full mb-2.5 px-3 py-2 rounded-xl text-xs font-bold transition bg-netflix-red hover:brightness-110 text-white flex items-center justify-center gap-2 shadow-md shadow-[var(--accent-glow,rgba(229,9,20,0.3))] cursor-pointer border border-white/20"
              >
                <Dices className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: "4s" }} />
                <span>Bốc quẻ phim ngẫu nhiên</span>
              </button>

              <div className="max-h-64 sm:max-h-72 overflow-y-auto grid grid-cols-2 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                <button
                  type="button"
                  onClick={() => updateQueryParam("category", "")}
                  className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                    !currentCategory
                      ? "bg-white/10 text-white font-bold"
                      : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span>Tất cả thể loại</span>
                  {!currentCategory && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </button>
                {filters.genres.map((g) => {
                  const isSelected = currentCategory === g.slug;
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => updateQueryParam("category", g.slug)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left truncate ${
                        isSelected
                          ? "bg-rose-600 text-white font-bold shadow-md shadow-red-950/50"
                          : "text-gray-300 hover:bg-zinc-800/80 hover:text-white bg-zinc-900/60"
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white flex-none ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* POPUP 3: QUỐC GIA */}
          {activeDropdown === "country" && (
            <div className="w-[calc(100vw-2rem)] sm:w-80 rounded-2xl bg-zinc-950/98 border border-zinc-700/80 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 mb-2 flex items-center justify-between">
                <span>Chọn quốc gia</span>
                {currentCountry && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("country", "")}
                    className="text-sky-400 hover:text-sky-300 text-[11px] normal-case font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              <div className="max-h-64 sm:max-h-72 overflow-y-auto grid grid-cols-2 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                <button
                  type="button"
                  onClick={() => updateQueryParam("country", "")}
                  className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                    !currentCountry
                      ? "bg-white/10 text-white font-bold"
                      : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span>Tất cả quốc gia</span>
                  {!currentCountry && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
                {filters.countries.map((c) => {
                  const isSelected = currentCountry === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => updateQueryParam("country", c.slug)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left truncate ${
                        isSelected
                          ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-950/50"
                          : "text-gray-300 hover:bg-zinc-800/80 hover:text-white bg-zinc-900/60"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white flex-none ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* POPUP 4: NĂM PHÁT HÀNH */}
          {activeDropdown === "year" && (
            <div className="w-[calc(100vw-2rem)] sm:w-80 rounded-2xl bg-zinc-950/98 border border-zinc-700/80 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 mb-2 flex items-center justify-between">
                <span>Chọn năm phát hành</span>
                {currentYear && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("year", "")}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] normal-case font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => updateQueryParam("year", "")}
                className={`w-full mb-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                  !currentYear
                    ? "bg-white/10 text-white font-bold"
                    : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                }`}
              >
                <span>Tất cả các năm</span>
                {!currentYear && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              <div className="max-h-60 overflow-y-auto grid grid-cols-4 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                {filters.years.map((y) => {
                  const isSelected = currentYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => updateQueryParam("year", y)}
                      className={`py-2 px-1 text-center rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50"
                          : "text-gray-300 hover:bg-zinc-800 hover:text-white bg-zinc-900/60"
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* POPUP 5: SẮP XẾP */}
          {activeDropdown === "sort" && (
            <div className="w-56 sm:w-60 rounded-2xl bg-zinc-950/98 border border-zinc-700/80 p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 mb-1">
                <span>Tiêu chí sắp xếp</span>
              </div>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = currentSort === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateQueryParam("sort", opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                        isSelected
                          ? "bg-netflix-red text-white font-bold shadow-md shadow-red-950/50"
                          : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : opt.color}`} />
                        <span>{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. ACTIVE FILTERS CHIP BAR (Chỉ hiển thị khi có ít nhất 1 filter active) */}
      {hasAnyFilter && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex-none flex items-center gap-1.5 text-gray-400 font-bold bg-white/5 px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap">
            <Filter className="w-3 h-3 text-netflix-red" />
            <span>Đang lọc:</span>
          </span>

          {/* Type tag */}
          {currentType && (
            <button
              type="button"
              onClick={() => handleClearKey("type")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-200 font-semibold hover:bg-purple-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc loại phim này"
            >
              <span>{activeTypeObj?.emoji} {activeTypeName}</span>
              <X className="w-3 h-3 text-purple-300 group-hover:text-white" />
            </button>
          )}

          {/* Category tag */}
          {currentCategory && (
            <button
              type="button"
              onClick={() => handleClearKey("category")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-200 font-semibold hover:bg-rose-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc thể loại này"
            >
              <span>{activeCategoryName}</span>
              <X className="w-3 h-3 text-rose-300 group-hover:text-white" />
            </button>
          )}

          {/* Country tag */}
          {currentCountry && (
            <button
              type="button"
              onClick={() => handleClearKey("country")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-sky-950/70 border border-sky-500/40 text-sky-200 font-semibold hover:bg-sky-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc quốc gia này"
            >
              <span>{activeCountryName}</span>
              <X className="w-3 h-3 text-sky-300 group-hover:text-white" />
            </button>
          )}

          {/* Year tag */}
          {currentYear && (
            <button
              type="button"
              onClick={() => handleClearKey("year")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 font-semibold hover:bg-emerald-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc năm này"
            >
              <span>Năm {currentYear}</span>
              <X className="w-3 h-3 text-emerald-300 group-hover:text-white" />
            </button>
          )}

          {/* Sort tag */}
          {currentSort && (
            <button
              type="button"
              onClick={() => handleClearKey("sort")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-200 font-semibold hover:bg-amber-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để đưa về sắp xếp mặc định"
            >
              <span>{activeSortName}</span>
              <X className="w-3 h-3 text-amber-300 group-hover:text-white" />
            </button>
          )}

          {/* Actor tag */}
          {currentActor && (
            <button
              type="button"
              onClick={() => handleClearKey("actor")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-200 font-semibold hover:bg-amber-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc diễn viên này"
            >
              <span>Diễn viên: {currentActor}</span>
              <X className="w-3 h-3 text-amber-300 group-hover:text-white" />
            </button>
          )}

          {/* Keyword tag */}
          {currentKeyword && !currentActor && (
            <button
              type="button"
              onClick={() => handleClearKey("keyword")}
              className="flex-none inline-flex items-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-200 font-semibold hover:bg-amber-900 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc từ khóa này"
            >
              <span>Từ khóa: &quot;{currentKeyword}&quot;</span>
              <X className="w-3 h-3 text-amber-300 group-hover:text-white" />
            </button>
          )}

          {/* Clear All button */}
          <button
            type="button"
            onClick={handleClearAll}
            className="flex-none ml-auto text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-semibold px-2 py-0.5 transition cursor-pointer"
          >
            <span>[Xóa bộ lọc]</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
