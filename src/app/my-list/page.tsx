"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Bookmark,
  Trash2,
  Clock,
  FolderHeart,
  Plus,
  MessageSquare,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/modals/AuthModal";
import { Footer } from "@/components/layout/Footer";
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
import { clearAllWatchlistFromCloud } from "@/lib/cloudSync";
import {
  subscribeUserCollections,
  deleteCollection,
  toggleCollectionPrivacy,
} from "@/services/collectionService";
import { MovieCollection } from "@/types/collection";
import { CreateCollectionModal } from "@/components/Collections/CreateCollectionModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { useUserMovieComments } from "@/hooks/useUserMovieComments";
import { MyListCloudBanner } from "@/components/my-list/MyListCloudBanner";
import { MyListWatchlistTab } from "@/components/my-list/MyListWatchlistTab";
import { MyListHistoryTab } from "@/components/my-list/MyListHistoryTab";
import { MyListCollectionsTab } from "@/components/my-list/MyListCollectionsTab";
import { MyListCommentsTab } from "@/components/my-list/MyListCommentsTab";
import { MyListActorsTab } from "@/components/my-list/MyListActorsTab";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getFavoriteActors,
  removeFavoriteActor,
  clearFavoriteActors,
  FavoriteActorItem,
} from "@/lib/favoriteActors";

type MyListTab = "watchlist" | "history" | "collections" | "comments" | "actors";

const HISTORY_PAGE_SIZE = 24;
const EMPTY_COLLECTIONS: MovieCollection[] = [];

function MyListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: MyListTab =
    tabParam === "history"
      ? "history"
      : tabParam === "collections"
      ? "collections"
      : tabParam === "comments"
      ? "comments"
      : tabParam === "actors"
      ? "actors"
      : "watchlist";

  const [activeTab, setActiveTab] = useState<MyListTab>(initialTab);

  // Đồng bộ activeTab khi URL thay đổi hoặc điều hướng trực tiếp bằng query ?tab=...
  useEffect(() => {
    if (tabParam && ["watchlist", "history", "collections", "comments", "actors"].includes(tabParam)) {
      setActiveTab(tabParam as MyListTab);
    }
  }, [tabParam]);

  const handleTabChange = (tab: MyListTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [favoriteActors, setFavoriteActors] = useState<FavoriteActorItem[]>([]);
  const [rawCollections, setRawCollections] = useState<MovieCollection[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState<number>(HISTORY_PAGE_SIZE);

  const { user, loading, isSyncing, syncNow } = useAuth();
  const collections = user?.uid ? rawCollections : EMPTY_COLLECTIONS;

  const {
    userComments,
    moviePosterMap,
    deletingCommentId,
    handleDeleteComment,
  } = useUserMovieComments({
    userId: user?.uid,
    watchlist,
    history,
  });

  // Reset phân trang lịch sử xem khi chuyển tab hoặc đổi tài khoản
  useEffect(() => {
    setVisibleHistoryCount(HISTORY_PAGE_SIZE);
  }, [user?.uid, activeTab]);

  useEffect(() => {
    setWatchlist(getWatchlist());
    setHistory(getWatchHistory());
    setFavoriteActors(getFavoriteActors());
    setMounted(true);
    autoHydrateWatchHistory();
    autoHydrateWatchlist();

    const handleWatchlistSync = () => {
      setWatchlist(getWatchlist());
    };
    const handleHistorySync = () => {
      setHistory(getWatchHistory());
    };
    const handleActorsSync = () => {
      setFavoriteActors(getFavoriteActors());
    };

    window.addEventListener("watchlist-updated", handleWatchlistSync);
    window.addEventListener("watch-history-updated", handleHistorySync);
    window.addEventListener("favorite-actors-updated", handleActorsSync);

    return () => {
      window.removeEventListener("watchlist-updated", handleWatchlistSync);
      window.removeEventListener("watch-history-updated", handleHistorySync);
      window.removeEventListener("favorite-actors-updated", handleActorsSync);
    };
  }, []);

  // Lắng nghe bộ sưu tập cá nhân theo thời gian thực khi đăng nhập
  // P0 Fix: Chỉ quyết định trạng thái bộ sưu tập khi Auth đã khôi phục hoàn tất (loading === false)
  useEffect(() => {
    if (loading || !user?.uid) {
      return;
    }

    const unsub = subscribeUserCollections(user.uid, (items) => {
      setRawCollections(items);
    });

    return () => unsub();
  }, [user?.uid, loading]);

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

  const handleRemoveFavoriteActor = useCallback(
    (e: React.MouseEvent, idOrSlug: string | number, name: string) => {
      e.preventDefault();
      e.stopPropagation();
      removeFavoriteActor(idOrSlug);
      toast.info(`Đã bỏ "${name}" khỏi danh sách yêu thích.`);
    },
    []
  );

  const handleClearFavoriteActors = async () => {
    const confirmed = await showConfirmDialog({
      title: "Xóa danh sách nghệ sĩ yêu thích",
      message: "Bạn có chắc chắn muốn xoá toàn bộ diễn viên trong danh sách yêu thích?",
      confirmText: "Xóa toàn bộ",
      cancelText: "Giữ lại",
      variant: "danger",
    });

    if (confirmed) {
      clearFavoriteActors();
      setFavoriteActors([]);
      toast.info("Đã dọn sạch danh sách nghệ sĩ yêu thích.");
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
      {/* HEADER & BREADCRUMB DÙNG CHUNG */}
      <PageHeader
        backHref="/"
        backLabel="Trang chủ"
        breadcrumbs={[
          {
            label:
              activeTab === "watchlist"
                ? "Danh sách của tôi"
                : activeTab === "history"
                ? "Lịch sử xem"
                : activeTab === "comments"
                ? "Bình luận & Đánh giá"
                : activeTab === "actors"
                ? "Nghệ sĩ yêu thích"
                : "Bộ sưu tập của tôi",
          },
        ]}
        icon={
          activeTab === "watchlist" ? (
            <Bookmark className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red fill-current" />
          ) : activeTab === "history" ? (
            <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
          ) : activeTab === "comments" ? (
            <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
          ) : activeTab === "actors" ? (
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-rose-500" />
          ) : (
            <FolderHeart className="h-7 w-7 sm:h-8 sm:w-8 text-netflix-red" />
          )
        }
        title={
          activeTab === "watchlist"
            ? "Danh sách của tôi"
            : activeTab === "history"
            ? "Lịch sử xem phim"
            : activeTab === "comments"
            ? "Bình luận & Đánh giá"
            : activeTab === "actors"
            ? "Nghệ sĩ yêu thích"
            : "Bộ sưu tập của tôi"
        }
        subtitle={
          activeTab === "watchlist"
            ? "Các bộ phim bạn đã đánh dấu để xem lại bất cứ khi nào."
            : activeTab === "history"
            ? "Danh sách các bộ phim và tập phim bạn đã xem gần đây."
            : activeTab === "comments"
            ? "Tất cả các nhận xét và đánh giá bạn đã đăng trên Nanaflix."
            : activeTab === "actors"
            ? "Tuyển tập các diễn viên và đạo diễn bạn quan tâm theo dõi."
            : "Các danh sách phim được tuyển chọn theo chủ đề riêng và có thể chia sẻ công khai."
        }
        actions={
          mounted ? (
            <>
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

              {activeTab === "actors" && favoriteActors.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm text-zinc-300 bg-zinc-900/80 px-3 py-1.5 rounded-lg">
                    {favoriteActors.length} nghệ sĩ
                  </span>
                  <button
                    type="button"
                    onClick={handleClearFavoriteActors}
                    aria-label="Xóa tất cả nghệ sĩ đã lưu trong danh sách yêu thích"
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
            </>
          ) : undefined
        }
        className="mb-6 pb-5"
      />

      {/* BANNER ĐỒNG BỘ ĐÁM MÂY (CLOUD SYNC) */}
      <MyListCloudBanner
        user={user}
        isSyncing={isSyncing}
        onSyncNow={syncNow}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* TAB SELECTOR: Segmented Control thiết kế phẳng trượt mượt trên mobile */}
      <SegmentedTabs<MyListTab>
        tabs={[
          {
            id: "watchlist",
            label: "Yêu thích",
            icon: Bookmark,
            iconColor: "text-netflix-red",
            count: mounted ? watchlist.length : 0,
          },
          {
            id: "history",
            label: "Lịch sử xem",
            icon: Clock,
            iconColor: "text-amber-400",
            count: mounted ? history.length : 0,
          },
          {
            id: "collections",
            label: "Bộ sưu tập",
            icon: FolderHeart,
            iconColor: "text-pink-400",
            count: mounted && user ? collections.length : 0,
          },
          {
            id: "comments",
            label: "Bình luận",
            icon: MessageSquare,
            iconColor: "text-netflix-red",
            count: mounted && user ? userComments.length : 0,
          },
          {
            id: "actors",
            label: "Diễn viên",
            icon: Users,
            iconColor: "text-rose-400",
            count: mounted ? favoriteActors.length : 0,
          },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
        className="mb-6"
      />

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
        <MyListWatchlistTab watchlist={watchlist} onRemove={handleRemoveWatchlistItem} />
      ) : activeTab === "history" ? (
        <MyListHistoryTab
          history={history}
          visibleHistoryCount={visibleHistoryCount}
          pageSize={HISTORY_PAGE_SIZE}
          onRemove={(slug) => removeWatchHistoryItem(slug)}
          onLoadMore={() => setVisibleHistoryCount((prev) => prev + HISTORY_PAGE_SIZE)}
        />
      ) : activeTab === "collections" ? (
        <MyListCollectionsTab
          loading={loading}
          hasUser={Boolean(user)}
          collections={collections}
          copiedId={copiedId}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenCreateCollection={() => setShowCreateCollectionModal(true)}
          onShare={handleShareCollection}
          onTogglePrivacy={handleTogglePrivacy}
          onDelete={handleDeleteCollection}
        />
      ) : activeTab === "comments" ? (
        <MyListCommentsTab
          userComments={userComments}
          moviePosterMap={moviePosterMap}
          deletingCommentId={deletingCommentId}
          onDeleteComment={handleDeleteComment}
        />
      ) : activeTab === "actors" ? (
        <MyListActorsTab
          actors={favoriteActors}
          onRemove={handleRemoveFavoriteActor}
        />
      ) : null}

      {/* MODAL TẠO BỘ SƯU TẬP MỚI */}
      <CreateCollectionModal
        isOpen={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
        onSuccess={(newCol) => {
          setRawCollections((prev) => [newCol, ...prev.filter((c) => c.id !== newCol.id)]);
        }}
      />

      {/* MODAL ĐĂNG NHẬP GOOGLE */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}

export default function MyListPage() {
  return (
    <div className="page-cinema-container min-h-dvh flex flex-col justify-between pb-0 lg:pb-0 w-full max-w-full overflow-x-clip">
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
