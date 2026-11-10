"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { CinemaPlayerProps } from "@/components/cinema/CinemaPlayer";
import { useWatchController } from "@/components/cinema/WatchController";

// Pre-warm CinemaPlayer chunk ngay khi module được nạp trên client, loại bỏ hoàn toàn độ trễ của dynamic import waterfall
if (typeof window !== "undefined") {
  import("./CinemaPlayer").catch(() => {});
}

// Tải CinemaPlayer (3.200+ dòng & thư viện hls.js ~150KB gzip) bất đồng bộ phía Client
// Giúp giảm First Load JS trên trang xem phim, giải phóng Main Thread và loại bỏ Total Blocking Time (TBT)
const CinemaPlayer = dynamic<CinemaPlayerProps>(
  () => import("./CinemaPlayer").then((m) => m.CinemaPlayer),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-white/[0.04]"
        aria-label="Đang tải trình phát phim"
        role="status"
      >
        {/* Lớp nền xung điện nhẹ khớp 100% tỷ lệ khung hình aspect-video */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-black to-zinc-950 animate-pulse" />

        {/* Vòng quay chỉ báo tải phim chuẩn nhận diện Nanaflix */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/10 border-t-netflix-red animate-spin" />
          <span className="text-xs text-zinc-400 font-medium tracking-wide">
            Đang tải trình phát phim...
          </span>
        </div>
      </div>
    ),
  }
);

export type PlaybackProviderType = "nanaflix";

export interface WatchPlayerHostProps extends CinemaPlayerProps {
  tmdbId?: string | number | null;
  isSeries?: boolean;
}

export const WatchPlayerHost: React.FC<WatchPlayerHostProps> = (props) => {
  const {
    movieSlug,
    activeEpisodeSlug,
  } = props;

  const watchContext = useWatchController();
  const currentEpSlug = watchContext?.activeEpisodeSlug || activeEpisodeSlug;
  const currentServerIdx = watchContext?.currentServerIndex ?? 0;
  const currentActiveEp = watchContext?.activeEpisode;

  // Lấy stream liên kết động trực tiếp từ server và tập hiện tại trong watchContext
  const dynamicEmbedSrc = currentActiveEp?.link_embed || props.embedSrc;
  const dynamicM3u8Link = typeof currentActiveEp?.link_m3u8 === "string"
    ? currentActiveEp.link_m3u8
    : props.m3u8Link;
  const dynamicVideoLink = dynamicM3u8Link || dynamicEmbedSrc || props.videoLink;
  const dynamicEpisodeName = currentActiveEp?.name || props.activeEpisodeName;
  const streamType = Boolean(dynamicM3u8Link) ? "hls" : "embed";

  return (
    <div className="w-full">
      <CinemaPlayer
        key={`cinema_${movieSlug}_s${currentServerIdx}_${currentEpSlug}_${streamType}`}
        {...props}
        activeEpisodeSlug={currentEpSlug}
        activeEpisodeName={dynamicEpisodeName}
        embedSrc={dynamicEmbedSrc}
        videoLink={dynamicVideoLink}
        m3u8Link={dynamicM3u8Link}
      />
    </div>
  );
};

export default WatchPlayerHost;
