import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    unoptimized: true, // Tải ảnh trực tiếp từ CDN phim, không tốn quota Vercel
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vsmov.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [25, 50, 75, 80, 88, 95, 100],
  },
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default bundleAnalyzer(nextConfig);
