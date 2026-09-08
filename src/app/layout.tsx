import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { BackToTop } from "@/components/BackToTop";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nanaflix",
  description:
    "Nanaflix - Xem phim trực tuyến miễn phí, cập nhật nhanh chóng các bộ phim mới nhất, chất lượng cao, không quảng cáo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
    >
      <head>
        <link rel="preconnect" href="https://phimimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="preconnect" href="https://vsmov.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://vsmov.com" />
        <link rel="preconnect" href="https://img.gvapi.cc" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.gvapi.cc" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-black text-white">
        <SmoothScroll>{children}</SmoothScroll>
        <BackToTop />
      </body>
    </html>
  );
}
