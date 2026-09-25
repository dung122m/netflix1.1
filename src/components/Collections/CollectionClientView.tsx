"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  BookmarkPlus,
  Globe,
  Lock,
  Film,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { MediaCard } from "@/components/browse/MediaCard";
import { getPublicCollection } from "@/services/collectionService";
import { MovieCollection } from "@/types/collection";
import { addToWatchlist } from "@/lib/watchlist";
import { toast } from "@/components/Toast";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface CollectionClientViewProps {
  id: string;
  userId?: string | null;
  initialData?: MovieCollection | null;
}

export function CollectionClientView({
  id,
  userId,
  initialData,
}: CollectionClientViewProps) {
  const [collection, setCollection] = useState<MovieCollection | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [copied, setCopied] = useState(false);
  const [isAddingAll, setIsAddingAll] = useState(false);

  useEffect(() => {
    // Nếu chưa có initialData từ server hoặc cần đồng bộ client
    if (!initialData) {
      let isMounted = true;
      setLoading(true);

      getPublicCollection(id, userId)
        .then((data) => {
          if (isMounted) setCollection(data);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [id, userId, initialData]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã sao chép liên kết bộ sưu tập vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveAllToWatchlist = async () => {
    if (!collection || collection.movies.length === 0) return;
    setIsAddingAll(true);

    try {
      let count = 0;
      for (const m of collection.movies) {
        addToWatchlist({
          slug: m.slug,
          title: m.title,
          imageUrl: m.poster,
          genre: m.category,
          year: m.year,
        });
        count++;
      }

      window.dispatchEvent(new Event("watchlist-updated"));
      toast.success(`Đã thêm ${count} bộ phim vào Danh sách xem sau của bạn!`);
    } catch {
      toast.error("Có lỗi khi thêm phim vào danh sách.");
    } finally {
      setIsAddingAll(false);
    }
  };

  return (
    <main className="max-w-[1800px] mx-auto px-4 md:px-8 pt-24 sm:pt-28 pb-16">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2.5 text-xs text-gray-400 mb-4">
        <Link
          href="/"
          className="hover:text-white transition flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/my-list?tab=collections" className="hover:text-white transition">
          Bộ sưu tập
        </Link>
        <span>/</span>
        <span className="text-gray-200 truncate max-w-[200px] sm:max-w-none">
          {collection?.name || "Chi tiết bộ sưu tập"}
        </span>
      </div>

      {loading ? (
        <div className="py-28 flex flex-col items-center justify-center gap-3 text-gray-400 text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-netflix-red" />
          <span>Đang tải bộ sưu tập phim...</span>
        </div>
      ) : !collection ? (
        <div className="py-24 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-gray-500 mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Không tìm thấy bộ sưu tập
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-6">
            Bộ sưu tập này có thể đã bị xóa hoặc người tạo đã chuyển sang chế độ riêng tư.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-bold transition shadow-lg"
          >
            Khám phá phim khác
          </Link>
        </div>
      ) : (
        <>
          {/* HEADER BỘ SƯU TẬP */}
          <div className="relative rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border border-white/15 p-6 sm:p-8 mb-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-netflix-red/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tuyển Tập Phim
                  </span>
                  {collection.isPublic ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                      <Globe className="w-3 h-3" /> Công khai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold">
                      <Lock className="w-3 h-3" /> Riêng tư
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
                  {collection.name}
                </h1>

                {collection.description && (
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    {collection.description}
                  </p>
                )}

                {/* NGƯỜI TẠO & SỐ LƯỢNG PHIM */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-400">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && (collection.userId || userId)) {
                        window.dispatchEvent(
                          new CustomEvent("open-public-profile", {
                            detail: {
                              userId: collection.userId || userId,
                              userName: collection.creatorName,
                              userAvatar: collection.creatorPhoto,
                            },
                          })
                        );
                      }
                    }}
                    title={`Xem trang cá nhân của ${collection.creatorName || "thành viên"}`}
                    className="flex items-center gap-2 hover:text-amber-300 hover:underline transition cursor-pointer"
                  >
                    <UserAvatar
                      src={collection.creatorPhoto || undefined}
                      name={collection.creatorName}
                      seed={collection.userId || collection.creatorName}
                      sizeClassName="w-6 h-6 text-[10px] font-bold"
                      className="ring-1 ring-white/20"
                    />
                    <span className="text-gray-200 hover:text-amber-300 font-semibold">
                      {collection.creatorName}
                    </span>
                  </button>
                  <span>•</span>
                  <span className="text-rose-300 font-bold">
                    {collection.movies?.length || 0} bộ phim
                  </span>
                </div>
              </div>

              {/* CÁC NÚT HÀNH ĐỘNG */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-bold transition cursor-pointer active:scale-95 shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-rose-400" />
                      <span>Chia sẻ link</span>
                    </>
                  )}
                </button>

                {collection.movies?.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAllToWatchlist}
                    disabled={isAddingAll}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer active:scale-95 shadow-lg shadow-rose-950/50 disabled:opacity-50"
                  >
                    {isAddingAll ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BookmarkPlus className="w-4 h-4" />
                    )}
                    <span>Lưu vào DS của tôi</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LƯỚI PHIM TRONG BỘ SƯU TẬP */}
          {collection.movies?.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Film className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-base font-semibold text-white">
                Bộ sưu tập chưa có phim nào
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Hãy bấm vào nút &quot;+ Bộ sưu tập&quot; ở các trang phim để thêm phim vào đây.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-950/40 p-3 sm:p-4 md:p-5 overflow-visible">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {collection.movies.map((item, index) => (
                  <MediaCard
                    key={item.slug}
                    slug={item.slug}
                    title={item.title}
                    imageUrl={item.poster}
                    genre={item.category || ""}
                    year={item.year}
                    quality={item.quality}
                    priority={index < 4}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
