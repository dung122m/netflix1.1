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
  Radio,
  Bookmark,
  X,
} from "lucide-react";
import { NetflixLogo } from "./sites/netflix-3f78535a/vn-d838105b/icons";
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
  { name: "Trang chủ", href: "/browse", type: null, icon: Home, isLive: false },
  { name: "Phim bộ", href: "/browse?type=phim-bo", type: "phim-bo", icon: Tv, isLive: false },
  { name: "Phim lẻ", href: "/browse?type=phim-le", type: "phim-le", icon: Film, isLive: false },
  { name: "Chiếu rạp", href: "/browse?type=phim-chieu-rap", type: "phim-chieu-rap", icon: Clapperboard, isLive: false },
  { name: "Hoạt hình", href: "/browse?type=hoat-hinh", type: "hoat-hinh", icon: Sparkles, isLive: false },
  { name: "TV Shows", href: "/browse?type=tv-shows", type: "tv-shows", icon: Radio, isLive: false, hideOnLg: true },
  { name: "Trực tiếp", href: "/live", type: "live", icon: Flame, isLive: true },
  { name: "Danh sách", href: "/my-list", type: "my-list", icon: Bookmark, isLive: false },
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

  // Prefetch main navigation routes
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
    mainTabs.forEach((tab) => router.prefetch(tab));
  }, [router]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const isLinkActive = useCallback(
    (type: string | null) => {
      if (type === "live") return pathname === "/live";
      if (type === "my-list") return pathname === "/my-list";
      if (pathname !== "/browse") return false;
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
          ? "bg-black/95 backdrop-blur-md border-b border-white/10 shadow-lg py-2.5"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent py-3 sm:py-3.5"
      }`}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto gap-2 sm:gap-4">
        {/* LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-7 flex-shrink-0 min-w-0">
          <Link href="/browse" className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0">
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
          {/* NÚT STUDIO TRỢ LÝ NANA AI (3 TRONG 1) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-nana-ai-studio"));
              }
            }}
            title="Studio Trợ Lý Nana AI (Chat thông minh, Tâm trạng & Bốc quẻ)"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500/15 via-purple-500/15 to-amber-500/15 hover:from-rose-500/25 hover:via-purple-500/25 hover:to-amber-500/25 text-rose-300 hover:text-white border border-rose-500/30 hover:border-purple-400/50 transition cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Nana AI</span>
            <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">Studio</span>
          </button>

          {/* ISOLATED SEARCH BAR COMPONENT */}
          <NavSearchBar
            isSearchExpanded={isSearchExpanded}
            setIsSearchExpanded={setIsSearchExpanded}
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
