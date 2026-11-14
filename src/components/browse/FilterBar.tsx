"use client";

import React, { useEffect, useState, useRef, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movies/service";
import { Tooltip } from "@/components/ui/Tooltip";
import { getCanonicalGenreSlug, getCanonicalCountrySlug, isRawId } from "@/lib/movieMedia";
import { useBodyScrollLock } from "@/lib/scrollLock";
import {
  ChevronDown,
  X,
  RotateCcw,
  Filter,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

import {
  type FilterGroup,
  type MovieTypeOption,
  type SortOptionItem,
  MOVIE_TYPES,
  SORT_OPTIONS,
  SORT_FIELDS,
} from "./filterConstants";
import { FilterDropdownMenu } from "./FilterDropdownMenu";
import { FilterMobileDrawer } from "./FilterMobileDrawer";
import { SortDropdown } from "@/components/ui/SortDropdown";

export type { FilterGroup, MovieTypeOption, SortOptionItem };
export { MOVIE_TYPES, SORT_OPTIONS, SORT_FIELDS };

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
  const currentSort = optimisticParams.sort !== undefined ? (optimisticParams.sort || "latest") : (searchParams.get("sort") || "latest");
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

  const isCustomSort = Boolean(currentSort && currentSort !== "latest");
  const activeSortOption = SORT_OPTIONS.find((s) => s.value === currentSort);
  const activeSortName = isCustomSort ? (activeSortOption ? activeSortOption.label : "Sắp xếp") : "Sắp xếp";
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

    if (group === "year" && left + 320 > containerRect.width) {
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
      <div className="sm:hidden relative w-full rounded-2xl bg-zinc-900/75 backdrop-blur-md p-2 shadow-md shadow-black/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="flex-1 h-10 px-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-white flex items-center justify-between gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-netflix-red shrink-0" />
            <span className="font-bold text-xs truncate">Bộ lọc & Phân loại</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-netflix-red text-white text-[10px] font-black shrink-0">
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
              className="h-10 w-10 rounded-xl bg-netflix-red/10 hover:bg-netflix-red/20 text-netflix-red flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer"
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
      <div className="hidden sm:flex relative w-full rounded-2xl bg-zinc-900/60 backdrop-blur-md p-2 sm:p-2.5 shadow-lg shadow-black/40 items-center gap-2 sm:gap-3">
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
            <div className="sm:hidden flex-none flex items-center gap-1.5 pl-1 pr-2 border-r border-white/[0.08] text-white font-bold text-xs">
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentType
                  ? "bg-netflix-red/25 text-white shadow-md shadow-black/50"
                  : activeDropdown === "type"
                  ? "bg-zinc-800 text-white shadow-md shadow-black/40"
                  : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentType ? activeTypeName : "Loại phim"}
              </span>
              {isPending && pendingGroup === "type" ? (
                <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin flex-none" />
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentCategory
                  ? "bg-netflix-red/25 text-white shadow-md shadow-black/50"
                  : activeDropdown === "genre"
                  ? "bg-zinc-800 text-white shadow-md shadow-black/40"
                  : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentCountry
                  ? "bg-netflix-red/25 text-white shadow-md shadow-black/50"
                  : activeDropdown === "country"
                  ? "bg-zinc-800 text-white shadow-md shadow-black/40"
                  : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentCountry ? activeCountryName : "Quốc gia"}
              </span>
              {isPending && pendingGroup === "country" ? (
                <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin flex-none" />
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
              className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-none ${
                currentYear
                  ? "bg-netflix-red/25 text-white shadow-md shadow-black/50"
                  : activeDropdown === "year"
                  ? "bg-zinc-800 text-white shadow-md shadow-black/40"
                  : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              <span className="truncate max-w-[110px] sm:max-w-none">
                {currentYear ? currentYear : "Năm"}
              </span>
              {isPending && pendingGroup === "year" ? (
                <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin flex-none" />
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
                  className="h-10 px-3 sm:px-3.5 rounded-xl bg-netflix-red/10 text-netflix-red hover:text-white hover:bg-netflix-red/25 text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm flex-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95"
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

            {/* DROPDOWN 5: SẮP XẾP CHUẨN HÓA DÙNG CHUNG TOÀN HỆ THỐNG */}
            <div className="sm:ml-auto sm:pl-3 sm:border-l sm:border-white/10 flex items-center flex-none">
              <SortDropdown
                value={currentSort}
                onChange={(s) => updateQueryParam("sort", s)}
                options={SORT_OPTIONS}
                size="md"
                isPending={isPending && pendingGroup === "sort"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE DROPDOWN POPUP */}
      <FilterDropdownMenu
        activeDropdown={activeDropdown}
        dropdownOffset={dropdownOffset}
        currentType={currentType}
        currentCategory={currentCategory}
        currentCountry={currentCountry}
        currentYear={currentYear}
        filters={filters}
        updateQueryParam={updateQueryParam}
      />

      {/* 2. ACTIVE FILTERS CHIP BAR (Chỉ hiển thị khi có ít nhất 1 filter active) */}
      {hasAnyFilter && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex-none flex items-center gap-1 text-zinc-400 font-semibold bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap text-[11px]">
            <Filter className="w-3 h-3 text-netflix-red" />
            <span>Đang lọc:</span>
          </span>

          {/* Type tag */}
          {currentType && (
            <Tooltip content="Nhấn để bỏ lọc loại phim này" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("type")}
                aria-label="Nhấn để bỏ lọc loại phim này"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>{activeTypeName}</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Category tag */}
          {currentCategory && (
            <Tooltip content="Nhấn để bỏ lọc thể loại này" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("category")}
                aria-label="Nhấn để bỏ lọc thể loại này"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>{activeCategoryName}</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Country tag */}
          {currentCountry && (
            <Tooltip content="Nhấn để bỏ lọc quốc gia này" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("country")}
                aria-label="Nhấn để bỏ lọc quốc gia này"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>{activeCountryName}</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Year tag */}
          {currentYear && (
            <Tooltip content="Nhấn để bỏ lọc năm này" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("year")}
                aria-label="Nhấn để bỏ lọc năm này"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>Năm {currentYear}</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Sort tag */}
          {isCustomSort && (
            <Tooltip content="Nhấn để đưa về sắp xếp mặc định" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("sort")}
                aria-label="Nhấn để đưa về sắp xếp mặc định"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>{activeSortName}</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Actor tag */}
          {currentActor && (
            <Tooltip content="Nhấn để bỏ lọc diễn viên này" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("actor")}
                aria-label="Nhấn để bỏ lọc diễn viên này"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>Diễn viên: {currentActor}</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Keyword tag */}
          {currentKeyword && !currentActor && (
            <Tooltip content="Nhấn để bỏ lọc từ khóa này" side="top">
              <button
                type="button"
                onClick={() => handleClearKey("keyword")}
                aria-label="Nhấn để bỏ lọc từ khóa này"
                className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs whitespace-nowrap group"
              >
                <span>Từ khóa: &quot;{currentKeyword}&quot;</span>
                <X className="w-3 h-3 text-zinc-400 group-hover:text-white" />
              </button>
            </Tooltip>
          )}

          {/* Clear All button */}
          <button
            type="button"
            onClick={handleClearAll}
            aria-label="Xóa tất cả các bộ lọc đang chọn"
            className="flex-none ml-auto text-xs text-netflix-red hover:brightness-110 hover:underline flex items-center gap-1 font-semibold px-2.5 py-1.5 min-h-[36px] transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red/50 rounded-md"
          >
            <span>[Xóa bộ lọc]</span>
          </button>
        </div>
      )}

      {/* 3. MOBILE FILTER DRAWER */}
      <FilterMobileDrawer
        isOpen={isMobileDrawerOpen && isMounted}
        onClose={() => setIsMobileDrawerOpen(false)}
        filters={filters}
        draftType={draftType}
        setDraftType={setDraftType}
        draftCategory={draftCategory}
        setDraftCategory={setDraftCategory}
        draftCountry={draftCountry}
        setDraftCountry={setDraftCountry}
        draftYear={draftYear}
        setDraftYear={setDraftYear}
        draftSort={draftSort}
        setDraftSort={setDraftSort}
        onReset={handleResetMobileDraft}
        onApply={handleApplyMobileDrawer}
        draftActiveCount={draftActiveCount}
      />
    </div>
  );
};

export default FilterBar;
