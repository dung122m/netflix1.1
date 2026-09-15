"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  Clock,
  MessageSquare,
  Award,
  Film,
  Calendar,
  ShieldCheck,
  Star,
  ExternalLink,
  Layers,
  Heart,
  Share2,
  Check,
} from "lucide-react";
import { getUserProfileSupabase } from "@/services/supabaseService";
import { subscribeUserComments } from "@/services/commentService";
import { getUserCollections } from "@/services/collectionService";
import { getWatchLevelInfo } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { MovieComment } from "@/types/comment";
import { MovieCollection } from "@/types/collection";
import { StarRating } from "@/components/MovieReviews/StarRating";
import { toast } from "@/components/Toast";
import Link from "next/link";

export interface PublicProfileDetail {
  userId: string;
  userName?: string;
  userAvatar?: string;
  badges?: string[];
}

export function PublicUserProfileModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "collections">("overview");
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

    // 2. Nạp bình luận / đánh giá công khai
    const unsubComments = subscribeUserComments(targetUserId, (items) => {
      if (!isCancelled) {
        // Chỉ lấy các đánh giá gốc có nội dung
        setComments(items.filter((c) => !c.parentId));
      }
    });

    // 3. Nạp bộ sưu tập công khai
    getUserCollections(targetUserId).then((cols) => {
      if (!isCancelled) {
        setCollections(cols.filter((c) => c.isPublic !== false));
      }
    });

    return () => {
      isCancelled = true;
      unsubComments();
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
      navigator.clipboard.writeText(`${window.location.origin}/browse?member=${profile.uid}`);
      setCopiedLink(true);
      toast.success("Đã sao chép liên kết trang cá nhân!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 sm:p-7 shadow-2xl space-y-6 scrollbar-thin">
        
        {/* NÚT ĐÓNG & CHIA SẺ */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={handleCopyProfile}
            title="Sao chép link hồ sơ"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PROFILE HEADER BANNER */}
        <div className="relative pt-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* AVATAR TRÒN CÓ VIỀN CẤP ĐỘ VIP */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-600 p-0.5 shadow-xl ring-2 ring-white/20">
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
                <span className="hidden sm:inline">{levelInfo.levelName}</span>
              </div>
            </div>

            {/* THÔNG TIN TÊN & HUY HIỆU */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {profile.displayName}
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Quản Trị Viên
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Thành viên
                  </span>
                )}
              </div>

              {/* BIO / GIỚI THIỆU */}
              {profile.bio ? (
                <p className="text-xs sm:text-sm text-zinc-300 italic max-w-md">
                  &quot;{profile.bio}&quot;
                </p>
              ) : (
                <p className="text-xs text-zinc-500">Thành viên chưa thêm lời giới thiệu.</p>
              )}

              {/* HUY HIỆU SỞ HỮU */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                {profile.badges && profile.badges.length > 0 ? (
                  profile.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-amber-300 shadow-sm"
                    >
                      <Award className="w-3 h-3 text-amber-400" />
                      <span>{badge}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-zinc-400">
                    🍿 Mọt Phim Đêm
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* THỐNG KÊ NHANH (CARDS) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Đã Cày
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">{watchHours}h</div>
            <div className="text-[10px] text-zinc-500">{watchMins.toLocaleString()} phút</div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-blue-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Đánh Giá
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">{comments.length}</div>
            <div className="text-[10px] text-zinc-500">bình luận phim</div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-rose-400">
              <Layers className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Bộ Sưu Tập
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">{collections.length}</div>
            <div className="text-[10px] text-zinc-500">công khai</div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-netflix-red text-white shadow-lg"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tổng Quan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "reviews"
                ? "bg-netflix-red text-white shadow-lg"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Đánh Giá ({comments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "collections"
                ? "bg-netflix-red text-white shadow-lg"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bộ Sưu Tập ({collections.length})</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="space-y-4 min-h-[160px]">
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* GU THỂ LOẠI YÊU THÍCH */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                  <Film className="w-4 h-4 text-rose-400" />
                  <span>Gu Thể Loại Yêu Thích</span>
                </div>
                {profile.favoriteGenres && profile.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.favoriteGenres.map((genre, gIdx) => (
                      <span
                        key={gIdx}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20"
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
                <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      Cấp độ tiếp theo: <b className="text-white">{levelInfo.nextLevelName}</b>
                    </span>
                    <span className="text-zinc-400 font-mono">
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

          {/* TAB 2: CÁC ĐÁNH GIÁ PHIM ĐÃ ĐĂNG */}
          {activeTab === "reviews" && (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/15 transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/movies/${c.movieSlug}#comment-${c.id}`}
                        onClick={() => setIsOpen(false)}
                        className="text-xs sm:text-sm font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 truncate"
                      >
                        <Film className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{c.movieTitle || c.movieSlug}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
                      </Link>
                      {c.rating > 0 && <StarRating value={c.rating} readOnly size="sm" />}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed">
                      {c.content}
                    </p>
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 pt-1 border-t border-white/5">
                      <span>{new Date(c.createdAt).toLocaleDateString("vi-VN")}</span>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Heart className="w-3 h-3 text-rose-400" />
                        <span>{c.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Thành viên chưa đăng bài đánh giá nào.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BỘ SƯU TẬP CÔNG KHAI */}
          {activeTab === "collections" && (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {collections.length > 0 ? (
                collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/collection/${col.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/15 hover:bg-zinc-900/80 transition group cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition truncate">
                        {col.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {col.description || "Bộ sưu tập phim yêu thích"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-3 flex-shrink-0 text-xs font-semibold text-zinc-400">
                      <span>{col.movies?.length || 0} phim</span>
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
