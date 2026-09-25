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
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "true",
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
    return [];
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
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://va.vercel-scripts.com https://*.vercel-insights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://api.dicebear.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://phimimg.com https://img.phimapi.com https://image.tmdb.org https://phim.nguonc.com https://img.gvapi.cc https://m.media-amazon.com https://images-na.ssl-images-amazon.com https://i.ytimg.com https://img.youtube.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://avatars.githubusercontent.com https://graph.facebook.com https://*.wikimedia.org https://upload.wikimedia.org https://raw.githubusercontent.com https://r2.thesportsdb.com https://www.thesportsdb.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://global-cdn.cdnx.tech https://sta.vnres.co https://imgts.sportpulseapiz.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://api.themoviedb.org https://phimapi.com https://phim.nguonc.com https://vi.wikipedia.org https://en.wikipedia.org https://va.vercel-scripts.com https://vortex.data.vercel-scripts.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://*.upstash.io https:",
              "media-src 'self' data: blob: https:",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com https://embed.streamc.xyz https://player.phimapi.com",
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
      static: 600,  // Giữ trang tĩnh trong Router Cache client 10 phút
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "clsx",
      "tailwind-merge",
      "@google/genai",
    ],
    optimizeServerReact: true,  // Server Components: loại bỏ re-render thừa trên server
  },
};

export default bundleAnalyzer(nextConfig);
