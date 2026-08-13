/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cho phép tải ảnh từ mọi host (dùng khi host ảnh không cố định)
    // Nếu biết danh sách host, hãy thay ** bằng hostname cụ thể để an toàn hơn
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Tối ưu các lần hydrate và theo dõi bundle
    scrollRestoration: true,
  },
};

module.exports = nextConfig;
