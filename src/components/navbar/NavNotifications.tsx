"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  MoreHorizontal,
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

const movieTitleGlobalCache = new Map<string, string>();

export const NavNotifications: React.FC = React.memo(function NavNotifications() {
  const router = useRouter();
  const { user } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [cachedTitles, setCachedTitles] = useState<Record<string, string>>({});

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

  // Định dạng thời gian theo chuẩn Facebook ("5 giờ", "15 giờ", "2 ngày")
  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Hôm qua";
    if (days < 7) return `${days} ngày`;
    return `${Math.floor(days / 7)} tuần`;
  };

  const formatMovieTitle = (slug?: string): string => {
    if (!slug) return "";
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Đồng bộ và tải tiêu đề tiếng Việt có dấu cho các phim trong thông báo
  useEffect(() => {
    const fromCache: Record<string, string> = {};
    const neededSlugs = new Set<string>();

    for (const n of dedupedUserNotifications) {
      if (!n.movieSlug) continue;
      if (n.movieTitle) {
        movieTitleGlobalCache.set(n.movieSlug, n.movieTitle);
        fromCache[n.movieSlug] = n.movieTitle;
      } else if (movieTitleGlobalCache.has(n.movieSlug)) {
        fromCache[n.movieSlug] = movieTitleGlobalCache.get(n.movieSlug)!;
      } else {
        neededSlugs.add(n.movieSlug);
      }
    }

    if (Object.keys(fromCache).length > 0) {
      setCachedTitles((prev) => ({ ...prev, ...fromCache }));
    }

    if (neededSlugs.size === 0) return;

    let isMounted = true;
    const slugsList = Array.from(neededSlugs).slice(0, 20);
    fetch(`/api/movies/meta?slugs=${encodeURIComponent(slugsList.join(","))}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data?.success || !data.movies) return;
        const newTitles: Record<string, string> = {};
        for (const [slug, meta] of Object.entries<Record<string, unknown>>(data.movies)) {
          const title = (meta as { title?: string })?.title;
          if (title) {
            movieTitleGlobalCache.set(slug, title);
            newTitles[slug] = title;
          }
        }
        if (Object.keys(newTitles).length > 0) {
          setCachedTitles((prev) => ({ ...prev, ...newTitles }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [dedupedUserNotifications]);

  const getMovieName = (item: UserNotification): string => {
    if (item.movieTitle) return item.movieTitle;
    if (item.movieSlug) {
      if (cachedTitles[item.movieSlug]) return cachedTitles[item.movieSlug];
      if (movieTitleGlobalCache.has(item.movieSlug)) return movieTitleGlobalCache.get(item.movieSlug)!;
      return formatMovieTitle(item.movieSlug);
    }
    return "";
  };

  const displayedNotifications = useMemo(() => {
    if (filterMode === "unread") {
      return dedupedUserNotifications.filter((n) => !n.isRead);
    }
    return dedupedUserNotifications;
  }, [dedupedUserNotifications, filterMode]);

  // Phân nhóm Timeline Facebook: "Hôm nay" & "Trước đó"
  const timelineGroups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const today: UserNotification[] = [];
    const earlier: UserNotification[] = [];

    for (const item of displayedNotifications) {
      const ts = item.createdAt || 0;
      if (ts >= startOfToday) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    }

    return [
      { label: "Hôm nay", items: today, hasViewAll: false },
      { label: "Trước đó", items: earlier, hasViewAll: true },
    ].filter((g) => g.items.length > 0);
  }, [displayedNotifications]);

  // Click outside to close cả popup và options menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Icon badge nhỏ ở góc avatar kiểu Facebook
  const renderNotificationIcon = (item: UserNotification) => {
    if (item.type === "comment_reply") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00a884] border-2 border-[#242526] flex items-center justify-center text-white shadow-md">
          <MessageSquare size={11} className="fill-white text-white" />
        </div>
      );
    }
    if (item.type === "comment_reaction") {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#fa3e3e] border-2 border-[#242526] flex items-center justify-center text-white shadow-md">
          <Heart size={11} className="fill-white text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 border-2 border-[#242526] flex items-center justify-center text-white shadow-md">
        <Bell size={11} className="fill-white text-white" />
      </div>
    );
  };

  // Nội dung thông báo dòng chảy liền mạch chuẩn Facebook
  const renderFacebookContent = (
    item: UserNotification,
    actorName: string,
    movieName: string
  ) => {
    const isReply = item.type === "comment_reply";
    const isReaction = item.type === "comment_reaction";

    if (isReply) {
      return (
        <p className="text-[13px] text-zinc-300 leading-snug line-clamp-3">
          <strong className="font-bold text-white hover:underline">{actorName}</strong>
          {" đã phản hồi bình luận của bạn"}
          {movieName && (
            <>
              {" trong phim "}
              <strong className="font-bold text-white hover:underline">{movieName}</strong>
              {item.episodeName && <span className="text-zinc-300"> ({item.episodeName})</span>}
            </>
          )}
          {item.message ? `: "${item.message}"` : "."}
        </p>
      );
    }

    if (isReaction) {
      return (
        <p className="text-[13px] text-zinc-300 leading-snug line-clamp-3">
          <strong className="font-bold text-white hover:underline">{actorName}</strong>
          {" đã thả cảm xúc "}
          {item.reactionType ? (
            <strong className="font-bold text-white">{item.reactionType}</strong>
          ) : (
            "yêu thích"
          )}
          {" vào bình luận của bạn"}
          {movieName && (
            <>
              {" trong phim "}
              <strong className="font-bold text-white hover:underline">{movieName}</strong>
            </>
          )}
          {item.message ? `: "${item.message}"` : "."}
        </p>
      );
    }

    if (item.type === "achievement_level") {
      return (
        <p className="text-[13px] text-zinc-300 leading-snug line-clamp-3">
          <strong className="font-bold text-white">Chúc mừng nhé!</strong>
          {" Bạn đã nhận được huy hiệu "}
          <strong className="font-bold text-white">{item.title || "fan cứng"}</strong>.
        </p>
      );
    }

    return (
      <p className="text-[13px] text-zinc-300 leading-snug line-clamp-3">
        <strong className="font-bold text-white">{item.title}</strong>
        {item.message && ` ${item.message}`}
      </p>
    );
  };

  return (
    <div ref={notificationRef} className="relative flex-shrink-0">
      <Tooltip content="Thông báo" side="bottom">
        <button
          type="button"
          onClick={() => {
            setShowNotifications((prev) => !prev);
            setShowOptionsMenu(false);
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

      {/* FACEBOOK-STYLE NOTIFICATION POPUP DROPDOWN */}
      {showNotifications && (
        <div className="fixed sm:absolute top-[52px] sm:top-full mt-0 sm:mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-[380px] md:w-[400px] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-[#242526] backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-white/10 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* HEADER (TIÊU ĐỀ + NÚT 3 CHẤM ...) */}
          <div className="flex items-center justify-between px-1 pb-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">Thông báo</h3>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOptionsMenu((prev) => !prev)}
                title="Tùy chọn thông báo"
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <MoreHorizontal size={20} />
              </button>

              {/* THREE-DOTS CONTEXT MENU */}
              {showOptionsMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#242526] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={async () => {
                      setShowOptionsMenu(false);
                      setUserNotifications((prev) =>
                        prev.map((item) => ({ ...item, isRead: true }))
                      );
                      if (user?.uid) await markAllNotificationsAsRead(user.uid);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 rounded-lg transition text-left cursor-pointer"
                  >
                    <CheckCheck size={16} className="text-[#1877f2]" />
                    <span>Đánh dấu tất cả là đã đọc</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FILTER PILLS: "Tất cả" & "Chưa đọc" */}
          <div className="flex items-center gap-2 px-1 mb-2.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition cursor-pointer ${
                filterMode === "all"
                  ? "bg-[#1877f2] text-white shadow-sm"
                  : "text-zinc-300 hover:bg-white/10"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("unread")}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition cursor-pointer ${
                filterMode === "unread"
                  ? "bg-[#1877f2] text-white shadow-sm"
                  : "text-zinc-300 hover:bg-white/10"
              }`}
            >
              Chưa đọc
            </button>
          </div>

          {/* TIMELINE NOTIFICATION LIST */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto overscroll-contain pr-0.5 scrollbar-none">
            {timelineGroups.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <div className="flex items-center justify-between px-2 pt-1 pb-1">
                  <span className="text-base font-bold text-white">
                    {group.label}
                  </span>
                  {group.hasViewAll && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        router.push("/notifications");
                      }}
                      className="text-sm font-semibold text-[#1877f2] hover:underline cursor-pointer"
                    >
                      Xem tất cả
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const itemAvatar = item.replierAvatar || item.image;
                    const actorName =
                      item.replierName ||
                      (item.title ? item.title.split(/\s+đã\s+/i)[0].trim() : "") ||
                      "Một thành viên";
                    const movieName = getMovieName(item);

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
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer group relative"
                      >
                        {/* FACEBOOK ROUND AVATAR WITH OVERLAPPING BADGE */}
                        <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14">
                          <UserAvatar
                            src={itemAvatar || undefined}
                            name={actorName}
                            sizeClassName="w-12 h-12 sm:w-14 sm:h-14 text-base font-bold"
                            className="rounded-full shadow-sm"
                          />
                          {renderNotificationIcon(item)}
                        </div>

                        {/* FACEBOOK INLINE FLOWING TEXT BODY */}
                        <div className="flex-1 min-w-0 pr-1">
                          {renderFacebookContent(item, actorName, movieName)}
                          <span
                            className={`text-xs mt-0.5 block font-medium ${
                              !item.isRead ? "text-[#1877f2] font-semibold" : "text-zinc-400"
                            }`}
                          >
                            {formatTimeAgo(item.createdAt || Date.now())}
                          </span>
                        </div>

                        {/* FACEBOOK BLUE UNREAD DOT */}
                        {!item.isRead && (
                          <span
                            className="w-3 h-3 rounded-full bg-[#1877f2] shrink-0 self-center mr-1 shadow-[0_0_6px_rgba(24,119,242,0.6)]"
                            title="Chưa đọc"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {displayedNotifications.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                  <Bell size={24} />
                </div>
                <span className="font-semibold text-sm text-zinc-300">
                  {filterMode === "unread"
                    ? "Không có thông báo chưa đọc nào"
                    : "Bạn không có thông báo nào"}
                </span>
                {filterMode === "unread" && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className="text-xs text-[#1877f2] hover:underline font-bold mt-1"
                  >
                    Xem tất cả thông báo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM BUTTON: "Xem thông báo trước đó" (CHUẨN FACEBOOK) */}
          {displayedNotifications.length > 0 && (
            <div className="pt-2 px-1">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(false);
                  router.push("/notifications");
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition text-center cursor-pointer"
              >
                Xem thông báo trước đó
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
