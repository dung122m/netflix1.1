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
  Bot,
  BarChart2,
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
  fetchAllCommentsDirect,
  deleteMovieComment,
  unflagComment,
  autoCleanAllToxicAndSpamComments,
  purgeAllFlaggedComments,
  type AutoCleanResult,
} from "@/services/commentService";
import {
  deletePublicCollectionAdmin,
} from "@/services/collectionService";
import {
  getUserCloudWatchHistory,
  getUserCloudWatchlist,
  deleteAllUserComments,
  setUserCommentRestriction,
  type DeviceHandoffItem,
} from "@/services/userService";
import {
  getAllProfilesSupabase,
  getPublicCollectionsSupabase,
} from "@/services/supabaseService";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StarRating } from "@/components/MovieReviews/StarRating";
import { AdminCommentsTab } from "./components/AdminCommentsTab";
import { AdminMembersTab } from "./components/AdminMembersTab";
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
  const [totalMemberCount, setTotalMemberCount] = useState<number | null>(null);
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
      const res = await fetch("/api/user/handoff?all=true", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setDeviceHandoffs(
          json.items.map((s: {
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

  const loadComments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingData(true);
    try {
      const items = await fetchAllCommentsDirect();
      setComments(items);
    } catch (err) {
      console.error("Lỗi tải bình luận:", err);
      toast.error("Không thể tải danh sách bình luận!");
    } finally {
      if (showLoading) setLoadingData(false);
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      const items = await getPublicCollectionsSupabase();
      if (items) setCollections(items);
    } catch (err) {
      console.warn("Lỗi tải bộ sưu tập:", err);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const result = await getAllProfilesSupabase();
      setRawUsers(result.profiles);
      setTotalMemberCount(result.totalCount);
    } catch (err) {
      console.warn("Lỗi tải thành viên:", err);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      if (activeTab === "comments") {
        await loadComments(false);
        toast.success("Đã làm mới danh sách bình luận!");
      } else if (activeTab === "members") {
        await Promise.all([loadMembers(), fetchAuthorizedHandoffs()]);
        toast.success("Đã làm mới danh sách thành viên & thiết bị!");
      } else if (activeTab === "collections") {
        await loadCollections();
        toast.success("Đã làm mới danh sách bộ sưu tập!");
      } else {
        await Promise.all([loadComments(false), loadMembers()]);
        toast.success("Đã làm mới dữ liệu quản trị!");
      }
    } catch {
      toast.error("Không thể làm mới dữ liệu!");
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isAdmin = useMemo(() => isUserAdmin(user?.email), [user?.email]);

  // 1. Tải toàn bộ dữ liệu quản trị cốt lõi khi Admin mở trang (phục vụ Metrics Cards & Tabs)
  useEffect(() => {
    if (!isAdmin) {
      setLoadingData(false);
      return;
    }
    // Tải song song bình luận, bộ sưu tập và danh sách thành viên để metrics tổng quan luôn hiển thị đủ
    loadComments(activeTab === "comments");
    loadCollections();
    loadMembers();
  }, [isAdmin, loadComments, loadCollections, loadMembers]);

  // 2. Khi chuyển tab: Làm mới nhẹ nhàng nếu chuyển vào các tab chuyên biệt
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "comments") {
      loadComments(false);
    } else if (activeTab === "collections") {
      loadCollections();
    } else if (activeTab === "members") {
      fetchAuthorizedHandoffs().catch(() => {});
    }
  }, [isAdmin, activeTab, loadComments, loadCollections, fetchAuthorizedHandoffs]);

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

    const uniqueUsers = totalMemberCount !== null ? totalMemberCount : 0;
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
        await loadComments(false);
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
        <p className="text-sm font-medium text-zinc-400">Đang xác thực quyền Quản trị viên...</p>
      </div>
    );
  }

  // 2. Access Denied State (Not logged in or not admin)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.03] shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-md shadow-black/50">
            <Lock size={32} />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Khu Vực Quản Trị Viên (Admin)</h1>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Trang này chỉ dành riêng cho Quản Trị Viên hệ thống Nanaflix. Tài khoản của bạn hiện tại chưa được cấp quyền truy cập vào trung tâm dữ liệu này.
          </p>

          <div className="p-3.5 rounded-2xl bg-black/60 mb-6 text-left space-y-1.5">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Tài khoản hiện tại:</span>
              <span className="text-white font-semibold truncate max-w-[200px]">
                {user ? user.email : "Chưa đăng nhập"}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Trạng thái:</span>
              <span className="text-red-400 font-semibold">Không có quyền truy cập</span>
            </div>
          </div>


          <div className="flex flex-col gap-2.5">
            {!user ? (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-netflix-red hover:bg-netflix-red-hover text-white font-bold text-xs shadow-md shadow-black/50 transition cursor-pointer flex items-center justify-center gap-2"
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
              className="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-2"
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 sm:pb-6 border-b">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 text-amber-400 shadow-md flex-shrink-0">
                <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap min-w-0">
                <span className="truncate">Nanaflix Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-red-500/30 text-amber-300 font-bold uppercase tracking-wider flex-shrink-0">
                  Super Admin
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
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
              <Bot size={13} className={isSyncingEmbeddings ? "animate-spin" : ""} />
              <span>{isSyncingEmbeddings ? "Đang đồng bộ..." : "Đồng bộ tìm kiếm AI"}</span>
            </button>
            <Link
              href="/"
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
            >
              <Home size={13} />
              <span>Về Trang Chủ</span>
            </Link>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {/* Card 1: Total Comments */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Tổng Bình Luận</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                <MessageSquare size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.totalComments}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 truncate">Bình luận & phản hồi</p>
          </div>

          {/* Card 2: Average Score */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Điểm Đánh Giá</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
                <Star size={14} className="sm:w-4 sm:h-4 fill-amber-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
              <span>{metrics.avgScore}</span>
              <span className="text-[11px] sm:text-xs font-normal text-zinc-400">/ 5.0</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 truncate">{metrics.totalRatingReviews} lượt chấm sao</p>
          </div>

          {/* Card 3: Unique Users / Members */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Thành Viên</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                <Users size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {totalMemberCount === null ? (
                <span className="text-zinc-500 animate-pulse text-lg font-sans tabular-nums">—</span>
              ) : (
                metrics.uniqueUsers
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 truncate">Thành viên ghi nhận</p>
          </div>

          {/* Card 4: Unique Movies */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Phim Đánh Giá</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0">
                <Film size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.uniqueMovies}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 truncate">Phim có bình luận</p>
          </div>

          {/* Card 5: Flagged & Moderation */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Vi Phạm / Cờ</span>
              <div className={`p-1 sm:p-1.5 rounded-lg flex-shrink-0 ${metrics.flaggedCount > 0 ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"}`}>
                <Flag size={14} className={`sm:w-4 sm:h-4 ${metrics.flaggedCount > 0 ? "text-red-400 animate-pulse" : ""}`} />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black ${metrics.flaggedCount > 0 ? "text-red-400" : "text-white"} group-hover:scale-105 transition-transform origin-left`}>
              {metrics.flaggedCount}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 truncate">Cần Admin xét duyệt</p>
          </div>

          {/* Card 6: Spoilers */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium truncate">Cảnh Báo Spoil</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-rose-500/10 text-rose-400 flex-shrink-0">
                <AlertTriangle size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 group-hover:scale-105 transition-transform origin-left">
              {metrics.spoilerCount}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 truncate">Cảnh báo nội dung</p>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b pb-3 overflow-x-auto no-scrollbar scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => handleTabChange("comments")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${activeTab === "comments"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <MessageSquare size={14} />
            <span>Bình Luận</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-sans tabular-nums">
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
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${activeTab === "members"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <Users size={14} />
            <span>Thành Viên</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-sans tabular-nums">
              {totalMemberCount === null ? "—" : totalMemberCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("collections")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${activeTab === "collections"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <FolderHeart size={14} />
            <span>Bộ Sưu Tập</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-sans tabular-nums">
              {collections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("analytics")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${activeTab === "analytics"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <BarChart2 size={14} />
            <span>Phân Tích</span>
          </button>
        </div>

        {/* TAB 1: COMMENTS MANAGEMENT */}
        {activeTab === "comments" && (
          <AdminCommentsTab
            filteredComments={filteredComments}
            totalCommentsCount={comments.length}
            loadingData={loadingData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            starFilter={starFilter}
            setStarFilter={setStarFilter}
            spoilerFilter={spoilerFilter}
            setSpoilerFilter={setSpoilerFilter}
            flaggedFilter={flaggedFilter}
            setFlaggedFilter={setFlaggedFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            flaggedCount={metrics.flaggedCount}
            isCleaning={isCleaning}
            allMembers={allMembers}
            onAutoCleanComments={handleAutoCleanComments}
            onPurgeAllFlagged={handlePurgeAllFlagged}
            onUnflagComment={handleUnflagComment}
            onToggleUserCommentBan={handleToggleUserCommentBan}
            onDeleteComment={handleDeleteComment}
            formatDate={formatDate}
          />
        )}

        {/* TAB 2: MEMBERS DIRECTORY */}
        {activeTab === "members" && (
          <AdminMembersTab
            memberSearchQuery={memberSearchQuery}
            setMemberSearchQuery={setMemberSearchQuery}
            memberFilter={memberFilter}
            setMemberFilter={setMemberFilter}
            totalMemberCount={totalMemberCount}
            memberSortBy={memberSortBy}
            setMemberSortBy={setMemberSortBy}
            filteredMembers={filteredMembers}
            copiedUid={copiedUid}
            copyToClipboard={copyToClipboard}
            formatDate={formatDate}
            formatWatchMinutes={formatWatchMinutes}
            onOpenMemberDetails={handleOpenMemberDetails}
            onToggleUserCommentBan={handleToggleUserCommentBan}
            onDeleteAllUserComments={handleDeleteAllUserComments}
          />
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
            totalMembersCount={totalMemberCount ?? 0}
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
          <p className="text-sm font-medium text-zinc-400">Đang tải bảng điều khiển Quản trị viên...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
