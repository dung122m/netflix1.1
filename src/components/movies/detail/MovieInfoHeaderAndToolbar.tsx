import { Calendar, BellRing } from "lucide-react";
import { ShareButton } from "@/components/ui/ShareButton";
import { WatchlistButton } from "@/components/movies/WatchlistButton";
import { AddToCollectionButton } from "@/components/Collections/AddToCollectionButton";
import { ActiveEpisodeBadge } from "@/components/movies/ActiveEpisodeBadge";
import { TrailerModal } from "@/components/modals/TrailerModal";

interface MovieInfoHeaderAndToolbarProps {
  movieSlug: string;
  title: string;
  originName?: string;
  activeEpisodeName?: string;
  isTrailerOnly: boolean;
  quality?: string;
  year?: number | string;
  cleanDuration: string;
  lang?: string;
  tmdbScore?: number;
  tmdbVotesText: string;
  imdbScore?: number;
  imdbVotesText: string;
  isChieuRap: boolean;
  isCompleted: boolean;
  viewCount?: number;
  effectiveTrailerUrl: string;
  bestImagePoster: string;
  primaryCategoryName?: string;
  isSeries: boolean;
  hasProgress: boolean;
  currentEpNum: number;
  totalEpNum: number;
  progressPercent: number;
  showtimes?: string;
  notify?: string;
}

export function MovieInfoHeaderAndToolbar({
  movieSlug,
  title,
  originName,
  activeEpisodeName,
  isTrailerOnly,
  quality,
  year,
  cleanDuration,
  lang,
  tmdbScore,
  tmdbVotesText,
  imdbScore,
  imdbVotesText,
  isChieuRap,
  isCompleted,
  viewCount,
  effectiveTrailerUrl,
  bestImagePoster,
  primaryCategoryName,
  isSeries,
  hasProgress,
  currentEpNum,
  totalEpNum,
  progressPercent,
  showtimes,
  notify,
}: MovieInfoHeaderAndToolbarProps) {
  const movieActionPayload = {
    slug: movieSlug,
    title,
    poster: bestImagePoster,
    year,
    quality,
    category: primaryCategoryName,
    itemType: (isSeries ? "series" : "movie") as "series" | "movie",
    seriesSlug: movieSlug,
    seriesTitle: title,
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pt-3 pb-6 border-b border-white/[0.08]">
      {/* TIÊU ĐỀ PHIM & HUY HIỆU TẬP (RENDER TỨC THÌ 0MS, CHUẨN NETFLIX) */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            {title}
          </h1>
          <ActiveEpisodeBadge
            initialEpisodeName={activeEpisodeName}
            isTrailerOnly={isTrailerOnly}
          />
        </div>

        {originName &&
          originName.trim().toLowerCase() !== title.trim().toLowerCase() && (
            <p className="text-xs sm:text-sm text-zinc-400 font-medium italic">
              {originName}
            </p>
          )}
      </div>

      {/* THÔNG TIN PHIM TINH GỌN (METADATA CHIPS) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-medium">
        <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-extrabold text-white uppercase tracking-wider">
          {quality || "HD"}
        </span>
        {year && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-200 font-semibold tabular-nums">
            {year}
          </span>
        )}
        {cleanDuration && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 tabular-nums">
            {cleanDuration}
          </span>
        )}
        {lang && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
            {lang}
          </span>
        )}
        {tmdbScore && tmdbScore > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400 tabular-nums">
            <span className="text-[10px] font-extrabold tracking-tight">TMDB</span>
            <span>{tmdbScore.toFixed(1)}</span>
            {tmdbVotesText && (
              <span className="text-emerald-400/70 text-[10px] font-normal">({tmdbVotesText})</span>
            )}
          </span>
        ) : null}
        {imdbScore && imdbScore > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400 tabular-nums">
            <span className="text-[10px] font-extrabold tracking-tight">IMDb</span>
            <span>{imdbScore.toFixed(1)}</span>
            {imdbVotesText && (
              <span className="text-amber-400/70 text-[10px] font-normal">({imdbVotesText})</span>
            )}
          </span>
        ) : null}
        {isChieuRap && (
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
            Chiếu Rạp
          </span>
        )}
        {isCompleted && (
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
            Trọn bộ
          </span>
        )}
        {viewCount !== undefined && viewCount > 500 && (
          <span className="text-zinc-400 text-[11px] ml-auto sm:ml-0 font-normal tabular-nums">
            {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} lượt xem
          </span>
        )}
      </div>

      {/* THANH NÚT TÁC VỤ (ACTION TOOLBAR) - CO GIÃN THÔNG MINH, KHÔNG TRÀN CẮT CHỮ */}
      <div className="mt-3 sm:mt-4 pt-3 border-t border-white/[0.08] w-full min-w-0">
        <div
          className={`grid ${effectiveTrailerUrl ? "grid-cols-2 min-[400px]:grid-cols-4" : "grid-cols-3"} gap-2 sm:flex sm:items-center sm:gap-2 w-full min-w-0`}
        >
          {/* Nút Xem Trailer (Dạng nút phụ tinh tế, không lấn át giao diện xem phim chính) */}
          {effectiveTrailerUrl && (
            <TrailerModal
              trailerUrl={effectiveTrailerUrl}
              title={title}
              triggerClassName="w-full sm:w-auto min-h-[40px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/80 text-zinc-200 hover:bg-white/10 hover:text-white border border-white/[0.08] px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-sm font-medium shadow-sm transition-all active:scale-95 cursor-pointer flex-shrink-0 whitespace-nowrap"
            />
          )}

          {/* Divider desktop */}
          <div className="h-6 w-px bg-white/10 mx-0.5 flex-shrink-0 hidden sm:block" />

          {/* Nút Danh sách yêu thích */}
          <WatchlistButton
            movie={movieActionPayload}
            label={isSeries ? "Lưu trọn bộ" : undefined}
            mobileLabel="Lưu"
            className="w-full sm:w-auto min-h-[40px] sm:min-h-[38px] justify-center rounded-xl"
          />

          {/* Nút Thêm vào Bộ sưu tập */}
          <AddToCollectionButton
            movie={movieActionPayload}
            label={isSeries ? "Bộ sưu tập trọn bộ" : undefined}
            mobileLabel="Sưu tập"
            className="w-full sm:w-auto min-h-[40px] sm:min-h-[38px] justify-center rounded-xl"
          />

          {/* Divider đẩy cụm chia sẻ sang phải trên desktop */}
          <div className="h-6 w-px bg-white/10 mx-0.5 flex-shrink-0 ml-auto hidden sm:block" />

          {/* Cụm tiện ích: Chia sẻ */}
          <ShareButton
            title={title}
            className="w-full sm:w-auto min-h-[40px] sm:min-h-[38px] justify-center rounded-xl"
          />
        </div>
      </div>

      {/* TIẾN ĐỘ PHÁT SÓNG (DÀNH CHO PHIM BỘ) */}
      {hasProgress && (
        <div className="mt-3 rounded-2xl bg-zinc-900/60 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="text-zinc-300 font-medium">
              {isCompleted ? "Trọn bộ phát hành:" : "Tiến độ phát sóng:"}
            </span>
            <span className="text-white font-bold">
              {currentEpNum} / {totalEpNum} tập{" "}
              {isCompleted ? "(Hoàn tất)" : `(${progressPercent}%)`}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-netflix-red h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* LỊCH CHIẾU & THÔNG BÁO TỪ BIÊN TẬP VIÊN */}
      {(showtimes || notify) && (
        <div className="mt-3 space-y-2">
          {showtimes && (
            <div className="flex items-center gap-2.5 rounded-xl bg-sky-950/30 px-3.5 py-2 text-xs sm:text-sm text-sky-200">
              <Calendar className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>
                <strong className="text-sky-300">Lịch phát sóng:</strong>{" "}
                {showtimes}
              </span>
            </div>
          )}
          {notify && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-950/30 px-3.5 py-2 text-xs sm:text-sm text-amber-200">
              <BellRing className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong className="text-amber-300">Thông báo:</strong>{" "}
                {notify}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

