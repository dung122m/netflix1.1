"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { GlobalConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { NanaAiStudioModalProps, StudioTab } from "@/components/NanaAiStudioModal";
import type { ActorBioModalProps } from "@/components/ActorBioModal";
import type { UserProfileModalProps } from "@/components/UserProfileModal";
import type { PublicUserProfileModalProps, PublicProfileDetail } from "@/components/PublicUserProfileModal";
import type { LeaderboardModalProps } from "@/components/LeaderboardModal";

// Dynamic import các modal nặng với ssr: false (chỉ tải chunk khi modal thực sự được yêu cầu mở)
const NanaAiStudioModal = dynamic(
  () => import("@/components/NanaAiStudioModal").then((m) => m.NanaAiStudioModal),
  { ssr: false }
);
const ActorBioModal = dynamic(
  () => import("@/components/ActorBioModal").then((m) => m.ActorBioModal),
  { ssr: false }
);
const UserProfileModal = dynamic(
  () => import("@/components/UserProfileModal").then((m) => m.UserProfileModal),
  { ssr: false }
);
const LeaderboardModal = dynamic(
  () => import("@/components/LeaderboardModal").then((m) => m.LeaderboardModal),
  { ssr: false }
);
const PublicUserProfileModal = dynamic(
  () => import("@/components/PublicUserProfileModal").then((m) => m.PublicUserProfileModal),
  { ssr: false }
);

export const ClientModals = React.memo(function ClientModals() {
  const [mountStudio, setMountStudio] = useState(false);
  const [mountActorBio, setMountActorBio] = useState(false);
  const [mountUserProfile, setMountUserProfile] = useState(false);
  const [mountPublicProfile, setMountPublicProfile] = useState(false);
  const [mountLeaderboard, setMountLeaderboard] = useState(false);

  const mountedStudioRef = useRef(false);
  const mountedActorBioRef = useRef(false);
  const mountedUserProfileRef = useRef(false);
  const mountedPublicProfileRef = useRef(false);
  const mountedLeaderboardRef = useRef(false);

  const [studioProps, setStudioProps] = useState<NanaAiStudioModalProps>({ initialOpen: false });
  const [actorBioProps, setActorBioProps] = useState<ActorBioModalProps>({});
  const [userProfileProps, setUserProfileProps] = useState<UserProfileModalProps>({});
  const [publicProfileProps, setPublicProfileProps] = useState<PublicUserProfileModalProps>({});
  const [leaderboardProps, setLeaderboardProps] = useState<LeaderboardModalProps>({});

  useEffect(() => {
    // 1. Nana AI Studio (Studio, Concierge, Mood Matcher, Roulette)
    const handleStudioTrigger = (e: Event) => {
      if (mountedStudioRef.current) return;
      mountedStudioRef.current = true;
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
      const customEvent = e as CustomEvent<{ tab?: "profile" | "player_settings" | "followed_actors" | "comments" }>;
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

    // 5. Leaderboard Modal
    const handleLeaderboardTrigger = () => {
      if (mountedLeaderboardRef.current) return;
      mountedLeaderboardRef.current = true;
      setLeaderboardProps({ initialOpen: true });
      setMountLeaderboard(true);
    };

    window.addEventListener("open-nana-ai-studio", handleStudioTrigger);
    window.addEventListener("open-ai-concierge", handleStudioTrigger);
    window.addEventListener("open-ai-mood-matcher", handleStudioTrigger);
    window.addEventListener("open-ai-roulette", handleStudioTrigger);

    window.addEventListener("open-actor-bio", handleActorBioTrigger);
    window.addEventListener("open-user-profile-modal", handleUserProfileTrigger);
    window.addEventListener("open-user-profile", handleUserProfileTrigger);
    window.addEventListener("open-public-profile", handlePublicProfileTrigger);
    window.addEventListener("open-leaderboard-modal", handleLeaderboardTrigger);

    return () => {
      window.removeEventListener("open-nana-ai-studio", handleStudioTrigger);
      window.removeEventListener("open-ai-concierge", handleStudioTrigger);
      window.removeEventListener("open-ai-mood-matcher", handleStudioTrigger);
      window.removeEventListener("open-ai-roulette", handleStudioTrigger);

      window.removeEventListener("open-actor-bio", handleActorBioTrigger);
      window.removeEventListener("open-user-profile-modal", handleUserProfileTrigger);
      window.removeEventListener("open-user-profile", handleUserProfileTrigger);
      window.removeEventListener("open-public-profile", handlePublicProfileTrigger);
      window.removeEventListener("open-leaderboard-modal", handleLeaderboardTrigger);
    };
  }, []);

  return (
    <>
      {mountStudio && <NanaAiStudioModal {...studioProps} />}
      {mountActorBio && <ActorBioModal {...actorBioProps} />}
      {mountUserProfile && <UserProfileModal {...userProfileProps} />}
      {mountPublicProfile && <PublicUserProfileModal {...publicProfileProps} />}
      {mountLeaderboard && <LeaderboardModal {...leaderboardProps} />}
      <GlobalConfirmDialog />
    </>
  );
});
