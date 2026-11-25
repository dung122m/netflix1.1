"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeUserNotifications } from "@/services/notificationService";
import { UserNotification } from "@/types/notification";

const movieTitleGlobalCache = new Map<string, string>();

export function formatNotificationTimeAgo(timestamp: number): string {
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
}

export function formatNotificationMovieTitle(slug?: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function useUserNotificationFeed(
  userId: string | undefined,
  filterMode: "all" | "unread",
) {
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [cachedTitles, setCachedTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) {
      setUserNotifications([]);
      return;
    }
    return subscribeUserNotifications(userId, (items) => {
      setUserNotifications(items);
    });
  }, [userId]);

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
    [dedupedNotifications],
  );

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
      if (movieTitleGlobalCache.has(item.movieSlug)) {
        return movieTitleGlobalCache.get(item.movieSlug)!;
      }
      return formatNotificationMovieTitle(item.movieSlug);
    }
    return "";
  };

  const displayedNotifications = useMemo(() => {
    if (filterMode === "unread") {
      return dedupedNotifications.filter((n) => !n.isRead);
    }
    return dedupedNotifications;
  }, [dedupedNotifications, filterMode]);

  const timelineGroups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

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

  return {
    userNotifications,
    setUserNotifications,
    dedupedNotifications,
    unreadCount,
    displayedNotifications,
    timelineGroups,
    getMovieName,
  };
}
