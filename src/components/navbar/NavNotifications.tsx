"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Film,
  Flame,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import { UserNotification } from "@/types/notification";

export interface DynamicNotification {
  id: string;
  type: "movie" | "live" | "hot";
  title: string;
  message: string;
  time: string;
  link: string;
  image?: string;
  badge?: string;
  badgeColor?: string;
}

let cachedNotificationsData: DynamicNotification[] | null = null;
let lastNotificationsFetchTime = 0;

export const NavNotifications: React.FC = React.memo(function NavNotifications() {
  const router = useRouter();
  const { user } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState<DynamicNotification[]>(() => cachedNotificationsData || []);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "replies" | "system">("all");
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);

  const notificationRef = useRef<HTMLDivElement>(null);

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

  const dedupedUserNotifications = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const result: UserNotification[] = [];
    for (const item of userNotifications) {
      if (!item || !item.id) continue;
      const semanticKey = item.commentId
        ? `cmt_${item.commentId}`
        : item.type === "new_episode"
        ? `ep_${item.movieSlug}_${item.title}`
        : `${item.type}_${item.title}_${item.message}_${Math.floor((item.createdAt || 0) / 120000)}`;

      if (seenIds.has(item.id) || seenKeys.has(semanticKey)) continue;
      seenIds.add(item.id);
      seenKeys.add(semanticKey);
      result.push(item);
    }
    return result;
  }, [userNotifications]);

  const userUnreadCount = dedupedUserNotifications.filter((n) => !n.isRead).length;

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const loadDynamicNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedNotificationsData && now - lastNotificationsFetchTime < 180000) {
      setNotifications(cachedNotificationsData);
      return;
    }

    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const items: DynamicNotification[] = Array.isArray(data.items) ? [...data.items] : [];

        // Check local storage for continue watching
        try {
          const historyRaw = localStorage.getItem("nanaflix_history");
          if (historyRaw) {
            const hist = JSON.parse(historyRaw);
            if (Array.isArray(hist) && hist.length > 0) {
              const last = hist[0];
              if (last?.slug && last?.name) {
                items.unshift({
                  id: `continue-${last.slug}`,
                  type: "movie",
                  title: "Tiếp Tục Xem Phim",
                  message: `${last.name}${last.episodeName ? ` (${last.episodeName})` : ""} đang chờ bạn. Bấm để xem tiếp ngay!`,
                  time: "Gần đây",
                  link: last.currentEpisodeUrl || `/movies/${last.slug}`,
                  image: last.poster || last.thumb || "/default-hero.jpg",
                  badge: "XEM TIẾP",
                  badgeColor: "bg-emerald-600 text-white",
                });
              }
            }
          }
        } catch {}

        const finalItems = items.slice(0, 8);
        cachedNotificationsData = finalItems;
        lastNotificationsFetchTime = Date.now();
        setNotifications(finalItems);
      }
    } catch (err) {
      console.error("Lỗi lấy thông báo:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    if (cachedNotificationsData) {
      setNotifications(cachedNotificationsData);
    }
    const deferTimer = setTimeout(() => {
      loadDynamicNotifications();
    }, cachedNotificationsData ? 5000 : 1200);

    return () => clearTimeout(deferTimer);
  }, [loadDynamicNotifications]);

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

  return (
    <div ref={notificationRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          const nextState = !showNotifications;
          setShowNotifications(nextState);
          setHasUnread(false);
          if (nextState && notifications.length === 0) {
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
        <div className="fixed sm:absolute top-[52px] sm:top-full mt-0 sm:mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-[410px] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-zinc-950/98 border border-white/15 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
              Tất cả ({dedupedUserNotifications.length + notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setNotifTab("replies")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                notifTab === "replies"
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
              onClick={() => setNotifTab("system")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                notifTab === "system"
                  ? "bg-netflix-red text-white font-bold shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🎬 Phim mới ({notifications.length})
            </button>
          </div>

          {/* LIST */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto overscroll-contain pr-1 scrollbar-none">
            {notifTab !== "system" && dedupedUserNotifications.map((item) => {
              const isReply = item.type === "comment_reply";
              const itemAvatar = isReply ? (item.replierAvatar || item.image) : item.image;
              const initialLetter = (item.replierName || item.title || "U").trim().charAt(0).toUpperCase();

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (user) {
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
                        : "bg-rose-950/30 border-rose-500/30 hover:bg-rose-950/45"
                      : "bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {isReply ? (
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
                    ) : (
                      <div className="relative w-10 h-13 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center shadow-md border border-white/15">
                        {itemAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={itemAvatar}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film size={18} className="text-netflix-red" />
                        )}
                      </div>
                    )}

                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-zinc-950 flex items-center justify-center text-white shadow-md ${
                        isReply ? "bg-blue-500" : "bg-rose-500"
                      }`}
                    >
                      {isReply ? (
                        <MessageSquare size={8} className="fill-white text-white" />
                      ) : (
                        <Sparkles size={8} className="fill-white text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <h5 className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                        {isReply ? (item.replierName || "Thành viên") : item.title}
                      </h5>
                      <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] font-medium flex items-center gap-1.5 ${
                        isReply ? "text-blue-400" : "text-rose-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isReply ? "bg-blue-400" : "bg-rose-400"
                        }`}
                      />
                      <span className="truncate">
                        {isReply ? "Đã trả lời bình luận của bạn" : `${item.episodeName || "Tập mới"} đã phát hành!`}
                      </span>
                    </p>
                    <div className="text-xs text-zinc-200 line-clamp-2 mt-1.5 bg-white/[0.06] rounded-xl px-2.5 py-1.5 border border-white/5 leading-relaxed">
                      {item.message}
                    </div>
                  </div>
                  {!item.isRead && (
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ring-2 ${
                        isReply
                          ? "bg-blue-500 ring-blue-950/50"
                          : "bg-rose-500 ring-rose-950/50"
                      }`}
                    />
                  )}
                </div>
              );
            })}

            {notifTab !== "replies" && notifications.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                onClick={() => setShowNotifications(false)}
                className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 transition border border-white/5 hover:border-white/10 group"
              >
                <div className="relative flex-shrink-0">
                  {item.type === "live" ? (
                    <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-950/40 border border-white/15">
                      <Flame size={20} className="fill-white animate-pulse" />
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[7px] font-black border border-zinc-950 tracking-wider">
                        LIVE
                      </span>
                    </div>
                  ) : item.image ? (
                    <div className="relative w-10 h-13 rounded-xl overflow-hidden bg-zinc-800 border border-white/15 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
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
                  ) : (
                    <div className="p-2.5 rounded-xl bg-netflix-red/20 text-netflix-red flex-none border border-netflix-red/30">
                      <Film size={18} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h5 className="text-[13px] text-white font-bold group-hover:text-netflix-red transition-colors truncate">
                      {item.title}
                    </h5>
                    <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="truncate">Cập nhật mới</span>
                  </p>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mt-1">
                    {item.message}
                  </p>
                </div>
              </Link>
            ))}

            {loadingNotifications && notifications.length === 0 && userNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-netflix-red" />
                <span>Đang kiểm tra cập nhật mới...</span>
              </div>
            ) : notifTab === "replies" && dedupedUserNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <MessageSquare size={24} className="text-gray-600 mb-1" />
                <span>Chưa có phản hồi bình luận nào mới</span>
                <span className="text-[10px] text-gray-500">Bình luận trên các bộ phim để nhận thông báo khi có người trả lời</span>
              </div>
            ) : notifTab === "system" && notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <Film size={24} className="text-gray-600 mb-1" />
                <span>Đang nạp cập nhật phim mới...</span>
              </div>
            ) : dedupedUserNotifications.length === 0 && notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <Bell size={24} className="text-gray-600 mb-1" />
                <span>Không có thông báo mới nào</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
});
