"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

export interface SearchSuggestion {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
}

// In-memory cache cho kết quả gợi ý tìm kiếm phía Client (phản hồi 0ms khi gõ/xóa lại ký tự)
const clientSuggestCache = new Map<string, SearchSuggestion[]>();
const RECENT_SEARCHES_KEY = "nanaflix_recent_searches";

export function resolveSuggestionHref(slug: string): string {
  if (slug.startsWith("browse?")) return `/browse?${slug.slice(7)}`;
  if (slug.startsWith("?")) return `/browse${slug}`;
  return `/movies/${slug}`;
}

export interface UseNavSearchOptions {
  isSearchExpanded: boolean;
  setIsSearchExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMobileSearch?: () => void;
}

/**
 * Manages desktop/mobile search inputs, client cache, debounced /api/search-suggest
 * fetching with race-safe abort control, localStorage history, and Ctrl+K / `/` hotkeys.
 */
export function useNavSearch({
  isSearchExpanded,
  setIsSearchExpanded,
  onOpenMobileSearch,
}: UseNavSearchOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKeyword = searchParams.get("keyword") || "";

  const [queryText, setQueryText] = useState(urlKeyword);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSearchExpandedRef = useRef(isSearchExpanded);
  const onOpenMobileSearchRef = useRef(onOpenMobileSearch);

  useEffect(() => {
    isSearchExpandedRef.current = isSearchExpanded;
  }, [isSearchExpanded]);

  useEffect(() => {
    onOpenMobileSearchRef.current = onOpenMobileSearch;
  }, [onOpenMobileSearch]);

  const triggerNavigationLoading = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:loading-start"));
    }
  }, []);

  const hasSearchText = queryText.trim().length > 0;
  const hasDropdownContent =
    (!hasSearchText && recentSearches.length > 0) || hasSearchText;

  // Debounced search fetcher (350ms phản hồi mượt mà)
  const [debouncedFetchSuggestions, cancelDebouncedFetch] = useDebounce(
    async (val: string) => {
      const trimmed = val.trim();
      const normKey = trimmed.toLowerCase();

      if (clientSuggestCache.has(normKey)) {
        const cachedItems = clientSuggestCache.get(normKey)!;
        setSuggestions(cachedItems);
        setShowDropdown(true);
        setIsSearching(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/search-suggest?keyword=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const items = data.items || [];
        clientSuggestCache.set(normKey, items);

        const isFocused =
          typeof document !== "undefined" &&
          (document.activeElement === inputRef.current ||
            document.activeElement === mobileInputRef.current);
        const currentInputVal = (
          inputRef.current?.value ||
          mobileInputRef.current?.value ||
          ""
        ).trim();

        if (
          isFocused &&
          currentInputVal.toLowerCase() === trimmed.toLowerCase()
        ) {
          setSuggestions(items);
          setShowDropdown(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
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
    350,
  );

  const abortPendingSearch = useCallback(() => {
    cancelDebouncedFetch();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearching(false);
  }, [cancelDebouncedFetch]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  }, []);

  useEffect(() => () => abortPendingSearch(), [abortPendingSearch]);

  // Sync keyword from URL
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = urlKeyword;
    if (mobileInputRef.current) mobileInputRef.current.value = urlKeyword;
    setQueryText(urlKeyword);
    if (urlKeyword && typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsSearchExpanded(true);
    }
  }, [urlKeyword, setIsSearchExpanded]);

  // Close dropdown and collapse search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const insideDesktopSearch = searchContainerRef.current?.contains(
        e.target as Node,
      );
      const insideMobileSearch = mobileSearchRef.current?.contains(
        e.target as Node,
      );
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

  // Close dropdown and abort pending fetches on route or search params change
  useEffect(() => {
    abortPendingSearch();
    setShowDropdown(false);
    if (pathname !== "/browse") {
      setIsSearchExpanded(false);
    }
  }, [pathname, searchParams, abortPendingSearch, setIsSearchExpanded]);

  const saveRecentSearch = useCallback((kw: string) => {
    const clean = kw.trim();
    if (!clean) return;
    try {
      setRecentSearches((prev) => {
        const current = prev.filter(
          (s) => s.toLowerCase() !== clean.toLowerCase(),
        );
        const updated = [clean, ...current].slice(0, 6);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {}
  }, []);

  const removeRecentSearch = useCallback(
    (kw: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        setRecentSearches((prev) => {
          const updated = prev.filter((s) => s !== kw);
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch {}
    },
    [],
  );

  const clearAllRecentSearches = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  }, []);

  const handleRecentClick = useCallback(
    (kw: string) => {
      abortPendingSearch();
      setSelectedSuggestionIndex(-1);
      if (inputRef.current) inputRef.current.value = kw;
      if (mobileInputRef.current) mobileInputRef.current.value = kw;
      setQueryText(kw);
      setShowDropdown(false);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsSearchExpanded(false);
      }
      saveRecentSearch(kw);
      triggerNavigationLoading();
      router.push(`/browse?keyword=${encodeURIComponent(kw)}`);
    },
    [
      abortPendingSearch,
      saveRecentSearch,
      setIsSearchExpanded,
      triggerNavigationLoading,
      router,
    ],
  );

  const toggleSearch = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
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
    },
    [isSearchExpanded, onOpenMobileSearch, setIsSearchExpanded],
  );

  const clearSearch = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      abortPendingSearch();
      if (inputRef.current) inputRef.current.value = "";
      if (mobileInputRef.current) mobileInputRef.current.value = "";
      setQueryText("");
      setSuggestions([]);
      setShowDropdown(true);
      setSelectedSuggestionIndex(-1);
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        mobileInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }

      if (pathname === "/browse" && searchParams.has("keyword")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("keyword");
        params.delete("page");
        const query = params.toString();
        triggerNavigationLoading();
        router.push(query ? `/browse?${query}` : "/browse");
      }
    },
    [abortPendingSearch, pathname, searchParams, triggerNavigationLoading, router],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const trimmed = val.trim();
      setQueryText(val);

      if (
        inputRef.current &&
        e.target !== inputRef.current &&
        inputRef.current.value !== val
      ) {
        inputRef.current.value = val;
      }
      if (
        mobileInputRef.current &&
        e.target !== mobileInputRef.current &&
        mobileInputRef.current.value !== val
      ) {
        mobileInputRef.current.value = val;
      }

      if (trimmed.length >= 2) {
        setIsSearching(true);
        setShowDropdown(true);
        debouncedFetchSuggestions(trimmed);
      } else {
        abortPendingSearch();
        setSuggestions([]);
        setShowDropdown(true);
      }
    },
    [debouncedFetchSuggestions, abortPendingSearch],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        abortPendingSearch();
        setShowDropdown(false);
        setIsSearchExpanded(false);
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
        return;
      }

      if (e.key === "Enter") {
        if (
          showDropdown &&
          suggestions.length > 0 &&
          selectedSuggestionIndex >= 0 &&
          selectedSuggestionIndex < suggestions.length
        ) {
          e.preventDefault();
          const selected = suggestions[selectedSuggestionIndex];
          const val = (
            inputRef.current?.value ||
            mobileInputRef.current?.value ||
            ""
          ).trim();
          if (val) {
            saveRecentSearch(val);
          }
          abortPendingSearch();
          setShowDropdown(false);
          setIsSearchExpanded(false);
          inputRef.current?.blur();
          mobileInputRef.current?.blur();
          triggerNavigationLoading();
          router.push(resolveSuggestionHref(selected.slug));
          return;
        }
        if (
          showDropdown &&
          !hasSearchText &&
          recentSearches.length > 0 &&
          selectedSuggestionIndex >= 0 &&
          selectedSuggestionIndex < recentSearches.length
        ) {
          e.preventDefault();
          handleRecentClick(recentSearches[selectedSuggestionIndex]);
          return;
        }
      }

      if (!showDropdown) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
        } else if (recentSearches.length > 0) {
          setSelectedSuggestionIndex((prev) =>
            prev < recentSearches.length - 1 ? prev + 1 : 0,
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
        } else if (recentSearches.length > 0) {
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : recentSearches.length - 1,
          );
        }
      }
    },
    [
      abortPendingSearch,
      setIsSearchExpanded,
      showDropdown,
      suggestions,
      selectedSuggestionIndex,
      saveRecentSearch,
      triggerNavigationLoading,
      router,
      hasSearchText,
      recentSearches,
      handleRecentClick,
    ],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const currentKeyword = (
        inputRef.current?.value ||
        mobileInputRef.current?.value ||
        ""
      ).trim();

      if (!currentKeyword) {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          mobileInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
        return;
      }

      abortPendingSearch();
      setShowDropdown(false);
      setSelectedSuggestionIndex(-1);

      inputRef.current?.blur();
      mobileInputRef.current?.blur();

      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsSearchExpanded(false);
      }

      saveRecentSearch(currentKeyword);
      triggerNavigationLoading();
      router.push(`/browse?keyword=${encodeURIComponent(currentKeyword)}`);
    },
    [
      abortPendingSearch,
      setIsSearchExpanded,
      saveRecentSearch,
      triggerNavigationLoading,
      router,
    ],
  );

  const handleSuggestionSelect = useCallback(
    (collapseExpanded: boolean) => {
      const val = (
        mobileInputRef.current?.value ||
        inputRef.current?.value ||
        ""
      ).trim();
      if (val) {
        saveRecentSearch(val);
      }
      abortPendingSearch();
      setShowDropdown(false);
      if (collapseExpanded) {
        setIsSearchExpanded(false);
      }
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      triggerNavigationLoading();
    },
    [
      abortPendingSearch,
      saveRecentSearch,
      setIsSearchExpanded,
      triggerNavigationLoading,
    ],
  );

  const closeMobileOverlay = useCallback(() => {
    setIsSearchExpanded(false);
    setShowDropdown(false);
  }, [setIsSearchExpanded]);

  return {
    queryText,
    hasSearchText,
    hasDropdownContent,
    suggestions,
    isSearching,
    showDropdown,
    setShowDropdown,
    selectedSuggestionIndex,
    recentSearches,
    inputRef,
    mobileInputRef,
    searchContainerRef,
    mobileSearchRef,
    handleInputChange,
    handleInputKeyDown,
    handleSearchSubmit,
    handleRecentClick,
    removeRecentSearch,
    clearAllRecentSearches,
    clearSearch,
    toggleSearch,
    handleSuggestionSelect,
    closeMobileOverlay,
  };
}

