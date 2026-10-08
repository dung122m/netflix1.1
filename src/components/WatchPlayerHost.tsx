"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { CinemaPlayer, CinemaPlayerProps } from "./CinemaPlayer";
import { IframePlayer } from "./IframePlayer";
import { useWatchController } from "./WatchController";

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

  const [localProvider, setLocalProvider] = useState<PlaybackProviderType>("nanaflix");
  const activeProvider = watchContext?.activeProvider ?? localProvider;
  const setActiveProvider = watchContext?.setActiveProvider ?? setLocalProvider;

  const isVsmovSource = Boolean(
    props.embedSrc &&
    (props.embedSrc.includes("vsmov") || props.embedSrc.includes("streamvsmov"))
  );

  const [vsmovUrl, setVsmovUrl] = useState<string | null>(
    isVsmovSource && props.embedSrc ? props.embedSrc : null
  );
  const [vsmovLoading, setVsmovLoading] = useState<boolean>(false);
  const [vsmovError, setVsmovError] = useState<string | null>(null);

  // Fetch VSMOV embed URL when user selects Server VSMOV and not already present
  useEffect(() => {
    if (activeProvider !== "vsmov" || !movieSlug) return;
    if (vsmovUrl && !currentEpSlug) return;

    let isMounted = true;
    setVsmovLoading(true);
    setVsmovError(null);

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
        {activeProvider === "nanaflix" && <CinemaPlayer {...props} />}

        {/* PROVIDER 2: VSMOV EMBED PLAYER */}
        {activeProvider === "vsmov" && (
          <>
            {vsmovLoading && (
              <div className="w-full aspect-video bg-zinc-950 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border border-white/10">
                <div className="w-10 h-10 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-2" />
                <p className="text-xs text-gray-400">Đang đồng bộ liên kết từ VSMOV...</p>
              </div>
            )}
            {vsmovError && !vsmovLoading && (
              <div className="w-full aspect-video bg-zinc-950 rounded-xl sm:rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-white/10">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Chưa tìm thấy tập phim trên Server VSMOV
                </h4>
                <p className="text-xs text-gray-400 max-w-sm mb-4">
                  {vsmovError}
                </p>
                <button
                  onClick={() => setActiveProvider("nanaflix")}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition"
                >
                  Chuyển về Server Nanaflix
                </button>
              </div>
            )}
            {!vsmovLoading && !vsmovError && vsmovUrl && (
              <IframePlayer
                src={vsmovUrl}
                title={title || "Movie"}
                serverName="Server VSMOV"
                posterUrl={posterUrl}
                onFallbackToNanaflix={() => setActiveProvider("nanaflix")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WatchPlayerHost;
