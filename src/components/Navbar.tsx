"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import {
  Search,
  Bell,
  User,
  X,
  Menu,
  Loader2,
  Film,
  Flame,
  Star,
  Keyboard,
  History,
  Home,
  Tv,
  Clapperboard,
  Sparkles,
  Radio,
  Bookmark,
  Dices,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NetflixLogo } from "./sites/netflix-3f78535a/vn-d838105b/icons";
import { RandomMovieButton } from "./RandomMovieButton";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchSuggestion {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
}

const NAV_LINKS = [
  { name: "Trang chủ", href: "/browse", type: null, icon: Home, isLive: false },
  { name: "Phim bộ", href: "/browse?type=phim-bo", type: "phim-bo", icon: Tv, isLive: false },
  { name: "Phim lẻ", href: "/browse?type=phim-le", type: "phim-le", icon: Film, isLive: false },
  { name: "Chiếu rạp", href: "/browse?type=phim-chieu-rap", type: "phim-chieu-rap", icon: Clapperboard, isLive: false },
  { name: "Hoạt hình", href: "/browse?type=hoat-hinh", type: "hoat-hinh", icon: Sparkles, isLive: false },
  { name: "TV Shows", href: "/browse?type=tv-shows", type: "tv-shows", icon: Radio, isLive: false },
  { name: "Bóng đá", href: "/live?tab=football", type: "live-football", icon: Flame, isLive: true },
  { name: "Truyền hình", href: "/live?tab=tv", type: "live-tv", icon: Tv, isLive: false },
  { name: "Danh sách của tôi", href: "/my-list", type: "my-list", icon: Bookmark, isLive: false },
];

const NavbarInner: React.FC = () => {
  const [showBackground, setShowBackground] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasText, setHasText] = useState(false);

  // Live Search States
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Notification Center & Hotkey States
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showHotkeyModal, setShowHotkeyModal] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKeyword = searchParams.get("keyword") || "";
  const currentType = searchParams.get("type");

  const isSearchOpen = isSearchExpanded || Boolean(urlKeyword);
  const hasSearchText = hasText || Boolean(urlKeyword);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Lịch sử tìm kiếm gần đây
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounced search fetcher (300ms)
  const [debouncedFetchSuggestions, cancelDebouncedFetch] = useDebounce(
    async (val: string) => {
      try {
        const res = await fetch(
          `/api/search-suggest?keyword=${encodeURIComponent(val.trim())}`,
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
    } catch {
      // Ignore
    }
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => () => cancelDebouncedFetch(), [cancelDebouncedFetch]);

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
    } catch {
      // Ignore
    }
  };

  const removeRecentSearch = (kw: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== kw);
      setRecentSearches(updated);
      localStorage.setItem("nanaflix_recent_searches", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRecentSearches([]);
      localStorage.removeItem("nanaflix_recent_searches");
    } catch {
      // Ignore
    }
  };

  const handleRecentClick = (kw: string) => {
    if (inputRef.current) {
      inputRef.current.value = kw;
    }
    setHasText(true);
    setShowDropdown(false);
    saveRecentSearch(kw);
    router.push(`/browse?keyword=${encodeURIComponent(kw)}`);
  };

  // Lắng nghe phím tắt toàn cục: Ctrl + K (hoặc /) để tìm kiếm, ? để xem phím tắt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Ctrl + K hoặc / để tìm kiếm nhanh
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

      // Phím ?: Bảng phím tắt
      if (e.key === "?" && !isInput) {
        setShowHotkeyModal((prev) => !prev);
      }

      // Phím Esc: Đóng các modal/dropdown
      if (e.key === "Escape") {
        setShowHotkeyModal(false);
        setShowNotifications(false);
        setShowDropdown(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Đồng bộ từ khoá từ URL vào ô input khi load trang
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = urlKeyword;
    }
  }, [urlKeyword]);

  // Đóng mobile menu và search dropdown khi chuyển trang
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowDropdown(false);
    setShowNotifications(false);
  }, [pathname, searchParams]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hiệu ứng đổi màu nền khi cuộn
  useEffect(() => {
    let prevScrolled = false;
    const handleScroll = () => {
      const isScrolled = window.scrollY > 40;
      if (isScrolled !== prevScrolled) {
        prevScrolled = isScrolled;
        setShowBackground(isScrolled);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSearch = () => {
    if (!isSearchOpen) {
      setIsSearchExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (!hasSearchText) {
      setIsSearchExpanded(false);
      setShowDropdown(false);
    }
  };

  const clearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setHasText(false);
    setSuggestions([]);
    if (recentSearches.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
    inputRef.current?.focus();

    if (searchParams.get("keyword")) {
      router.push("/browse");
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHasText(val.length > 0);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debouncedFetchSuggestions(val);
    } else {
      cancelDebouncedFetch();
      setSuggestions([]);
      setIsSearching(false);
      if (recentSearches.length > 0) {
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    }
  }, [debouncedFetchSuggestions, cancelDebouncedFetch, recentSearches.length]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        if (inputRef.current?.value) {
          saveRecentSearch(inputRef.current.value);
        }
        setShowDropdown(false);
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
    const currentKeyword = inputRef.current?.value.trim();

    if (currentKeyword) {
      saveRecentSearch(currentKeyword);
      router.push(`/browse?keyword=${encodeURIComponent(currentKeyword)}`);
    }
  };

  const isLinkActive = (type: string | null) => {
    if (type === "live-football") {
      return pathname === "/live" && (!searchParams.get("tab") || searchParams.get("tab") === "football");
    }
    if (type === "live-tv") {
      return pathname === "/live" && searchParams.get("tab") === "tv";
    }
    if (type === "my-list") return pathname === "/my-list";
    if (pathname !== "/browse") return false;
    if (urlKeyword) return false;
    if (type === null) return !currentType;
    return currentType === type;
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${showBackground
          ? "bg-black/95 backdrop-blur-md border-b border-white/10 shadow-lg py-2.5"
          : "bg-gradient-to-b from-black/85 via-black/40 to-transparent py-3.5"
        }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-8 max-w-[1800px] mx-auto">
        {/* LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-3 md:gap-5 lg:gap-7 flex-shrink-0">
          <Link href="/browse" className="flex items-center gap-2 group flex-shrink-0">
            <NetflixLogo className="w-5 md:w-6 h-auto transition-transform group-hover:scale-105" />
            <span className="text-netflix-red font-black tracking-tighter text-xl hidden sm:inline-block">
              NANAFLIX
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 md:gap-2.5 lg:gap-4 xl:gap-5 2xl:gap-6 text-xs lg:text-sm font-medium flex-shrink-0">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.type);
              const IconComp = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`transition-all relative py-1 flex items-center gap-1 xl:gap-1.5 whitespace-nowrap flex-shrink-0 group ${
                    active
                      ? "text-white font-bold"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <IconComp
                    size={14}
                    className={`transition-colors flex-shrink-0 ${
                      link.isLive
                        ? "text-netflix-red animate-pulse"
                        : active
                        ? "text-netflix-red"
                        : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                  <span className="whitespace-nowrap">{link.name}</span>
                  {link.isLive && (
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-netflix-red"></span>
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-netflix-red rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-white">
          {/* NÚT PHIM NGẪU NHIÊN */}
          <RandomMovieButton />

          {/* Ô TÌM KIẾM CÓ GỢI Ý TRỰC TIẾP */}
          <div ref={searchContainerRef} className="relative flex-shrink-0">
            <form
              onSubmit={handleSearchSubmit}
              className={`flex items-center transition-all duration-300 rounded-full ${
                isSearchOpen
                  ? "border border-white/40 bg-black/60 px-3 py-1.5 backdrop-blur-sm"
                  : "border-transparent px-1 py-1"
              }`}
            >
              {isSearching ? (
                <Loader2 size={18} className="animate-spin text-netflix-red" />
              ) : (
                <Search
                  size={18}
                  className="cursor-pointer text-gray-300 hover:text-white transition"
                  onClick={toggleSearch}
                />
              )}

              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm kiếm phim..."
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={() => {
                  if (!hasSearchText && recentSearches.length > 0) {
                    setShowDropdown(true);
                  } else if (suggestions.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                className={`bg-transparent text-white text-xs sm:text-sm outline-none transition-all duration-300 ${
                  isSearchOpen
                    ? "w-28 min-[380px]:w-36 sm:w-44 md:w-36 lg:w-48 xl:w-56 ml-1.5 sm:ml-2 opacity-100 placeholder:text-gray-400"
                    : "w-0 opacity-0 pointer-events-none"
                }`}
              />

              {isSearchOpen && hasSearchText && (
                <X
                  size={16}
                  className="cursor-pointer text-gray-400 hover:text-white transition ml-1"
                  onClick={clearSearch}
                />
              )}

              {!isSearchOpen && (
                <span
                  onClick={toggleSearch}
                  className="hidden xl:inline-block text-[10px] text-gray-400 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded border border-white/10 cursor-pointer ml-1 select-none font-mono"
                  title="Nhấn Ctrl + K để tìm kiếm"
                >
                  Ctrl K
                </span>
              )}
            </form>

            {/* FLOATING RECENT SEARCHES OR SUGGESTIONS DROPDOWN */}
            {showDropdown && (
              <div className="absolute top-full mt-2 right-0 w-[280px] sm:w-[350px] bg-zinc-950/95 border border-white/15 backdrop-blur-xl rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                            <span className="text-xs transition truncate">
                              {kw}
                            </span>
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

          {/* TRUNG TÂM THÔNG BÁO (NOTIFICATION CENTER) */}
          <div ref={notificationRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setHasUnread(false);
              }}
              title="Thông báo mới"
              aria-label="Thông báo"
              className="relative text-gray-300 hover:text-white transition p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <Bell size={19} />
              {hasUnread && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-netflix-red animate-pulse ring-2 ring-black" />
              )}
            </button>

            {/* NOTIFICATION POPUP DROPDOWN */}
            {showNotifications && (
              <div className="absolute top-full mt-2 right-0 w-[320px] sm:w-[380px] bg-zinc-950/95 border border-white/15 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-netflix-red" />
                    <h4 className="text-white font-bold text-sm">Thông Báo Mới</h4>
                  </div>
                  <span className="text-[11px] text-gray-400">Vừa cập nhật</span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto overscroll-contain pr-1 scrollbar-none">
                  {/* NOTIFICATION ITEM 1 */}
                  <Link
                    href="/browse?sort=latest"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-900 transition border border-transparent hover:border-white/10 group"
                  >
                    <div className="p-2 rounded-lg bg-netflix-red/20 text-netflix-red flex-none mt-0.5">
                      <Film size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-semibold group-hover:text-netflix-red transition-colors">
                        50+ Phim mới lên sóng tuần này
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                        Các tập phim mới nhất đã có bản Vietsub &amp; Thuyết minh chất lượng cao Full HD.
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block">Hôm nay</span>
                    </div>
                  </Link>

                  {/* NOTIFICATION ITEM 2 */}
                  <Link
                    href="/browse?sort=views"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-900 transition border border-transparent hover:border-white/10 group"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 flex-none mt-0.5">
                      <Flame size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-semibold group-hover:text-amber-400 transition-colors">
                        Top 10 Phim Thịnh Hành Hôm Nay
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                        Khám phá những bộ phim đang có lượt xem bùng nổ nhất trên toàn hệ thống.
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block">2 giờ trước</span>
                    </div>
                  </Link>

                  {/* NOTIFICATION ITEM 3 */}
                  <Link
                    href="/browse?sort=rating"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-900 transition border border-transparent hover:border-white/10 group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 flex-none mt-0.5">
                      <Star size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-semibold group-hover:text-emerald-400 transition-colors">
                        Tuyển tập phim đạt &gt; 8.5 Điểm
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                        Danh sách các kiệt tác điện ảnh được đánh giá cao nhất từ giới phê bình.
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block">Hôm qua</span>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* NÚT BẢNG PHÍM TẮT */}
          <button
            type="button"
            onClick={() => setShowHotkeyModal(true)}
            title="Bảng phím tắt (?)"
            aria-label="Phím tắt"
            className="hidden lg:flex text-gray-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <Keyboard size={18} />
          </button>

          <Link
            href="/my-list?tab=history"
            title="Lịch sử xem phim"
            aria-label="Tài khoản"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-zinc-800 border border-white/20 text-gray-300 hover:border-white transition"
          >
            <User size={18} />
          </Link>

          {/* MOBILE MENU TOGGLE */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
            className="md:hidden text-gray-300 hover:text-white transition p-1"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl px-4 py-4 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-1.5">
            {/* NÚT GỢI Ý PHIM NGẪU NHIÊN TRÊN MOBILE */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-random-movie-modal"));
                }
              }}
              className="text-sm font-bold py-2.5 px-3 text-white flex items-center justify-between rounded-xl bg-gradient-to-r from-red-600/25 via-red-950/40 to-transparent border border-red-500/40 hover:bg-red-600/30 transition text-left cursor-pointer shadow-sm mb-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-netflix-red text-white flex items-center justify-center shadow-md shadow-red-950/60">
                  <Dices size={16} />
                </div>
                <span>Hôm Nay Xem Gì? (Gợi ý ngẫu nhiên)</span>
              </div>
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
            </button>

            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.type);
              const IconComp = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-sm font-medium py-2 px-3 transition-all flex items-center justify-between rounded-xl ${active
                      ? "text-white font-bold bg-white/10 border border-white/15 shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${active
                          ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                          : "bg-zinc-900 text-gray-400 border border-white/5"
                        }`}
                    >
                      <IconComp
                        size={15}
                        className={link.isLive ? "text-rose-400 animate-pulse" : ""}
                      />
                    </div>
                    <span>{link.name}</span>
                    {link.isLive && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-netflix-red text-white font-black uppercase tracking-wider animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>

                  {active && (
                    <span className="h-2 w-2 rounded-full bg-netflix-red" />
                  )}
                </Link>
              );
            })}

            <div className="border-t border-white/10 pt-2.5 mt-1.5 flex flex-col gap-1">
              <Link
                href="/my-list?tab=history"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-medium py-2 px-3 text-gray-300 hover:text-white flex items-center justify-between rounded-xl hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-netflix-red">
                    <History size={15} />
                  </div>
                  <span>Lịch sử xem phim</span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowHotkeyModal(true);
                }}
                className="text-sm font-medium py-2 px-3 text-gray-300 hover:text-white flex items-center justify-between rounded-xl hover:bg-white/5 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-amber-400">
                    <Keyboard size={15} />
                  </div>
                  <span>Bảng phím tắt rạp chiếu</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-white/10">?</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BẢNG PHÍM TẮT RẠP CHIẾU (HOTKEY MODAL) */}
      {showHotkeyModal && (
        <div
          onClick={() => setShowHotkeyModal(false)}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-950 rounded-2xl border border-white/20 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-netflix-red" />
                <h3 className="text-white font-bold text-base">Phím Tắt Rạp Chiếu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHotkeyModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span>Tìm kiếm phim nhanh</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
                  Ctrl + K hoặc /
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span>Chế độ Rạp phim (Theater Mode)</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
                  T
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span>Bật / Tắt đèn phòng chiếu</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
                  L
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span>Tập phim tiếp theo</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
                  N
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span>Bảng phím tắt này</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
                  ?
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span>Đóng cửa sổ / modal</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
                  Esc
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// Wrap với Suspense vì useSearchParams() cần Suspense boundary
function NavbarWithSuspense() {
  return (
    <Suspense fallback={null}>
      <NavbarInner />
    </Suspense>
  );
}

// Named export tương thích với các file đang import { Navbar }
export { NavbarWithSuspense as Navbar };

export default NavbarWithSuspense;
