"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
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
import { deletePublicCollectionAdmin } from "@/services/collectionService";
import {
  getUserCloudWatchHistory,
  getUserCloudWatchlist,
  deleteAllUserComments,
  setUserCommentRestriction,
} from "@/services/userService";
import {
  getAllProfilesSupabase,
  getPublicCollectionsSupabase,
} from "@/services/supabaseService";
import {
  AdminTab,
  SortOption,
  MemberFilterOption,
  MemberSortOption,
  computeAllMembers,
  filterAndSortMembers,
  computeAdminMetrics,
  filterAndSortComments,
  filterCollections,
} from "../adminUtils";

interface AdminUser {
  uid: string;
  email?: string | null;
  getIdToken: () => Promise<string>;
}

interface UseAdminDashboardOptions {
  user: AdminUser | null;
  isAdmin: boolean;
  activeTab: AdminTab;
}

export function useAdminDashboard({
  user,
  isAdmin,
  activeTab,
}: UseAdminDashboardOptions) {
  // Data states
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [totalMemberCount, setTotalMemberCount] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Filter & Search states for comments
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [spoilerFilter, setSpoilerFilter] = useState<"all" | "spoiler" | "no_spoiler">("all");
  const [flaggedFilter, setFlaggedFilter] = useState<"all" | "flagged" | "clean">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Filter & Search states for members
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilterOption>("all");
  const [memberSortBy, setMemberSortBy] = useState<MemberSortOption>("recent");

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<MemberWithStats | null>(null);
  const [memberHistory, setMemberHistory] = useState<WatchHistoryItem[]>([]);
  const [memberWatchlist, setMemberWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Filter & Search states for collections
  const [colSearchQuery, setColSearchQuery] = useState("");

  // Auto-clean, purge & sync states
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResultModal, setCleanResultModal] = useState<AutoCleanResult | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isSyncingEmbeddings, setIsSyncingEmbeddings] = useState(false);


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
        await loadMembers();
        toast.success("Đã làm mới danh sách thành viên!");
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

  const initialCommentsTabRef = useRef(activeTab === "comments");

  // 1. Tải toàn bộ dữ liệu quản trị cốt lõi khi Admin mở trang
  useEffect(() => {
    if (!isAdmin) {
      setLoadingData(false);
      return;
    }
    loadComments(initialCommentsTabRef.current);
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
    }
  }, [isAdmin, activeTab, loadComments, loadCollections]);

  const allMembers = useMemo(
    () => computeAllMembers(rawUsers, comments),
    [rawUsers, comments]
  );

  const filteredMembers = useMemo(
    () => filterAndSortMembers(allMembers, memberSearchQuery, memberFilter, memberSortBy),
    [allMembers, memberSearchQuery, memberFilter, memberSortBy]
  );

  const metrics = useMemo(
    () => computeAdminMetrics(comments, collections, totalMemberCount),
    [comments, collections, totalMemberCount]
  );

  const filteredComments = useMemo(
    () =>
      filterAndSortComments(
        comments,
        searchQuery,
        starFilter,
        spoilerFilter,
        flaggedFilter,
        sortBy
      ),
    [comments, searchQuery, starFilter, spoilerFilter, flaggedFilter, sortBy]
  );

  const filteredCollections = useMemo(
    () => filterCollections(collections, colSearchQuery),
    [collections, colSearchQuery]
  );

  const handleUnflagComment = async (comment: MovieComment) => {
    try {
      await unflagComment(comment.id);
      toast.success("Đã gỡ cờ đánh dấu bình luận thành công!");
    } catch (err) {
      console.error("Lỗi gỡ cờ:", err);
      toast.error("Không thể gỡ cờ đánh dấu!");
    }
  };

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
      await setUserCommentRestriction(
        member.uid,
        willBan,
        willBan ? "Vi phạm thuần phong mỹ tục / Spam" : undefined
      );
      toast.success(
        willBan
          ? `Đã khóa quyền bình luận của ${member.displayName}`
          : `Đã mở khóa bình luận cho ${member.displayName}`
      );
    } catch (err) {
      console.error("Lỗi cập nhật quyền bình luận:", err);
      toast.error("Không thể cập nhật quyền bình luận!");
    }
  };

  const handleAutoCleanComments = async () => {
    setIsCleaning(true);
    try {
      const res = await autoCleanAllToxicAndSpamComments(comments);
      if (res.deletedCount === 0) {
        toast.success(
          `Hệ thống đã quét ${res.scannedCount} bình luận: Toàn bộ bình luận sạch, không phát hiện vi phạm!`
        );
      } else {
        toast.success(
          `Đã tự động quét và xóa sạch ${res.deletedCount} bình luận vi phạm / spam!`
        );
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
        toast.success(
          data.message || `Đã nạp thành công ${data.syncedCount}/${data.totalRequested} vector phim!`
        );
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

  return {
    comments,
    collections,
    totalMemberCount,
    loadingData,
    searchQuery,
    setSearchQuery,
    starFilter,
    setStarFilter,
    spoilerFilter,
    setSpoilerFilter,
    flaggedFilter,
    setFlaggedFilter,
    sortBy,
    setSortBy,
    memberSearchQuery,
    setMemberSearchQuery,
    memberFilter,
    setMemberFilter,
    memberSortBy,
    setMemberSortBy,
    selectedMember,
    setSelectedMember,
    memberHistory,
    memberWatchlist,
    loadingMemberDetails,
    copiedUid,
    colSearchQuery,
    setColSearchQuery,
    isCleaning,
    cleanResultModal,
    setCleanResultModal,
    isManualRefreshing,
    isSyncingEmbeddings,
    allMembers,
    filteredMembers,
    metrics,
    filteredComments,
    filteredCollections,
    handleManualRefresh,
    handleUnflagComment,
    handleToggleUserCommentBan,
    handleAutoCleanComments,
    handlePurgeAllFlagged,
    handleDeleteComment,
    handleDeleteAllUserComments,
    handleDeleteCollection,
    handleOpenMemberDetails,
    handleSyncEmbeddings,
    copyToClipboard,
  };
}

