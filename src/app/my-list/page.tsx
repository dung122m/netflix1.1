"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Bookmark,
  Film,
  Trash2,
  ArrowLeft,
  Clock,
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
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Footer } from "@/components/Footer";
import { MediaCard } from "@/components/browse/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getWatchlist,
  autoHydrateWatchlist,
  removeFromWatchlist,
  WatchlistItem,
} from "@/lib/watchlist";
import {
  getWatchHistory,
  removeWatchHistoryItem,
  clearWatchHistory,
  autoHydrateWatchHistory,
  WatchHistoryItem,
} from "@/lib/watchHistory";
import { toOptimizedCardPosterUrl } from "@/lib/movieMedia";
import { clearAllWatchlistFromCloud } from "@/lib/cloudSync";
import {
  subscribeUserCollections,
  deleteCollection,
  toggleCollectionPrivacy,
  getSmartCollectionsList,
} from "@/services/collectionService";
import { subscribeUserComments, deleteMovieComment } from "@/services/commentService";
import { MovieCollection } from "@/types/collection";
import { MovieComment } from "@/types/comment";
import { CreateCollectionModal } from "@/components/Collections/CreateCollectionModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/Toast";

import { useMoviePosterFallback } from "@/hooks/useMoviePosterFallback";

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d trước`;
  return `${Math.floor(diffDays / 30)} tháng trước`;
}

function formatCommentDate(timestamp: number | string): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} • ${hours}:${minutes}`;
}

function CollectionMosaicPoster({
  poster,
  title,
  slug,
  size = 192,
}: {
  poster?: string;
  title?: string;
  slug?: string;
  size?: number;
}) {
  const baseSrc = toOptimizedCardPosterUrl(poster || "", size) || poster || "/default-poster.jpg";
  const { displaySrc } = useMoviePosterFallback({
    slug,
    title,
    initialSrc: baseSrc,
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={title || "Poster"}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (target && !target.src.includes("/default-poster.jpg")) {
          target.src = "/default-poster.jpg";
        }
      }}
    />
  );
}

function HistoryCardItem({
  item,
  onRemove,
}: {
  item: WatchHistoryItem;
  onRemove: (slug: string) => void;
}) {
  const progressPercent =
    item.progressSeconds && item.durationSeconds && item.durationSeconds > 0
      ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
      : 0;

  return (
    <MediaCard
      slug={item.slug}
      title={item.title}
      imageUrl={item.poster || item.thumb || ""}
      posterUrl={item.poster}
      thumbUrl={item.thumb}
      year={item.year}
      genre={item.category || ""}
      quality={item.quality}
      country={item.country}
      type_name={item.type}
      episodeSlug={item.episodeSlug}
      episodeName={item.episodeName}
      progressPercent={progressPercent}
      onRemove={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove(item.slug);
      }}
      removeTooltip="Xóa khỏi lịch sử xem"
      updatedTimeAgo={item.updatedAt ? formatTimeAgo(item.updatedAt) : undefined}
    />
  );
}

function MyListContent() {
  const router = useRouter();
  const pathname = usePathname();
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

  // Đồng bộ activeTab khi URL thay đổi hoặc điều hướng trực tiếp bằng query ?tab=...
  useEffect(() => {
    if (tabParam && ["watchlist", "history", "collections", "comments"].includes(tabParam)) {
      setActiveTab(tabParam as "watchlist" | "history" | "collections" | "comments");
    }
  }, [tabParam]);

  const handleTabChange = (tab: "watchlist" | "history" | "collections" | "comments") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [userComments, setUserComments] = useState<MovieComment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const HISTORY_PAGE_SIZE = 24;
  const [visibleHistoryCount, setVisibleHistoryCount] = useState<number>(HISTORY_PAGE_SIZE);

  const { user, loading, isSyncing, syncNow } = useAuth();

  // Reset phân trang lịch sử xem khi chuyển tab hoặc đổi tài khoản
  useEffect(() => {
    setVisibleHistoryCount(HISTORY_PAGE_SIZE);
  }, [user?.uid, activeTab]);

  useEffect(() => {
    setWatchlist(getWatchlist());
    setHistory(getWatchHistory());
    setMounted(true);
    autoHydrateWatchHistory();
    autoHydrateWatchlist();

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
  // P0 Fix: Chỉ quyết định trạng thái bộ sưu tập khi Auth đã khôi phục hoàn tất (loading === false)
  useEffect(() => {
    if (loading) {
      // Khi Auth đang khôi phục phiên (loading === true), không được vội vàng reset collections = []
      return;
    }

    if (!user?.uid) {
      setCollections([]);
      return;
    }

    const unsub = subscribeUserCollections(user.uid, (items) => {
      setCollections(items);
    });

    return () => unsub();
  }, [user?.uid, loading]);

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

  const handleDeleteComment = async (commentId: string, movieSlug?: string) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa bình luận",
      message: "Bạn có chắc chắn muốn xóa nhận xét này? Bình luận sẽ bị gỡ vĩnh viễn khỏi bộ phim.",
      confirmText: "Xóa bình luận",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (!confirmed) return;

    // Cập nhật giao diện 0ms tức thì, sẵn sàng khôi phục nếu máy chủ gặp sự cố
    const previous = userComments;
    setUserComments((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingCommentId(commentId);

    try {
      await deleteMovieComment(commentId, { movieSlug, userId: user?.uid });
      toast.success("Đã xóa bình luận thành công!");
    } catch (err: unknown) {
      console.error("Lỗi xóa bình luận:", err);
      setUserComments(previous);
      const msg = err instanceof Error ? err.message : "Không thể xóa bình luận lúc này!";
      toast.error(msg);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleRemoveWatchlistItem = useCallback(
    (e: React.MouseEvent, slug: string, title: string) => {
      e.preventDefault();
      e.stopPropagation();
      removeFromWatchlist(slug);
      toast.info(`Đã xóa "${title}" khỏi danh sách yêu thích.`);
    },
    []
  );

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
      setVisibleHistoryCount(HISTORY_PAGE_SIZE);
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
    <main className="max-w-[1800px] mx-auto px-4 md:px-8 pt-24 sm:pt-28 pb-16 w-full min-w-0 overflow-x-clip">
      {/* HEADER & BREADCRUMB */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 mb-2">
            <Link href="/" className="hover:text-white transition flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-zinc-200">
              {activeTab === "watchlist"
                ? "Danh sách của tôi"
                : activeTab === "history"
                ? "Lịch sử xem"
                : activeTab === "comments"
                ? "Bình luận & Đánh giá"
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
            ) : activeTab === "comments" ? (
              <>
                <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
                Bình luận & Đánh giá
              </>
            ) : (
              <>
                <FolderHeart className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
                Bộ sưu tập của tôi
              </>
            )}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {activeTab === "watchlist"
              ? "Các bộ phim bạn đã đánh dấu để xem lại bất cứ khi nào."
              : activeTab === "history"
              ? "Danh sách các bộ phim và tập phim bạn đã xem gần đây."
              : activeTab === "comments"
              ? "Tất cả các nhận xét và đánh giá bạn đã đăng trên Nanaflix."
              : "Các danh sách phim được tuyển chọn theo chủ đề riêng và có thể chia sẻ công khai."}
          </p>
        </div>

        {/* NÚT TÁC VỤ HEADER */}
        {mounted && (
          <div>
            {activeTab === "watchlist" && watchlist.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm text-zinc-300 bg-zinc-900/80 px-3 py-1.5 rounded-lg">
                  {watchlist.length} phim đã lưu
                </span>
                <button
                  type="button"
                  onClick={handleClearWatchlist}
                  aria-label="Xóa tất cả phim đã lưu trong danh sách yêu thích"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 hover:text-red-400 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-1.5 min-h-[36px] rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Xóa tất cả</span>
                </button>
              </div>
            )}

            {activeTab === "history" && history.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm text-zinc-300 bg-zinc-900/80 px-3 py-1.5 rounded-lg">
                  {history.length} phim đã xem
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  aria-label="Xóa toàn bộ lịch sử xem phim"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 hover:text-red-400 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-1.5 min-h-[36px] rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 text-white text-xs sm:text-sm font-bold shadow-md shadow-black/50 transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo bộ sưu tập</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* BANNER ĐỒNG BỘ ĐÁM MÂY (CLOUD SYNC) */}
      <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {user ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <UserAvatar
              src={user.photoURL || undefined}
              name={user.displayName || user.email}
              seed={user.uid || user.displayName || user.email}
              sizeClassName="w-8 h-8 text-xs font-bold flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="truncate">Đang đồng bộ Google Cloud: {user.displayName || user.email}</span>
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed break-words line-clamp-2 sm:line-clamp-1">
                Danh sách yêu thích, lịch sử xem và các bộ sưu tập được đồng bộ bảo mật tức thì.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-zinc-300 flex-shrink-0">
              <FolderHeart className="w-4 h-4 text-netflix-red" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                Đồng bộ số phút, lịch sử & bộ sưu tập lên Đám mây
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed break-words line-clamp-2 sm:line-clamp-1">
                Đăng nhập tài khoản Google miễn phí để quản lý bộ sưu tập và xem tiếp đúng phút trên mọi thiết bị.
              </p>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 w-full sm:w-auto">
          {user ? (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Link
                href="/profile"
                className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-netflix-red/20 hover:bg-netflix-red/30 text-xs font-bold text-white transition cursor-pointer active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-current flex-shrink-0" />
                <span>Hồ sơ & Cài đặt</span>
              </Link>

              <button
                type="button"
                disabled={isSyncing}
                onClick={syncNow}
                className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ lại"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-xs font-bold text-zinc-950 transition cursor-pointer shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5 text-netflix-red flex-shrink-0" />
              <span>Đăng nhập Google</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB SELECTOR: Segmented Control thiết kế phẳng trượt mượt trên mobile */}
      <div className="w-full min-w-0 max-w-full overflow-x-auto scrollbar-none pb-1 no-scrollbar flex items-center gap-2 mb-6 touch-pan-x">
        <button
          type="button"
          onClick={() => handleTabChange("watchlist")}
          className={`flex-none shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "watchlist"
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
          <span>Yêu thích ({mounted ? watchlist.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("history")}
          className={`flex-none shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "history"
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          <span>Lịch sử xem ({mounted ? history.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("collections")}
          className={`flex-none shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "collections"
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <FolderHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
          <span>Bộ sưu tập ({mounted && user ? collections.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("comments")}
          className={`flex-none shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === "comments"
              ? "bg-netflix-red text-white shadow-md shadow-black/50"
              : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
          <span>Bình luận ({mounted && user ? userComments.length : 0})</span>
        </button>
      </div>

      {/* NỘI DUNG THEO TAB */}
      {!mounted ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video w-full rounded-xl bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : activeTab === "watchlist" ? (
        /* TAB 1: WATCHLIST */
        watchlist.length === 0 ? (
          <EmptyState
            icon={<Film className="h-9 w-9 text-zinc-500" />}
            title="Danh sách của bạn chưa có phim nào"
            description={
              <p>
                Khi lướt phim trên Nanaflix, hãy bấm vào nút dấu cộng (<span className="text-white font-bold">+</span>) trên các bộ phim bạn thích để lưu vào danh sách xem sau.
              </p>
            }
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
              >
                Khám phá phim ngay
              </Link>
            }
          />
        ) : (
          <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent p-3 sm:p-4 md:p-5 overflow-visible">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-6">
              {watchlist.map((item, index) => (
                <MediaCard
                  key={item.slug}
                  slug={item.slug}
                  title={item.title}
                  imageUrl={item.imageUrl}
                  posterUrl={item.poster}
                  genre={item.genre || item.category || ""}
                  year={item.year}
                  quality={item.quality}
                  time={item.time}
                  country={item.country}
                  type_name={item.type_name}
                  itemType={item.itemType}
                  seriesSlug={item.seriesSlug}
                  seriesTitle={item.seriesTitle}
                  episodeSlug={item.episodeSlug}
                  episodeName={item.episodeName}
                  seasonName={item.seasonName}
                  priority={index < 4}
                  onRemove={(e) => handleRemoveWatchlistItem(e, item.slug, item.title)}
                  removeTooltip="Xóa khỏi danh sách yêu thích"
                />
              ))}
            </div>
          </div>
        )
      ) : activeTab === "history" ? (
        /* TAB 2: WATCH HISTORY */
        history.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-9 w-9 text-zinc-500" />}
            title="Chưa có lịch sử xem phim"
            description="Các bộ phim và tập phim bạn thưởng thức sẽ tự động xuất hiện tại đây để bạn có thể dễ dàng xem tiếp bất cứ lúc nào."
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
              >
                Xem phim ngay
              </Link>
            }
          />
        ) : (
          <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent p-3 sm:p-4 md:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {history.slice(0, visibleHistoryCount).map((item, index) => (
                <HistoryCardItem
                  key={`${item.slug}_${item.episodeSlug || ""}_${index}`}
                  item={item}
                  onRemove={(slug) => removeWatchHistoryItem(slug)}
                />
              ))}
            </div>
            {history.length > visibleHistoryCount && (
              <div className="flex justify-center mt-6 sm:mt-8 pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleHistoryCount((prev) => prev + HISTORY_PAGE_SIZE)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>
                    Xem thêm {Math.min(HISTORY_PAGE_SIZE, history.length - visibleHistoryCount)} phim
                  </span>
                </button>
              </div>
            )}
          </div>
        )
      ) : activeTab === "collections" ? (
        /* TAB 3: CUSTOM COLLECTIONS & SMART COLLECTIONS */
        <div className="space-y-10">
          {loading ? (
            /* SKELETON PLACEHOLDER KHI AUTH ĐANG KHÔI PHỤC PHIÊN */
            <div className="space-y-4">
              <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900 animate-pulse" />
                    <div className="h-3.5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-zinc-800/60 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : !user ? (
            <EmptyState
              variant="card"
              icon={<FolderHeart className="h-8 w-8 text-netflix-red" />}
              title="Bộ sưu tập phim cá nhân"
              description="Đăng nhập tài khoản Google để tạo playlist phim theo gu riêng, gom nhóm các tác phẩm yêu thích và chia sẻ liên kết công khai."
              action={
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-netflix-red px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:brightness-110 shadow-lg cursor-pointer active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập ngay</span>
                </button>
              }
            />
          ) : collections.length === 0 ? (
            <EmptyState
              variant="card"
              icon={<FolderPlus className="h-8 w-8 text-zinc-500" />}
              title="Bạn chưa có bộ sưu tập riêng"
              description="Bắt đầu tạo bộ sưu tập đầu tiên (ví dụ: &quot;Anime cày đêm&quot;, &quot;Phim kinh dị đỉnh cao&quot;) và thêm các phim yêu thích vào danh sách."
              action={
                <button
                  type="button"
                  onClick={() => setShowCreateCollectionModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-netflix-red px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:brightness-110 shadow-lg cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo bộ sưu tập đầu tiên</span>
                </button>
              }
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <FolderHeart className="w-4 h-4 text-netflix-red" />
                  <span>Bộ sưu tập của bạn ({collections.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                {collections.map((col) => {
                  const previewPosters = (col.movies || []).slice(0, 4);
                  return (
                    <div
                      key={col.id}
                      className="group/card relative flex flex-col w-full select-none cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 hover:z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none"
                    >
                      {/* KHỐI POSTER DỌC 2:3 CHO BỘ SƯU TẬP (CHUẨN ĐỒNG BỘ TRANG CHỦ) */}
                      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 group-hover/card: group-hover/card:ring-netflix-red group-hover/card:ring-inset group-hover/card:shadow-[0_12px_28px_var(--accent-glow),0_0_16px_rgba(0,0,0,0.8)] transition-all duration-300">
                        <Link
                          href={`/collection/${col.id}`}
                          className="block absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl"
                          aria-label={`Xem bộ sưu tập ${col.name}`}
                        >
                          {previewPosters.length >= 4 ? (
                            <div className="grid grid-cols-2 h-full w-full gap-0.5">
                              {previewPosters.map((m, idx) => (
                                <div key={idx} className="relative h-full w-full bg-zinc-800 overflow-hidden">
                                  <CollectionMosaicPoster
                                    poster={m.poster}
                                    title={m.title}
                                    slug={m.slug}
                                    size={192}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : previewPosters.length > 0 ? (
                            <div className="relative h-full w-full bg-zinc-800">
                              <CollectionMosaicPoster
                                poster={previewPosters[0].poster}
                                title={col.name || previewPosters[0].title}
                                slug={previewPosters[0].slug}
                                size={320}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 border border-dashed rounded-lg m-2 bg-zinc-900/30">
                              <Film className="w-8 h-8 mb-1.5 opacity-40 group-hover/card:opacity-75 group-hover/card:scale-105 transition-all text-zinc-400" />
                              <span className="text-[10px] text-zinc-400 group-hover/card:text-zinc-200 transition-colors text-center px-1">
                                Chưa có phim
                              </span>
                            </div>
                          )}

                          {/* Lớp gradient điện ảnh che phủ */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </Link>

                        {/* BADGE CÔNG KHAI / RIÊNG TƯ (GÓC TRÊN TRÁI) */}
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                          {col.isPublic ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-md">
                              <Globe className="w-2.5 h-2.5" /> Công khai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-900/90 text-zinc-300 backdrop-blur-md shadow-md">
                              <Lock className="w-2.5 h-2.5" /> Riêng tư
                            </span>
                          )}
                        </div>

                        {/* SỐ LƯỢNG PHIM (GÓC DƯỚI PHẢI) */}
                        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-300 shadow-sm">
                            {col.movies?.length || 0} phim
                          </span>
                        </div>
                      </div>

                      {/* THÔNG TIN BỘ SƯU TẬP DƯỚI POSTER */}
                      <div className="pt-2 sm:pt-2.5 pb-1 flex flex-col gap-0.5 sm:gap-1">
                        <Link
                          href={`/collection/${col.id}`}
                          className="text-xs sm:text-[13px] md:text-sm font-semibold text-zinc-100 truncate group-hover/card:text-netflix-red transition-colors leading-snug"
                          title={col.name}
                        >
                          {col.name}
                        </Link>

                        {/* Action icons row */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="text-zinc-500 text-[10px] truncate max-w-[50%]">
                            {col.movies?.length || 0} phim
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleShareCollection(col.id)}
                              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                              title="Chia sẻ link"
                            >
                              {copiedId === col.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePrivacy(col)}
                              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                              title={col.isPublic ? "Chuyển sang riêng tư" : "Chuyển sang công khai"}
                            >
                              {col.isPublic ? (
                                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCollection(col)}
                              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition cursor-pointer"
                              title="Xóa bộ sưu tập"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TUYỂN TẬP THÔNG MINH (SMART COLLECTIONS) */}
          <div className="pt-6 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>✨ Tuyển Tập Đề Xuất (Smart Collections)</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Bộ sưu tập tự động phân loại theo chủ đề hấp dẫn từ kho phim Nanaflix
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {getSmartCollectionsList().map((smart) => (
                <Link
                  key={smart.id}
                  href={`/collection/${smart.id}`}
                  className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-2xl">{smart.emoji}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-netflix-red/20 text-white">
                        {smart.badge}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-sm group-hover:text-netflix-red transition-colors line-clamp-1">
                      {smart.name}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {smart.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>Khám phá danh sách</span>
                    <span className="text-netflix-red group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "comments" ? (
        /* TAB 4: LỊCH SỬ BÌNH LUẬN */
        userComments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-9 w-9 text-netflix-red" />}
            title="Bạn chưa viết bình luận nào"
            description="Mỗi đánh giá và nhận xét của bạn giúp cộng đồng Nanaflix tìm được bộ phim hay nhất!"
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
              >
                Xem phim & Đánh giá ngay
              </Link>
            }
          />
        ) : (
          <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-netflix-red" />
                <span>Tất cả nhận xét & đánh giá ({userComments.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userComments.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 transition space-y-2.5 sm:space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/movies/${c.movieSlug}#comments`}
                        className="text-sm sm:text-base font-bold text-white hover:text-netflix-red hover:underline decoration-netflix-red/40 underline-offset-2 transition-colors inline-flex items-center gap-1.5 group"
                      >
                        <span className="truncate">{c.movieTitle || c.movieSlug}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-netflix-red group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                      {c.episodeName && (
                        <span className="text-[11px] text-white font-semibold bg-netflix-red/20 px-2 py-0.5 rounded-md inline-block mt-1">
                          {c.episodeName}
                        </span>
                      )}
                    </div>

                    {/* STAR RATING */}
                    {c.rating > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{c.rating}/5</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-black/50 p-2.5 sm:p-3 rounded-xl whitespace-pre-line">
                    {c.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center gap-1 text-zinc-400"
                        title={new Date(c.createdAt).toLocaleString("vi-VN")}
                      >
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatCommentDate(c.createdAt)}</span>
                      </span>
                      {c.likes > 0 && (
                        <span className="flex items-center gap-1 text-netflix-red font-bold">
                          <ThumbsUp className="w-3.5 h-3.5 fill-netflix-red text-netflix-red" />
                          {c.likes}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={deletingCommentId === c.id}
                      onClick={() => handleDeleteComment(c.id, c.movieSlug)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/15 px-3 py-1.5 rounded-xl transition text-xs font-bold cursor-pointer disabled:opacity-50 border border-transparent hover:"
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
        onSuccess={(newCol) => {
          setCollections((prev) => [newCol, ...prev.filter((c) => c.id !== newCol.id)]);
        }}
      />

      {/* MODAL ĐĂNG NHẬP GOOGLE */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}

export default function MyListPage() {
  return (
    <div className="page-cinema-container min-h-screen flex flex-col justify-between pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 w-full max-w-full overflow-x-clip">
      <div>
        <Suspense fallback={<div className="h-16 bg-black" />}>
          <Navbar />
        </Suspense>

        <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center text-zinc-400">Đang tải...</div>}>
          <MyListContent />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}
