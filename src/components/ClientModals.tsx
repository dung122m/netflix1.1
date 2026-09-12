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
const AiVoiceCommandModal = dynamic(
  () => import("@/components/AiVoiceCommandModal").then((m) => m.AiVoiceCommandModal),
  { ssr: false }
);
const ActorBioModal = dynamic(
  () => import("@/components/ActorBioModal").then((m) => m.ActorBioModal),
  { ssr: false }
);

export function ClientModals() {
  return (
    <>
      <AiMovieConcierge />
      <AiMovieRoulette />
      <AiVoiceCommandModal />
      <ActorBioModal />
    </>
  );
}
