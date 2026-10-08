"use client";

import React, { useState, useEffect } from "react";
import { Server, AlertCircle, RefreshCw, ArrowLeft, Play } from "lucide-react";

export interface IframePlayerProps {
  src: string;
  title: string;
  serverName: string;
  onFallbackToNanaflix?: () => void;
  posterUrl?: string;
}

export const IframePlayer: React.FC<IframePlayerProps> = ({
  src,
  title,
  serverName,
  onFallbackToNanaflix,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  // Timeout guard: if iframe doesn't load within 12s, show error/retry banner
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [isLoading, key, src]);

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
      {/* 1. TOP STATUS BADGE */}
      <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold text-gray-200 shadow-lg">
          <Server className="w-3 h-3 text-red-500" />
          <span>{serverName}</span>
        </div>
      </div>

      {/* 2. LOADING STATE SKELETON */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-full border-2 border-red-600/30 border-t-red-600 animate-spin" />
            <Play className="w-4 h-4 text-white/80 absolute fill-white/80" />
          </div>
          <p className="text-sm font-medium text-gray-300">
            Đang tải luồng phát từ <span className="text-white font-bold">{serverName}</span>...
          </p>
          <p className="text-xs text-gray-500 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {/* 3. ERROR FALLBACK STATE */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/95 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-800/50 flex items-center justify-center text-red-400 mb-3 shadow-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">
            Không thể tải luồng phát từ {serverName}
          </h4>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-4">
            Máy chủ bên thứ ba có thể đang bảo trì hoặc tạm thời từ chối kết nối.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
            {onFallbackToNanaflix && (
              <button
                onClick={onFallbackToNanaflix}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition shadow-lg shadow-red-950/50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Server Nanaflix</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. ACTUAL IFRAME (Only mounted when active) */}
      {!hasError && src && (
        <iframe
          key={key}
          src={src}
          title={`${title} - ${serverName}`}
          className="w-full h-full border-0 relative z-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
};

export default IframePlayer;
