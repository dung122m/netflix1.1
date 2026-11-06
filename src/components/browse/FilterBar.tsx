"use client";

import React, { useEffect, useState, useRef, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movies/service";
import { Tooltip } from "@/components/ui/Tooltip";
import { getCanonicalGenreSlug, getCanonicalCountrySlug, isRawId } from "@/lib/movieMedia";
import { useBodyScrollLock } from "@/lib/scrollLock";
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
  Clock,
  Star,
  Flame,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

export type FilterGroup = "type" | "genre" | "country" | "year" | "sort";

interface MovieTypeOption {
  name: string;
  slug: string;
}

const MOVIE_TYPES: MovieTypeOption[] = [
  { name: "Phim Lẻ", slug: "phim-le" },
  { name: "Phim Bộ", slug: "phim-bo" },
  { name: "Chiếu Rạp", slug: "phim-chieu-rap" },
  { name: "Hoạt Hình", slug: "hoat-hinh" },
  { name: "TV Shows", slug: "tv-shows" },
  { name: "Sắp Chiếu", slug: "phim-sap-chieu" },
  { name: "Thuyết Minh", slug: "phim-thuyet-minh" },
  { name: "Lồng Tiếng", slug: "phim-long-tieng" },
];

const SORT_OPTIONS = [
  { label: "Mới cập nhật", value: "latest", icon: Clock, color: "text-sky-400" },
  { label: "Điểm đánh giá cao", value: "rating", icon: Star, color: "text-amber-400" },
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

  // Client-mount guard for createPortal
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track latest search params cumulatively to prevent race condition overwrites
  const latestParamsRef = useRef<URLSearchParams>(new URLSearchParams(searchParams.toString()));

  // When searchParams updates, sync ref, reset optimistic state and pending group
  useEffect(() => {
    latestParamsRef.current = new URLSearchParams(searchParams.toString());
    setOptimisticParams({});
    setPendingGroup(null);
  }, [searchParams]);

  // Current active values with optimistic instant feedback
  const currentType = optimisticParams.type !== undefined ? optimisticParams.type : (searchParams.get("type") || "");
  const rawCat = optimisticParams.category !== undefined ? optimisticParams.category : (searchParams.get("category") || "");
  const currentCategory = (rawCat ? getCanonicalGenreSlug(null, rawCat) : "") || (rawCat && !isRawId(rawCat) ? rawCat : "");

  const rawCtry = optimisticParams.country !== undefined ? optimisticParams.country : (searchParams.get("country") || "");
  const currentCountry = (rawCtry ? getCanonicalCountrySlug(null, rawCtry) : "") || (rawCtry && !isRawId(rawCtry) ? rawCtry : "");
  const currentYear = optimisticParams.year !== undefined ? optimisticParams.year : (searchParams.get("year") || "");
  const currentSort = optimisticParams.sort !== undefined ? optimisticParams.sort : (searchParams.get("sort") || "latest");
  const currentActor = searchParams.get("actor") || "";
  const currentKeyword = searchParams.get("keyword") || "";

  // Query parameter updating helper with immediate transition & loading events
  const updateQueryParam = useCallback((key: string, value: string) => {
    const groupKey = (key === "type" ? "type" : key === "category" ? "genre" : key === "country" ? "country" : key === "year" ? "year" : key === "sort" ? "sort" : null) as FilterGroup | null;
    
    const params = new URLSearchParams(latestParamsRef.current.toString());
    const currentValue = params.get(key) || "";
    const isTogglingOff = !value || currentValue === value;
    const nextValue = isTogglingOff ? "" : value;

    // 1. Cập nhật nhãn và trạng thái active ngay lập tức (0ms)
    setOptimisticParams((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
    if (groupKey) {
      setPendingGroup(groupKey);
    }
    setActiveDropdown(null);

    // 2. Kích hoạt thanh tiến trình đỏ đỉnh trang (Top Progress Bar)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:loading-start"));
    }

    if (key === "sort") {
      if (nextValue === "latest" || !nextValue) {
        params.delete("sort");
      } else {
        params.set("sort", nextValue);
      }
    } else if (!nextValue) {
      params.delete(key);
    } else {
      params.set(key, nextValue);
    }
    params.delete("page");

    // Lưu vào ref ngay lập tức để các thao tác liên tiếp không bị ghi đè query
    latestParamsRef.current = params;
    const query = params.toString();

    // 3. Thực hiện chuyển trang không chặn UI bằng useTransition
    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [router]);

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

    const params = new URLSearchParams(latestParamsRef.current.toString());
    params.delete(key);
    params.delete("page");
    latestParamsRef.current = params;
    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [router]);

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

    const params = new URLSearchParams(latestParamsRef.current.toString());
    params.delete("type");
    params.delete("category");
    params.delete("country");
    params.delete("year");
    params.delete("sort");
    params.delete("actor");
    params.delete("keyword");
    params.delete("page");
    latestParamsRef.current = params;
    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [router]);

  // Resolved display labels
  const activeTypeObj = MOVIE_TYPES.find((t) => t.slug === currentType);
  const activeTypeName = activeTypeObj ? activeTypeObj.name : "Loại phim";

  const activeCategoryObj = filters.genres.find((g) => g.slug === currentCategory);
  const activeCategoryName = activeCategoryObj ? activeCategoryObj.name : "Thể loại";

  const activeCountryObj = filters.countries.find((c) => c.slug === currentCountry);
  const activeCountryName = activeCountryObj ? activeCountryObj.name : "Quốc gia";

  const activeSortObj = SORT_OPTIONS.find((s) => s.value === currentSort);
  const activeSortName = activeSortObj ? activeSortObj.label : "Mới cập nhật";

  // Count active filters for badge
  const isCustomSort = Boolean(currentSort && currentSort !== "latest");
  const activeFiltersCount = [
    Boolean(currentType),
    Boolean(currentCategory),
    Boolean(currentCountry),
    Boolean(currentYear),
    isCustomSort,
    Boolean(currentActor || currentKeyword),
  ].filter(Boolean).length;

  const hasAnyFilter = activeFiltersCount > 0;

  // Mobile Filter Drawer State & Draft (< 640px)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  useBodyScrollLock(isMobileDrawerOpen);
  const [draftType, setDraftType] = useState(currentType);
  const [draftCategory, setDraftCategory] = useState(currentCategory);
  const [draftCountry, setDraftCountry] = useState(currentCountry);
  const [draftYear, setDraftYear] = useState(currentYear);
  const [draftSort, setDraftSort] = useState(currentSort);

  const openMobileDrawer = useCallback(() => {
    setDraftType(currentType);
    setDraftCategory(currentCategory);
    setDraftCountry(currentCountry);
    setDraftYear(currentYear);
    setDraftSort(currentSort || "latest");
    setIsMobileDrawerOpen(true);
  }, [currentType, currentCategory, currentCountry, currentYear, currentSort]);

  const handleResetMobileDraft = useCallback(() => {
    setDraftType("");
    setDraftCategory("");
    setDraftCountry("");
    setDraftYear("");
    setDraftSort("latest");
  }, []);

  const handleApplyMobileDrawer = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:loading-start"));
    }

    const params = new URLSearchParams(latestParamsRef.current.toString());

    if (draftType) params.set("type", draftType);
    else params.delete("type");

    if (draftCategory) params.set("category", draftCategory);
    else params.delete("category");

    if (draftCountry) params.set("country", draftCountry);
    else params.delete("country");

    if (draftYear) params.set("year", draftYear);
    else params.delete("year");

    if (draftSort && draftSort !== "latest") {
      params.set("sort", draftSort);
    } else {
      params.delete("sort");
    }

    params.delete("page");
    latestParamsRef.current = params;
    const query = params.toString();

    setIsMobileDrawerOpen(false);

    startTransition(() => {
      router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
    });
  }, [draftType, draftCategory, draftCountry, draftYear, draftSort, router]);

  const draftActiveCount = [
    Boolean(draftType),
    Boolean(draftCategory),
    Boolean(draftCountry),
    Boolean(draftYear),
    Boolean(draftSort && draftSort !== "latest"),
  ].filter(Boolean).length;

  useEffect(() => {
    if (isMobileDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileDrawerOpen]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key in FilterGroup]?: HTMLButtonElement | null }>({});
  const [dropdownOffset, setDropdownOffset] = useState<{ left?: number; right?: number; top?: number }>({});

  const computePosition = useCallback((group: FilterGroup) => {
    if (!containerRef.current) return null;
    const btn = buttonRefs.current[group];
    if (!btn) return null;

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    // Neo mép trên popup chính xác cách mép dưới của nút bấm đúng 8px
    const top = Math.round(btnRect.bottom - containerRect.top + 8);

    // On mobile, wide grid dropdowns (genre, country, year) align to container edge
    if (isMobile && (group === "genre" || group === "country" || group === "year")) {
      return { left: 0, right: undefined, top };
    }

    const left = Math.round(btnRect.left - containerRect.left);

    if (group === "sort") {
      const right = Math.round(containerRect.right - btnRect.right);
      return { right: Math.max(0, right), left: undefined, top };
    } else if (group === "year" && left + 320 > containerRect.width) {
      const right = Math.round(containerRect.right - btnRect.right);
      return { right: Math.max(0, right), left: undefined, top };
    } else {
      const maxDropdownWidth = (group === "genre" || group === "country") ? 384 : 240;
      const maxLeft = Math.max(0, containerRect.width - maxDropdownWidth);
      return { left: Math.max(0, Math.min(left, maxLeft)), right: undefined, top };
    }
  }, []);

  const toggleDropdown = (group: FilterGroup) => {
    setActiveDropdown((prev) => {
      if (prev === group) return null;
      const pos = computePosition(group);
      if (pos) {
        setDropdownOffset(pos);
      }
      return group;
    });
  };

  const updateDropdownPosition = useCallback(() => {
    if (!activeDropdown) return;
    const pos = computePosition(activeDropdown);
    if (pos) {
      setDropdownOffset(pos);
    }
  }, [activeDropdown, computePosition]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkFilterScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 3);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 3);
  }, []);

  useEffect(() => {
    updateDropdownPosition();
    checkFilterScroll();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("resize", checkFilterScroll);
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", updateDropdownPosition, { passive: true });
      scrollEl.addEventListener("scroll", checkFilterScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("resize", checkFilterScroll);
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", updateDropdownPosition);
        scrollEl.removeEventListener("scroll", checkFilterScroll);
      }
    };
  }, [updateDropdownPosition, checkFilterScroll]);

  return (
    <div ref={containerRef} className="w-full relative z-40 select-none">
      {/* 1A. MOBILE COMPACT TRIGGER BAR (< 640px) */}
      <div className="sm:hidden relative w-full rounded-2xl bg-zinc-900/70 backdrop-blur-md p-2 border border-white/[0.08] shadow-md shadow-black/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="flex-1 h-10 px-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-white flex items-center justify-between gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-netflix-red shrink-0" />
            <span className="font-bold text-xs truncate">Bộ lọc & Phân loại</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-netflix-red text-white text-[10px] font-black shrink-0">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        {hasAnyFilter && (
          <Tooltip content="Xóa tất cả bộ lọc" side="bottom">
            <button
              type="button"
              onClick={handleClearAll}
              aria-label="Xóa tất cả bộ lọc"
              className="h-10 w-10 rounded-xl border border-dashed text-netflix-red hover:bg-netflix-red/15 flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer"
            >
            {isPending && pendingGroup === "all" ? (
              <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-netflix-red" />
            )}
            </button>
          </Tooltip>
        )}
      </div>

      {/* 1B. CINEMATIC DOCK CONTAINER (DESKTOP >= 640px) */}
      <div className="hidden sm:flex relative w-full rounded-2xl bg-zinc-900/50 backdrop-blur-md p-2 sm:p-2.5 border border-white/[0.08] shadow-lg shadow-black/40 items-center gap-2 sm:gap-3">
        {/* LEFT LABEL: ICON + TEXT (DESKTOP / TABLET) */}
        <div className="flex-none hidden sm:flex items-center gap-2 pl-2 pr-2.5 border-r border-white/10 text-white font-bold text-xs sm:text-sm tracking-tight">
          <SlidersHorizontal className="w-4 h-4 text-netflix-red flex-none" />
          <span className="whitespace-nowrap">Bộ lọc nhanh</span>
        </div>

        {/* SCROLLABLE FILTER BUTTONS WRAPPER */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {/* MOBILE SUBTLE GRADIENT FADE AFFORDANCE */}
          {canScrollLeft && (
            <div
              className="sm:hidden absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none z-10 transition-opacity duration-200"
              aria-hidden="true"
            />
          )}
          {canScrollRight && (
            <div
              className="sm:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none z-10 transition-opacity duration-200"
              aria-hidden="true"
            />
          )}

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 flex-nowrap sm:flex-wrap"
          >
            {/* MOBILE ONLY COMPACT LABEL */}
            <div className="sm:hidden flex-none flex items-center gap-1.5 pl-1 pr-2 border-r text-white font-bold text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-netflix-red flex-none" />
              <span className="whitespace-nowrap">Bộ lọc</span>
            </div>

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
              className={`h-10 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentType
                  ? "bg-netflix-red/20 border-netflix-red/60 text-white shadow-md shadow-black/50"
                  : activeDropdown === "type"
                  ? "bg-zinc-800 text-white border-zinc-500"
                  : "bg-white/[0.04] text-zinc-300 border-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]"
              }`}
            >
              <Film className={`w-3.5 h-3.5 flex-none ${currentType ? "text-purple-400" : "text-purple-400/80"}`} />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentType ? activeTypeName : "Loại phim"}
              </span>
              {isPending && pendingGroup === "type" ? (
                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-none" />
              ) : (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-none ${
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentCategory
                  ? "bg-netflix-red/20 border-netflix-red/60 text-white shadow-md shadow-black/50"
                  : activeDropdown === "genre"
                  ? "bg-zinc-800 text-white border-zinc-500"
                  : "bg-white/[0.04] text-zinc-300 border-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 flex-none ${currentCategory ? "text-rose-400" : "text-amber-400/90"}`} />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentCategory ? activeCategoryName : "Thể loại"}
              </span>
              {isPending && pendingGroup === "genre" ? (
                <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin flex-none" />
              ) : (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-none ${
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentCountry
                  ? "bg-netflix-red/20 border-netflix-red/60 text-white shadow-md shadow-black/50"
                  : activeDropdown === "country"
                  ? "bg-zinc-800 text-white border-zinc-500"
                  : "bg-white/[0.04] text-zinc-300 border-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]"
              }`}
            >
              <Globe2 className={`w-3.5 h-3.5 flex-none ${currentCountry ? "text-sky-400" : "text-sky-400/80"}`} />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentCountry ? activeCountryName : "Quốc gia"}
              </span>
              {isPending && pendingGroup === "country" ? (
                <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin flex-none" />
              ) : (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-none ${
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentYear
                  ? "bg-netflix-red/20 border-netflix-red/60 text-white shadow-md shadow-black/50"
                  : activeDropdown === "year"
                  ? "bg-zinc-800 text-white border-zinc-500"
                  : "bg-white/[0.04] text-zinc-300 border-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]"
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 flex-none ${currentYear ? "text-emerald-400" : "text-emerald-400/80"}`} />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentYear ? currentYear : "Năm"}
              </span>
              {isPending && pendingGroup === "year" ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin flex-none" />
              ) : (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-none ${
                    activeDropdown === "year" ? "rotate-180 text-white" : "rotate-0"
                  }`}
                />
              )}
            </button>

            {/* XÓA NHANH TOÀN BỘ BỘ LỌC KHI CÓ FILTER */}
            {hasAnyFilter && (
              <Tooltip content="Xóa tất cả các bộ lọc hiện tại" side="bottom">
                <button
                  type="button"
                  onClick={handleClearAll}
                  aria-label="Xóa tất cả các bộ lọc hiện tại"
                  className="h-10 px-3 sm:px-3.5 rounded-xl border border-dashed hover:border-netflix-red text-netflix-red hover:text-white hover:bg-netflix-red/20 text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm flex-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95"
                >
                {isPending && pendingGroup === "all" ? (
                  <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin flex-none" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-netflix-red flex-none" />
                )}
                <span className="hidden sm:inline">Đặt lại</span>
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* 2. ACTIVE DROPDOWN POPUP (Neo chính xác 8px dưới từng nút bấm được chọn - CHỈ TRÊN DESKTOP) */}
      {activeDropdown && (
        <div
          className="hidden sm:block absolute z-50 transition-all duration-150"
          style={{
            top: dropdownOffset.top !== undefined ? `${dropdownOffset.top}px` : undefined,
            left: dropdownOffset.left !== undefined ? `${dropdownOffset.left}px` : undefined,
            right: dropdownOffset.right !== undefined ? `${dropdownOffset.right}px` : undefined,
          }}
        >
          {/* POPUP 1: LOẠI PHIM */}
          {activeDropdown === "type" && (
            <div className="w-56 sm:w-60 rounded-2xl bg-zinc-950/98 border border-zinc-700/80 p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b mb-2 flex items-center justify-between">
                <span>Chọn loại phim</span>
                {currentType && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("type", "")}
                    className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
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
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span>Tất cả loại phim</span>
                  {!currentType && <Check className="w-3.5 h-3.5 text-netflix-red" />}
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
                          ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                      }`}
                    >
                      <span>{t.name}</span>
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
              <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b mb-2 flex items-center justify-between">
                <span>Chọn thể loại</span>
                {currentCategory && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("category", "")}
                    className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>

              <div className="max-h-64 sm:max-h-72 overflow-y-auto grid grid-cols-2 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                <button
                  type="button"
                  onClick={() => updateQueryParam("category", "")}
                  className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                    !currentCategory
                      ? "bg-white/10 text-white font-bold"
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span>Tất cả thể loại</span>
                  {!currentCategory && <Check className="w-3.5 h-3.5 text-netflix-red" />}
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
                          ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white bg-zinc-900/60"
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
              <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b mb-2 flex items-center justify-between">
                <span>Chọn quốc gia</span>
                {currentCountry && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("country", "")}
                    className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
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
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span>Tất cả quốc gia</span>
                  {!currentCountry && <Check className="w-3.5 h-3.5 text-netflix-red" />}
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
                          ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white bg-zinc-900/60"
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
              <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b mb-2 flex items-center justify-between">
                <span>Chọn năm phát hành</span>
                {currentYear && (
                  <button
                    type="button"
                    onClick={() => updateQueryParam("year", "")}
                    className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
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
                    : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                }`}
              >
                <span>Tất cả các năm</span>
                {!currentYear && <Check className="w-3.5 h-3.5 text-netflix-red" />}
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
                          ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                          : "text-zinc-300 hover:bg-zinc-800 hover:text-white bg-zinc-900/60"
                      }`}
                    >
                      {y}
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
        <div className="mt-2.5 pt-2 border-t flex items-center gap-1.5 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex-none flex items-center gap-1 text-zinc-400 font-semibold bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap text-[11px]">
            <Filter className="w-3 h-3 text-netflix-red" />
            <span>Đang lọc:</span>
          </span>

          {/* Type tag */}
          {currentType && (
            <button
              type="button"
              onClick={() => handleClearKey("type")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc loại phim này"
            >
              <span>{activeTypeName}</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Category tag */}
          {currentCategory && (
            <button
              type="button"
              onClick={() => handleClearKey("category")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc thể loại này"
            >
              <span>{activeCategoryName}</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Country tag */}
          {currentCountry && (
            <button
              type="button"
              onClick={() => handleClearKey("country")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc quốc gia này"
            >
              <span>{activeCountryName}</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Year tag */}
          {currentYear && (
            <button
              type="button"
              onClick={() => handleClearKey("year")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc năm này"
            >
              <span>Năm {currentYear}</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Sort tag */}
          {isCustomSort && (
            <button
              type="button"
              onClick={() => handleClearKey("sort")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để đưa về sắp xếp mặc định"
            >
              <span>{activeSortName}</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Actor tag */}
          {currentActor && (
            <button
              type="button"
              onClick={() => handleClearKey("actor")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc diễn viên này"
            >
              <span>Diễn viên: {currentActor}</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Keyword tag */}
          {currentKeyword && !currentActor && (
            <button
              type="button"
              onClick={() => handleClearKey("keyword")}
              className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover: text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              title="Nhấn để bỏ lọc từ khóa này"
            >
              <span>Từ khóa: &quot;{currentKeyword}&quot;</span>
              <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* Clear All button */}
          <button
            type="button"
            onClick={handleClearAll}
            aria-label="Xóa tất cả các bộ lọc đang chọn"
            className="flex-none ml-auto text-xs text-netflix-red hover:brightness-110 hover:underline flex items-center gap-1 font-semibold px-2.5 py-1 min-h-[32px] transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red/50 rounded-md"
          >
            <span>[Xóa bộ lọc]</span>
          </button>
        </div>
      )}

      {/* 3. MOBILE FILTER DRAWER (BOTTOM SHEET - HIỂN THỊ TRÊN MOBILE < 640px) */}
      {isMobileDrawerOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[100000] sm:hidden select-none">
          {/* Lớp nền mờ tối (Backdrop Overlay) */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Bảng điều khiển Bottom Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bảng điều khiển bộ lọc phim"
            className="fixed inset-x-0 bottom-0 z-[100001] max-h-[85vh] max-h-[85dvh] flex flex-col rounded-t-3xl bg-zinc-950 border-t shadow-[0_-16px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-200"
          >
            {/* Thanh nắm kéo (Grab Handle) */}
            <div className="w-12 h-1.5 rounded-full bg-zinc-700/80 mx-auto my-2.5 shrink-0" />

            {/* Tiêu đề Bottom Sheet */}
            <div className="px-4 py-2 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-netflix-red shrink-0" />
                <h3 className="text-base font-bold text-white">Bộ Lọc Phim</h3>
                {draftActiveCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-netflix-red/20 text-netflix-red border border-netflix-red/30 text-xs font-bold">
                    {draftActiveCount} đang chọn
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                aria-label="Đóng bảng bộ lọc"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Danh sách các nhóm bộ lọc có thể cuộn (min-h-0 bảo đảm footer không bị đẩy tràn màn hình) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain">
              {/* NHÓM 1: SẮP XẾP */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                  Sắp xếp theo
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = draftSort === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftSort(opt.value)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer text-left ${
                          isSelected
                            ? "bg-netflix-red/20 border-netflix-red/60 text-white "
                            : "bg-zinc-900/90  text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${opt.color}`} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NHÓM 2: LOẠI PHIM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    Loại phim
                  </span>
                  {draftType && (
                    <button
                      type="button"
                      onClick={() => setDraftType("")}
                      className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraftType("")}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      !draftType
                        ? "bg-netflix-red text-white font-bold border-netflix-red/50"
                        : "bg-zinc-900/90  text-zinc-300"
                    }`}
                  >
                    Tất cả
                  </button>
                  {MOVIE_TYPES.map((t) => {
                    const isSelected = draftType === t.slug;
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => setDraftType(isSelected ? "" : t.slug)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-netflix-red text-white font-bold border-netflix-red/50 shadow-sm"
                            : "bg-zinc-900/90  text-zinc-300"
                        }`}
                      >
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NHÓM 3: THỂ LOẠI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
                    Thể loại
                  </span>
                  {draftCategory && (
                    <button
                      type="button"
                      onClick={() => setDraftCategory("")}
                      className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraftCategory("")}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      !draftCategory
                        ? "bg-netflix-red text-white font-bold border-netflix-red/50"
                        : "bg-zinc-900/90  text-zinc-300"
                    }`}
                  >
                    Tất cả
                  </button>
                  {filters.genres.map((g) => {
                    const isSelected = draftCategory === g.slug;
                    return (
                      <button
                        key={g.slug}
                        type="button"
                        onClick={() => setDraftCategory(isSelected ? "" : g.slug)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-netflix-red text-white font-bold border-netflix-red/50 shadow-sm"
                            : "bg-zinc-900/90  text-zinc-300"
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NHÓM 4: QUỐC GIA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                    Quốc gia
                  </span>
                  {draftCountry && (
                    <button
                      type="button"
                      onClick={() => setDraftCountry("")}
                      className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraftCountry("")}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      !draftCountry
                        ? "bg-netflix-red text-white font-bold border-netflix-red/50"
                        : "bg-zinc-900/90  text-zinc-300"
                    }`}
                  >
                    Tất cả
                  </button>
                  {filters.countries.map((c) => {
                    const isSelected = draftCountry === c.slug;
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => setDraftCountry(isSelected ? "" : c.slug)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-netflix-red text-white font-bold border-netflix-red/50 shadow-sm"
                            : "bg-zinc-900/90  text-zinc-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NHÓM 5: NĂM PHÁT HÀNH */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Năm phát hành</span>
                  </span>
                  {draftYear && (
                    <button
                      type="button"
                      onClick={() => setDraftYear("")}
                      className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>

                {/* Nút Tất cả các năm to rõ, nằm riêng ở trên */}
                <button
                  type="button"
                  onClick={() => setDraftYear("")}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-between ${
                    !draftYear
                      ? "bg-netflix-red text-white font-bold border-netflix-red/50 shadow-md shadow-black/50"
                      : "bg-zinc-900/90  text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>Tất cả các năm</span>
                  {!draftYear && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* Lưới 4 cột đối xứng tuyệt đối (đúng 6 hàng x 4 năm = 24 năm, thẳng tắp không lượn sóng) */}
                <div className="grid grid-cols-4 gap-1.5">
                  {filters.years.slice(0, 24).map((y) => {
                    const isSelected = draftYear === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setDraftYear(isSelected ? "" : y)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-netflix-red text-white font-bold border-netflix-red/50 shadow-md shadow-black/50"
                            : "bg-zinc-900/90  text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chân Bottom Sheet dính cố định (Sticky Footer - Không bao giờ bị che khuất) */}
            <div className="px-4 py-3 border-t bg-zinc-950/98 backdrop-blur-md flex items-center gap-3 shrink-0 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+12px))] shadow-[0_-8px_20px_rgba(0,0,0,0.6)]">
              <button
                type="button"
                onClick={handleResetMobileDraft}
                className="h-12 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={handleApplyMobileDrawer}
                className="flex-1 h-12 rounded-xl bg-netflix-red hover:brightness-110 text-white font-bold text-sm shadow-md shadow-black/50 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <span>Áp dụng bộ lọc</span>
                {draftActiveCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-black/25 text-white text-xs font-extrabold">
                    ({draftActiveCount})
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FilterBar;
