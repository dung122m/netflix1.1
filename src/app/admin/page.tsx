"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Trash2,
  ExternalLink,
  MessageSquare,
  Star,
  Users,
  Film,
  AlertTriangle,
  Heart,
  FolderHeart,
  RefreshCw,
  Clock,
  Lock,
  ArrowUpDown,
  Home,
  Sparkles,
  Copy,
  Flag,
  AlertOctagon,
  Ban,
  Eye,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/lib/adminConfig";
import { AuthModal } from "@/components/AuthModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/Toast";
import { MovieComment } from "@/types/comment";
import { MovieCollection } from "@/types/collection";
import { UserProfile, MemberWithStats } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import {
  subscribeAllComments,
  fetchAllCommentsDirect,
  deleteMovieComment,
  unflagComment,
  autoCleanAllToxicAndSpamComments,
  purgeAllFlaggedComments,
  type AutoCleanResult,
} from "@/services/commentService";
import {
  subscribeAllPublicCollections,
  deletePublicCollectionAdmin,
} from "@/services/collectionService";
import {
  subscribeAllUsers,
  getUserCloudWatchHistory,
  getUserCloudWatchlist,
  deleteAllUserComments,
  setUserCommentRestriction,
  type DeviceHandoffItem,
} from "@/services/userService";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StarRating } from "@/components/MovieReviews/StarRating";
import { AdminCollectionsTab } from "./components/AdminCollectionsTab";
import { AdminMemberDetailModal } from "./components/AdminMemberDetailModal";
import { AdminCleanResultModal } from "./components/AdminCleanResultModal";
import { AdminAnalyticsTab } from "./components/AdminAnalyticsTab";

type SortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_liked";

const VALID_ADMIN_TABS = ["comments", "members", "collections", "analytics"] as const;
type AdminTab = (typeof VALID_ADMIN_TABS)[number];

function AdminDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const resolvedTab: AdminTab = useMemo(() => {
    if (tabParam && (VALID_ADMIN_TABS as readonly string[]).includes(tabParam)) {
      return tabParam as AdminTab;
    }
    return "comments";
  }, [tabParam]);

  // Tab navigation: comments | members | collections | analytics
  const [activeTab, setActiveTab] = useState<AdminTab>(resolvedTab);

  // Synchronize active tab when URL changes (e.g. Browser Back/Forward)
  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const handleTabChange = useCallback(
    (newTab: AdminTab) => {
      setActiveTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, searchParams, router]
  );

  // Data states
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [totalMemberCount, setTotalMemberCount] = useState(0);
  const [deviceHandoffs, setDeviceHandoffs] = useState<DeviceHandoffItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filter & Search states for comments
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [spoilerFilter, setSpoilerFilter] = useState<"all" | "spoiler" | "no_spoiler">("all");
  const [flaggedFilter, setFlaggedFilter] = useState<"all" | "flagged" | "clean">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Filter & Search states for members
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<"all" | "admin" | "has_comments">("all");
  const [memberSortBy, setMemberSortBy] = useState<"recent" | "watch_time" | "comments" | "name">("recent");

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<MemberWithStats | null>(null);
  const [memberHistory, setMemberHistory] = useState<WatchHistoryItem[]>([]);
  const [memberWatchlist, setMemberWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Filter & Search states for collections
  const [colSearchQuery, setColSearchQuery] = useState("");

  // Auto-clean & purge states
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResultModal, setCleanResultModal] = useState<AutoCleanResult | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const fetchAuthorizedHandoffs = useCallback(async () => {
    try {
      const idToken = await user?.getIdToken().catch(() => null);
      if (!idToken) return;
      const res = await fetch("/api/analytics/stats?timeframe=today", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.liveWatching)) {
        setDeviceHandoffs(
          json.data.liveWatching.map((s: {
            userId: string;
            movieSlug: string;
            movieTitle: string;
            poster?: string;
            episodeSlug?: string;
            episodeName?: string;
            progressSeconds: number;
            durationSeconds: number;
            deviceName: string;
            updatedAt: number;
          }) => ({
            id: s.userId,
            userId: s.userId,
            movieSlug: s.movieSlug,
            movieTitle: s.movieTitle,
            poster: s.poster,
            episodeSlug: s.episodeSlug,
            episodeName: s.episodeName,
            progressSeconds: s.progressSeconds,
            durationSeconds: s.durationSeconds,
            deviceName: s.deviceName,
            updatedAt: s.updatedAt,
          }))
        );
      }
    } catch (err) {
      console.warn("Lỗi tải authorized handoffs:", err);
    }
  }, [user]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      const items = await fetchAllCommentsDirect();
      if (items.length > 0) {
        setComments(items);
        toast.success(`Đã đồng bộ tức thì ${items.length} bình luận mới nhất!`);
      } else {
        toast.info("Dữ liệu bình luận đã là mới nhất.");
      }
      fetchAuthorizedHandoffs().catch(() => { });
    } catch {
      toast.error("Không thể làm mới danh sách bình luận!");
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isAdmin = useMemo(() => isUserAdmin(user?.email), [user?.email]);

  // Subscribe to real-time data when admin is authenticated
  useEffect(() => {
    if (!isAdmin) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    const unsubComments = subscribeAllComments(
      (items) => {
        setComments(items);
        setLoadingData(false);
      },
      (err) => {
        console.error("Lỗi realtime comments:", err);
        setLoadingData(false);
        toast.error("Không thể tải danh sách bình luận!");
      },
      300
    );

    const unsubCollections = subscribeAllPublicCollections(
      (items) => {
        setCollections(items);
      },
      (err) => {
        console.warn("Lỗi realtime collections:", err);
      }
    );

    const unsubUsers = subscribeAllUsers(
      (items, dbTotalCount) => {
        console.log("[AdminMembers] admin callback", {
          usersLength: items.length,
          totalCount: dbTotalCount,
        });
        setRawUsers(items);
        setTotalMemberCount(dbTotalCount);
      },
      (err) => {
        console.warn("Lỗi realtime users:", err);
      }
    );

    fetchAuthorizedHandoffs().catch(() => { });

    return () => {
      unsubComments();
      unsubCollections();
      unsubUsers();
    };
  }, [isAdmin, fetchAuthorizedHandoffs]);

  // Derived: Enrich rawUsers (registered profiles only) with comment stats and device_handoffs
  const allMembers = useMemo<MemberWithStats[]>(() => {
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

    // 2. Tính toán thống kê bình luận cho các thành viên đã đăng ký (không tạo member giả từ orphan comments)
    const userCommentsMap = new Map<string, MovieComment[]>();
    comments.forEach((c) => {
      const list = userCommentsMap.get(c.userId) || [];
      list.push(c);
      userCommentsMap.set(c.userId, list);
    });

    // 3. Map device_handoffs for real-time live watching & last active
    const handoffMap = new Map<string, DeviceHandoffItem>();
    deviceHandoffs.forEach((h) => handoffMap.set(h.userId, h));
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;

    // 4. Tính toán số liệu tương tác cho từng thành viên
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

      const handoff = handoffMap.get(m.uid);
      const handoffUpdated = Number(handoff?.updatedAt) || 0;
      const validHandoffUpdated =
        handoffUpdated > 0 && handoffUpdated <= Date.now() + 60000 ? handoffUpdated : 0;
      const lastLogin = Number(m.lastLoginAt) || 0;
      const validLastLogin =
        lastLogin > 0 && lastLogin <= Date.now() + 60000 ? lastLogin : 0;
      const lastActiveAt = Math.max(validLastLogin, validHandoffUpdated, m.createdAt || 0);

      const isWatchingNow = Boolean(handoff && validHandoffUpdated > 0 && validHandoffUpdated >= fiveMinsAgo);
      const isOnline = lastActiveAt >= fiveMinsAgo;

      const rawDur = Number(handoff?.durationSeconds);
      const dur = !isNaN(rawDur) && rawDur > 0 ? Math.floor(rawDur) : 0;
      const rawProg = Number(handoff?.progressSeconds) || 0;
      const prog = dur > 0 ? Math.min(Math.max(0, rawProg), dur) : Math.max(0, rawProg);
      const percent = dur > 0 ? Math.min(100, Math.max(0, Math.round((prog / dur) * 100))) : 0;

      result.push({
        ...m,
        commentsCount: userComms.length,
        avgRatingGiven: avg,
        spoilerCount: spoilers,
        lastActiveAt,
        isOnline,
        isWatchingNow,
        currentWatching:
          isWatchingNow && handoff
            ? {
              movieSlug: handoff.movieSlug || "unknown",
              movieTitle: handoff.movieTitle || handoff.movieSlug || "Phim",
              episodeName: handoff.episodeName || undefined,
              progressSeconds: prog,
              durationSeconds: dur,
              progressPercent: percent,
              deviceName: handoff.deviceName || "Thiết bị",
              updatedAt: validHandoffUpdated,
            }
            : undefined,
      });
    });

    return result;
  }, [rawUsers, comments, deviceHandoffs]);

  // Filtered members
  const filteredMembers = useMemo(() => {
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
        if (memberSortBy === "recent") return (b.lastActiveAt || b.lastLoginAt || 0) - (a.lastActiveAt || a.lastLoginAt || 0);
        if (memberSortBy === "watch_time") return (b.watchTimeMinutes || 0) - (a.watchTimeMinutes || 0);
        if (memberSortBy === "comments") return b.commentsCount - a.commentsCount;
        if (memberSortBy === "name") return (a.displayName || "").localeCompare(b.displayName || "");
        return 0;
      });
  }, [allMembers, memberSearchQuery, memberFilter, memberSortBy]);

  // Derived metrics
  const metrics = useMemo(() => {
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

    const uniqueUsers = totalMemberCount;
    const uniqueMovies = new Set(comments.map((c) => c.movieSlug)).size;
    const spoilerCount = comments.filter((c) => c.isSpoiler).length;
    const flaggedCount = comments.filter((c) => c.isFlagged).length;
    const totalPublicCols = collections.length;

    // Phân bổ sao
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
  }, [comments, collections, totalMemberCount]);

  // Filtered comments
  const filteredComments = useMemo(() => {
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

        if (starFilter !== "all") {
          if (item.rating !== starFilter) return false;
        }

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
  }, [comments, searchQuery, starFilter, spoilerFilter, flaggedFilter, sortBy]);

  // Handler: Unflag comment
  const handleUnflagComment = async (comment: MovieComment) => {
    try {
      await unflagComment(comment.id);
      toast.success("Đã gỡ cờ đánh dấu bình luận thành công!");
    } catch (err) {
      console.error("Lỗi gỡ cờ:", err);
      toast.error("Không thể gỡ cờ đánh dấu!");
    }
  };

  // Handler: Toggle User Comment Ban
  const handleToggleUserCommentBan = async (member: MemberWithStats) => {
    const willBan = !member.isCommentRestricted;
    const confirmed = await showConfirmDialog({
      title: willBan ? "Khóa quyền bình luận" : "Mở khóa quyền bình luận",
      message: willBan
        ? `Bạn có chắc muốn KHÓA quyền bình luận của thành viên "${member.displayName}" do vi phạm tiêu chuẩn cộng đồng?`
        : `Mở lại quyền bình luận cho "${member.displayName}"?`,
      confirmText: willBan ? "Khóa bình luận" : "Mở khóa",
      cancelText: "Hủy",
      variant: willBan ? "danger" : "info",
    });
    if (!confirmed) return;
    try {
      await setUserCommentRestriction(member.uid, willBan, willBan ? "Vi phạm thuần phong mỹ tục / Spam" : undefined);
      toast.success(willBan ? `Đã khóa quyền bình luận của ${member.displayName}` : `Đã mở khóa bình luận cho ${member.displayName}`);
    } catch (err) {
      console.error("Lỗi cập nhật quyền bình luận:", err);
      toast.error("Không thể cập nhật quyền bình luận!");
    }
  };

  // Handler: Tự động quét và dọn dẹp bình luận vi phạm / spam
  const handleAutoCleanComments = async () => {
    setIsCleaning(true);
    try {
      const res = await autoCleanAllToxicAndSpamComments(comments);
      if (res.deletedCount === 0) {
        toast.success(`Hệ thống đã quét ${res.scannedCount} bình luận: Toàn bộ bình luận sạch, không phát hiện vi phạm!`);
      } else {
        toast.success(`Đã tự động quét và xóa sạch ${res.deletedCount} bình luận vi phạm / spam!`);
        setCleanResultModal(res);
      }
    } catch (e) {
      console.error("Lỗi tự động dọn rác cmt:", e);
      toast.error("Lỗi khi chạy dọn dẹp tự động!");
    } finally {
      setIsCleaning(false);
    }
  };

  // Handler: Xóa sạch toàn bộ bình luận đang bị gắn cờ
  const handlePurgeAllFlagged = async () => {
    const flaggedCount = comments.filter((c) => c.isFlagged).length;
    if (flaggedCount === 0) {
      toast.success("Hiện không có bình luận nào đang bị gắn cờ vi phạm.");
      return;
    }
    const confirmed = await showConfirmDialog({
      title: "Xóa sạch toàn bộ bình luận vi phạm",
      message: `Bạn có chắc muốn xóa vĩnh viễn toàn bộ ${flaggedCount} bình luận đang bị gắn cờ vi phạm khỏi hệ thống?`,
      confirmText: `Xóa sạch ${flaggedCount} bình luận`,
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const count = await purgeAllFlaggedComments(comments);
      setComments((prev) => prev.filter((c) => !c.isFlagged));
      toast.success(`Đã xóa vĩnh viễn ${count} bình luận vi phạm!`);
    } catch (e) {
      console.error("Lỗi xóa cmt gắn cờ:", e);
      toast.error("Lỗi khi xóa bình luận vi phạm!");
    }
  };

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return collections.filter((item) => {
      if (!colSearchQuery.trim()) return true;
      const q = colSearchQuery.toLowerCase().trim();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.creatorName?.toLowerCase().includes(q)
      );
    });
  }, [collections, colSearchQuery]);

  // Handler: Delete single comment
  const handleDeleteComment = async (comment: MovieComment) => {
    const confirmed = await showConfirmDialog({
      title: "Xác nhận xóa bình luận",
      message: `Bạn có chắc chắn muốn xóa bình luận của "${comment.userName}" cho phim "${comment.movieTitle || comment.movieSlug}" không?`,
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteMovieComment(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      toast.success("Đã xóa bình luận thành công khỏi hệ thống!");
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
      toast.error("Không thể xóa bình luận. Vui lòng kiểm tra lại kết nối!");
    }
  };

  // Handler: Delete all comments of a user
  const handleDeleteAllUserComments = async (member: MemberWithStats) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa toàn bộ bình luận thành viên",
      message: `CẢNH BÁO: Hành động này sẽ xóa tất cả ${member.commentsCount} bình luận của thành viên "${member.displayName}" khỏi hệ thống. Bạn có chắc chắn muốn thực hiện?`,
      confirmText: "Xóa tất cả bình luận",
      cancelText: "Hủy bỏ",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const deletedCount = await deleteAllUserComments(member.uid);
      setComments((prev) => prev.filter((c) => c.userId !== member.uid));
      setRawUsers((prev) =>
        prev.map((u) => (u.uid === member.uid ? { ...u, commentsCount: 0 } : u))
      );
      toast.success(`Đã xóa thành công ${deletedCount} bình luận của ${member.displayName}!`);
    } catch (err) {
      console.error("Lỗi xóa bình luận user:", err);
      toast.error("Không thể xóa bình luận của người dùng này!");
    }
  };

  // Handler: Delete public collection
  const handleDeleteCollection = async (collectionItem: MovieCollection) => {
    const confirmed = await showConfirmDialog({
      title: "Xác nhận gỡ bộ sưu tập",
      message: `Bạn có chắc chắn muốn gỡ bộ sưu tập "${collectionItem.name}" khỏi danh sách công khai không?`,
      confirmText: "Gỡ công khai",
      cancelText: "Hủy",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const success = await deletePublicCollectionAdmin(collectionItem.id);
      if (success) {
        setCollections((prev) => prev.filter((col) => col.id !== collectionItem.id));
        toast.success("Đã gỡ bộ sưu tập công khai thành công!");
      } else {
        toast.error("Không thể gỡ bộ sưu tập!");
      }
    } catch (err) {
      console.error("Lỗi gỡ bộ sưu tập:", err);
      toast.error("Lỗi khi gỡ bộ sưu tập!");
    }
  };



  // Open member details modal
  const handleOpenMemberDetails = async (member: MemberWithStats) => {
    setSelectedMember(member);
    setLoadingMemberDetails(true);
    try {
      const [history, watchlist] = await Promise.all([
        getUserCloudWatchHistory(member.uid),
        getUserCloudWatchlist(member.uid),
      ]);
      setMemberHistory(history);
      setMemberWatchlist(watchlist);
    } catch (e) {
      console.warn("Lỗi tải chi tiết user:", e);
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const [isSyncingEmbeddings, setIsSyncingEmbeddings] = useState(false);

  const handleSyncEmbeddings = async () => {
    setIsSyncingEmbeddings(true);
    toast.info("Đang nạp 30 phim vào cơ sở dữ liệu Vector pgvector...");
    try {
      const idToken = await user?.getIdToken().catch(() => null);
      const res = await fetch("/api/admin/sync-embeddings?limit=30", {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã nạp thành công ${data.syncedCount}/${data.totalRequested} vector phim!`);
      } else {
        toast.error(data.error || "Không thể nạp vector phim!");
      }
    } catch {
      toast.error("Lỗi kết nối khi nạp vector!");
    } finally {
      setIsSyncingEmbeddings(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedUid(id);
      toast.info("Đã sao chép vào bộ nhớ đệm!");
      setTimeout(() => setCopiedUid(null), 2000);
    }
  };

  // Format date helper
  const formatDate = (ts?: number) => {
    if (!ts) return "Chưa rõ";
    const d = new Date(ts);
    return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • ${d.toLocaleDateString("vi-VN")}`;
  };

  // Format watch minutes helper
  const formatWatchMinutes = (minutes?: number) => {
    if (!minutes || minutes <= 0) return "0 phút";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // 1. Loading Auth State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-400">Đang xác thực quyền Quản trị viên...</p>
      </div>
    );
  }

  // 2. Access Denied State (Not logged in or not admin)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-950/50">
            <Lock size={32} />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Khu Vực Quản Trị Viên (Admin)</h1>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            Trang này chỉ dành riêng cho Quản Trị Viên hệ thống Nanaflix. Tài khoản của bạn hiện tại chưa được cấp quyền truy cập vào trung tâm dữ liệu này.
          </p>

          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 mb-6 text-left space-y-1.5">
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Tài khoản hiện tại:</span>
              <span className="text-white font-semibold truncate max-w-[200px]">
                {user ? user.email : "Chưa đăng nhập"}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Trạng thái:</span>
              <span className="text-red-400 font-semibold">Không có quyền truy cập</span>
            </div>
          </div>


          <div className="flex flex-col gap-2.5">
            {!user ? (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-netflix-red hover:bg-netflix-red-hover text-white font-bold text-xs shadow-lg shadow-red-950/60 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} />
                <span>Đăng nhập tài khoản Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Đổi tài khoản khác</span>
              </button>
            )}

            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <Home size={14} />
              <span>Quay về Trang Chủ Nanaflix</span>
            </Link>
          </div>
        </div>

        {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  // 3. Authorized Admin Dashboard View
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pt-6 sm:pt-16 md:pt-20 pb-20 sm:pb-24 px-3 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 sm:pb-6 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-400 shadow-md flex-shrink-0">
                <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap min-w-0">
                <span className="truncate">Nanaflix Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-red-500/30 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider flex-shrink-0">
                  Super Admin
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              <span className="truncate max-w-[260px] sm:max-w-none">
                Đăng nhập: <strong className="text-white">{user.email}</strong>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Connected
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-netflix-red/20 hover:bg-netflix-red/30 text-red-300 hover:text-white text-xs font-semibold transition border border-netflix-red/30 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isManualRefreshing ? "animate-spin" : ""} />
              <span>{isManualRefreshing ? "Đang tải..." : "Làm Mới"}</span>
            </button>
            <button
              type="button"
              onClick={handleSyncEmbeddings}
              disabled={isSyncingEmbeddings}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white text-xs font-semibold transition border border-purple-500/30 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Đồng bộ 30 phim vào bảng movie_embeddings để tìm kiếm AI dưới 50ms"
            >
              <Sparkles size={13} className={isSyncingEmbeddings ? "animate-spin" : ""} />
              <span>{isSyncingEmbeddings ? "Nạp vector..." : "⚡ Vector AI"}</span>
            </button>
            <Link
              href="/"
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10"
            >
              <Home size={13} />
              <span>Về Trang Chủ</span>
            </Link>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {/* Card 1: Total Comments */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Tổng Bình Luận</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                <MessageSquare size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.totalComments}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Bình luận & phản hồi</p>
          </div>

          {/* Card 2: Average Score */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Điểm Đánh Giá</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
                <Star size={14} className="sm:w-4 sm:h-4 fill-amber-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
              <span>{metrics.avgScore}</span>
              <span className="text-[11px] sm:text-xs font-normal text-gray-400">/ 5.0</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 truncate">{metrics.totalRatingReviews} lượt chấm sao</p>
          </div>

          {/* Card 3: Unique Users / Members */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Thành Viên</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                <Users size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.uniqueUsers}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Thành viên ghi nhận</p>
          </div>

          {/* Card 4: Unique Movies */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Phim Đánh Giá</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0">
                <Film size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.uniqueMovies}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Phim có bình luận</p>
          </div>

          {/* Card 5: Flagged & Moderation */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Vi Phạm / Cờ</span>
              <div className={`p-1 sm:p-1.5 rounded-lg flex-shrink-0 ${metrics.flaggedCount > 0 ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-gray-400"}`}>
                <Flag size={14} className={`sm:w-4 sm:h-4 ${metrics.flaggedCount > 0 ? "text-red-400 animate-pulse" : ""}`} />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black ${metrics.flaggedCount > 0 ? "text-red-400" : "text-white"} group-hover:scale-105 transition-transform origin-left`}>
              {metrics.flaggedCount}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Cần Admin xét duyệt</p>
          </div>

          {/* Card 6: Spoilers */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Cảnh Báo Spoil</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-rose-500/10 text-rose-400 flex-shrink-0">
                <AlertTriangle size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 group-hover:scale-105 transition-transform origin-left">
              {metrics.spoilerCount}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Cảnh báo nội dung</p>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => handleTabChange("comments")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${activeTab === "comments"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <MessageSquare size={14} />
            <span>Bình Luận</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {comments.length}
            </span>
            {metrics.flaggedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold animate-pulse">
                {metrics.flaggedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("members")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${activeTab === "members"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <Users size={14} />
            <span>Thành Viên</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {totalMemberCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("collections")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${activeTab === "collections"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <FolderHeart size={14} />
            <span>Bộ Sưu Tập</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {collections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("analytics")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${activeTab === "analytics"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <Sparkles size={14} />
            <span>Phân Tích</span>
          </button>
        </div>

        {/* TAB 1: COMMENTS MANAGEMENT */}
        {activeTab === "comments" && (
          <div className="space-y-4">
            {/* AUTO CLEAN & PURGE CONTROL BAR */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-amber-950/30 border border-red-500/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 shadow-inner flex-shrink-0 mt-0.5 sm:mt-0">
                  <ShieldAlert size={18} className="sm:w-5 sm:h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Hệ Thống Quét & Xóa Bình Luận Rác
                    </h3>
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Auto-Shield
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                    Tự động nhận diện và xóa vĩnh viễn ngôn từ xúc phạm, 18+, cờ bạc, scam và spam.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 sm:gap-2.5 flex-shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAutoCleanComments}
                  disabled={isCleaning}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles size={14} className={isCleaning ? "animate-spin" : ""} />
                  <span>{isCleaning ? "Đang quét..." : "Quét & Xóa Rác Tự Động"}</span>
                </button>

                {metrics.flaggedCount > 0 && (
                  <button
                    type="button"
                    onClick={handlePurgeAllFlagged}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Trash2 size={13} />
                    <span>Xóa Sạch Cờ ({metrics.flaggedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-3">
              <div className="relative w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên người dùng, email, phim, nội dung..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Chips - Scrollable on mobile to avoid overlapping */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-none -mx-1 px-1 flex-nowrap">
                {/* Moderation / Flagged Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setFlaggedFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${flaggedFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                      }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlaggedFilter("flagged")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${flaggedFilter === "flagged"
                        ? "bg-red-500/25 text-red-400 border border-red-500/40 font-bold shadow-sm"
                        : "text-gray-400 hover:text-white"
                      }`}
                  >
                    <Flag size={11} className={metrics.flaggedCount > 0 ? "text-red-400" : ""} />
                    <span>Vi phạm</span>
                    {metrics.flaggedCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold">
                        {metrics.flaggedCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Star Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs flex-shrink-0">
                  <span className="text-[11px] text-gray-400 px-1.5 flex items-center gap-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    <span>Sao:</span>
                  </span>
                  {(["all", 5, 4, 3, 2, 1] as const).map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStarFilter(star)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${starFilter === star
                          ? "bg-amber-500 text-black font-bold shadow-sm"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      {star === "all" ? "Tất cả" : `${star}★`}
                    </button>
                  ))}
                </div>

                {/* Spoiler Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSpoilerFilter("all")}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${spoilerFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                      }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpoilerFilter("spoiler")}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${spoilerFilter === "spoiler"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold"
                        : "text-gray-400 hover:text-white"
                      }`}
                  >
                    <AlertTriangle size={11} />
                    <span>Spoil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpoilerFilter("no_spoiler")}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${spoilerFilter === "no_spoiler" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                      }`}
                  >
                    Không Spoil
                  </button>
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs flex-shrink-0">
                  <ArrowUpDown size={11} className="text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-zinc-900 text-white">Mới nhất</option>
                    <option value="oldest" className="bg-zinc-900 text-white">Cũ nhất</option>
                    <option value="highest_rating" className="bg-zinc-900 text-white">Điểm cao nhất</option>
                    <option value="lowest_rating" className="bg-zinc-900 text-white">Điểm thấp nhất</option>
                    <option value="most_liked" className="bg-zinc-900 text-white">Nhiều tim nhất</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COUNT HEADER */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>
                Hiển thị <strong className="text-white">{filteredComments.length}</strong> / {comments.length} bình luận
              </span>
              {(searchQuery || starFilter !== "all" || spoilerFilter !== "all" || flaggedFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStarFilter("all");
                    setSpoilerFilter("all");
                    setFlaggedFilter("all");
                  }}
                  className="text-netflix-red hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {/* COMMENTS LIST */}
            {loadingData ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/10">
                <div className="w-8 h-8 rounded-full border-2 border-netflix-red border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">Đang đồng bộ danh sách bình luận...</p>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/10">
                <MessageSquare size={36} className="text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-300">Không tìm thấy bình luận nào phù hợp</p>
                <p className="text-xs text-gray-500 mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredComments.map((item) => {
                  const itemUser = allMembers.find((m) => m.uid === item.userId);
                  const isUserRestricted = Boolean(itemUser?.isCommentRestricted);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-5 rounded-2xl transition backdrop-blur-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 group ${item.isFlagged
                          ? "bg-red-950/20 border-2 border-red-500/40 shadow-lg shadow-red-950/30 hover:border-red-500/60"
                          : "bg-zinc-900/60 border border-white/10 hover:border-white/20"
                        }`}
                    >
                      {/* Left: User & Content */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          <UserAvatar
                            src={item.userAvatar || undefined}
                            name={item.userName}
                            seed={item.userId || item.userName}
                            sizeClassName="w-8 h-8 text-xs font-bold"
                            className="border border-white/15"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">{item.userName}</span>
                              {item.userEmail && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono truncate max-w-[160px] sm:max-w-[200px]">
                                  {item.userEmail}
                                </span>
                              )}
                              {isUserRestricted && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-bold flex items-center gap-1 flex-shrink-0">
                                  <Ban size={10} />
                                  <span>Bị cấm cmt</span>
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 flex items-center gap-1 flex-shrink-0">
                                <Clock size={11} />
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {item.rating > 0 && (
                            <div className="w-full sm:w-auto sm:ml-auto">
                              <StarRating value={item.rating} size="sm" readOnly />
                            </div>
                          )}
                        </div>

                        {/* Movie tag & Episode info */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                          <span className="text-gray-400 text-[11px]">Phim:</span>
                          <Link
                            href={`/movies/${item.movieSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-netflix-red/15 border border-netflix-red/30 text-red-300 hover:text-white hover:bg-netflix-red/25 transition text-xs font-semibold max-w-[240px] truncate"
                          >
                            <Film size={12} className="flex-shrink-0" />
                            <span className="truncate">{item.movieTitle || item.movieSlug}</span>
                            <ExternalLink size={11} className="opacity-70 flex-shrink-0" />
                          </Link>

                          {item.episodeName && (
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300">
                              {item.episodeName}
                            </span>
                          )}

                          {item.isFlagged && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/30 border border-red-500/50 text-[10px] text-red-300 font-bold animate-pulse">
                              <Flag size={11} className="fill-red-400 text-red-400" />
                              <span>VI PHẠM</span>
                            </span>
                          )}

                          {item.isSpoiler && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-400 font-bold">
                              <AlertTriangle size={11} />
                              <span>Spoil</span>
                            </span>
                          )}

                          {item.parentId ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-300 font-medium">
                              💬 Trả lời
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] text-amber-300 font-medium">
                              ⭐ Đánh giá
                            </span>
                          )}

                          {item.likes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                              <Heart size={11} className="fill-rose-500 text-rose-500" />
                              <span>{item.likes}</span>
                            </span>
                          )}
                        </div>

                        {/* Moderation Warning Banner */}
                        {item.isFlagged && (
                          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 text-red-400 font-bold">
                              <ShieldAlert size={14} className="text-red-400 flex-shrink-0" />
                              <span className="text-[11px] sm:text-xs">Phát hiện nội dung nhạy cảm / không đúng thuần phong mỹ tục</span>
                            </div>
                            <p className="text-red-200/90 text-[11px]">
                              <strong className="text-red-300">Lý do:</strong> {item.flagReason || "Chứa từ cấm hoặc hành vi spam"}
                            </p>
                            {item.flaggedKeywords && item.flaggedKeywords.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] text-red-300 font-medium">Từ khóa:</span>
                                {item.flaggedKeywords.map((kw, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.2 rounded bg-red-900/80 border border-red-500/40 text-red-100 text-[10px] font-mono font-bold"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content */}
                        <div className="text-xs text-gray-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-wrap font-sans break-words">
                          &ldquo;{item.content}&rdquo;
                        </div>
                      </div>

                      {/* Actions - Responsive Grid on Mobile to prevent overlapping */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-col items-stretch sm:items-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10 flex-shrink-0 w-full sm:w-auto">
                        <Link
                          href={`/movies/${item.movieSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink size={13} />
                          <span>Xem phim</span>
                        </Link>

                        {item.isFlagged && (
                          <button
                            type="button"
                            onClick={() => handleUnflagComment(item)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            title="Gỡ cờ & duyệt bình luận này hợp lệ"
                          >
                            <ShieldCheck size={13} />
                            <span>Gỡ cờ</span>
                          </button>
                        )}

                        {itemUser && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserCommentBan(itemUser)}
                            className={`px-3 py-2 sm:py-1.5 rounded-xl border transition cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${isUserRestricted
                                ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                              }`}
                            title={isUserRestricted ? "Mở lại quyền bình luận" : "Khóa quyền bình luận thành viên"}
                          >
                            {isUserRestricted ? <ShieldCheck size={13} /> : <Ban size={13} />}
                            <span>{isUserRestricted ? "Mở cmt" : "Khóa cmt"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteComment(item)}
                          className={`px-3 py-2 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition cursor-pointer text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${!item.isFlagged && !itemUser ? "col-span-2 sm:col-span-1" : ""
                            }`}
                        >
                          <Trash2 size={13} />
                          <span>Xóa bỏ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS DIRECTORY */}
        {activeTab === "members" && (
          <div className="space-y-4">
            {/* Toolbar for members */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-3">
              <div className="relative w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Tìm thành viên theo tên, email hoặc UID..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
                />
                {memberSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMemberSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-none -mx-1 px-1 flex-nowrap">
                {/* Filter role */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setMemberFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${memberFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                      }`}
                  >
                    Tất cả ({totalMemberCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter("admin")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${memberFilter === "admin"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                        : "text-gray-400 hover:text-white"
                      }`}
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter("has_comments")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${memberFilter === "has_comments"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold"
                        : "text-gray-400 hover:text-white"
                      }`}
                  >
                    Đã bình luận
                  </button>
                </div>

                {/* Sort members */}
                <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs flex-shrink-0">
                  <ArrowUpDown size={11} className="text-gray-400" />
                  <select
                    value={memberSortBy}
                    onChange={(e) => setMemberSortBy(e.target.value as "recent" | "watch_time" | "comments" | "name")}
                    className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="recent" className="bg-zinc-900 text-white">Hoạt động mới nhất</option>
                    <option value="watch_time" className="bg-zinc-900 text-white">Cày phim nhiều nhất</option>
                    <option value="comments" className="bg-zinc-900 text-white">Nhiều bình luận nhất</option>
                    <option value="name" className="bg-zinc-900 text-white">Tên (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COUNT HEADER */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>
                Hiển thị <strong className="text-white">{filteredMembers.length}</strong> / {totalMemberCount} thành viên
              </span>
            </div>

            {/* MEMBERS GRID */}
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/10">
                <Users size={36} className="text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-300">Không tìm thấy thành viên nào phù hợp</p>
                <p className="text-xs text-gray-500 mt-1">Hãy thử từ khóa tìm kiếm khác.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredMembers.map((m) => {
                  const isSuperAdmin = m.role === "admin";
                  return (
                    <div
                      key={m.uid}
                      className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm flex flex-col justify-between space-y-3 sm:space-y-4 group"
                    >
                      <div>
                        {/* Member Header */}
                        <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                          <UserAvatar
                            src={m.photoURL || undefined}
                            name={m.displayName}
                            seed={m.uid || m.displayName}
                            sizeClassName="w-10 h-10 sm:w-11 sm:h-11 text-sm font-bold"
                            rounded="2xl"
                            className="border border-white/15 shadow-md"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                                {m.displayName}
                              </h3>
                              {isSuperAdmin && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-300 font-bold flex-shrink-0">
                                  👑 Admin
                                </span>
                              )}
                              {m.isWatchingNow ? (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Đang xem
                                </span>
                              ) : m.isOnline ? (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Online
                                </span>
                              ) : m.lastActiveAt && Date.now() - m.lastActiveAt <= 15 * 60 * 1000 ? (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium flex-shrink-0">
                                  Vừa online
                                </span>
                              ) : (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-800 border border-white/5 text-gray-400 flex-shrink-0">
                                  Ngoại tuyến
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-400 truncate mt-0.5">
                              {m.email || "Chưa có email"}
                            </p>
                          </div>
                        </div>

                        {/* UID badge */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/5 text-[11px] mb-2.5 sm:mb-3">
                          <span className="text-gray-500 font-mono truncate max-w-[160px] sm:max-w-[190px]">
                            UID: {m.uid}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.uid, m.uid)}
                            className="text-gray-400 hover:text-white p-1 rounded transition cursor-pointer flex-shrink-0"
                            title="Sao chép UID"
                          >
                            {copiedUid === m.uid ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>

                        {/* Member restriction status */}
                        {m.isCommentRestricted && (
                          <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-1.5 font-medium mb-2.5 sm:mb-3">
                            <Ban size={13} className="text-red-400 flex-shrink-0" />
                            <span className="truncate">Đang bị khóa quyền bình luận</span>
                          </div>
                        )}

                        {/* Member stats chips */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 min-w-0">
                            <span className="text-[10px] text-gray-400 block truncate">Bình luận</span>
                            <span className="font-bold text-white flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs truncate">
                              <MessageSquare size={12} className="text-blue-400 flex-shrink-0" />
                              <span className="truncate">{m.commentsCount} bài</span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 min-w-0">
                            <span className="text-[10px] text-gray-400 block truncate">Đánh giá</span>
                            <span className="font-bold text-amber-400 flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs truncate">
                              <Star size={12} className="fill-amber-400 flex-shrink-0" />
                              <span className="truncate">{m.avgRatingGiven > 0 ? `${m.avgRatingGiven}★` : "0★"}</span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 min-w-0">
                            <span className="text-[10px] text-gray-400 block truncate">Cày phim</span>
                            <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs truncate">
                              <Clock size={12} className="text-emerald-400 flex-shrink-0" />
                              <span className="truncate">{formatWatchMinutes(m.watchTimeMinutes)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Live Watching Preview if active */}
                        {m.isWatchingNow && m.currentWatching && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-gray-300 space-y-1 mt-2.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-300 font-semibold truncate flex items-center gap-1 min-w-0">
                                <Film size={12} className="text-emerald-400 flex-shrink-0" />
                                <span className="truncate">{m.currentWatching.movieTitle}</span>
                                {m.currentWatching.episodeName && (
                                  <span className="text-gray-400 truncate">({m.currentWatching.episodeName})</span>
                                )}
                              </span>
                              <span className="text-emerald-400 font-mono text-[10px] font-bold flex-shrink-0 ml-1">
                                {m.currentWatching.progressPercent}%
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center justify-between">
                              <span className="truncate max-w-[140px]">{m.currentWatching.deviceName || "Thiết bị"}</span>
                              <span className="font-mono text-emerald-400/80 flex-shrink-0">Đang phát</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-gray-500 flex-wrap gap-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>Lần cuối: {formatDate(m.lastActiveAt || m.lastLoginAt)}</span>
                          </span>
                          {m.violationsCount && m.violationsCount > 0 ? (
                            <span className="text-red-400 font-semibold flex items-center gap-1">
                              <AlertOctagon size={11} />
                              <span>{m.violationsCount} vi phạm</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenMemberDetails(m)}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>Chi Tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleUserCommentBan(m)}
                          className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center flex-shrink-0 ${m.isCommentRestricted
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                            }`}
                          title={m.isCommentRestricted ? "Mở khóa quyền bình luận" : "Khóa quyền bình luận thành viên"}
                        >
                          {m.isCommentRestricted ? <ShieldCheck size={14} /> : <Ban size={14} />}
                        </button>

                        {m.commentsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAllUserComments(m)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer flex-shrink-0"
                            title="Xóa tất cả bình luận của thành viên này"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PUBLIC COLLECTIONS */}
        {activeTab === "collections" && (
          <AdminCollectionsTab
            filteredCollections={filteredCollections}
            colSearchQuery={colSearchQuery}
            setColSearchQuery={setColSearchQuery}
            onDeleteCollection={handleDeleteCollection}
            formatDate={formatDate}
          />
        )}

        {/* TAB 4: ANALYTICS & INSIGHTS */}
        {activeTab === "analytics" && (
          <AdminAnalyticsTab
            metrics={metrics}
            adminEmail={user.email}
            totalMembersCount={totalMemberCount}
          />
        )}

        {/* MODAL: MEMBER ACTIVITY DETAILS */}
        <AdminMemberDetailModal
          selectedMember={selectedMember}
          onClose={() => setSelectedMember(null)}
          comments={comments}
          memberHistory={memberHistory}
          memberWatchlist={memberWatchlist}
          loadingMemberDetails={loadingMemberDetails}
          onToggleCommentBan={handleToggleUserCommentBan}
          onDeleteComment={handleDeleteComment}
          onUnflagComment={handleUnflagComment}
          formatDate={formatDate}
        />

        {/* MODAL: AUTO-CLEAN SCAN RESULTS AUDIT */}
        <AdminCleanResultModal
          cleanResult={cleanResultModal}
          onClose={() => setCleanResultModal(null)}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-400">Đang tải bảng điều khiển Quản trị viên...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
