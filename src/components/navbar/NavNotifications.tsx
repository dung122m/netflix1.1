"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Film,
  Flame,
  Heart,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkAndNotifyFollowedActors,
} from "@/services/notificationService";
import { UserNotification, NotificationType } from "@/types/notification";

export interface DynamicNotification {
  id: string;
  type: "movie" | "live" | "hot" | "system";
  title: string;
  message: string;
  time?: string;
  link: string;
  image?: string;
  badge?: string;
  badgeColor?: string;
  createdAt?: number;
  actors?: string[];
}

let cachedNotificationsData: DynamicNotification[] | null = null;
let lastNotificationsFetchTime = 0;

export const NavNotifications: React.FC = React.memo(function NavNotifications() {
  const router = useRouter();
  const { user } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [systemNotifications, setSystemNotifications] = useState<DynamicNotification[]>(
    () => cachedNotificationsData || []
  );
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "personal" | "movies">("all");
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);

  const notificationRef = useRef<HTMLDivElement>(null);

  // 1. Lắng nghe thông báo thời gian thực của user
  useEffect(() => {
    if (!user?.uid) {
      setUserNotifications([]);
      return;
    }
    const unsubNotif = subscribeUserNotifications(user.uid, (items) => {
      setUserNotifications(items);
    });
    return () => unsubNotif();
  }, [user?.uid]);

  // Khử trùng lặp danh sách thông báo người dùng
  const dedupedUserNotifications = useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const result: UserNotification[] = [];
    for (const item of userNotifications) {
      if (!item || !item.id) continue;
      const semanticKey = item.commentId && item.type === "comment_reply"
        ? `cmt_${item.commentId}`
        : item.commentId && item.type === "comment_reaction"
        ? `react_${item.commentId}`
        : item.movieSlug && item.type === "actor_movie" && item.actorId
        ? `actor_${item.movieSlug}_${item.actorId}`
        : item.type === "new_episode" || item.type === "watchlist_episode" || item.type === "continue_watching_episode"
        ? `${item.type}_${item.movieSlug}_${item.title}_${item.episodeName || ""}`
        : item.type === "achievement_level"
        ? `achieve_${item.id}`
        : `${item.type}_${item.title}_${item.message}_${Math.floor((item.createdAt || 0) / 120000)}`;

      if (seenIds.has(item.id) || seenKeys.has(semanticKey)) continue;
      seenIds.add(item.id);
      seenKeys.add(semanticKey);
      result.push(item);
    }
    return result;
  }, [userNotifications]);

  const userUnreadCount = useMemo(
    () => dedupedUserNotifications.filter((n) => !n.isRead).length,
    [dedupedUserNotifications]
  );

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Hôm qua";
    if (days < 7) return `${days} ngày trước`;
    return `${Math.floor(days / 7)} tuần trước`;
  };

  // 2. Nạp thông báo phim mới / hệ thống từ API và kích hoạt check actor follow
  const loadDynamicNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedNotificationsData && now - lastNotificationsFetchTime < 180000) {
      setSystemNotifications(cachedNotificationsData);
      return;
    }

    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications?type=system");
      if (res.ok) {
        const data = await res.json();
        const items: DynamicNotification[] = Array.isArray(data.items) ? [...data.items] : [];

        // Check local storage for continue watching movie
        try {
          const historyRaw = localStorage.getItem("nanaflix_watch_history");
          if (historyRaw) {
            const hist = JSON.parse(historyRaw);
            if (Array.isArray(hist) && hist.length > 0) {
              const last = hist[0];
              const movieTitle = last?.title || last?.name;
              if (last?.slug && movieTitle) {
                const epSlug = last.episodeSlug;
                const targetLink = epSlug ? `/movies/${last.slug}?ep=${epSlug}` : `/movies/${last.slug}`;
                const notifId = `continue-${last.slug}`;
                const existingIdx = items.findIndex((i) => i.id === notifId);
                if (existingIdx >= 0) {
                  items.splice(existingIdx, 1);
                }
                items.unshift({
                  id: notifId,
                  type: "movie",
                  title: "Tiếp Tục Xem Phim",
                  message: `${movieTitle}${last.episodeName ? ` (${last.episodeName})` : ""} đang chờ bạn. Bấm để xem tiếp ngay!`,
                  time: "Gần đây",
                  link: last.currentEpisodeUrl || targetLink,
                  image: last.poster || last.thumb || "/default-hero.jpg",
                  badge: "XEM TIẾP",
                  badgeColor: "bg-emerald-600 text-white",
                  createdAt: Number(last.updatedAt || last.syncedAt) || Date.now() - 600000,
                });
              }
            }
          }
        } catch {}

        const finalItems = items.slice(0, 10);
        cachedNotificationsData = finalItems;
        lastNotificationsFetchTime = Date.now();
        setSystemNotifications(finalItems);

        // Kích hoạt kiểm tra phim mới cho các diễn viên mà user đang follow
        if (user?.uid && items.length > 0) {
          const movieCandidates = items.map((it) => ({
            slug: it.id.replace("sys_movie_", ""),
            name: it.title,
            poster: it.image,
            actors: it.actors || [],
          }));
          checkAndNotifyFollowedActors(user.uid, movieCandidates).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Lỗi lấy thông báo hệ thống:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (cachedNotificationsData) {
      setSystemNotifications(cachedNotificationsData);
    }
    const deferTimer = setTimeout(() => {
      loadDynamicNotifications();
    }, cachedNotificationsData ? 5000 : 1200);

    return () => clearTimeout(deferTimer);
  }, [loadDynamicNotifications]);

  // 3. HỢP NHẤT TOÀN BỘ NOTIFICATIONS VÀ SORT THEO created_at DESC (MỚI NHẤT LÊN ĐẦU)
  const unifiedNotifications = useMemo(() => {
    const list: Array<UserNotification & { isSystemItem?: boolean; badge?: string; badgeColor?: string }> = [];

    // Nạp toàn bộ thông báo người dùng
    for (const item of dedupedUserNotifications) {
      list.push(item);
    }

    // Nạp các thông báo hệ thống / phim mới
    for (const sys of systemNotifications) {
      const isAlreadyInUserNotif = list.some((u) => u.id === sys.id || (u.movieSlug && sys.id.includes(u.movieSlug)));
      if (!isAlreadyInUserNotif) {
        list.push({
          id: sys.id,
          type: (sys.type === "live" ? "match_reminder" : sys.type === "hot" ? "movie_recommend" : "system") as NotificationType,
          title: sys.title,
          message: sys.message,
          link: sys.link,
          image: sys.image,
          badge: sys.badge,
          badgeColor: sys.badgeColor,
          isRead: true, // System items don't hold unread count
          createdAt: sys.createdAt || Date.now() - 3600000,
          isSystemItem: true,
        });
      }
    }

    // QUY TẮC CỐT LÕI: Sắp xếp giảm dần theo thời gian tạo thực tế (created_at DESC)
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [dedupedUserNotifications, systemNotifications]);

  // Lọc theo Tab đã chọn
  const filteredNotifications = useMemo(() => {
    if (notifTab === "personal") {
      return unifiedNotifications.filter((item) =>
        item.type === "comment_reply" ||
        item.type === "comment_reaction" ||
        item.type === "achievement_level"
      );
    }
    if (notifTab === "movies") {
      return unifiedNotifications.filter((item) =>
        item.type === "actor_movie" ||
        item.type === "new_episode" ||
        item.type === "watchlist_episode" ||
        item.type === "continue_watching_episode" ||
        item.type === "system" ||
        item.type === "movie_recommend" ||
        item.type === "match_reminder"
      );
    }
    return unifiedNotifications;
  }, [unifiedNotifications, notifTab]);

  // Phân nhóm theo Timeline (Hôm nay, Hôm qua, Tuần này, Cũ hơn)
  const timelineGroups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 6 * 86400000;

    const today: typeof filteredNotifications = [];
    const yesterday: typeof filteredNotifications = [];
    const thisWeek: typeof filteredNotifications = [];
    const older: typeof filteredNotifications = [];

    for (const item of filteredNotifications) {
      const ts = item.createdAt || 0;
      if (ts >= startOfToday) {
        today.push(item);
      } else if (ts >= startOfYesterday) {
        yesterday.push(item);
      } else if (ts >= startOfWeek) {
        thisWeek.push(item);
      } else {
        older.push(item);
      }
    }

    return [
      { label: "Hôm nay", items: today },
      { label: "Hôm qua", items: yesterday },
      { label: "Tuần này", items: thisWeek },
      { label: "Cũ hơn", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderNotificationIcon = (item: (typeof filteredNotifications)[0]) => {
    const type = item.type;
    if (type === "comment_reply") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <MessageSquare size={8} className="fill-white text-white" />
        </div>
      );
    }
    if (type === "comment_reaction") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <Heart size={8} className="fill-white text-white" />
        </div>
      );
    }
    if (type === "actor_movie") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <Star size={8} className="fill-white text-white" />
        </div>
      );
    }
    if (type === "achievement_level") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <Trophy size={8} className="fill-white text-white" />
        </div>
      );
    }
    if (type === "continue_watching_episode") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <Play size={8} className="fill-white text-white" />
        </div>
      );
    }
    if (type === "match_reminder") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <Flame size={8} className="fill-white text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 border border-zinc-950 flex items-center justify-center text-white shadow-md">
        <Sparkles size={8} className="fill-white text-white" />
      </div>
    );
  };

  return (
    <div ref={notificationRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          const nextState = !showNotifications;
          setShowNotifications(nextState);
          setHasUnread(false);
          if (nextState && systemNotifications.length === 0) {
            loadDynamicNotifications(true);
          }
        }}
        title="Thông báo mới"
        aria-label="Thông báo"
        className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 transition cursor-pointer flex-shrink-0 active:scale-95"
      >
        <Bell size={16} className="sm:hidden" />
        <Bell size={18} className="hidden sm:block" />
        {userUnreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-[16px] rounded-full bg-netflix-red text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-lg border border-black animate-pulse">
            {userUnreadCount > 9 ? "9+" : userUnreadCount}
          </span>
        ) : hasUnread ? (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-netflix-red animate-pulse ring-2 ring-black" />
        ) : null}
      </button>

      {/* NOTIFICATION POPUP DROPDOWN */}
      {showNotifications && (
        <div className="fixed sm:absolute top-[52px] sm:top-full mt-0 sm:mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-[420px] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-zinc-950/98 border border-white/15 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* HEADER */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-netflix-red" />
              <h4 className="text-white font-bold text-sm">Thông Báo</h4>
              {userUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-netflix-red text-white text-[10px] font-black animate-pulse">
                  {userUnreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadDynamicNotifications(true)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Làm mới thông báo"
              >
                <RefreshCw size={13} className={loadingNotifications ? "animate-spin text-netflix-red" : ""} />
              </button>
              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    setUserNotifications((prev) =>
                      prev.map((item) => ({ ...item, isRead: true }))
                    );
                    setHasUnread(false);
                    await markAllNotificationsAsRead(user.uid);
                  }}
                  className={`text-[11px] flex items-center gap-1 transition cursor-pointer hover:underline ${
                    userUnreadCount > 0
                      ? "text-gray-300 hover:text-emerald-400 font-semibold"
                      : "text-gray-500 hover:text-gray-400"
                  }`}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={13} className={userUnreadCount > 0 ? "text-emerald-400" : "text-gray-500"} />
                  <span>Đã đọc hết</span>
                </button>
              )}
            </div>
          </div>

          {/* SEGMENT TABS */}
          <div className="flex items-center gap-1 p-1 mb-2.5 bg-zinc-900/90 rounded-xl border border-white/5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setNotifTab("all")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                notifTab === "all"
                  ? "bg-netflix-red text-white font-bold shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Tất cả ({unifiedNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setNotifTab("personal")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                notifTab === "personal"
                  ? "bg-netflix-red text-white font-bold shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>💬 Cá nhân</span>
              {userUnreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setNotifTab("movies")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                notifTab === "movies"
                  ? "bg-netflix-red text-white font-bold shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🎬 Phim & Series
            </button>
          </div>

          {/* TIMELINE NOTIFICATION LIST */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto overscroll-contain pr-1 scrollbar-none">
            {timelineGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {group.items.map((item) => {
                  const isReply = item.type === "comment_reply";
                  const isReaction = item.type === "comment_reaction";
                  const isActor = item.type === "actor_movie";
                  const isAchievement = item.type === "achievement_level";
                  const isContinue = item.type === "continue_watching_episode";
                  const isWatchlist = item.type === "watchlist_episode";

                  const itemAvatar = isReply || isReaction ? (item.replierAvatar || item.image) : item.image;
                  const initialLetter = (item.replierName || item.title || "U").trim().charAt(0).toUpperCase();

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (user && !item.isRead) {
                          setUserNotifications((prev) =>
                            prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
                          );
                          markNotificationAsRead(user.uid, item.id);
                        }
                        setShowNotifications(false);
                        if (item.commentId && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("nanaflix-highlight-comment", {
                              detail: { commentId: item.commentId },
                            })
                          );
                        }
                        const targetLink =
                          item.link ||
                          (item.movieSlug
                            ? item.commentId
                              ? `/movies/${item.movieSlug}?highlightComment=${item.commentId}#comment-${item.commentId}`
                              : `/movies/${item.movieSlug}#comments`
                            : "/");
                        router.push(targetLink);
                      }}
                      className={`flex items-start gap-3 p-3 rounded-2xl transition border cursor-pointer group ${
                        !item.isRead
                          ? isReply
                            ? "bg-blue-950/30 border-blue-500/30 hover:bg-blue-950/45"
                            : isReaction
                            ? "bg-rose-950/30 border-rose-500/30 hover:bg-rose-950/45"
                            : isActor
                            ? "bg-amber-950/30 border-amber-500/30 hover:bg-amber-950/45"
                            : isAchievement
                            ? "bg-yellow-950/30 border-yellow-500/30 hover:bg-yellow-950/45"
                            : "bg-rose-950/30 border-rose-500/30 hover:bg-rose-950/45"
                          : "bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* AVATAR / POSTER */}
                      <div className="relative flex-shrink-0">
                        {isReply || isReaction ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 flex items-center justify-center shadow-md ring-1 ring-white/15">
                            {itemAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={itemAvatar}
                                alt={item.replierName || item.title}
                                className="w-full h-full object-cover rounded-full"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : null}
                            {!itemAvatar && (
                              <span className="text-white font-black text-sm select-none">{initialLetter}</span>
                            )}
                          </div>
                        ) : isAchievement ? (
                          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center shadow-md border border-amber-400/30 text-lg">
                            {item.badgeIcon || "🏆"}
                          </div>
                        ) : (
                          <div className="relative w-10 h-13 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center shadow-md border border-white/15">
                            {itemAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={itemAvatar}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Film size={18} className="text-netflix-red" />
                            )}
                            {item.badge && (
                              <span
                                className={`absolute bottom-0 inset-x-0 text-[7px] font-black text-center py-0.5 uppercase tracking-wider ${
                                  item.badgeColor || "bg-netflix-red text-white"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}

                        {renderNotificationIcon(item)}
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <h5 className="text-[13px] font-bold text-white group-hover:text-netflix-red transition-colors truncate">
                            {item.title}
                          </h5>
                          <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                            {formatTimeAgo(item.createdAt || Date.now())}
                          </span>
                        </div>

                        {/* SUBTITLE CATEGORY */}
                        <p
                          className={`text-[11px] font-medium flex items-center gap-1.5 ${
                            isReply
                              ? "text-blue-400"
                              : isReaction
                              ? "text-rose-400"
                              : isActor
                              ? "text-amber-400"
                              : isAchievement
                              ? "text-yellow-400"
                              : isContinue
                              ? "text-purple-400"
                              : isWatchlist
                              ? "text-emerald-400"
                              : "text-zinc-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isReply
                                ? "bg-blue-400"
                                : isReaction
                                ? "bg-rose-400"
                                : isActor
                                ? "bg-amber-400"
                                : isAchievement
                                ? "bg-yellow-400"
                                : isContinue
                                ? "bg-purple-400"
                                : isWatchlist
                                ? "bg-emerald-400"
                                : "bg-zinc-400"
                            }`}
                          />
                          <span className="truncate">
                            {isReply
                              ? "Đã trả lời bình luận của bạn"
                              : isReaction
                              ? "Đã thả cảm xúc với bình luận"
                              : isActor
                              ? "Diễn viên bạn theo dõi"
                              : isAchievement
                              ? "Mở khóa thành tựu mới"
                              : isContinue
                              ? "Series đang xem có tập mới"
                              : isWatchlist
                              ? "Phim trong My List có tập mới"
                              : "Cập nhật mới"}
                          </span>
                        </p>

                        <div className="text-xs text-zinc-200 line-clamp-2 mt-1.5 bg-white/[0.06] rounded-xl px-2.5 py-1.5 border border-white/5 leading-relaxed">
                          {item.message}
                        </div>
                      </div>

                      {/* UNREAD INDICATOR */}
                      {!item.isRead && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ring-2 ${
                            isReply
                              ? "bg-blue-500 ring-blue-950/50"
                              : isReaction
                              ? "bg-rose-500 ring-rose-950/50"
                              : isActor
                              ? "bg-amber-500 ring-amber-950/50"
                              : "bg-netflix-red ring-rose-950/50"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {loadingNotifications && unifiedNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-netflix-red" />
                <span>Đang kiểm tra cập nhật mới...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <Bell size={24} className="text-gray-600 mb-1" />
                <span>Không có thông báo nào trong mục này</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
});

