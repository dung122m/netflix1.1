"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Search, Plus, Check, Loader2, Film, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addMovieToCollection } from "@/services/collectionService";
import { CollectionMovieItem } from "@/types/collection";
import { toast } from "@/components/Toast";
import { useBodyScrollLock } from "@/lib/scrollLock";

interface SearchResultItem {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
}

interface AddMovieToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName: string;
  existingMovieSlugs: string[];
  onMovieAdded: (newMovie: CollectionMovieItem) => void;
}

export const AddMovieToCollectionModal: React.FC<AddMovieToCollectionModalProps> = ({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  existingMovieSlugs,
  onMovieAdded,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(() => new Set(existingMovieSlugs));
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Đồng bộ existingMovieSlugs mỗi khi props thay đổi
  useEffect(() => {
    setAddedSlugs(new Set(existingMovieSlugs));
  }, [existingMovieSlugs]);

  // Autofocus input khi mở modal và cleanup tìm kiếm khi đóng
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setSearchTerm("");
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  }, [onClose]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !addingSlug) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, addingSlug, handleClose]);

  // Hàm tìm kiếm có debounce & AbortController
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/search-suggest?keyword=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ (${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data.items)) {
        setResults(data.items);
      } else {
        setResults([]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Hủy tìm kiếm cũ bình thường
      }
      console.warn("Lỗi tìm kiếm phim:", err);
      setSearchError("Không thể tải kết quả tìm kiếm. Vui lòng thử lại!");
      setResults([]);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Xử lý thay đổi ô tìm kiếm với debounce 350ms
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      performSearch(searchTerm);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, performSearch]);

  if (!isOpen || !mounted) return null;

  const handleAddMovie = async (movie: SearchResultItem) => {
    if (!user?.uid) {
      toast.error("Vui lòng đăng nhập để thực hiện thêm phim!");
      return;
    }

    if (addedSlugs.has(movie.slug)) {
      toast.info("Phim này đã có trong bộ sưu tập");
      return;
    }

    setAddingSlug(movie.slug);
    try {
      const moviePayload = {
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster || "/default-poster.jpg",
        year: movie.year,
        quality: movie.quality,
        category: movie.category,
      };

      const success = await addMovieToCollection(user.uid, collectionId, moviePayload);
      if (success) {
        const itemWithTimestamp: CollectionMovieItem = {
          ...moviePayload,
          addedAt: Date.now(),
        };
        setAddedSlugs((prev) => new Set([...prev, movie.slug]));
        onMovieAdded(itemWithTimestamp);
        toast.success(`Đã thêm "${movie.title}" vào bộ sưu tập!`);
      } else {
        toast.error("Không thể thêm phim vào bộ sưu tập. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Lỗi khi thêm phim:", err);
      toast.error("Có lỗi xảy ra khi thêm phim.");
    } finally {
      setAddingSlug(null);
    }
  };

  return createPortal(
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
    >
      <div
        className="relative w-full max-w-lg my-auto bg-zinc-950 border border-white/20 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden transform-gpu will-change-[transform,opacity]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow hiệu ứng */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />

        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleClose}
          disabled={Boolean(addingSlug)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-10 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-netflix-red/20 text-netflix-red flex items-center justify-center border border-netflix-red/30 shadow-md flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">
              Thêm Phim Vào Bộ Sưu Tập
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              Đang thêm vào: <span className="text-rose-300 font-medium">{collectionName}</span>
            </p>
          </div>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative mb-3 flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm theo tên phim (VD: Mai, Dune, Avatar...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/15 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Khu vực danh sách kết quả */}
        <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 scrollbar-none min-h-[220px]">
          {isSearching ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-netflix-red" />
              <span>Đang tìm kiếm phim...</span>
            </div>
          ) : searchError ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs text-gray-300 mb-3">{searchError}</p>
              <button
                type="button"
                onClick={() => performSearch(searchTerm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : searchTerm.trim().length >= 2 && results.length === 0 ? (
            <div className="py-12 text-center text-gray-400 px-4">
              <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Không tìm thấy bộ phim phù hợp</p>
              <p className="text-xs text-gray-400 mt-1">
                Thử tìm với từ khóa khác hoặc viết không dấu
              </p>
            </div>
          ) : results.length > 0 ? (
            results.map((movie) => {
              const isAlreadyAdded = addedSlugs.has(movie.slug);
              const isThisAdding = addingSlug === movie.slug;

              return (
                <div
                  key={movie.slug}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/20 transition gap-3"
                >
                  {/* Poster & Tên phim */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-15 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={movie.poster || "/default-poster.jpg"}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-white truncate" title={movie.title}>
                        {movie.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.year && movie.quality && <span>•</span>}
                        {movie.quality && (
                          <span className="px-1.5 py-0.2 rounded bg-white/10 text-gray-200 text-[10px]">
                            {movie.quality}
                          </span>
                        )}
                        {movie.category && <span>• {movie.category}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex-shrink-0">
                    {isThisAdding ? (
                      <div className="w-8 h-8 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-netflix-red" />
                      </div>
                    ) : isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã có</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddMovie(movie)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-netflix-red hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-rose-950/40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-400 px-4">
              <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-300">
                Nhập tên phim vào thanh tìm kiếm phía trên
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Hàng ngàn bộ phim bom tấn đang sẵn sàng để bạn thêm vào bộ sưu tập
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {results.length > 0 ? `Tìm thấy ${results.length} kết quả` : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddMovieToCollectionModal;
