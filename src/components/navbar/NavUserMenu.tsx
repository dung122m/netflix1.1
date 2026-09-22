"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ShieldCheck,
  User,
  History,
  Bookmark,
  MessageSquare,
  Smartphone,
  LogOut,
  Heart,
  Sliders,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/lib/adminConfig";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";

interface NavUserMenuProps {
  onOpenAuthModal: () => void;
}

export const NavUserMenu: React.FC<NavUserMenuProps> = React.memo(function NavUserMenu({
  onOpenAuthModal,
}) {
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsubProfile = subscribeUserProfile(user.uid, (p) => {
      if (p) setUserProfile(p);
    });
    return () => unsubProfile();
  }, [user?.uid]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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

  const effectiveAvatar = userProfile?.customAvatar || userProfile?.photoURL || user?.photoURL || "";
  const effectiveDisplayName = userProfile?.displayName || user?.displayName || "Thành viên Nanaflix";

  if (!user) {
    return (
      <button
        type="button"
        onClick={onOpenAuthModal}
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
    );
  }

  return (
    <div ref={userDropdownRef} className="relative hidden sm:block flex-shrink-0">
      <button
        type="button"
        onClick={() => setShowUserDropdown(!showUserDropdown)}
        className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/20 transition cursor-pointer"
        title={effectiveDisplayName || user.email || "Tài khoản"}
      >
        <div className="w-7 h-7 rounded-full bg-netflix-red flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden relative flex-shrink-0">
          <span>{(effectiveDisplayName || user.email || "U")[0]}</span>
          {effectiveAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effectiveAvatar}
              alt={effectiveDisplayName || "Avatar"}
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
              {effectiveDisplayName}
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
                window.dispatchEvent(new CustomEvent("open-user-profile-modal", { detail: { tab: "profile" } }));
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left font-bold"
          >
            <User size={14} className="text-rose-400" />
            <span>🧑 Hồ sơ & Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowUserDropdown(false);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-user-profile-modal", { detail: { tab: "player_settings" } }));
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left font-medium"
          >
            <Sliders size={14} className="text-amber-400" />
            <span>⚙️ Cài đặt phát lại Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowUserDropdown(false);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-user-profile-modal", { detail: { tab: "followed_actors" } }));
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left font-medium"
          >
            <Heart size={14} className="text-rose-400" />
            <span>⭐ Diễn viên yêu thích</span>
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
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition"
          >
            <MessageSquare size={14} className="text-emerald-400" />
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
  );
});
