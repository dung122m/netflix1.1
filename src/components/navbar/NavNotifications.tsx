"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Film,
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
import { Tooltip } from "@/components/ui/Tooltip";

export const NavNotifications: React.FC = React.memo(function NavNotifications() {
  const router = useRouter();
  const { user } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");

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

  // Khử trùng lặp danh sách thông báo người dùng (comment_reply và comment_reaction)
  const dedupedUserNotifications = useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const result: UserNotification[] = [];
    for (const item of userNotifications) {
      if (!item || !item.id) continue;
      if (
        item.type !== "comment_reply" &&
        item.type !== "comment_reaction"
      ) {
        continue;
      }

      const semanticKey =
        item.commentId && item.type === "comment_reply"
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

  const displayedNotifications = useMemo(() => {
    if (filterMode === "unread") {
      return dedupedUserNotifications.filter((n) => !n.isRead);
    }
    return dedupedUserNotifications;
  }, [dedupedUserNotifications, filterMode]);

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

    for (const item of displayedNotifications) {
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
  }, [displayedNotifications]);

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
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-sky-500 ring-2 ring-zinc-950 flex items-center justify-center text-white shadow-md">
          <MessageSquare size={9} className="fill-white text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-500 ring-2 ring-zinc-950 flex items-center justify-center text-white shadow-md">
        <Heart size={9} className="fill-white text-white" />
      </div>
    );
  };

  return (
    <div ref={notificationRef} className="relative flex-shrink-0">
      <Tooltip content="Thông báo" side="bottom">
        <button
          type="button"
          onClick={() => {
            setShowNotifications((prev) => !prev);
          }}
          aria-label="Thông báo"
          className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition cursor-pointer flex-shrink-0 active:scale-95"
        >
          <Bell size={16} className="sm:hidden" />
          <Bell size={18} className="hidden sm:block" />
          {userUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-[16px] rounded-full bg-netflix-red text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-lg border border-black animate-pulse">
              {userUnreadCount > 9 ? "9+" : userUnreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {/* NOTIFICATION POPUP DROPDOWN */}
      {showNotifications && (
        <div className="fixed sm:absolute top-[52px] sm:top-full mt-0 sm:mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-[430px] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-zinc-950/98 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* HEADER */}
          <div className="pb-3 mb-2.5 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-netflix-red/15 text-netflix-red">
                  <Bell size={15} />
                </div>
                <h4 className="text-white font-bold text-sm">Thông Báo</h4>
                {userUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-netflix-red text-white text-[10px] font-black animate-pulse shadow-sm">
                    {userUnreadCount} mới
                  </span>
                )}
              </div>

              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    setUserNotifications((prev) =>
                      prev.map((item) => ({ ...item, isRead: true }))
                    );
                    await markAllNotificationsAsRead(user.uid);
                  }}
                  className={`text-[11px] flex items-center gap-1.5 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5 ${
                    userUnreadCount > 0
                      ? "text-emerald-400 hover:text-emerald-300 font-semibold"
                      : "text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  <CheckCheck size={13} className={userUnreadCount > 0 ? "text-emerald-400" : "text-zinc-500"} />
                  <span>Đã đọc hết</span>
                </button>
              )}
            </div>

            {/* FILTER TABS (TẤT CẢ / CHƯA ĐỌC) */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  filterMode === "all"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                Tất cả ({dedupedUserNotifications.length})
              </button>
              {userUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode("unread")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    filterMode === "unread"
                      ? "bg-netflix-red text-white shadow-sm shadow-netflix-red/30"
                      : "text-rose-400 hover:bg-rose-500/10"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Chưa đọc ({userUnreadCount})
                </button>
              )}
            </div>
          </div>

          {/* TIMELINE NOTIFICATION LIST */}
          <div className="space-y-3.5 max-h-[400px] overflow-y-auto overscroll-contain pr-1 scrollbar-none">
            {timelineGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {group.items.map((item) => {
                  const isReply = item.type === "comment_reply";
                  const itemAvatar = item.replierAvatar || item.image;
                  const actorName =
                    item.replierName ||
                    (item.title ? item.title.split(/\s+đã\s+/i)[0].trim() : "") ||
                    "Một thành viên";
                  const actionLabel = isReply
                    ? "đã trả lời bình luận của bạn"
                    : item.reactionType
                    ? `đã thả cảm xúc "${item.reactionType}" vào bình luận`
                    : "đã thích bình luận của bạn";

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
                      className={`relative flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 cursor-pointer group ${
                        !item.isRead
                          ? "bg-gradient-to-r from-netflix-red/15 via-netflix-red/5 to-transparent border-l-2 border-l-netflix-red hover:from-netflix-red/20 hover:to-white/5 shadow-sm"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04]"
                      }`}
                    >
                      {/* AVATAR WITH INTERACTION BADGE */}
                      <div className="relative shrink-0 pt-0.5">
                        <UserAvatar
                          src={itemAvatar || undefined}
                          name={actorName}
                          sizeClassName="w-10 h-10 text-xs font-bold"
                          className="shadow-md ring-2 ring-white/10 group-hover:ring-netflix-red/40 transition"
                        />
                        {renderNotificationIcon(item)}
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="text-xs leading-snug line-clamp-2">
                            <span className="font-bold text-white group-hover:text-netflix-red transition">
                              {actorName}
                            </span>{" "}
                            <span className="text-zinc-400 font-normal">
                              {actionLabel}
                            </span>
                          </p>
                          {!item.isRead && (
                            <span
                              className="w-2 h-2 rounded-full bg-netflix-red shadow-[0_0_8px_rgba(229,9,20,0.9)] shrink-0 mt-1"
                              title="Chưa đọc"
                            />
                          )}
                        </div>

                        {/* FILM CONTEXT TAG */}
                        {item.movieSlug && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-zinc-300 border border-white/5 truncate max-w-[240px]">
                              <Film size={10} className="text-netflix-red shrink-0" />
                              <span className="truncate capitalize">{item.movieSlug.replace(/-/g, " ")}</span>
                              {item.episodeName && (
                                <span className="text-zinc-400 shrink-0">• {item.episodeName}</span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* MESSAGE PREVIEW QUOTE */}
                        {item.message && (
                          <div
                            className={`mt-2 text-xs leading-relaxed rounded-r-xl border-l-2 px-2.5 py-1.5 line-clamp-2 ${
                              isReply
                                ? "border-sky-500/70 bg-sky-950/25 text-zinc-200"
                                : "border-rose-500/70 bg-rose-950/25 text-zinc-200"
                            }`}
                          >
                            <span className="italic text-zinc-300 font-normal">{`"${item.message}"`}</span>
                          </div>
                        )}

                        {/* FOOTER: TIMESTAMP */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium mt-1.5">
                          <span>{formatTimeAgo(item.createdAt || Date.now())}</span>
                          <span className="text-zinc-500 group-hover:text-zinc-300 transition text-[10px] flex items-center gap-0.5">
                            Xem phản hồi →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {displayedNotifications.length === 0 && (
              <div className="py-10 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
                  <Bell size={20} />
                </div>
                <span className="font-medium text-zinc-400">
                  {filterMode === "unread"
                    ? "Bạn không có thông báo chưa đọc nào"
                    : "Chưa có thông báo tương tác hoặc phản hồi mới nào"}
                </span>
                {filterMode === "unread" && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className="text-[11px] text-netflix-red hover:underline font-bold mt-1"
                  >
                    Xem tất cả thông báo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
