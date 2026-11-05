import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationsClient } from "@/components/Notifications/NotificationsClient";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Thông Báo - Nanaflix",
  description: "Xem tất cả thông báo phản hồi bình luận, biểu cảm và tương tác tài khoản trên Nanaflix.",
};

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-netflix-red selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pt-20 sm:pt-24 pb-16">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-zinc-400">Đang chuẩn bị thông báo...</p>
            </div>
          }
        >
          <NotificationsClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
