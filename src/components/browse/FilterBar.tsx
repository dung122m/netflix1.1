"use client";

import React, { useEffect, useState, useRef, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/data/movies/taxonomy";
import { getCanonicalGenreSlug, getCanonicalCountrySlug, isRawId } from "@/lib/movieMedia";
import {
  ChevronDown,
  Loader2,
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

  const [filters] = useState<{
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

  // Dismiss desktop dropdown on outside click & Escape key (only listen when open)
  useEffect(() => {
    if (!activeDropdown) return;

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
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdown]);

  // Client-mount guard for createPortal
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track latest search params cumulatively to prevent race condition overwrites
  const latestParamsRef = useRef<URLSearchParams>(new URLSearchParams(searchParams.toString()));
  const debouncePushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dọn dẹp debounce timer khi unmount
  useEffect(() => {
    return () => {
      if (debouncePushTimerRef.current) {
        clearTimeout(debouncePushTimerRef.current);
      }
    };
  }, []);

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

    // 3. Thực hiện chuyển trang có Debounce 280ms: Gộp các thao tác click liên tiếp
    // thành 1 request RSC duy nhất, giảm 70% Serverless Invocations không cần thiết
    if (debouncePushTimerRef.current) {
      clearTimeout(debouncePushTimerRef.current);
    }

    debouncePushTimerRef.current = setTimeout(() => {
      startTransition(() => {
        const query = latestParamsRef.current.toString();
        router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
      });
    }, 280);
  }, [router]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    if (debouncePushTimerRef.current) {
      clearTimeout(debouncePushTimerRef.current);
    }

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
  // Scroll lock is managed exclusively inside FilterMobileDrawer via useBodyScrollLock(isOpen)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const closeMobileDrawer = useCallback(() => setIsMobileDrawerOpen(false), []);
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

  useEffect(() => {
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", updateDropdownPosition, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", updateDropdownPosition);
      }
    };
  }, [updateDropdownPosition]);

  return (
    <div ref={containerRef} className="w-full relative z-40 select-none">
      {/* 1A. MOBILE COMPACT TRIGGER BAR (< 640px) */}
      <div className="sm:hidden relative w-full flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="flex-1 h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white flex items-center justify-between gap-2 active:scale-[0.98] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-zinc-200 truncate">Bộ lọc & Phân loại</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-netflix-red text-white text-[10px] font-bold shrink-0">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClearAll}
            aria-label="Xóa tất cả bộ lọc"
            className="h-10 px-3 rounded-xl bg-zinc-900 hover:bg-netflix-red/15 text-netflix-red text-xs font-semibold flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer"
          >
            {isPending && pendingGroup === "all" ? (
              <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin" />
            ) : (
              <span>Đặt lại</span>
            )}
          </button>
        )}
      </div>

      {/* 1B. CLEAN DESKTOP FILTER BAR (DESKTOP >= 640px) - ZERO NESTED DOCK CONTAINER */}
      <div className="hidden sm:flex items-center justify-between gap-3 w-full">
        {/* FILTER BUTTONS ROW */}
        <div ref={scrollContainerRef} className="flex items-center gap-2 flex-wrap min-w-0">
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
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black shrink-0 ${currentType
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : activeDropdown === "type"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
          >
            <span className="truncate">
              {currentType ? activeTypeName : "Loại phim"}
            </span>
            {isPending && pendingGroup === "type" ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${activeDropdown === "type" ? "rotate-180 text-white" : "rotate-0"
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
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black shrink-0 ${currentCategory
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : activeDropdown === "genre"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
          >
            <span className="truncate">
              {currentCategory ? activeCategoryName : "Thể loại"}
            </span>
            {isPending && pendingGroup === "genre" ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${activeDropdown === "genre" ? "rotate-180 text-white" : "rotate-0"
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
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black shrink-0 ${currentCountry
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : activeDropdown === "country"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
          >
            <span className="truncate">
              {currentCountry ? activeCountryName : "Quốc gia"}
            </span>
            {isPending && pendingGroup === "country" ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${activeDropdown === "country" ? "rotate-180 text-white" : "rotate-0"
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
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black shrink-0 ${currentYear
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : activeDropdown === "year"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
          >
            <span className="truncate">
              {currentYear ? currentYear : "Năm"}
            </span>
            {isPending && pendingGroup === "year" ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${activeDropdown === "year" ? "rotate-180 text-white" : "rotate-0"
                  }`}
              />
            )}
          </button>

          {/* XÓA BỘ LỌC KHI CÓ BỘ LỌC ĐANG CHỌN */}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleClearAll}
              aria-label="Xóa tất cả các bộ lọc hiện tại"
              className="h-10 px-3.5 rounded-xl text-zinc-400 hover:text-netflix-red hover:bg-zinc-900 text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red active:scale-95"
            >
              {isPending && pendingGroup === "all" ? (
                <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin shrink-0" />
              ) : null}
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* DROPDOWN SẮP XẾP */}
        <div className="ml-auto flex items-center shrink-0 relative z-50">
          <SortDropdown
            value={currentSort}
            onChange={(s) => updateQueryParam("sort", s)}
            options={SORT_OPTIONS}
            size="md"
            menuAlign="right"
            isPending={isPending && pendingGroup === "sort"}
            onOpenChange={(open) => {
              if (open) setActiveDropdown(null);
            }}
          />
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

      {/* 3. MOBILE FILTER DRAWER */}
      <FilterMobileDrawer
        isOpen={isMobileDrawerOpen && isMounted}
        onClose={closeMobileDrawer}
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
