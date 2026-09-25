"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, X, History, ArrowLeft } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toOptimizedPhimimgUrl } from "@/lib/movieMedia";
import { useAuth } from "@/context/AuthContext";
import { trackSearchKeyword } from "@/lib/analyticsClient";

export interface SearchSuggestion {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
}

interface NavSearchBarProps {
  isSearchExpanded: boolean;
  setIsSearchExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMobileSearch?: () => void;
}

export const NavSearchBar: React.FC<NavSearchBarProps> = React.memo(function NavSearchBar({
  isSearchExpanded,
  setIsSearchExpanded,
  onOpenMobileSearch,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlKeyword = searchParams.get("keyword") || "";
  const { user } = useAuth();

  const [hasText, setHasText] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const lastTrackedKeywordRef = useRef<{ kw: string; timestamp: number }>({ kw: "", timestamp: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const trackSearchOnce = useCallback((kw: string) => {
    const clean = kw.trim();
    if (!clean || clean.length < 2) return;
    const now = Date.now();
    if (
      lastTrackedKeywordRef.current.kw.toLowerCase() === clean.toLowerCase() &&
      now - lastTrackedKeywordRef.current.timestamp < 3000
    ) {
      return; // Deduplicate within 3 seconds for the same keyword
    }
    lastTrackedKeywordRef.current = { kw: clean, timestamp: now };
    trackSearchKeyword(clean, user?.uid);
  }, [user?.uid]);

  const isSearchOpen = isSearchExpanded;
  const hasSearchText = hasText;
  const hasDropdownContent = (!hasSearchText && recentSearches.length > 0) || (hasSearchText && suggestions.length > 0);

  // Debounced search fetcher (500ms để giảm tải Cloudflare KV writes)
  const [debouncedFetchSuggestions, cancelDebouncedFetch] = useDebounce(
    async (val: string) => {
      // Abort previous in-flight request to prevent race condition
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/search-suggest?keyword=${encodeURIComponent(val.trim())}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        // Verify that the response still matches current input value
        const currentInputVal = (inputRef.current?.value || mobileInputRef.current?.value || "").trim();
        if (currentInputVal.toLowerCase() === val.trim().toLowerCase()) {
          setSuggestions(data.items || []);
          setShowDropdown(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore AbortError silently
        }
        console.error("Lỗi gợi ý tìm kiếm:", err);
        setSuggestions([]);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsSearching(false);
        }
      }
    },
    500
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nanaflix_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  }, []);

  useEffect(() => () => {
    cancelDebouncedFetch();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [cancelDebouncedFetch]);

  // Sync keyword from URL
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = urlKeyword;
    if (mobileInputRef.current) mobileInputRef.current.value = urlKeyword;
    setHasText(Boolean(urlKeyword));
    if (urlKeyword && typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsSearchExpanded(true);
    }
  }, [urlKeyword, setIsSearchExpanded]);

  // Close dropdown and collapse search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const insideDesktopSearch = searchContainerRef.current?.contains(e.target as Node);
      const insideMobileSearch = mobileSearchRef.current?.contains(e.target as Node);
      if (!insideDesktopSearch && !insideMobileSearch) {
        setShowDropdown(false);
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsSearchExpanded]);

  const isSearchExpandedRef = useRef(isSearchExpanded);
  isSearchExpandedRef.current = isSearchExpanded;
  const onOpenMobileSearchRef = useRef(onOpenMobileSearch);
  onOpenMobileSearchRef.current = onOpenMobileSearch;

  // Global hotkey Ctrl+K, / to open search, and Escape to close (đăng ký 1 lần duy nhất trên window)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchExpandedRef.current) {
        setShowDropdown(false);
        setIsSearchExpanded(false);
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
        return;
      }

      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (
        (e.ctrlKey && (e.key === "k" || e.key === "K")) ||
        (e.key === "/" && !isInput)
      ) {
        e.preventDefault();
        onOpenMobileSearchRef.current?.();
        setIsSearchExpanded(true);
        setTimeout(() => {
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            mobileInputRef.current?.focus();
            mobileInputRef.current?.select();
          } else {
            inputRef.current?.focus();
            inputRef.current?.select();
          }
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSearchExpanded]);

  const saveRecentSearch = (kw: string) => {
    const clean = kw.trim();
    if (!clean) return;
    try {
      const current = recentSearches.filter(
        (s) => s.toLowerCase() !== clean.toLowerCase()
      );
      const updated = [clean, ...current].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem("nanaflix_recent_searches", JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = (kw: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== kw);
      setRecentSearches(updated);
      localStorage.setItem("nanaflix_recent_searches", JSON.stringify(updated));
    } catch {}
  };

  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRecentSearches([]);
      localStorage.removeItem("nanaflix_recent_searches");
    } catch {}
  };

  const handleRecentClick = (kw: string) => {
    if (inputRef.current) inputRef.current.value = kw;
    if (mobileInputRef.current) mobileInputRef.current.value = kw;
    setHasText(true);
    setShowDropdown(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSearchExpanded(false);
    }
    saveRecentSearch(kw);
    trackSearchOnce(kw);
    router.push(`/browse?keyword=${encodeURIComponent(kw)}`);
  };

  const toggleSearch = () => {
    if (!isSearchExpanded) {
      onOpenMobileSearch?.();
      setIsSearchExpanded(true);
      setShowDropdown(true);
      setTimeout(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          mobileInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 100);
    } else {
      setIsSearchExpanded(false);
      setShowDropdown(false);
    }
  };

  const clearSearch = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    cancelDebouncedFetch();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (inputRef.current) inputRef.current.value = "";
    if (mobileInputRef.current) mobileInputRef.current.value = "";
    setHasText(false);
    setSuggestions([]);
    setIsSearching(false);
    setShowDropdown(true);
    setSelectedSuggestionIndex(-1);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      mobileInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }

    if (urlKeyword) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("keyword");
      params.delete("page");
      const query = params.toString();
      router.push(query ? `/browse?${query}` : "/browse");
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const hasVal = val.length > 0;
    setHasText(hasVal);

    if (val.trim().length >= 3) {
      setIsSearching(true);
      debouncedFetchSuggestions(val);
    } else {
      cancelDebouncedFetch();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setSuggestions([]);
      setIsSearching(false);
      setShowDropdown(true);
    }
  }, [debouncedFetchSuggestions, cancelDebouncedFetch]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      setIsSearchExpanded(false);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      return;
    }

    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (recentSearches.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev < recentSearches.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (recentSearches.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : recentSearches.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (suggestions.length > 0 && selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[selectedSuggestionIndex];
        const val = (inputRef.current?.value || mobileInputRef.current?.value || "").trim();
        if (val) {
          saveRecentSearch(val);
          trackSearchOnce(val);
        }
        setShowDropdown(false);
        setIsSearchExpanded(false);
        router.push(
          selected.slug.startsWith("browse?")
            ? `/browse?${selected.slug.slice(7)}`
            : selected.slug.startsWith("?")
            ? `/browse${selected.slug}`
            : `/movies/${selected.slug}`
        );
      } else if (!hasSearchText && recentSearches.length > 0 && selectedSuggestionIndex >= 0 && selectedSuggestionIndex < recentSearches.length) {
        e.preventDefault();
        const selected = recentSearches[selectedSuggestionIndex];
        handleRecentClick(selected);
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSearchExpanded(false);
    }
    const currentKeyword = (inputRef.current?.value || mobileInputRef.current?.value || "").trim();

    if (currentKeyword) {
      saveRecentSearch(currentKeyword);
      trackSearchOnce(currentKeyword);
      router.push(`/browse?keyword=${encodeURIComponent(currentKeyword)}`);
    } else {
      router.push("/browse");
    }
  };

  return (
    <>
      {/* FULL-WIDTH MOBILE SEARCH OVERLAY */}
      {isSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden absolute inset-0 bg-black/98 px-2.5 sm:px-4 py-2 flex items-center gap-2 z-50 animate-in fade-in duration-150 border-b border-white/20 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => {
              setIsSearchExpanded(false);
              setShowDropdown(false);
            }}
            aria-label="Đóng tìm kiếm"
            className="p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex items-center bg-zinc-900/90 border border-white/25 rounded-full px-3 py-1.5 shadow-inner min-w-0"
          >
            <button
              type="submit"
              aria-label="Tìm kiếm"
              title="Tìm kiếm ngay"
              className="text-gray-300 hover:text-white mr-2 flex-shrink-0 cursor-pointer"
            >
              <Search size={16} />
            </button>

            <input
              ref={mobileInputRef}
              type="text"
              placeholder="Tìm phim, diễn viên, anime..."
              onChange={(e) => {
                handleInputChange(e);
                if (inputRef.current) inputRef.current.value = e.target.value;
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => {
                setShowDropdown(true);
              }}
              className="w-full bg-transparent text-white text-xs sm:text-sm outline-none placeholder:text-gray-400 min-w-0"
            />

            <div className="flex items-center gap-1 ml-1 flex-shrink-0">
              {isSearching && (
                <Loader2 size={14} className="animate-spin text-netflix-red" />
              )}
              {hasSearchText && (
                <>
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Xóa nội dung tìm kiếm"
                    className="p-1 text-gray-400 hover:text-white transition cursor-pointer rounded-full hover:bg-white/10"
                    title="Xóa nội dung"
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="submit"
                    aria-label="Tìm kiếm ngay"
                    title="Tìm kiếm ngay"
                    className="p-1.5 bg-netflix-red hover:bg-red-700 text-white rounded-full flex-shrink-0 cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center ml-0.5"
                  >
                    <Search size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          </form>

          {/* MOBILE SEARCH DROPDOWN */}
          {showDropdown && hasDropdownContent && (
            <div className="fixed top-[52px] sm:top-[56px] inset-x-2 w-auto max-w-lg mx-auto bg-zinc-950/98 border border-white/20 backdrop-blur-md rounded-2xl p-3 shadow-2xl z-50 max-h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain transform-gpu will-change-[transform,opacity]">
              {!hasSearchText && recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 px-2 py-1 mb-1 border-b border-white/10">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <History size={12} className="text-netflix-red" />
                      Tìm kiếm gần đây
                    </span>
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="text-[10px] text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5 mt-1">
                    {recentSearches.map((kw, idx) => (
                      <div
                        key={kw}
                        onClick={() => handleRecentClick(kw)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer group ${
                          selectedSuggestionIndex === idx
                            ? "bg-zinc-800 text-white ring-1 ring-white/20"
                            : "hover:bg-zinc-850 text-gray-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <History size={13} className="text-gray-500 group-hover:text-netflix-red transition flex-none" />
                          <span className="text-xs transition truncate">{kw}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(kw, e)}
                          className="p-1 text-gray-500 hover:text-white rounded transition cursor-pointer hover:bg-white/10"
                          title="Xóa từ khóa này"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="text-[11px] font-semibold text-gray-400 px-2.5 py-1 uppercase tracking-wider">
                    Gợi ý phim
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {suggestions.map((item, idx) => (
                      <Link
                        key={item.slug}
                        href={
                          item.slug.startsWith("browse?")
                            ? `/browse?${item.slug.slice(7)}`
                            : item.slug.startsWith("?")
                            ? `/browse${item.slug}`
                            : `/movies/${item.slug}`
                        }
                        onClick={() => {
                          const val = (mobileInputRef.current?.value || inputRef.current?.value || "").trim();
                          if (val) {
                            trackSearchOnce(val);
                            saveRecentSearch(val);
                          }
                          setShowDropdown(false);
                          setIsSearchExpanded(false);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg transition group ${
                          selectedSuggestionIndex === idx
                            ? "bg-zinc-800 text-white ring-1 ring-netflix-red/60"
                            : "hover:bg-zinc-850"
                        }`}
                      >
                        <div className="relative w-10 h-14 bg-zinc-800 rounded overflow-hidden flex-none border border-white/10">
                          <Image
                            src={toOptimizedPhimimgUrl(item.poster, 192)}
                            alt={item.title}
                            fill
                            unoptimized
                            sizes="40px"
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white group-hover:text-netflix-red transition-colors truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            {item.year && <span>{item.year}</span>}
                            {item.category && (
                              <span className="text-amber-400 font-medium">
                                {item.category}
                              </span>
                            )}
                            {item.quality && (
                              <span className="border border-white/20 px-1 py-0.2 rounded text-[10px]">
                                {item.quality}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-white/10 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-netflix-red hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer active:scale-98"
                    >
                      <Search size={13} />
                      <span>Xem tất cả kết quả cho &quot;{mobileInputRef.current?.value || inputRef.current?.value}&quot;</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* MOBILE SEARCH TRIGGER BUTTON */}
      <button
        type="button"
        onClick={toggleSearch}
        aria-label="Tìm kiếm phim"
        className="md:hidden flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 transition cursor-pointer flex-shrink-0 active:scale-95"
      >
        <Search size={16} />
      </button>

      {/* DESKTOP SEARCH BAR */}
      <div ref={searchContainerRef} className="relative hidden md:block flex-shrink-0">
        <form
          onSubmit={handleSearchSubmit}
          className={`flex items-center transition-all duration-300 rounded-full ${
            isSearchOpen
              ? "border border-white/35 bg-black/90 px-3 py-1.5 backdrop-blur-md shadow-lg"
              : "border-transparent px-1 py-1"
          }`}
        >
          <button
            type={isSearchOpen && hasSearchText ? "submit" : "button"}
            onClick={isSearchOpen && hasSearchText ? undefined : toggleSearch}
            aria-label={isSearchOpen && hasSearchText ? "Tìm kiếm phim" : "Mở thanh tìm kiếm"}
            title={isSearchOpen && hasSearchText ? "Tìm kiếm ngay" : "Tìm kiếm (Ctrl+K)"}
            className="text-gray-300 hover:text-white transition flex-shrink-0 cursor-pointer p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Search size={17} />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm phim trên Nanaflix..."
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              setShowDropdown(true);
            }}
            className={`bg-transparent text-white text-sm outline-none transition-all duration-300 ${
              isSearchOpen
                ? "w-40 lg:w-48 xl:w-56 ml-2 opacity-100 placeholder:text-gray-400"
                : "w-0 opacity-0 pointer-events-none"
            }`}
          />

          {isSearchOpen && (
            <div className="flex items-center gap-1 ml-1 flex-shrink-0">
              {isSearching && (
                <Loader2 size={14} className="animate-spin text-netflix-red" />
              )}
              {hasSearchText && (
                <>
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Xóa nội dung tìm kiếm"
                    className="p-1 text-gray-400 hover:text-white transition flex-shrink-0 cursor-pointer rounded-full hover:bg-white/10"
                    title="Xóa nội dung"
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="submit"
                    aria-label="Tìm kiếm ngay"
                    title="Tìm kiếm ngay"
                    className="p-1.5 bg-netflix-red hover:bg-red-700 text-white rounded-full flex-shrink-0 cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center ml-0.5"
                  >
                    <Search size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          )}
        </form>

        {/* DESKTOP SEARCH DROPDOWN */}
        {showDropdown && hasDropdownContent && (
          <div className="absolute top-full mt-2 right-0 w-[360px] bg-zinc-950/98 border border-white/15 backdrop-blur-md rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 transform-gpu will-change-[transform,opacity]">
            {!hasSearchText && recentSearches.length > 0 ? (
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 px-2 py-1 mb-1 border-b border-white/10">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <History size={12} className="text-netflix-red" />
                    Tìm kiếm gần đây
                  </span>
                  <button
                    type="button"
                    onClick={clearAllRecentSearches}
                    className="text-[10px] text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="flex flex-col gap-0.5 mt-1">
                  {recentSearches.map((kw, idx) => (
                    <div
                      key={kw}
                      onClick={() => handleRecentClick(kw)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer group ${
                        selectedSuggestionIndex === idx
                          ? "bg-zinc-800 text-white ring-1 ring-white/20"
                          : "hover:bg-zinc-850 text-gray-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <History size={13} className="text-gray-500 group-hover:text-netflix-red transition flex-none" />
                        <span className="text-xs transition truncate">{kw}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(kw, e)}
                        className="p-1 text-gray-500 hover:text-white rounded transition cursor-pointer hover:bg-white/10"
                        title="Xóa từ khóa này"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              <>
                <div className="text-[11px] font-semibold text-gray-400 px-2.5 py-1 uppercase tracking-wider">
                  Gợi ý phim
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {suggestions.map((item, idx) => (
                    <Link
                      key={item.slug}
                      href={
                        item.slug.startsWith("browse?")
                          ? `/browse?${item.slug.slice(7)}`
                          : item.slug.startsWith("?")
                          ? `/browse${item.slug}`
                          : `/movies/${item.slug}`
                      }
                      onClick={() => {
                        const val = (inputRef.current?.value || mobileInputRef.current?.value || "").trim();
                        if (val) {
                          trackSearchOnce(val);
                          saveRecentSearch(val);
                        }
                        setShowDropdown(false);
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg transition group ${
                        selectedSuggestionIndex === idx
                          ? "bg-zinc-800 text-white ring-1 ring-netflix-red/60"
                          : "hover:bg-zinc-850"
                      }`}
                    >
                      <div className="relative w-10 h-14 bg-zinc-800 rounded overflow-hidden flex-none border border-white/10">
                        <Image
                          src={toOptimizedPhimimgUrl(item.poster, 192)}
                          alt={item.title}
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white group-hover:text-netflix-red transition-colors truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          {item.year && <span>{item.year}</span>}
                          {item.category && (
                            <span className="text-amber-400 font-medium">
                              {item.category}
                            </span>
                          )}
                          {item.quality && (
                            <span className="border border-white/20 px-1 py-0.2 rounded text-[10px]">
                              {item.quality}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-white/10 mt-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-netflix-red hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer active:scale-98"
                  >
                    <Search size={13} />
                    <span>Xem tất cả kết quả cho &quot;{inputRef.current?.value}&quot;</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
});
