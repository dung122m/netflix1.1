"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { GlobalConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { NanaAiStudioModalProps, StudioTab } from "@/components/NanaAiStudioModal";
import type { ActorBioModalProps } from "@/components/ActorBioModal";
import type { UserProfileModalProps } from "@/components/UserProfileModal";
import type { PublicUserProfileModalProps, PublicProfileDetail } from "@/components/PublicUserProfileModal";
import { getVietnamTodayEvent, type VietnamTodayInfo } from "@/lib/vietnamCalendar";

// Dynamic import các modal nặng với ssr: false + loading shell tức thì (0ms perceived delay)
const NanaAiStudioModal = dynamic(
  () => import("@/components/NanaAiStudioModal").then((m) => m.NanaAiStudioModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 pointer-events-none animate-in fade-in duration-100">
        <div className="w-full max-w-3xl h-[88dvh] max-h-[760px] bg-zinc-950/90 rounded-2xl sm:rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl">
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Đang khởi tạo studio...</span>
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
  const [mountStudio, setMountStudio] = useState(false);
  const [mountActorBio, setMountActorBio] = useState(false);
  const [mountUserProfile, setMountUserProfile] = useState(false);
  const [mountPublicProfile, setMountPublicProfile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const mountedActorBioRef = useRef(false);
  const mountedUserProfileRef = useRef(false);
  const mountedPublicProfileRef = useRef(false);

  const [studioProps, setStudioProps] = useState<NanaAiStudioModalProps>({ initialOpen: false });
  const [actorBioProps, setActorBioProps] = useState<ActorBioModalProps>({});
  const [userProfileProps, setUserProfileProps] = useState<UserProfileModalProps>({});
  const [publicProfileProps, setPublicProfileProps] = useState<PublicUserProfileModalProps>({});

  const [mountVietnamToday, setMountVietnamToday] = useState(false);
  const [vietnamTodayOpen, setVietnamTodayOpen] = useState(false);
  const [vietnamTodayTab, setVietnamTodayTab] = useState<"holiday" | "history">("holiday");
  const [todayInfo, setTodayInfo] = useState<VietnamTodayInfo | null>(null);

  useEffect(() => {
    // 1. Nana AI Studio (Studio, Concierge, Mood Matcher, Roulette / Bốc Quẻ)
    const handleStudioTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: StudioTab; prompt?: string; mood?: string; autoSearch?: boolean }>;
      const tab: StudioTab = customEvent.detail?.tab === "roulette" || e.type === "open-ai-roulette" ? "roulette" : "concierge";
      setStudioProps({
        initialOpen: true,
        initialTab: tab,
        initialPrompt: customEvent.detail?.prompt,
        initialMood: customEvent.detail?.mood,
        initialAutoSearch: customEvent.detail?.autoSearch,
      });
      setMountStudio(true);
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
      const customEvent = e as CustomEvent<{ tab?: "holiday" | "history" }>;
      setVietnamTodayTab(customEvent?.detail?.tab || "holiday");
      setTodayInfo(getVietnamTodayEvent());
      setMountVietnamToday(true);
      setVietnamTodayOpen(true);
    };

    window.addEventListener("open-nana-ai-studio", handleStudioTrigger);
    window.addEventListener("open-ai-concierge", handleStudioTrigger);
    window.addEventListener("open-ai-mood-matcher", handleStudioTrigger);
    window.addEventListener("open-ai-roulette", handleStudioTrigger);

    window.addEventListener("open-actor-bio", handleActorBioTrigger);
    window.addEventListener("open-user-profile-modal", handleUserProfileTrigger);
    window.addEventListener("open-user-profile", handleUserProfileTrigger);
    window.addEventListener("open-public-profile", handlePublicProfileTrigger);
    window.addEventListener("open-auth-modal", handleAuthModalTrigger);
    window.addEventListener("open-vietnam-today-modal", handleVietnamTodayTrigger);

    return () => {
      window.removeEventListener("open-nana-ai-studio", handleStudioTrigger);
      window.removeEventListener("open-ai-concierge", handleStudioTrigger);
      window.removeEventListener("open-ai-mood-matcher", handleStudioTrigger);
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
      {mountStudio && <NanaAiStudioModal {...studioProps} />}
      {mountActorBio && <ActorBioModal {...actorBioProps} />}
      {mountUserProfile && <UserProfileModal {...userProfileProps} />}
      {mountPublicProfile && <PublicUserProfileModal {...publicProfileProps} />}
      {mountVietnamToday && todayInfo && (
        <LazyVietnamTodayModal
          isOpen={vietnamTodayOpen}
          onClose={() => setVietnamTodayOpen(false)}
          info={todayInfo}
          initialTab={vietnamTodayTab}
        />
      )}
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
