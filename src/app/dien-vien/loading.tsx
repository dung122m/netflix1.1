import React from "react";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default function DienVienLoading() {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col pt-20 pb-20 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-8 animate-pulse">
      <div className="h-10 w-56 bg-white/15 rounded-2xl" />
      <GridSkeleton count={18} />
    </div>
  );
}
