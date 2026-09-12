"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import {
  isFollowingSeries,
  toggleFollowSeries,
  checkAndNotifyNewEpisode,
} from "@/services/notificationService";
import { toast } from "@/components/Toast";

interface FollowSeriesButtonProps {
  movie: {
    slug: string;
    title: string;
    poster?: string;
    imageUrl?: string;
    currentEpisodes?: number;
    latestEpisodeName?: string;
    totalEpisodes?: string;
  };
  variant?: "default" | "player";
  className?: string;
}

export const FollowSeriesButton: React.FC<FollowSeriesButtonProps> = ({
  movie,
  variant = "default",
  className = "",
}) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!user || !movie.slug) {
      setIsFollowing(false);
      return;
    }

    let isMounted = true;
    isFollowingSeries(user.uid, movie.slug).then((status) => {
      if (isMounted) setIsFollowing(status);
    });

    // Nếu người dùng đang theo dõi, kiểm tra ngầm xem phim này có tập mới chưa
    if (movie.currentEpisodes && movie.currentEpisodes > 0 && movie.latestEpisodeName) {
      checkAndNotifyNewEpisode(user.uid, {
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster || movie.imageUrl || "/default-poster.jpg",
        currentEpisodes: movie.currentEpisodes,
        latestEpisodeName: movie.latestEpisodeName,
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [user, movie.slug, movie.currentEpisodes, movie.latestEpisodeName, movie.poster, movie.imageUrl, movie.title]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      const nowFollowing = await toggleFollowSeries(user.uid, {
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster || movie.imageUrl || "/default-poster.jpg",
        currentEpisodeCount: movie.currentEpisodes || 1,
        totalEpisodes: movie.totalEpisodes,
      });

      setIsFollowing(nowFollowing);
      if (nowFollowing) {
        toast.success(`Đã bật chuông theo dõi "${movie.title}". Bạn sẽ nhận thông báo khi có tập mới!`);
      } else {
        toast.info(`Đã tắt theo dõi phim "${movie.title}".`);
      }
    } catch (err) {
      console.warn("Lỗi bật theo dõi phim:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title={isFollowing ? "Bỏ nhận thông báo tập mới" : "Nhận thông báo khi có tập mới"}
        className={`inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ${
          variant === "player"
            ? isFollowing
              ? "px-2.5 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/50 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold"
              : "px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-medium"
            : isFollowing
            ? "px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium bg-rose-600/20 border-rose-500/50 text-rose-300 hover:bg-rose-600/30"
            : "px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium bg-zinc-900/80 hover:bg-zinc-800 text-gray-200 hover:text-white border-white/15"
        } ${className}`}
      >
        {isFollowing ? (
          <>
            <BellRing className={`${variant === "player" ? "w-3.5 h-3.5" : "w-3.5 h-3.5 sm:w-4 sm:h-4"} text-rose-400`} />
            <span className="font-semibold text-rose-300">Đang theo dõi</span>
          </>
        ) : (
          <>
            <Bell className={`${variant === "player" ? "w-3.5 h-3.5" : "w-3.5 h-3.5 sm:w-4 sm:h-4"} text-gray-400`} />
            <span>Theo dõi</span>
          </>
        )}
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        customTitle="Đăng nhập để nhận thông báo tập mới"
      />
    </>
  );
};

export default FollowSeriesButton;
