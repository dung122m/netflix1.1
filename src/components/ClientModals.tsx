"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { GlobalConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ActorBioModalProps } from "@/components/ActorBioModal";
import type { UserProfileModalProps } from "@/components/UserProfileModal";
import type { PublicUserProfileModalProps, PublicProfileDetail } from "@/components/PublicUserProfileModal";
import type { VietnamTodayInfo } from "@/lib/vietnamCalendarCore";

// Dynamic import các modal nặng với ssr: false + loading shell tức thì (0ms perceived delay)
const MovieRouletteModal = dynamic(
  () => import("@/components/MovieRouletteModal").then((m) => m.MovieRouletteModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-100">
        <div className="relative w-full max-w-3xl min-h-[560px] max-h-[92dvh] sm:max-h-[840px] bg-zinc-950 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
          {/* Glow ambient lights */}
          <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl opacity-40" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl opacity-40" />

          {/* Pinned Header Skeleton */}
          <div className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 bg-zinc-900 shrink-0 gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-xl bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="h-3.5 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-2.5 w-48 bg-zinc-800/60 rounded animate-pulse hidden sm:block" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 shrink-0" />
          </div>

          {/* Body Skeleton */}
          <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-rose-600/20 border border-amber-500/30 flex items-center justify-center shadow-lg animate-pulse">
              <div className="w-7 h-7 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
            </div>
            <div className="space-y-1.5 text-center">
              <div className="h-4 w-44 bg-zinc-800 rounded mx-auto animate-pulse" />
              <div className="h-3 w-64 bg-zinc-800/60 rounded mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

const ActorBioModal = dynamic(
  () => import("@/components/ActorBioModal").then((m) => m.ActorBioModal),
  { ssr: false }
);

const UserProfileModal = dynamic(
  () => import("@/components/UserProfileModal").then((m) => m.UserProfileModal),
  { ssr: false }
);

const PublicUserProfileModal = dynamic(
  () => import("@/components/PublicUserProfileModal").then((m) => m.PublicUserProfileModal),
  { ssr: false }
);

const LazyVietnamTodayModal = dynamic(
  () => import("@/components/vietnam-today/VietnamTodayModal").then((m) => m.VietnamTodayModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm pointer-events-none animate-in fade-in duration-100">
        <div className="w-full max-w-2xl h-[520px] bg-zinc-950/90 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Đang mở sự kiện...</span>
          </div>
        </div>
      </div>
    ),
  }
);

const AuthModal = dynamic(
  () => import("@/components/AuthModal").then((m) => m.AuthModal),
  { ssr: false }
);

export const ClientModals = React.memo(function ClientModals() {
  const [mountRoulette, setMountRoulette] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [mountActorBio, setMountActorBio] = useState(false);
  const [mountUserProfile, setMountUserProfile] = useState(false);
  const [mountPublicProfile, setMountPublicProfile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const mountedActorBioRef = useRef(false);
  const mountedUserProfileRef = useRef(false);
  const mountedPublicProfileRef = useRef(false);

  const [actorBioProps, setActorBioProps] = useState<ActorBioModalProps>({});
  const [userProfileProps, setUserProfileProps] = useState<UserProfileModalProps>({});
  const [publicProfileProps, setPublicProfileProps] = useState<PublicUserProfileModalProps>({});

  const [mountVietnamToday, setMountVietnamToday] = useState(false);
  const [vietnamTodayOpen, setVietnamTodayOpen] = useState(false);
  const [vietnamTodayLoading, setVietnamTodayLoading] = useState(false);
  const [vietnamTodayError, setVietnamTodayError] = useState<string | null>(null);
  const [vietnamTodayTab, setVietnamTodayTab] = useState<"holiday" | "history">("holiday");
  const [todayInfo, setTodayInfo] = useState<VietnamTodayInfo | null>(null);

  const vietnamTodayOpenRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const todayInfoRef = useRef<VietnamTodayInfo | null>(null);
  todayInfoRef.current = todayInfo;

  useEffect(() => {
    // 1. Movie Roulette Modal (Bốc Quẻ Phim Độc Lập)
    const handleStudioTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      const isRoulette = e.type === "open-ai-roulette" || customEvent.detail?.tab === "roulette";
      // Giai đoạn 2.1A: Chỉ cho phép mở Bốc Quẻ qua MovieRouletteModal
      if (!isRoulette) {
        return;
      }
      setMountRoulette(true);
      setRouletteOpen(true);
    };

    // 2. Actor Bio Modal
    const handleActorBioTrigger = (e: Event) => {
      if (mountedActorBioRef.current) return;
      mountedActorBioRef.current = true;
      const customEvent = e as CustomEvent<{ name: string }>;
      setActorBioProps({ initialActorName: customEvent.detail?.name });
      setMountActorBio(true);
    };

    // 3. User Profile Modal
    const handleUserProfileTrigger = (e: Event) => {
      if (mountedUserProfileRef.current) return;
      mountedUserProfileRef.current = true;
      const customEvent = e as CustomEvent<{ tab?: "profile" | "player_settings" | "comments" }>;
      setUserProfileProps({ initialOpen: true, initialTab: customEvent.detail?.tab || "profile" });
      setMountUserProfile(true);
    };

    // 4. Public User Profile Modal
    const handlePublicProfileTrigger = (e: Event) => {
      if (mountedPublicProfileRef.current) return;
      mountedPublicProfileRef.current = true;
      const customEvent = e as CustomEvent<PublicProfileDetail>;
      setPublicProfileProps({ initialDetail: customEvent.detail });
      setMountPublicProfile(true);
    };

    // 5. Auth Modal (guest login prompt từ BottomNav và các component khác)
    const handleAuthModalTrigger = () => {
      setShowAuthModal(true);
    };

    // 6. Vietnam Today Modal (Hôm nay tại Việt Nam & Ngày này trong lịch sử)
    const handleVietnamTodayTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: "holiday" | "history"; eventId?: string }>;
      const targetId = customEvent?.detail?.eventId;
      const requestedTab = customEvent?.detail?.tab || "holiday";

      const requestId = ++loadRequestIdRef.current;
      vietnamTodayOpenRef.current = true;
      setVietnamTodayTab(requestedTab);
      setMountVietnamToday(true);
      setVietnamTodayOpen(true);
      setVietnamTodayError(null);

      // Nếu đã có sẵn dữ liệu và không yêu cầu targetId khác, giữ nguyên
      if (todayInfoRef.current && (!targetId || todayInfoRef.current.event?.id === targetId)) {
        return;
      }

      setVietnamTodayLoading(true);
      import("@/lib/vietnamTodayLoader")
        .then(({ loadVietnamTodayModalData }) => loadVietnamTodayModalData(targetId))
        .then((info) => {
          // Ngăn tải trùng hoặc cập nhật state sau khi giao diện đã đóng
          if (loadRequestIdRef.current === requestId && vietnamTodayOpenRef.current) {
            setTodayInfo(info);
            setVietnamTodayLoading(false);
          }
        })
        .catch((err) => {
          if (loadRequestIdRef.current === requestId && vietnamTodayOpenRef.current) {
            setVietnamTodayError(err?.message || "Không thể tải dữ liệu lịch sử.");
            setVietnamTodayLoading(false);
          }
        });
    };

    window.addEventListener("open-nana-ai-studio", handleStudioTrigger);
    window.addEventListener("open-ai-roulette", handleStudioTrigger);

    window.addEventListener("open-actor-bio", handleActorBioTrigger);
    window.addEventListener("open-user-profile-modal", handleUserProfileTrigger);
    window.addEventListener("open-user-profile", handleUserProfileTrigger);
    window.addEventListener("open-public-profile", handlePublicProfileTrigger);
    window.addEventListener("open-auth-modal", handleAuthModalTrigger);
    window.addEventListener("open-vietnam-today-modal", handleVietnamTodayTrigger);

    return () => {
      window.removeEventListener("open-nana-ai-studio", handleStudioTrigger);
      window.removeEventListener("open-ai-roulette", handleStudioTrigger);

      window.removeEventListener("open-actor-bio", handleActorBioTrigger);
      window.removeEventListener("open-user-profile-modal", handleUserProfileTrigger);
      window.removeEventListener("open-user-profile", handleUserProfileTrigger);
      window.removeEventListener("open-public-profile", handlePublicProfileTrigger);
      window.removeEventListener("open-auth-modal", handleAuthModalTrigger);
      window.removeEventListener("open-vietnam-today-modal", handleVietnamTodayTrigger);
    };
  }, []);

  return (
    <>
      {mountRoulette && (
        <MovieRouletteModal
          initialOpen={rouletteOpen}
          onClose={() => setRouletteOpen(false)}
        />
      )}
      {mountActorBio && <ActorBioModal {...actorBioProps} />}
      {mountUserProfile && <UserProfileModal {...userProfileProps} />}
      {mountPublicProfile && <PublicUserProfileModal {...publicProfileProps} />}
      {mountVietnamToday && (vietnamTodayLoading && !todayInfo ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm pointer-events-none animate-in fade-in duration-100">
          <div className="w-full max-w-2xl h-[520px] bg-zinc-950/90 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-7 h-7 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">Đang mở sự kiện lịch sử...</span>
            </div>
          </div>
        </div>
      ) : vietnamTodayError && !todayInfo ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md p-6 bg-zinc-950 border border-red-500/30 rounded-2xl flex flex-col items-center text-center gap-3 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-lg">⚠️</div>
            <div className="text-sm font-semibold text-white">Không thể tải dữ liệu lịch sử</div>
            <div className="text-xs text-zinc-400">{vietnamTodayError}</div>
            <button
              type="button"
              onClick={() => {
                vietnamTodayOpenRef.current = false;
                setVietnamTodayOpen(false);
                setVietnamTodayError(null);
              }}
              className="mt-2 px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : todayInfo ? (
        <LazyVietnamTodayModal
          isOpen={vietnamTodayOpen}
          onClose={() => {
            vietnamTodayOpenRef.current = false;
            setVietnamTodayOpen(false);
          }}
          info={todayInfo}
          initialTab={vietnamTodayTab}
        />
      ) : null)}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          customTitle="Bạn chưa đăng nhập"
          customSubtitle="Đăng nhập để sử dụng các tính năng cá nhân."
        />
      )}
      <GlobalConfirmDialog />
    </>
  );
});
