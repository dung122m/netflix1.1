"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Film, Users, Play, ExternalLink } from "lucide-react";

interface CoStar {
  name: string;
  relationType: string;
  chemistryScore: number;
  collaborationsCount: string;
  sharedMovies: string[];
}

interface UniverseData {
  actorName: string;
  era: string;
  universeTitle: string;
  coStars: CoStar[];
  provider?: string;
}

interface Props {
  actorName: string;
  onSelectActor?: (name: string) => void;
  onCloseModal?: () => void;
}

export const ActorUniverseGraph: React.FC<Props> = ({
  actorName,
  onSelectActor,
  onCloseModal,
}) => {
  const [data, setData] = useState<UniverseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCoStar, setSelectedCoStar] = useState<CoStar | null>(null);

  useEffect(() => {
    if (!actorName) return;
    setLoading(true);
    setSelectedCoStar(null);

    fetch(`/api/actor-universe-graph?name=${encodeURIComponent(actorName)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
          if (resData.coStars && resData.coStars.length > 0) {
            setSelectedCoStar(resData.coStars[0]);
          }
        }
      })
      .catch((err) => console.warn("Lỗi tải Actor Universe Graph:", err))
      .finally(() => setLoading(false));
  }, [actorName]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
          <Sparkles className="w-5 h-5 text-amber-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-xs sm:text-sm font-semibold text-white">
          Đang dựng mạng lưới vũ trụ điện ảnh của {actorName}...
        </p>
        <p className="text-[11px] text-gray-400">
          Phân tích các bạn diễn ăn ý & tác phẩm kinh điển
        </p>
      </div>
    );
  }

  if (!data || !data.coStars || data.coStars.length === 0) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-xs text-gray-400">
          Chưa tìm thấy bạn diễn đặc trưng trong cơ sở dữ liệu.
        </p>
        <Link
          href={`/browse?keyword=${encodeURIComponent(actorName)}`}
          onClick={() => onCloseModal?.()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Tìm tất cả phim của {actorName} 🎬</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* UNIVERSE BADGE */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-none">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white">
              {data.universeTitle}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-amber-200/80 font-medium">
              Thời kỳ: {data.era}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex-none">
          {data.coStars.length} Bạn diễn vàng
        </span>
      </div>

      {/* CO-STARS INTERACTIVE GRID / PILLS */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Chọn bạn diễn để xem các tác phẩm hợp tác kinh điển:</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.coStars.map((cs) => {
            const isSelected = selectedCoStar?.name === cs.name;
            return (
              <button
                key={cs.name}
                type="button"
                onClick={() => setSelectedCoStar(cs)}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-400/80 text-white shadow-lg shadow-amber-950/50 scale-102"
                    : "bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-gray-300 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black truncate">{cs.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {cs.chemistryScore}%
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 truncate">
                  {cs.relationType}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED CO-STAR COLLABORATIONS DETAIL */}
      {selectedCoStar && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-xs sm:text-sm font-black text-amber-300">
                  {data.actorName} ✕ {selectedCoStar.name}
                </h5>
                <span className="text-[10px] text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">
                  {selectedCoStar.collaborationsCount}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Quan hệ màn ảnh: <strong>{selectedCoStar.relationType}</strong>
              </p>
            </div>

            {onSelectActor && (
              <button
                type="button"
                onClick={() => onSelectActor(selectedCoStar.name)}
                className="self-start sm:self-auto text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition cursor-pointer"
              >
                <span>Khám phá {selectedCoStar.name}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* SHARED MOVIES */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Tác phẩm hợp tác tiêu biểu:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedCoStar.sharedMovies.map((movieTitle, idx) => (
                <Link
                  key={idx}
                  href={`/browse?keyword=${encodeURIComponent(movieTitle)}`}
                  onClick={() => onCloseModal?.()}
                  className="p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-white/10 hover:border-amber-400/50 transition flex items-center justify-between gap-2 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-3.5 h-3.5 text-amber-400 flex-none" />
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                      {movieTitle}
                    </span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-white/10 group-hover:bg-netflix-red flex items-center justify-center text-white transition flex-none">
                    <Play className="w-2.5 h-2.5 fill-white ml-0.2" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ActorUniverseGraph);
