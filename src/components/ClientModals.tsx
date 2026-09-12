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

import { GlobalConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ClientModals() {
  return (
    <>
      <AiMovieConcierge />
      <AiMovieRoulette />
      <ActorBioModal />
      <GlobalConfirmDialog />
    </>
  );
}
