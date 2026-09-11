import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    unoptimized: true, // Free plan Vercel: không dùng quota image optimization
    remotePatterns: [
      { protocol: "https", hostname: "**", port: "", pathname: "/**" },
      { protocol: "http", hostname: "**", port: "", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 88, 95], // Tắt warning về quality không cấu hình
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Live sources change frequently; never serve stale stream URLs from the edge.
        source: "/api/live-football/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Live sources change frequently; never serve stale stream URLs from the edge.
        source: "/api/live-tv/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Cache thông báo 2 phút
        source: "/api/notifications",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=120, stale-while-revalidate=60",
          },
        ],
      },
      {
        // Cache tóm tắt phim 1 giờ
        source: "/api/synopsis",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Cache search suggest 1 phút
        source: "/api/search-suggest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=30",
          },
        ],
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 180, // Giữ trang động trong Router Cache client 3 phút (chuyển tab 0ms)
      static: 600, // Giữ trang tĩnh trong Router Cache client 10 phút
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "clsx",
      "tailwind-merge",
      "@google/genai",
    ],
  },
};

export default bundleAnalyzer(nextConfig);
