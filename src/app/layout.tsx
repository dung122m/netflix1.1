import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { BackToTop } from "@/components/BackToTop";
import { ToastContainer } from "@/components/Toast";
import { AiMovieConcierge } from "@/components/AiMovieConcierge";
import { AiMovieRoulette } from "@/components/AiMovieRoulette";
import { AiVoiceCommandModal } from "@/components/AiVoiceCommandModal";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nanaflix - Thế Giới Điện Ảnh Của Nana",
  description:
    "Nanaflix - Xem phim trực tuyến chất lượng cao cùng Trợ lý Nana gợi ý phim thông minh, cập nhật liên tục các siêu phẩm điện ảnh mới nhất.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nanaflix",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased bg-black text-white`}
    >
      <head>
        {/* PWA & Mobile Web App */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nanaflix" />
        <meta name="application-name" content="Nanaflix" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#000000" />

        {/* Viewport với safe-area cho iPhone notch & home indicator */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />

        {/* DNS Prefetch & Preconnect cho image CDNs */}
        <link rel="preconnect" href="https://phimimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="preconnect" href="https://img.phimapi.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.phimapi.com" />
        <link rel="preconnect" href="https://vsmov.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://vsmov.com" />
        <link rel="preconnect" href="https://img.gvapi.cc" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.gvapi.cc" />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
      </head>
      <body
        className="min-h-screen flex flex-col bg-black text-white"
        suppressHydrationWarning
      >
        <SmoothScroll>{children}</SmoothScroll>

        {/* Back to top với progress ring */}
        <BackToTop />

        {/* Toast notification system — global */}
        <ToastContainer />

        {/* Trợ lý AI Gợi ý phim thông minh toàn trang */}
        <AiMovieConcierge />

        {/* Vòng quay Suất Chiếu Định Mệnh AI Roulette */}
        <AiMovieRoulette />

        {/* Trợ lý Giọng Nói Điều Khiển Rạp Chiếu Tiếng Việt */}
        <AiVoiceCommandModal />
      </body>
    </html>
  );
}
