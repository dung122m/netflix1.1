"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  Film,
  Trash2,
  ArrowLeft,
  Clock,
  Play,
  X,
  RefreshCw,
  LogIn,
  FolderHeart,
  FolderPlus,
  Share2,
  Globe,
  Lock,
  Check,
  Plus,
  User,
  MessageSquare,
  Star,
  ExternalLink,
  Loader2,
  ThumbsUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { MediaCard } from "@/components/browse/MediaCard";
import { getWatchlist, WatchlistItem } from "@/lib/watchlist";
import {
  getWatchHistory,
  removeWatchHistoryItem,
  clearWatchHistory,
  WatchHistoryItem,
} from "@/lib/watchHistory";
import { pickBestMovieThumb, toOptimizedPhimimgUrl } from "@/lib/movieMedia";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { clearAllWatchlistFromCloud } from "@/lib/cloudSync";
import {
  subscribeUserCollections,
  deleteCollection,
  toggleCollectionPrivacy,
} from "@/services/collectionService";
import { subscribeUserComments, deleteMovieComment } from "@/services/commentService";
import { MovieCollection } from "@/types/collection";
import { MovieComment } from "@/types/comment";
import { CreateCollectionModal } from "@/components/Collections/CreateCollectionModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/Toast";

function MyListContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: "watchlist" | "history" | "collections" | "comments" =
    tabParam === "history"
      ? "history"
      : tabParam === "collections"
      ? "collections"
      : tabParam === "comments"
      ? "comments"
      : "watchlist";

  const [activeTab, setActiveTab] = useState<"watchlist" | "history" | "collections" | "comments">(initialTab);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [userComments, setUserComments] = useState<MovieComment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { user, isSyncing, syncNow } = useAuth();

  useEffect(() => {
    setWatchlist(getWatchlist());
    setHistory(getWatchHistory());
    setMounted(true);

    const handleWatchlistSync = () => {
      setWatchlist(getWatchlist());
    };
    const handleHistorySync = () => {
      setHistory(getWatchHistory());
    };

    window.addEventListener("watchlist-updated", handleWatchlistSync);
    window.addEventListener("watch-history-updated", handleHistorySync);

    return () => {
      window.removeEventListener("watchlist-updated", handleWatchlistSync);
      window.removeEventListener("watch-history-updated", handleHistorySync);
    };
  }, []);

  // Lắng nghe bộ sưu tập cá nhân theo thời gian thực khi đăng nhập
  useEffect(() => {
    if (!user?.uid) {
      setCollections([]);
      return;
    }

    const unsub = subscribeUserCollections(user.uid, (items) => {
      setCollections(items);
    });

    return () => unsub();
  }, [user?.uid]);

  // Lắng nghe bình luận của người dùng theo thời gian thực
  useEffect(() => {
    if (!user?.uid) {
      setUserComments([]);
      return;
    }

    const unsub = subscribeUserComments(user.uid, (items) => {
      setUserComments(items);
    });

    return () => unsub();
  }, [user?.uid]);

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa bình luận",
      message: "Bạn có chắc chắn muốn xóa nhận xét này? Bình luận sẽ bị gỡ vĩnh viễn khỏi bộ phim.",
      confirmText: "Xóa bình luận",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (!confirmed) return;

    setDeletingCommentId(commentId);
    try {
      await deleteMovieComment(commentId);
      toast.success("Đã xóa bình luận thành công!");
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
      toast.error("Không thể xóa bình luận lúc này!");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleClearWatchlist = async () => {
    const confirmed = await showConfirmDialog({
      title: "Xóa danh sách yêu thích",
      message: "Bạn có chắc chắn muốn xoá toàn bộ phim trong danh sách đã lưu? Hành động này sẽ dọn sạch toàn bộ phim đã lưu xem sau.",
      confirmText: "Xóa toàn bộ",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (confirmed) {
      localStorage.removeItem("nanaflix_watchlist_v1");
      setWatchlist([]);
      window.dispatchEvent(new Event("watchlist-updated"));
      if (user) {
        await clearAllWatchlistFromCloud(user.uid);
      }
      toast.info("Đã dọn sạch danh sách yêu thích.");
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await showConfirmDialog({
      title: "Xóa lịch sử xem phim",
      message: "Bạn có chắc chắn muốn xoá toàn bộ lịch sử xem phim? Tiến trình xem các tập phim sẽ được làm mới.",
      confirmText: "Xóa lịch sử",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (confirmed) {
      clearWatchHistory();
      setHistory([]);
      toast.info("Đã xóa toàn bộ lịch sử xem phim.");
    }
  };

  const handleShareCollection = (colId: string) => {
    if (typeof window !== "undefined") {
      const col = collections.find((c) => c.id === colId);
      const url = `${window.location.origin}/collection/${colId}${col?.userId ? `?u=${col.userId}` : ""}`;
      navigator.clipboard.writeText(url);
      setCopiedId(colId);
      toast.success("Đã sao chép liên kết chia sẻ bộ sưu tập!");
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleTogglePrivacy = async (col: MovieCollection) => {
    if (!user?.uid) return;
    const nextPublic = !col.isPublic;
    const ok = await toggleCollectionPrivacy(user.uid, col.id, nextPublic);
    if (ok) {
      toast.success(
        nextPublic
          ? `Bộ sưu tập "${col.name}" đã được chuyển sang Công Khai 🌐`
          : `Bộ sưu tập "${col.name}" đã chuyển sang Riêng Tư 🔒`
      );
    }
  };

  const handleDeleteCollection = async (col: MovieCollection) => {
    if (!user?.uid) return;
    const confirmed = await showConfirmDialog({
      title: "Xóa bộ sưu tập",
      message: `Bạn có chắc chắn muốn xóa bộ sưu tập "${col.name}"? Toàn bộ danh sách phim trong bộ sưu tập này cũng sẽ bị xóa.`,
      confirmText: "Xóa bộ sưu tập",
      cancelText: "Hủy",
      variant: "danger",
    });

    if (confirmed) {
      const ok = await deleteCollection(user.uid, col.id);
      if (ok) {
        toast.info(`Đã xóa bộ sưu tập "${col.name}".`);
      }
    }
  };

  return (
    <main className="max-w-[1800px] mx-auto px-4 md:px-8 pt-24 sm:pt-28 pb-16">
      {/* HEADER & BREADCRUMB */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-gray-400 mb-2">
            <Link href="/" className="hover:text-white transition flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-gray-200">
              {activeTab === "watchlist"
                ? "Danh sách của tôi"
                : activeTab === "history"
                ? "Lịch sử xem"
                : "Bộ sưu tập của tôi"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold flex items-center gap-3">
            {activeTab === "watchlist" ? (
              <>
                <Bookmark className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red fill-current" />
                Danh sách của tôi
              </>
            ) : activeTab === "history" ? (
              <>
                <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
                Lịch sử xem phim
              </>
            ) : (
              <>
                <FolderHeart className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
                Bộ sưu tập của tôi
              </>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === "watchlist"
              ? "Các bộ phim bạn đã đánh dấu để xem lại bất cứ khi nào."
              : activeTab === "history"
              ? "Danh sách các bộ phim và tập phim bạn đã xem gần đây."
              : "Các danh sách phim được tuyển chọn theo chủ đề riêng và có thể chia sẻ công khai."}
          </p>
        </div>

        {/* NÚT TÁC VỤ HEADER */}
        {mounted && (
          <div>
            {activeTab === "watchlist" && watchlist.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm text-gray-300 bg-zinc-900 border border-white/15 px-3 py-1.5 rounded-lg">
                  {watchlist.length} phim đã lưu
                </span>
                <button
                  type="button"
                  onClick={handleClearWatchlist}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 bg-zinc-900/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa tất cả</span>
                </button>
              </div>
            )}

            {activeTab === "history" && history.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm text-gray-300 bg-zinc-900 border border-white/15 px-3 py-1.5 rounded-lg">
                  {history.length} phim đã xem
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 bg-zinc-900/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa lịch sử</span>
                </button>
              </div>
            )}

            {activeTab === "collections" && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    setShowCreateCollectionModal(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-950/50 transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo bộ sưu tập</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* BANNER ĐỒNG BỘ ĐÁM MÂY (CLOUD SYNC) */}
      <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-netflix-red text-white flex items-center justify-center text-xs font-bold uppercase overflow-hidden relative flex-shrink-0 border border-white/20">
              <span>{(user.displayName || user.email || "U")[0]}</span>
              {user.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang đồng bộ Google Cloud: {user.displayName || user.email}
              </p>
              <p className="text-[11px] text-gray-400">
                Danh sách yêu thích, lịch sử xem và các bộ sưu tập được đồng bộ bảo mật tức thì.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-gray-300 flex-shrink-0">
              <FolderHeart className="w-4 h-4 text-netflix-red" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Đồng bộ số phút, lịch sử & bộ sưu tập lên Đám mây
              </p>
              <p className="text-[11px] text-gray-400">
                Đăng nhập tài khoản Google miễn phí để quản lý bộ sưu tập và xem tiếp đúng phút trên mọi thiết bị.
              </p>
            </div>
          </div>
        )}

        <div className="flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-user-profile-modal"));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-netflix-red/20 hover:bg-netflix-red/30 border border-netflix-red/40 text-xs font-bold text-rose-300 hover:text-white transition cursor-pointer active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-rose-400" />
                <span>Sửa hồ sơ</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={syncNow}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ lại"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-xs font-bold text-gray-950 transition cursor-pointer shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5 text-netflix-red" />
              <span>Đăng nhập Google</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB SELECTOR: Segmented Control thiết kế phẳng trượt mượt trên mobile */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-none pb-1 touch-pan-x overscroll-x-contain">
        <button
          type="button"
          onClick={() => setActiveTab("watchlist")}
          className={`flex-none flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "watchlist"
              ? "bg-netflix-red text-white shadow-lg shadow-red-950/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
          }`}
        >
          <Bookmark className="w-4 h-4 text-red-400" />
          <span>Yêu thích ({mounted ? watchlist.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-none flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "history"
              ? "bg-netflix-red text-white shadow-lg shadow-red-950/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Lịch sử ({mounted ? history.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`flex-none flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "collections"
              ? "bg-netflix-red text-white shadow-lg shadow-red-950/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
          }`}
        >
          <FolderHeart className="w-4 h-4 text-pink-400" />
          <span>Bộ sưu tập ({mounted && user ? collections.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={`flex-none flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "comments"
              ? "bg-netflix-red text-white shadow-lg shadow-red-950/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span>Bình luận ({mounted && user ? userComments.length : 0})</span>
        </button>
      </div>

      {/* NỘI DUNG THEO TAB */}
      {!mounted ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video w-full rounded-xl bg-zinc-900/60 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : activeTab === "watchlist" ? (
        /* TAB 1: WATCHLIST */
        watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-gray-400">
              <Film className="h-9 w-9 text-gray-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Danh sách của bạn chưa có phim nào
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Khi lướt phim trên Nanaflix, hãy bấm vào nút dấu cộng (<span className="text-white font-bold">+</span>) trên các bộ phim bạn thích để lưu vào danh sách xem sau.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:bg-red-700 shadow-lg"
            >
              Khám phá phim ngay
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-3 sm:p-4 md:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {watchlist.map((item, index) => (
                <MediaCard
                  key={item.slug}
                  slug={item.slug}
                  title={item.title}
                  imageUrl={item.imageUrl}
                  genre={item.genre || ""}
                  year={item.year}
                  time={item.time}
                  country={item.country}
                  type_name={item.type_name}
                  priority={index < 4}
                />
              ))}
            </div>
          </div>
        )
      ) : activeTab === "history" ? (
        /* TAB 2: WATCH HISTORY */
        history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-gray-400">
              <Clock className="h-9 w-9 text-gray-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Chưa có lịch sử xem phim
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Các bộ phim và tập phim bạn thưởng thức sẽ tự động xuất hiện tại đây để bạn có thể dễ dàng xem tiếp bất cứ lúc nào.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:bg-red-700 shadow-lg"
            >
              Xem phim ngay
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-3 sm:p-4 md:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {history.map((item) => {
                const href = item.episodeSlug
                  ? `/movies/${item.slug}?ep=${item.episodeSlug}`
                  : `/movies/${item.slug}`;

                const progressPercent =
                  item.progressSeconds && item.durationSeconds && item.durationSeconds > 0
                    ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
                    : 0;

                return (
                  <div
                    key={item.slug}
                    className="group relative rounded-xl bg-zinc-900 border border-white/10 overflow-hidden hover:border-white/30 transition-all duration-300 hover:scale-[1.02] shadow-lg flex flex-col"
                  >
                    <Link href={href} className="block flex-1 flex flex-col">
                      <div className="relative aspect-video w-full bg-zinc-800 overflow-hidden">
                        <Image
                          src={toOptimizedPhimimgUrl(
                            pickBestMovieThumb({ poster_url: item.poster, thumb_url: item.thumb }, "/default-hero.jpg"),
                            640
                          )}
                          alt={item.title}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target && !target.src.includes("/default-hero.jpg")) {
                              target.srcset = "";
                              target.src = "/default-hero.jpg";
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                        {/* PLAY BUTTON OVERLAY */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                          </div>
                        </div>

                        {/* NÚT XOÁ */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeWatchHistoryItem(item.slug);
                          }}
                          aria-label="Xoá khỏi lịch sử"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-gray-300 hover:text-white hover:bg-black/90 backdrop-blur-sm transition z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* THANH TIẾN ĐỘ XEM (PROGRESS BAR) */}
                        {progressPercent > 0 ? (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/80 z-10">
                            <div
                              className="h-full bg-netflix-red shadow-[0_0_8px_#E50914]"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between">
                        <h3 className="text-white font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-netflix-red transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 mt-2">
                          <span className="text-red-400 font-semibold truncate max-w-[120px]">
                            {item.episodeName ? formatEpisodeName(item.episodeName) : "Đã xem"}
                          </span>
                          {progressPercent > 0 && (
                            <span className="text-zinc-400 font-mono text-[10px]">
                              {progressPercent}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : activeTab === "collections" ? (
        /* TAB 3: CUSTOM COLLECTIONS */
        !user ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-gray-400">
              <FolderHeart className="h-9 w-9 text-netflix-red" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Bộ sưu tập phim cá nhân
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Đăng nhập tài khoản Google để tạo playlist phim theo gu riêng, gom nhóm các tác phẩm yêu thích và chia sẻ liên kết công khai.
            </p>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-netflix-red px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 shadow-lg cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập ngay</span>
            </button>
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-gray-400">
              <FolderPlus className="h-9 w-9 text-gray-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Bạn chưa có bộ sưu tập nào
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Bắt đầu tạo bộ sưu tập đầu tiên (ví dụ: &quot;Anime cày đêm&quot;, &quot;Phim kinh dị đỉnh cao&quot;) và thêm các phim yêu thích vào danh sách.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateCollectionModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-netflix-red px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bộ sưu tập đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {collections.map((col) => {
              const previewPosters = (col.movies || []).slice(0, 4);
              return (
                <div
                  key={col.id}
                  className="group relative rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/25 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between"
                >
                  <Link href={`/collection/${col.id}`} className="block p-4 pb-2">
                    {/* KHỐI ẢNH BÌA MOSAIC 4 POSTER HOẶC 1 POSTER */}
                    <div className="relative aspect-[16/9] w-full rounded-xl bg-zinc-900 overflow-hidden border border-white/10 mb-3.5">
                      {previewPosters.length >= 4 ? (
                        <div className="grid grid-cols-2 h-full w-full gap-0.5">
                          {previewPosters.map((m, idx) => (
                            <div key={idx} className="relative h-full w-full bg-zinc-800 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.poster || "/default-poster.jpg"}
                                alt={m.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          ))}
                        </div>
                      ) : previewPosters.length > 0 ? (
                        <div className="relative h-full w-full bg-zinc-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewPosters[0].poster || "/default-poster.jpg"}
                            alt={col.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <Film className="w-8 h-8 mb-1 opacity-50" />
                          <span className="text-[11px]">Chưa có phim</span>
                        </div>
                      )}

                      {/* BADGE CÔNG KHAI / RIÊNG TƯ */}
                      <div className="absolute top-2.5 left-2.5">
                        {col.isPublic ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold backdrop-blur-md shadow-md">
                            <Globe className="w-3 h-3" /> Công khai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900/90 border border-white/20 text-gray-300 text-[10px] font-bold backdrop-blur-md shadow-md">
                            <Lock className="w-3 h-3" /> Riêng tư
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-white font-bold text-base truncate group-hover:text-netflix-red transition-colors">
                      {col.name}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                      {col.description || `${col.movies?.length || 0} bộ phim được chọn lọc`}
                    </p>
                    <div className="text-[11px] text-rose-300 font-semibold mt-2">
                      {col.movies?.length || 0} bộ phim
                    </div>
                  </Link>

                  {/* CÁC NÚT TÁC VỤ DƯỚI CARD */}
                  <div className="p-3 pt-2 border-t border-white/10 flex items-center justify-between gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleShareCollection(col.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5 cursor-pointer"
                      title="Sao chép liên kết chia sẻ"
                    >
                      {copiedId === col.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[11px] text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Chia sẻ</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePrivacy(col)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center gap-1 cursor-pointer"
                      title={col.isPublic ? "Chuyển sang riêng tư" : "Chuyển sang công khai"}
                    >
                      {col.isPublic ? (
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="text-[11px]">
                        {col.isPublic ? "Công khai" : "Riêng tư"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(col)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      title="Xóa bộ sưu tập"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "comments" ? (
        /* TAB 4: LỊCH SỬ BÌNH LUẬN */
        userComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-gray-400">
              <MessageSquare className="h-9 w-9 text-rose-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Bạn chưa viết bình luận nào
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Mỗi đánh giá và nhận xét của bạn giúp cộng đồng Nanaflix tìm được bộ phim hay nhất!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:bg-red-700 shadow-lg"
            >
              Xem phim & Đánh giá ngay
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-400" />
                <span>Tất cả nhận xét & đánh giá ({userComments.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userComments.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-900 hover:border-white/25 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/movies/${c.movieSlug}#comments`}
                        className="text-sm sm:text-base font-bold text-white hover:text-rose-400 transition flex items-center gap-1.5 group"
                      >
                        <span>{c.movieTitle || c.movieSlug}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-rose-400 transition" />
                      </Link>
                      {c.episodeName && (
                        <span className="text-[11px] text-rose-300 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 inline-block mt-1">
                          {c.episodeName}
                        </span>
                      )}
                    </div>

                    {/* STAR RATING */}
                    {c.rating > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{c.rating}/5</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed bg-black/50 p-3 rounded-xl border border-white/5 whitespace-pre-line">
                    {c.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {new Date(c.createdAt).toLocaleString("vi-VN")}
                      </span>
                      {c.likes > 0 && (
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <ThumbsUp className="w-3.5 h-3.5 fill-rose-400" />
                          {c.likes}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={deletingCommentId === c.id}
                      onClick={() => handleDeleteComment(c.id)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/15 px-3 py-1.5 rounded-xl transition text-xs font-bold cursor-pointer disabled:opacity-50 border border-transparent hover:border-red-500/30"
                    >
                      {deletingCommentId === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : null}

      {/* MODAL TẠO BỘ SƯU TẬP MỚI */}
      <CreateCollectionModal
        isOpen={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
      />

      {/* MODAL ĐĂNG NHẬP GOOGLE */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}

export default function MyListPage() {
  return (
    <div className="page-cinema-container min-h-screen flex flex-col justify-between pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <div>
        <Suspense fallback={<div className="h-16 bg-black" />}>
          <Navbar />
        </Suspense>

        <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center text-gray-400">Đang tải...</div>}>
          <MyListContent />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}
