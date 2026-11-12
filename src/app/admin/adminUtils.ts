import { MovieComment } from "@/types/comment";
import { MovieCollection } from "@/types/collection";
import { UserProfile, MemberWithStats } from "@/types/user";

export type SortOption =
  | "newest"
  | "oldest"
  | "highest_rating"
  | "lowest_rating"
  | "most_liked";

export type MemberFilterOption = "all" | "admin" | "has_comments";
export type MemberSortOption = "recent" | "watch_time" | "comments" | "name";

export const VALID_ADMIN_TABS = [
  "comments",
  "members",
  "collections",
  "analytics",
] as const;

export type AdminTab = (typeof VALID_ADMIN_TABS)[number];

export interface AdminMetrics {
  totalComments: number;
  totalRatingReviews: number;
  avgScore: number;
  uniqueUsers: number;
  uniqueMovies: number;
  spoilerCount: number;
  flaggedCount: number;
  totalPublicCols: number;
  starDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

export function formatAdminDate(ts?: number): string {
  if (!ts) return "Chưa rõ";
  const d = new Date(ts);
  return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • ${d.toLocaleDateString("vi-VN")}`;
}

export function formatWatchMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return "0 phút";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function computeAllMembers(
  rawUsers: UserProfile[],
  comments: MovieComment[]
): MemberWithStats[] {
  const memberMap = new Map<string, MemberWithStats>();

  // 1. Chỉ lấy các user đã đăng ký profile trong Supabase (Registered Members)
  rawUsers.forEach((u) => {
    memberMap.set(u.uid, {
      ...u,
      commentsCount: 0,
      avgRatingGiven: 0,
      spoilerCount: 0,
    });
  });

  // 2. Tính toán thống kê bình luận cho các thành viên đã đăng ký
  const userCommentsMap = new Map<string, MovieComment[]>();
  comments.forEach((c) => {
    const list = userCommentsMap.get(c.userId) || [];
    list.push(c);
    userCommentsMap.set(c.userId, list);
  });

  const now = Date.now();
  const fiveMinsAgo = now - 5 * 60 * 1000;

  // 3. Tính toán số liệu tương tác cho từng thành viên
  const result: MemberWithStats[] = [];
  memberMap.forEach((m) => {
    const userComms = userCommentsMap.get(m.uid) || [];
    const ratedComms = userComms.filter((c) => c.rating > 0);
    const avg =
      ratedComms.length > 0
        ? Number(
            (
              ratedComms.reduce((acc, curr) => acc + curr.rating, 0) /
              ratedComms.length
            ).toFixed(1)
          )
        : 0;
    const spoilers = userComms.filter((c) => c.isSpoiler).length;

    const lastLogin = Number(m.lastLoginAt) || 0;
    const validLastLogin =
      lastLogin > 0 && lastLogin <= now + 60000 ? lastLogin : 0;
    const lastActiveAt = Math.max(validLastLogin, m.createdAt || 0);
    const isOnline = lastActiveAt >= fiveMinsAgo;

    result.push({
      ...m,
      commentsCount: userComms.length,
      avgRatingGiven: avg,
      spoilerCount: spoilers,
      lastActiveAt,
      isOnline,
      isWatchingNow: false,
      currentWatching: undefined,
    });
  });

  return result;
}

export function filterAndSortMembers(
  allMembers: MemberWithStats[],
  memberSearchQuery: string,
  memberFilter: MemberFilterOption,
  memberSortBy: MemberSortOption
): MemberWithStats[] {
  return allMembers
    .filter((m) => {
      if (memberSearchQuery.trim()) {
        const q = memberSearchQuery.toLowerCase().trim();
        const matchName = m.displayName?.toLowerCase().includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        const matchUid = m.uid?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUid) return false;
      }

      if (memberFilter === "admin" && m.role !== "admin") return false;
      if (memberFilter === "has_comments" && m.commentsCount === 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (memberSortBy === "recent")
        return (b.lastActiveAt || b.lastLoginAt || 0) - (a.lastActiveAt || a.lastLoginAt || 0);
      if (memberSortBy === "watch_time")
        return (b.watchTimeMinutes || 0) - (a.watchTimeMinutes || 0);
      if (memberSortBy === "comments") return b.commentsCount - a.commentsCount;
      if (memberSortBy === "name")
        return (a.displayName || "").localeCompare(b.displayName || "");
      return 0;
    });
}

export function computeAdminMetrics(
  comments: MovieComment[],
  collections: MovieCollection[],
  totalMemberCount: number | null
): AdminMetrics {
  const totalComments = comments.length;
  const ratedComments = comments.filter((c) => c.rating > 0);
  const totalRatingReviews = ratedComments.length;
  const avgScore =
    totalRatingReviews > 0
      ? Number(
          (
            ratedComments.reduce((acc, curr) => acc + curr.rating, 0) /
            totalRatingReviews
          ).toFixed(1)
        )
      : 0;

  const uniqueUsers = totalMemberCount !== null ? totalMemberCount : 0;
  const uniqueMovies = new Set(comments.map((c) => c.movieSlug)).size;
  const spoilerCount = comments.filter((c) => c.isSpoiler).length;
  const flaggedCount = comments.filter((c) => c.isFlagged).length;
  const totalPublicCols = collections.length;

  const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratedComments.forEach((c) => {
    const star = Math.min(5, Math.max(1, Math.round(c.rating))) as 1 | 2 | 3 | 4 | 5;
    starDistribution[star] += 1;
  });

  return {
    totalComments,
    totalRatingReviews,
    avgScore,
    uniqueUsers,
    uniqueMovies,
    spoilerCount,
    flaggedCount,
    totalPublicCols,
    starDistribution,
  };
}

export function filterAndSortComments(
  comments: MovieComment[],
  searchQuery: string,
  starFilter: number | "all",
  spoilerFilter: "all" | "spoiler" | "no_spoiler",
  flaggedFilter: "all" | "flagged" | "clean",
  sortBy: SortOption
): MovieComment[] {
  return comments
    .filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = item.userName?.toLowerCase().includes(q);
        const matchEmail = item.userEmail?.toLowerCase().includes(q);
        const matchSlug = item.movieSlug?.toLowerCase().includes(q);
        const matchTitle = item.movieTitle?.toLowerCase().includes(q);
        const matchContent = item.content?.toLowerCase().includes(q);
        const matchReason = item.flagReason?.toLowerCase().includes(q);
        if (!matchUser && !matchEmail && !matchSlug && !matchTitle && !matchContent && !matchReason) {
          return false;
        }
      }

      if (starFilter !== "all" && item.rating !== starFilter) return false;
      if (spoilerFilter === "spoiler" && !item.isSpoiler) return false;
      if (spoilerFilter === "no_spoiler" && item.isSpoiler) return false;
      if (flaggedFilter === "flagged" && !item.isFlagged) return false;
      if (flaggedFilter === "clean" && item.isFlagged) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
      if (sortBy === "highest_rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "lowest_rating") return (a.rating || 0) - (b.rating || 0);
      if (sortBy === "most_liked") return (b.likes || 0) - (a.likes || 0);
      return 0;
    });
}

export function filterCollections(
  collections: MovieCollection[],
  colSearchQuery: string
): MovieCollection[] {
  return collections.filter((item) => {
    if (!colSearchQuery.trim()) return true;
    const q = colSearchQuery.toLowerCase().trim();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.creatorName?.toLowerCase().includes(q)
    );
  });
}

