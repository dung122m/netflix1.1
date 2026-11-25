import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  // Cho phép 127.0.0.1 và localhost trong môi trường dev cục bộ (chống lỗi 403 cross-origin _next/*)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  compress: false, // Tắt in-process Node.js Gzip để tránh MaxListenersExceededWarning trên streaming RSC responses (CDN/Edge tự động nén Brotli/Gzip)
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 384, 500, 640],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80, 82, 85, 90],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days cache on edge
  },
  async redirects() {
    return [
      {
        source: "/dien-vien",
        destination: "/browse",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Global Enterprise Security Headers
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://va.vercel-scripts.com https://*.vercel-insights.com https://www.googletagmanager.com https://static.cloudflareinsights.com"
                : "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://va.vercel-scripts.com https://*.vercel-insights.com https://www.googletagmanager.com https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://api.themoviedb.org https://phimapi.com https://phim.nguonc.com https://vi.wikipedia.org https://en.wikipedia.org https://va.vercel-scripts.com https://vortex.data.vercel-scripts.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://*.upstash.io https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://cloudflareinsights.com https:",
              "media-src 'self' data: blob: https:",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com https://*.streamc.xyz https://streamc.xyz https://player.phimapi.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
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
        // Thông báo người dùng riêng tư: cấm tuyệt đối cache trên CDN/Edge
        source: "/api/notifications",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
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
        // Edge / CDN caching cho trang chủ landing page (/): Đồng bộ với revalidate = 300 (5 phút ISR), giải phóng Fast Origin Transfer và CPU
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        // Edge / CDN caching cho trang trực tiếp bóng đá & TV (/live)
        source: "/live",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        // Edge / CDN caching an toàn cho trang chi tiết phim công khai (/movies/:slug)
        // Cache 1 giờ (3600s), stale-while-revalidate 1 ngày: chống bot crawler quét cạn Redis commands
        // mà vẫn bảo đảm tập phim và dữ liệu luôn tươi mới, an toàn.
        source: "/movies/:slug",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Edge / CDN caching an toàn cho trang diễn viên công khai (/dien-vien/:slug)
        source: "/dien-vien/:slug",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Edge / CDN caching cho trang duyệt phim / bộ lọc công khai (/browse)
        source: "/browse",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=1800, stale-while-revalidate=3600",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=1800, stale-while-revalidate=3600",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=1800, stale-while-revalidate=3600",
          },
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: "public, max-age=1800, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Cache search suggest trên CDN: 1 giờ (3600s), chống bot & crawler làm cạn CPU Serverless
        source: "/api/search-suggest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Edge / CDN caching cho đề xuất phim công khai (/api/movies/recommendations)
        source: "/api/movies/recommendations",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Edge / CDN caching cho gợi ý phim cho bạn (/api/recommendations/for-you)
        source: "/api/recommendations/for-you",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=7200",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=7200",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        ],
      },
      {
        // Edge / CDN caching cho bảng xếp hạng TMDb Trending 6 giờ
        source: "/api/trending-tmdb",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=21600, stale-while-revalidate=43200",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=21600, stale-while-revalidate=43200",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=21600, stale-while-revalidate=43200",
          },
        ],
      },
      {
        // Edge / CDN caching cho bảng xếp hạng Trending cộng đồng 10 phút
        source: "/api/trending-community",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=600, stale-while-revalidate=1800",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=600, stale-while-revalidate=1800",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=600, stale-while-revalidate=1800",
          },
        ],
      },
      {
        // Edge / CDN caching cho tiểu sử diễn viên 24 giờ
        source: "/api/actor-bio",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=43200",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=43200",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=43200",
          },
        ],
      },
      {
        // Edge / CDN caching cho hồ sơ cầu thủ bóng đá 24 giờ
        source: "/api/live-football/athlete",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["@aws-sdk/client-s3"],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-win32-x64-msvc",
      "node_modules/@swc/core",
      "node_modules/@esbuild",
      "node_modules/playwright",
      "node_modules/playwright-core",
      "node_modules/@playwright",
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 180, // Giữ trang động trong Router Cache client 3 phút (chuyển tab 0ms)
      static: 600,  // Giữ trang tĩnh trong Router Cache client 10 phút
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "clsx",
      "tailwind-merge",
      "@upstash/redis",
      "@supabase/supabase-js",
    ],
    optimizeServerReact: true,  // Server Components: loại bỏ re-render thừa trên server
  },
};

export default bundleAnalyzer(nextConfig);
