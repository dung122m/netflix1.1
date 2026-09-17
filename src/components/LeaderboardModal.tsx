"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trophy, X, Crown, Flame, Loader2, Sparkles } from "lucide-react";
import { getTopWatchLeaderboard, getWatchLevelInfo } from "@/services/userService";
import { UserProfile } from "@/types/user";

export interface LeaderboardModalProps {
  initialOpen?: boolean;
}

function LeaderboardModalInner({ initialOpen = false }: LeaderboardModalProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-leaderboard-modal", handleOpen);
    return () => window.removeEventListener("open-leaderboard-modal", handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getTopWatchLeaderboard(10).then((data) => {
      setLeaderboard(data);
      setLoading(false);
    });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-5 sm:p-7 shadow-2xl space-y-5 scrollbar-thin"
      >
        {/* Glow hiệu ứng vàng rực rỡ */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* NÚT ĐÓNG */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <span>Bảng Xếp Hạng Top Fan</span>
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
            </h3>
            <p className="text-xs text-gray-400">
              Vinh danh những thành viên cày phim tích cực nhất trên Nanaflix.
            </p>
          </div>
        </div>

        {/* DANH SÁCH BẢNG XẾP HẠNG */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span>Đang tải bảng xếp hạng...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400 space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="font-semibold text-gray-300">Chưa có dữ liệu xếp hạng</p>
            <p className="text-[11px] text-gray-500">Hãy đăng nhập và thưởng thức phim ngay để leo top nhé!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {leaderboard.map((userItem, index) => {
              const watchMins = userItem.watchTimeMinutes || 0;
              const hours = (watchMins / 60).toFixed(1);
              const level = getWatchLevelInfo(watchMins);

              const isTop1 = index === 0;
              const isTop2 = index === 1;
              const isTop3 = index === 2;

              return (
                <div
                  key={userItem.uid || index}
                  onClick={() => {
                    if (typeof window !== "undefined" && userItem.uid) {
                      window.dispatchEvent(
                        new CustomEvent("open-public-profile", {
                          detail: {
                            userId: userItem.uid,
                            userName: userItem.displayName,
                            userAvatar: userItem.customAvatar || userItem.photoURL,
                            badges: userItem.badges,
                          },
                        })
                      );
                    }
                  }}
                  title={`Xem trang cá nhân của ${userItem.displayName}`}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer hover:border-amber-400/50 hover:bg-white/10 active:scale-[0.99] ${
                    isTop1
                      ? "bg-gradient-to-r from-amber-500/20 via-rose-500/10 to-zinc-900 border-amber-500/40 shadow-lg shadow-amber-950/40 scale-[1.01]"
                      : isTop2
                      ? "bg-gradient-to-r from-slate-400/15 via-zinc-900 to-zinc-900 border-slate-400/30"
                      : isTop3
                      ? "bg-gradient-to-r from-amber-700/15 via-zinc-900 to-zinc-900 border-amber-700/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {/* Hạng thứ */}
                  <div className="w-7 text-center font-black text-sm flex-shrink-0">
                    {isTop1 ? (
                      <span className="text-amber-400 text-base">🥇</span>
                    ) : isTop2 ? (
                      <span className="text-slate-300 text-base">🥈</span>
                    ) : isTop3 ? (
                      <span className="text-amber-600 text-base">🥉</span>
                    ) : (
                      <span className="text-gray-400">#{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white uppercase">
                      {(userItem.displayName || "U")[0]}
                    </span>
                    {(userItem.customAvatar || userItem.photoURL) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userItem.customAvatar || userItem.photoURL}
                        alt={userItem.displayName}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>

                  {/* Tên & Cấp độ */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {userItem.displayName}
                      </h4>
                      <span className="text-xs" title={level.levelName}>
                        {level.badgeIcon}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-amber-300/90 font-semibold truncate">
                        {level.levelName}
                      </span>
                    </div>
                  </div>

                  {/* Số giờ cày phim */}
                  <div className="text-right flex-shrink-0">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-xs font-black text-amber-400">
                      <Flame className="w-3 h-3 fill-amber-400" />
                      <span>{hours}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export const LeaderboardModal = React.memo(LeaderboardModalInner);
export default LeaderboardModal;
