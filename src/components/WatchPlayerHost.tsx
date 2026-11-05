"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlertCircle } from "lucide-react";
import type { CinemaPlayerProps } from "./CinemaPlayer";
import { IframePlayer } from "./IframePlayer";
import { useWatchController } from "./WatchController";

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

export type PlaybackProviderType = "nanaflix" | "vsmov";

export interface WatchPlayerHostProps extends CinemaPlayerProps {
  tmdbId?: string | number | null;
  isSeries?: boolean;
}

export const WatchPlayerHost: React.FC<WatchPlayerHostProps> = (props) => {
  const {
    movieSlug,
    title,
    activeEpisodeSlug,
    posterUrl,
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

  const isVsmovSource = Boolean(
    (props.embedSrc && (props.embedSrc.includes("vsmov") || props.embedSrc.includes("streamvsmov"))) ||
    (props.videoLink && (props.videoLink.includes("vsmov") || props.videoLink.includes("streamvsmov"))) ||
    watchContext?.isVsmovOnly
  );
  const hasNanaflixSource = watchContext?.hasNanaflixSource ?? !isVsmovSource;

  const [localProvider, setLocalProvider] = useState<PlaybackProviderType>(
    isVsmovSource ? "vsmov" : "nanaflix"
  );
  const activeProvider = watchContext?.activeProvider ?? localProvider;
  const setActiveProvider = watchContext?.setActiveProvider ?? setLocalProvider;

  const initialVsmovUrl =
    (isVsmovSource && props.embedSrc) || (isVsmovSource && props.videoLink)
      ? props.embedSrc || props.videoLink || null
      : null;

  const [vsmovUrl, setVsmovUrl] = useState<string | null>(initialVsmovUrl);
  const [vsmovLoading, setVsmovLoading] = useState<boolean>(false);
  const [vsmovError, setVsmovError] = useState<string | null>(null);
  const lastFetchedKeyRef = React.useRef<string | null>(null);

  // Fetch VSMOV embed URL when user selects Server VSMOV and not already present
  useEffect(() => {
    if (activeProvider !== "vsmov" || !movieSlug) return;
    const fetchKey = `${movieSlug}_${currentEpSlug || "full"}`;
    if (vsmovUrl && lastFetchedKeyRef.current === fetchKey) return;

    let isMounted = true;
    setVsmovLoading(true);
    setVsmovError(null);
    lastFetchedKeyRef.current = fetchKey;

    const epParam = currentEpSlug ? `&ep=${encodeURIComponent(currentEpSlug)}` : "";
    fetch(`/api/movies/vsmov-embed?slug=${encodeURIComponent(movieSlug)}${epParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.embedUrl) {
          setVsmovUrl(data.embedUrl);
        } else if (!vsmovUrl) {
          setVsmovError(data.error || "Không tìm thấy luồng phát trên VSMOV");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (!vsmovUrl) {
          setVsmovError(err.message || "Lỗi kết nối máy chủ VSMOV");
        }
      })
      .finally(() => {
        if (isMounted) setVsmovLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProvider, movieSlug, currentEpSlug, vsmovUrl]);

  return (
    <div className="w-full">
      {/* 2. DYNAMIC ACTIVE PLAYER CONTAINER */}
      <div className="w-full">
        {/* PROVIDER 1: NANAFLIX CINEMA PLAYER */}
        {activeProvider === "nanaflix" && (
          <CinemaPlayer
            key={`cinema_${movieSlug}_srv_${currentServerIdx}`}
            {...props}
            activeEpisodeSlug={currentEpSlug}
            activeEpisodeName={dynamicEpisodeName}
            embedSrc={dynamicEmbedSrc}
            videoLink={dynamicVideoLink}
            m3u8Link={dynamicM3u8Link}
          />
        )}

        {/* PROVIDER 2: VSMOV EMBED PLAYER */}
        {activeProvider === "vsmov" && (
          <>
            {vsmovLoading && (
              <div className="w-full aspect-video bg-zinc-950 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-t-red-600 rounded-full animate-spin mb-2" />
                <p className="text-xs text-zinc-400">Đang đồng bộ liên kết từ VSMOV...</p>
              </div>
            )}
            {vsmovError && !vsmovLoading && (
              <div className="w-full aspect-video bg-zinc-950 rounded-xl sm:rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Chưa tìm thấy tập phim trên Server VSMOV
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mb-4">
                  {vsmovError}
                </p>
                {hasNanaflixSource && (
                  <button
                    onClick={() => setActiveProvider("nanaflix")}
                    className="px-4 py-1.5 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Chuyển về Server Nanaflix
                  </button>
                )}
              </div>
            )}
            {!vsmovLoading && !vsmovError && vsmovUrl && (
              <IframePlayer
                key={`vsmov_${movieSlug}_${currentEpSlug || "full"}_${vsmovUrl}`}
                src={vsmovUrl}
                title={title || "Movie"}
                serverName="Máy chủ VSMOV"
                posterUrl={posterUrl}
                onFallbackToNanaflix={hasNanaflixSource ? () => setActiveProvider("nanaflix") : undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WatchPlayerHost;
