import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function MyListLoading() {
  return (
    <div className="bg-black min-h-dvh text-white">
      <Navbar />
      <main className="max-w-[1800px] mx-auto px-4 md:px-8 pt-24 sm:pt-28 pb-16 animate-pulse">
        {/* HEADER SKELETON */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-5">
          <div className="space-y-2 max-w-full">
            <div className="h-4 w-32 max-w-full bg-white/10 rounded" />
            <div className="h-8 sm:h-10 w-64 max-w-full bg-white/20 rounded-xl" />
            <div className="h-4 w-80 max-w-full bg-white/10 rounded" />
          </div>
          <div className="h-10 w-28 bg-white/10 rounded-xl" />
        </div>

        {/* TABS SKELETON */}
        <div className="flex gap-3 mb-8">
          <div className="h-11 w-44 bg-white/20 rounded-full" />
          <div className="h-11 w-44 bg-white/10 rounded-full" />
        </div>

        {/* CARDS SKELETON */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-zinc-900/80 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 space-y-2">
                <div className="h-4 w-3/4 bg-white/20 rounded" />
                <div className="h-3 w-1/2 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
