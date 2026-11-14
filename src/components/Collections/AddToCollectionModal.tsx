"use client";

import React, { useState, useEffect } from "react";
import { FolderPlus, Plus, Check, Loader2, Globe, Lock, Film } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserCollections,
  addMovieToCollection,
  removeMovieFromCollection,
} from "@/services/collectionService";
import { MovieCollection } from "@/types/collection";
import { CreateCollectionModal } from "./CreateCollectionModal";
import { toast } from "@/components/ui/Toast";
import { toOptimizedCardPosterUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import { BaseModal } from "@/components/ui/BaseModal";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: {
    slug: string;
    title: string;
    poster: string;
    year?: string | number;
    quality?: string;
    category?: string;
    itemType?: "movie" | "series" | "episode";
    seriesSlug?: string;
    seriesTitle?: string;
    episodeSlug?: string;
    episodeName?: string;
    seasonName?: string;
  };
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  movie,
}) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    let isMounted = true;
    setLoading(true);
    getUserCollections(user.uid)
      .then((data) => {
        if (isMounted) setCollections(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Không thể tải danh sách bộ sưu tập.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.uid]);

  const handleToggle = async (collectionItem: MovieCollection) => {
    if (!user?.uid) {
      toast.error("Vui lòng đăng nhập để lưu phim vào bộ sưu tập!");
      return;
    }

    const isAlreadyIn = collectionItem.movies?.some((m) => m.slug === movie.slug);
    setActionLoadingId(collectionItem.id);

    try {
      if (isAlreadyIn) {
        await removeMovieFromCollection(user.uid, collectionItem.id, movie.slug);
        setCollections((prev) =>
          prev.map((col) =>
            col.id === collectionItem.id
              ? { ...col, movies: col.movies.filter((m) => m.slug !== movie.slug) }
              : col
          )
        );
        toast.info(`Đã bỏ "${movie.title}" khỏi "${collectionItem.name}"`);
      } else {
        await addMovieToCollection(user.uid, collectionItem.id, {
          slug: movie.slug,
          title: movie.title,
          poster: movie.poster,
          year: movie.year,
          quality: movie.quality,
          category: movie.category,
          itemType: movie.itemType,
          seriesSlug: movie.seriesSlug,
          seriesTitle: movie.seriesTitle,
          episodeSlug: movie.episodeSlug,
          episodeName: movie.episodeName,
          seasonName: movie.seasonName,
        });
        setCollections((prev) =>
          prev.map((col) =>
            col.id === collectionItem.id
              ? {
                  ...col,
                  movies: [
                    {
                      slug: movie.slug,
                      title: movie.title,
                      poster: movie.poster,
                      year: movie.year,
                      quality: movie.quality,
                      category: movie.category,
                      addedAt: Date.now(),
                      itemType: movie.itemType,
                      seriesSlug: movie.seriesSlug,
                      seriesTitle: movie.seriesTitle,
                      episodeSlug: movie.episodeSlug,
                      episodeName: movie.episodeName,
                      seasonName: movie.seasonName,
                    },
                    ...col.movies,
                  ],
                }
              : col
          )
        );
        toast.success(`Đã thêm vào "${collectionItem.name}"!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        title="Thêm Vào Bộ Sưu Tập"
        subtitle="Chọn danh sách để lưu phim"
        icon={
          <div className="relative w-10 h-13 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toFastCdnImageUrl(toOptimizedCardPosterUrl(movie.poster, 192) || "/default-poster.jpg")}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          </div>
        }
        bodyClassName="p-4 sm:p-5 space-y-2 min-h-[160px] max-h-[50vh] overflow-y-auto"
        footer={
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-netflix-red hover:brightness-110 font-semibold cursor-pointer hover:underline"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Tạo bộ sưu tập mới</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition cursor-pointer"
            >
              Xong
            </button>
          </div>
        }
      >
        <p className="text-xs font-bold text-white truncate mb-2">
          {movie.title}
        </p>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-netflix-red" />
            <span>Đang tải danh sách bộ sưu tập...</span>
          </div>
        ) : collections.length === 0 ? (
          <div className="py-8 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <Film className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              Chưa có bộ sưu tập nào
            </p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Tạo bộ sưu tập đầu tiên để gom nhóm các bộ phim bạn yêu thích
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bộ sưu tập mới</span>
            </button>
          </div>
        ) : (
          collections.map((col) => {
            const isSelected = col.movies?.some((m) => m.slug === movie.slug);
            const isLoadingThis = actionLoadingId === col.id;

            return (
              <div
                key={col.id}
                onClick={() => !isLoadingThis && handleToggle(col)}
                className={`flex items-center justify-between p-3 rounded-2xl transition cursor-pointer group ${
                  isSelected
                    ? "bg-netflix-red/15 hover:bg-netflix-red/25"
                    : "bg-zinc-900/60 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                      isSelected
                        ? "bg-netflix-red text-white"
                        : "bg-zinc-800 text-zinc-400 group-hover:text-white"
                    }`}
                  >
                    {col.isPublic ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-netflix-red transition-colors">
                      {col.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <span>{col.movies?.length || 0} phim</span>
                      <span>•</span>
                      <span>{col.isPublic ? "Công khai" : "Riêng tư"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-3">
                  {isLoadingThis ? (
                    <Loader2 className="w-4 h-4 animate-spin text-netflix-red" />
                  ) : isSelected ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã thêm</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-medium transition">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </BaseModal>

      {/* Modal tạo bộ sưu tập */}
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newCol) => {
          setCollections((prev) => [newCol, ...prev]);
        }}
      />
    </>
  );
};

export default AddToCollectionModal;
