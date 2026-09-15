"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  followSeriesSupabase,
  unfollowSeriesSupabase,
  isSeriesFollowedSupabase,
} from "@/services/supabaseService";
import { toast } from "@/components/Toast";

interface FollowSeriesButtonProps {
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string;
  isSeries?: boolean;
}

export function FollowSeriesButton({
  movieSlug,
  movieTitle,
  posterUrl,
}: FollowSeriesButtonProps) {
  const { user } = useAuth();
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Kiểm tra trạng thái đã theo dõi từ Supabase
  useEffect(() => {
    let isMounted = true;
    if (!user?.uid || !movieSlug) {
      setChecking(false);
      return;
    }

    isSeriesFollowedSupabase(user.uid, movieSlug)
      .then((status) => {
        if (isMounted) {
          setIsFollowed(status);
          setChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) setChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid, movieSlug]);

  const handleToggle = async () => {
    if (!user) {
      toast.info("Vui lòng đăng nhập để bật thông báo khi có tập phim mới!");
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    setLoading(true);
    try {
      if (isFollowed) {
        await unfollowSeriesSupabase(user.uid, movieSlug);
        setIsFollowed(false);
        toast.info(`Đã tắt nhận thông báo tập mới cho phim: ${movieTitle}`);
      } else {
        await followSeriesSupabase(user.uid, movieSlug, movieTitle, posterUrl);
        setIsFollowed(true);
        toast.success(`Đã bật theo dõi! Bạn sẽ nhận được thông báo khi có tập mới 🔔`);
      }
    } catch (err) {
      console.warn("Lỗi cập nhật theo dõi phim:", err);
      toast.error("Không thể cập nhật theo dõi lúc này!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || checking}
      title={isFollowed ? "Bỏ theo dõi tập mới" : "Nhận thông báo khi có tập mới"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 flex-shrink-0 disabled:opacity-50 ${
        isFollowed
          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
          : "bg-zinc-900/80 text-gray-300 border-white/15 hover:bg-white/10 hover:text-white"
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
      ) : isFollowed ? (
        <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0 fill-amber-400/30" />
      ) : (
        <Bell className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      )}
      <span className="hidden sm:inline">
        {isFollowed ? "Đang theo dõi" : "Theo dõi tập mới"}
      </span>
    </button>
  );
}

export default FollowSeriesButton;
