"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ChevronRight,
  Filter,
  CheckCircle2,
  Lock,
  ArrowUpDown,
  Home,
  Sparkles,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin, ADMIN_EMAILS } from "@/lib/adminConfig";
import { AuthModal } from "@/components/AuthModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/Toast";
import { MovieComment } from "@/types/comment";
import { MovieCollection } from "@/types/collection";
import {
  subscribeAllComments,
  deleteMovieComment,
} from "@/services/commentService";
import {
  subscribeAllPublicCollections,
  deletePublicCollectionAdmin,
} from "@/services/collectionService";
import { StarRating } from "@/components/MovieReviews/StarRating";

type SortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_liked";

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"comments" | "collections" | "analytics">("comments");

  // Data states
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filter & Search states for comments
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [spoilerFilter, setSpoilerFilter] = useState<"all" | "spoiler" | "no_spoiler">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Filter & Search states for collections
  const [colSearchQuery, setColSearchQuery] = useState("");

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

    return () => {
      unsubComments();
      unsubCollections();
    };
  }, [isAdmin]);

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

    const uniqueUsers = new Set(comments.map((c) => c.userId)).size;
    const uniqueMovies = new Set(comments.map((c) => c.movieSlug)).size;
    const spoilerCount = comments.filter((c) => c.isSpoiler).length;
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
      totalPublicCols,
      starDistribution,
    };
  }, [comments, collections]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments
      .filter((item) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchUser = item.userName?.toLowerCase().includes(q);
          const matchEmail = item.userEmail?.toLowerCase().includes(q);
          const matchSlug = item.movieSlug?.toLowerCase().includes(q);
          const matchTitle = item.movieTitle?.toLowerCase().includes(q);
          const matchContent = item.content?.toLowerCase().includes(q);
          if (!matchUser && !matchEmail && !matchSlug && !matchTitle && !matchContent) {
            return false;
          }
        }

        // Star filter
        if (starFilter !== "all") {
          if (item.rating !== starFilter) return false;
        }

        // Spoiler filter
        if (spoilerFilter === "spoiler" && !item.isSpoiler) return false;
        if (spoilerFilter === "no_spoiler" && item.isSpoiler) return false;

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
  }, [comments, searchQuery, starFilter, spoilerFilter, sortBy]);

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

  // Top reviewed movies
  const topMovies = useMemo(() => {
    const map = new Map<string, { slug: string; title: string; count: number; totalScore: number }>();
    comments.forEach((c) => {
      const existing = map.get(c.movieSlug) || {
        slug: c.movieSlug,
        title: c.movieTitle || c.movieSlug,
        count: 0,
        totalScore: 0,
      };
      existing.count += 1;
      if (c.rating > 0) {
        existing.totalScore += c.rating;
      }
      if (!existing.title && c.movieTitle) {
        existing.title = c.movieTitle;
      }
      map.set(c.movieSlug, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [comments]);

  // Top reviewers
  const topUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string; count: number; email?: string }>();
    comments.forEach((c) => {
      const existing = map.get(c.userId) || {
        id: c.userId,
        name: c.userName || "Người dùng",
        avatar: c.userAvatar,
        count: 0,
        email: c.userEmail,
      };
      existing.count += 1;
      if (!existing.email && c.userEmail) {
        existing.email = c.userEmail;
      }
      map.set(c.userId, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [comments]);

  // Handler: Delete comment
  const handleDeleteComment = async (comment: MovieComment) => {
    const confirmed = await showConfirmDialog({
      title: "Xác nhận xóa bình luận",
      message: `Bạn có chắc chắn muốn xóa bình luận của "${comment.userName}" cho phim "${comment.movieTitle || comment.movieSlug}" không? Hành động này không thể phục hồi.`,
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
          {/* Subtle ambient red background glow */}
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
              <span>Email quản trị được duyệt:</span>
              <span className="text-amber-400 font-mono font-bold">dungtran122cq@gmail.com</span>
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
            <p className="text-[10px] text-gray-400 mt-1">{metrics.totalRatingReviews} lượt đánh giá sao</p>
          </div>

          {/* Card 3: Unique Users */}
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
            <p className="text-[10px] text-gray-400 mt-1">Đã để lại tương tác</p>
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

          {/* Card 5: Spoilers */}
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
            <p className="text-[10px] text-gray-400 mt-1">Cảnh báo tiết lộ phim</p>
          </div>

          {/* Card 6: Public Collections */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Bộ Sưu Tập</span>
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <FolderHeart size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {metrics.totalPublicCols}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Được chia sẻ công khai</p>
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
            <span>Quản Lý Bình Luận & Đánh Giá</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {comments.length}
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

        {/* TAB CONTENT */}
        {activeTab === "comments" && (
          <div className="space-y-4">
            {/* TOOLBAR: SEARCH & FILTERS */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên người dùng, email, phim, nội dung bình luận..."
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

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
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
                  Xóa toàn bộ bộ lọc
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
                {filteredComments.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
                  >
                    {/* Left: User & Content Info */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* User row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Avatar */}
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
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Clock size={11} />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Stars */}
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
                          href={`/watch/${item.movieSlug}`}
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

                        {item.isSpoiler && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-400 font-bold">
                            <AlertTriangle size={11} />
                            <span>Cảnh Báo Spoil</span>
                          </span>
                        )}

                        {item.likes > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                            <Heart size={11} className="fill-rose-500 text-rose-500" />
                            <span>{item.likes} lượt thích</span>
                          </span>
                        )}
                      </div>

                      {/* Comment text */}
                      <div className="text-xs text-gray-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-wrap font-sans">
                        &ldquo;{item.content}&rdquo;
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 flex-shrink-0">
                      <Link
                        href={`/watch/${item.movieSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                      >
                        <ExternalLink size={13} />
                        <span>Xem phim</span>
                      </Link>

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
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PUBLIC COLLECTIONS */}
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

        {/* TAB 3: ANALYTICS & INSIGHTS */}
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
                    <span className="text-gray-200 font-mono">Version 2 (Đã cấu hình)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400">Giới hạn tải bình luận:</span>
                    <span className="text-gray-200 font-mono">300 items / real-time query</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Movies & Top Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Movies */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Film size={16} className="text-netflix-red" />
                  <span>Top Phim Nhận Được Nhiều Đánh Giá Nhất</span>
                </h3>

                {topMovies.length === 0 ? (
                  <p className="text-xs text-gray-500">Chưa có dữ liệu phim.</p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {topMovies.map((movie, idx) => (
                      <div key={movie.slug} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center font-bold text-gray-500">{idx + 1}</span>
                          <Link
                            href={`/watch/${movie.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-white hover:text-netflix-red transition truncate"
                          >
                            {movie.title}
                          </Link>
                        </div>
                        <span className="text-gray-400 font-mono flex-shrink-0">
                          <strong className="text-white">{movie.count}</strong> bình luận
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Reviewers */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-emerald-400" />
                  <span>Top Thành Viên Tích Cực Nhất</span>
                </h3>

                {topUsers.length === 0 ? (
                  <p className="text-xs text-gray-500">Chưa có dữ liệu thành viên.</p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {topUsers.map((u, idx) => (
                      <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center font-bold text-gray-500">{idx + 1}</span>
                          <span className="font-semibold text-white truncate">{u.name}</span>
                          {u.email && (
                            <span className="text-[10px] text-gray-500 font-mono truncate hidden sm:inline">
                              ({u.email})
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 font-mono flex-shrink-0">
                          <strong className="text-emerald-400">{u.count}</strong> đánh giá
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
