const PREFIX = "nanaflix_watched_eps_";

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

export const isEpisodeWatched = (
  movieSlug: string,
  episodeSlug: string,
): boolean => {
  if (typeof window === "undefined" || !movieSlug || !episodeSlug) return false;
  const list = getWatchedEpisodes(movieSlug);
  return list.includes(episodeSlug);
};
