"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User,
  Sliders,
  MessageSquare,
  ShieldCheck,
  Star,
  Clock,
  Trash2,
  ExternalLink,
  Loader2,
  Save,
  Lock,
  Check,
  Upload,
  Play,
  Tv,
  Moon,
  Subtitles,
  Zap,
  Bookmark,
  History,
  FolderHeart,
  RotateCcw,
  Compass,
  ChevronRight,
  LogIn,
  Flame,
  Film,
  Heart,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types/user";
import {
  subscribeUserProfile,
  getCachedUserProfile,
  updateUserProfile,
  getWatchLevelInfo,
  updatePlayerSettings,
  getPlayerSettings,
  PlayerSettings,
  DEFAULT_PLAYER_SETTINGS,
} from "@/services/userService";
import { uploadAvatarSupabase } from "@/services/supabaseService";
import { subscribeUserComments, deleteMovieComment } from "@/services/commentService";
import { subscribeUserCollections, getLocalCollections } from "@/services/collectionService";
import { getWatchHistory } from "@/lib/watchHistory";
import { getWatchlist } from "@/lib/watchlist";
import { toOptimizedCardPosterUrl } from "@/lib/movieMedia";
import { MovieComment } from "@/types/comment";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/Toast";
import { PRESET_AVATARS } from "@/lib/avatarHelper";
import { isUserAdmin } from "@/lib/adminConfig";
import { ProfilePlayerSettingsTab } from "./ProfilePlayerSettingsTab";
import { ProfileCommentsTab } from "./ProfileCommentsTab";


export const GENRE_OPTIONS = [
  "💥 Hành Động",
  "💖 Tình Cảm",
  "👻 Kinh Dị",
  "🚀 Viễn Tưởng",
  "🎨 Hoạt Hình / Anime",
  "😂 Hài Hước",
  "👑 Cổ Trang",
  "🕵️ Trinh Thám",
  "🍿 Chiếu Rạp",
  "📺 Phim Bộ",
  "🎪 TV Shows",
  "🥋 Võ Thuật",
];

export const AVAILABLE_BADGES = [
  { id: "night-owl", label: "🍿 Mọt Phim Đêm", minMinutesReq: 0, reqText: "Tân Thủ (0h xem)" },
  { id: "director", label: "🎬 Đạo Diễn Tương Lai", minMinutesReq: 60, reqText: "1h+ xem (Bạc)" },
  { id: "anime-god", label: "✨ Thánh Anime", minMinutesReq: 300, reqText: "5h+ xem Anime" },
  { id: "super-watcher", label: "⚡ Cày Phim Siêu Cấp", minMinutesReq: 600, reqText: "10h+ xem (Vàng)" },
  { id: "diamond-vampire", label: "💎 Cương Thi Đêm", minMinutesReq: 3000, reqText: "50h+ xem (Kim Cương)" },
  { id: "top-fan", label: "👑 Top Fan Nanaflix", minMinutesReq: 12000, reqText: "200h+ xem (Thánh Phim)" },
];

export type ProfileTab = "profile" | "player_settings" | "comments";

export function ProfileClient() {
  const { user, cachedUser, loading } = useAuth();
  const currentUser = user || cachedUser;
  const activeUid = user?.uid || cachedUser?.uid;
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as ProfileTab | null;
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    tabParam === "player_settings" || tabParam === "comments" ? tabParam : "profile"
  );

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined" && activeUid) {
      return getCachedUserProfile(activeUid);
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states - Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [badgeHint, setBadgeHint] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  // Player Settings State
  const [playerSettings, setPlayerSettingsState] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [isSavingPlayerSettings, setIsSavingPlayerSettings] = useState(false);

  // Comments & Stats
  const [userComments, setUserComments] = useState<MovieComment[]>([]);
  const [moviePosterMap, setMoviePosterMap] = useState<Record<string, string>>({});
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [watchHistoryCount, setWatchHistoryCount] = useState(0);
  const [collectionsCount, setCollectionsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync tab with URL query parameter
  useEffect(() => {
    if (tabParam && (tabParam === "profile" || tabParam === "player_settings" || tabParam === "comments")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(`/profile${query ? `?${query}` : ""}`, { scroll: false });
  };

  // Quick stats
  const refreshStats = useCallback(() => {
    try {
      setWatchlistCount(getWatchlist().length);
      setWatchHistoryCount(getWatchHistory().length);
      if (user?.uid) {
        setCollectionsCount(getLocalCollections(user.uid).length);
      }
    } catch {}
  }, [user?.uid]);

  useEffect(() => {
    if (activeUid) {
      refreshStats();
      setPlayerSettingsState(getPlayerSettings(activeUid));
    }
  }, [activeUid, refreshStats]);

  // Realtime Profile Listener
  useEffect(() => {
    if (!activeUid) {
      setProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(activeUid, (data) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName || user?.displayName || cachedUser?.displayName || "");
        setBio(data.bio || "");
        setFavoriteGenres(data.favoriteGenres || []);

        const userWatchMins = data.watchTimeMinutes || 0;
        const savedBadges = data.badges || [];
        const unlockedBadges = savedBadges.filter((badgeLabel) => {
          const badgeConfig = AVAILABLE_BADGES.find((b) => b.label === badgeLabel);
          return badgeConfig ? userWatchMins >= badgeConfig.minMinutesReq : true;
        });

        if (!data.badges || data.badges.length === 0) {
          const defaultLevelBadges = getWatchLevelInfo(userWatchMins).badges;
          setUserBadges(defaultLevelBadges);
        } else {
          setUserBadges(unlockedBadges);
        }

        const currentAvatar = data.customAvatar || data.photoURL || user?.photoURL || cachedUser?.photoURL || "";
        setSelectedAvatar(currentAvatar);
        if (currentAvatar && !PRESET_AVATARS.some((a) => a.url === currentAvatar)) {
          setCustomAvatarUrl(currentAvatar);
          setUseCustomUrl(true);
        } else {
          setUseCustomUrl(false);
        }

        if (data.playerSettings) {
          setPlayerSettingsState(data.playerSettings);
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Realtime Comments Listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserComments(user.uid, (items) => {
      setUserComments(items);
    });
    return () => unsub();
  }, [user?.uid]);

  // Cập nhật poster map từ Watchlist & History
  useEffect(() => {
    try {
      const wl = getWatchlist();
      const hi = getWatchHistory();
      const map: Record<string, string> = {};
      for (const item of wl) {
        const poster = item.poster || item.imageUrl;
        if (poster && item.slug) map[item.slug] = poster;
      }
      for (const item of hi) {
        const poster = item.poster || item.thumb;
        if (poster && item.slug) map[item.slug] = poster;
      }
      if (Object.keys(map).length > 0) {
        setMoviePosterMap((prev) => ({ ...map, ...prev }));
      }
    } catch {}
  }, []);

  // Tự động nạp poster bổ sung cho các bình luận chưa có
  useEffect(() => {
    if (userComments.length === 0) return;
    const missingSlugs = userComments
      .map((c) => c.movieSlug)
      .filter((slug) => slug && !moviePosterMap[slug]);

    if (missingSlugs.length === 0) return;
    const uniqueSlugs = Array.from(new Set(missingSlugs)).slice(0, 20);

    fetch(`/api/movies/meta?slugs=${encodeURIComponent(uniqueSlugs.join(","))}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.movies) {
          setMoviePosterMap((prev) => {
            const updated = { ...prev };
            for (const [s, meta] of Object.entries(data.movies)) {
              const m = meta as { poster?: string; thumb?: string };
              if (m.poster || m.thumb) {
                updated[s] = m.poster || m.thumb || "";
              }
            }
            return updated;
          });
        }
      })
      .catch(() => {});
  }, [userComments, moviePosterMap]);

  // Realtime Collections Listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserCollections(user.uid, (items) => {
      setCollectionsCount(items.length);
    });
    return () => unsub();
  }, [user?.uid]);

  // Image compression
  const compressImage = (file: File, maxSize: number = 200, quality: number = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("Lỗi đọc file ảnh!"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Lỗi đọc file!"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Vui lòng chọn file ảnh dung lượng dưới 10MB!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    try {
      let finalUrl = "";

      // 1. Tải ảnh trực tiếp lên Supabase Storage qua Server API Admin
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/user/avatar", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            body: formData,
          });

          const data = await res.json().catch(() => null);
          if (res.ok && data?.avatarUrl) {
            finalUrl = data.avatarUrl;
          } else {
            console.warn("[Avatar Upload] API server trả lỗi:", data?.error);
          }
        } catch (apiErr) {
          console.warn("[Avatar Upload] Lỗi gọi API server:", apiErr);
        }
      }

      // 2. Fallback dự phòng: nén ảnh và dùng client upload / base64 nếu API lỗi
      if (!finalUrl) {
        const compressedDataUrl = await compressImage(file, 200, 0.85);
        finalUrl = compressedDataUrl;
        if (user?.uid) {
          try {
            const cloudUrl = await uploadAvatarSupabase(user.uid, file);
            if (cloudUrl) {
              finalUrl = cloudUrl;
            }
          } catch {}
        }
      }

      // 3. Cập nhật state UI tức thì
      setCustomAvatarUrl(finalUrl);
      setSelectedAvatar(finalUrl);
      setUseCustomUrl(true);
      setProfile((prev) => (prev ? { ...prev, customAvatar: finalUrl, photoURL: finalUrl } : null));

      // 4. Lưu trực tiếp vào profile người dùng để đồng bộ ngay lập tức
      if (user?.uid) {
        await updateUserProfile(user, user.uid, {
          displayName: displayName.trim() || profile?.displayName || user.displayName || "Thành viên",
          customAvatar: finalUrl,
          photoURL: finalUrl,
          bio: bio.trim(),
          favoriteGenres,
          badges: userBadges,
        }).catch((err) => console.warn("Lỗi lưu profile sau upload avatar:", err));
      }

      toast.success("Đã tải và cập nhật ảnh đại diện thành công! 🎉");
    } catch (err) {
      console.error("Lỗi xử lý ảnh:", err);
      toast.error("Không thể xử lý file ảnh này. Vui lòng thử lại!");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploadingAvatar(false);
    }
  };

  const toggleGenre = (genre: string) => {
    if (favoriteGenres.includes(genre)) {
      setFavoriteGenres(favoriteGenres.filter((g) => g !== genre));
    } else {
      if (favoriteGenres.length >= 5) {
        toast.info("Chỉ chọn tối đa 5 thể loại yêu thích nhất!");
        return;
      }
      setFavoriteGenres([...favoriteGenres, genre]);
    }
  };

  const toggleBadge = (badgeObj: (typeof AVAILABLE_BADGES)[number]) => {
    const watchMins = profile?.watchTimeMinutes || 0;
    const isUnlocked = watchMins >= badgeObj.minMinutesReq;
    if (!isUnlocked) {
      const hoursStr =
        badgeObj.minMinutesReq >= 60
          ? `${(badgeObj.minMinutesReq / 60).toFixed(0)} giờ`
          : `${badgeObj.minMinutesReq} phút`;
      setBadgeHint(
        `Danh hiệu "${badgeObj.label}" đang bị khóa. Bạn cần cày tối thiểu ${hoursStr} xem phim để mở khóa!`
      );
      return;
    }

    setBadgeHint(null);
    if (userBadges.includes(badgeObj.label)) {
      setUserBadges(userBadges.filter((b) => b !== badgeObj.label));
    } else {
      if (userBadges.length >= 2) {
        toast.info("Bạn có thể chọn tối đa 2 huy hiệu hiển thị cùng lúc!");
        return;
      }
      setUserBadges([...userBadges, badgeObj.label]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("Vui lòng nhập tên hiển thị!");
      return;
    }

    setIsSavingProfile(true);
    try {
      const finalAvatar = useCustomUrl ? customAvatarUrl.trim() : selectedAvatar;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: trimmedName,
              customAvatar: finalAvatar,
              photoURL: finalAvatar,
              bio: bio.trim(),
              favoriteGenres,
              badges: userBadges,
            }
          : null
      );
      await updateUserProfile(user, user.uid, {
        displayName: trimmedName,
        customAvatar: finalAvatar,
        photoURL: finalAvatar,
        bio: bio.trim(),
        favoriteGenres,
        badges: userBadges,
      });
      toast.success("Đã cập nhật hồ sơ cá nhân thành công! 🎉");
    } catch (err) {
      console.error("Lỗi cập nhật profile:", err);
      toast.error("Không thể cập nhật hồ sơ. Vui lòng thử lại!");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePlayerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSavingPlayerSettings(true);
    try {
      await updatePlayerSettings(user.uid, playerSettings);
      toast.success("Đã lưu & đồng bộ thiết lập trình phát Cloud thành công! 🍿");
    } catch (err) {
      console.error("Lỗi cập nhật player settings:", err);
      toast.error("Không thể lưu cài đặt lúc này. Vui lòng thử lại!");
    } finally {
      setIsSavingPlayerSettings(false);
    }
  };

  const handleDeleteComment = async (commentId: string, movieSlug?: string) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa bình luận",
      message: "Bạn có chắc chắn muốn xóa nhận xét này? Bình luận sẽ bị gỡ vĩnh viễn khỏi bộ phim.",
      confirmText: "Xóa bình luận",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (!confirmed) return;

    const previous = userComments;
    setUserComments((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingCommentId(commentId);

    try {
      await deleteMovieComment(commentId, { movieSlug, userId: user?.uid });
      toast.success("Đã xóa bình luận thành công!");
    } catch (err: unknown) {
      console.error("Lỗi xóa bình luận:", err);
      setUserComments(previous);
      const msg = err instanceof Error ? err.message : "Không thể xóa bình luận lúc này!";
      toast.error(msg);
    } finally {
      setDeletingCommentId(null);
    }
  };

  if (!mounted || (loading && !currentUser)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-zinc-400">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  // Not Logged In Screen
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto shadow-2xl">
          <User className="w-10 h-10 text-netflix-red" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Yêu cầu đăng nhập</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Vui lòng đăng nhập để quản lý hồ sơ cá nhân, kho avatar, danh hiệu cày phim và đồng bộ cài đặt trình phát Cloud trên mọi thiết bị.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-auth-modal"));
              }
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-sm shadow-lg shadow-netflix-red/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập ngay</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition text-center"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const watchMins = profile?.watchTimeMinutes || 0;
  const levelInfo = getWatchLevelInfo(watchMins);
  const watchHours = (watchMins / 60).toFixed(1);
  const effectiveAvatar =
    selectedAvatar || customAvatarUrl || profile?.customAvatar || profile?.photoURL || currentUser.photoURL || "";
  const effectiveDisplayName = profile?.displayName || currentUser.displayName || "Thành viên Nanaflix";
  const progressPct = levelInfo.nextMinMinutes
    ? Math.min(100, Math.round((watchMins / levelInfo.nextMinMinutes) * 100))
    : 100;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Global Hidden file input để luôn hoạt động ở mọi tab */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* 1. BREADCRUMB */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/" className="hover:text-white transition">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-200 font-semibold">Tài khoản & Cài đặt</span>
      </nav>

      {/* 2. PROFILE HERO CARD */}
      <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/10 p-5 sm:p-7 shadow-2xl backdrop-blur-xl overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-netflix-red/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 text-center md:text-left">
          {/* Avatar with edit prompt */}
          <div className="relative group shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/10 group-hover:ring-netflix-red/60 transition-all duration-300 overflow-hidden shadow-2xl">
              <UserAvatar
                src={effectiveAvatar || undefined}
                name={effectiveDisplayName}
                sizeClassName="w-full h-full text-3xl font-black"
              />
            </div>
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              title={isUploadingAvatar ? "Đang tải ảnh..." : "Đổi ảnh đại diện"}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-netflix-red hover:brightness-110 active:brightness-90 text-white shadow-lg transition-transform duration-200 hover:scale-110 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-sm">
                {effectiveDisplayName}
              </h1>

              {/* Rank Pill */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm bg-netflix-red/20 text-netflix-red">
                <span>{levelInfo.badgeIcon}</span>
                <span>{levelInfo.levelName}</span>
              </span>

              {isUserAdmin(currentUser.email) && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Quản trị viên</span>
                </Link>
              )}
            </div>

            <p className="text-xs text-zinc-400 font-medium truncate">{currentUser.email}</p>

            {profile?.bio && (
              <p className="text-xs sm:text-sm text-zinc-300 italic max-w-xl line-clamp-2 pt-0.5">
                &ldquo;{profile.bio}&rdquo;
              </p>
            )}

            {/* Level Progress Bar */}
            <div className="pt-2 space-y-1.5 max-w-md mx-auto md:mx-0">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">
                  {levelInfo.nextLevelName ? `Tiến độ lên ${levelInfo.nextLevelName}:` : "Đã đạt cấp tối đa!"}
                </span>
                <span className="tabular-nums font-medium text-amber-400">
                  {watchMins} {levelInfo.nextMinMinutes ? `/ ${levelInfo.nextMinMinutes} phút` : "phút"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-netflix-red rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(4, progressPct))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. QUICK STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 pt-4 border-t border-white/10">
          <Link
            href="/my-list?tab=history"
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition flex flex-col items-center justify-center text-center group"
          >
            <History className="w-4 h-4 text-netflix-red mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{watchHistoryCount}</span>
            <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Lịch sử xem</span>
          </Link>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
            <Flame className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{watchHours}h</span>
            <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Thời gian cày</span>
          </div>

          <Link
            href="/my-list?tab=watchlist"
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition flex flex-col items-center justify-center text-center group"
          >
            <Bookmark className="w-4 h-4 text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{watchlistCount}</span>
            <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Phim đã lưu</span>
          </Link>

          <Link
            href="/my-list?tab=collections"
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition flex flex-col items-center justify-center text-center group"
          >
            <FolderHeart className="w-4 h-4 text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{collectionsCount}</span>
            <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Bộ sưu tập</span>
          </Link>

          <button
            type="button"
            onClick={() => handleTabChange("comments")}
            className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{userComments.length}</span>
            <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">
              <span className="sm:hidden">Đánh giá</span>
              <span className="hidden sm:inline">Đánh giá & Review</span>
            </span>
          </button>
        </div>
      </div>

      {/* 4. MODERN TAB SWITCHER */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleTabChange("profile")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === "profile"
              ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Hồ Sơ</span>
            <span className="hidden sm:inline">Hồ Sơ & Danh Hiệu</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("player_settings")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === "player_settings"
              ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Trình Phát</span>
            <span className="hidden sm:inline">Cài Đặt Trình Phát</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("comments")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === "comments"
              ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Đánh Giá</span>
            <span className="hidden sm:inline">Đánh Giá ({userComments.length})</span>
          </span>
          <span className="sm:hidden text-xs px-1.5 py-0.2 rounded-full bg-white/20 font-black shrink-0">
            {userComments.length}
          </span>
        </button>
      </div>

      {/* 5. TAB CONTENTS */}
      <div className="rounded-3xl bg-zinc-950/80 border border-white/10 p-5 sm:p-7 shadow-xl backdrop-blur-xl">
        {/* =================================================================== */}
        {/* TAB 1: HỒ SƠ & DANH HIỆU                                             */}
        {/* =================================================================== */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* 1. KHO AVATAR */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    1. Kho Avatar & Tải ảnh riêng
                  </h3>
                  <p className="text-xs text-zinc-400">Chọn mẫu avatar bot hoặc tải ảnh đại diện từ máy tính / điện thoại</p>
                </div>
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-netflix-red" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-netflix-red" />
                  )}
                  <span>{isUploadingAvatar ? "Đang tải..." : "Tải ảnh từ máy"}</span>
                </button>
              </div>

              {/* Robot Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 sm:gap-2.5">
                {PRESET_AVATARS.map((item) => {
                  const isSelected = !useCustomUrl && selectedAvatar === item.url;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(item.url);
                        setUseCustomUrl(false);
                      }}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                        isSelected
                          ? "border-netflix-red ring-4 ring-netflix-red/30 scale-105 shadow-lg"
                          : "border-white/10 hover:border-white/40 bg-zinc-900"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.id} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-netflix-red text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom URL Input */}
              {useCustomUrl && customAvatarUrl && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={customAvatarUrl} alt="Custom Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">Ảnh tùy chỉnh đang được chọn</p>
                    <p className="text-[11px] text-zinc-400 truncate">{customAvatarUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomUrl(false);
                      setSelectedAvatar(PRESET_AVATARS[0].url);
                    }}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition"
                  >
                    Dùng Avatar mẫu
                  </button>
                </div>
              )}
            </div>

            {/* 2. TÊN HIỂN THỊ & TIỂU SỬ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    2. Tên hiển thị
                  </label>
                  <span className="text-[11px] text-zinc-500 tabular-nums">{displayName.length}/40</span>
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nhập tên hiển thị trên Nanaflix..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    3. Tiểu sử (Slogan)
                  </label>
                  <span className="text-[11px] text-zinc-500 tabular-nums">{bio.length}/150</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={150}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Mê phim Marvel, cày anime ban đêm 🍿..."
                  className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* 3. BỘ DANH HIỆU */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    4. Bộ Danh Hiệu
                  </h3>
                  <p className="text-xs text-zinc-400">Tích lũy giờ cày phim để mở khóa danh hiệu độc quyền</p>
                </div>
                <span className="text-xs text-amber-400 font-black">
                  Đã mở: {AVAILABLE_BADGES.filter((b) => watchMins >= b.minMinutesReq).length}/{AVAILABLE_BADGES.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_BADGES.map((b) => {
                  const isUnlocked = watchMins >= b.minMinutesReq;
                  const active = isUnlocked && userBadges.includes(b.label);

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBadge(b)}
                      title={isUnlocked ? b.label : `Đang khóa - Cần ${b.reqText}`}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        !isUnlocked
                          ? "bg-zinc-900/40 text-zinc-500 border-white/5 opacity-55 hover:opacity-80"
                          : active
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-black/50 scale-102"
                          : "bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {!isUnlocked && <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                      <span>{b.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {badgeHint && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{badgeHint}</span>
                </div>
              )}
            </div>

            {/* 4. THỂ LOẠI YÊU THÍCH */}
            <div className="space-y-2.5 pt-2">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  5. Thể loại phim yêu thích (Tối đa 5)
                </h3>
                <p className="text-xs text-zinc-400">Giúp gợi ý chính xác gu phim dành riêng cho bạn</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((genre) => {
                  const active = favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        active
                          ? "bg-netflix-red text-white border-netflix-red shadow-md shadow-netflix-red/20"
                          : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-netflix-red/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu hồ sơ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Hồ Sơ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* TAB 2: CÀI ĐẶT TRÌNH PHÁT CLOUD                                      */}
        {/* =================================================================== */}
        {activeTab === "player_settings" && (
          <ProfilePlayerSettingsTab
            playerSettings={playerSettings}
            setPlayerSettingsState={setPlayerSettingsState}
            handleSavePlayerSettings={handleSavePlayerSettings}
            isSavingPlayerSettings={isSavingPlayerSettings}
            userId={user?.uid}
          />
        )}

        {/* =================================================================== */}
        {/* TAB 3: ĐÁNH GIÁ & BÌNH LUẬN                                          */}
        {/* =================================================================== */}
        {activeTab === "comments" && (
          <ProfileCommentsTab
            userComments={userComments}
            moviePosterMap={moviePosterMap}
            deletingCommentId={deletingCommentId}
            handleDeleteComment={handleDeleteComment}
          />
        )}
      </div>
    </div>
  );
}

export default ProfileClient;
