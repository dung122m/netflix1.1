"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Check, Loader2, Film, AlertCircle, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addMovieToCollection } from "@/services/collectionService";
import { CollectionMovieItem } from "@/types/collection";
import { toast } from "@/components/ui/Toast";
import { toOptimizedCardPosterUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import { BaseModal } from "@/components/ui/BaseModal";

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

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Đồng bộ lại danh sách các slug đã tồn tại khi props thay đổi hoặc modal mở lại
  useEffect(() => {
    if (isOpen) {
      setAddedSlugs(new Set(existingMovieSlugs));
      // Focus vào ô tìm kiếm sau khi modal mở
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm("");
      setResults([]);
      setSearchError(null);
    }
  }, [isOpen, existingMovieSlugs]);

  const handleClose = useCallback(() => {
    if (addingSlug) return;
    onClose();
  }, [addingSlug, onClose]);

  // Hàm gọi API tìm kiếm
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error("Không thể tìm kiếm phim");
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.results || [];

      // Chuẩn hóa danh sách kết quả
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: SearchResultItem[] = items.map((m: any) => ({
        slug: m.slug || "",
        title: m.title || m.name || "Không rõ tiêu đề",
        poster: m.poster || m.poster_url || m.thumb_url || "/default-poster.jpg",
        year: m.year,
        quality: m.quality,
        category: m.category || (Array.isArray(m.categories) ? m.categories.join(", ") : undefined),
      })).filter((m: SearchResultItem) => Boolean(m.slug));

      setResults(formatted);
      if (formatted.length === 0) {
        setSearchError(`Không tìm thấy phim phù hợp với "${trimmed}"`);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("[AddMovieToCollectionModal] Search error:", err);
      setSearchError("Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại!");
    } finally {
      setIsSearching(false);
      if (abortControllerRef.current === abortController) {
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
      console.error("[AddMovieToCollectionModal] Add error:", err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại sau!");
    } finally {
      setAddingSlug(null);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title="Thêm Phim Vào Bộ Sưu Tập"
      subtitle={
        <span>
          Đang thêm vào: <strong className="text-rose-300 font-semibold">{collectionName}</strong>
        </span>
      }
      icon={<Film className="w-5 h-5 text-netflix-red" />}
      bodyClassName="p-4 sm:p-6 space-y-3"
    >
      {/* Thanh tìm kiếm */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm theo tên phim (VD: Mai, Dune, Avatar...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-9 py-2.5 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Khu vực danh sách kết quả */}
      <div className="overflow-y-auto space-y-2 py-1 pr-1 scrollbar-none min-h-[220px] max-h-[50vh]">
        {isSearching ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2.5 text-zinc-400">
            <Loader2 className="w-7 h-7 animate-spin text-netflix-red" />
            <span className="text-xs">Đang tìm phim...</span>
          </div>
        ) : searchError ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 mb-3">
              <AlertCircle className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-300 max-w-[280px]">
              {searchError}
            </p>
            <button
              type="button"
              onClick={() => performSearch(searchTerm)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : !searchTerm.trim() ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-300">
              Nhập tên phim để tìm kiếm
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
              Hệ thống sẽ gợi ý danh sách phim phù hợp từ cơ sở dữ liệu để bạn thêm vào tuyển tập
            </p>
          </div>
        ) : results.length > 0 ? (
          results.map((item) => {
            const isAdded = addedSlugs.has(item.slug);
            const isProcessing = addingSlug === item.slug;

            return (
              <div
                key={item.slug}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 transition gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-15 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toFastCdnImageUrl(toOptimizedCardPosterUrl(item.poster, 192) || "/default-poster.jpg")}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                      {item.year && <span>{item.year}</span>}
                      {item.quality && (
                        <>
                          <span>•</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded font-semibold text-zinc-300">
                            {item.quality}
                          </span>
                        </>
                      )}
                      {item.category && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">{item.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isAdded ? (
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã có</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAddMovie(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-black/40 cursor-pointer active:scale-95"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang thêm...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : null}
      </div>

      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </BaseModal>
  );
};

export default AddMovieToCollectionModal;
