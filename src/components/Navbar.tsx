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
  Bookmark,
  Compass,
  X,
} from "lucide-react";
import { NanaflixBrandLogo } from "@/components/NetflixLogo";
import { NavSearchBar } from "./navbar/NavSearchBar";
import { NavNotifications } from "./navbar/NavNotifications";
import { NavUserMenu } from "./navbar/NavUserMenu";
import { AccentStudio } from "./navbar/AccentStudio";
import { NavMobileMenu } from "./navbar/NavMobileMenu";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserNotifications } from "@/services/notificationService";

const AuthModal = dynamic(
  () => import("./AuthModal").then((mod) => mod.AuthModal),
  { ssr: false }
);

const SPECIFIC_BROWSE_TYPES = ["phim-bo", "phim-le", "phim-chieu-rap", "hoat-hinh"];

const NAV_LINKS = [
  { name: "Trang chủ", href: "/", type: null, icon: Home, isLive: false },
  { name: "Phim bộ", href: "/browse?type=phim-bo", type: "phim-bo", icon: Tv, isLive: false },
  { name: "Phim lẻ", href: "/browse?type=phim-le", type: "phim-le", icon: Film, isLive: false },
  { name: "Chiếu rạp", href: "/browse?type=phim-chieu-rap", type: "phim-chieu-rap", icon: Clapperboard, isLive: false },
  { name: "Hoạt hình", href: "/browse?type=hoat-hinh", type: "hoat-hinh", icon: Sparkles, isLive: false },
  { name: "Kho phim", href: "/browse", type: "kho-phim", icon: Compass, isLive: false },
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

  const handleOpenMobileSearch = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleOpenAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleEmptyNotifications = useCallback(() => {}, []);

  const isLinkActive = useCallback(
    (type: string | null) => {
      if (type === "live") return pathname === "/live";
      if (type === "my-list") return pathname === "/my-list";
      if (pathname !== "/" && pathname !== "/browse") return false;
      if (urlKeyword && type !== "kho-phim") return false;
      if (type === null) return pathname === "/" && !currentType && !urlKeyword;
      if (type === "kho-phim") {
        return (
          pathname === "/browse" &&
          (!currentType || !SPECIFIC_BROWSE_TYPES.includes(currentType))
        );
      }
      return pathname === "/browse" && currentType === type;
    },
    [pathname, currentType, urlKeyword]
  );

  return (
    <nav
      className={`nanaflix-navbar fixed top-0 left-0 right-0 w-full z-50 transition-[background-color,box-shadow,padding-top,padding-bottom] duration-300 ${
        showBackground || isMobileMenuOpen
          ? "bg-zinc-950/95 backdrop-blur-md shadow-lg shadow-black/60 py-1.5 sm:py-2"
          : "bg-black/80 backdrop-blur-md sm:bg-gradient-to-b sm:from-black/90 sm:via-black/50 sm:to-transparent py-1.5 sm:py-2.5"
      }`}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto gap-2 sm:gap-4 relative z-10 w-full min-h-[44px] sm:min-h-[48px]">
        {/* LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-7 flex-shrink-0 min-w-0">
          <Link
            href="/"
            prefetch={false}
            onMouseEnter={() => router.prefetch("/")}
            onFocus={() => router.prefetch("/")}
            className="flex items-center group flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
            title="Nanaflix - Trang Chủ"
          >
            <NanaflixBrandLogo />
          </Link>

          {/* DESKTOP NAV LINKS */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4.5 text-xs xl:text-sm font-semibold flex-shrink-0">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.type);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => router.prefetch(link.href)}
                  onFocus={() => router.prefetch(link.href)}
                  className={`transition-all relative py-1 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md ${
                    active
                      ? "text-white font-bold light-nav-active"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <span className="whitespace-nowrap">{link.name}</span>
                  {link.isLive && (
                    <span className="relative flex h-2 w-2 flex-shrink-0 ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-netflix-red" />
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
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0 text-white">

          {/* ISOLATED SEARCH BAR COMPONENT */}
          <NavSearchBar
            isSearchExpanded={isSearchExpanded}
            setIsSearchExpanded={setIsSearchExpanded}
            onOpenMobileSearch={handleOpenMobileSearch}
          />

          {/* ACCENT STUDIO COMPACT (ĐỔI MÀU GIAO DIỆN) */}
          <AccentStudio />

          {/* ISOLATED NOTIFICATION CENTER */}
          <NavNotifications />

          {/* ISOLATED USER MENU */}
          <NavUserMenu onOpenAuthModal={handleOpenAuthModal} />

          {/* MOBILE MENU TOGGLE */}
          <button
            type="button"
            onClick={handleToggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            className="lg:hidden flex items-center justify-center h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex-shrink-0 active:scale-95 shadow-sm ml-0.5"
          >
            {isMobileMenuOpen ? (
              <X size={20} className="text-netflix-red" aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ISOLATED MOBILE DRAWER */}
      <NavMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={handleCloseMobileMenu}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenNotifications={handleEmptyNotifications}
        navLinks={NAV_LINKS}
        isLinkActive={isLinkActive}
        userUnreadCount={unreadCount}
      />

      {/* GOOGLE AUTH MODAL */}
      <AuthModal isOpen={showAuthModal} onClose={handleCloseAuthModal} />
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
