"use client";

// Client Component wrapper cho các AI modal nặng
// Dùng dynamic + ssr:false hợp lệ vì đây là Client Component
import dynamic from "next/dynamic";

const AiMovieConcierge = dynamic(
  () => import("@/components/AiMovieConcierge").then((m) => m.AiMovieConcierge),
  { ssr: false }
);
const AiMovieRoulette = dynamic(
  () => import("@/components/AiMovieRoulette").then((m) => m.AiMovieRoulette),
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
const ContinueWatchingSync = dynamic(
  () => import("@/components/ContinueWatchingSync").then((m) => m.ContinueWatchingSync),
  { ssr: false }
);

import React from "react";
import { GlobalConfirmDialog } from "@/components/ui/ConfirmDialog";

export const ClientModals = React.memo(function ClientModals() {
  return (
    <>
      <AiMovieConcierge />
      <AiMovieRoulette />
      <ActorBioModal />
      <UserProfileModal />
      <LeaderboardModal />
      <ContinueWatchingSync />
      <GlobalConfirmDialog />
    </>
  );
});
