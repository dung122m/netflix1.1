"use client";

import React from "react";
import Link from "next/link";
import {
  FolderHeart,
  FolderPlus,
  LogIn,
  Plus,
  Film,
  Globe,
  Lock,
  Check,
  Share2,
  Trash2,
} from "lucide-react";
import { MovieCollection } from "@/types/collection";
import { toOptimizedCardPosterUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import { useMoviePosterFallback, isPhimimgSourceUrl } from "@/hooks/useMoviePosterFallback";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const baseSrc = toFastCdnImageUrl(toOptimizedCardPosterUrl(poster || "", size) || poster || "/default-poster.jpg");
  const { displaySrc } = useMoviePosterFallback({
    slug,
    title,
    initialSrc: baseSrc,
    enabled: !baseSrc || baseSrc.includes("/default-") || isPhimimgSourceUrl(baseSrc),
    upgradePhimimg: true,
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toFastCdnImageUrl(displaySrc)}
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

interface MyListCollectionsTabProps {
  loading: boolean;
  hasUser: boolean;
  collections: MovieCollection[];
  copiedId: string | null;
  onOpenAuth: () => void;
  onOpenCreateCollection: () => void;
  onShare: (colId: string) => void;
  onTogglePrivacy: (col: MovieCollection) => void;
  onDelete: (col: MovieCollection) => void;
}

export function MyListCollectionsTab({
  loading,
  hasUser,
  collections,
  copiedId,
  onOpenAuth,
  onOpenCreateCollection,
  onShare,
  onTogglePrivacy,
  onDelete,
}: MyListCollectionsTabProps) {
  return (
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
      ) : !hasUser ? (
        <EmptyState
          variant="card"
          icon={<FolderHeart className="h-8 w-8 text-netflix-red" />}
          title="Bộ sưu tập phim cá nhân"
          description="Đăng nhập tài khoản Google để tạo playlist phim theo gu riêng, gom nhóm các tác phẩm yêu thích và chia sẻ liên kết công khai."
          action={
            <button
              type="button"
              onClick={onOpenAuth}
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
          description={'Bắt đầu tạo bộ sưu tập đầu tiên (ví dụ: "Anime cày đêm", "Phim kinh dị đỉnh cao") và thêm các phim yêu thích vào danh sách.'}
          action={
            <button
              type="button"
              onClick={onOpenCreateCollection}
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
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 group-hover/card:ring-2 group-hover/card:ring-netflix-red group-hover/card:ring-inset group-hover/card:shadow-[0_12px_28px_rgba(0,0,0,0.85)] transition-all duration-300">
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
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 rounded-lg m-2 bg-zinc-900/45">
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
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/80 backdrop-blur-md text-amber-300 shadow-sm">
                        {col.movies?.length || 0} phim
                      </span>
                    </div>
                  </div>

                  {/* THÔNG TIN BỘ SƯU TẬP DƯỚI POSTER */}
                  <div className="pt-2 sm:pt-2.5 pb-1 flex flex-col gap-0.5 sm:gap-1">
                    <Link
                      href={`/collection/${col.id}`}
                      className="text-xs sm:text-[13px] md:text-sm font-semibold text-zinc-100 truncate group-hover/card:text-netflix-red transition-colors leading-snug"
                    >
                      {col.name}
                    </Link>

                    {/* Action icons row */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="text-zinc-500 text-[10px] truncate max-w-[50%]">
                        {col.movies?.length || 0} phim
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Tooltip content="Chia sẻ link" side="top">
                          <button
                            type="button"
                            onClick={() => onShare(col.id)}
                            aria-label="Chia sẻ link bộ sưu tập"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          >
                            {copiedId === col.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip content={col.isPublic ? "Chuyển sang riêng tư" : "Chuyển sang công khai"} side="top">
                          <button
                            type="button"
                            onClick={() => onTogglePrivacy(col)}
                            aria-label={col.isPublic ? "Chuyển sang riêng tư" : "Chuyển sang công khai"}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          >
                            {col.isPublic ? (
                              <Globe className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip content="Xóa bộ sưu tập" side="top">
                          <button
                            type="button"
                            onClick={() => onDelete(col)}
                            aria-label="Xóa bộ sưu tập"
                            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

