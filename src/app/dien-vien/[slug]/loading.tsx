import React from "react";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default function ActorDetailLoading() {
  return (
    <div className="min-h-dvh bg-[#050505] text-zinc-100 flex flex-col font-sans antialiased overflow-x-clip animate-pulse">
      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1800px] h-[550px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.12),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-20 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-8 sm:space-y-12">
        {/* BREADCRUMB SKELETON */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-white/10 rounded-xl" />
          <div className="h-4 w-4 bg-white/10 rounded-full" />
          <div className="h-4 w-28 bg-white/10 rounded-md" />
        </div>

        {/* HERO SECTION SKELETON: MATCHES REAL PORTRAIT + METADATA */}
        <section className="relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 md:gap-10">
            {/* PORTRAIT IMAGE SKELETON */}
            <div className="w-36 h-48 sm:w-44 sm:h-60 md:w-52 md:h-72 rounded-2xl bg-zinc-900 shadow-2xl shrink-0" />

            {/* DETAILS SKELETON */}
            <div className="flex-1 space-y-4 text-center sm:text-left min-w-0 w-full">
              {/* BADGES */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <div className="h-6 w-20 bg-white/10 rounded-full" />
                <div className="h-6 w-28 bg-white/10 rounded-full" />
                <div className="h-6 w-24 bg-white/10 rounded-full" />
              </div>

              {/* NAME & SUBTITLE */}
              <div className="space-y-2">
                <div className="h-10 sm:h-14 w-64 sm:w-80 bg-white/15 rounded-2xl mx-auto sm:mx-0" />
                <div className="h-4 w-44 bg-white/10 rounded-md mx-auto sm:mx-0" />
              </div>

              {/* PERSONAL FACTS */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
                <div className="h-4 w-36 bg-white/10 rounded-md" />
                <div className="h-4 w-40 bg-white/10 rounded-md" />
              </div>

              {/* BIO SKELETON LINES */}
              <div className="space-y-2 pt-2 max-w-2xl">
                <div className="h-3.5 w-full bg-white/10 rounded-md" />
                <div className="h-3.5 w-5/6 bg-white/10 rounded-md" />
                <div className="h-3.5 w-3/4 bg-white/10 rounded-md" />
              </div>
            </div>
          </div>
        </section>

        {/* FILMOGRAPHY SECTION SKELETON */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-44 bg-white/15 rounded-xl" />
            <div className="h-8 w-28 bg-white/10 rounded-xl" />
          </div>

          <GridSkeleton count={12} />
        </section>
      </main>
    </div>
  );
}
