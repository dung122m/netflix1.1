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
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { MediaCard } from "@/components/sites/netflix-3f78535a/browse-1234abcd/MediaCard";
import { getWatchlist, WatchlistItem } from "@/lib/watchlist";
import {
  getWatchHistory,
  removeWatchHistoryItem,
  clearWatchHistory,
  WatchHistoryItem,
} from "@/lib/watchHistory";
import { sanitizeImageUrl } from "@/lib/movieMedia";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { clearAllWatchlistFromCloud } from "@/lib/cloudSync";
import {
  subscribeUserCollections,
  deleteCollection,
  toggleCollectionPrivacy,
} from "@/services/collectionService";
import { MovieCollection } from "@/types/collection";
import { CreateCollectionModal } from "@/components/Collections/CreateCollectionModal";
import { toast } from "@/components/Toast";

function MyListContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: "watchlist" | "history" | "collections" =
    tabParam === "history"
      ? "history"
      : tabParam === "collections"
      ? "collections"
      : "watchlist";

  const [activeTab, setActiveTab] = useState<"watchlist" | "history" | "collections">(initialTab);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [collections, setCollections] = useState<MovieCollection[]>([]);
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

  const handleClearWatchlist = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xoá toàn bộ phim trong danh sách đã lưu?")) {
      localStorage.removeItem("nanaflix_watchlist_v1");
      setWatchlist([]);
      window.dispatchEvent(new Event("watchlist-updated"));
      if (user) {
        await clearAllWatchlistFromCloud(user.uid);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xoá toàn bộ lịch sử xem phim?")) {
      clearWatchHistory();
      setHistory([]);
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
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ sưu tập "${col.name}"?`)) {
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
            <Link href="/browse" className="hover:text-white transition flex items-center gap-1">
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
            <button
              type="button"
              disabled={isSyncing}
              onClick={syncNow}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ lại"}</span>
            </button>
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

      {/* TAB SELECTOR */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("watchlist")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "watchlist"
              ? "bg-netflix-red text-white shadow-md shadow-red-950/40"
              : "bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Danh sách yêu thích ({mounted ? watchlist.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "history"
              ? "bg-netflix-red text-white shadow-md shadow-red-950/40"
              : "bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Lịch sử đã xem ({mounted ? history.length : 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "collections"
              ? "bg-netflix-red text-white shadow-md shadow-red-950/40"
              : "bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <FolderHeart className="w-4 h-4" />
          <span>Bộ sưu tập ({mounted && user ? collections.length : 0})</span>
        </button>
      </div>

      {/* NỘI DUNG THEO TAB */}
      {!mounted ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video w-full rounded-lg bg-zinc-900/60 animate-pulse border border-white/5"
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
              href="/browse"
              className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:bg-red-700 shadow-lg"
            >
              Khám phá phim ngay
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-3 sm:p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
              {watchlist.map((item) => (
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
              href="/browse"
              className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:bg-red-700 shadow-lg"
            >
              Xem phim ngay
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-3 sm:p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
              {history.map((item) => {
                const href = item.episodeSlug
                  ? `/movies/${item.slug}?ep=${item.episodeSlug}`
                  : `/movies/${item.slug}`;

                return (
                  <div
                    key={item.slug}
                    className="group relative rounded-xl bg-zinc-900 border border-white/10 overflow-hidden hover:border-white/30 transition-all duration-300 hover:scale-[1.02] shadow-lg"
                  >
                    <Link href={href} className="block">
                      <div className="relative aspect-video w-full bg-zinc-800 overflow-hidden">
                        <Image
                          src={sanitizeImageUrl(item.poster || "/default-hero.jpg")}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                        {/* PLAY BUTTON OVERLAY */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
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
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-black/90 backdrop-blur-sm transition z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4">
                        <h3 className="text-white font-semibold text-base truncate group-hover:text-netflix-red transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                          <span className="text-netflix-red font-semibold">
                            {item.episodeName ? `Đang xem: ${formatEpisodeName(item.episodeName)}` : "Đã xem"}
                          </span>
                          {item.quality && (
                            <span className="bg-zinc-800 px-2 py-0.5 rounded text-[11px] text-gray-300">
                              {item.quality}
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
      ) : (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
      )}

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
    <div className="page-cinema-container min-h-screen flex flex-col justify-between">
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
