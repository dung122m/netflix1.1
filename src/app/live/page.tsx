import React, { Suspense } from "react";
import { Metadata } from "next";
import { liveFootballService } from "@/services/liveFootballService";
import { liveTvService } from "@/services/liveTvService";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LiveHubClient } from "@/components/live/LiveHubClient";

export const metadata: Metadata = {
  title: "Nanaflix - Trực Tiếp Bóng Đá & Truyền Hình TV HD (VTV, HTV, THVL)",
  description:
    "Xem trực tiếp bóng đá có BLV tiếng Việt và hơn 100 kênh truyền hình VTV, HTV, THVL, Kênh thể thao chất lượng cao Full HD hoàn toàn miễn phí trên Nanaflix.",
  openGraph: {
    title: "Nanaflix - Trực Tiếp Bóng Đá & Kênh Truyền Hình TV HD",
    description:
      "Xem trực tiếp bóng đá Ngoại Hạng Anh, C1 và các kênh truyền hình VTV, HTV, THVL Full HD chất lượng cao.",
    type: "website",
    images: [
      {
        url: "/default-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Nanaflix Live TV & Bóng Đá",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nanaflix - Trực Tiếp Bóng Đá & Truyền Hình TV HD",
    description:
      "Xem trực tiếp bóng đá và hơn 100 kênh truyền hình VTV, HTV, THVL chất lượng cao trên Nanaflix.",
    images: ["/default-hero.jpg"],
  },
};

export const revalidate = 60;

export default async function LivePage() {
  const [footballData, tvData] = await Promise.all([
    liveFootballService.getFootballMatches(),
    liveTvService.getTvChannels(),
  ]);

  return (
    <div className="page-cinema-container min-h-screen">
      <Navbar />
      <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-white">Đang tải...</div>}>
        <LiveHubClient footballData={footballData} tvData={tvData} />
      </Suspense>
      <Footer />
    </div>
  );
}
