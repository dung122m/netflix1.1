"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
  Trash2,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/services/notificationService";
import { UserNotification } from "@/types/notification";
import { UserAvatar } from "@/components/ui/UserAvatar";

const movieTitleGlobalCache = new Map<string, string>();

export function NotificationsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);
  const [cachedTitles, setCachedTitles] = useState<Record<string, string>>({});

  const globalMenuRef = useRef<HTMLDivElement>(null);
  const itemMenuRef = useRef<HTMLDivElement>(null);

  // 1. Lắng nghe thông báo thời gian thực của user
  useEffect(() => {
    if (!user?.uid) {
      setUserNotifications([]);
      return;
    }
    const unsub = subscribeUserNotifications(user.uid, (items) => {
      setUserNotifications(items);
    });
    return () => unsub();
  }, [user?.uid]);

  // Click outside để đóng menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (globalMenuRef.current && !globalMenuRef.current.contains(e.target as Node)) {
        setShowGlobalMenu(false);
      }
      if (itemMenuRef.current && !itemMenuRef.current.contains(e.target as Node)) {
        setActiveItemMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Khử trùng lặp danh sách thông báo
  const dedupedNotifications = useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const result: UserNotification[] = [];

    for (const item of userNotifications) {
      if (!item || !item.id) continue;
      if (item.type !== "comment_reply" && item.type !== "comment_reaction") {
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

  const unreadCount = useMemo(
    () => dedupedNotifications.filter((n) => !n.isRead).length,
    [dedupedNotifications]
  );

  const displayedNotifications = useMemo(() => {
    if (filterMode === "unread") {
      return dedupedNotifications.filter((n) => !n.isRead);
    }
    return dedupedNotifications;
  }, [dedupedNotifications, filterMode]);

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
      { label: "Hôm nay", items: today },
      { label: "Trước đó", items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [displayedNotifications]);

  // Định dạng thời gian theo chuẩn Facebook
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

    for (const n of dedupedNotifications) {
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
  }, [dedupedNotifications]);

  const getMovieName = (item: UserNotification): string => {
    if (item.movieTitle) return item.movieTitle;
    if (item.movieSlug) {
      if (cachedTitles[item.movieSlug]) return cachedTitles[item.movieSlug];
      if (movieTitleGlobalCache.has(item.movieSlug)) return movieTitleGlobalCache.get(item.movieSlug)!;
      return formatMovieTitle(item.movieSlug);
    }
    return "";
  };

  const handleMarkAllRead = async () => {
    setShowGlobalMenu(false);
    setUserNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (user?.uid) {
      await markAllNotificationsAsRead(user.uid);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    setActiveItemMenuId(null);
    setUserNotifications((prev) => prev.filter((n) => n.id !== notifId));
    if (user?.uid) {
      await deleteNotification(user.uid, notifId);
    }
  };

  const handleNotificationClick = (item: UserNotification) => {
    if (user?.uid && !item.isRead) {
      setUserNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      markNotificationAsRead(user.uid, item.id);
    }

    const targetLink =
      item.link ||
      (item.movieSlug
        ? item.commentId
          ? `/movies/${item.movieSlug}?highlightComment=${item.commentId}#comment-${item.commentId}`
          : `/movies/${item.movieSlug}#comments`
        : "/");

    router.push(targetLink);

    if (item.commentId && typeof window !== "undefined") {
      const fireHighlight = () => {
        window.dispatchEvent(
          new CustomEvent("nanaflix-highlight-comment", {
            detail: { commentId: item.commentId },
          })
        );
      };
      fireHighlight();
      setTimeout(fireHighlight, 200);
      setTimeout(fireHighlight, 600);
    }
  };

  // Badge icon nhỏ góc dưới avatar
  const renderBadgeIcon = (item: UserNotification) => {
    if (item.type === "comment_reply") {
      return (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#00a884] border-2 border-[#18191a] flex items-center justify-center text-white shadow-md">
          <MessageSquare size={12} className="fill-white text-white" />
        </div>
      );
    }
    if (item.type === "comment_reaction") {
      return (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#fa3e3e] border-2 border-[#18191a] flex items-center justify-center text-white shadow-md">
          <Heart size={12} className="fill-white text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-600 border-2 border-[#18191a] flex items-center justify-center text-white shadow-md">
        <Bell size={12} className="fill-white text-white" />
      </div>
    );
  };

  // Nội dung thông báo dòng chảy liền mạch chuẩn Facebook
  const renderItemText = (item: UserNotification, actorName: string, movieName: string) => {
    const isReply = item.type === "comment_reply";
    const isReaction = item.type === "comment_reaction";

    if (isReply) {
      return (
        <p className="text-sm sm:text-[15px] text-zinc-300 leading-snug line-clamp-3">
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
        <p className="text-sm sm:text-[15px] text-zinc-300 leading-snug line-clamp-3">
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
        <p className="text-sm sm:text-[15px] text-zinc-300 leading-snug line-clamp-3">
          <strong className="font-bold text-white">Chúc mừng nhé!</strong>
          {" Bạn đã nhận được huy hiệu "}
          <strong className="font-bold text-white">{item.title || "fan cứng"}</strong>.
        </p>
      );
    }

    return (
      <p className="text-sm sm:text-[15px] text-zinc-300 leading-snug line-clamp-3">
        <strong className="font-bold text-white">{item.title}</strong>
        {item.message && ` ${item.message}`}
      </p>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[50dvh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-zinc-400">Đang tải thông báo...</p>
      </div>
    );
  }

  // Màn hình khi chưa đăng nhập
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto shadow-2xl">
          <Bell className="w-10 h-10 text-netflix-red" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Yêu cầu đăng nhập</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Vui lòng đăng nhập để xem thông báo phản hồi bình luận, biểu cảm và tương tác từ cộng đồng xem phim Nanaflix.
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

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 space-y-4">
      {/* 1. BREADCRUMB */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/" className="hover:text-white transition">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-200 font-semibold">Thông báo</span>
      </nav>

      {/* 2. MAIN FACEBOOK NOTIFICATIONS FEED CARD */}
      <div className="rounded-3xl bg-[#18191a]/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-4">
        {/* HEADER: TIÊU ĐỀ + NÚT 3 CHẤM MENU */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Thông báo
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#1877f2]/20 text-[#1877f2] text-xs font-black tabular-nums">
                {unreadCount} mới
              </span>
            )}
          </div>

          <div ref={globalMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowGlobalMenu((prev) => !prev)}
              aria-label="Tùy chọn thông báo"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer active:scale-95"
            >
              <MoreHorizontal size={20} />
            </button>

            {/* CONTEXT MENU */}
            {showGlobalMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#242526] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 rounded-xl transition text-left cursor-pointer"
                >
                  <CheckCheck size={18} className="text-[#1877f2]" />
                  <span>Đánh dấu tất cả là đã đọc</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FILTER PILLS: "Tất cả" & "Chưa đọc" */}
        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition cursor-pointer ${
              filterMode === "all"
                ? "bg-[#1877f2] text-white"
                : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            Tất cả ({dedupedNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unread")}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition cursor-pointer ${
              filterMode === "unread"
                ? "bg-[#1877f2] text-white"
                : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {/* TIMELINE NOTIFICATION GROUPS */}
        <div className="space-y-4">
          {timelineGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <h2 className="text-sm font-bold text-zinc-400 px-2 pt-1 pb-1">
                {group.label}
              </h2>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const itemAvatar = item.replierAvatar || item.image;
                  const actorName =
                    item.replierName ||
                    (item.title ? item.title.split(/\s+đã\s+/i)[0].trim() : "") ||
                    "Một thành viên";
                  const movieName = getMovieName(item);
                  const isItemMenuOpen = activeItemMenuId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`relative flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer group ${
                        !item.isRead
                          ? "bg-[#1877f2]/[0.08] hover:bg-[#1877f2]/[0.14]"
                          : "hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* FACEBOOK ROUND AVATAR WITH OVERLAPPING BADGE */}
                      <div className="relative shrink-0 w-13 h-13 sm:w-15 sm:h-15">
                        <UserAvatar
                          src={itemAvatar || undefined}
                          name={actorName}
                          sizeClassName="w-13 h-13 sm:w-15 sm:h-15 text-base font-black"
                          className="rounded-full shadow-md"
                        />
                        {renderBadgeIcon(item)}
                      </div>

                      {/* FACEBOOK INLINE FLOWING TEXT BODY */}
                      <div className="flex-1 min-w-0 pr-2">
                        {renderItemText(item, actorName, movieName)}
                        <span
                          className={`text-xs mt-1 block font-medium ${
                            !item.isRead ? "text-[#1877f2] font-bold" : "text-zinc-400"
                          }`}
                        >
                          {formatTimeAgo(item.createdAt || Date.now())}
                        </span>
                      </div>

                      {/* RIGHT ACTIONS: BLUE UNREAD DOT & 3-DOTS ACTION */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!item.isRead && (
                          <span
                            className="w-3 h-3 rounded-full bg-[#1877f2]"
                            aria-label="Chưa đọc"
                          />
                        )}

                        <div
                          ref={isItemMenuOpen ? itemMenuRef : null}
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveItemMenuId(isItemMenuOpen ? null : item.id);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                            aria-label="Tùy chọn"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {/* ITEM DROPDOWN MENU */}
                          {isItemMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#242526] rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveItemMenuId(null);
                                  if (user?.uid) {
                                    setUserNotifications((prev) =>
                                      prev.map((n) =>
                                        n.id === item.id ? { ...n, isRead: !n.isRead } : n
                                      )
                                    );
                                    if (!item.isRead) {
                                      markNotificationAsRead(user.uid, item.id);
                                    }
                                  }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 rounded-lg transition text-left cursor-pointer"
                              >
                                <CheckCheck size={14} className="text-[#1877f2]" />
                                <span>{item.isRead ? "Đánh dấu là chưa đọc" : "Đánh dấu là đã đọc"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteItem(e, item.id)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition text-left cursor-pointer"
                              >
                                <Trash2 size={14} className="text-red-400" />
                                <span>Gỡ thông báo này</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {displayedNotifications.length === 0 && (
            <div className="py-16 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 shadow-inner">
                <Bell size={32} />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-base text-zinc-200 block">
                  {filterMode === "unread"
                    ? "Không có thông báo chưa đọc nào"
                    : "Bạn không có thông báo nào"}
                </span>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Khi người khác phản hồi bình luận hoặc thả cảm xúc vào nhận xét của bạn, thông báo sẽ xuất hiện tại đây.
                </p>
              </div>
              {filterMode === "unread" && (
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className="px-4 py-1.5 rounded-full bg-[#1877f2] hover:brightness-110 text-white font-bold text-xs mt-2 transition cursor-pointer"
                >
                  Xem tất cả thông báo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

