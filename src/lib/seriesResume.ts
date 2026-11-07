import { EpisodeItem } from "@/components/WatchController";
import {
  getWatchHistory,
  getMovieEpisodesProgress,
  EpisodeProgressData,
} from "./watchHistory";
import { getWatchedEpisodes, extractEpisodeNumber } from "./episodeTracker";
import { findEpisodeMatch, getShortEpisodeLabel } from "./formatEpisode";

export type ResumeCaseType =
  | "in_progress"     // Trường hợp A: Có tập đang xem dở
  | "next_episode"    // Trường hợp B: Tập gần nhất đã xem hoàn tất
  | "not_started"     // Trường hợp C: Chưa từng xem
  | "all_completed";  // Trường hợp D: Đã xem hết các tập hiện có

export interface ResolvedResumeEpisode {
  caseType: ResumeCaseType;
  episode: EpisodeItem;
  episodeIndex: number;
  progressSeconds: number;
  durationSeconds?: number;
  progressPercent: number;
  buttonText: string;
  badgeLabel?: string;
  sourceEpisodeName?: string;
  seasonNumber?: number;
}

/**
 * Trợ giúp phân giải thông minh tập cần xem tiếp theo cho phim bộ theo chuẩn Netflix:
 * - Trường hợp A: Ưu tiên tập đang xem dở gần nhất (progress >= 10s và < 90% duration).
 * - Trường hợp B: Nếu tập gần nhất đã hoàn thành (>= 90% duration hoặc đánh dấu đã xem), tự động tìm tập kế tiếp thực sự tồn tại trong danh sách.
 * - Trường hợp C: Nếu chưa từng xem, bắt đầu từ tập đầu tiên có thể phát (episodes[0]).
 * - Trường hợp D: Nếu đã xem hết toàn bộ các tập, giữ ở tập cuối (hoặc cho phép xem lại), không sinh tập lỗi/văng lỗi.
 */
export function resolveNextResumeEpisode(
  movieSlug: string,
  episodes: EpisodeItem[],
  customStorage?: {
    watchHistory?: ReturnType<typeof getWatchHistory>;
    episodesProgress?: ReturnType<typeof getMovieEpisodesProgress>;
    watchedEpisodes?: ReturnType<typeof getWatchedEpisodes>;
  }
): ResolvedResumeEpisode | null {
  if (!movieSlug || !Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }

  const allProgress: Record<string, EpisodeProgressData> =
    customStorage?.episodesProgress ?? getMovieEpisodesProgress(movieSlug);
  const watchedSlugs: string[] =
    customStorage?.watchedEpisodes ?? getWatchedEpisodes(movieSlug);
  const historyList =
    customStorage?.watchHistory ?? getWatchHistory();
  const mainHistoryItem = historyList.find((h) => h.slug === movieSlug);

  // Xây dựng bản đồ trạng thái từng tập trong danh sách episodes hiện hành
  interface EpisodeWatchStatus {
    episode: EpisodeItem;
    index: number;
    progressSeconds: number;
    durationSeconds?: number;
    progressPercent: number;
    updatedAt: number;
    isCompleted: boolean;
    isInProgress: boolean;
  }

  const statusList: EpisodeWatchStatus[] = episodes.map((ep, idx) => {
    const slug = ep.slug;
    const prog = slug ? allProgress[slug] : undefined;

    let pSec = prog?.progressSeconds || 0;
    let dSec = prog?.durationSeconds;
    let uAt = prog?.updatedAt || 0;
    const epNum = extractEpisodeNumber(slug) ?? extractEpisodeNumber(ep.name);
    let isComp = Boolean(
      prog?.isCompleted ||
      (slug && watchedSlugs.includes(slug)) ||
      (epNum !== null && watchedSlugs.some((w) => extractEpisodeNumber(w) === epNum))
    );

    // Fallback/Đồng bộ đối chiếu với mainHistoryItem (dữ liệu cloud hoặc dữ liệu đơn tập cũ)
    if (
      mainHistoryItem?.episodeSlug &&
      slug &&
      (mainHistoryItem.episodeSlug === slug ||
        findEpisodeMatch([ep], mainHistoryItem.episodeSlug)?.slug === slug)
    ) {
      const cloudUpdatedAt = Number(mainHistoryItem.updatedAt) || 0;
      // Nếu dữ liệu Cloud mới hơn dữ liệu local cũ trên thiết bị này, Cloud phải được ưu tiên!
      if (cloudUpdatedAt > uAt || uAt === 0) {
        uAt = cloudUpdatedAt;
        if (mainHistoryItem.progressSeconds !== undefined) {
          pSec = mainHistoryItem.progressSeconds;
        }
        if (mainHistoryItem.durationSeconds !== undefined) {
          dSec = mainHistoryItem.durationSeconds;
        }
      }
    }

    if (dSec && dSec > 0 && pSec / dSec >= 0.9) {
      isComp = true;
    }

    const inProg = !isComp && pSec >= 10 && (!dSec || dSec <= 0 || pSec / dSec < 0.9);
    const pPercent =
      dSec && dSec > 0
        ? Math.min(100, Math.round((pSec / dSec) * 100))
        : inProg
        ? 35
        : 0;

    return {
      episode: ep,
      index: idx,
      progressSeconds: pSec,
      durationSeconds: dSec,
      progressPercent: pPercent,
      updatedAt: uAt,
      isCompleted: isComp,
      isInProgress: inProg,
    };
  });

  // =========================================================================
  // TRƯỜNG HỢP A: CÓ TẬP ĐANG XEM DỞ
  // =========================================================================
  // Lọc tất cả các tập đang xem dở, ưu tiên tập có updatedAt mới nhất (gần nhất)
  const inProgressList = statusList.filter((s) => s.isInProgress);
  if (inProgressList.length > 0) {
    // Sắp xếp theo thời gian cập nhật giảm dần (mới nhất lên đầu)
    inProgressList.sort((a, b) => b.updatedAt - a.updatedAt);
    const target = inProgressList[0];

    const shortLabel = getShortEpisodeLabel(target.episode.name, String(target.index + 1));
    return {
      caseType: "in_progress",
      episode: target.episode,
      episodeIndex: target.index,
      progressSeconds: target.progressSeconds,
      durationSeconds: target.durationSeconds,
      progressPercent: target.progressPercent,
      buttonText: "Tiếp tục xem",
      badgeLabel: `Đang xem dở • ${target.progressPercent}%`,
      sourceEpisodeName: target.episode.name || `Tập ${shortLabel}`,
    };
  }

  // =========================================================================
  // TRƯỜNG HỢP B: TẬP GẦN NHẤT ĐÃ XEM HOÀN TẤT -> TÌM TẬP KẾ TIẾP HỢP LỆ
  // =========================================================================
  const completedList = statusList.filter((s) => s.isCompleted);
  if (completedList.length > 0 && completedList.length < statusList.length) {
    // Tìm tập đã hoàn thành có updatedAt mới nhất hoặc tập có thứ tự cao nhất đã xem
    completedList.sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) {
        return b.updatedAt - a.updatedAt;
      }
      return b.index - a.index;
    });

    const mostRecentCompleted = completedList[0];
    
    // Tìm tập kế tiếp trong mảng episodes chưa hoàn thành, bắt đầu từ ngay sau tập đã xem
    let nextCandidate: EpisodeWatchStatus | null = null;
    for (let i = mostRecentCompleted.index + 1; i < statusList.length; i++) {
      if (!statusList[i].isCompleted) {
        nextCandidate = statusList[i];
        break;
      }
    }

    // Nếu các tập phía sau đều đã hoàn thành nhưng các tập trước đó chưa xem hết (ví dụ người dùng xem nhảy cóc),
    // tìm tập đầu tiên chưa xem trong toàn bộ danh sách
    if (!nextCandidate) {
      nextCandidate = statusList.find((s) => !s.isCompleted) || null;
    }

    if (nextCandidate) {
      const nextShort = getShortEpisodeLabel(nextCandidate.episode.name, String(nextCandidate.index + 1));
      const completedShort = getShortEpisodeLabel(
        mostRecentCompleted.episode.name,
        String(mostRecentCompleted.index + 1)
      );

      return {
        caseType: "next_episode",
        episode: nextCandidate.episode,
        episodeIndex: nextCandidate.index,
        progressSeconds: 0,
        durationSeconds: nextCandidate.durationSeconds,
        progressPercent: 0,
        buttonText: "Xem tập tiếp theo",
        badgeLabel: `Tập tiếp theo (sau Tập ${completedShort})`,
        sourceEpisodeName: nextCandidate.episode.name || `Tập ${nextShort}`,
      };
    }
  }

  // =========================================================================
  // TRƯỜNG HỢP D: ĐÃ XEM HẾT TẤT CẢ CÁC TẬP HIỆN CÓ
  // =========================================================================
  if (completedList.length === statusList.length && statusList.length > 0) {
    const lastEp = statusList[statusList.length - 1];
    return {
      caseType: "all_completed",
      episode: lastEp.episode,
      episodeIndex: lastEp.index,
      progressSeconds: 0,
      durationSeconds: lastEp.durationSeconds,
      progressPercent: 100,
      buttonText: "Xem lại từ đầu",
      badgeLabel: "Đã xem hết trọn bộ",
      sourceEpisodeName: lastEp.episode.name || `Tập ${statusList.length}`,
    };
  }

  // =========================================================================
  // TRƯỜNG HỢP C: CHƯA TỪNG XEM PHIM NÀY
  // =========================================================================
  const firstEp = statusList[0];
  const firstShort = getShortEpisodeLabel(firstEp.episode.name, "1");
  return {
    caseType: "not_started",
    episode: firstEp.episode,
    episodeIndex: 0,
    progressSeconds: 0,
    durationSeconds: firstEp.durationSeconds,
    progressPercent: 0,
    buttonText: "Bắt đầu xem",
    badgeLabel: "Tập đầu tiên",
    sourceEpisodeName: firstEp.episode.name || `Tập ${firstShort}`,
  };
}

