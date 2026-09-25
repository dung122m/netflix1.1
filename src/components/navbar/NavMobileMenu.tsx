"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  MessageSquare,
  ShieldCheck,
  LogOut,
  Smartphone,
  Sparkles,
  Dices,
  History,
  Bell,
  ChevronRight,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/lib/adminConfig";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ThemeSwitcher } from "../ThemeSwitcher";
import { getVietnamTodayEvent } from "@/lib/vietnamCalendar";

interface NavLinkItem {
  name: string;
  href: string;
  type: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  isLive: boolean;
  hideOnLg?: boolean;
}

interface NavMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: () => void;
  onOpenNotifications: () => void;
  navLinks: NavLinkItem[];
  isLinkActive: (type: string | null) => boolean;
  userUnreadCount: number;
}

export const NavMobileMenu: React.FC<NavMobileMenuProps> = React.memo(function NavMobileMenu({
  isOpen,
  onClose,
  onOpenAuthModal,
  onOpenNotifications,
  navLinks,
  isLinkActive,
  userUnreadCount,
}) {
  const { user, logout } = useAuth();
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

  const hasHistoricalToday = React.useMemo(() => {
    try {
      const today = getVietnamTodayEvent();
      return Boolean(today.historicalEventsToday && today.historicalEventsToday.length > 0);
    } catch {
      return false;
    }
  }, []);

  if (!isOpen) return null;

  const effectiveAvatar = userProfile?.customAvatar || userProfile?.photoURL || user?.photoURL || "";
  const effectiveDisplayName = userProfile?.displayName || user?.displayName || "Hồ sơ";

  return (
    <div className="lg:hidden border-t border-white/10 bg-black/98 backdrop-blur-2xl px-3.5 py-3 animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto shadow-2xl safe-area-bottom overscroll-contain">
      <div className="flex flex-col gap-2">
        {/* TÀI KHOẢN NGƯỜI DÙNG */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
          {user ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={effectiveAvatar || undefined}
                  name={effectiveDisplayName || user.email}
                  sizeClassName="w-10 h-10 text-sm font-bold"
                  className="border-2 border-white/20 shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {effectiveDisplayName}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-user-profile-modal"));
                      window.dispatchEvent(new CustomEvent("open-user-profile"));
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <User size={13} className="text-red-400 shrink-0" />
                  <span className="truncate">Hồ sơ</span>
                </button>
                <Link
                  href="/my-list?tab=comments"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <MessageSquare size={13} className="text-rose-400 shrink-0" />
                  <span className="truncate">Bình luận</span>
                </Link>
                {isUserAdmin(user?.email) && (
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition active:scale-95 shadow-sm"
                  >
                    <ShieldCheck size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">Admin</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    onClose();
                    await logout();
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition active:scale-95 cursor-pointer shadow-sm ${!isUserAdmin(user?.email) ? "col-span-2" : ""
                    }`}
                >
                  <LogOut size={13} className="shrink-0" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-2">Đăng nhập để lưu tiến trình & đồng bộ xem phim</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
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
          {/* CARD 1: CHAT TÌM PHIM AI */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("open-nana-ai-studio", {
                    detail: { tab: "concierge" },
                  })
                );
              }
            }}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-rose-500/15 border border-purple-500/30 hover:border-pink-500/40 text-white transition text-left active:scale-[0.98] cursor-pointer shadow-sm shadow-purple-950/30"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center shrink-0 border border-pink-500/30 shadow-inner">
              <Sparkles size={18} className="text-pink-300 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-pink-300 truncate">Hỏi Nana</div>
              <div className="text-[10px] text-zinc-400 truncate">Trợ lý AI</div>
            </div>
          </button>

          {/* CARD 2: BỐC QUẺ PHIM ĐỊNH MỆNH */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("open-nana-ai-studio", {
                    detail: { tab: "roulette" },
                  })
                );
              }
            }}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/30 hover:border-orange-500/40 text-white transition text-left active:scale-[0.98] cursor-pointer shadow-sm shadow-amber-950/30"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
              <Dices size={18} className="text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-amber-300 truncate">Bốc quẻ</div>
              <div className="text-[10px] text-zinc-400 truncate">Vòng quay phim</div>
            </div>
          </button>

          {/* CARD 3: CÀI APP PWA */}
          <button
            type="button"
            onClick={() => {
              onClose();
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
              <div className="text-xs font-bold text-emerald-300 truncate">Cài đặt App</div>
              <div className="text-[10px] text-zinc-400 truncate">Mobile & PC</div>
            </div>
          </button>

          {/* CARD 4: LỊCH SỬ XEM */}
          <Link
            href="/my-list?tab=history"
            onClick={onClose}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-white/5 text-white transition text-left active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
              <History size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-200 truncate">Lịch sử xem</div>
              <div className="text-[10px] text-zinc-400 truncate">Phim đã xem gần đây</div>
            </div>
          </Link>
        </div>

        {/* 📜 NGÀY NÀY TRONG LỊCH SỬ VIỆT NAM (MOBILE) */}
        {hasHistoricalToday && (
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("open-vietnam-today-modal", {
                    detail: { tab: "history" },
                  })
                );
              }
            }}
            className="w-full text-xs font-semibold py-2 px-3 text-amber-200 hover:text-white flex items-center justify-between rounded-xl bg-gradient-to-r from-red-950/40 to-amber-950/30 hover:bg-red-900/30 border border-red-500/30 transition text-left cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">📜</span>
              <span>Ngày này trong lịch sử Việt Nam</span>
            </div>
            <ChevronRight size={14} className="text-amber-400" />
          </button>
        )}

        {/* THÔNG BÁO */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenNotifications();
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
          {navLinks.map((link) => {
            const active = isLinkActive(link.type);
            const IconComp = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                onClick={onClose}
                className={`text-xs font-medium py-2 px-2.5 transition-all flex items-center gap-2 rounded-xl ${active
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

        {/* THEME & ABOUT NANAFLIX */}
        <div className="border-t border-white/10 pt-2 mt-1 flex flex-col gap-2">
          <Link
            href="/about"
            onClick={onClose}
            className="text-xs font-semibold py-2 px-3 text-zinc-300 hover:text-white flex items-center justify-between rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 transition"
          >
            <div className="flex items-center gap-2.5">
              <Info size={14} className="text-cyan-400" />
              <span>Giới thiệu Nanaflix</span>
            </div>
            <ChevronRight size={14} className="text-gray-500" />
          </Link>
          <ThemeSwitcher isMobileInline={true} />
        </div>
      </div>
    </div>
  );
});
