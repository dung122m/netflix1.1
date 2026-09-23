"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Menu,
  Film,
  Flame,
  Home,
  Tv,
  Clapperboard,
  Sparkles,
  Dices,
  Radio,
  Bookmark,
  X,
} from "lucide-react";
import { NetflixLogo } from "@/components/NetflixLogo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { NavSearchBar } from "./navbar/NavSearchBar";
import { NavNotifications } from "./navbar/NavNotifications";
import { NavUserMenu } from "./navbar/NavUserMenu";
import { NavMobileMenu } from "./navbar/NavMobileMenu";
import { NavHotkeyModal } from "./navbar/NavHotkeyModal";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserNotifications } from "@/services/notificationService";

const AuthModal = dynamic(
  () => import("./AuthModal").then((mod) => mod.AuthModal),
  { ssr: false }
);

const NAV_LINKS = [
  { name: "Trang chủ", href: "/", type: null, icon: Home, isLive: false },
  { name: "Phim bộ", href: "/?type=phim-bo", type: "phim-bo", icon: Tv, isLive: false },
  { name: "Phim lẻ", href: "/?type=phim-le", type: "phim-le", icon: Film, isLive: false },
  { name: "Chiếu rạp", href: "/?type=phim-chieu-rap", type: "phim-chieu-rap", icon: Clapperboard, isLive: false },
  { name: "Hoạt hình", href: "/?type=hoat-hinh", type: "hoat-hinh", icon: Sparkles, isLive: false },
  { name: "TV Shows", href: "/?type=tv-shows", type: "tv-shows", icon: Radio, isLive: false, hideOnLg: true },
  { name: "Trực tiếp", href: "/live", type: "live", icon: Flame, isLive: true },
  { name: "Danh sách của tôi", href: "/my-list", type: "my-list", icon: Bookmark, isLive: false },
];

const NavbarInner: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");
  const urlKeyword = searchParams.get("keyword") || "";

  const [showBackground, setShowBackground] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showHotkeyModal, setShowHotkeyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe unread notification count for mobile menu badges
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeUserNotifications(user.uid, (items) => {
      const count = items.filter((n) => !n.isRead).length;
      setUnreadCount(count);
    });
    return () => unsub();
  }, [user?.uid]);

  // Handle background transition on scroll
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

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const isLinkActive = useCallback(
    (type: string | null) => {
      if (type === "live") return pathname === "/live";
      if (type === "my-list") return pathname === "/my-list";
      if (pathname !== "/" && pathname !== "/browse") return false;
      if (urlKeyword) return false;
      if (type === null) return !currentType;
      return currentType === type;
    },
    [pathname, currentType, urlKeyword]
  );

  return (
    <nav
      className={`nanaflix-navbar fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
        showBackground
          ? "bg-black/95 backdrop-blur-sm border-b border-white/10 shadow-lg py-2.5"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent py-3 sm:py-3.5"
      }`}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto gap-2 sm:gap-4">
        {/* LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-7 flex-shrink-0 min-w-0">
          <Link
            href="/"
            prefetch={false}
            onMouseEnter={() => router.prefetch("/")}
            onFocus={() => router.prefetch("/")}
            className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
          >
            <NetflixLogo className="w-5 sm:w-6 h-auto transition-transform group-hover:scale-105" />
            <span className="text-netflix-red font-black tracking-tighter text-lg sm:text-xl inline-block">
              NANAFLIX
            </span>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <div className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-xs xl:text-sm font-semibold flex-shrink-0">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.type);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={false}
                  onMouseEnter={() => router.prefetch(link.href)}
                  onFocus={() => router.prefetch(link.href)}
                  className={`transition-all relative py-1 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md ${
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
          {/* CỤM 2 TABS NANA AI TRÊN NAVBAR */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* 1. NÚT CHAT & TÌM PHIM NANA AI */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("open-nana-ai-studio", {
                      detail: { tab: "concierge" },
                    })
                  );
                }
              }}
              title="Hỏi Nana AI (Chat & Tìm Phim Thông Minh)"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-rose-500/20 hover:from-purple-500/35 hover:via-pink-500/35 hover:to-rose-500/35 text-pink-300 hover:text-white border border-pink-500/35 hover:border-pink-400/60 transition-all cursor-pointer shadow-sm shadow-purple-950/40 active:scale-95 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-pink-400 animate-pulse flex-shrink-0" />
              <span className="hidden sm:inline">Hỏi Nana</span>
            </button>

            {/* 2. NÚT BỐC QUẺ ĐỊNH MỆNH */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("open-nana-ai-studio", {
                      detail: { tab: "roulette" },
                    })
                  );
                }
              }}
              title="Bốc Quẻ Phim Định Mệnh"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/35 hover:via-orange-500/35 hover:to-rose-500/35 text-amber-300 hover:text-white border border-amber-500/35 hover:border-amber-400/60 transition-all cursor-pointer shadow-sm shadow-amber-950/40 active:scale-95 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <Dices className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400 flex-shrink-0" />
              <span className="hidden sm:inline">Bốc quẻ</span>
            </button>
          </div>

          {/* ISOLATED SEARCH BAR COMPONENT */}
          <NavSearchBar
            isSearchExpanded={isSearchExpanded}
            setIsSearchExpanded={setIsSearchExpanded}
            onOpenMobileSearch={() => setIsMobileMenuOpen(false)}
          />

          {/* ISOLATED NOTIFICATION CENTER */}
          <NavNotifications />

          {/* THEME SWITCHER */}
          <div className="hidden sm:block flex-shrink-0">
            <ThemeSwitcher />
          </div>

          {/* ISOLATED USER MENU */}
          <NavUserMenu onOpenAuthModal={() => setShowAuthModal(true)} />

          {/* MOBILE MENU TOGGLE */}
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

      {/* ISOLATED MOBILE DRAWER */}
      <NavMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenNotifications={() => {}}
        navLinks={NAV_LINKS}
        isLinkActive={isLinkActive}
        userUnreadCount={unreadCount}
      />

      {/* ISOLATED HOTKEY MODAL */}
      <NavHotkeyModal
        isOpen={showHotkeyModal}
        onClose={() => setShowHotkeyModal(false)}
      />

      {/* GOOGLE AUTH MODAL */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </nav>
  );
};

function NavbarWithSuspense() {
  return (
    <Suspense fallback={null}>
      <NavbarInner />
    </Suspense>
  );
}

export { NavbarWithSuspense as Navbar };
export default NavbarWithSuspense;
