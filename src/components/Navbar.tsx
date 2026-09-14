"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import {
  Search,
  Bell,
  X,
  Menu,
  Loader2,
  Film,
  Flame,
  Keyboard,
  History,
  Home,
  Tv,
  Clapperboard,
  Sparkles,
  Radio,
  Bookmark,
  Dices,
  ArrowLeft,
  ChevronDown,
  LogOut,
  Smartphone,
  CheckCheck,
  ShieldCheck,
  ChevronRight,
  User,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/lib/adminConfig";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";

const AuthModal = dynamic(
  () => import("./AuthModal").then((mod) => mod.AuthModal),
  { ssr: false }
);
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NetflixLogo } from "./sites/netflix-3f78535a/vn-d838105b/icons";
import { useDebounce } from "@/hooks/useDebounce";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import { UserNotification } from "@/types/notification";

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
  { name: "TV Shows", href: "/browse?type=tv-shows", type: "tv-shows", icon: Radio, isLive: false, hideOnLg: true },
  { name: "Trực tiếp", href: "/live", type: "live", icon: Flame, isLive: true },
  { name: "Danh sách", href: "/my-list", type: "my-list", icon: Bookmark, isLive: false },
];

interface DynamicNotification {
  id: string;
  type: "movie" | "live" | "hot";
  title: string;
  message: string;
  time: string;
  link: string;
  image?: string;
  badge?: string;
  badgeColor?: string;
}

let cachedNotificationsData: DynamicNotification[] | null = null;
let lastNotificationsFetchTime = 0;

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

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showHotkeyModal, setShowHotkeyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState<DynamicNotification[]>(() => cachedNotificationsData || []);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "replies" | "system">("all");

  const { user, logout } = useAuth();
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setUserNotifications([]);
      return;
    }
    const unsub = subscribeUserNotifications(user.uid, (items) => {
      setUserNotifications(items);
    });
    return () => unsub();
  }, [user?.uid]);

  const userUnreadCount = userNotifications.filter((n) => !n.isRead).length;

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKeyword = searchParams.get("keyword") || "";
  const currentType = searchParams.get("type");

  const isSearchOpen = isSearchExpanded || Boolean(urlKeyword);
  const hasSearchText = hasText || Boolean(urlKeyword);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

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
    if (mobileInputRef.current) {
      mobileInputRef.current.value = kw;
    }
    setHasText(true);
    setShowDropdown(false);
    setIsSearchExpanded(false);
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
        setShowUserDropdown(false);
        setShowAuthModal(false);
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
      const insideDesktopSearch = searchContainerRef.current?.contains(e.target as Node);
      const insideMobileSearch = mobileSearchRef.current?.contains(e.target as Node);
      if (!insideDesktopSearch && !insideMobileSearch) {
        setShowDropdown(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hàm tải thông báo hệ thống và phim mới có hỗ trợ làm mới thủ công
  const loadDynamicNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedNotificationsData && now - lastNotificationsFetchTime < 180000) {
      setNotifications(cachedNotificationsData);
      return;
    }

    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const items: DynamicNotification[] = Array.isArray(data.items) ? [...data.items] : [];

        // Tích hợp phim đang xem dở từ localStorage
        try {
          const historyRaw = localStorage.getItem("nanaflix_history");
          if (historyRaw) {
            const hist = JSON.parse(historyRaw);
            if (Array.isArray(hist) && hist.length > 0) {
              const last = hist[0];
              if (last?.slug && last?.name) {
                items.unshift({
                  id: `continue-${last.slug}`,
                  type: "movie",
                  title: "Tiếp Tục Xem Phim",
                  message: `${last.name}${last.episodeName ? ` (${last.episodeName})` : ""} đang chờ bạn. Bấm để xem tiếp ngay!`,
                  time: "Gần đây",
                  link: last.currentEpisodeUrl || `/movies/${last.slug}`,
                  image: last.poster || last.thumb || "/default-hero.jpg",
                  badge: "XEM TIẾP",
                  badgeColor: "bg-emerald-600 text-white",
                });
              }
            }
          }
        } catch {}

        const finalItems = items.slice(0, 8);
        cachedNotificationsData = finalItems;
        lastNotificationsFetchTime = Date.now();
        setNotifications(finalItems);
      }
    } catch (err) {
      console.error("Lỗi lấy thông báo:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Tự động tải thông báo sau khi trang tải xong
  useEffect(() => {
    if (cachedNotificationsData) {
      setNotifications(cachedNotificationsData);
    }
    const deferTimer = setTimeout(() => {
      loadDynamicNotifications();
    }, cachedNotificationsData ? 5000 : 1200);

    return () => clearTimeout(deferTimer);
  }, [loadDynamicNotifications]);

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

  // Tự động tải trước (prefetch) tất cả các tab điều hướng vào Client Router Cache
  useEffect(() => {
    const mainTabs = [
      "/browse",
      "/browse?type=phim-bo",
      "/browse?type=phim-le",
      "/browse?type=phim-chieu-rap",
      "/browse?type=hoat-hinh",
      "/live",
      "/my-list",
    ];
    mainTabs.forEach((tab) => {
      router.prefetch(tab);
    });
  }, [router]);

  const toggleSearch = () => {
    if (!isSearchOpen) {
      setIsSearchExpanded(true);
      setTimeout(() => {
        inputRef.current?.focus();
        mobileInputRef.current?.focus();
      }, 100);
    } else if (!hasSearchText) {
      setIsSearchExpanded(false);
      setShowDropdown(false);
    }
  };

  const clearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (mobileInputRef.current) {
      mobileInputRef.current.value = "";
    }
    setHasText(false);
    setSuggestions([]);
    if (recentSearches.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
    inputRef.current?.focus();
    mobileInputRef.current?.focus();

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
        const val = inputRef.current?.value || mobileInputRef.current?.value;
        if (val) {
          saveRecentSearch(val);
        }
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

  const isLinkActive = (type: string | null) => {
    if (type === "live") {
      return pathname === "/live";
    }
    if (type === "my-list") return pathname === "/my-list";
    if (pathname !== "/browse") return false;
    if (urlKeyword) return false;
    if (type === null) return !currentType;
    return currentType === type;
  };

  return (
    <nav
      className={`nanaflix-navbar fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${showBackground
          ? "bg-black/95 backdrop-blur-md border-b border-white/10 shadow-lg py-2.5"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent py-3 sm:py-3.5"
        }`}
    >
      {/* THANH TÌM KIẾM TOÀN MÀN HÌNH TRÊN MOBILE (FULL-WIDTH MOBILE SEARCH OVERLAY) */}
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
                if (!hasSearchText && recentSearches.length > 0) {
                  setShowDropdown(true);
                } else if (suggestions.length > 0) {
                  setShowDropdown(true);
                }
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

          {/* GỢI Ý & LỊCH SỬ TÌM KIẾM TRÊN MOBILE */}
          {showDropdown && (
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
                          const val = mobileInputRef.current?.value || inputRef.current?.value;
                          if (val) {
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
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto gap-2 sm:gap-4">
        {/* LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-7 flex-shrink-0 min-w-0">
          <Link href="/browse" className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0">
            <NetflixLogo className="w-5 sm:w-6 h-auto transition-transform group-hover:scale-105" />
            <span className="text-netflix-red font-black tracking-tighter text-lg sm:text-xl inline-block">
              NANAFLIX
            </span>
          </Link>

          {/* DESKTOP NAV LINKS (CLEAN, NO WRAPPING, ULTRA RESPONSIVE) */}
          <div className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-xs xl:text-sm font-semibold flex-shrink-0">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.type);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={true}
                  className={`transition-all relative py-1 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    link.hideOnLg ? "hidden 2xl:flex" : ""
                  } ${
                    active
                      ? "text-white font-bold light-nav-active"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <span className="whitespace-nowrap">{link.name}</span>
                  {link.isLive && (
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-netflix-red"></span>
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-netflix-red rounded-full shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 text-white">

          {/* NÚT VÒNG QUAY SUẤT CHIẾU ĐỊNH MỆNH (DESKTOP) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-ai-roulette"));
              }
            }}
            title="Suất Chiếu Định Mệnh (Bốc quẻ điện ảnh)"
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/35 transition cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden 2xl:inline">Bốc Quẻ</span>
          </button>

          {/* NÚT TRỢ LÝ NANA GỢI Ý PHIM (DESKTOP / TABLET) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-ai-concierge"));
              }
            }}
            title="Trợ lý Nana gợi ý phim thông minh"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900/80 hover:bg-zinc-800 text-rose-300 hover:text-white border border-rose-500/30 transition cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Nana AI</span>
          </button>

          {/* NÚT TÌM KIẾM TRÊN MOBILE (BẤM VÀO SẼ MỞ THANH TÌM KIẾM TOÀN MÀN HÌNH CHUYÊN NGHIỆP) */}
          <button
            type="button"
            onClick={toggleSearch}
            aria-label="Tìm kiếm phim"
            className="md:hidden flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 transition cursor-pointer flex-shrink-0 active:scale-95"
          >
            <Search size={16} />
          </button>

          {/* Ô TÌM KIẾM TRÊN DESKTOP & TABLET (INLINE EXPANDING) */}
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
                  if (!hasSearchText && recentSearches.length > 0) {
                    setShowDropdown(true);
                  } else if (suggestions.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                className={`bg-transparent text-white text-sm outline-none transition-all duration-300 ${
                  isSearchOpen
                    ? "w-40 lg:w-48 xl:w-56 ml-2 opacity-100 placeholder:text-gray-400"
                    : "w-0 opacity-0 pointer-events-none"
                }`}
              />

              {isSearchOpen && hasSearchText && (
                <X
                  size={15}
                  className="cursor-pointer text-gray-400 hover:text-white transition ml-1 flex-shrink-0"
                  onClick={clearSearch}
                />
              )}
            </form>

            {/* FLOATING RECENT SEARCHES OR SUGGESTIONS DROPDOWN (DESKTOP) */}
            {showDropdown && (
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

          {/* TRUNG TÂM THÔNG BÁO (NOTIFICATION CENTER - DYNAMIC & REAL-TIME EPISODES) */}
          <div ref={notificationRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !showNotifications;
                setShowNotifications(nextState);
                setHasUnread(false);
                if (nextState && notifications.length === 0) {
                  loadDynamicNotifications(true);
                }
              }}
              title="Thông báo mới"
              aria-label="Thông báo"
              className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 transition cursor-pointer flex-shrink-0 active:scale-95"
            >
              <Bell size={16} className="sm:hidden" />
              <Bell size={18} className="hidden sm:block" />
              {userUnreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-[16px] rounded-full bg-netflix-red text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-lg border border-black animate-pulse">
                  {userUnreadCount > 9 ? "9+" : userUnreadCount}
                </span>
              ) : hasUnread ? (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-netflix-red animate-pulse ring-2 ring-black" />
              ) : null}
            </button>

            {/* NOTIFICATION POPUP DROPDOWN */}
            {showNotifications && (
              <div className="fixed sm:absolute top-[52px] sm:top-full mt-0 sm:mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-[410px] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-zinc-950/98 border border-white/15 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* HEADER */}
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-netflix-red" />
                    <h4 className="text-white font-bold text-sm">Thông Báo</h4>
                    {userUnreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-netflix-red text-white text-[10px] font-black animate-pulse">
                        {userUnreadCount} mới
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadDynamicNotifications(true)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      title="Làm mới thông báo"
                    >
                      <RefreshCw size={13} className={loadingNotifications ? "animate-spin text-netflix-red" : ""} />
                    </button>
                    {user && userUnreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsAsRead(user.uid)}
                        className="text-[11px] text-gray-400 hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer hover:underline"
                        title="Đánh dấu tất cả đã đọc"
                      >
                        <CheckCheck size={13} className="text-emerald-400" />
                        <span>Đã đọc hết</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SEGMENT TABS */}
                <div className="flex items-center gap-1 p-1 mb-2.5 bg-zinc-900/90 rounded-xl border border-white/5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setNotifTab("all")}
                    className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                      notifTab === "all"
                        ? "bg-netflix-red text-white font-bold shadow"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Tất cả ({userNotifications.length + notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifTab("replies")}
                    className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                      notifTab === "replies"
                        ? "bg-netflix-red text-white font-bold shadow"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>💬 Cá nhân</span>
                    {userUnreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifTab("system")}
                    className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                      notifTab === "system"
                        ? "bg-netflix-red text-white font-bold shadow"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    🎬 Phim mới ({notifications.length})
                  </button>
                </div>

                {/* LIST */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto overscroll-contain pr-1 scrollbar-none">
                  {/* DANH SÁCH THÔNG BÁO CÁ NHÂN (BÌNH LUẬN & THEO DÕI) */}
                  {notifTab !== "system" && userNotifications.map((item) => {
                    const isReply = item.type === "comment_reply";
                    const itemAvatar = isReply ? (item.replierAvatar || item.image) : item.image;
                    const initialLetter = (item.replierName || item.title || "U").trim().charAt(0).toUpperCase();

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (user) markNotificationAsRead(user.uid, item.id);
                          setShowNotifications(false);
                          const targetLink =
                            item.link ||
                            (item.movieSlug
                              ? item.commentId
                                ? `/movies/${item.movieSlug}?highlightComment=${item.commentId}#comment-${item.commentId}`
                                : `/movies/${item.movieSlug}#comments`
                              : "/browse");
                          router.push(targetLink);
                        }}
                        className={`flex items-start gap-3 p-3 rounded-2xl transition border cursor-pointer group ${
                          !item.isRead
                            ? isReply
                              ? "bg-blue-950/30 border-blue-500/30 hover:bg-blue-950/45"
                              : "bg-rose-950/30 border-rose-500/30 hover:bg-rose-950/45"
                            : "bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5 hover:border-white/10"
                        }`}
                      >
                        {/* AVATAR TRÒN KHÔNG BỊ TRÀN CHỮ */}
                        <div className="relative flex-shrink-0">
                          {isReply ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 flex items-center justify-center shadow-md ring-1 ring-white/15">
                              {itemAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={itemAvatar}
                                  alt={item.replierName || item.title}
                                  className="w-full h-full object-cover rounded-full"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : null}
                              {!itemAvatar && (
                                <span className="text-white font-black text-sm select-none">{initialLetter}</span>
                              )}
                            </div>
                          ) : (
                            <div className="relative w-10 h-13 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center shadow-md border border-white/15">
                              {itemAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={itemAvatar}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Film size={18} className="text-netflix-red" />
                              )}
                            </div>
                          )}

                          {/* MINI CORNER BADGE */}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-zinc-950 flex items-center justify-center text-white shadow-md ${
                              isReply ? "bg-blue-500" : "bg-rose-500"
                            }`}
                          >
                            {isReply ? (
                              <MessageSquare size={8} className="fill-white text-white" />
                            ) : (
                              <Sparkles size={8} className="fill-white text-white" />
                            )}
                          </div>
                        </div>

                        {/* NỘI DUNG THÔNG BÁO */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5 mb-0.5">
                            <h5 className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                              {isReply ? (item.replierName || "Thành viên") : item.title}
                            </h5>
                            <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                              {formatTimeAgo(item.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] font-medium flex items-center gap-1.5 ${
                              isReply ? "text-blue-400" : "text-rose-400"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                isReply ? "bg-blue-400" : "bg-rose-400"
                              }`}
                            />
                            <span className="truncate">
                              {isReply ? "Đã trả lời bình luận của bạn" : `${item.episodeName || "Tập mới"} đã phát hành!`}
                            </span>
                          </p>
                          <div className="text-xs text-zinc-200 line-clamp-2 mt-1.5 bg-white/[0.06] rounded-xl px-2.5 py-1.5 border border-white/5 leading-relaxed">
                            {item.message}
                          </div>
                        </div>
                        {!item.isRead && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ring-2 ${
                              isReply
                                ? "bg-blue-500 ring-blue-950/50"
                                : "bg-rose-500 ring-rose-950/50"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* DANH SÁCH THÔNG BÁO TỔNG HỢP & TIẾP TỤC XEM */}
                  {notifTab !== "replies" && notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link}
                      onClick={() => setShowNotifications(false)}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 transition border border-white/5 hover:border-white/10 group"
                    >
                      {/* ICON / THUMBNAIL PHIM & LIVE THỂ THAO */}
                      <div className="relative flex-shrink-0">
                        {item.type === "live" ? (
                          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-950/40 border border-white/15">
                            <Flame size={20} className="fill-white animate-pulse" />
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[7px] font-black border border-zinc-950 tracking-wider">
                              LIVE
                            </span>
                          </div>
                        ) : item.image ? (
                          <div className="relative w-10 h-13 rounded-xl overflow-hidden bg-zinc-800 border border-white/15 shadow-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {item.badge && (
                              <span
                                className={`absolute bottom-0 inset-x-0 text-[7px] font-black text-center py-0.5 uppercase tracking-wider ${
                                  item.badgeColor || "bg-netflix-red text-white"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-netflix-red/20 text-netflix-red flex-none border border-netflix-red/30">
                            <Film size={18} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h5 className="text-[13px] text-white font-bold group-hover:text-netflix-red transition-colors truncate">
                            {item.title}
                          </h5>
                          <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="truncate">Cập nhật mới</span>
                        </p>
                        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mt-1">
                          {item.message}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {/* LOADING & EMPTY STATES */}
                  {loadingNotifications && notifications.length === 0 && userNotifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-netflix-red" />
                      <span>Đang kiểm tra cập nhật mới...</span>
                    </div>
                  ) : notifTab === "replies" && userNotifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                      <MessageSquare size={24} className="text-gray-600 mb-1" />
                      <span>Chưa có phản hồi bình luận nào mới</span>
                      <span className="text-[10px] text-gray-500">Bình luận trên các bộ phim để nhận thông báo khi có người trả lời</span>
                    </div>
                  ) : notifTab === "system" && notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                      <Film size={24} className="text-gray-600 mb-1" />
                      <span>Đang nạp cập nhật phim mới...</span>
                    </div>
                  ) : userNotifications.length === 0 && notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                      <Bell size={24} className="text-gray-600 mb-1" />
                      <span>Không có thông báo mới nào</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* BẢNG MÀU CHỦ ĐỀ & GIAO DIỆN (CHẾ ĐỘ SÁNG / TỐI & THEMES) */}
          <div className="hidden sm:block flex-shrink-0">
            <ThemeSwitcher />
          </div>

          {/* USER PROFILE & ĐĂNG NHẬP GOOGLE (DESKTOP / TABLET) */}
          {user ? (
            <div ref={userDropdownRef} className="relative hidden sm:block flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/20 transition cursor-pointer"
                title={user.displayName || user.email || "Tài khoản"}
              >
                <div className="w-7 h-7 rounded-full bg-netflix-red flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden relative flex-shrink-0">
                  <span>{(user.displayName || user.email || "U")[0]}</span>
                  {user.photoURL && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Avatar"}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <ChevronDown size={13} className="text-gray-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-60 bg-zinc-950/95 border border-white/15 rounded-2xl shadow-2xl p-2 z-[100] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                    <p className="text-xs font-bold text-white truncate">
                      {user.displayName || "Thành viên Nanaflix"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Đang đồng bộ Cloud</span>
                    </div>
                  </div>

                  {isUserAdmin(user?.email) && (
                    <Link
                      href="/admin"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 hover:text-amber-300 transition my-1 shadow-sm"
                    >
                      <ShieldCheck size={15} className="text-amber-400" />
                      <span>👑 Bảng Quản Trị (Admin)</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-user-profile-modal"));
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left font-bold"
                  >
                    <User size={14} className="text-rose-400" />
                    <span>🧑 Hồ sơ cá nhân</span>
                  </button>

                  <Link
                    href="/my-list?tab=history"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition"
                  >
                    <History size={14} className="text-netflix-red" />
                    <span>Lịch sử xem phim</span>
                  </Link>

                  <Link
                    href="/my-list?tab=watchlist"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition"
                  >
                    <Bookmark size={14} className="text-amber-400" />
                    <span>Phim đã lưu</span>
                  </Link>

                  <Link
                    href="/my-list?tab=comments"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-white/10 transition font-bold"
                  >
                    <MessageSquare size={14} className="text-rose-400" />
                    <span>Lịch sử bình luận</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-pwa-install"));
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-emerald-400 hover:text-emerald-300 hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <Smartphone size={14} />
                    <span>Cài đặt Ứng dụng App</span>
                  </button>

                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowUserDropdown(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer text-left"
                    >
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-100 active:scale-95 text-gray-950 text-xs font-bold transition shadow-md shadow-white/10 cursor-pointer flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Đăng nhập</span>
            </button>
          )}

          {/* MOBILE MENU TOGGLE (LUÔN NỔI BẬT & DỄ CHẠM TRÊN MOBILE) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
            className="lg:hidden flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer flex-shrink-0 active:scale-95 shadow-sm ml-0.5"
          >
            {isMobileMenuOpen ? (
              <X size={20} className="text-netflix-red" />
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU - GỌN GÀNG, HIỆN ĐẠI & DỄ THAO TÁC TRÊN ĐIỆN THOẠI */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-black/98 backdrop-blur-2xl px-3.5 py-3 animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto shadow-2xl safe-area-bottom overscroll-contain">
          <div className="flex flex-col gap-2">

            {/* TÀI KHOẢN NGƯỜI DÙNG */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              {user ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-netflix-red flex items-center justify-center text-sm font-bold text-white uppercase overflow-hidden relative flex-shrink-0 border-2 border-white/20 shadow-lg">
                      <span>{(user.displayName || user.email || "U")[0]}</span>
                      {user.photoURL && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.photoURL}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {user.displayName || "Thành viên"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("open-user-profile-modal"));
                          window.dispatchEvent(new CustomEvent("open-user-profile"));
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      <User size={13} className="text-red-400 shrink-0" />
                      <span className="truncate">Hồ sơ cá nhân</span>
                    </button>
                    <Link
                      href="/my-list?tab=comments"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      <MessageSquare size={13} className="text-rose-400 shrink-0" />
                      <span className="truncate">Bình luận</span>
                    </Link>
                    {isUserAdmin(user?.email) && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition active:scale-95 shadow-sm"
                      >
                        <ShieldCheck size={13} className="text-amber-400 shrink-0" />
                        <span className="truncate">Admin VIP</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await logout();
                      }}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition active:scale-95 cursor-pointer shadow-sm ${
                        !isUserAdmin(user?.email) ? "col-span-2" : ""
                      }`}
                    >
                      <LogOut size={13} className="shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Đăng nhập để lưu danh sách & đồng bộ thiết bị</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md hover:bg-gray-100 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Đăng nhập với Google</span>
                  </button>
                </div>
              )}
            </div>

            {/* QUICK FEATURE APPS 2x2 GRID */}
            <div className="grid grid-cols-2 gap-2 my-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-pwa-install"));
                  }
                }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-white transition text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-emerald-300 truncate">Cài App PWA</div>
                  <div className="text-[10px] text-zinc-400 truncate">Điện thoại / PC</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-ai-concierge"));
                  }
                }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 text-white transition text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                  <Sparkles size={16} className="text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-purple-300 truncate">Nana AI</div>
                  <div className="text-[10px] text-zinc-400 truncate">Trợ lý gợi ý phim</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-ai-roulette"));
                  }
                }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-white transition text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Dices size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-amber-300 truncate">Roulette</div>
                  <div className="text-[10px] text-zinc-400 truncate">Xoay phim chọn lọc</div>
                </div>
              </button>

              <Link
                href="/my-list?tab=history"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-white/5 text-white transition text-left active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                  <History size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-200 truncate">Lịch sử</div>
                  <div className="text-[10px] text-zinc-400 truncate">Phim vừa xem</div>
                </div>
              </Link>
            </div>

            {/* THÔNG BÁO */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setShowNotifications(true);
              }}
              className="w-full text-xs font-semibold py-2 px-3 text-gray-300 hover:text-white flex items-center justify-between rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 transition text-left cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Bell size={14} className="text-netflix-red" />
                <span>Thông báo</span>
              </div>
              {userUnreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-netflix-red text-white text-[10px] font-bold">
                  {userUnreadCount} mới
                </span>
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
            </button>

            {/* DANH MỤC ĐIỀU HƯỚNG GRID 2 CỘT */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
              {NAV_LINKS.map((link) => {
                const active = isLinkActive(link.type);
                const IconComp = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    prefetch={true}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-xs font-medium py-2 px-2.5 transition-all flex items-center gap-2 rounded-xl ${
                      active
                        ? "text-white font-bold bg-netflix-red/30 border border-netflix-red/40 shadow-sm"
                        : "text-gray-300 hover:text-white bg-white/[0.03] hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    <IconComp
                      size={14}
                      className={
                        active
                          ? "text-netflix-red"
                          : link.isLive
                          ? "text-rose-400 animate-pulse"
                          : "text-gray-400"
                      }
                    />
                    <span className="truncate">{link.name}</span>
                    {link.isLive && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-netflix-red text-white font-black uppercase ml-auto">
                        LIVE
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* THEME SWITCHER */}
            <div className="border-t border-white/10 pt-2 mt-1">
              <ThemeSwitcher isMobileInline={true} />
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
      {/* MODAL ĐĂNG NHẬP GOOGLE */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
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
