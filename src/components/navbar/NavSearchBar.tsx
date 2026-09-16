"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, X, History, ArrowLeft } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

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
}

export const NavSearchBar: React.FC<NavSearchBarProps> = React.memo(function NavSearchBar({
  isSearchExpanded,
  setIsSearchExpanded,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlKeyword = searchParams.get("keyword") || "";

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

  const isSearchOpen = isSearchExpanded;
  const hasSearchText = hasText;
  const hasDropdownContent = (!hasSearchText && recentSearches.length > 0) || (hasSearchText && suggestions.length > 0);

  // Debounced search fetcher (300ms)
  const [debouncedFetchSuggestions, cancelDebouncedFetch] = useDebounce(
    async (val: string) => {
      try {
        const res = await fetch(
          `/api/search-suggest?keyword=${encodeURIComponent(val.trim())}`
        );
        const data = await res.json();
        setSuggestions(data.items || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Lỗi gợi ý tìm kiếm:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    },
    300
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nanaflix_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  }, []);

  useEffect(() => () => cancelDebouncedFetch(), [cancelDebouncedFetch]);

  // Sync keyword from URL
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = urlKeyword;
    if (mobileInputRef.current) mobileInputRef.current.value = urlKeyword;
    if (urlKeyword) setHasText(true);
  }, [urlKeyword]);

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

  // Global hotkey Ctrl+K, / to open search, and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchExpanded) {
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
        setIsSearchExpanded(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchExpanded, setIsSearchExpanded]);

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
    setIsSearchExpanded(false);
    saveRecentSearch(kw);
    router.push(`/browse?keyword=${encodeURIComponent(kw)}`);
  };

  const toggleSearch = () => {
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
      setShowDropdown(true);
      setTimeout(() => {
        inputRef.current?.focus();
        mobileInputRef.current?.focus();
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
    if (inputRef.current) inputRef.current.value = "";
    if (mobileInputRef.current) mobileInputRef.current.value = "";
    setHasText(false);
    setSuggestions([]);
    setIsSearching(false);
    setShowDropdown(true);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const hasVal = val.length > 0;
    setHasText(hasVal);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debouncedFetchSuggestions(val);
    } else {
      cancelDebouncedFetch();
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
        const val = inputRef.current?.value || mobileInputRef.current?.value;
        if (val) saveRecentSearch(val);
        setShowDropdown(false);
        setIsSearchExpanded(false);
        router.push(`/movies/${selected.slug}`);
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
    setIsSearchExpanded(false);
    const currentKeyword = (inputRef.current?.value || mobileInputRef.current?.value || "").trim();

    if (currentKeyword) {
      saveRecentSearch(currentKeyword);
      router.push(`/browse?keyword=${encodeURIComponent(currentKeyword)}`);
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
            {isSearching ? (
              <Loader2 size={16} className="animate-spin text-netflix-red mr-2 flex-shrink-0" />
            ) : (
              <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
            )}

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

            {hasSearchText && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Xóa nội dung tìm kiếm"
                className="p-1 text-gray-400 hover:text-white transition ml-1 flex-shrink-0"
              >
                <X size={15} />
              </button>
            )}
          </form>

          {/* MOBILE SEARCH DROPDOWN */}
          {showDropdown && hasDropdownContent && (
            <div className="fixed top-[52px] sm:top-[56px] inset-x-2 w-auto max-w-lg mx-auto bg-zinc-950/98 border border-white/20 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl z-50 max-h-[75vh] overflow-y-auto overscroll-contain">
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
                        href={`/movies/${item.slug}`}
                        onClick={() => {
                          const val = mobileInputRef.current?.value || inputRef.current?.value;
                          if (val) saveRecentSearch(val);
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
                            src={item.poster}
                            alt={item.title}
                            fill
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

                  <div className="border-t border-white/10 mt-2 pt-1.5">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full text-center text-xs text-netflix-red font-semibold py-1 hover:underline cursor-pointer"
                    >
                      Xem tất cả kết quả cho &quot;{mobileInputRef.current?.value || inputRef.current?.value}&quot;
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
          {isSearching ? (
            <Loader2 size={17} className="animate-spin text-netflix-red" />
          ) : (
            <Search
              size={17}
              className="cursor-pointer text-gray-300 hover:text-white transition"
              onClick={toggleSearch}
            />
          )}

          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm phim..."
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

          {isSearchOpen && hasSearchText && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Xóa nội dung tìm kiếm"
              className="p-1 text-gray-400 hover:text-white transition ml-1 flex-shrink-0 cursor-pointer rounded-full hover:bg-white/10"
            >
              <X size={15} />
            </button>
          )}
        </form>

        {/* DESKTOP SEARCH DROPDOWN */}
        {showDropdown && hasDropdownContent && (
          <div className="absolute top-full mt-2 right-0 w-[360px] bg-zinc-950/95 border border-white/15 backdrop-blur-xl rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                      href={`/movies/${item.slug}`}
                      onClick={() => {
                        if (inputRef.current?.value) {
                          saveRecentSearch(inputRef.current.value);
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
                          src={item.poster}
                          alt={item.title}
                          fill
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

                <div className="border-t border-white/10 mt-2 pt-1.5">
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full text-center text-xs text-netflix-red font-semibold py-1 hover:underline cursor-pointer"
                  >
                    Xem tất cả kết quả cho &quot;{inputRef.current?.value}&quot;
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
