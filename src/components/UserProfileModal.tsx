"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  User,
  Check,
  Camera,
  Upload,
  Save,
  Loader2,
  Trophy,
  Flame,
  Lock,
  MessageSquare,
  Star,
  Trash2,
  ExternalLink,
  Clock,
  ThumbsUp,
  Settings,
  Heart,
  Film,
  Bookmark,
  FolderHeart,
  Play,
  UserMinus,
  Sliders,
  Tv,
  Moon,
  Zap,
  Subtitles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeUserProfile,
  updateUserProfile,
  getWatchLevelInfo,
  getPlayerSettings,
  updatePlayerSettings,
  DEFAULT_PLAYER_SETTINGS,
} from "@/services/userService";
import { subscribeUserComments, deleteMovieComment } from "@/services/commentService";
import {
  subscribeFollowedActors,
  toggleFollowActor,
} from "@/services/actorFollowService";
import { getWatchlist } from "@/lib/watchlist";
import { getWatchHistory } from "@/lib/watchHistory";
import { getLocalCollections, subscribeUserCollections } from "@/services/collectionService";
import { uploadAvatarSupabase } from "@/services/supabaseService";
import { MovieComment } from "@/types/comment";
import { UserProfile, PlayerSettings, FollowedActorItem } from "@/types/user";
import { toast } from "@/components/Toast";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";

// Danh sách Avatar đẹp chuẩn VIP Cinema & Anime Style
export const PRESET_AVATARS = [
  { id: "netflix-red", name: "🍿 Bắp Rạp", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix1" },
  { id: "gold-star", name: "🌟 Sao Vàng", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix2" },
  { id: "cyber-gamer", name: "🎮 Cyberpunk", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix3" },
  { id: "anime-magic", name: "✨ Anime", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix4" },
  { id: "director-film", name: "🎬 Đạo Diễn", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix5" },
  { id: "retro-headphones", name: "🎧 Chill Music", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix6" },
  { id: "fire-flame", name: "🔥 Siêu Cấp", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix7" },
  { id: "king-crown", name: "👑 Vương Miện", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix8" },
  { id: "ghost-vampire", name: "👻 Cương Thi", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix9" },
  { id: "rabbit-cosmic", name: "🐰 Thỏ Vũ Trụ", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix10" },
  { id: "dragon-hero", name: "🐉 Rồng Đỏ", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix11" },
  { id: "cat-cinema", name: "🐱 Mèo Cinema", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix12" },
];

const GENRE_OPTIONS = [
  "💥 Hành Động",
  "💖 Tình Cảm",
  "👻 Kinh Dị",
  "🛸 Viễn Tưởng",
  "🎨 Hoạt Hình / Anime",
  "🤣 Hài Hước",
  "🏯 Cổ Trang",
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

export type DashboardTab = "profile" | "player_settings" | "followed_actors" | "comments";

export interface UserProfileModalProps {
  initialOpen?: boolean;
  initialTab?: DashboardTab;
}

function UserProfileModalInner({
  initialOpen = false,
  initialTab = "profile",
}: UserProfileModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states - Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [badgeHint, setBadgeHint] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  // Tab & Sub-features
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [userComments, setUserComments] = useState<MovieComment[]>([]);
  const [followedActors, setFollowedActors] = useState<FollowedActorItem[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [unfollowingActorId, setUnfollowingActorId] = useState<string | null>(null);

  // Player Settings State
  const [playerSettings, setPlayerSettingsState] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [isSavingPlayerSettings, setIsSavingPlayerSettings] = useState(false);

  // Quick Stats States
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [watchHistoryCount, setWatchHistoryCount] = useState(0);
  const [collectionsCount, setCollectionsCount] = useState(0);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Lắng nghe sự kiện mở modal từ mọi nơi trong ứng dụng
  useEffect(() => {
    const handleOpen = (e: Event) => {
      setIsOpen(true);
      const customEv = e as CustomEvent<{ tab?: DashboardTab }>;
      if (customEv?.detail?.tab) {
        setActiveTab(customEv.detail.tab);
      }
    };
    window.addEventListener("open-user-profile-modal", handleOpen as EventListener);
    window.addEventListener("open-user-profile", handleOpen as EventListener);
    return () => {
      window.removeEventListener("open-user-profile-modal", handleOpen as EventListener);
      window.removeEventListener("open-user-profile", handleOpen as EventListener);
    };
  }, []);

  // Đọc dữ liệu thống kê nhanh
  const refreshStats = React.useCallback(() => {
    try {
      setWatchlistCount(getWatchlist().length);
      setWatchHistoryCount(getWatchHistory().length);
      if (user?.uid) {
        setCollectionsCount(getLocalCollections(user.uid).length);
      }
    } catch {}
  }, [user?.uid]);

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      setPlayerSettingsState(getPlayerSettings(user?.uid));
    }
  }, [isOpen, user?.uid, refreshStats]);

  // Đồng bộ lại form khi mở modal
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || user?.displayName || "");
      setBio(profile.bio || "");
      setFavoriteGenres(profile.favoriteGenres || []);
      const currentAvatar = profile.customAvatar || profile.photoURL || user?.photoURL || "";
      setSelectedAvatar(currentAvatar);
      if (currentAvatar && !PRESET_AVATARS.some((a) => a.url === currentAvatar)) {
        setCustomAvatarUrl(currentAvatar);
        setUseCustomUrl(true);
      } else {
        setUseCustomUrl(false);
      }
      if (profile.badges && profile.badges.length > 0) {
        setUserBadges(profile.badges);
      }
      if (profile.playerSettings) {
        setPlayerSettingsState(profile.playerSettings);
      }
    }
  }, [isOpen, profile, user]);

  // Lắng nghe danh sách bình luận của chính người dùng theo thời gian thực
  useEffect(() => {
    if (!user?.uid || !isOpen) return;
    const unsub = subscribeUserComments(user.uid, (items) => {
      setUserComments(items);
    });
    return () => unsub();
  }, [user?.uid, isOpen]);

  // Lắng nghe danh sách diễn viên theo dõi theo thời gian thực
  useEffect(() => {
    if (!user?.uid || !isOpen) return;
    const unsub = subscribeFollowedActors(user.uid, (items) => {
      setFollowedActors(items);
    });
    return () => unsub();
  }, [user?.uid, isOpen]);

  // Lắng nghe bộ sưu tập
  useEffect(() => {
    if (!user?.uid || !isOpen) return;
    const unsub = subscribeUserCollections(user.uid, (items) => {
      setCollectionsCount(items.length);
    });
    return () => unsub();
  }, [user?.uid, isOpen]);

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa bình luận",
      message: "Bạn có chắc chắn muốn xóa nhận xét này? Bình luận sẽ bị gỡ vĩnh viễn khỏi bộ phim.",
      confirmText: "Xóa bình luận",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (!confirmed) return;

    setDeletingCommentId(commentId);
    try {
      await deleteMovieComment(commentId);
      toast.success("Đã xóa bình luận thành công!");
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
      toast.error("Không thể xóa bình luận lúc này!");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleUnfollowActor = async (actorId: string, actorName: string) => {
    if (!user?.uid) return;
    setUnfollowingActorId(actorId);
    try {
      await toggleFollowActor(user.uid, { actorId, actorName });
      toast.info(`Đã bỏ theo dõi diễn viên ${actorName}`);
    } catch (err) {
      console.error("Lỗi bỏ follow:", err);
      toast.error("Không thể bỏ theo dõi lúc này!");
    } finally {
      setUnfollowingActorId(null);
    }
  };

  const handleOpenActorBio = (actor: FollowedActorItem) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-actor-bio", {
          detail: {
            actorName: actor.actorName,
            actorPhoto: actor.actorPhoto || actor.actorAvatar,
            knownFor: actor.knownFor,
          },
        })
      );
    }
  };

  // Khóa cuộn trang và lắng nghe phím Escape khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Lắng nghe hồ sơ người dùng theo thời gian thực (Supabase + LocalStorage)
  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (data) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName || user.displayName || "");
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

        const currentAvatar = data.customAvatar || data.photoURL || user.photoURL || "";
        setSelectedAvatar(currentAvatar);
        if (currentAvatar && !PRESET_AVATARS.some((a) => a.url === currentAvatar)) {
          setCustomAvatarUrl(currentAvatar);
          setUseCustomUrl(true);
        }

        if (data.playerSettings) {
          setPlayerSettingsState(data.playerSettings);
        }
      }
    });
    return () => unsub();
  }, [user]);

  if (!isOpen || !user || !mounted) return null;

  const watchMins = profile?.watchTimeMinutes || 0;
  const levelInfo = getWatchLevelInfo(watchMins);
  const watchHours = (watchMins / 60).toFixed(1);

  // Nén ảnh từ máy xuống 200x200px JPEG nhẹ (~15KB)
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

  // Xử lý tải ảnh đại diện từ máy
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Vui lòng chọn file ảnh dung lượng dưới 10MB!");
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 200, 0.85);
      let finalUrl = compressedDataUrl;
      if (user?.uid) {
        try {
          const cloudUrl = await uploadAvatarSupabase(user.uid, file);
          if (cloudUrl) {
            finalUrl = cloudUrl;
          }
        } catch {}
      }

      setCustomAvatarUrl(finalUrl);
      setSelectedAvatar(finalUrl);
      setUseCustomUrl(true);
      toast.success("Đã chọn & tối ưu ảnh đại diện thành công! 🎉");
    } catch (err) {
      console.error("Lỗi xử lý ảnh:", err);
      toast.error("Không thể xử lý file ảnh này. Vui lòng thử lại!");
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

  const toggleBadge = (badgeObj: typeof AVAILABLE_BADGES[number]) => {
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

    setIsSaving(true);
    try {
      const finalAvatar = useCustomUrl ? customAvatarUrl.trim() : selectedAvatar;
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
      setIsSaving(false);
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

  return createPortal(
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 scrollbar-thin text-white"
      >
        {/* NÚT ĐÓNG */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* PROFILE HEADER & SUMMARY */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3 sm:pb-4 pr-8 sm:pr-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-rose-500/40 bg-zinc-800 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedAvatar || user.photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=Nanaflix1"}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 text-xs">{levelInfo.badgeIcon}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {displayName || user.displayName || "Thành viên Nanaflix"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                  {levelInfo.levelName}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {user.email} • {bio || "Mê phim điện ảnh & phim bộ chất lượng cao 🍿"}
              </p>
            </div>
          </div>

          {/* Quick Action: Bảng xếp hạng */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-leaderboard-modal"));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black text-xs font-bold transition cursor-pointer flex-shrink-0 self-end sm:self-center"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Bảng Xếp Hạng</span>
          </button>
        </div>

        {/* QUICK STATS BAR */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center flex flex-col items-center justify-center">
            <Film className="w-3.5 h-3.5 text-rose-400 mb-1" />
            <span className="text-xs sm:text-sm font-black text-white">{watchHistoryCount}</span>
            <span className="text-[10px] text-gray-400">Phim đã xem</span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center flex flex-col items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <span className="text-xs sm:text-sm font-black text-amber-300">{watchHours}h</span>
            <span className="text-[10px] text-gray-400">Thời gian cày</span>
          </div>

          <Link
            href="/my-list?tab=watchlist"
            onClick={() => setIsOpen(false)}
            className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-center flex flex-col items-center justify-center transition group"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs sm:text-sm font-black text-white">{watchlistCount}</span>
            <span className="text-[10px] text-gray-400">Phim đã lưu</span>
          </Link>

          <Link
            href="/my-list?tab=collections"
            onClick={() => setIsOpen(false)}
            className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-center flex flex-col items-center justify-center transition group"
          >
            <FolderHeart className="w-3.5 h-3.5 text-sky-400 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs sm:text-sm font-black text-white">{collectionsCount}</span>
            <span className="text-[10px] text-gray-400">Bộ sưu tập</span>
          </Link>

          <button
            type="button"
            onClick={() => setActiveTab("followed_actors")}
            className={`p-2 sm:p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === "followed_actors"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white"
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400 mb-1" />
            <span className="text-xs sm:text-sm font-black">{followedActors.length}</span>
            <span className="text-[10px] text-gray-400">Diễn viên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`p-2 sm:p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === "comments"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400 mb-1" />
            <span className="text-xs sm:text-sm font-black">{userComments.length}</span>
            <span className="text-[10px] text-gray-400">Đánh giá</span>
          </button>
        </div>

        {/* TAB CHUYỂN ĐỔI DASHBOARD (4 TABS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "profile"
                ? "bg-netflix-red text-white shadow-md shadow-rose-950/50"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Hồ Sơ & Danh Hiệu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("player_settings")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "player_settings"
                ? "bg-netflix-red text-white shadow-md shadow-rose-950/50"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Cài Đặt Phát Lại</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("followed_actors")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "followed_actors"
                ? "bg-netflix-red text-white shadow-md shadow-rose-950/50"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Heart className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Diễn Viên ({followedActors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "comments"
                ? "bg-netflix-red text-white shadow-md shadow-rose-950/50"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Đánh Giá ({userComments.length})</span>
          </button>
        </div>

        {/* TAB 1: HỒ SƠ CÁ NHÂN & DANH HIỆU */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            {/* WATCH LEVEL CARD */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-lg">{levelInfo.badgeIcon}</span>
                  <span className="font-extrabold text-white">{levelInfo.levelName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold whitespace-nowrap">
                    Cấp Độ VIP
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-amber-400 font-bold whitespace-nowrap">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 flex-shrink-0" />
                  <span>{watchHours} giờ cày phim</span>
                </div>
              </div>

              {levelInfo.nextMinMinutes && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Tiến độ lên {levelInfo.nextLevelName}:</span>
                    <span className="font-mono">
                      {watchMins} / {levelInfo.nextMinMinutes} phút
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (watchMins / levelInfo.nextMinMinutes) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
              {/* 1. KHO AVATAR VIP */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    1. Kho Avatar VIP & Tải ảnh riêng
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 hover:bg-netflix-red hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh từ máy</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = !useCustomUrl && selectedAvatar === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av.url);
                          setUseCustomUrl(false);
                        }}
                        title={av.name}
                        className={`relative aspect-square rounded-2xl border overflow-hidden p-1 transition-all cursor-pointer ${
                          isSelected
                            ? "border-netflix-red bg-netflix-red/20 ring-2 ring-netflix-red scale-105"
                            : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={av.url}
                          alt={av.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-netflix-red/40 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white font-black stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUseCustomUrl(!useCustomUrl)}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{useCustomUrl ? "Dùng Avatar mẫu" : "Hoặc dán URL link ảnh bất kỳ"}</span>
                  </button>
                </div>

                {useCustomUrl && (
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      value={customAvatarUrl}
                      onChange={(e) => {
                        setCustomAvatarUrl(e.target.value);
                        setSelectedAvatar(e.target.value);
                      }}
                      placeholder="Dán link ảnh URL của bạn (https://...)"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
                    />
                    {customAvatarUrl && (
                      <div className="w-9 h-9 rounded-full border border-white/20 overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={customAvatarUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. TÊN HIỂN THỊ & TIỂU SỬ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      2. Tên hiển thị
                    </label>
                    <span className="text-[11px] text-gray-500">{displayName.length}/40</span>
                  </div>
                  <input
                    type="text"
                    maxLength={40}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      3. Tiểu sử (Slogan)
                    </label>
                    <span className="text-[11px] text-gray-500">{bio.length}/150</span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={150}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Mê phim Marvel, cày phim bộ ban đêm 🍿..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* 4. DANH HIỆU (BADGES) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    4. Bộ Danh Hiệu (Mở khóa theo cấp độ cày phim)
                  </label>
                  <span className="text-[11px] text-amber-400 font-bold">
                    Đã mở: {AVAILABLE_BADGES.filter((b) => watchMins >= b.minMinutesReq).length}/{AVAILABLE_BADGES.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_BADGES.map((b) => {
                    const isUnlocked = watchMins >= b.minMinutesReq;
                    const active = isUnlocked && userBadges.includes(b.label);

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBadge(b)}
                        title={isUnlocked ? b.label : `Đang khóa - Cần ${b.reqText}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          !isUnlocked
                            ? "bg-zinc-900/40 text-gray-500 border-white/5 opacity-55 hover:opacity-80"
                            : active
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950/40 scale-102"
                            : "bg-zinc-900 text-gray-300 border-white/10 hover:border-white/25 hover:text-white"
                        }`}
                      >
                        {!isUnlocked ? (
                          <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        ) : null}
                        <span>{b.label}</span>
                        {active && <Check className="w-3 h-3 text-amber-300 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {badgeHint && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11.5px] text-amber-300 font-semibold flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{badgeHint}</span>
                  </div>
                )}
              </div>

              {/* 5. THỂ LOẠI YÊU THÍCH */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  5. Thể loại phim yêu thích (Tối đa 5)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_OPTIONS.map((genre) => {
                    const active = favoriteGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-netflix-red text-white shadow-md border border-rose-500 font-bold"
                            : "bg-zinc-900 text-gray-400 hover:text-white border border-white/10 hover:border-white/25"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NÚT LƯU PROFILE */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-950/60 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
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
          </div>
        )}

        {/* TAB 2: CÀI ĐẶT TRÌNH PHÁT CLOUD */}
        {activeTab === "player_settings" && (
          <form onSubmit={handleSavePlayerSettings} className="space-y-4 py-1">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" />
                <span>Đồng bộ tùy chọn trình phát Cloud</span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tất cả các tùy chọn xem phim dưới đây sẽ được lưu trữ trên tài khoản Supabase của bạn và tự động đồng bộ tức thì khi bạn đăng nhập trên PC, Laptop hoặc Điện thoại.
              </p>
            </div>

            <div className="space-y-3">
              {/* TỰ ĐỘNG CHUYỂN TẬP */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition">
                <div className="space-y-0.5 pr-3">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-rose-400" />
                    <span>Tự động phát tập tiếp theo</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Khi xem xong một tập phim bộ, CinemaPlayer sẽ tự động chuyển sang tập kế tiếp.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={playerSettings.autoNextEpisode}
                    onChange={(e) =>
                      setPlayerSettingsState({ ...playerSettings, autoNextEpisode: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-netflix-red"></div>
                </label>
              </div>

              {/* MẶC ĐỊNH MỞ RẠP PHIM (THEATER MODE) */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition">
                <div className="space-y-0.5 pr-3">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mặc định mở Giao diện Rạp Chiếu Phim (Theater Mode)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Mở rộng khung phát phim toàn chiều rộng màn hình để trải nghiệm điện ảnh chân thực.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={playerSettings.defaultTheaterMode}
                    onChange={(e) =>
                      setPlayerSettingsState({ ...playerSettings, defaultTheaterMode: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* MẶC ĐỊNH TẮT ĐÈN (LIGHTS OFF) */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition">
                <div className="space-y-0.5 pr-3">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Mặc định bật chế độ Tối Màn Hình (Lights Off)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Làm tối toàn bộ giao diện xung quanh màn hình phát để bạn tập trung trọn vẹn vào phim.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={playerSettings.defaultLightsOff}
                    onChange={(e) =>
                      setPlayerSettingsState({ ...playerSettings, defaultLightsOff: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {/* TỰ ĐỘNG BẬT PHỤ ĐỀ */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition">
                <div className="space-y-0.5 pr-3">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Subtitles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tự động hiển thị phụ đề (Auto Subtitle)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Tự động ưu tiên bật track phụ đề Tiếng Việt khi nguồn video có sẵn bản sub.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={playerSettings.autoSubtitle}
                    onChange={(e) =>
                      setPlayerSettingsState({ ...playerSettings, autoSubtitle: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* TỐC ĐỘ PHÁT MẶC ĐỊNH */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tốc độ phát mặc định</span>
                  </label>
                  <span className="text-xs font-black text-amber-400">
                    {playerSettings.playbackSpeed}x
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() =>
                        setPlayerSettingsState({ ...playerSettings, playbackSpeed: speed })
                      }
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        playerSettings.playbackSpeed === speed
                          ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40"
                          : "bg-white/5 text-gray-300 border-white/10 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {speed === 1 ? "1.0x (Chuẩn)" : `${speed}x`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* NÚT LƯU PLAYBACK SETTINGS */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPlayerSettingsState(getPlayerSettings(user?.uid))}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Đặt lại
              </button>
              <button
                type="submit"
                disabled={isSavingPlayerSettings}
                className="px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-950/60 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSavingPlayerSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đồng bộ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Cài Đặt Cloud</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: DIỄN VIÊN ĐÃ THEO DÕI */}
        {activeTab === "followed_actors" && (
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                  <span>Diễn viên yêu thích của bạn ({followedActors.length})</span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Theo dõi diễn viên giúp gợi ý đề xuất phim &quot;Dành Riêng Cho Bạn&quot; chuẩn xác hơn.
                </p>
              </div>
            </div>

            {followedActors.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
                <Heart className="w-10 h-10 text-rose-500/40 mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Bạn chưa theo dõi diễn viên nào
                  </h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Hãy bấm vào tên diễn viên trong chi tiết phim hoặc tìm kiếm để xem tiểu sử và bấm theo dõi nhé!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                {followedActors.map((actor) => {
                  const avatar = actor.actorPhoto || actor.actorAvatar;
                  return (
                    <div
                      key={actor.actorId}
                      className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 overflow-hidden flex-shrink-0 shadow-md">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatar}
                              alt={actor.actorName}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-rose-400 font-black text-sm bg-rose-500/10">
                              {actor.actorName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handleOpenActorBio(actor)}
                            className="text-sm font-bold text-white hover:text-rose-400 transition text-left block truncate cursor-pointer"
                          >
                            {actor.actorName}
                          </button>
                          {actor.knownFor && (
                            <p className="text-[11px] text-gray-400 truncate">
                              {actor.knownFor}
                            </p>
                          )}
                          <span className="text-[10px] text-gray-500 block mt-0.5">
                            Đã theo dõi {new Date(actor.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenActorBio(actor)}
                          title="Xem tiểu sử & danh sách phim"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={unfollowingActorId === actor.actorId}
                          onClick={() => handleUnfollowActor(actor.actorId, actor.actorName)}
                          title="Bỏ theo dõi"
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer disabled:opacity-50"
                        >
                          {unfollowingActorId === actor.actorId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LỊCH SỬ BÌNH LUẬN & ĐÁNH GIÁ */}
        {activeTab === "comments" && (
          <div className="space-y-4 py-1">
            {userComments.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <MessageSquare className="w-10 h-10 text-gray-500 mx-auto mb-3 opacity-60" />
                <h4 className="text-base font-bold text-white mb-1">
                  Bạn chưa đăng bình luận nào
                </h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Hãy ghé xem các bộ phim hot trên Nanaflix và để lại cảm nhận, đánh giá sao nhé!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                {userComments.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/movies/${c.movieSlug}#comments`}
                          onClick={() => setIsOpen(false)}
                          className="text-sm font-bold text-white hover:text-rose-400 transition flex items-center gap-1.5 group"
                        >
                          <span>{c.movieTitle || c.movieSlug}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-rose-400 transition" />
                        </Link>
                        {c.episodeName && (
                          <span className="text-[11px] text-rose-300 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 inline-block mt-1">
                            {c.episodeName}
                          </span>
                        )}
                      </div>

                      {/* STAR RATING */}
                      {c.rating > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{c.rating}/5</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-line">
                      {c.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {new Date(c.createdAt).toLocaleString("vi-VN")}
                        </span>
                        {c.likes > 0 && (
                          <span className="flex items-center gap-1 text-rose-400 font-bold">
                            <ThumbsUp className="w-3 h-3 fill-rose-400" />
                            {c.likes}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={deletingCommentId === c.id}
                        onClick={() => handleDeleteComment(c.id)}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/15 px-2.5 py-1 rounded-lg transition text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {deletingCommentId === c.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export const UserProfileModal = React.memo(UserProfileModalInner);
export default UserProfileModal;
