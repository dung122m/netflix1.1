"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, RefreshCw, Play, Film, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watchHistory";
import { pickBestMoviePoster } from "@/lib/movieMedia";

interface CuratedPlaylist {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

/**
 * Từng hàng tuyển tập AI với nút cuộn mép chuẩn Netflix & cuộn ngang mượt mà
 */
const PlaylistRowItem: React.FC<{ playlist: CuratedPlaylist }> = React.memo(({ playlist }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  }, []);

  useEffect(() => {
    checkScroll();
  }, [playlist.movies, checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-zinc-900/90 via-zinc-950/95 to-black border border-white/10 shadow-2xl overflow-hidden group/row hover:border-white/20 transition-all">
      {/* Subtle ambient gradient overlay */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl" />

      {/* PLAYLIST HEADER */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-3xl">{playlist.emoji}</span>
          <div>
            <h3 className="text-base sm:text-xl font-black text-white group-hover/row:text-rose-300 transition-colors">
              {playlist.name}
            </h3>
            <p className="text-xs text-rose-200/80 font-medium">
              ✨ {playlist.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-semibold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            {playlist.movies.length} tác phẩm
          </span>
        </div>
      </div>

      {/* MOVIES CAROUSEL WITH FLOATING CHEVRONS */}
      <div className="relative z-10">
        {/* NÚT CUỘN TRÁI */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Cuộn sang trái"
            className="hidden sm:flex absolute left-0 top-0 bottom-2 z-30 w-12 md:w-14 bg-gradient-to-r from-black/90 via-black/60 to-transparent hover:from-black text-white items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer rounded-r-2xl group/btn"
          >
            <div className="w-9 h-9 rounded-full bg-black/70 border border-white/20 flex items-center justify-center backdrop-blur-md group-hover/btn:scale-110 group-hover/btn:bg-rose-600/30 group-hover/btn:border-rose-500/50 transition-all shadow-xl">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
          </button>
        )}

        {/* NÚT CUỘN PHẢI */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Cuộn sang phải"
            className="hidden sm:flex absolute right-0 top-0 bottom-2 z-30 w-12 md:w-14 bg-gradient-to-l from-black/90 via-black/60 to-transparent hover:from-black text-white items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer rounded-l-2xl group/btn"
          >
            <div className="w-9 h-9 rounded-full bg-black/70 border border-white/20 flex items-center justify-center backdrop-blur-md group-hover/btn:scale-110 group-hover/btn:bg-rose-600/30 group-hover/btn:border-rose-500/50 transition-all shadow-xl">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
        )}

        {/* HORIZONTAL POSTER ROW */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex items-center gap-3.5 sm:gap-4.5 overflow-x-auto overflow-y-hidden pb-2 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {playlist.movies.map((movie) => {
            const poster = pickBestMoviePoster(movie);
            return (
              <div
                key={movie.slug}
                className="flex-none w-[140px] sm:w-[170px] md:w-[185px] snap-start select-none"
              >
                <Link
                  href={`/movies/${movie.slug}`}
                  className="group/card relative flex flex-col rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-rose-500/60 transition-all duration-300 hover:scale-[1.03] shadow-lg cursor-pointer"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie.name || movie.title}
                        fill
                        className="object-cover group-hover/card:scale-108 transition-transform duration-500"
                        sizes="(max-width: 640px) 140px, (max-width: 768px) 170px, 185px"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Film className="w-8 h-8" />
                      </div>
                    )}

                    {/* Hover play overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-netflix-red flex items-center justify-center text-white shadow-lg shadow-red-950/80 scale-90 group-hover/card:scale-100 transition-transform duration-200">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Quality badge */}
                    {movie.quality && (
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/80 text-amber-300 border border-amber-400/40 backdrop-blur-sm shadow-md">
                        {movie.quality}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover/card:text-rose-300 transition-colors">
                      {movie.name || movie.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="truncate">{movie.origin_name || ""}</span>
                      {movie.year && <span className="flex-none font-semibold text-gray-300">{movie.year}</span>}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

PlaylistRowItem.displayName = "PlaylistRowItem";

export const AiCuratedPlaylistsSection: React.FC = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchCuratedPlaylists = useCallback(async (forceRefresh = false, nextRefreshCount = 0) => {
    // 1. Kiểm tra cache sessionStorage nếu không phải refresh ép buộc
    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("nanaflix_ai_curated_playlists_v4");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlaylists(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    try {
      // Thu thập lịch sử xem phim từ local hoặc user id
      const localHistory: WatchHistoryItem[] = getWatchHistory();
      const historyTitles = localHistory.slice(0, 10).map((h: WatchHistoryItem) => h.title);

      const res = await fetch("/api/ai-curated-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "",
          historyTitles,
          refreshCount: nextRefreshCount,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.playlists) && data.playlists.length > 0) {
        setPlaylists(data.playlists);
        setIsPersonalized(Boolean(data.isPersonalized));
        try {
          sessionStorage.setItem("nanaflix_ai_curated_playlists_v4", JSON.stringify(data.playlists));
        } catch {}
      }
    } catch (err) {
      console.warn("Lỗi tải AI Curated Playlists:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchCuratedPlaylists();
  }, [fetchCuratedPlaylists]);

  const handleRefreshClick = () => {
    const next = refreshCount + 1;
    setRefreshCount(next);
    fetchCuratedPlaylists(true, next);
  };

  if (!loading && playlists.length === 0) return null;

  return (
    <section className="my-8 sm:my-12 space-y-6 sm:space-y-8 select-none">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/50">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Tuyển Tập Độc Quyền Dành Riêng Cho Bạn
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {isPersonalized ? "AI Tuyển chọn" : "Thịnh hành"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Tuyển chọn tự động theo sở thích điện ảnh & các thể loại thịnh hành
            </p>
          </div>
        </div>

        {/* NÚT ĐỔI CHỦ ĐỀ AI */}
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={loading}
          title="Yêu cầu AI phân tích và sáng tạo 3 chủ đề tuyển tập hoàn toàn mới"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600/90 to-purple-600/90 hover:from-rose-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center gap-2 border border-white/20 shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-300" : ""}`} />
          <span>Đổi Chủ Đề AI Khác</span>
        </button>
      </div>

      {/* PLAYLISTS LIST */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2].map((sk) => (
            <div
              key={sk}
              className="p-5 sm:p-6 rounded-3xl bg-zinc-900/60 border border-white/10 animate-pulse space-y-4"
            >
              <div className="h-6 bg-white/10 rounded-lg w-1/3" />
              <div className="h-4 bg-white/5 rounded-lg w-1/2" />
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[2/3] bg-white/10 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {playlists.map((playlist) => (
            <PlaylistRowItem key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </section>
  );
};

export default React.memo(AiCuratedPlaylistsSection);
