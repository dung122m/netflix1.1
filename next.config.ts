import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vsmov.com", // Hạn chế domain để bảo mật và tối ưu
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**", // Giữ fallback nếu cần, nhưng ưu tiên cụ thể ở trên
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [25, 50, 75, 80, 88, 95, 100], // <-- Mình đã thêm dòng này vào đây
  },
  experimental: {
    scrollRestoration: true,
  },
};

export default bundleAnalyzer(nextConfig);
