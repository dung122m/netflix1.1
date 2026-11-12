"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Tv, Bookmark, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserProfile, getCachedUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function BottomNav() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { user, cachedUser } = useAuth();
  const currentUser = user || cachedUser;
  const activeUid = user?.uid || cachedUser?.uid;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined" && activeUid) {
      return getCachedUserProfile(activeUid);
    }
    return null;
  });

  useEffect(() => {
    if (!activeUid) {
      setUserProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(activeUid, (p) => {
      if (!p) return;
      setUserProfile((prev) => {
        if (
          prev &&
          prev.customAvatar === p.customAvatar &&
          prev.photoURL === p.photoURL &&
          prev.displayName === p.displayName
        ) {
          return prev;
        }
        return p;
      });
    });
    return () => unsub();
  }, [activeUid]);

  const effectiveAvatar =
    userProfile?.customAvatar ||
    userProfile?.photoURL ||
    user?.photoURL ||
    cachedUser?.photoURL ||
    "";
  const effectiveDisplayName =
    userProfile?.displayName ||
    user?.displayName ||
    cachedUser?.displayName ||
    "";
  const effectiveEmail = user?.email || cachedUser?.email || "";

  // Ẩn bottom nav trong trang admin để tối đa diện tích làm việc
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const isHome = pathname === "/";
  const isBrowse = pathname?.startsWith("/browse");
  const isLive = pathname?.startsWith("/live");
  const isMyList = pathname?.startsWith("/my-list");
  const isProfile = pathname?.startsWith("/profile");

  const handleNavClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("close-all-modals"));
    }
  };

  const handleOpenAuth = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("close-all-modals"));
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-zinc-950/95 backdrop-blur-lg shadow-[0_-8px_30px_rgba(0,0,0,0.85)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {/* 1. TRANG CHỦ */}
        <Link
          href="/"
          onClick={handleNavClick}
          aria-current={isHome ? "page" : undefined}
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:text-white rounded-lg ${
            isHome ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Home size={19} strokeWidth={isHome ? 2.5 : 2} aria-hidden="true" />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-netflix-red rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight">Trang chủ</span>
        </Link>

        {/* 2. KHÁM PHÁ BROWSE */}
        <Link
          href="/browse"
          onClick={handleNavClick}
          aria-current={isBrowse ? "page" : undefined}
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:text-white rounded-lg ${
            isBrowse ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Compass size={19} strokeWidth={isBrowse ? 2.5 : 2} aria-hidden="true" />
            {isBrowse && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-netflix-red rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight">Khám phá</span>
        </Link>

        {/* 3. TRỰC TIẾP LIVE */}
        <Link
          href="/live"
          onClick={handleNavClick}
          aria-current={isLive ? "page" : undefined}
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:text-white rounded-lg ${
            isLive ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Tv size={19} strokeWidth={isLive ? 2.5 : 2} aria-hidden="true" />
            <span className="absolute -top-1 -right-1.5 inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight">Trực tiếp</span>
        </Link>

        {/* 4. DANH SÁCH & LỊCH SỬ */}
        <Link
          href="/my-list"
          onClick={handleNavClick}
          aria-current={isMyList ? "page" : undefined}
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:text-white rounded-lg ${
            isMyList ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Bookmark size={19} strokeWidth={isMyList ? 2.5 : 2} aria-hidden="true" />
            {isMyList && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-netflix-red rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight">Danh sách</span>
        </Link>

        {/* 5. HỒ SƠ / TÀI KHOẢN */}
        {isMounted && currentUser ? (
          <Link
            href="/profile"
            onClick={handleNavClick}
            aria-current={isProfile ? "page" : undefined}
            className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:text-white rounded-lg ${
              isProfile ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
            }`}
            aria-label="Tài khoản cá nhân"
          >
            <div className="relative">
              <UserAvatar
                src={effectiveAvatar || undefined}
                name={effectiveDisplayName || effectiveEmail}
                sizeClassName="w-5 h-5 text-[10px]"
                className={isProfile ? "ring-2 ring-netflix-red" : ""}
              />
              {isProfile && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-netflix-red rounded-full" />
              )}
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight">
              {effectiveDisplayName ? effectiveDisplayName.split(" ").pop() : "Tài khoản"}
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleOpenAuth}
            className="flex flex-col items-center justify-center h-full text-zinc-400 hover:text-zinc-200 font-medium transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:text-white rounded-lg"
            aria-label="Đăng nhập tài khoản"
          >
            <User size={19} />
            <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight">
              Tài khoản
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
