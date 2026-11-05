"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  Clock,
  Award,
  Film,
  ShieldCheck,
  Layers,
  Share2,
  Check,
  Crown,
  TrendingUp,
  Bookmark,
  ExternalLink,
} from "lucide-react";
import { getUserProfileSupabase } from "@/services/supabaseService";
import { getUserCollections } from "@/services/collectionService";
import { getWatchLevelInfo } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { MovieCollection } from "@/types/collection";
import { toast } from "@/components/Toast";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { Tooltip } from "@/components/ui/Tooltip";
import Link from "next/link";

export interface PublicProfileDetail {
  userId: string;
  userName?: string;
  userAvatar?: string;
  badges?: string[];
}

export interface PublicUserProfileModalProps {
  initialDetail?: PublicProfileDetail;
}

export function PublicUserProfileModal({ initialDetail }: PublicUserProfileModalProps = {}) {
  const [isOpen, setIsOpen] = useState(Boolean(initialDetail?.userId));
  const [targetUserId, setTargetUserId] = useState<string | null>(initialDetail?.userId || null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (!initialDetail?.userId) return null;
    return {
      uid: initialDetail.userId,
      email: "",
      displayName: initialDetail.userName || "Thành viên Nanaflix",
      photoURL: initialDetail.userAvatar || "",
      customAvatar: initialDetail.userAvatar || "",
      badges: initialDetail.badges || ["Mọt Phim Đêm"],
      role: "member",
      watchTimeMinutes: 0,
      favoriteGenres: [],
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
  });
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "collections">("overview");
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lắng nghe sự kiện mở modal từ mọi nơi trong app
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEv = e as CustomEvent<PublicProfileDetail>;
      if (customEv.detail?.userId) {
        setTargetUserId(customEv.detail.userId);
        // Khởi tạo tạm thời với thông tin có sẵn để UI mở tức thì không chớp
        setProfile({
          uid: customEv.detail.userId,
          email: "",
          displayName: customEv.detail.userName || "Thành viên Nanaflix",
          photoURL: customEv.detail.userAvatar || "",
          customAvatar: customEv.detail.userAvatar || "",
          badges: customEv.detail.badges || ["Mọt Phim Đêm"],
          role: "member",
          watchTimeMinutes: 0,
          favoriteGenres: [],
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        });
        setActiveTab("overview");
        setIsOpen(true);
      }
    };

    window.addEventListener("open-public-profile", handleOpen as EventListener);
    return () => {
      window.removeEventListener("open-public-profile", handleOpen as EventListener);
    };
  }, []);

  // Nạp dữ liệu chi tiết của người dùng từ Supabase
  useEffect(() => {
    if (!isOpen || !targetUserId) return;

    let isCancelled = false;
    setLoading(true);

    // 1. Nạp hồ sơ
    getUserProfileSupabase(targetUserId)
      .then((data) => {
        if (!isCancelled && data) {
          setProfile(data);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    // 2. Nạp bộ sưu tập công khai
    getUserCollections(targetUserId).then((cols) => {
      if (!isCancelled) {
        setCollections(cols.filter((c) => c.isPublic !== false));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetUserId]);

  useBodyScrollLock(isOpen);

  if (!isOpen || !mounted || !profile) return null;

  const watchMins = profile.watchTimeMinutes || 0;
  const levelInfo = getWatchLevelInfo(watchMins);
  const watchHours = (watchMins / 60).toFixed(1);
  const avatarUrl = profile.customAvatar || profile.photoURL || "";
  const isAdmin = profile.role === "admin";

  const handleCopyProfile = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/?member=${profile.uid}`);
      setCopiedLink(true);
      toast.success("Đã sao chép liên kết trang cá nhân!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Helper làm sạch tên badge / thể loại nếu có icon emoji cũ
  const cleanBadgeText = (text: string) => {
    return text.replace(/^[\s🍿🎬👑⚡💎🌟✨🏆🛡️\uD83C-\uDBFF\uDC00-\uDFFF]+/gu, "").trim() || text;
  };

  return createPortal(
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0c0c0e]/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-200 my-auto text-white"
      >
        {/* Glow hiệu ứng nền chuẩn Cinematic Netflix */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-netflix-red/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* NÚT ĐÓNG & CHIA SẺ TRÊN GÓC */}
        <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 flex items-center gap-1.5 z-20">
          <Tooltip content="Sao chép link hồ sơ" side="bottom">
            <button
              type="button"
              onClick={handleCopyProfile}
              aria-label="Sao chép link hồ sơ"
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 transition backdrop-blur-md cursor-pointer active:scale-95 flex-shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </Tooltip>
          <Tooltip content="Đóng" side="bottom">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng"
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 transition backdrop-blur-md cursor-pointer active:scale-95 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* PROFILE HEADER CỰC KỲ SANG TRỌNG */}
        <div className="relative pt-1 sm:pt-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 px-1 sm:px-0 pr-12 sm:pr-0">
            {/* AVATAR TRÒN CÓ VIỀN KÉP & HUY HIỆU CẤP ĐỘ TINH TẾ */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-2 ring-white/15 ring-offset-4 ring-offset-[#0c0c0e] shadow-2xl p-0.5 bg-gradient-to-br from-white/10 via-white/5 to-white/0">
                <UserAvatar
                  src={avatarUrl || undefined}
                  name={profile.displayName}
                  seed={profile.uid || profile.displayName}
                  sizeClassName="w-full h-full text-2xl sm:text-3xl font-black"
                />
              </div>
              {/* Badge cấp độ gài góc avatar */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:-right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/15 flex items-center gap-1 shadow-xl bg-zinc-950/95 backdrop-blur-md text-amber-300 whitespace-nowrap"
              >
                <span>{levelInfo.badgeIcon}</span>
                <span>{levelInfo.levelName}</span>
              </div>
            </div>

            {/* THÔNG TIN TÊN, VAI TRÒ & TIỂU SỬ */}
            <div className="flex-1 min-w-0 space-y-2 w-full pt-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words text-center sm:text-left">
                  {profile.displayName}
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm shadow-red-500/10 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Quản Trị Viên
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-zinc-300 border border-white/10 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Thành viên
                  </span>
                )}
              </div>

              {/* BIO / GIỚI THIỆU */}
              {profile.bio ? (
                <p className="text-xs sm:text-sm text-zinc-300 italic max-w-md mx-auto sm:mx-0 break-words leading-relaxed text-center sm:text-left border-l-2 border-netflix-red/60 pl-2.5 my-1">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-zinc-500 text-center sm:text-left italic">
                  Thành viên chưa thêm lời giới thiệu.
                </p>
              )}

              {/* HUY HIỆU THÀNH VIÊN (BADGES) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                {profile.badges && profile.badges.length > 0 ? (
                  profile.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-amber-200/90 shadow-sm whitespace-nowrap transition-colors"
                    >
                      <Award className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>{cleanBadgeText(badge)}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/10 text-zinc-400 whitespace-nowrap">
                    <Award className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                    <span>Mọt Phim Đêm</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* THỐNG KÊ NHANH (CARDS KÍNH TỐI GIẢN) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* CỘT 1: THỜI GIAN XEM */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-all text-center flex flex-col items-center justify-center gap-1 group">
            <div className="flex items-center justify-center gap-1 text-rose-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Đã Cày
              </span>
            </div>
            <div className="text-base sm:text-xl font-black text-white tracking-tight truncate max-w-full">
              {watchHours}h
            </div>
            <div className="text-[10px] text-zinc-500 truncate max-w-full font-medium">
              {watchMins.toLocaleString()} phút
            </div>
          </div>

          {/* CỘT 2: HẠNG CINEPHILE */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-all text-center flex flex-col items-center justify-center gap-1 group">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Crown className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Hạng
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-amber-300 truncate max-w-full px-0.5">
              {levelInfo.levelName}
            </div>
            <div className="text-[10px] text-zinc-500 truncate max-w-full font-medium">
              Cấp độ cinephile
            </div>
          </div>

          {/* CỘT 3: BỘ SƯU TẬP */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-all text-center flex flex-col items-center justify-center gap-1 group">
            <div className="flex items-center justify-center gap-1 text-indigo-400">
              <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Bộ Sưu Tập
              </span>
            </div>
            <div className="text-base sm:text-xl font-black text-white tracking-tight truncate max-w-full">
              {collections.length}
            </div>
            <div className="text-[10px] text-zinc-500 truncate max-w-full font-medium">
              Công khai
            </div>
          </div>
        </div>

        {/* TABS SELECTOR (TỔNG QUAN & BỘ SƯU TẬP) */}
        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/5 rounded-2xl text-xs font-semibold backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-netflix-red text-white font-bold shadow-lg shadow-netflix-red/25"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Tổng Quan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "collections"
                ? "bg-netflix-red text-white font-bold shadow-lg shadow-netflix-red/25"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Bộ Sưu Tập ({collections.length})</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="space-y-3.5 min-h-[140px]">
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === "overview" && (
            <div className="space-y-3.5">
              {/* GU THỂ LOẠI YÊU THÍCH */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-200">
                  <Film className="w-4 h-4 text-netflix-red flex-shrink-0" />
                  <span>Gu Thể Loại Yêu Thích</span>
                </div>
                {profile.favoriteGenres && profile.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {profile.favoriteGenres.map((genre, gIdx) => (
                      <span
                        key={gIdx}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 hover:border-netflix-red/40 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-netflix-red/80 flex-shrink-0" />
                        <span>{cleanBadgeText(genre)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Thành viên chưa chọn gu thể loại yêu thích.</p>
                )}
              </div>

              {/* TIẾN TRÌNH CẤP ĐỘ TIẾP THEO */}
              {levelInfo.nextLevelName && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                      <TrendingUp className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>Mục tiêu tiếp theo:</span>
                      <span className="font-bold text-white">{levelInfo.nextLevelName}</span>
                    </div>
                    <span className="text-zinc-400 font-mono tabular-nums text-[11px] sm:text-xs">
                      {watchMins.toLocaleString()} / {levelInfo.nextMinMinutes?.toLocaleString()} phút
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(229,9,20,0.5)]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (watchMins / (levelInfo.nextMinMinutes || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  {levelInfo.nextMinMinutes && levelInfo.nextMinMinutes > watchMins && (
                    <div className="text-[10.5px] text-zinc-500 text-right">
                      Còn {(levelInfo.nextMinMinutes - watchMins).toLocaleString()} phút để thăng hạng
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BỘ SƯU TẬP CÔNG KHAI */}
          {activeTab === "collections" && (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              {collections.length > 0 ? (
                collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/collection/${col.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all group cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                        {col.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {col.description || "Bộ sưu tập phim yêu thích"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 whitespace-nowrap">
                        {col.movies?.length || 0} phim
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-400">
                    <Bookmark className="w-5 h-5 opacity-60" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">Chưa có bộ sưu tập công khai nào</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs">
                    Khi người dùng này tạo và chia sẻ bộ sưu tập, bạn sẽ có thể khám phá danh sách tại đây.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PublicUserProfileModal;
