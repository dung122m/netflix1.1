import React from "react";
import { Metadata } from "next";
import { liveFootballService } from "@/services/liveFootballService";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LiveFootballClient } from "@/components/live/LiveFootballClient";

export const metadata: Metadata = {
  title: "Nanaflix - Trực Tiếp Bóng Đá HD (Xôi Lạc, Cola TV, Socolive)",
  description:
    "Xem trực tiếp bóng đá hôm nay chất lượng cao Full HD kèm bình luận Tiếng Việt từ các kênh hàng đầu.",
};

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const footballData = await liveFootballService.getFootballMatches();

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />
      <LiveFootballClient initialData={footballData} />
      <Footer />
    </div>
  );
}
