"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Info,
  Copy,
  History,
  Bookmark,
  Flag,
  AlertOctagon,
  Ban,
  Eye,
  Check,
  X,
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
} from "@/services/userService";
import { StarRating } from "@/components/MovieReviews/StarRating";

type SortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_liked";

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Tab navigation: comments | members | collections | analytics
  const [activeTab, setActiveTab] = useState<"comments" | "members" | "collections" | "analytics">("comments");

  // Data states
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
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
  const [memberSortBy, setMemberSortBy] = useState<"recent" | "comments" | "name">("recent");

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<MemberWithStats | null>(null);
  const [memberHistory, setMemberHistory] = useState<WatchHistoryItem[]>([]);
  const [memberWatchlist, setMemberWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [memberDetailTab, setMemberDetailTab] = useState<"comments" | "history" | "watchlist">("comments");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Filter & Search states for collections
  const [colSearchQuery, setColSearchQuery] = useState("");

  // Auto-clean & purge states
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResultModal, setCleanResultModal] = useState<AutoCleanResult | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

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
      (items) => {
        setRawUsers(items);
      },
      (err) => {
        console.warn("Lỗi realtime users:", err);
      }
    );

    return () => {
      unsubComments();
      unsubCollections();
      unsubUsers();
    };
  }, [isAdmin]);

  // Derived: Merge rawUsers with any unique commenters
  const allMembers = useMemo<MemberWithStats[]>(() => {
    const memberMap = new Map<string, MemberWithStats>();

    // 1. Thêm các user đã đăng ký profile trong Firestore
    rawUsers.forEach((u) => {
      memberMap.set(u.uid, {
        ...u,
        commentsCount: 0,
        avgRatingGiven: 0,
        spoilerCount: 0,
      });
    });

    // 2. Thêm và tính toán thống kê từ danh sách comments
    const userCommentsMap = new Map<string, MovieComment[]>();
    comments.forEach((c) => {
      const list = userCommentsMap.get(c.userId) || [];
      list.push(c);
      userCommentsMap.set(c.userId, list);

      if (!memberMap.has(c.userId)) {
        memberMap.set(c.userId, {
          uid: c.userId,
          email: c.userEmail || "",
          displayName: c.userName || "Thành viên Nanaflix",
          photoURL: c.userAvatar,
          createdAt: c.createdAt || Date.now(),
          lastLoginAt: c.createdAt || Date.now(),
          role: isUserAdmin(c.userEmail) ? "admin" : "member",
          commentsCount: 0,
          avgRatingGiven: 0,
          spoilerCount: 0,
        });
      }
    });

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

      result.push({
        ...m,
        commentsCount: userComms.length,
        avgRatingGiven: avg,
        spoilerCount: spoilers,
      });
    });

    return result;
  }, [rawUsers, comments]);

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
        if (memberSortBy === "recent") return (b.lastLoginAt || 0) - (a.lastLoginAt || 0);
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

    const uniqueUsers = allMembers.length;
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
  }, [comments, collections, allMembers]);

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
      toast.success("Đã xóa bình luận thành công khỏi Firestore!");
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
    setMemberDetailTab("comments");
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
              href="/browse"
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
    <div className="min-h-screen bg-[#0a0a0c] text-white pt-20 pb-24 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-400 shadow-md">
                <ShieldCheck size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Nanaflix Admin Portal</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-red-500/30 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              <span>Đăng nhập bởi: <strong className="text-white">{user.email}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Realtime Connected
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-netflix-red/20 hover:bg-netflix-red/30 text-red-300 hover:text-white text-xs font-semibold transition border border-netflix-red/30 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isManualRefreshing ? "animate-spin" : ""} />
              <span>{isManualRefreshing ? "Đang đồng bộ..." : "Làm Mới Dữ Liệu"}</span>
            </button>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10"
            >
              <Home size={14} />
              <span>Về Trang Chủ</span>
            </Link>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Total Comments */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Tổng Bình Luận</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <MessageSquare size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.totalComments}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Bình luận & phản hồi</p>
          </div>

          {/* Card 2: Average Score */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Điểm Trung Bình</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Star size={16} className="fill-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400 flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
              <span>{metrics.avgScore}</span>
              <span className="text-xs font-normal text-gray-400">/ 5.0</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{metrics.totalRatingReviews} lượt chấm sao</p>
          </div>

          {/* Card 3: Unique Users / Members */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Thành Viên</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.uniqueUsers}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Thành viên ghi nhận</p>
          </div>

          {/* Card 4: Unique Movies */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Phim Đánh Giá</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Film size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.uniqueMovies}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Phim có bình luận</p>
          </div>

          {/* Card 5: Flagged & Moderation (MỚI) */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Vi Phạm / Cờ</span>
              <div className={`p-1.5 rounded-lg ${metrics.flaggedCount > 0 ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-gray-400"}`}>
                <Flag size={16} className={metrics.flaggedCount > 0 ? "text-red-400 animate-pulse" : ""} />
              </div>
            </div>
            <div className={`text-2xl font-black ${metrics.flaggedCount > 0 ? "text-red-400" : "text-white"} group-hover:scale-105 transition-transform origin-left`}>
              {metrics.flaggedCount}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Cần Admin xét duyệt</p>
          </div>

          {/* Card 6: Spoilers */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Cảnh Báo Spoil</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-400 group-hover:scale-105 transition-transform origin-left">
              {metrics.spoilerCount}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Cảnh báo nội dung</p>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === "comments"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <MessageSquare size={15} />
            <span>Quản Lý Bình Luận</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {comments.length}
            </span>
            {metrics.flaggedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold animate-pulse">
                {metrics.flaggedCount} vi phạm
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === "members"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users size={15} />
            <span>Danh Sách Thành Viên</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {allMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === "collections"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <FolderHeart size={15} />
            <span>Bộ Sưu Tập Công Khai</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {collections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${
              activeTab === "analytics"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Sparkles size={15} />
            <span>Phân Tích & Báo Cáo</span>
          </button>
        </div>

        {/* TAB 1: COMMENTS MANAGEMENT */}
        {activeTab === "comments" && (
          <div className="space-y-4">
            {/* AUTO CLEAN & PURGE CONTROL BAR */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-amber-950/30 border border-red-500/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 shadow-inner flex-shrink-0">
                  <ShieldAlert size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">
                      Hệ Thống Tự Động Quét & Xóa Bình Luận Rác
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Auto-Shield Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tự động nhận diện và xóa vĩnh viễn ngôn từ vô văn hóa, tục tĩu, 18+, cờ bạc, scam và chuỗi spam.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
                <button
                  type="button"
                  onClick={handleAutoCleanComments}
                  disabled={isCleaning}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/40 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles size={15} className={isCleaning ? "animate-spin" : ""} />
                  <span>{isCleaning ? "Đang quét..." : "Quét & Xóa Rác Tự Động"}</span>
                </button>

                {metrics.flaggedCount > 0 && (
                  <button
                    type="button"
                    onClick={handlePurgeAllFlagged}
                    className="px-3.5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Xóa Sạch Cờ ({metrics.flaggedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên người dùng, email, phim, nội dung bình luận, lý do vi phạm..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
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

              <div className="flex items-center gap-2 flex-wrap">
                {/* Moderation / Flagged Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setFlaggedFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      flaggedFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlaggedFilter("flagged")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      flaggedFilter === "flagged"
                        ? "bg-red-500/25 text-red-400 border border-red-500/40 font-bold shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Flag size={12} className={metrics.flaggedCount > 0 ? "text-red-400" : ""} />
                    <span>🚨 Vi phạm</span>
                    {metrics.flaggedCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold">
                        {metrics.flaggedCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Star Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                  <span className="text-[11px] text-gray-400 px-2 flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span>Sao:</span>
                  </span>
                  {(["all", 5, 4, 3, 2, 1] as const).map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStarFilter(star)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        starFilter === star
                          ? "bg-amber-500 text-black font-bold shadow-sm"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {star === "all" ? "Tất cả" : `${star}★`}
                    </button>
                  ))}
                </div>

                {/* Spoiler Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setSpoilerFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      spoilerFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpoilerFilter("spoiler")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      spoilerFilter === "spoiler"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <AlertTriangle size={12} />
                    <span>Spoil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpoilerFilter("no_spoiler")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      spoilerFilter === "no_spoiler" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Không Spoil
                  </button>
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
                  <ArrowUpDown size={12} className="text-gray-400" />
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
              {(searchQuery || starFilter !== "all" || spoilerFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStarFilter("all");
                    setSpoilerFilter("all");
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
                      className={`p-4 sm:p-5 rounded-2xl transition backdrop-blur-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 group ${
                        item.isFlagged
                          ? "bg-red-950/20 border-2 border-red-500/40 shadow-lg shadow-red-950/30 hover:border-red-500/60"
                          : "bg-zinc-900/60 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {/* Left: User & Content */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-netflix-red flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden relative border border-white/15 flex-shrink-0">
                            {item.userAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.userAvatar}
                                alt={item.userName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <span>{item.userName ? item.userName[0] : "U"}</span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{item.userName}</span>
                              {item.userEmail && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono">
                                  {item.userEmail}
                                </span>
                              )}
                              {isUserRestricted && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-bold flex items-center gap-1">
                                  <Ban size={10} />
                                  <span>Bị cấm cmt</span>
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Clock size={11} />
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {item.rating > 0 && (
                            <div className="ml-auto sm:ml-0">
                              <StarRating value={item.rating} size="sm" readOnly />
                            </div>
                          )}
                        </div>

                        {/* Movie tag & Episode info */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-gray-400 text-[11px]">Phim:</span>
                          <Link
                            href={`/movies/${item.movieSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-netflix-red/15 border border-netflix-red/30 text-red-300 hover:text-white hover:bg-netflix-red/25 transition text-xs font-semibold"
                          >
                            <Film size={12} />
                            <span>{item.movieTitle || item.movieSlug}</span>
                            <ExternalLink size={11} className="opacity-70" />
                          </Link>

                          {item.episodeName && (
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300">
                              {item.episodeName}
                            </span>
                          )}

                          {item.isFlagged && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/30 border border-red-500/50 text-[10px] text-red-300 font-bold animate-pulse">
                              <Flag size={11} className="fill-red-400 text-red-400" />
                              <span>BỊ ĐÁNH DẤU VI PHẠM</span>
                            </span>
                          )}

                          {item.isSpoiler && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-400 font-bold">
                              <AlertTriangle size={11} />
                              <span>Cảnh Báo Spoil</span>
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
                              <span>{item.likes} lượt thích</span>
                            </span>
                          )}
                        </div>

                        {/* Moderation Warning Banner */}
                        {item.isFlagged && (
                          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 text-red-400 font-bold">
                              <ShieldAlert size={14} className="text-red-400 flex-shrink-0" />
                              <span>Hệ thống kiểm duyệt phát hiện nội dung nhạy cảm / không đúng thuần phong mỹ tục</span>
                            </div>
                            <p className="text-red-200/90 text-[11px]">
                              <strong className="text-red-300">Lý do:</strong> {item.flagReason || "Chứa từ cấm hoặc hành vi spam"}
                            </p>
                            {item.flaggedKeywords && item.flaggedKeywords.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] text-red-300 font-medium">Từ khóa phát hiện:</span>
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
                        <div className="text-xs text-gray-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-wrap font-sans">
                          &ldquo;{item.content}&rdquo;
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 flex-shrink-0">
                        <Link
                          href={`/movies/${item.movieSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                        >
                          <ExternalLink size={13} />
                          <span>Xem phim</span>
                        </Link>

                        {item.isFlagged && (
                          <button
                            type="button"
                            onClick={() => handleUnflagComment(item)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
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
                            className={`px-3 py-1.5 rounded-xl border transition cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              isUserRestricted
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
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition cursor-pointer text-xs font-medium flex items-center gap-1.5 shadow-sm active:scale-95"
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

        {/* TAB 2: MEMBERS DIRECTORY (MỚI) */}
        {activeTab === "members" && (
          <div className="space-y-4">
            {/* Toolbar for members */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Tìm thành viên theo tên, email hoặc UID..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
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

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter role */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setMemberFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      memberFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Tất cả ({allMembers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter("admin")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      memberFilter === "admin"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    👑 Quản Trị Viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter("has_comments")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      memberFilter === "has_comments"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Đã bình luận
                  </button>
                </div>

                {/* Sort members */}
                <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
                  <ArrowUpDown size={12} className="text-gray-400" />
                  <select
                    value={memberSortBy}
                    onChange={(e) => setMemberSortBy(e.target.value as "recent" | "comments" | "name")}
                    className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="recent" className="bg-zinc-900 text-white">Hoạt động mới nhất</option>
                    <option value="comments" className="bg-zinc-900 text-white">Nhiều bình luận nhất</option>
                    <option value="name" className="bg-zinc-900 text-white">Tên (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COUNT HEADER */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>
                Hiển thị <strong className="text-white">{filteredMembers.length}</strong> / {allMembers.length} thành viên
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((m) => {
                  const isSuperAdmin = m.role === "admin";
                  return (
                    <div
                      key={m.uid}
                      className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm flex flex-col justify-between space-y-4 group"
                    >
                      <div>
                        {/* Member Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded-2xl bg-netflix-red flex items-center justify-center text-sm font-bold text-white uppercase overflow-hidden relative border border-white/15 flex-shrink-0 shadow-md">
                            {m.photoURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.photoURL}
                                alt={m.displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <span>{(m.displayName || "U")[0]}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-bold text-white truncate">
                                {m.displayName}
                              </h3>
                              {isSuperAdmin && (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-300 font-bold">
                                  👑 Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {m.email || "Chưa có email"}
                            </p>
                          </div>
                        </div>

                        {/* UID badge */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/5 text-[11px] mb-3">
                          <span className="text-gray-500 font-mono truncate max-w-[190px]">
                            UID: {m.uid}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.uid, m.uid)}
                            className="text-gray-400 hover:text-white p-1 rounded transition cursor-pointer"
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
                          <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-1.5 font-medium mb-3">
                            <Ban size={13} className="text-red-400 flex-shrink-0" />
                            <span className="truncate">Đang bị khóa quyền bình luận</span>
                          </div>
                        )}

                        {/* Member stats chips */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                            <span className="text-[10px] text-gray-400 block">Bình luận</span>
                            <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                              <MessageSquare size={13} className="text-blue-400" />
                              <span>{m.commentsCount} bài</span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                            <span className="text-[10px] text-gray-400 block">Điểm trung bình</span>
                            <span className="font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                              <Star size={13} className="fill-amber-400" />
                              <span>{m.avgRatingGiven > 0 ? `${m.avgRatingGiven}★` : "Chưa chấm"}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-gray-500 flex-wrap gap-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>Lần hoạt động: {formatDate(m.lastLoginAt)}</span>
                          </span>
                          {m.violationsCount && m.violationsCount > 0 ? (
                            <span className="text-red-400 font-semibold flex items-center gap-1">
                              <AlertOctagon size={11} />
                              <span>{m.violationsCount} lần vi phạm</span>
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
                          <span>Chi Tiết Hoạt Động</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleUserCommentBan(m)}
                          className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                            m.isCommentRestricted
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                          }`}
                          title={m.isCommentRestricted ? "Mở khóa quyền bình luận" : "Khóa quyền bình luận thành viên"}
                        >
                          {m.isCommentRestricted ? <ShieldCheck size={15} /> : <Ban size={15} />}
                        </button>

                        {m.commentsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAllUserComments(m)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                            title="Xóa tất cả bình luận của thành viên này"
                          >
                            <Trash2 size={15} />
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
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={colSearchQuery}
                  onChange={(e) => setColSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên bộ sưu tập, người tạo..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
                />
              </div>
              <div className="text-xs text-gray-400">
                Tổng số: <strong className="text-white">{filteredCollections.length}</strong> bộ sưu tập công khai
              </div>
            </div>

            {filteredCollections.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/10">
                <FolderHeart size={36} className="text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-300">Chưa có bộ sưu tập công khai nào</p>
                <p className="text-xs text-gray-500 mt-1">Khi người dùng chia sẻ bộ sưu tập lên cộng đồng, chúng sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCollections.map((col) => (
                  <div
                    key={col.id}
                    className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                          {col.movies?.length || 0} phim
                        </span>
                        <span className="text-[10px] text-gray-500">{formatDate(col.updatedAt)}</span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-netflix-red transition">
                        {col.name}
                      </h3>
                      {col.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">{col.description}</p>
                      )}
                      <p className="text-[11px] text-gray-500 mt-2">
                        Người tạo: <strong className="text-gray-300">{col.creatorName || col.userId}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <Link
                        href={`/collection/${col.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold text-center transition flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink size={13} />
                        <span>Xem chi tiết</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(col)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                        title="Gỡ khỏi công khai"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANALYTICS & INSIGHTS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rating Distribution Chart */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    <span>Phân Bổ Điểm Số Đánh Giá Toàn Hệ Thống</span>
                  </h3>
                  <span className="text-xs text-amber-400 font-bold">
                    {metrics.avgScore} / 5.0 ⭐
                  </span>
                </div>

                <div className="space-y-2.5 pt-2">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = metrics.starDistribution[s as 1 | 2 | 3 | 4 | 5] || 0;
                    const percent =
                      metrics.totalRatingReviews > 0
                        ? Math.round((count / metrics.totalRatingReviews) * 100)
                        : 0;

                    return (
                      <div key={s} className="flex items-center gap-3 text-xs">
                        <span className="w-12 text-gray-400 font-bold">{s} sao:</span>
                        <div className="flex-1 h-3 rounded-full bg-black/60 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              s >= 4 ? "bg-amber-400" : s === 3 ? "bg-blue-400" : "bg-red-400"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-14 text-right text-gray-300 font-mono">
                          {count} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System Diagnostics */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Info size={16} className="text-blue-400" />
                  <span>Trạng Thái Hệ Thống & Phân Quyền</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400">Tài khoản Quản trị viên:</span>
                    <span className="font-mono font-bold text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400">Trạng thái Firestore:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Hoạt động bình thường
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400">Quy tắc bảo mật (Security Rules):</span>
                    <span className="text-gray-200 font-mono">Version 2 (Đã cấp quyền Admin)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400">Tổng thành viên ghi nhận:</span>
                    <span className="text-gray-200 font-mono font-bold">{allMembers.length} người</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: MEMBER ACTIVITY DETAILS */}
        {selectedMember && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="max-w-2xl w-full bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-netflix-red flex items-center justify-center text-base font-bold text-white uppercase overflow-hidden relative border border-white/15 flex-shrink-0">
                    {selectedMember.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedMember.photoURL}
                        alt={selectedMember.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(selectedMember.displayName || "U")[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-white truncate">
                        {selectedMember.displayName}
                      </h2>
                      {selectedMember.role === "admin" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          👑 Admin
                        </span>
                      )}
                      {selectedMember.isCommentRestricted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30 flex items-center gap-1">
                          <Ban size={10} />
                          <span>Bị khóa bình luận</span>
                        </span>
                      )}
                      {selectedMember.violationsCount && selectedMember.violationsCount > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          ⚠️ {selectedMember.violationsCount} vi phạm
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{selectedMember.email || "Chưa có email"}</p>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">UID: {selectedMember.uid}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleUserCommentBan(selectedMember);
                      setSelectedMember((prev) => prev ? { ...prev, isCommentRestricted: !prev.isCommentRestricted } : null);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedMember.isCommentRestricted
                        ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {selectedMember.isCommentRestricted ? <ShieldCheck size={14} /> : <Ban size={14} />}
                    <span>{selectedMember.isCommentRestricted ? "Mở khóa bình luận" : "Khóa quyền bình luận"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setMemberDetailTab("comments")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    memberDetailTab === "comments"
                      ? "bg-netflix-red text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <MessageSquare size={13} />
                  <span>Bình luận ({selectedMember.commentsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberDetailTab("history")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    memberDetailTab === "history"
                      ? "bg-netflix-red text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <History size={13} />
                  <span>Lịch sử xem ({memberHistory.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberDetailTab("watchlist")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    memberDetailTab === "watchlist"
                      ? "bg-netflix-red text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Bookmark size={13} />
                  <span>Phim đã lưu ({memberWatchlist.length})</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {loadingMemberDetails ? (
                  <div className="p-8 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-netflix-red border-t-transparent animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Đang tải dữ liệu đám mây của thành viên...</p>
                  </div>
                ) : memberDetailTab === "comments" ? (
                  // Tab: Comments of this member
                  (() => {
                    const userComms = comments.filter((c) => c.userId === selectedMember.uid);
                    if (userComms.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-gray-500">
                          Thành viên này chưa để lại bình luận nào trên hệ thống.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2.5">
                        {userComms.map((c) => (
                          <div
                            key={c.id}
                            className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/movies/${c.movieSlug}`}
                                  target="_blank"
                                  className="font-bold text-red-400 hover:underline flex items-center gap-1"
                                >
                                  <span>{c.movieTitle || c.movieSlug}</span>
                                  <ExternalLink size={11} />
                                </Link>
                                {c.episodeName && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                                    {c.episodeName}
                                  </span>
                                )}
                                {c.isSpoiler && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                                    Spoil
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500">{formatDate(c.createdAt)}</span>
                            </div>

                            {c.isFlagged && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                                <ShieldCheck size={13} className="flex-shrink-0 text-amber-400" />
                                <span>Bình luận này đã bị báo cáo vi phạm.</span>
                              </div>
                            )}

                            {c.rating > 0 && <StarRating value={c.rating} size="sm" readOnly />}

                            <p className="text-gray-300 bg-black/40 p-2.5 rounded-lg border border-white/5">
                              &ldquo;{c.content}&rdquo;
                            </p>

                            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                              <span className="text-[10px] text-gray-500">
                                {c.likes > 0 ? `${c.likes} lượt thích` : "0 lượt thích"}
                              </span>
                              <div className="flex items-center gap-3">
                                {c.isFlagged && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnflagComment(c)}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                                  >
                                    <ShieldCheck size={12} />
                                    <span>Gỡ cờ</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c)}
                                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>Xóa bình luận này</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : memberDetailTab === "history" ? (
                  // Tab: Watch History
                  memberHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      Chưa có lịch sử xem phim đồng bộ trên Cloud.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberHistory.map((item, idx) => (
                        <div
                          key={item.slug || idx}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{item.title || item.slug}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {item.episodeName ? `Đang xem: ${item.episodeName}` : "Đã xem"} •{" "}
                              {formatDate(item.updatedAt)}
                            </p>
                          </div>
                          <Link
                            href={`/movies/${item.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink size={12} />
                            <span>Mở</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Tab: Watchlist
                  memberWatchlist.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      Thành viên chưa lưu bộ phim nào vào danh sách yêu thích.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberWatchlist.map((item, idx) => (
                        <div
                          key={item.slug || idx}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{item.title || item.slug}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Đã lưu vào danh sách • {formatDate(item.addedAt)}
                            </p>
                          </div>
                          <Link
                            href={`/movies/${item.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink size={12} />
                            <span>Xem</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                {selectedMember.commentsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteAllUserComments(selectedMember);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Xóa toàn bộ {selectedMember.commentsCount} bình luận của user</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: AUTO-CLEAN SCAN RESULTS AUDIT */}
        {cleanResultModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="max-w-2xl w-full bg-zinc-950 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Báo Cáo Tự Động Quét & Xóa Bình Luận Rác
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Đã quét <strong className="text-white">{cleanResultModal.scannedCount}</strong> bình luận • Đã xóa sạch <strong className="text-red-400">{cleanResultModal.deletedCount}</strong> vi phạm
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCleanResultModal(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                <p className="text-xs text-gray-400">
                  Danh sách các bình luận chứa từ ngữ vô văn hóa, tục tĩu hoặc hành vi spam đã được hệ thống tự động xóa vĩnh viễn khỏi Firestore:
                </p>

                <div className="space-y-2.5">
                  {cleanResultModal.deletedItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{item.userName}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/30">
                            {item.reason}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Phim: {item.movieSlug}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-gray-200 font-sans">
                        &ldquo;{item.content}&rdquo;
                      </div>

                      {item.violations && item.violations.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-red-300 font-medium">Từ khóa phát hiện:</span>
                          {item.violations.map((kw, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded bg-red-900/60 border border-red-500/30 text-red-200 text-[10px] font-mono"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCleanResultModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-red-950/40"
                >
                  Xác Nhận & Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
