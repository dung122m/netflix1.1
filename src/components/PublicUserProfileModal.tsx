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
  Flame,
  ExternalLink,
} from "lucide-react";
import { getUserProfileSupabase } from "@/services/supabaseService";
import { getUserCollections } from "@/services/collectionService";
import { getWatchLevelInfo } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { MovieCollection } from "@/types/collection";
import { toast } from "@/components/Toast";
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
      badges: initialDetail.badges || ["🍿 Mọt Phim Đêm"],
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
          badges: customEv.detail.badges || ["🍿 Mọt Phim Đêm"],
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

  // Khóa cuộn trang khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || !profile) return null;

  const watchMins = profile.watchTimeMinutes || 0;
  const levelInfo = getWatchLevelInfo(watchMins);
  const watchHours = (watchMins / 60).toFixed(1);
  const avatarUrl = profile.customAvatar || profile.photoURL || "";
  const initialLetter = (profile.displayName || "U").trim().charAt(0).toUpperCase();
  const isAdmin = profile.role === "admin";

  const handleCopyProfile = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/?member=${profile.uid}`);
      setCopiedLink(true);
      toast.success("Đã sao chép liên kết trang cá nhân!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return createPortal(
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 scrollbar-thin my-auto"
      >
        {/* Glow hiệu ứng nền */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* NÚT ĐÓNG & CHIA SẺ */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-1.5 z-20">
          <button
            type="button"
            onClick={handleCopyProfile}
            title="Sao chép link hồ sơ"
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer flex-shrink-0"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            title="Đóng"
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PROFILE HEADER BANNER */}
        <div className="relative pt-1 sm:pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 sm:gap-5 px-1 sm:px-0">
            {/* AVATAR TRÒN CÓ VIỀN CẤP ĐỘ VIP */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-600 p-0.5 shadow-xl ring-2 ring-white/20">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={profile.displayName}
                    className="w-full h-full object-cover rounded-full bg-zinc-900"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white font-black text-2xl sm:text-3xl select-none">
                    {initialLetter}
                  </div>
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 shadow-lg bg-zinc-950 ${levelInfo.colorClass}`}
              >
                <span>{levelInfo.badgeIcon}</span>
                <span className="whitespace-nowrap">{levelInfo.levelName}</span>
              </div>
            </div>

            {/* THÔNG TIN TÊN & HUY HIỆU */}
            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-wide break-words text-center sm:text-left">
                  {profile.displayName}
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Quản Trị Viên
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Thành viên
                  </span>
                )}
              </div>

              {/* BIO / GIỚI THIỆU */}
              {profile.bio ? (
                <p className="text-xs sm:text-sm text-zinc-300 italic max-w-md mx-auto sm:mx-0 break-words leading-relaxed text-center sm:text-left">
                  &quot;{profile.bio}&quot;
                </p>
              ) : (
                <p className="text-xs text-zinc-500 text-center sm:text-left">Thành viên chưa thêm lời giới thiệu.</p>
              )}

              {/* HUY HIỆU SỞ HỮU */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                {profile.badges && profile.badges.length > 0 ? (
                  profile.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-white/5 border border-white/10 text-amber-300 shadow-sm whitespace-nowrap flex-shrink-0"
                    >
                      <Award className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>{badge}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-white/5 border border-white/10 text-zinc-400 whitespace-nowrap">
                    🍿 Mọt Phim Đêm
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* THỐNG KÊ NHANH (CARDS) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-0.5 flex flex-col justify-center items-center overflow-hidden">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                Đã Cày
              </span>
            </div>
            <div className="text-base sm:text-xl font-black text-white">{watchHours}h</div>
            <div className="text-[10px] text-zinc-500 truncate max-w-full">{watchMins.toLocaleString()} phút</div>
          </div>

          <div className="p-2 sm:p-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-0.5 flex flex-col justify-center items-center overflow-hidden">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Flame className="w-3.5 h-3.5 flex-shrink-0 fill-amber-400" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                Danh Hiệu
              </span>
            </div>
            <div className="text-xs sm:text-base font-black text-white truncate max-w-full px-1">
              {levelInfo.levelName}
            </div>
            <div className="text-[10px] text-zinc-500 truncate max-w-full">{levelInfo.badgeIcon} Cấp </div>
          </div>

          <div className="p-2 sm:p-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-0.5 flex flex-col justify-center items-center overflow-hidden">
            <div className="flex items-center justify-center gap-1 text-rose-400">
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                Bộ Sưu Tập
              </span>
            </div>
            <div className="text-base sm:text-xl font-black text-white">{collections.length}</div>
            <div className="text-[10px] text-zinc-500 whitespace-nowrap">công khai</div>
          </div>
        </div>

        {/* TABS SELECTOR (TỔNG QUAN & BỘ SƯU TẬP) */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-xs ${activeTab === "overview"
              ? "bg-netflix-red text-white shadow-lg shadow-rose-950/40"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Tổng Quan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-xs ${activeTab === "collections"
              ? "bg-netflix-red text-white shadow-lg shadow-rose-950/40"
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
              <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-200">
                  <Film className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>Gu Thể Loại Yêu Thích</span>
                </div>
                {profile.favoriteGenres && profile.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {profile.favoriteGenres.map((genre, gIdx) => (
                      <span
                        key={gIdx}
                        className="px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 whitespace-nowrap"
                      >
                        🎬 {genre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Thành viên chưa chọn gu thể loại.</p>
                )}
              </div>

              {/* TIẾN TRÌNH CẤP ĐỘ TIẾP THEO */}
              {levelInfo.nextLevelName && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-white/10 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="font-semibold text-zinc-300">
                      Cấp độ tiếp theo: <b className="text-white">{levelInfo.nextLevelName}</b>
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px] sm:text-xs">
                      {watchMins} / {levelInfo.nextMinMinutes} phút
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (watchMins / (levelInfo.nextMinMinutes || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BỘ SƯU TẬP CÔNG KHAI */}
          {activeTab === "collections" && (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {collections.length > 0 ? (
                collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/collection/${col.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/15 hover:bg-zinc-900/80 transition group cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition truncate">
                        {col.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {col.description || "Bộ sưu tập phim yêu thích"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold text-zinc-400">
                      <span className="whitespace-nowrap">{col.movies?.length || 0} phim</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Thành viên chưa có bộ sưu tập công khai nào.
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

