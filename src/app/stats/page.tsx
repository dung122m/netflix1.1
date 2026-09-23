import React from "react";
import { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyStatsClient } from "@/components/stats/MyStatsClient";

export const metadata: Metadata = {
  title: "Thống Kê Xem Phim & Nanaflix Wrapped | Nanaflix",
  description:
    "Khám phá số giờ xem phim, thể loại yêu thích, quốc gia chiếm lĩnh và nhận danh hiệu Nanaflix Wrapped của riêng bạn.",
  openGraph: {
    title: "Thống Kê Xem Phim & Nanaflix Wrapped | Nanaflix",
    description:
      "Khám phá số giờ xem phim, thể loại yêu thích và nhận danh hiệu Nanaflix Wrapped của riêng bạn.",
    type: "website",
  },
};

export default function StatsPage() {
  return (
    <div className="page-cinema-container min-h-screen flex flex-col justify-between bg-black text-white">
      <div>
        <Navbar />
        <main className="pt-16 sm:pt-20">
          <MyStatsClient />
        </main>
      </div>
      <Footer />
    </div>
  );
}
