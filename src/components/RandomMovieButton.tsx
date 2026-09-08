"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dices, Play, Star, X, RotateCw, Sparkles, Film } from "lucide-react";

interface RandomMovieItem {
  slug: string;
  title: string;
  imageUrl: string;
  year?: string | number;
  rating?: string | number;
  genre?: string;
  quality?: string;
  time?: string;
  description?: string;
}

export const RandomMovieButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<RandomMovieItem[]>([]);

  const fetchRandomMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/random-movie");
      const data = await res.json();
      if (Array.isArray(data?.movies) && data.movies.length > 0) {
        setMovies(data.movies);
      } else if (data?.slug) {
        setMovies([
          {
            slug: data.slug,
            title: data.title || "Phim Đề Xuất",
            imageUrl: "/default-poster.jpg",
          },
        ]);
      }
    } catch (error) {
      console.error("Lỗi lấy phim ngẫu nhiên:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    if (movies.length === 0) {
      fetchRandomMovies();
    }
  };

  // Đóng modal bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* NÚT BẤM TRÊN THANH NAVBAR */}
      <button
        type="button"
        onClick={handleOpenModal}
        title="Xem gì hôm nay? (Gợi ý ngẫu nhiên)"
        aria-label="Xem phim ngẫu nhiên"
        className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 text-gray-200 hover:text-white border border-white/15 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm hover:border-netflix-red/50"
      >
        <Dices className="w-3.5 h-3.5 text-netflix-red group-hover:rotate-45 transition-transform duration-300" />
        <span className="hidden xl:inline">Xem gì hôm nay?</span>
      </button>

      {/* MODAL GỢI Ý PHIM NGẪU NHIÊN CHUẨN NETFLIX */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl overflow-hidden border border-white/20 shadow-[0_35px_90px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200"
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600/20 text-netflix-red border border-red-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-base sm:text-lg flex items-center gap-2">
                    Hôm Nay Xem Gì?
                    <span className="text-xs font-normal text-gray-400">
                      (Vòng quay may mắn)
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Đừng mất 30 phút lướt tìm. Dưới đây là 3 gợi ý ngẫu nhiên đặc sắc cho bạn!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRandomMovies}
                  disabled={loading}
                  title="Quay tiếp bộ khác"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-gray-200 hover:text-white border border-white/15 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-netflix-red" : ""}`} />
                  <span className="hidden sm:inline">Quay tiếp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL CONTENT: 3 BỘ PHIM GỢI Ý */}
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] rounded-xl bg-zinc-900 border border-white/10 animate-pulse flex flex-col justify-end p-4 space-y-2"
                    >
                      <div className="h-4 bg-white/20 rounded w-3/4"></div>
                      <div className="h-3 bg-white/10 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : movies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  {movies.map((movie, index) => (
                    <div
                      key={movie.slug || index}
                      className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-white/15 hover:border-white/40 transition-all duration-300 hover:scale-[1.03] shadow-xl flex flex-col justify-between"
                    >
                      {/* POSTER 16:9 HOẶC 3:4 */}
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <Image
                          src={movie.imageUrl}
                          alt={movie.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/50"></div>

                        {/* Rating góc trên */}
                        {movie.rating && movie.rating !== "N/A" && Number(movie.rating) > 0 && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-extrabold text-amber-400 shadow-md">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            <span>{movie.rating}</span>
                          </div>
                        )}

                        <div className="absolute top-2 right-2">
                          <span className="bg-netflix-red text-white text-[9.5px] font-bold px-2 py-0.5 rounded uppercase">
                            {index === 0 ? "Gợi ý #1" : index === 1 ? "Gợi ý #2" : "Gợi ý #3"}
                          </span>
                        </div>
                      </div>

                      {/* NỘI DUNG PHIM */}
                      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="text-white font-extrabold text-sm sm:text-base line-clamp-1 group-hover:text-netflix-red transition-colors">
                            {movie.title}
                          </h4>

                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 font-medium">
                            {movie.year && <span>{movie.year}</span>}
                            {movie.time && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[90px]">{movie.time}</span>
                              </>
                            )}
                            {movie.quality && (
                              <span className="border border-white/20 px-1 py-0.2 rounded text-[9.5px]">
                                {movie.quality}
                              </span>
                            )}
                          </div>

                          {movie.description && (
                            <p className="text-xs text-gray-300 line-clamp-2 mt-2 leading-relaxed opacity-90">
                              {movie.description}
                            </p>
                          )}
                        </div>

                        {/* NÚT XEM NGAY */}
                        <Link
                          href={`/movies/${movie.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black hover:bg-gray-200 font-bold text-xs transition-colors shadow-lg active:scale-95 cursor-pointer mt-2"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Xem Phim Này</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <Film className="w-10 h-10 text-gray-500 mx-auto animate-bounce" />
                  <p className="text-sm text-gray-400">Không tải được phim ngẫu nhiên. Vui lòng bấm &quot;Quay tiếp&quot;!</p>
                  <button
                    type="button"
                    onClick={fetchRandomMovies}
                    className="px-4 py-2 rounded-lg bg-netflix-red text-white font-bold text-xs"
                  >
                    Thử Lại
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RandomMovieButton;
