"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tv, Sparkles, Bookmark, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (p) => {
      if (p) setUserProfile(p);
    });
    return () => unsub();
  }, [user?.uid]);

  const effectiveAvatar = userProfile?.customAvatar || userProfile?.photoURL || user?.photoURL || "";
  const effectiveDisplayName = userProfile?.displayName || user?.displayName || "";

  // Ẩn bottom nav trong trang admin để tối đa diện tích làm việc
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const isHome = pathname === "/" || pathname === "/browse";
  const isLive = pathname?.startsWith("/live");
  const isMyList = pathname?.startsWith("/my-list");

  const handleOpenAi = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-ai-concierge"));
    }
  };

  const handleOpenProfile = () => {
    if (typeof window !== "undefined") {
      if (user) {
        window.dispatchEvent(new CustomEvent("open-user-profile-modal"));
        window.dispatchEvent(new CustomEvent("open-user-profile"));
      } else {
        // Mở popup đăng nhập
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
      }
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-zinc-950 border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {/* 1. TRANG CHỦ */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer ${
            isHome ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Home size={19} strokeWidth={isHome ? 2.5 : 2} />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-netflix-red rounded-full shadow-[0_0_8px_#E50914]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Trang chủ</span>
        </Link>

        {/* 2. TRỰC TIẾP LIVE */}
        <Link
          href="/live"
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer ${
            isLive ? "text-rose-500 font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Tv size={19} strokeWidth={isLive ? 2.5 : 2} />
            <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Trực tiếp</span>
        </Link>

        {/* 3. NANA AI (Nút trung tâm nổi bật) */}
        <button
          type="button"
          onClick={handleOpenAi}
          className="flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-90 cursor-pointer group"
          aria-label="Hỏi Nana AI"
        >
          <div className="w-9 h-9 -mt-3 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-[0_0_16px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform border-2 border-zinc-950">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-300 tracking-tight">
            Hỏi Nana
          </span>
        </button>

        {/* 4. DANH SÁCH & LỊCH SỬ */}
        <Link
          href="/my-list"
          className={`flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer ${
            isMyList ? "text-netflix-red font-bold" : "text-zinc-400 hover:text-zinc-200 font-medium"
          }`}
        >
          <div className="relative">
            <Bookmark size={19} strokeWidth={isMyList ? 2.5 : 2} />
            {isMyList && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-netflix-red rounded-full shadow-[0_0_8px_#E50914]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Danh sách</span>
        </Link>

        {/* 5. HỒ SƠ / TÀI KHOẢN */}
        <button
          type="button"
          onClick={handleOpenProfile}
          className="flex flex-col items-center justify-center h-full text-zinc-400 hover:text-zinc-200 font-medium transition-all duration-200 active:scale-95 cursor-pointer"
          aria-label="Tài khoản"
        >
          {user ? (
            <UserAvatar
              src={effectiveAvatar || undefined}
              name={effectiveDisplayName || user.email}
              sizeClassName="w-5 h-5 text-[10px]"
              className="border border-white/30"
            />
          ) : (
            <User size={19} />
          )}
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[56px]">
            {user ? (effectiveDisplayName ? effectiveDisplayName.split(" ").pop() : "Tài khoản") : "Tài khoản"}
          </span>
        </button>
      </div>
    </nav>
  );
}
