"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { GlobalConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ActorBioModalProps } from "@/components/modals/ActorBioModal";
import type { PublicUserProfileModalProps, PublicProfileDetail } from "@/components/modals/PublicUserProfileModal";

// Dynamic import các modal nặng với ssr: false + loading shell tức thì (0ms perceived delay)
const ActorBioModal = dynamic(
  () => import("@/components/modals/ActorBioModal").then((m) => m.ActorBioModal),
  { ssr: false }
);

const PublicUserProfileModal = dynamic(
  () => import("@/components/modals/PublicUserProfileModal").then((m) => m.PublicUserProfileModal),
  { ssr: false }
);

const AuthModal = dynamic(
  () => import("@/components/modals/AuthModal").then((m) => m.AuthModal),
  { ssr: false }
);

export const ClientModals = React.memo(function ClientModals() {
  const [mountActorBio, setMountActorBio] = useState(false);
  const [mountPublicProfile, setMountPublicProfile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const mountedActorBioRef = useRef(false);
  const mountedPublicProfileRef = useRef(false);

  const [actorBioProps, setActorBioProps] = useState<ActorBioModalProps>({});
  const [publicProfileProps, setPublicProfileProps] = useState<PublicUserProfileModalProps>({});

  useEffect(() => {
    // 1. Actor Bio Modal
    const handleActorBioTrigger = (e: Event) => {
      if (mountedActorBioRef.current) return;
      mountedActorBioRef.current = true;
      const customEvent = e as CustomEvent<{ name: string; avatarUrl?: string; character?: string }>;
      setActorBioProps({
        initialActorName: customEvent.detail?.name,
        initialAvatarUrl: customEvent.detail?.avatarUrl,
        initialCharacter: customEvent.detail?.character,
      });
      setMountActorBio(true);
    };

    // 3. User Profile Navigation (Chuyển sang đường dẫn /profile chuyên biệt thay vì modal)
    const handleUserProfileTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: "profile" | "player_settings" | "comments" }>;
      const tab = customEvent?.detail?.tab;
      const targetUrl = tab ? `/profile?tab=${tab}` : "/profile";
      if (typeof window !== "undefined") {
        window.location.href = targetUrl;
      }
    };

    // 4. Public User Profile Modal
    const handlePublicProfileTrigger = (e: Event) => {
      if (mountedPublicProfileRef.current) return;
      mountedPublicProfileRef.current = true;
      const customEvent = e as CustomEvent<PublicProfileDetail>;
      setPublicProfileProps({ initialDetail: customEvent.detail });
      setMountPublicProfile(true);
    };

    // 4. Auth Modal (guest login prompt từ BottomNav và các component khác)
    const handleAuthModalTrigger = () => {
      setShowAuthModal(true);
    };

    const handleCloseAllModals = () => {
      setShowAuthModal(false);
    };

    window.addEventListener("close-all-modals", handleCloseAllModals);
    window.addEventListener("open-actor-bio", handleActorBioTrigger);
    window.addEventListener("open-user-profile-modal", handleUserProfileTrigger);
    window.addEventListener("open-user-profile", handleUserProfileTrigger);
    window.addEventListener("open-public-profile", handlePublicProfileTrigger);
    window.addEventListener("open-auth-modal", handleAuthModalTrigger);

    return () => {
      window.removeEventListener("close-all-modals", handleCloseAllModals);
      window.removeEventListener("open-actor-bio", handleActorBioTrigger);
      window.removeEventListener("open-user-profile-modal", handleUserProfileTrigger);
      window.removeEventListener("open-user-profile", handleUserProfileTrigger);
      window.removeEventListener("open-public-profile", handlePublicProfileTrigger);
      window.removeEventListener("open-auth-modal", handleAuthModalTrigger);
    };
  }, []);

  return (
    <>
      {mountActorBio && <ActorBioModal {...actorBioProps} />}
      {mountPublicProfile && <PublicUserProfileModal {...publicProfileProps} />}
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
