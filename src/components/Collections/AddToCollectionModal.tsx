"use client";

import React, { useState, useEffect } from "react";
import { X, FolderPlus, Plus, Check, Loader2, Globe, Lock, Film } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserCollections,
  addMovieToCollection,
  removeMovieFromCollection,
} from "@/services/collectionService";
import { MovieCollection } from "@/types/collection";
import { CreateCollectionModal } from "./CreateCollectionModal";
import { toast } from "@/components/Toast";

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
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.uid]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = async (collectionItem: MovieCollection) => {
    if (!user?.uid) return;
    const isAlreadyIn = collectionItem.movies?.some((m) => m.slug === movie.slug);

    setActionLoadingId(collectionItem.id);
    try {
      if (isAlreadyIn) {
        await removeMovieFromCollection(user.uid, collectionItem.id, movie.slug);
        setCollections((prev) =>
          prev.map((col) =>
            col.id === collectionItem.id
              ? {
                  ...col,
                  movies: col.movies.filter((m) => m.slug !== movie.slug),
                }
              : col
          )
        );
        toast.info(`Đã xóa khỏi bộ sưu tập "${collectionItem.name}"`);
      } else {
        await addMovieToCollection(user.uid, collectionItem.id, {
          slug: movie.slug,
          title: movie.title,
          poster: movie.poster,
          year: movie.year,
          quality: movie.quality,
          category: movie.category,
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
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div
          className="relative w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />

          {/* Nút đóng */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Tiêu đề & Thông tin phim */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
            <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={movie.poster || "/default-poster.jpg"}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-netflix-red uppercase tracking-wider">
                Thêm vào bộ sưu tập
              </span>
              <h3 className="text-sm font-bold text-white truncate mt-0.5">
                {movie.title}
              </h3>
              <p className="text-xs text-gray-400">Chọn danh sách để lưu phim</p>
            </div>
          </div>

          {/* Danh sách các bộ sưu tập của user */}
          <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 scrollbar-none min-h-[160px]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-netflix-red" />
                <span>Đang tải danh sách bộ sưu tập...</span>
              </div>
            ) : collections.length === 0 ? (
              <div className="py-8 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-gray-400 mx-auto mb-3">
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-white">
                  Chưa có bộ sưu tập nào
                </p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Tạo bộ sưu tập đầu tiên để gom nhóm các bộ phim bạn yêu thích
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
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
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer group ${
                      isSelected
                        ? "bg-rose-950/20 border-rose-500/40 hover:bg-rose-950/30"
                        : "bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                          isSelected
                            ? "bg-netflix-red text-white"
                            : "bg-zinc-800 text-gray-400 group-hover:text-white"
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
                        <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
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
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã thêm</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-medium transition">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Nút tạo thêm bộ sưu tập */}
          {collections.length > 0 && (
            <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer hover:underline"
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
          )}
        </div>
      </div>

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
