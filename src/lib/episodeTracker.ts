const PREFIX = "nanaflix_watched_eps_";

export function extractEpisodeNumber(slugOrName?: string | null): number | null {
  if (!slugOrName) return null;
  const str = String(slugOrName).trim();
  // Khử tiền tố tập/ep
  const clean = str.replace(/^(tập|tap|ep)[-_\s]*/i, "").trim();
  const match = clean.match(/(\d+)/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return isNaN(parsed) ? null : parsed;
}

export const getWatchedEpisodes = (movieSlug: string): string[] => {
  if (typeof window === "undefined" || !movieSlug) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${movieSlug}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error("Lỗi đọc tập đã xem:", error);
    return [];
  }
};

export const markEpisodeAsWatched = (
  movieSlug: string,
  episodeSlug: string,
): void => {
  if (typeof window === "undefined" || !movieSlug || !episodeSlug) return;
  try {
    const list = getWatchedEpisodes(movieSlug);
    if (!list.includes(episodeSlug)) {
      const updated = [...list, episodeSlug];
      localStorage.setItem(`${PREFIX}${movieSlug}`, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("watched-episodes-updated", {
          detail: { movieSlug, episodeSlug },
        }),
      );
    }
  } catch (error) {
    console.error("Lỗi đánh dấu tập đã xem:", error);
  }
};

export const unmarkEpisodeAsWatched = (
  movieSlug: string,
  episodeSlug: string,
): void => {
  if (typeof window === "undefined" || !movieSlug || !episodeSlug) return;
  try {
    const list = getWatchedEpisodes(movieSlug);
    const updated = list.filter((s) => s !== episodeSlug);
    localStorage.setItem(`${PREFIX}${movieSlug}`, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("watched-episodes-updated", {
        detail: { movieSlug, episodeSlug },
      }),
    );
  } catch (error) {
    console.error("Lỗi bỏ đánh dấu tập đã xem:", error);
  }
};

export const isEpisodeWatched = (
  movieSlug: string,
  episodeSlug: string,
  episodeName?: string,
): boolean => {
  if (typeof window === "undefined" || !movieSlug || !episodeSlug) return false;
  const list = getWatchedEpisodes(movieSlug);
  if (list.includes(episodeSlug)) return true;

  const targetNum = extractEpisodeNumber(episodeSlug) ?? extractEpisodeNumber(episodeName);

  if (targetNum !== null && list.some((w) => extractEpisodeNumber(w) === targetNum)) {
    return true;
  }

  try {
    const raw = localStorage.getItem("nanaflix_episodes_progress");
    if (raw) {
      const parsed = JSON.parse(raw);
      const movieEps = parsed[movieSlug];
      if (movieEps) {
        const epData = movieEps[episodeSlug];
        if (epData?.isCompleted) return true;
        if (
          epData?.durationSeconds &&
          epData.durationSeconds > 0 &&
          epData.progressSeconds / epData.durationSeconds >= 0.9
        ) {
          return true;
        }

        if (targetNum !== null) {
          for (const key of Object.keys(movieEps)) {
            if (extractEpisodeNumber(key) === targetNum) {
              const data = movieEps[key];
              if (data?.isCompleted) return true;
              if (
                data?.durationSeconds &&
                data.durationSeconds > 0 &&
                data.progressSeconds / data.durationSeconds >= 0.9
              ) {
                return true;
              }
            }
          }
        }
      }
    }
  } catch {}

  return false;
};
