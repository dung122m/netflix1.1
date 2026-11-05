import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Hồ Sơ & Cài Đặt Trình Phát Cloud - Nanaflix",
  description:
    "Quản lý hồ sơ cá nhân, kho avatar, bộ danh hiệu cày phim và tùy biến đồng bộ trình phát video Cloud trên Nanaflix.",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-netflix-red selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pt-20 sm:pt-24 pb-16">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-zinc-400">Đang chuẩn bị trang hồ sơ...</p>
            </div>
          }
        >
          <ProfileClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
