"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User,
  Sliders,
  MessageSquare,
  ChevronRight,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types/user";
import {
  subscribeUserProfile,
  getCachedUserProfile,
  updateUserProfile,
  getWatchLevelInfo,
  cleanBadgeText,
  updatePlayerSettings,
  getPlayerSettings,
  PlayerSettings,
  DEFAULT_PLAYER_SETTINGS,
} from "@/services/userService";
import { subscribeUserCollections, getLocalCollections } from "@/services/collectionService";
import { getWatchHistory } from "@/lib/watchHistory";
import { getWatchlist } from "@/lib/watchlist";
import { toast } from "@/components/ui/Toast";
import { PRESET_AVATARS } from "@/lib/avatarHelper";
import { useUserMovieComments } from "@/hooks/useUserMovieComments";
import {
  GENRE_OPTIONS,
  AVAILABLE_BADGES,
  ProfileTab,
} from "./profileConstants";
import { uploadUserAvatarFile } from "./avatarUploadHelper";
import { ProfileHeroCard } from "./ProfileHeroCard";
import { ProfileEditFormTab } from "./ProfileEditFormTab";
import { ProfilePlayerSettingsTab } from "./ProfilePlayerSettingsTab";
import { ProfileCommentsTab } from "./ProfileCommentsTab";

export { GENRE_OPTIONS, AVAILABLE_BADGES };
export type { ProfileTab };

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
  const {
    userComments,
    moviePosterMap,
    deletingCommentId,
    handleDeleteComment,
  } = useUserMovieComments({ userId: user?.uid });
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
        setFavoriteGenres((data.favoriteGenres || []).map(cleanBadgeText));

        const userWatchMins = data.watchTimeMinutes || 0;
        const savedBadges = (data.badges || []).map(cleanBadgeText);
        const unlockedBadges = savedBadges.filter((badgeLabel) => {
          const badgeConfig = AVAILABLE_BADGES.find((b) => b.label === badgeLabel);
          return badgeConfig ? userWatchMins >= badgeConfig.minMinutesReq : true;
        });

        if (!data.badges || data.badges.length === 0) {
          const defaultLevelBadges = getWatchLevelInfo(userWatchMins).badges.map(cleanBadgeText);
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
  }, [activeUid, user, cachedUser?.displayName, cachedUser?.photoURL]);

  // Realtime Collections Listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserCollections(user.uid, (items) => {
      setCollectionsCount(items.length);
    });
    return () => unsub();
  }, [user?.uid]);

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
      const finalUrl = await uploadUserAvatarFile(user, file);

      setCustomAvatarUrl(finalUrl);
      setSelectedAvatar(finalUrl);
      setUseCustomUrl(true);
      setProfile((prev) => (prev ? { ...prev, customAvatar: finalUrl, photoURL: finalUrl } : null));

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

      toast.success("Đã tải và cập nhật ảnh đại diện thành công!");
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
      toast.success("Đã cập nhật hồ sơ cá nhân thành công!");
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
      toast.success("Đã lưu và đồng bộ thiết lập trình phát Cloud thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật player settings:", err);
      toast.error("Không thể lưu cài đặt lúc này. Vui lòng thử lại!");
    } finally {
      setIsSavingPlayerSettings(false);
    }
  };

  if (!mounted || (loading && !currentUser)) {
    return (
      <div className="min-h-[50dvh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-zinc-400">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  // Not Logged In Screen
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto shadow-2xl">
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

      {/* 2. PROFILE HERO CARD + 3. QUICK STATS BAR */}
      <ProfileHeroCard
        email={currentUser.email}
        profile={profile}
        effectiveAvatar={effectiveAvatar}
        effectiveDisplayName={effectiveDisplayName}
        levelInfo={levelInfo}
        watchMins={watchMins}
        watchHours={watchHours}
        progressPct={progressPct}
        isUploadingAvatar={isUploadingAvatar}
        onTriggerAvatarUpload={() => fileInputRef.current?.click()}
        watchHistoryCount={watchHistoryCount}
        watchlistCount={watchlistCount}
        collectionsCount={collectionsCount}
        commentsCount={userComments.length}
        onOpenCommentsTab={() => handleTabChange("comments")}
      />

      {/* 4. MODERN TAB SWITCHER */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 rounded-2xl bg-zinc-900/80 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleTabChange("profile")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === "profile"
              ? "bg-netflix-red text-white shadow-sm shadow-black/40"
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
              ? "bg-netflix-red text-white shadow-sm shadow-black/40"
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
              ? "bg-netflix-red text-white shadow-sm shadow-black/40"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Đánh Giá</span>
            <span className="hidden sm:inline">Đánh Giá ({userComments.length})</span>
          </span>
          <span className="sm:hidden text-xs px-1.5 py-0.5 rounded-full bg-white/20 font-black shrink-0 tabular-nums">
            {userComments.length}
          </span>
        </button>
      </div>

      {/* 5. TAB CONTENTS */}
      <div className="rounded-3xl bg-zinc-950/80 p-4 sm:p-7 shadow-xl backdrop-blur-xl">
        {activeTab === "profile" && (
          <ProfileEditFormTab
            onSubmit={handleSaveProfile}
            isUploadingAvatar={isUploadingAvatar}
            onTriggerAvatarUpload={() => fileInputRef.current?.click()}
            useCustomUrl={useCustomUrl}
            setUseCustomUrl={setUseCustomUrl}
            selectedAvatar={selectedAvatar}
            setSelectedAvatar={setSelectedAvatar}
            customAvatarUrl={customAvatarUrl}
            displayName={displayName}
            setDisplayName={setDisplayName}
            bio={bio}
            setBio={setBio}
            watchMins={watchMins}
            userBadges={userBadges}
            badgeHint={badgeHint}
            toggleBadge={toggleBadge}
            favoriteGenres={favoriteGenres}
            toggleGenre={toggleGenre}
            isSavingProfile={isSavingProfile}
          />
        )}

        {activeTab === "player_settings" && (
          <ProfilePlayerSettingsTab
            playerSettings={playerSettings}
            setPlayerSettingsState={setPlayerSettingsState}
            handleSavePlayerSettings={handleSavePlayerSettings}
            isSavingPlayerSettings={isSavingPlayerSettings}
            userId={user?.uid}
          />
        )}

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
