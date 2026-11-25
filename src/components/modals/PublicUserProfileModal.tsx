"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Clock,
  Film,
  ShieldCheck,
  Layers,
  Share2,
  Check,
  Bookmark,
  ExternalLink,
} from "lucide-react";
import { getUserProfileSupabase } from "@/services/supabaseService";
import { getUserCollections } from "@/services/collectionService";
import { cleanBadgeText } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { MovieCollection } from "@/types/collection";
import { toast } from "@/components/ui/Toast";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Tooltip } from "@/components/ui/Tooltip";
import Link from "next/link";
import { BaseModal } from "@/components/ui/BaseModal";

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
      badges: initialDetail.badges || [],
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
          badges: customEv.detail.badges || [],
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

  if (!isOpen || !mounted || !profile) return null;

  const watchMins = profile.watchTimeMinutes || 0;
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      size="xl"
      bodyClassName="p-4 sm:p-6 space-y-4 sm:space-y-5"
    >
      {/* NÚT CHIA SẺ TRÊN GÓC (CẠNH NÚT ĐÓNG CỦA BASEMODAL) */}
      <div className="absolute top-4 right-14 z-20">
        <Tooltip content="Sao chép link hồ sơ" side="bottom">
          <button
            type="button"
            onClick={handleCopyProfile}
            aria-label="Sao chép link hồ sơ"
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition backdrop-blur-md cursor-pointer active:scale-95 flex-shrink-0"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>

      {/* PROFILE HEADER */}
      <div className="relative pt-1 sm:pt-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 px-1 sm:px-0">
            {/* AVATAR TRÒN & HUY HIỆU CẤP ĐỘ */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-2xl bg-zinc-900">
                <UserAvatar
                  src={avatarUrl || undefined}
                  name={profile.displayName}
                  seed={profile.uid || profile.displayName}
                  sizeClassName="w-full h-full text-2xl sm:text-3xl font-black"
                />
              </div>
            </div>

            {/* THÔNG TIN TÊN, VAI TRÒ & TIỂU SỬ */}
            <div className="flex-1 min-w-0 space-y-2 w-full pt-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words text-center sm:text-left">
                  {profile.displayName}
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Quản Trị Viên
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-zinc-300 flex-shrink-0">
                    <User className="w-3 h-3 text-zinc-400" />
                    Thành viên
                  </span>
                )}
              </div>

              {/* BIO / GIỚI THIỆU */}
              {profile.bio ? (
                <div className="flex items-center justify-center sm:justify-start my-1">
                  <p className="text-xs sm:text-sm text-zinc-300/90 italic max-w-md break-words leading-relaxed text-center sm:text-left px-3 py-1 rounded-xl bg-white/[0.04] inline-block">
                    &ldquo;{profile.bio}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center sm:text-left italic">
                  Thành viên chưa thêm lời giới thiệu.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* THỐNG KÊ NHANH */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* CỘT 1: THỜI LƯỢNG */}
          <div className="p-2.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[76px] sm:min-h-[88px] group">
            <div className="flex items-center justify-center gap-1 text-zinc-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-400">
                Thời lượng
              </span>
            </div>
            <div className="text-sm sm:text-lg font-black text-white tracking-tight break-words max-w-full tabular-nums">
              {watchHours}h
            </div>
            <div className="text-[10px] text-zinc-500 max-w-full font-medium leading-tight tabular-nums">
              {watchMins.toLocaleString()} phút
            </div>
          </div>

          {/* CỘT 2: VAI TRÒ */}
          <div className="p-2.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[76px] sm:min-h-[88px] group">
            <div className="flex items-center justify-center gap-1 text-zinc-400">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-400">
                Vai trò
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white leading-tight text-center break-words max-w-full px-0.5">
              {isAdmin ? "Quản trị viên" : "Thành viên"}
            </div>
            <div className="text-[10px] text-zinc-500 max-w-full font-medium leading-tight text-center">
              Cộng đồng
            </div>
          </div>

          {/* CỘT 3: BỘ SƯU TẬP */}
          <div className="p-2.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[76px] sm:min-h-[88px] group">
            <div className="flex items-center justify-center gap-1 text-zinc-400">
              <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-400">
                Bộ sưu tập
              </span>
            </div>
            <div className="text-sm sm:text-lg font-black text-white tracking-tight break-words max-w-full tabular-nums">
              {collections.length}
            </div>
            <div className="text-[10px] text-zinc-500 max-w-full font-medium leading-tight">
              Công khai
            </div>
          </div>
        </div>

        {/* TABS SELECTOR (TỔNG QUAN & BỘ SƯU TẬP) */}
        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-2xl text-xs font-semibold backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-netflix-red text-white font-bold shadow-sm shadow-black/40"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Tổng Quan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "collections"
                ? "bg-netflix-red text-white font-bold shadow-sm shadow-black/40"
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
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-200">
                  <Film className="w-4 h-4 text-netflix-red flex-shrink-0" />
                  <span>Gu Thể Loại Yêu Thích</span>
                </div>
                {profile.favoriteGenres && profile.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {profile.favoriteGenres.map((genre, gIdx) => (
                      <span
                        key={gIdx}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
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
                    prefetch={false}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all group cursor-pointer"
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
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-semibold text-zinc-300 whitespace-nowrap tabular-nums">
                        {col.movies?.length || 0} phim
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
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
    </BaseModal>
  );
}

export default PublicUserProfileModal;
