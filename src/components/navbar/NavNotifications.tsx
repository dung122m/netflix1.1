"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import { UserNotification } from "@/types/notification";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const NavNotifications: React.FC = React.memo(function NavNotifications() {
  const router = useRouter();
  const { user } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);

  const notificationRef = useRef<HTMLDivElement>(null);

  // 1. Lắng nghe thông báo thời gian thực của user (Chỉ Comment & Like)
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

  // Khử trùng lặp danh sách thông báo người dùng (Chỉ lấy comment_reply và comment_reaction)
  const dedupedUserNotifications = useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const result: UserNotification[] = [];
    for (const item of userNotifications) {
      if (!item || !item.id) continue;
      if (item.type !== "comment_reply" && item.type !== "comment_reaction") continue;

      const semanticKey = item.commentId && item.type === "comment_reply"
        ? `cmt_${item.commentId}`
        : item.commentId && item.type === "comment_reaction"
        ? `react_${item.commentId}`
        : `${item.type}_${item.id}`;

      if (seenIds.has(item.id) || seenKeys.has(semanticKey)) continue;
      seenIds.add(item.id);
      seenKeys.add(semanticKey);
      result.push(item);
    }
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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

  // Phân nhóm theo Timeline (Hôm nay, Hôm qua, Tuần này, Cũ hơn)
  const timelineGroups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 6 * 86400000;

    const today: UserNotification[] = [];
    const yesterday: UserNotification[] = [];
    const thisWeek: UserNotification[] = [];
    const older: UserNotification[] = [];

    for (const item of dedupedUserNotifications) {
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
  }, [dedupedUserNotifications]);

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

  const renderNotificationIcon = (item: UserNotification) => {
    if (item.type === "comment_reply") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
          <MessageSquare size={8} className="fill-white text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border border-zinc-950 flex items-center justify-center text-white shadow-md">
        <Heart size={8} className="fill-white text-white" />
      </div>
    );
  };

  return (
    <div ref={notificationRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          setShowNotifications((prev) => !prev);
        }}
        title="Thông báo tương tác"
        aria-label="Thông báo"
        className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 transition cursor-pointer flex-shrink-0 active:scale-95"
      >
        <Bell size={16} className="sm:hidden" />
        <Bell size={18} className="hidden sm:block" />
        {userUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-[16px] rounded-full bg-netflix-red text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-lg border border-black animate-pulse">
            {userUnreadCount > 9 ? "9+" : userUnreadCount}
          </span>
        )}
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
              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    setUserNotifications((prev) =>
                      prev.map((item) => ({ ...item, isRead: true }))
                    );
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
                  const itemAvatar = item.replierAvatar || item.image;

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
                            : "bg-rose-950/30 border-rose-500/30 hover:bg-rose-950/45"
                          : "bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* AVATAR */}
                      <div className="relative flex-shrink-0">
                        <UserAvatar
                          src={itemAvatar || undefined}
                          name={item.replierName || item.title}
                          sizeClassName="w-10 h-10 text-sm font-black"
                          className="shadow-md ring-1 ring-white/15"
                        />
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
                            isReply ? "text-blue-400" : "text-rose-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isReply ? "bg-blue-400" : "bg-rose-400"
                            }`}
                          />
                          <span className="truncate">
                            {isReply
                              ? "Đã trả lời bình luận của bạn"
                              : "Đã thả cảm xúc với bình luận"}
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
                              : "bg-rose-500 ring-rose-950/50"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {dedupedUserNotifications.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <Bell size={24} className="text-gray-600 mb-1" />
                <span>Chưa có thông báo bình luận hoặc cảm xúc mới nào</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
