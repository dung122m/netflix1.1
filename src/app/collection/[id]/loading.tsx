import React from "react";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default function CollectionDetailLoading() {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col pt-20 sm:pt-24 pb-16 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-8 animate-pulse">
      <div className="space-y-3 max-w-2xl">
        <div className="h-8 sm:h-12 w-64 sm:w-96 bg-white/15 rounded-2xl" />
        <div className="h-4 w-full bg-white/10 rounded-md" />
        <div className="h-4 w-2/3 bg-white/10 rounded-md" />
      </div>
      <GridSkeleton count={18} />
    </div>
  );
}
