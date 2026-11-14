import React, { Suspense } from "react";
import { Metadata } from "next";
import { liveFootballService, LiveMatchScore } from "@/services/live/football/service";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LiveHubClient } from "@/components/live/LiveHubClient";
import { LiveHubSkeleton } from "@/components/live/LiveHubSkeleton";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.asia";

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
        url: `${siteUrl}/og-cinema.jpg?v=2026`,
        secureUrl: `${siteUrl}/og-cinema.jpg?v=2026`,
        width: 1200,
        height: 630,
        alt: "Nanaflix Live TV & Bóng Đá",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nanaflix - Trực Tiếp Bóng Đá & Truyền Hình TV HD",
    description:
      "Xem trực tiếp bóng đá và hơn 100 kênh truyền hình VTV, HTV, THVL chất lượng cao trên Nanaflix.",
    images: [`${siteUrl}/og-cinema.jpg?v=2026`],
  },
};

// Cache Edge CDN 3 phút trên SSR (client useLiveScoresRealtime đã tự động cập nhật tỉ số theo thời gian thực)
export const revalidate = 180;
export const runtime = "nodejs";

// Server streaming component: Shell (Navbar, Skeleton, Footer) được flush ngay lập tức về browser
export default function LivePage() {
  return (
    <div className="page-cinema-container min-h-dvh w-full max-w-full overflow-x-clip">
      <Navbar />
      <Suspense fallback={<LiveHubSkeleton />}>
        <LiveContent />
      </Suspense>
      <Footer />
    </div>
  );
}

// Data fetching component: Chỉ fetch dữ liệu thể thao ban đầu; Live TV được lazy-load theo nhu cầu
async function LiveContent() {
  const footballData = await liveFootballService.getFootballMatches();
  const initialScores: Record<string, LiveMatchScore> = {};
  if (footballData?.matches) {
    for (const m of footballData.matches) {
      if (m.score) {
        initialScores[m.id] = m.score;
      }
    }
  }
  return <LiveHubClient footballData={footballData} initialScores={initialScores} />;
}
