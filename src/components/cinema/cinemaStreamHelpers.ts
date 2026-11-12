import { decodeStreamUrl } from "@/lib/streamCrypto";
import { findEpisodeMatch } from "@/lib/formatEpisode";

/** Ngưỡng buffer phía trước tối thiểu để kích hoạt video.play() ban đầu (Batch 1: 0.5s thay vì 1.2s để tối ưu TTFF) */
export const INITIAL_BUFFER_START_SECONDS = 0.5;

/** Bộ nhớ đệm văn bản playlist m3u8 tránh fetch trùng lặp trên trình duyệt */
export const m3u8ManifestCache = new Map<string, string>();

export interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

export function resolveActiveEpisode(
  episodes: EpisodeItem[],
  contextEpisode: EpisodeItem | null | undefined,
  activeEpisodeSlug?: string,
): EpisodeItem | undefined {
  return (
    contextEpisode ||
    episodes.find((e) => e.slug === activeEpisodeSlug) ||
    findEpisodeMatch(episodes, activeEpisodeSlug) ||
    episodes[0]
  );
}

export function resolveEpisodeStreams(params: {
  activeEpisode?: EpisodeItem;
  propActiveEpisodeSlug?: string;
  activeEpisodeSlug?: string;
  propM3u8Link?: string;
  propEmbedSrc?: string;
  propVideoLink?: string;
}): { m3u8Link?: string; embedSrc?: string; videoLink?: string } {
  const {
    activeEpisode,
    propActiveEpisodeSlug,
    activeEpisodeSlug,
    propM3u8Link,
    propEmbedSrc,
    propVideoLink,
  } = params;

  const isPropMatchingActive =
    !propActiveEpisodeSlug || activeEpisodeSlug === propActiveEpisodeSlug;
  const epRecord = activeEpisode as Record<string, string | undefined> | undefined;
  const rawEpM3u8 =
    typeof activeEpisode?.link_m3u8 === "string"
      ? activeEpisode.link_m3u8
      : epRecord?.m3u8 || epRecord?.file;

  const m3u8Link =
    rawEpM3u8 !== undefined
      ? rawEpM3u8
      : isPropMatchingActive
      ? propM3u8Link
      : undefined;

  const rawEpEmbed =
    typeof activeEpisode?.link_embed === "string"
      ? activeEpisode.link_embed
      : undefined;
  const embedSrc =
    rawEpEmbed !== undefined
      ? rawEpEmbed
      : isPropMatchingActive
      ? propEmbedSrc
      : undefined;

  const videoLink =
    m3u8Link ||
    embedSrc ||
    (isPropMatchingActive ? propVideoLink : undefined);

  return { m3u8Link, embedSrc, videoLink };
}

export function resolveAdjacentEpisode(
  rawEpisode: EpisodeItem | null | undefined,
  episodes: EpisodeItem[],
  activeEpisodeSlug: string | undefined,
  activeEpisodeItemSlug: string | undefined,
  offset: -1 | 1,
): EpisodeItem | null {
  if (rawEpisode) return rawEpisode;
  if (!episodes || episodes.length <= 1 || !activeEpisodeSlug) return null;
  const currentSlug = activeEpisodeItemSlug || activeEpisodeSlug;
  const idx = episodes.findIndex((e) => e.slug === currentSlug);
  const targetIdx = idx + offset;
  if (idx >= 0 && targetIdx >= 0 && targetIdx < episodes.length) {
    return episodes[targetIdx];
  }
  return null;
}

export function extractYoutubeEmbedSrc(trailerUrl?: string | null): string | null {
  if (!trailerUrl) return null;
  const match = trailerUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
  );
  return match
    ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&mute=0&controls=1&rel=0`
    : null;
}

export function resolveTrailerEmbedSrc(
  videoLink?: string,
  trailerUrl?: string | null,
): string | null {
  if (videoLink || !trailerUrl) return null;
  return extractYoutubeEmbedSrc(trailerUrl);
}

export function resolveCinemaM3u8(
  m3u8Link?: string,
  embedSrc?: string,
  videoLink?: string,
): string {
  const rawM3u8 = decodeStreamUrl(m3u8Link || "");
  const rawEmbed = decodeStreamUrl(embedSrc || "");
  const rawVideo = decodeStreamUrl(videoLink || "");

  if (
    rawM3u8 &&
    rawM3u8.trim() &&
    (rawM3u8.includes(".m3u8") || !rawM3u8.includes("<iframe"))
  ) {
    return rawM3u8.trim();
  }
  const src = rawEmbed || rawVideo;
  if (src) {
    try {
      const parsed = new URL(src, "https://dummy.com");
      const u =
        parsed.searchParams.get("url") ||
        parsed.searchParams.get("link") ||
        parsed.searchParams.get("src") ||
        parsed.searchParams.get("file");
      if (u && (u.includes(".m3u8") || u.includes("/hls/"))) {
        return decodeURIComponent(u.trim());
      }
    } catch {}

    const match = src.match(/https?(?::%2F%2F|:\/\/)[^&\s"']+\.m3u8[^&\s"']*/i);
    if (match) {
      try {
        return decodeURIComponent(match[0]);
      } catch {
        return match[0];
      }
    }
  }
  return rawM3u8 || "";
}

export function resolveActiveIframeSrc(params: {
  videoLink?: string;
  embedSrc?: string;
  trailerEmbedSrc: string | null;
  targetProgress: number;
  resolvedM3u8: string;
}): string {
  const { videoLink, embedSrc, trailerEmbedSrc, targetProgress, resolvedM3u8 } =
    params;
  const rawEmbed = decodeStreamUrl(embedSrc || "");
  const rawVideo = decodeStreamUrl(videoLink || "");
  let src = rawVideo ? rawEmbed : trailerEmbedSrc;
  if (
    src &&
    (src.includes("embed1.streamc.xyz") ||
      src.includes("embed.streamc.xyz") ||
      src.includes("streamc.xyz")) &&
    resolvedM3u8
  ) {
    src = `https://player.phimapi.com/player/?url=${encodeURIComponent(resolvedM3u8)}`;
  }
  if (!src) return "";
  if (!src.includes("autoplay=")) {
    src += (src.includes("?") ? "&" : "?") + "autoplay=1";
  }
  if (targetProgress > 0 && !src.includes("t=") && !src.includes("time=")) {
    src += `&t=${Math.floor(targetProgress)}`;
  }
  return src;
}

export function isCinemaEmbedBroken(embedSrc?: string): boolean {
  const rawEmbedStr = decodeStreamUrl(embedSrc || "");
  return Boolean(
    !rawEmbedStr ||
      rawEmbedStr.includes("streamc") ||
      rawEmbedStr.includes("vsmov") ||
      rawEmbedStr.includes("phimapi.com"),
  );
}

export function getBufferAhead(v: HTMLVideoElement | null): number {
  if (!v || !v.buffered || v.buffered.length === 0) return 0;
  const ct = v.currentTime;
  for (let i = 0; i < v.buffered.length; i++) {
    const start = v.buffered.start(i);
    const end = v.buffered.end(i);
    if (ct >= start - 0.5 && ct <= end + 0.1) {
      return Math.max(0, end - ct);
    }
  }
  return 0;
}

