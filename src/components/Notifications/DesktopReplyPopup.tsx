"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MessageSquare, X, ArrowRight, Bell, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserNotifications, markNotificationAsRead } from "@/services/notificationService";
import { UserNotification } from "@/types/notification";

/**
 * Phát âm thanh thông báo nhẹ nhàng chuẩn Facebook bằng Web Audio API
 */
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tông 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Tông 2 (Hài hòa sau 0.1s)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.09); // A5
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.09);
    osc2.stop(ctx.currentTime + 0.4);
  } catch {
    // Trình duyệt có thể chặn autoplay âm thanh trước khi user tương tác
  }
}

export const DesktopReplyPopup: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [activeNotification, setActiveNotification] = useState<UserNotification | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lắng nghe realtime thông báo của user
  useEffect(() => {
    if (!user?.uid) {
      setActiveNotification(null);
      return;
    }

    const unsub = subscribeUserNotifications(user.uid, (notifications) => {
      // Lần đầu tải danh sách thông báo: đánh dấu các thông báo cũ đã thấy để không bắn popup hàng loạt
      if (!initialLoadDoneRef.current) {
        notifications.forEach((n) => seenIdsRef.current.add(n.id));
        initialLoadDoneRef.current = true;
        return;
      }

      // Tìm thông báo chưa đọc mới nhất chưa từng hiện popup
      const newReply = notifications.find(
        (n) => !n.isRead && !seenIdsRef.current.has(n.id) && (n.type === "comment_reply" || n.type === "new_episode")
      );

      if (newReply) {
        seenIdsRef.current.add(newReply.id);
        setActiveNotification(newReply);
        setProgress(100);
        playNotificationChime();
      }
    });

    return () => unsub();
  }, [user?.uid]);

  const handleDismiss = useCallback(() => {
    setActiveNotification(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleClickNotification = useCallback(() => {
    if (!activeNotification || !user) return;
    markNotificationAsRead(user.uid, activeNotification.id);
    if (activeNotification.commentId && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nanaflix-highlight-comment", {
          detail: { commentId: activeNotification.commentId },
        })
      );
    }
    const targetLink =
      activeNotification.link ||
      (activeNotification.movieSlug
        ? activeNotification.commentId
          ? `/movies/${activeNotification.movieSlug}?highlightComment=${activeNotification.commentId}#comment-${activeNotification.commentId}`
          : `/movies/${activeNotification.movieSlug}#comments`
        : "/");
    handleDismiss();
    router.push(targetLink);
  }, [activeNotification, user, handleDismiss, router]);

  // Đếm ngược tự động đóng sau 7 giây (tạm dừng khi hover chuột)
  useEffect(() => {
    if (!activeNotification) return;

    const DURATION = 7000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= 0) {
            handleDismiss();
            return 0;
          }
          return prev - step;
        });
      }
    }, INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeNotification, isPaused, handleDismiss]);

  if (!activeNotification) return null;

  const isReplyType = activeNotification.type === "comment_reply";

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] max-w-[360px] sm:max-w-[390px] w-[calc(100vw-32px)] bg-zinc-950/98 border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-3.5 sm:p-4 animate-in fade-in slide-in-from-bottom-5 zoom-in-95 duration-300 select-none group"
    >
      {/* HEADER: AVATAR, TITLE & CLOSE BUTTON */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar with reply badge */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center font-bold text-white text-sm shrink-0 border border-white/10 shadow-md">
            {activeNotification.replierAvatar || activeNotification.image ? (
              <Image
                src={activeNotification.replierAvatar || activeNotification.image || "/default-poster.jpg"}
                alt={activeNotification.replierName || activeNotification.title}
                fill
                unoptimized
                sizes="40px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              (activeNotification.replierName || activeNotification.title || "U").charAt(0).toUpperCase()
            )}

            {/* Small icon badge at corner */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 border border-zinc-950 flex items-center justify-center text-white">
              {isReplyType ? (
                <MessageSquare className="w-2.5 h-2.5" />
              ) : (
                <Bell className="w-2.5 h-2.5 text-amber-300" />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {isReplyType ? "Phản hồi mới" : "Thông báo mới"}
              </span>
              <span className="text-[10px] text-zinc-500">· Vừa xong</span>
            </div>
            <h5 className="text-xs sm:text-sm font-bold text-white leading-tight truncate mt-0.5">
              {activeNotification.title}
            </h5>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer flex-shrink-0"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* BODY: MESSAGE SNIPPET */}
      <div className="mt-2.5 pl-12 pr-1">
        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed bg-white/5 rounded-xl p-2 border border-white/5">
          &quot;{activeNotification.message}&quot;
        </p>

        {/* ACTION BUTTON */}
        <div className="flex items-center justify-end gap-2 mt-2.5">
          <button
            type="button"
            onClick={handleClickNotification}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-all active:scale-95 cursor-pointer"
          >
            <span>Xem ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PROGRESS BAR TIMER */}
      <div className="absolute bottom-0 inset-x-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
